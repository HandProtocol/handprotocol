/*
  034_wxl_protocol_commands.sql
  Complete server-side commands for matching, commitments, fulfillment,
  donations, conversations, incidents, agent mandates, and A2A tasks.
*/

alter table command.food_participants add column if not exists stripe_account_id text unique;

create table if not exists command.food_commitment_checkpoints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  commitment_id uuid not null references command.food_commitments(id) on delete restrict,
  checkpoint_type text not null check (checkpoint_type in ('scheduled','accepted','picked_up','arrived','handoff','fulfilled','failed','incident')),
  evidence jsonb not null,
  actor_principal text not null,
  idempotency_key text not null unique
);

create table if not exists command.food_incidents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  resource_type text not null check (resource_type in ('need','supply','commitment','event','payment','location','conversation')),
  resource_id uuid not null,
  incident_type text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  report text not null check (char_length(btrim(report)) between 3 and 4000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','closed')),
  reported_by_principal text not null,
  assigned_to uuid references command.profiles(id) on delete set null,
  resolution_note text,
  resolved_at timestamptz,
  idempotency_key text not null unique
);

create table if not exists command.food_a2a_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  context_id uuid not null,
  agent_principal text not null,
  skill_id text not null,
  input jsonb not null,
  status text not null default 'submitted' check (status in ('submitted','working','input_required','completed','failed','cancelled')),
  output jsonb,
  error jsonb,
  idempotency_key text not null,
  unique (agent_principal,idempotency_key)
);

alter table command.food_location_access_events add column if not exists event_id uuid references command.food_events(id) on delete set null;

create index if not exists food_commitment_checkpoints_idx on command.food_commitment_checkpoints(commitment_id,created_at);
create index if not exists food_incidents_open_idx on command.food_incidents(status,severity,created_at) where status in ('open','reviewing');
create index if not exists food_a2a_tasks_status_idx on command.food_a2a_tasks(status,created_at);

drop trigger if exists food_commitment_checkpoints_immutable on command.food_commitment_checkpoints;
create trigger food_commitment_checkpoints_immutable before update or delete on command.food_commitment_checkpoints for each row execute function command.food_guard_immutable();
drop trigger if exists food_a2a_tasks_touch_updated_at on command.food_a2a_tasks;
create trigger food_a2a_tasks_touch_updated_at before update on command.food_a2a_tasks for each row execute function command.touch_updated_at();

create or replace function command.request_food_match_run(p_need_id uuid, p_trigger_reason text, p_idempotency_key text)
returns command.food_match_runs
language plpgsql security definer set search_path=command,public as $$
declare result command.food_match_runs; need command.food_needs; actor text:=auth.uid()::text; receipt command.food_command_receipts;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='request_food_match_run' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then select * into result from command.food_match_runs where id=receipt.resource_id; return result; end if;
  if p_need_id is not null then
    select * into need from command.food_needs where id=p_need_id;
    if need.id is null or (need.created_by<>auth.uid() and command.current_role()<>'admin') then raise exception 'Need not found or access denied'; end if;
  end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'request_food_match_run',p_idempotency_key,encode(extensions.digest(concat_ws(':',p_need_id,p_trigger_reason),'sha256'),'hex'));
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
declare result command.food_supplies; actor text:=auth.uid()::text; receipt command.food_command_receipts; current_compliance boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='transition_food_supply' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then select * into result from command.food_supplies where id=receipt.resource_id; return result; end if;
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
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'transition_food_supply',p_idempotency_key,encode(extensions.digest(p_supply_id::text||':'||p_to_status||':'||coalesce(p_reason,''),'sha256'),'hex'));
  update command.food_supplies set status=p_to_status where id=result.id returning * into result;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.supply.changed','food_supply',result.id,jsonb_build_object('supply_id',result.id,'status',result.status,'reason',p_reason),'supply-change:'||result.id||':'||p_idempotency_key);
  update command.food_command_receipts set status='completed',resource_type='food_supply',resource_id=result.id,response=jsonb_build_object('id',result.id,'status',result.status) where actor_principal=actor and command_name='transition_food_supply' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.create_food_location(p_label text,p_service_zone text,p_location_type text,p_exact_location_ciphertext bytea,p_sharing_policy text,p_saved_for_reuse boolean,p_idempotency_key text)
returns command.food_locations
language plpgsql security definer set search_path=command,public as $$
declare participant command.food_participants; result command.food_locations; receipt command.food_command_receipts; actor text:=auth.uid()::text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_location' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then select * into result from command.food_locations where id=receipt.resource_id; return result; end if;
  select * into participant from command.food_participants where profile_id=auth.uid() and status='active';
  if participant.id is null then raise exception 'Active participant is required'; end if;
  if p_exact_location_ciphertext is null or octet_length(p_exact_location_ciphertext)<30 then raise exception 'Encrypted exact location is required'; end if;
  if p_location_type='private_home' and participant.trust_tier<2 then raise exception 'Private locations require community verification'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_location',p_idempotency_key,encode(extensions.digest(concat_ws(':',p_label,p_service_zone,p_location_type,encode(p_exact_location_ciphertext,'hex'),p_sharing_policy,p_saved_for_reuse),'sha256'),'hex'));
  insert into command.food_locations(participant_id,label,service_zone,location_type,exact_location_ciphertext,verification_method,verified_at,retention_deadline,saved_for_reuse,sharing_policy)
  values(participant.id,btrim(p_label),btrim(p_service_zone),p_location_type,p_exact_location_ciphertext,'authenticated_participant',now(),case when p_saved_for_reuse then null else now()+interval '30 days' end,p_saved_for_reuse,p_sharing_policy) returning * into result;
  update command.food_command_receipts set status='completed',resource_type='food_location',resource_id=result.id,response=jsonb_build_object('id',result.id,'service_zone',result.service_zone) where actor_principal=actor and command_name='create_food_location' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.create_food_venue(p_location_id uuid,p_name text,p_venue_type text,p_capacity integer,p_accessibility_features text[],p_conduct_agreement_version text,p_emergency_contact_configured boolean,p_idempotency_key text)
returns command.food_venues
language plpgsql security definer set search_path=command,public as $$
declare participant command.food_participants; location command.food_locations; result command.food_venues; receipt command.food_command_receipts; actor text:=auth.uid()::text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_venue' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then select * into result from command.food_venues where id=receipt.resource_id; return result; end if;
  select * into participant from command.food_participants where profile_id=auth.uid() and status='active';
  select * into location from command.food_locations where id=p_location_id and participant_id=participant.id and deleted_at is null;
  if location.id is null then raise exception 'An owned current location is required'; end if;
  if p_venue_type='private_home' and (participant.trust_tier<3 or p_conduct_agreement_version is null or not p_emergency_contact_configured or location.location_type<>'private_home') then raise exception 'Private-home proposals require a T3 host, private location, conduct agreement, and emergency contact'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_venue',p_idempotency_key,encode(extensions.digest(concat_ws(':',p_location_id,p_name,p_venue_type,p_capacity,p_accessibility_features,p_conduct_agreement_version,p_emergency_contact_configured),'sha256'),'hex'));
  insert into command.food_venues(host_participant_id,location_id,name,venue_type,capacity,accessibility_features,conduct_agreement_version,emergency_contact_configured,created_by)
  values(case when p_venue_type='private_home' then participant.id else null end,location.id,btrim(p_name),p_venue_type,p_capacity,coalesce(p_accessibility_features,'{}'),nullif(btrim(p_conduct_agreement_version),''),p_emergency_contact_configured,auth.uid()) returning * into result;
  update command.food_command_receipts set status='completed',resource_type='food_venue',resource_id=result.id,response=jsonb_build_object('id',result.id,'status',result.verification_status) where actor_principal=actor and command_name='create_food_venue' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.complete_food_match_run(p_run_id uuid,p_worker text,p_algorithm_version text,p_input_snapshot jsonb,p_input_snapshot_hash text,p_objectives jsonb,p_candidates jsonb,p_allocations jsonb)
returns command.food_match_runs
language plpgsql security definer set search_path=command,public as $$
declare result command.food_match_runs; candidate jsonb; allocation jsonb;
begin
  if current_user not in ('postgres','service_role') then raise exception 'Worker permission is required'; end if;
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
  if current_user not in ('postgres','service_role') then raise exception 'Worker permission is required'; end if;
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
  if current_user not in ('postgres','service_role') then raise exception 'Worker permission is required'; end if;
  for hold in select * from command.food_match_holds where status='active' and expires_at<=now() for update skip locked loop
    update command.food_match_holds set status='expired',released_at=now() where id=hold.id;
    update command.food_supplies set held_quantity=greatest(0,held_quantity-hold.quantity),status=case when committed_quantity>0 then 'committed' when held_quantity-hold.quantity>0 then 'matched' else 'open' end where id=hold.supply_id;
    update command.food_needs set held_quantity=greatest(0,held_quantity-hold.quantity),status=case when committed_quantity>0 then 'committed' when held_quantity-hold.quantity>0 then 'matched' else 'open' end where id=hold.need_id;
    released:=released+1;
  end loop;
  return released;
end;
$$;

create or replace function command.cancel_food_commitment(p_commitment_id uuid,p_reason text,p_idempotency_key text)
returns command.food_commitments
language plpgsql security definer set search_path=command,public as $$
declare result command.food_commitments; need command.food_needs; supply command.food_supplies; actor text:=auth.uid()::text; receipt command.food_command_receipts;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='cancel_food_commitment' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then select * into result from command.food_commitments where id=receipt.resource_id; return result; end if;
  select * into result from command.food_commitments where id=p_commitment_id for update;
  select * into need from command.food_needs where id=result.need_id for update;
  select * into supply from command.food_supplies where id=result.supply_id for update;
  if result.id is null or result.fulfillment_state not in ('held','committed') then raise exception 'Commitment cannot be cancelled automatically'; end if;
  if need.created_by<>auth.uid() and supply.created_by<>auth.uid() and command.current_role()<>'admin' then raise exception 'Only a commitment party or coordinator can cancel'; end if;
  if char_length(btrim(coalesce(p_reason,'')))<3 then raise exception 'Cancellation reason is required'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'cancel_food_commitment',p_idempotency_key,encode(extensions.digest(p_commitment_id::text||':'||p_reason,'sha256'),'hex'));
  update command.food_commitments set fulfillment_state='cancelled',cancellation_reason=btrim(p_reason) where id=result.id returning * into result;
  update command.food_supplies set committed_quantity=committed_quantity-result.quantity,status=case when committed_quantity-result.quantity>0 then 'committed' when held_quantity>0 then 'matched' else 'open' end where id=supply.id;
  update command.food_needs set committed_quantity=committed_quantity-result.quantity,status=case when committed_quantity-result.quantity>0 then 'committed' when held_quantity>0 then 'matched' else 'open' end where id=need.id;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.commitment.cancelled','food_commitment',result.id,jsonb_build_object('commitment_id',result.id,'reason',p_reason),'commitment-cancel:'||result.id);
  update command.food_command_receipts set status='completed',resource_type='food_commitment',resource_id=result.id,response=jsonb_build_object('id',result.id,'state',result.fulfillment_state) where actor_principal=actor and command_name='cancel_food_commitment' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.schedule_food_fulfillment(p_commitment_id uuid,p_input jsonb,p_idempotency_key text)
returns command.food_commitments
language plpgsql security definer set search_path=command,public as $$
declare result command.food_commitments; need command.food_needs; supply command.food_supplies; readiness command.food_lane_readiness; actor text:=auth.uid()::text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into result from command.food_commitments where id=p_commitment_id for update;
  select * into need from command.food_needs where id=result.need_id;
  select * into supply from command.food_supplies where id=result.supply_id;
  select * into readiness from command.food_lane_readiness where lane=result.lane and geography='Austin, Texas';
  if result.id is null or result.fulfillment_state<>'committed' then raise exception 'A committed allocation is required'; end if;
  if readiness.decision<>'go' or readiness.stage not in ('supervised_pilot','live') then raise exception 'This lane has not passed its readiness gate'; end if;
  if result.lane='marketplace' and result.payment_state not in ('authorized','captured') then raise exception 'Marketplace payment must be authorized before fulfillment'; end if;
  if need.fulfillment_method in ('delivery','either') and not exists(select 1 from command.food_locations where participant_id=need.participant_id and service_zone=need.service_zone and exact_location_ciphertext is not null and deleted_at is null and sharing_policy in ('after_commitment','active_run')) then raise exception 'Delivery requires a current consented exact location'; end if;
  if need.created_by<>auth.uid() and supply.created_by<>auth.uid() and command.current_role()<>'admin' then raise exception 'Only a commitment party or coordinator can schedule fulfillment'; end if;
  insert into command.food_commitment_checkpoints(commitment_id,checkpoint_type,evidence,actor_principal,idempotency_key) values(result.id,'scheduled',p_input,actor,p_idempotency_key);
  update command.food_commitments set fulfillment_state='in_fulfillment' where id=result.id returning * into result;
  update command.food_needs set status='in_fulfillment' where id=result.need_id;
  update command.food_supplies set status='in_fulfillment' where id=result.supply_id;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.fulfillment.scheduled','food_commitment',result.id,jsonb_build_object('commitment_id',result.id,'schedule',p_input),'fulfillment-scheduled:'||result.id);
  return result;
end;
$$;

create or replace function command.record_food_commitment_checkpoint(p_commitment_id uuid,p_input jsonb,p_idempotency_key text)
returns command.food_commitments
language plpgsql security definer set search_path=command,public as $$
declare result command.food_commitments; checkpoint_type text:=p_input->>'checkpoint_type'; need command.food_needs; supply command.food_supplies;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into result from command.food_commitments where id=p_commitment_id for update;
  select * into need from command.food_needs where id=result.need_id;
  select * into supply from command.food_supplies where id=result.supply_id;
  if result.id is null or result.fulfillment_state not in ('in_fulfillment','incident_hold') then raise exception 'Commitment is not in fulfillment'; end if;
  if need.created_by<>auth.uid() and supply.created_by<>auth.uid() and command.current_role()<>'admin' then raise exception 'Checkpoint access is denied'; end if;
  if checkpoint_type='fulfilled' and (not coalesce((p_input->>'handoff_confirmed')::boolean,false) or nullif(p_input->>'observed_quantity','')::numeric<=0) then raise exception 'Fulfillment requires accepted handoff and observed quantity'; end if;
  insert into command.food_commitment_checkpoints(commitment_id,checkpoint_type,evidence,actor_principal,idempotency_key) values(result.id,checkpoint_type,p_input,auth.uid()::text,p_idempotency_key);
  if checkpoint_type='incident' then
    update command.food_commitments set fulfillment_state='incident_hold' where id=result.id returning * into result;
    update command.food_needs set status='incident_hold' where id=result.need_id;
    update command.food_supplies set status='incident_hold' where id=result.supply_id;
  elsif checkpoint_type='fulfilled' then
    update command.food_commitments set fulfillment_state='fulfilled' where id=result.id returning * into result;
    update command.food_needs set committed_quantity=committed_quantity-result.quantity,fulfilled_quantity=fulfilled_quantity+result.quantity,status=case when fulfilled_quantity+result.quantity>=quantity then 'fulfilled' when committed_quantity-result.quantity>0 then 'committed' when held_quantity>0 then 'matched' else 'open' end where id=result.need_id;
    update command.food_supplies set committed_quantity=committed_quantity-result.quantity,fulfilled_quantity=fulfilled_quantity+result.quantity,status=case when fulfilled_quantity+result.quantity>=quantity then 'fulfilled' when committed_quantity-result.quantity>0 then 'committed' when held_quantity>0 then 'matched' else 'open' end where id=result.supply_id;
    insert into command.food_reputation_ledger(participant_id,event_type,recognition_points,reliability_delta,evidence_type,evidence_id,context,actor_principal,idempotency_key) values(supply.participant_id,'food_contributed',1,1,'food_commitment',result.id,jsonb_build_object('quantity',result.quantity,'unit',result.unit),auth.uid()::text,'reputation-fulfillment:'||result.id) on conflict(idempotency_key) do nothing;
    if result.lane='marketplace' then insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.payment.settlement_ready','food_commitment',result.id,jsonb_build_object('commitment_id',result.id),'settlement-ready:'||result.id); end if;
  end if;
  return result;
end;
$$;

create or replace function command.create_food_donation(p_campaign_id uuid,p_amount_cents bigint,p_receipt_language text,p_idempotency_key text)
returns command.food_donations
language plpgsql security definer set search_path=command,public as $$
declare participant command.food_participants; campaign command.food_subsidy_campaigns; result command.food_donations;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_amount_cents<100 then raise exception 'Donation amount must be at least one dollar'; end if;
  select * into participant from command.food_participants where profile_id=auth.uid();
  select * into campaign from command.food_subsidy_campaigns where id=p_campaign_id and status='active' and now() between starts_at and ends_at;
  if campaign.id is null then raise exception 'Donation campaign is not active'; end if;
  insert into command.food_donations(campaign_id,donor_participant_id,amount_cents,receipt_language,tax_receipt_eligible,idempotency_key) values(campaign.id,participant.id,p_amount_cents,p_receipt_language,false,p_idempotency_key) returning * into result;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.donation.authorization_requested','food_donation',result.id,jsonb_build_object('donation_id',result.id,'amount_cents',result.amount_cents),'donation-auth:'||result.id);
  return result;
end;
$$;

create or replace function command.create_food_conversation(p_subject text,p_channel text,p_language text,p_related_need_id uuid,p_idempotency_key text)
returns command.food_conversations
language plpgsql security definer set search_path=command,public as $$
declare participant command.food_participants; result command.food_conversations; receipt command.food_command_receipts; actor text:=auth.uid()::text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_conversation' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then select * into result from command.food_conversations where id=receipt.resource_id; return result; end if;
  select * into participant from command.food_participants where profile_id=auth.uid();
  if participant.id is null then raise exception 'Participant profile is required'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_conversation',p_idempotency_key,encode(extensions.digest(concat_ws(':',p_subject,p_channel,p_language,p_related_need_id),'sha256'),'hex'));
  insert into command.food_conversations(participant_id,subject,language,active_channel,related_need_id,created_by_principal) values(participant.id,btrim(p_subject),p_language,p_channel,p_related_need_id,actor) returning * into result;
  update command.food_command_receipts set status='completed',resource_type='food_conversation',resource_id=result.id,response=jsonb_build_object('id',result.id) where actor_principal=actor and command_name='create_food_conversation' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.send_food_message(p_conversation_id uuid,p_channel text,p_body text,p_structured_payload jsonb,p_idempotency_key text)
returns command.food_messages
language plpgsql security definer set search_path=command,public as $$
declare conversation command.food_conversations; result command.food_messages;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into conversation from command.food_conversations where id=p_conversation_id;
  if conversation.id is null or (conversation.created_by_principal<>auth.uid()::text and conversation.assigned_coordinator<>auth.uid() and command.current_role()<>'admin') then raise exception 'Conversation access is denied'; end if;
  insert into command.food_messages(conversation_id,channel,direction,sender_principal,body,structured_payload,sensitive,idempotency_key) values(conversation.id,p_channel,'inbound',auth.uid()::text,p_body,coalesce(p_structured_payload,'{}'),p_channel='voice',p_idempotency_key) returning * into result;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.conversation.message_received','food_conversation',conversation.id,jsonb_build_object('conversation_id',conversation.id,'message_id',result.id,'channel',p_channel),'message-received:'||result.id);
  return result;
end;
$$;

create or replace function command.create_food_agent_mandate(p_agent_principal text,p_actions text[],p_lanes text[],p_service_zones text[],p_per_transaction_limit_cents bigint,p_daily_limit_cents bigint,p_total_limit_cents bigint,p_expires_at timestamptz,p_idempotency_key text)
returns command.food_agent_mandates
language plpgsql security definer set search_path=command,public as $$
declare participant command.food_participants; result command.food_agent_mandates; receipt command.food_command_receipts; actor text:=auth.uid()::text; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  request_hash:=encode(extensions.digest(concat_ws(':',p_agent_principal,p_actions,p_lanes,p_service_zones,p_per_transaction_limit_cents,p_daily_limit_cents,p_total_limit_cents,p_expires_at),'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_agent_mandate' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if; select * into result from command.food_agent_mandates where id=receipt.resource_id; return result; end if;
  select * into participant from command.food_participants where profile_id=auth.uid() and status='active';
  if participant.id is null then raise exception 'Active participant is required'; end if;
  if p_expires_at>now()+interval '90 days' or p_expires_at<=now() then raise exception 'Mandate expiry must be within 90 days'; end if;
  if 'create_payment'=any(p_actions) and (p_per_transaction_limit_cents<=0 or p_daily_limit_cents<=0 or p_total_limit_cents<=0) then raise exception 'Payment mandates require positive spending ceilings'; end if;
  if p_agent_principal<>auth.uid()::text and p_actions && array['commit_match','create_payment','release_location']::text[] and not command.food_agent_is_certified(p_agent_principal,p_actions) then raise exception 'External agent certification is required for high-authority actions'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_agent_mandate',p_idempotency_key,request_hash);
  insert into command.food_agent_mandates(participant_id,agent_principal,permitted_actions,lanes,service_zones,per_transaction_limit_cents,daily_limit_cents,total_limit_cents,expires_at)
  values(participant.id,btrim(p_agent_principal),p_actions,p_lanes,p_service_zones,p_per_transaction_limit_cents,p_daily_limit_cents,p_total_limit_cents,p_expires_at) returning * into result;
  insert into command.food_agent_actions(agent_principal,participant_id,mandate_id,action_type,resource_type,resource_id,request_payload,status,evidence) values(auth.uid()::text,participant.id,result.id,'create_mandate','food_agent_mandate',result.id,jsonb_build_object('idempotency_key',p_idempotency_key),'executed','{}');
  update command.food_command_receipts set status='completed',resource_type='food_agent_mandate',resource_id=result.id,response=jsonb_build_object('id',result.id,'expires_at',result.expires_at) where actor_principal=actor and command_name='create_food_agent_mandate' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.report_food_incident(p_resource_type text,p_resource_id uuid,p_reason text,p_idempotency_key text)
returns command.food_incidents
language plpgsql security definer set search_path=command,public as $$
declare result command.food_incidents; allowed boolean:=false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_resource_type='need' then select exists(select 1 from command.food_needs where id=p_resource_id and (created_by=auth.uid() or command.current_role()='admin')) into allowed;
  elsif p_resource_type='supply' then select exists(select 1 from command.food_supplies where id=p_resource_id and (created_by=auth.uid() or command.current_role()='admin')) into allowed;
  elsif p_resource_type='commitment' then select exists(select 1 from command.food_commitments c where c.id=p_resource_id and (command.current_role()='admin' or exists(select 1 from command.food_needs n where n.id=c.need_id and n.created_by=auth.uid()) or exists(select 1 from command.food_supplies s where s.id=c.supply_id and s.created_by=auth.uid()))) into allowed;
  elsif p_resource_type='event' then select exists(select 1 from command.food_events where id=p_resource_id and (created_by=auth.uid() or command.current_role()='admin')) into allowed;
  elsif p_resource_type='payment' then select exists(select 1 from command.food_payment_orders o join command.food_participants p on p.id in (o.provider_participant_id,o.purchaser_participant_id) where o.id=p_resource_id and (p.profile_id=auth.uid() or command.current_role()='admin')) into allowed;
  elsif p_resource_type='location' then select exists(select 1 from command.food_locations l join command.food_participants p on p.id=l.participant_id where l.id=p_resource_id and (p.profile_id=auth.uid() or command.current_role()='admin')) into allowed;
  elsif p_resource_type='conversation' then select exists(select 1 from command.food_conversations where id=p_resource_id and (created_by_principal=auth.uid()::text or assigned_coordinator=auth.uid() or command.current_role()='admin')) into allowed;
  end if;
  if not allowed then raise exception 'Resource not found or incident access denied'; end if;
  insert into command.food_incidents(resource_type,resource_id,incident_type,severity,report,reported_by_principal,idempotency_key) values(p_resource_type,p_resource_id,'reported','high',btrim(p_reason),auth.uid()::text,p_idempotency_key) returning * into result;
  if p_resource_type='need' then update command.food_needs set status='incident_hold' where id=p_resource_id and created_by=auth.uid();
  elsif p_resource_type='supply' then update command.food_supplies set status='incident_hold' where id=p_resource_id and created_by=auth.uid();
  elsif p_resource_type='commitment' then update command.food_commitments set fulfillment_state='incident_hold' where id=p_resource_id and exists(select 1 from command.food_needs n where n.id=need_id and n.created_by=auth.uid());
  elsif p_resource_type='event' then update command.food_events set status='incident_hold' where id=p_resource_id and created_by=auth.uid();
  end if;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.incident.reported','food_incident',result.id,jsonb_build_object('incident_id',result.id,'resource_type',p_resource_type,'resource_id',p_resource_id),'incident:'||result.id);
  return result;
end;
$$;

create or replace function command.revoke_food_agent_mandate(p_mandate_id uuid,p_reason text,p_idempotency_key text)
returns command.food_agent_mandates
language plpgsql security definer set search_path=command,public as $$
declare result command.food_agent_mandates; participant command.food_participants; receipt command.food_command_receipts; actor text:=auth.uid()::text; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  request_hash:=encode(extensions.digest(p_mandate_id::text||':'||coalesce(p_reason,''),'sha256'),'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='revoke_food_agent_mandate' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then if receipt.request_hash<>request_hash then raise exception 'Idempotency key was reused with different input'; end if; select * into result from command.food_agent_mandates where id=receipt.resource_id; return result; end if;
  select * into result from command.food_agent_mandates where id=p_mandate_id for update;
  select * into participant from command.food_participants where id=result.participant_id;
  if result.id is null or (participant.profile_id<>auth.uid() and command.current_role()<>'admin') then raise exception 'Mandate not found or access denied'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'revoke_food_agent_mandate',p_idempotency_key,request_hash);
  if result.revoked_at is null then update command.food_agent_mandates set revoked_at=now(),revoked_by=auth.uid(),revocation_reason=btrim(p_reason) where id=result.id returning * into result; end if;
  insert into command.food_agent_actions(agent_principal,participant_id,mandate_id,action_type,resource_type,resource_id,request_payload,status,evidence) values(auth.uid()::text,participant.id,result.id,'revoke_mandate','food_agent_mandate',result.id,jsonb_build_object('reason',p_reason,'idempotency_key',p_idempotency_key),'executed','{}');
  update command.food_command_receipts set status='completed',resource_type='food_agent_mandate',resource_id=result.id,response=jsonb_build_object('id',result.id,'revoked_at',result.revoked_at) where actor_principal=actor and command_name='revoke_food_agent_mandate' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.create_food_a2a_task(p_context_id uuid,p_skill_id text,p_input jsonb,p_idempotency_key text)
returns command.food_a2a_tasks
language plpgsql security definer set search_path=command,public as $$
declare result command.food_a2a_tasks;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into command.food_a2a_tasks(context_id,agent_principal,skill_id,input,idempotency_key)
  values(p_context_id,auth.uid()::text,btrim(p_skill_id),p_input,p_idempotency_key)
  on conflict(agent_principal,idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning * into result;
  return result;
end;
$$;

create or replace function command.ingest_food_voice_message(p_provider_call_id text,p_contact_fingerprint text,p_language text,p_transcript text,p_confidence numeric,p_idempotency_key text)
returns command.food_messages
language plpgsql security definer set search_path=command,public as $$
declare channel command.food_contact_channels; conversation command.food_conversations; result command.food_messages;
begin
  if current_user not in ('postgres','service_role') then raise exception 'Voice adapter permission is required'; end if;
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
  if current_user not in ('postgres','service_role') then raise exception 'Event planner permission is required'; end if;
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

create or replace function command.release_food_event_location(p_event_id uuid,p_purpose text)
returns bytea
language plpgsql security definer set search_path=command,public as $$
declare event command.food_events; venue command.food_venues; location command.food_locations; participant command.food_participants; action_id uuid; decision_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into participant from command.food_participants where profile_id=auth.uid();
  select * into event from command.food_events where id=p_event_id;
  select * into venue from command.food_venues where id=event.venue_id;
  select * into location from command.food_locations where id=venue.location_id and deleted_at is null;
  if event.id is null or venue.id is null or location.id is null or event.status not in ('confirmed','in_progress') or now()<coalesce(event.address_release_at,event.starts_at-interval '24 hours') then raise exception 'Event location is not available'; end if;
  if participant.id<>event.organizer_participant_id and not exists(select 1 from command.food_event_rsvps where event_id=event.id and participant_id=participant.id and response='yes') then raise exception 'Only confirmed attendees may access the event location'; end if;
  insert into command.food_agent_actions(agent_principal,participant_id,action_type,resource_type,resource_id,request_payload,status,evidence) values(auth.uid()::text,participant.id,'release_event_location','food_event',event.id,jsonb_build_object('purpose',p_purpose),'executed','{}') returning id into action_id;
  insert into command.food_policy_decisions(agent_action_id,actor_principal,policy_version,decision,reason_codes,evaluated_facts) values(action_id,auth.uid()::text,'event-location-v1','allow',array['confirmed_attendee','release_window_open','venue_verified'],jsonb_build_object('event_id',event.id,'venue_id',venue.id)) returning id into decision_id;
  insert into command.food_location_access_events(location_id,actor_principal,purpose,precision_released,event_id,policy_decision_id) values(location.id,auth.uid()::text,btrim(p_purpose),'exact',event.id,decision_id);
  return location.exact_location_ciphertext;
end;
$$;

create or replace function command.complete_food_a2a_task(p_task_id uuid,p_status text,p_output jsonb,p_error jsonb)
returns command.food_a2a_tasks
language plpgsql security definer set search_path=command,public as $$
declare result command.food_a2a_tasks;
begin
  if current_user not in ('postgres','service_role') then raise exception 'Agent task processor permission is required'; end if;
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
  if current_user not in ('postgres','service_role') then raise exception 'Retention worker permission is required'; end if;
  update command.food_locations set exact_location_ciphertext=null,deleted_at=now() where deleted_at is null and not saved_for_reuse and retention_deadline is not null and retention_deadline<=now();
  get diagnostics location_count=row_count;
  update command.food_messages message set body='[deleted under retention policy]',structured_payload='{}' from command.food_voice_sessions session where session.conversation_id=message.conversation_id and message.channel='voice' and session.transcript_retention_deadline<=now() and session.transcript_deleted_at is null;
  get diagnostics transcript_count=row_count;
  update command.food_voice_sessions set transcript_deleted_at=now() where transcript_retention_deadline<=now() and transcript_deleted_at is null;
  return jsonb_build_object('locations_deleted',location_count,'voice_messages_redacted',transcript_count);
end;
$$;

alter table command.food_commitment_checkpoints enable row level security;
alter table command.food_incidents enable row level security;
alter table command.food_a2a_tasks enable row level security;
drop policy if exists food_commitment_checkpoints_party_read on command.food_commitment_checkpoints;
create policy food_commitment_checkpoints_party_read on command.food_commitment_checkpoints for select using(command.current_role()='admin' or exists(select 1 from command.food_commitments c join command.food_needs n on n.id=c.need_id join command.food_supplies s on s.id=c.supply_id where c.id=commitment_id and (n.created_by=auth.uid() or s.created_by=auth.uid())));
drop policy if exists food_incidents_reporter_read on command.food_incidents;
create policy food_incidents_reporter_read on command.food_incidents for select using(reported_by_principal=auth.uid()::text or assigned_to=auth.uid() or command.current_role()='admin');
drop policy if exists food_a2a_tasks_owner_read on command.food_a2a_tasks;
create policy food_a2a_tasks_owner_read on command.food_a2a_tasks for select using(agent_principal=auth.uid()::text or command.current_role()='admin');
grant select on command.food_commitment_checkpoints,command.food_incidents,command.food_a2a_tasks to authenticated;
revoke insert,update,delete on command.food_commitment_checkpoints,command.food_incidents,command.food_a2a_tasks from anon,authenticated;

revoke execute on function command.request_food_match_run(uuid,text,text),command.transition_food_supply(uuid,text,text,text),command.create_food_location(text,text,text,bytea,text,boolean,text),command.create_food_venue(uuid,text,text,integer,text[],text,boolean,text),command.cancel_food_commitment(uuid,text,text),command.schedule_food_fulfillment(uuid,jsonb,text),command.record_food_commitment_checkpoint(uuid,jsonb,text),command.create_food_donation(uuid,bigint,text,text),command.create_food_conversation(text,text,text,uuid,text),command.send_food_message(uuid,text,text,jsonb,text),command.create_food_agent_mandate(text,text[],text[],text[],bigint,bigint,bigint,timestamptz,text),command.revoke_food_agent_mandate(uuid,text,text),command.report_food_incident(text,uuid,text,text),command.create_food_a2a_task(uuid,text,jsonb,text) from public;
revoke execute on function command.complete_food_match_run(uuid,text,text,jsonb,text,jsonb,jsonb,jsonb),command.begin_system_food_match_run(text),command.release_expired_food_match_holds(),command.complete_food_a2a_task(uuid,text,jsonb,jsonb),command.ingest_food_voice_message(text,text,text,text,numeric,text),command.plan_food_potluck(uuid,text),command.enforce_food_retention() from public,anon,authenticated;
revoke execute on function command.release_food_event_location(uuid,text) from public;
grant execute on function command.complete_food_match_run(uuid,text,text,jsonb,text,jsonb,jsonb,jsonb) to service_role;
grant execute on function command.begin_system_food_match_run(text),command.release_expired_food_match_holds() to service_role;
grant execute on function command.complete_food_a2a_task(uuid,text,jsonb,jsonb) to service_role;
grant execute on function command.ingest_food_voice_message(text,text,text,text,numeric,text) to service_role;
grant execute on function command.plan_food_potluck(uuid,text) to service_role;
grant execute on function command.enforce_food_retention() to service_role;
grant execute on function command.release_food_event_location(uuid,text) to authenticated;
grant execute on function command.request_food_match_run(uuid,text,text),command.transition_food_supply(uuid,text,text,text),command.create_food_location(text,text,text,bytea,text,boolean,text),command.create_food_venue(uuid,text,text,integer,text[],text,boolean,text),command.cancel_food_commitment(uuid,text,text),command.schedule_food_fulfillment(uuid,jsonb,text),command.record_food_commitment_checkpoint(uuid,jsonb,text),command.create_food_donation(uuid,bigint,text,text),command.create_food_conversation(text,text,text,uuid,text),command.send_food_message(uuid,text,text,jsonb,text),command.create_food_agent_mandate(text,text[],text[],text[],bigint,bigint,bigint,timestamptz,text),command.revoke_food_agent_mandate(uuid,text,text),command.report_food_incident(text,uuid,text,text),command.create_food_a2a_task(uuid,text,jsonb,text) to authenticated;

comment on table command.food_commitment_checkpoints is 'Append-only accepted evidence for canonical fulfillment.';
comment on table command.food_incidents is 'Human-reviewable safety, privacy, conduct, payment, and operational incident reports.';
comment on table command.food_a2a_tasks is 'Audited long-running task state for approved external agents.';
