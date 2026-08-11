/*
  041_wxl_hardening.sql
  Security and correctness hardening for the coordination protocol.

  1. Real worker-caller verification. The previous guards tested current_user
     inside SECURITY DEFINER functions, where current_user is always the
     function owner, so they passed for every caller. The functions were still
     protected by EXECUTE grants, but the in-body check was a no-op. The new
     command.is_food_worker_caller() checks the actual session user (direct
     database connections) or the request JWT role claim (PostgREST with the
     service key), so both worker connection paths pass and browser sessions
     cannot, even if a grant regresses.
  2. record_food_stripe_event: the catch-all exception handler rolled back the
     evidence insert, so the processing_error update matched zero rows while
     the API returned 200 - no evidence survived and Stripe never retried.
     Processing now runs in a nested block so the evidence row persists, and
     processed_at is only set when the event actually matched a resource.
  3. Participant-scoped select policies for food_match_runs,
     food_match_candidates, food_match_holds, and food_agent_mandates. RLS was
     enabled in 032 with no policy and no grant, which blocked the
     /v1/matches, /v1/runs, /v1/mandates routes and the food_explain_match
     tool for everyone.
  4. Idempotency: request_hash comparison added to the nine receipt commands
     that skipped it, and the >=8-character key check added to
     create_food_payment_order.
*/

-- 1. Worker-caller verification -------------------------------------------

create or replace function command.is_food_worker_caller()
returns boolean
language sql stable as $$
  select session_user in ('postgres','service_role','supabase_admin')
    or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role','') = 'service_role';
$$;
revoke execute on function command.is_food_worker_caller() from public, anon, authenticated;
grant execute on function command.is_food_worker_caller() to service_role;
comment on function command.is_food_worker_caller() is 'True only for trusted backend callers: direct database roles or PostgREST requests signed with the service key.';

create or replace function command.lease_food_outbox(p_worker text, p_topics text[], p_limit integer, p_lease_seconds integer)
returns setof command.food_outbox
language plpgsql security definer set search_path = command, public as $$
begin
  if not command.is_food_worker_caller() then raise exception 'Worker permission is required'; end if;
  return query
  with claimed as (
    select id from command.food_outbox
    where processed_at is null and available_at<=now() and topic=any(p_topics) and (lease_expires_at is null or lease_expires_at<now())
    order by created_at for update skip locked limit greatest(1,least(p_limit,100))
  )
  update command.food_outbox outbox set lease_owner=p_worker,lease_expires_at=now()+make_interval(secs=>greatest(5,least(p_lease_seconds,300))),attempt_count=attempt_count+1
  from claimed where outbox.id=claimed.id returning outbox.*;
end;
$$;

create or replace function command.complete_food_outbox(p_id bigint, p_worker text, p_error text default null)
returns command.food_outbox
language plpgsql security definer set search_path = command, public as $$
declare result command.food_outbox;
begin
  if not command.is_food_worker_caller() then raise exception 'Worker permission is required'; end if;
  update command.food_outbox set processed_at=case when p_error is null then now() else processed_at end,last_error=p_error,available_at=case when p_error is null then available_at else now()+least(interval '15 minutes',make_interval(secs=>power(2,least(attempt_count,9))::integer)) end,lease_owner=null,lease_expires_at=null
  where id=p_id and lease_owner=p_worker returning * into result;
  if result.id is null then raise exception 'Outbox lease is not owned by this worker'; end if;
  return result;
end;
$$;

create or replace function command.complete_food_match_run(p_run_id uuid,p_worker text,p_algorithm_version text,p_input_snapshot jsonb,p_input_snapshot_hash text,p_objectives jsonb,p_candidates jsonb,p_allocations jsonb)
returns command.food_match_runs
language plpgsql security definer set search_path=command,public as $$
declare result command.food_match_runs; candidate jsonb; allocation jsonb;
begin
  if not command.is_food_worker_caller() then raise exception 'Worker permission is required'; end if;
  update command.food_match_runs set status='running',lease_owner=p_worker,lease_expires_at=now()+interval '60 seconds' where id=p_run_id and status='queued' returning * into result;
  if result.id is null then raise exception 'Match run is unavailable'; end if;
  for candidate in select * from jsonb_array_elements(p_candidates) loop
    insert into command.food_match_candidates(match_run_id,need_id,supply_id,eligible,hard_rule_results,score_components,explanation_codes,rejection_reasons,proposed_quantity,rank)
    values(result.id,(candidate->>'need_id')::uuid,(candidate->>'supply_id')::uuid,(candidate->>'eligible')::boolean,candidate->'hard_rule_results',coalesce(candidate->'score_components','{}'),coalesce(array(select jsonb_array_elements_text(candidate->'explanation_codes')),'{}'),coalesce(array(select jsonb_array_elements_text(candidate->'rejection_reasons')),'{}'),nullif(candidate->>'proposed_quantity','')::numeric,nullif(candidate->>'rank','')::integer);
  end loop;
  for allocation in select * from jsonb_array_elements(p_allocations) loop
    update command.food_supplies set held_quantity=held_quantity+(allocation->>'quantity')::numeric,status='matched'
    where id=(allocation->>'supply_id')::uuid and status in ('open','matched') and quantity-held_quantity-committed_quantity-fulfilled_quantity>=(allocation->>'quantity')::numeric;
    if not found then raise exception 'Allocation exceeds available supply or supply is no longer open'; end if;
    insert into command.food_match_holds(candidate_id,need_id,supply_id,quantity)
    select id,(allocation->>'need_id')::uuid,(allocation->>'supply_id')::uuid,(allocation->>'quantity')::numeric from command.food_match_candidates
    where match_run_id=result.id and need_id=(allocation->>'need_id')::uuid and supply_id=(allocation->>'supply_id')::uuid and eligible;
    if not found then raise exception 'Allocation has no eligible candidate'; end if;
    update command.food_needs set held_quantity=held_quantity+(allocation->>'quantity')::numeric,status='matched'
    where id=(allocation->>'need_id')::uuid and status in ('open','matched') and quantity-held_quantity-committed_quantity-fulfilled_quantity>=(allocation->>'quantity')::numeric;
    if not found then raise exception 'Allocation need is no longer open'; end if;
  end loop;
  update command.food_match_runs set algorithm_version=p_algorithm_version,input_snapshot=p_input_snapshot,input_snapshot_hash=p_input_snapshot_hash,objective_settings=p_objectives,status='completed',completed_at=now(),lease_owner=null,lease_expires_at=null where id=result.id returning * into result;
  return result;
end;
$$;

create or replace function command.begin_system_food_match_run(p_trigger_reason text)
returns command.food_match_runs
language plpgsql security definer set search_path=command,public as $$
declare result command.food_match_runs;
begin
  if not command.is_food_worker_caller() then raise exception 'Worker permission is required'; end if;
  insert into command.food_match_runs(algorithm_version,input_snapshot,input_snapshot_hash,objective_settings,trigger_reason,status)
  values('pending','{}','pending','{}',btrim(p_trigger_reason),'queued') returning * into result;
  return result;
end;
$$;

create or replace function command.release_expired_food_match_holds()
returns integer
language plpgsql security definer set search_path=command,public as $$
declare hold command.food_match_holds; released integer:=0;
begin
  if not command.is_food_worker_caller() then raise exception 'Worker permission is required'; end if;
  for hold in select * from command.food_match_holds where status='active' and expires_at<=now() for update skip locked loop
    update command.food_match_holds set status='expired',released_at=now() where id=hold.id;
    update command.food_supplies set held_quantity=greatest(0,held_quantity-hold.quantity),status=case when committed_quantity>0 then 'committed' when held_quantity-hold.quantity>0 then 'matched' else 'open' end where id=hold.supply_id;
    update command.food_needs set held_quantity=greatest(0,held_quantity-hold.quantity),status=case when committed_quantity>0 then 'committed' when held_quantity-hold.quantity>0 then 'matched' else 'open' end where id=hold.need_id;
    released:=released+1;
  end loop;
  return released;
end;
$$;

create or replace function command.ingest_food_voice_message(p_provider_call_id text,p_contact_fingerprint text,p_language text,p_transcript text,p_confidence numeric,p_idempotency_key text)
returns command.food_messages
language plpgsql security definer set search_path=command,public as $$
declare channel command.food_contact_channels; conversation command.food_conversations; result command.food_messages;
begin
  if not command.is_food_worker_caller() then raise exception 'Voice adapter permission is required'; end if;
  select * into channel from command.food_contact_channels where channel_type='voice' and address_fingerprint=p_contact_fingerprint and verified_at is not null and consent_status='opted_in';
  if channel.id is null then raise exception 'Verified voice consent is required'; end if;
  select * into conversation from command.food_conversations where participant_id=channel.participant_id and active_channel='voice' and status in ('open','waiting') order by created_at desc limit 1;
  if conversation.id is null then
    insert into command.food_conversations(participant_id,subject,language,active_channel,created_by_principal) values(channel.participant_id,'Voice food intake',p_language,'voice','voice:'||p_contact_fingerprint) returning * into conversation;
  end if;
  insert into command.food_messages(conversation_id,channel,direction,sender_principal,body,structured_payload,sensitive,idempotency_key)
  values(conversation.id,'voice','inbound','voice:'||p_contact_fingerprint,p_transcript,jsonb_build_object('confidence',p_confidence),true,p_idempotency_key)
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key returning * into result;
  insert into command.food_voice_sessions(conversation_id,provider_call_id,language,input_mode,status,transcript_retention_deadline)
  values(conversation.id,p_provider_call_id,p_language,'mixed','active',now()+interval '30 days')
  on conflict(provider_call_id) do update set status='active';
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key)
  values('food.voice.intake_received','food_conversation',conversation.id,jsonb_build_object('conversation_id',conversation.id,'message_id',result.id,'language',p_language),'voice-intake:'||result.id)
  on conflict(idempotency_key) do nothing;
  return result;
end;
$$;

create or replace function command.plan_food_potluck(p_event_id uuid,p_worker text)
returns command.food_events
language plpgsql security definer set search_path=command,public as $$
declare event command.food_events; venue command.food_venues; participant command.food_participants; item command.food_event_items; invite_count integer:=0;
begin
  if not command.is_food_worker_caller() then raise exception 'Event planner permission is required'; end if;
  select * into event from command.food_events where id=p_event_id and status in ('venue_review','planning') for update;
  if event.id is null then raise exception 'Event is unavailable for planning'; end if;
  if event.venue_id is null then
    select v.* into venue from command.food_venues v join command.food_locations l on l.id=v.location_id left join command.food_participants host on host.id=v.host_participant_id
    where v.verification_status='verified' and v.capacity>=event.capacity and l.service_zone=event.service_zone and l.deleted_at is null
      and (v.venue_type<>'private_home' or (host.trust_tier>=3 and host.status='active' and v.emergency_contact_configured and v.review_expires_at>event.starts_at))
    order by case v.venue_type when 'public' then 0 when 'partner' then 1 else 2 end,v.capacity limit 1;
    if venue.id is null then update command.food_events set status='venue_review' where id=event.id returning * into event; return event; end if;
    update command.food_events set venue_id=venue.id,address_release_at=case when venue.venue_type='private_home' then event.starts_at-interval '2 hours' else event.address_release_at end,status='planning' where id=event.id returning * into event;
  else select * into venue from command.food_venues where id=event.venue_id;
  end if;
  if not exists(select 1 from command.food_event_items where event_id=event.id) then
    insert into command.food_event_items(event_id,item_name,dietary_tags,target_quantity,unit,preparation_burden) values
      (event.id,'Vegetable or fruit dish',array['plant_forward'],greatest(1,ceil(event.capacity/6.0)),'tray','medium'),
      (event.id,'Protein or main dish',event.dietary_profile,greatest(1,ceil(event.capacity/8.0)),'tray','high'),
      (event.id,'Water or nonalcoholic drinks','{}',greatest(1,ceil(event.capacity/10.0)),'case','low');
  end if;
  for participant in
    select distinct p.* from command.food_participants p join command.food_locations l on l.participant_id=p.id left join command.food_event_rsvps r on r.event_id=event.id and r.participant_id=p.id
    where p.status='active' and p.id<>event.organizer_participant_id and l.service_zone=event.service_zone and l.deleted_at is null and r.id is null
    order by p.created_at limit greatest(0,event.capacity-1)
  loop
    select * into item from command.food_event_items where event_id=event.id and status='open' order by (target_quantity-committed_quantity) desc,created_at limit 1;
    insert into command.food_event_invites(event_id,participant_id,proposed_item_id,proposed_quantity,prompt,expires_at,idempotency_key)
    values(event.id,participant.id,item.id,case when item.id is null then null else 1 end,case when item.id is null then 'Would you like to join this community potluck?' else 'Would you like to bring one '||item.unit||' of '||item.item_name||'?' end,least(event.starts_at-interval '4 hours',now()+interval '7 days'),'event-invite:'||event.id||':'||participant.id)
    on conflict(event_id,participant_id) do nothing;
    invite_count:=invite_count+1;
  end loop;
  update command.food_events set status='inviting' where id=event.id returning * into event;
  return event;
end;
$$;

create or replace function command.complete_food_a2a_task(p_task_id uuid,p_status text,p_output jsonb,p_error jsonb)
returns command.food_a2a_tasks
language plpgsql security definer set search_path=command,public as $$
declare result command.food_a2a_tasks;
begin
  if not command.is_food_worker_caller() then raise exception 'Agent task processor permission is required'; end if;
  if p_status not in ('completed','failed','input_required','cancelled') then raise exception 'Invalid terminal task status'; end if;
  update command.food_a2a_tasks set status=p_status,output=p_output,error=p_error where id=p_task_id and status in ('submitted','working','input_required') returning * into result;
  if result.id is null then raise exception 'Task is unavailable'; end if;
  return result;
end;
$$;

create or replace function command.enforce_food_retention()
returns jsonb
language plpgsql security definer set search_path=command,public as $$
declare location_count integer; transcript_count integer;
begin
  if not command.is_food_worker_caller() then raise exception 'Retention worker permission is required'; end if;
  update command.food_locations set exact_location_ciphertext=null,deleted_at=now() where deleted_at is null and not saved_for_reuse and retention_deadline is not null and retention_deadline<=now();
  get diagnostics location_count=row_count;
  update command.food_messages message set body='[deleted under retention policy]',structured_payload='{}' from command.food_voice_sessions session where session.conversation_id=message.conversation_id and message.channel='voice' and session.transcript_retention_deadline<=now() and session.transcript_deleted_at is null;
  get diagnostics transcript_count=row_count;
  update command.food_voice_sessions set transcript_deleted_at=now() where transcript_retention_deadline<=now() and transcript_deleted_at is null;
  return jsonb_build_object('locations_deleted',location_count,'voice_messages_redacted',transcript_count);
end;
$$;

-- 2. Stripe reconciliation: evidence survives processing failures ---------

create or replace function command.record_food_stripe_event(p_event_id text,p_event_type text,p_object_id text,p_payload jsonb)
returns command.food_stripe_events
language plpgsql security definer set search_path=command,public as $$
declare result command.food_stripe_events; object jsonb:=p_payload#>'{data,object}'; metadata jsonb; order_id uuid; donation_id uuid; participant_id uuid; payment command.food_payment_orders; donation command.food_donations; balance bigint; debit bigint; matched boolean:=false;
begin
  if not command.is_food_worker_caller() then raise exception 'Payment processor permission is required'; end if;
  insert into command.food_stripe_events(stripe_event_id,event_type,object_id,payload,signature_verified)
  values(p_event_id,p_event_type,p_object_id,p_payload,true)
  on conflict(stripe_event_id) do nothing returning * into result;
  if result.id is null then select * into result from command.food_stripe_events where stripe_event_id=p_event_id; return result; end if;
  -- Processing runs in a nested block: a failure rolls back only this
  -- subtransaction, so the evidence insert above persists with the error.
  begin
    metadata:=coalesce(object->'metadata','{}');
    order_id:=nullif(metadata->>'food_payment_order_id','')::uuid;
    donation_id:=nullif(metadata->>'food_donation_id','')::uuid;
    participant_id:=nullif(metadata->>'food_participant_id','')::uuid;
    if order_id is null then select id into order_id from command.food_payment_orders where stripe_payment_intent_id in (nullif(object->>'id',''),nullif(object->>'payment_intent','')) or stripe_charge_id in (nullif(object->>'id',''),nullif(object->>'charge','')) limit 1; end if;
    if donation_id is null then select id into donation_id from command.food_donations where stripe_payment_intent_id in (nullif(object->>'id',''),nullif(object->>'payment_intent','')) limit 1; end if;
    if order_id is not null then
      matched:=true;
      select * into payment from command.food_payment_orders where id=order_id for update;
      if payment.id is null then raise exception 'Stripe event references an unknown payment order'; end if;
      if p_event_type='payment_intent.amount_capturable_updated' and payment.status in ('created','authorization_pending') then update command.food_payment_orders set status='authorized',stripe_payment_intent_id=object->>'id',authorized_at=now() where id=payment.id;
      elsif p_event_type='payment_intent.succeeded' and payment.status not in ('refunded','disputed') then update command.food_payment_orders set status='captured',stripe_payment_intent_id=object->>'id',stripe_charge_id=nullif(object->>'latest_charge',''),captured_at=now() where id=payment.id;
      elsif p_event_type='payment_intent.payment_failed' and payment.status in ('created','authorization_pending') then update command.food_payment_orders set status='failed',stripe_payment_intent_id=object->>'id' where id=payment.id;
      elsif p_event_type='charge.refunded' then update command.food_payment_orders set status='refunded',stripe_charge_id=object->>'id' where id=payment.id;
      elsif p_event_type='charge.dispute.created' then update command.food_payment_orders set status='disputed',stripe_charge_id=object->>'charge' where id=payment.id;
      end if;
      update command.food_commitments set payment_state=case when p_event_type='payment_intent.amount_capturable_updated' then 'authorized' when p_event_type='payment_intent.succeeded' then 'captured' when p_event_type='charge.refunded' then 'refunded' when p_event_type='charge.dispute.created' then 'disputed' when p_event_type='payment_intent.payment_failed' then 'failed' else payment_state end where id=payment.commitment_id;
    elsif donation_id is not null then
      matched:=true;
      select * into donation from command.food_donations where id=donation_id for update;
      if donation.id is null then raise exception 'Stripe event references an unknown donation'; end if;
      if p_event_type in ('payment_intent.succeeded','charge.refunded','charge.dispute.created') then
        if not exists(select 1 from command.food_subsidy_ledger where donation_id=donation.id and entry_type='donation_credit') then
          perform 1 from command.food_subsidy_campaigns where id=donation.campaign_id for update;
          select coalesce((select balance_after_cents from command.food_subsidy_ledger where campaign_id=donation.campaign_id order by created_at desc,id desc limit 1),0) into balance;
          insert into command.food_subsidy_ledger(campaign_id,donation_id,entry_type,amount_cents,balance_after_cents,reason,actor_principal,idempotency_key) values(donation.campaign_id,donation.id,'donation_credit',donation.amount_cents,balance+donation.amount_cents,'Verified donation payment','stripe:'||p_event_id,'stripe-donation-credit:'||donation.id);
        end if;
        if p_event_type in ('charge.refunded','charge.dispute.created') and not exists(select 1 from command.food_subsidy_ledger where donation_id=donation.id and entry_type='adjustment_debit') then
          select balance_after_cents into balance from command.food_subsidy_ledger where campaign_id=donation.campaign_id order by created_at desc,id desc limit 1;
          debit:=least(balance,donation.amount_cents);
          insert into command.food_subsidy_ledger(campaign_id,donation_id,entry_type,amount_cents,balance_after_cents,reason,actor_principal,idempotency_key) values(donation.campaign_id,donation.id,'adjustment_debit',-debit,balance-debit,case when p_event_type='charge.refunded' then 'Donation refunded' else 'Donation disputed' end,'stripe:'||p_event_id,'stripe-donation-debit:'||donation.id);
        end if;
        update command.food_donations set status=case when p_event_type='payment_intent.succeeded' and status not in ('refunded','disputed') then 'succeeded' when p_event_type='charge.refunded' then 'refunded' when p_event_type='charge.dispute.created' then 'disputed' else status end,stripe_payment_intent_id=coalesce(stripe_payment_intent_id,nullif(object->>'payment_intent',''),nullif(object->>'id','')) where id=donation.id;
      elsif p_event_type='payment_intent.payment_failed' then update command.food_donations set status='failed',stripe_payment_intent_id=object->>'id' where id=donation.id and status='pending';
      end if;
    elsif p_event_type='account.updated' and participant_id is not null then
      matched:=true;
      update command.food_participants set stripe_account_id=case when coalesce((object->>'charges_enabled')::boolean,false) and coalesce((object->>'payouts_enabled')::boolean,false) then object->>'id' else null end where id=participant_id;
    end if;
    if matched then
      update command.food_stripe_events set processed_at=now() where id=result.id returning * into result;
    end if;
  exception when others then
    update command.food_stripe_events set processing_error=sqlerrm where id=result.id returning * into result;
  end;
  return result;
end;
$$;

-- 3. Participant-scoped select access for matching and mandates -----------

drop policy if exists food_match_runs_party_read on command.food_match_runs;
create policy food_match_runs_party_read on command.food_match_runs for select using (
  command.current_role()='admin'
  or exists (
    select 1 from command.food_match_candidates c
    join command.food_needs n on n.id=c.need_id
    join command.food_supplies s on s.id=c.supply_id
    where c.match_run_id=food_match_runs.id and (n.created_by=auth.uid() or s.created_by=auth.uid())
  )
);

drop policy if exists food_match_candidates_party_read on command.food_match_candidates;
create policy food_match_candidates_party_read on command.food_match_candidates for select using (
  command.current_role()='admin'
  or exists (select 1 from command.food_needs n where n.id=food_match_candidates.need_id and n.created_by=auth.uid())
  or exists (select 1 from command.food_supplies s where s.id=food_match_candidates.supply_id and s.created_by=auth.uid())
);

drop policy if exists food_match_holds_party_read on command.food_match_holds;
create policy food_match_holds_party_read on command.food_match_holds for select using (
  command.current_role()='admin'
  or exists (select 1 from command.food_needs n where n.id=food_match_holds.need_id and n.created_by=auth.uid())
  or exists (select 1 from command.food_supplies s where s.id=food_match_holds.supply_id and s.created_by=auth.uid())
);

drop policy if exists food_agent_mandates_owner_read on command.food_agent_mandates;
create policy food_agent_mandates_owner_read on command.food_agent_mandates for select using (
  command.current_role()='admin'
  or agent_principal=auth.uid()::text
  or exists (select 1 from command.food_participants p where p.id=food_agent_mandates.participant_id and p.profile_id=auth.uid())
);

grant select on command.food_match_runs, command.food_match_candidates, command.food_match_holds, command.food_agent_mandates to authenticated;

-- 4. Idempotency: request-hash comparison on replay -----------------------

create or replace function command.create_food_payment_order(p_commitment_id uuid,p_mandate_id uuid,p_delivery_cents bigint,p_subsidy_cents bigint,p_tax_cents bigint,p_tip_cents bigint,p_idempotency_key text)
returns command.food_payment_orders
language plpgsql security definer set search_path = command, public as $$
declare commitment command.food_commitments; supply command.food_supplies; need command.food_needs; mandate command.food_agent_mandates; result command.food_payment_orders; fee bigint; subtotal bigint; total bigint; daily_spend bigint; actor text:=auth.uid()::text; receipt command.food_command_receipts; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(btrim(coalesce(p_idempotency_key,''))) < 8 then raise exception 'Idempotency key must contain at least 8 characters'; end if;
  request_hash:=encode(extensions.digest(concat_ws(':',p_commitment_id,p_mandate_id,p_delivery_cents,p_subsidy_cents,p_tax_cents,p_tip_cents),'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_payment_order' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if; select * into result from command.food_payment_orders where id=receipt.resource_id; return result; end if;
  select * into commitment from command.food_commitments where id=p_commitment_id for update;
  select * into need from command.food_needs where id=commitment.need_id;
  select * into supply from command.food_supplies where id=commitment.supply_id;
  if commitment.id is null or commitment.lane <> 'marketplace' or commitment.fulfillment_state not in ('committed','in_fulfillment') then raise exception 'An active marketplace commitment is required'; end if;
  subtotal := round(coalesce(supply.price_cents,0) * commitment.quantity)::bigint;
  fee := least(300::bigint, round(subtotal * 0.05)::bigint);
  if p_delivery_cents < 0 or p_subsidy_cents <> 0 or p_tax_cents < 0 or p_tip_cents < 0 then raise exception 'Payment amounts are invalid; subsidies are applied from the restricted ledger after order creation'; end if;
  total:=subtotal+p_delivery_cents+fee-p_subsidy_cents+p_tax_cents+p_tip_cents;
  if need.created_by<>auth.uid() and command.current_role()<>'admin' then
    select * into mandate from command.food_agent_mandates where id=p_mandate_id for update;
    select coalesce(sum(total_cents),0) into daily_spend from command.food_payment_orders where mandate_id=mandate.id and created_at>=date_trunc('day',now()) and status not in ('failed','cancelled','refunded');
    if mandate.id is null or mandate.participant_id<>need.participant_id or mandate.agent_principal<>actor or mandate.revoked_at is not null or now() not between mandate.valid_from and mandate.expires_at or not ('create_payment'=any(mandate.permitted_actions)) or not ('marketplace'=any(mandate.lanes)) or not (need.service_zone=any(mandate.service_zones)) or total>mandate.per_transaction_limit_cents or daily_spend+total>mandate.daily_limit_cents or mandate.spent_cents+total>mandate.total_limit_cents then raise exception 'Active mandate does not authorize this payment'; end if;
    update command.food_agent_mandates set spent_cents=spent_cents+total where id=mandate.id;
  end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_payment_order',p_idempotency_key,request_hash);
  insert into command.food_payment_orders(commitment_id,mandate_id,provider_participant_id,purchaser_participant_id,food_subtotal_cents,delivery_cents,hand_fee_cents,subsidy_cents,tax_cents,tip_cents,total_cents,provider_amount_cents,provider_topup_cents)
  values(commitment.id,p_mandate_id,supply.participant_id,need.participant_id,subtotal,p_delivery_cents,fee,p_subsidy_cents,p_tax_cents,p_tip_cents,total,subtotal+p_delivery_cents+p_tax_cents+p_tip_cents,greatest(0::bigint,p_subsidy_cents-fee))
  returning * into result;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.payment.authorization_requested','food_payment_order',result.id,jsonb_build_object('payment_order_id',result.id,'amount_cents',result.total_cents),'payment-auth:' || result.id);
  update command.food_command_receipts set status='completed',resource_type='food_payment_order',resource_id=result.id,response=jsonb_build_object('id',result.id,'total_cents',result.total_cents) where actor_principal=actor and command_name='create_food_payment_order' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.create_food_potluck(p_input jsonb, p_idempotency_key text)
returns command.food_events
language plpgsql security definer set search_path = command, public as $$
declare participant command.food_participants; venue command.food_venues; result command.food_events; receipt command.food_command_receipts; actor text:=auth.uid()::text; menu_item jsonb; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  request_hash:=encode(extensions.digest(p_input::text,'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_potluck' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_events where id=receipt.resource_id; return result;
  end if;
  select * into participant from command.food_participants where profile_id=auth.uid() and status='active';
  if participant.id is null then raise exception 'An active participant is required'; end if;
  if nullif(p_input->>'venue_id','') is not null then
    select * into venue from command.food_venues where id=(p_input->>'venue_id')::uuid;
    if venue.verification_status <> 'verified' then raise exception 'A verified venue is required'; end if;
    if venue.venue_type='private_home' and (participant.trust_tier<3 or not venue.emergency_contact_configured or venue.review_expires_at<=now()) then raise exception 'Private-home events require current T3 host and venue evidence'; end if;
  end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_potluck',p_idempotency_key,request_hash);
  insert into command.food_events(organizer_participant_id,venue_id,name,purpose,service_zone,starts_at,ends_at,capacity,dietary_profile,accessibility_needs,address_release_at,status,created_by)
  values(participant.id,venue.id,btrim(p_input->>'name'),btrim(p_input->>'purpose'),btrim(p_input->>'service_zone'),(p_input->>'starts_at')::timestamptz,(p_input->>'ends_at')::timestamptz,(p_input->>'capacity')::integer,coalesce(array(select jsonb_array_elements_text(coalesce(p_input->'dietary_profile','[]'::jsonb))),'{}'),coalesce(array(select jsonb_array_elements_text(coalesce(p_input->'accessibility_needs','[]'::jsonb))),'{}'),nullif(p_input->>'address_release_at','')::timestamptz,case when venue.id is null then 'venue_review' else 'planning' end,auth.uid()) returning * into result;
  for menu_item in select * from jsonb_array_elements(coalesce(p_input->'menu_items','[]')) loop
    insert into command.food_event_items(event_id,item_name,dietary_tags,target_quantity,unit,preparation_burden)
    values(result.id,btrim(menu_item->>'item_name'),coalesce(array(select jsonb_array_elements_text(coalesce(menu_item->'dietary_tags','[]'))),'{}'),(menu_item->>'target_quantity')::numeric,btrim(menu_item->>'unit'),coalesce(menu_item->>'preparation_burden','medium'));
  end loop;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.event.created','food_event',result.id,jsonb_build_object('event_id',result.id,'service_zone',result.service_zone),'event-created:' || result.id);
  update command.food_command_receipts set status='completed',resource_type='food_event',resource_id=result.id,response=jsonb_build_object('id',result.id,'status',result.status) where actor_principal=actor and command_name='create_food_potluck' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.request_food_match_run(p_need_id uuid, p_trigger_reason text, p_idempotency_key text)
returns command.food_match_runs
language plpgsql security definer set search_path=command,public as $$
declare result command.food_match_runs; need command.food_needs; actor text:=auth.uid()::text; receipt command.food_command_receipts; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  request_hash:=encode(extensions.digest(concat_ws(':',p_need_id,p_trigger_reason),'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='request_food_match_run' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_match_runs where id=receipt.resource_id; return result;
  end if;
  if p_need_id is not null then
    select * into need from command.food_needs where id=p_need_id;
    if need.id is null or (need.created_by<>auth.uid() and command.current_role()<>'admin') then raise exception 'Need not found or access denied'; end if;
  end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'request_food_match_run',p_idempotency_key,request_hash);
  insert into command.food_match_runs(algorithm_version,input_snapshot,input_snapshot_hash,objective_settings,trigger_reason,status)
  values('pending','{}','pending','{}',btrim(p_trigger_reason),'queued') returning * into result;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.match.requested','food_match_run',result.id,jsonb_build_object('match_run_id',result.id,'need_id',p_need_id),'match-request:'||result.id);
  update command.food_command_receipts set status='completed',resource_type='food_match_run',resource_id=result.id,response=jsonb_build_object('id',result.id,'status',result.status) where actor_principal=actor and command_name='request_food_match_run' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.transition_food_supply(p_supply_id uuid,p_to_status text,p_idempotency_key text,p_reason text)
returns command.food_supplies
language plpgsql security definer set search_path=command,public as $$
declare result command.food_supplies; actor text:=auth.uid()::text; receipt command.food_command_receipts; current_compliance boolean; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  request_hash:=encode(extensions.digest(p_supply_id::text||':'||p_to_status||':'||coalesce(p_reason,''),'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='transition_food_supply' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_supplies where id=receipt.resource_id; return result;
  end if;
  select * into result from command.food_supplies where id=p_supply_id for update;
  if result.id is null or (result.created_by<>auth.uid() and command.current_role()<>'admin') then raise exception 'Supply not found or access denied'; end if;
  if result.status='incident_hold' and command.current_role()<>'admin' then raise exception 'Only a coordinator can disposition an incident hold'; end if;
  if not command.food_lifecycle_transition_allowed(result.status,p_to_status) then raise exception 'Lifecycle transition from % to % is not allowed',result.status,p_to_status; end if;
  if p_to_status='verified' then
    current_compliance:=result.lane='potluck' or exists(select 1 from command.food_verifications v where v.participant_id=result.participant_id and v.verification_type='food_safety_compliance' and v.evidence_status='verified' and (v.expires_at is null or v.expires_at>now()));
    if not current_compliance then raise exception 'Current food-safety compliance evidence is required'; end if;
    if result.lane='aid' and not exists(select 1 from command.food_verifications v where v.participant_id=result.participant_id and v.verification_type='aid_source_approval' and v.evidence_status='verified' and (v.expires_at is null or v.expires_at>now())) then raise exception 'Current aid-source approval is required'; end if;
    if result.lane='marketplace' and not exists(select 1 from command.food_verifications v where v.participant_id=result.participant_id and v.verification_type='provider_compliance' and v.evidence_status='verified' and (v.expires_at is null or v.expires_at>now())) then raise exception 'Current provider compliance evidence is required'; end if;
    update command.food_supplies set compliance_evidence=jsonb_set(compliance_evidence,'{current}',to_jsonb(true),true) where id=result.id;
  end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'transition_food_supply',p_idempotency_key,request_hash);
  update command.food_supplies set status=p_to_status where id=result.id returning * into result;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.supply.changed','food_supply',result.id,jsonb_build_object('supply_id',result.id,'status',result.status,'reason',p_reason),'supply-change:'||result.id||':'||p_idempotency_key);
  update command.food_command_receipts set status='completed',resource_type='food_supply',resource_id=result.id,response=jsonb_build_object('id',result.id,'status',result.status) where actor_principal=actor and command_name='transition_food_supply' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.create_food_location(p_label text,p_service_zone text,p_location_type text,p_exact_location_ciphertext bytea,p_sharing_policy text,p_saved_for_reuse boolean,p_idempotency_key text)
returns command.food_locations
language plpgsql security definer set search_path=command,public as $$
declare participant command.food_participants; result command.food_locations; receipt command.food_command_receipts; actor text:=auth.uid()::text; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  request_hash:=encode(extensions.digest(concat_ws(':',p_label,p_service_zone,p_location_type,encode(p_exact_location_ciphertext,'hex'),p_sharing_policy,p_saved_for_reuse),'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_location' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_locations where id=receipt.resource_id; return result;
  end if;
  select * into participant from command.food_participants where profile_id=auth.uid() and status='active';
  if participant.id is null then raise exception 'Active participant is required'; end if;
  if p_exact_location_ciphertext is null or octet_length(p_exact_location_ciphertext)<30 then raise exception 'Encrypted exact location is required'; end if;
  if p_location_type='private_home' and participant.trust_tier<2 then raise exception 'Private locations require community verification'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_location',p_idempotency_key,request_hash);
  insert into command.food_locations(participant_id,label,service_zone,location_type,exact_location_ciphertext,verification_method,verified_at,retention_deadline,saved_for_reuse,sharing_policy)
  values(participant.id,btrim(p_label),btrim(p_service_zone),p_location_type,p_exact_location_ciphertext,'authenticated_participant',now(),case when p_saved_for_reuse then null else now()+interval '30 days' end,p_saved_for_reuse,p_sharing_policy) returning * into result;
  update command.food_command_receipts set status='completed',resource_type='food_location',resource_id=result.id,response=jsonb_build_object('id',result.id,'service_zone',result.service_zone) where actor_principal=actor and command_name='create_food_location' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.create_food_venue(p_location_id uuid,p_name text,p_venue_type text,p_capacity integer,p_accessibility_features text[],p_conduct_agreement_version text,p_emergency_contact_configured boolean,p_idempotency_key text)
returns command.food_venues
language plpgsql security definer set search_path=command,public as $$
declare participant command.food_participants; location command.food_locations; result command.food_venues; receipt command.food_command_receipts; actor text:=auth.uid()::text; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  request_hash:=encode(extensions.digest(concat_ws(':',p_location_id,p_name,p_venue_type,p_capacity,p_accessibility_features,p_conduct_agreement_version,p_emergency_contact_configured),'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_venue' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_venues where id=receipt.resource_id; return result;
  end if;
  select * into participant from command.food_participants where profile_id=auth.uid() and status='active';
  select * into location from command.food_locations where id=p_location_id and participant_id=participant.id and deleted_at is null;
  if location.id is null then raise exception 'An owned current location is required'; end if;
  if p_venue_type='private_home' and (participant.trust_tier<3 or p_conduct_agreement_version is null or not p_emergency_contact_configured or location.location_type<>'private_home') then raise exception 'Private-home proposals require a T3 host, private location, conduct agreement, and emergency contact'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_venue',p_idempotency_key,request_hash);
  insert into command.food_venues(host_participant_id,location_id,name,venue_type,capacity,accessibility_features,conduct_agreement_version,emergency_contact_configured,created_by)
  values(case when p_venue_type='private_home' then participant.id else null end,location.id,btrim(p_name),p_venue_type,p_capacity,coalesce(p_accessibility_features,'{}'),nullif(btrim(p_conduct_agreement_version),''),p_emergency_contact_configured,auth.uid()) returning * into result;
  update command.food_command_receipts set status='completed',resource_type='food_venue',resource_id=result.id,response=jsonb_build_object('id',result.id,'status',result.verification_status) where actor_principal=actor and command_name='create_food_venue' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.cancel_food_commitment(p_commitment_id uuid,p_reason text,p_idempotency_key text)
returns command.food_commitments
language plpgsql security definer set search_path=command,public as $$
declare result command.food_commitments; need command.food_needs; supply command.food_supplies; actor text:=auth.uid()::text; receipt command.food_command_receipts; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  request_hash:=encode(extensions.digest(p_commitment_id::text||':'||coalesce(p_reason,''),'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='cancel_food_commitment' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_commitments where id=receipt.resource_id; return result;
  end if;
  select * into result from command.food_commitments where id=p_commitment_id for update;
  select * into need from command.food_needs where id=result.need_id for update;
  select * into supply from command.food_supplies where id=result.supply_id for update;
  if result.id is null or result.fulfillment_state not in ('held','committed') then raise exception 'Commitment cannot be cancelled automatically'; end if;
  if need.created_by<>auth.uid() and supply.created_by<>auth.uid() and command.current_role()<>'admin' then raise exception 'Only a commitment party or coordinator can cancel'; end if;
  if char_length(btrim(coalesce(p_reason,'')))<3 then raise exception 'Cancellation reason is required'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'cancel_food_commitment',p_idempotency_key,request_hash);
  update command.food_commitments set fulfillment_state='cancelled',cancellation_reason=btrim(p_reason) where id=result.id returning * into result;
  update command.food_supplies set committed_quantity=committed_quantity-result.quantity,status=case when committed_quantity-result.quantity>0 then 'committed' when held_quantity>0 then 'matched' else 'open' end where id=supply.id;
  update command.food_needs set committed_quantity=committed_quantity-result.quantity,status=case when committed_quantity-result.quantity>0 then 'committed' when held_quantity>0 then 'matched' else 'open' end where id=need.id;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.commitment.cancelled','food_commitment',result.id,jsonb_build_object('commitment_id',result.id,'reason',p_reason),'commitment-cancel:'||result.id);
  update command.food_command_receipts set status='completed',resource_type='food_commitment',resource_id=result.id,response=jsonb_build_object('id',result.id,'state',result.fulfillment_state) where actor_principal=actor and command_name='cancel_food_commitment' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.create_food_conversation(p_subject text,p_channel text,p_language text,p_related_need_id uuid,p_idempotency_key text)
returns command.food_conversations
language plpgsql security definer set search_path=command,public as $$
declare participant command.food_participants; result command.food_conversations; receipt command.food_command_receipts; actor text:=auth.uid()::text; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  request_hash:=encode(extensions.digest(concat_ws(':',p_subject,p_channel,p_language,p_related_need_id),'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_conversation' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_conversations where id=receipt.resource_id; return result;
  end if;
  select * into participant from command.food_participants where profile_id=auth.uid();
  if participant.id is null then raise exception 'Participant profile is required'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_conversation',p_idempotency_key,request_hash);
  insert into command.food_conversations(participant_id,subject,language,active_channel,related_need_id,created_by_principal) values(participant.id,btrim(p_subject),p_language,p_channel,p_related_need_id,actor) returning * into result;
  update command.food_command_receipts set status='completed',resource_type='food_conversation',resource_id=result.id,response=jsonb_build_object('id',result.id) where actor_principal=actor and command_name='create_food_conversation' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.review_food_venue(p_venue_id uuid,p_approved boolean,p_review_expires_at timestamptz,p_note text,p_idempotency_key text)
returns command.food_venues
language plpgsql security definer set search_path=command,public as $$
declare result command.food_venues; venue command.food_venues; host command.food_participants; receipt command.food_command_receipts; actor text:=auth.uid()::text; request_hash text;
begin
  if auth.uid() is null or command.current_role()<>'admin' then raise exception 'Coordinator permission is required'; end if;
  request_hash:=encode(extensions.digest(concat_ws(':',p_venue_id,p_approved,p_review_expires_at,p_note),'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='review_food_venue' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_venues where id=receipt.resource_id; return result;
  end if;
  select * into venue from command.food_venues where id=p_venue_id for update;
  select * into host from command.food_participants where id=venue.host_participant_id;
  if venue.id is null then raise exception 'Venue not found'; end if;
  if p_approved and p_review_expires_at<=now() then raise exception 'Approved venue evidence must expire in the future'; end if;
  if p_approved and venue.venue_type='private_home' and (host.trust_tier<3 or not venue.emergency_contact_configured or venue.conduct_agreement_version is null) then raise exception 'Private-home approval requires a T3 host, conduct agreement, and emergency contact'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'review_food_venue',p_idempotency_key,request_hash);
  update command.food_venues set verification_status=case when p_approved then 'verified' else 'rejected' end,reviewed_by=auth.uid(),reviewed_at=now(),review_expires_at=case when p_approved then p_review_expires_at else null end where id=venue.id returning * into result;
  update command.food_command_receipts set status='completed',resource_type='food_venue',resource_id=result.id,response=jsonb_build_object('id',result.id,'status',result.verification_status) where actor_principal=actor and command_name='review_food_venue' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.create_food_subsidy_campaign(p_name text,p_rules jsonb,p_starts_at timestamptz,p_ends_at timestamptz,p_idempotency_key text)
returns command.food_subsidy_campaigns
language plpgsql security definer set search_path=command,public as $$
declare result command.food_subsidy_campaigns; receipt command.food_command_receipts; actor text:=auth.uid()::text; request_hash text;
begin
  if auth.uid() is null or command.current_role()<>'admin' then raise exception 'Coordinator permission is required'; end if;
  request_hash:=encode(extensions.digest(concat_ws(':',p_name,p_rules,p_starts_at,p_ends_at),'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_subsidy_campaign' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_subsidy_campaigns where id=receipt.resource_id; return result;
  end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_subsidy_campaign',p_idempotency_key,request_hash);
  insert into command.food_subsidy_campaigns(name,rules,starts_at,ends_at,status,created_by) values(btrim(p_name),p_rules,p_starts_at,p_ends_at,'draft',auth.uid()) returning * into result;
  update command.food_command_receipts set status='completed',resource_type='food_subsidy_campaign',resource_id=result.id,response=jsonb_build_object('id',result.id,'status',result.status) where actor_principal=actor and command_name='create_food_subsidy_campaign' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;
