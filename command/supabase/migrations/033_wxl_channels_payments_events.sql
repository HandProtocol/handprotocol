/*
  033_wxl_channels_payments_events.sql
  Conversations, voice sessions, commercial accounting, subsidy accounting,
  potluck coordination, lane readiness, location release, and worker leases.
  SMS delivery is intentionally deferred. The conversation model can accept an
  SMS channel in a later migration without changing operational resources.
*/

create table if not exists command.food_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  participant_id uuid not null references command.food_participants(id) on delete restrict,
  subject text not null check (char_length(btrim(subject)) between 1 and 200),
  status text not null default 'open' check (status in ('open','waiting','resolved','closed','incident_hold')),
  language text not null default 'en' check (language in ('en','es')),
  active_channel text not null default 'web' check (active_channel in ('web','voice','agent','external_agent')),
  assigned_coordinator uuid references command.profiles(id) on delete set null,
  related_need_id uuid references command.food_needs(id) on delete set null,
  related_supply_id uuid references command.food_supplies(id) on delete set null,
  related_commitment_id uuid references command.food_commitments(id) on delete set null,
  created_by_principal text not null
);

create table if not exists command.food_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  conversation_id uuid not null references command.food_conversations(id) on delete cascade,
  channel text not null check (channel in ('web','voice','agent','external_agent')),
  direction text not null check (direction in ('inbound','outbound','internal')),
  sender_principal text not null,
  body text not null check (char_length(body) between 1 and 4000),
  structured_payload jsonb not null default '{}'::jsonb,
  sensitive boolean not null default false,
  delivery_state text not null default 'accepted' check (delivery_state in ('accepted','queued','sent','delivered','failed')),
  provider_message_id text,
  idempotency_key text not null unique
);

create table if not exists command.food_voice_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  conversation_id uuid not null references command.food_conversations(id) on delete cascade,
  provider_call_id text not null unique,
  language text not null check (language in ('en','es')),
  input_mode text not null default 'speech' check (input_mode in ('speech','keypad','mixed')),
  status text not null check (status in ('ringing','active','transferred','completed','failed')),
  transfer_requested boolean not null default false,
  transcript_retention_deadline timestamptz not null,
  transcript_deleted_at timestamptz
);

create table if not exists command.food_payment_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  commitment_id uuid not null unique references command.food_commitments(id) on delete restrict,
  mandate_id uuid references command.food_agent_mandates(id) on delete restrict,
  provider_participant_id uuid not null references command.food_participants(id) on delete restrict,
  purchaser_participant_id uuid not null references command.food_participants(id) on delete restrict,
  currency text not null default 'usd' check (currency = 'usd'),
  food_subtotal_cents bigint not null check (food_subtotal_cents >= 0),
  delivery_cents bigint not null default 0 check (delivery_cents >= 0),
  hand_fee_cents bigint not null check (hand_fee_cents >= 0 and hand_fee_cents <= 300),
  subsidy_cents bigint not null default 0 check (subsidy_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  tip_cents bigint not null default 0 check (tip_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  provider_amount_cents bigint not null check (provider_amount_cents >= 0),
  provider_topup_cents bigint not null default 0 check (provider_topup_cents >= 0),
  stripe_payment_intent_id text unique,
  stripe_charge_id text unique,
  status text not null default 'created' check (status in ('created','authorization_pending','authorized','captured','partially_refunded','refunded','failed','cancelled','disputed')),
  authorized_at timestamptz,
  captured_at timestamptz,
  settled_at timestamptz,
  check (hand_fee_cents = least(300::bigint, round(food_subtotal_cents * 0.05)::bigint)),
  check (subsidy_cents <= hand_fee_cents + delivery_cents),
  check (total_cents = food_subtotal_cents + delivery_cents + hand_fee_cents - subsidy_cents + tax_cents + tip_cents),
  check (provider_amount_cents = food_subtotal_cents + delivery_cents + tax_cents + tip_cents),
  check (provider_topup_cents = greatest(0::bigint,subsidy_cents-hand_fee_cents))
);

create table if not exists command.food_transfers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payment_order_id uuid not null references command.food_payment_orders(id) on delete restrict,
  transfer_type text not null check (transfer_type in ('provider_payout','refund','chargeback','chargeback_reversal')),
  amount_cents bigint not null check (amount_cents > 0),
  stripe_transfer_id text unique,
  stripe_refund_id text unique,
  status text not null check (status in ('pending','submitted','paid','failed','reversed')),
  reason text not null,
  idempotency_key text not null unique
);

create table if not exists command.food_subsidy_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  rules jsonb not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','active','paused','closed')),
  created_by uuid not null references command.profiles(id) on delete restrict,
  check (ends_at > starts_at)
);

create table if not exists command.food_donations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid not null references command.food_subsidy_campaigns(id) on delete restrict,
  donor_participant_id uuid references command.food_participants(id) on delete set null,
  amount_cents bigint not null check (amount_cents > 0),
  processor_fee_cents bigint not null default 0 check (processor_fee_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  stripe_payment_intent_id text unique,
  status text not null default 'pending' check (status in ('pending','succeeded','refunded','failed','disputed')),
  receipt_language text not null default 'en' check (receipt_language in ('en','es')),
  tax_receipt_eligible boolean not null default false,
  idempotency_key text not null unique
);

create table if not exists command.food_subsidy_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid not null references command.food_subsidy_campaigns(id) on delete restrict,
  donation_id uuid references command.food_donations(id) on delete restrict,
  payment_order_id uuid references command.food_payment_orders(id) on delete restrict,
  entry_type text not null check (entry_type in ('donation_credit','processor_cost','subsidy_debit','refund_credit','adjustment_credit','adjustment_debit')),
  amount_cents bigint not null check (amount_cents <> 0),
  balance_after_cents bigint not null check (balance_after_cents >= 0),
  reason text not null,
  actor_principal text not null,
  idempotency_key text not null unique,
  check ((entry_type in ('donation_credit','refund_credit','adjustment_credit') and amount_cents > 0) or (entry_type in ('processor_cost','subsidy_debit','adjustment_debit') and amount_cents < 0))
);

create table if not exists command.food_stripe_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stripe_event_id text not null unique,
  event_type text not null,
  object_id text,
  payload jsonb not null,
  signature_verified boolean not null,
  processed_at timestamptz,
  processing_error text
);

create table if not exists command.food_reputation_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  participant_id uuid not null references command.food_participants(id) on delete restrict,
  event_type text not null check (event_type in ('food_contributed','delivery_completed','event_hosted','event_supported','capacity_supplied','reliability_positive','reliability_context','training_completed','waste_prevented','volunteer_hours','cancellation','correction','appeal_resolution')),
  recognition_points integer not null default 0,
  reliability_delta integer not null default 0,
  evidence_type text not null,
  evidence_id uuid not null,
  context jsonb not null default '{}',
  expires_at timestamptz,
  actor_principal text not null,
  idempotency_key text not null unique,
  check (recognition_points>=0),
  check (reliability_delta between -10 and 10)
);

create table if not exists command.food_venues (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  host_participant_id uuid references command.food_participants(id) on delete restrict,
  location_id uuid not null references command.food_locations(id) on delete restrict,
  name text not null,
  venue_type text not null check (venue_type in ('public','partner','private_home')),
  capacity integer not null check (capacity > 0),
  accessibility_features text[] not null default '{}',
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','expired','suspended')),
  conduct_agreement_version text,
  emergency_contact_configured boolean not null default false,
  created_by uuid not null references command.profiles(id) on delete restrict,
  reviewed_by uuid references command.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_expires_at timestamptz,
  check (venue_type <> 'private_home' or host_participant_id is not null)
);

create table if not exists command.food_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organizer_participant_id uuid not null references command.food_participants(id) on delete restrict,
  venue_id uuid references command.food_venues(id) on delete restrict,
  name text not null,
  purpose text not null,
  service_zone text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  dietary_profile text[] not null default '{}',
  accessibility_needs text[] not null default '{}',
  address_release_at timestamptz,
  status text not null default 'draft' check (status in ('draft','venue_review','planning','inviting','confirmed','in_progress','completed','cancelled','emergency_cancelled','incident_hold')),
  created_by uuid not null references command.profiles(id) on delete restrict,
  check (ends_at > starts_at),
  check (address_release_at is null or address_release_at <= starts_at)
);

create table if not exists command.food_event_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references command.food_events(id) on delete cascade,
  item_name text not null,
  dietary_tags text[] not null default '{}',
  target_quantity numeric not null check (target_quantity > 0),
  committed_quantity numeric not null default 0 check (committed_quantity >= 0),
  unit text not null,
  preparation_burden text not null check (preparation_burden in ('none','low','medium','high')),
  status text not null default 'open' check (status in ('open','filled','cancelled')),
  check (committed_quantity <= target_quantity)
);

create table if not exists command.food_event_invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references command.food_events(id) on delete cascade,
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  proposed_item_id uuid references command.food_event_items(id) on delete set null,
  proposed_quantity numeric check (proposed_quantity is null or proposed_quantity > 0),
  prompt text not null,
  status text not null default 'sent' check (status in ('sent','accepted','declined','substitute_requested','expired','cancelled')),
  expires_at timestamptz not null,
  idempotency_key text not null unique,
  unique (event_id, participant_id)
);

create table if not exists command.food_event_rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_id uuid not null references command.food_events(id) on delete cascade,
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  response text not null check (response in ('yes','no','waitlist','cancelled')),
  guest_count integer not null default 0 check (guest_count between 0 and 10),
  dietary_needs text[] not null default '{}',
  accessibility_needs text[] not null default '{}',
  confirmed_at timestamptz,
  unique (event_id, participant_id)
);

create table if not exists command.food_event_assignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references command.food_events(id) on delete cascade,
  participant_id uuid not null references command.food_participants(id) on delete restrict,
  item_id uuid references command.food_event_items(id) on delete restrict,
  assignment_type text not null check (assignment_type in ('food','setup','cleanup','transport','venue_support')),
  quantity numeric check (quantity is null or quantity > 0),
  unit text,
  status text not null default 'committed' check (status in ('committed','completed','cancelled','failed')),
  note text not null,
  idempotency_key text not null unique,
  check ((assignment_type = 'food' and item_id is not null and quantity is not null and unit is not null) or assignment_type <> 'food')
);

create table if not exists command.food_lane_readiness (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lane text not null check (lane in ('aid','marketplace','potluck')),
  geography text not null default 'Austin, Texas',
  stage text not null check (stage in ('design','shadow','supervised_pilot','live','paused','stopped')),
  decision text not null check (decision in ('pending','go','no_go')),
  volume_ceiling integer not null default 0 check (volume_ceiling >= 0),
  coordinator_id uuid references command.profiles(id) on delete restrict,
  incident_contact text,
  evidence jsonb not null default '{}'::jsonb,
  rollback_trigger text,
  decided_by uuid references command.profiles(id) on delete set null,
  decided_at timestamptz,
  next_review_at timestamptz,
  unique (lane, geography),
  check (decision <> 'go' or (coordinator_id is not null and incident_contact is not null and rollback_trigger is not null and volume_ceiling > 0))
);

create index if not exists food_messages_conversation_idx on command.food_messages(conversation_id, created_at);
create index if not exists food_payment_orders_status_idx on command.food_payment_orders(status, created_at);
create index if not exists food_subsidy_ledger_campaign_idx on command.food_subsidy_ledger(campaign_id, created_at);
create index if not exists food_events_schedule_idx on command.food_events(status, starts_at);
create index if not exists food_reputation_participant_idx on command.food_reputation_ledger(participant_id,created_at);
create index if not exists food_event_invites_participant_idx on command.food_event_invites(participant_id, status);

drop trigger if exists food_conversations_touch_updated_at on command.food_conversations;
create trigger food_conversations_touch_updated_at before update on command.food_conversations for each row execute function command.touch_updated_at();
drop trigger if exists food_payment_orders_touch_updated_at on command.food_payment_orders;
create trigger food_payment_orders_touch_updated_at before update on command.food_payment_orders for each row execute function command.touch_updated_at();
drop trigger if exists food_venues_touch_updated_at on command.food_venues;
create trigger food_venues_touch_updated_at before update on command.food_venues for each row execute function command.touch_updated_at();
drop trigger if exists food_events_touch_updated_at on command.food_events;
create trigger food_events_touch_updated_at before update on command.food_events for each row execute function command.touch_updated_at();
drop trigger if exists food_event_rsvps_touch_updated_at on command.food_event_rsvps;
create trigger food_event_rsvps_touch_updated_at before update on command.food_event_rsvps for each row execute function command.touch_updated_at();
drop trigger if exists food_lane_readiness_touch_updated_at on command.food_lane_readiness;
create trigger food_lane_readiness_touch_updated_at before update on command.food_lane_readiness for each row execute function command.touch_updated_at();

drop trigger if exists food_subsidy_ledger_immutable on command.food_subsidy_ledger;
create trigger food_subsidy_ledger_immutable before update or delete on command.food_subsidy_ledger for each row execute function command.food_guard_immutable();
drop trigger if exists food_reputation_ledger_immutable on command.food_reputation_ledger;
create trigger food_reputation_ledger_immutable before update or delete on command.food_reputation_ledger for each row execute function command.food_guard_immutable();
create or replace function command.food_guard_stripe_event()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Stripe events cannot be deleted'; end if;
  if old.stripe_event_id is distinct from new.stripe_event_id or old.event_type is distinct from new.event_type or old.object_id is distinct from new.object_id or old.payload is distinct from new.payload or old.signature_verified is distinct from new.signature_verified then raise exception 'Signed Stripe event evidence is immutable'; end if;
  return new;
end;
$$;
drop trigger if exists food_stripe_events_immutable on command.food_stripe_events;
create trigger food_stripe_events_immutable before update or delete on command.food_stripe_events for each row execute function command.food_guard_stripe_event();

create or replace function command.ensure_food_participant(p_display_name text)
returns command.food_participants
language plpgsql security definer set search_path = command, public as $$
declare result command.food_participants;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into result from command.food_participants where profile_id = auth.uid();
  if result.id is null then
    insert into command.food_participants(profile_id, display_name, roles, trust_tier)
    values (auth.uid(), btrim(p_display_name), array['reciprocate']::text[], 1)
    returning * into result;
  end if;
  return result;
end;
$$;

create or replace function command.create_food_need(p_input jsonb, p_idempotency_key text)
returns command.food_needs
language plpgsql security definer set search_path = command, public as $$
declare participant command.food_participants; result command.food_needs; receipt command.food_command_receipts; actor text := auth.uid()::text; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(btrim(coalesce(p_idempotency_key,''))) < 8 then raise exception 'Idempotency key must contain at least 8 characters'; end if;
  request_hash := encode(extensions.digest(p_input::text, 'sha256'), 'hex');
  select * into receipt from command.food_command_receipts where actor_principal = actor and command_name = 'create_food_need' and idempotency_key = p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash <> request_hash then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_needs where id = receipt.resource_id;
    return result;
  end if;
  select * into participant from command.food_participants where profile_id = auth.uid() and status = 'active';
  if participant.id is null or participant.trust_tier < 1 then raise exception 'A contact-verified participant is required'; end if;
  if coalesce(p_input->>'fulfillment_method','pickup')<>'pickup' and participant.trust_tier<2 then raise exception 'Private delivery requires community verification'; end if;
  insert into command.food_command_receipts(actor_principal, command_name, idempotency_key, request_hash) values (actor, 'create_food_need', p_idempotency_key, request_hash);
  insert into command.food_needs(participant_id, lane, item_category, item_description, quantity, unit, substitutions, dietary_constraints, allergens, preparation_state, urgency, required_by, window_start, window_end, fulfillment_method, service_zone, recurrence_rule, mobility_constraints, handoff_constraints, subsidy_eligible, status, created_by)
  values (participant.id, p_input->>'lane', btrim(p_input->>'item_category'), btrim(p_input->>'item_description'), (p_input->>'quantity')::numeric, btrim(p_input->>'unit'), coalesce(p_input->'substitutions','[]'::jsonb), coalesce(array(select jsonb_array_elements_text(coalesce(p_input->'dietary_constraints','[]'::jsonb))), '{}'), coalesce(array(select jsonb_array_elements_text(coalesce(p_input->'allergens','[]'::jsonb))), '{}'), btrim(p_input->>'preparation_state'), coalesce((p_input->>'urgency')::smallint,2), (p_input->>'required_by')::timestamptz, (p_input->>'window_start')::timestamptz, (p_input->>'window_end')::timestamptz, p_input->>'fulfillment_method', btrim(p_input->>'service_zone'), nullif(btrim(p_input->>'recurrence_rule'),''), nullif(btrim(p_input->>'mobility_constraints'),''), nullif(btrim(p_input->>'handoff_constraints'),''), coalesce((p_input->>'subsidy_eligible')::boolean,false), 'draft', auth.uid())
  returning * into result;
  insert into command.food_outbox(topic, aggregate_type, aggregate_id, payload, idempotency_key) values ('food.need.created','food_need',result.id,jsonb_build_object('need_id',result.id,'lane',result.lane,'service_zone',result.service_zone),'need-created:' || result.id);
  update command.food_command_receipts set status='completed', resource_type='food_need', resource_id=result.id, response=jsonb_build_object('id',result.id,'status',result.status) where actor_principal=actor and command_name='create_food_need' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.create_food_supply(p_input jsonb, p_idempotency_key text)
returns command.food_supplies
language plpgsql security definer set search_path = command, public as $$
declare participant command.food_participants; result command.food_supplies; receipt command.food_command_receipts; actor text := auth.uid()::text; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(btrim(coalesce(p_idempotency_key,''))) < 8 then raise exception 'Idempotency key must contain at least 8 characters'; end if;
  request_hash := encode(extensions.digest(p_input::text, 'sha256'), 'hex');
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_supply' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash <> request_hash then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_supplies where id=receipt.resource_id;
    return result;
  end if;
  select * into participant from command.food_participants where profile_id=auth.uid() and status='active';
  if participant.id is null then raise exception 'An active participant is required'; end if;
  if p_input->>'lane' = 'marketplace' and (participant.trust_tier < 3 or not ('provider'=any(participant.roles))) then raise exception 'Marketplace supplies require a T3 provider'; end if;
  if p_input->>'lane' = 'aid' and not exists(select 1 from command.food_verifications verification where verification.participant_id=participant.id and verification.verification_type='aid_source_approval' and verification.evidence_status='verified' and (verification.expires_at is null or verification.expires_at>now())) then raise exception 'Aid supplies require current approved-source evidence'; end if;
  if p_input->>'preparation_class' = 'home_prepared' and p_input->>'lane' <> 'potluck' then raise exception 'Home-prepared food is limited to potlucks'; end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_supply',p_idempotency_key,request_hash);
  insert into command.food_supplies(participant_id,lane,item_category,item_description,quantity,unit,origin,preparation_location,lot_code,date_mark,expires_at,preparation_class,allergens,dietary_tags,temperature_class,compliance_evidence,fulfillment_method,service_zone,available_from,available_until,source_approved,provider_eligible,price_cents,tax_treatment,transport_responsibility,maximum_delivery_radius_miles,status,created_by)
  values(participant.id,p_input->>'lane',btrim(p_input->>'item_category'),btrim(p_input->>'item_description'),(p_input->>'quantity')::numeric,btrim(p_input->>'unit'),btrim(p_input->>'origin'),nullif(btrim(p_input->>'preparation_location'),''),nullif(btrim(p_input->>'lot_code'),''),nullif(btrim(p_input->>'date_mark'),''),(p_input->>'expires_at')::timestamptz,p_input->>'preparation_class',coalesce(array(select jsonb_array_elements_text(coalesce(p_input->'allergens','[]'::jsonb))),'{}'),coalesce(array(select jsonb_array_elements_text(coalesce(p_input->'dietary_tags','[]'::jsonb))),'{}'),p_input->>'temperature_class',coalesce(p_input->'compliance_evidence','{}'::jsonb),p_input->>'fulfillment_method',btrim(p_input->>'service_zone'),(p_input->>'available_from')::timestamptz,(p_input->>'available_until')::timestamptz,p_input->>'lane'='aid',p_input->>'lane'='marketplace',nullif(p_input->>'price_cents','')::bigint,nullif(btrim(p_input->>'tax_treatment'),''),btrim(p_input->>'transport_responsibility'),nullif(p_input->>'maximum_delivery_radius_miles','')::numeric,'draft',auth.uid())
  returning * into result;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.supply.created','food_supply',result.id,jsonb_build_object('supply_id',result.id,'lane',result.lane,'service_zone',result.service_zone),'supply-created:' || result.id);
  update command.food_command_receipts set status='completed',resource_type='food_supply',resource_id=result.id,response=jsonb_build_object('id',result.id,'status',result.status) where actor_principal=actor and command_name='create_food_supply' and idempotency_key=p_idempotency_key;
  return result;
end;
$$;

create or replace function command.create_food_payment_order(p_commitment_id uuid,p_mandate_id uuid,p_delivery_cents bigint,p_subsidy_cents bigint,p_tax_cents bigint,p_tip_cents bigint,p_idempotency_key text)
returns command.food_payment_orders
language plpgsql security definer set search_path = command, public as $$
declare commitment command.food_commitments; supply command.food_supplies; need command.food_needs; mandate command.food_agent_mandates; result command.food_payment_orders; fee bigint; subtotal bigint; total bigint; daily_spend bigint; actor text:=auth.uid()::text; receipt command.food_command_receipts; request_hash text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
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

create or replace function command.apply_food_subsidy(p_campaign_id uuid, p_payment_order_id uuid, p_amount_cents bigint, p_idempotency_key text)
returns command.food_subsidy_ledger
language plpgsql security definer set search_path = command, public as $$
declare balance bigint; payment command.food_payment_orders; result command.food_subsidy_ledger;
begin
  if auth.uid() is null or command.current_role() <> 'admin' then raise exception 'Coordinator permission is required'; end if;
  if p_amount_cents <= 0 then raise exception 'Subsidy amount must be positive'; end if;
  perform 1 from command.food_subsidy_campaigns where id=p_campaign_id and status='active' and now() between starts_at and ends_at for update;
  if not found then raise exception 'Subsidy campaign is not active'; end if;
  select coalesce((select balance_after_cents from command.food_subsidy_ledger where campaign_id=p_campaign_id order by created_at desc,id desc limit 1),0) into balance;
  if balance < p_amount_cents then raise exception 'Subsidy campaign balance is insufficient'; end if;
  select * into payment from command.food_payment_orders where id=p_payment_order_id for update;
  if payment.id is null or payment.status <> 'created' or p_amount_cents > payment.hand_fee_cents + payment.delivery_cents then raise exception 'Payment order cannot receive this subsidy'; end if;
  update command.food_payment_orders set subsidy_cents=p_amount_cents,total_cents=food_subtotal_cents+delivery_cents+hand_fee_cents-p_amount_cents+tax_cents+tip_cents,provider_topup_cents=greatest(0::bigint,p_amount_cents-hand_fee_cents) where id=payment.id;
  insert into command.food_subsidy_ledger(campaign_id,payment_order_id,entry_type,amount_cents,balance_after_cents,reason,actor_principal,idempotency_key)
  values(p_campaign_id,payment.id,'subsidy_debit',-p_amount_cents,balance-p_amount_cents,'Approved fee or delivery relief',auth.uid()::text,p_idempotency_key)
  returning * into result;
  return result;
end;
$$;

create or replace function command.create_food_potluck(p_input jsonb, p_idempotency_key text)
returns command.food_events
language plpgsql security definer set search_path = command, public as $$
declare participant command.food_participants; venue command.food_venues; result command.food_events; receipt command.food_command_receipts; actor text:=auth.uid()::text; menu_item jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into receipt from command.food_command_receipts where actor_principal=actor and command_name='create_food_potluck' and idempotency_key=p_idempotency_key;
  if receipt.id is not null then select * into result from command.food_events where id=receipt.resource_id; return result; end if;
  select * into participant from command.food_participants where profile_id=auth.uid() and status='active';
  if participant.id is null then raise exception 'An active participant is required'; end if;
  if nullif(p_input->>'venue_id','') is not null then
    select * into venue from command.food_venues where id=(p_input->>'venue_id')::uuid;
    if venue.verification_status <> 'verified' then raise exception 'A verified venue is required'; end if;
    if venue.venue_type='private_home' and (participant.trust_tier<3 or not venue.emergency_contact_configured or venue.review_expires_at<=now()) then raise exception 'Private-home events require current T3 host and venue evidence'; end if;
  end if;
  insert into command.food_command_receipts(actor_principal,command_name,idempotency_key,request_hash) values(actor,'create_food_potluck',p_idempotency_key,encode(extensions.digest(p_input::text,'sha256'),'hex'));
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

create or replace function command.respond_food_event_invite(p_invite_id uuid, p_response text, p_guest_count integer, p_dietary_needs text[], p_accessibility_needs text[], p_idempotency_key text)
returns command.food_event_rsvps
language plpgsql security definer set search_path = command, public as $$
declare participant command.food_participants; invite command.food_event_invites; event command.food_events; result command.food_event_rsvps; attending integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_response not in ('yes','no','substitute') then raise exception 'Invite response must be yes, no, or substitute'; end if;
  select * into participant from command.food_participants where profile_id=auth.uid();
  select * into invite from command.food_event_invites where id=p_invite_id and participant_id=participant.id for update;
  if invite.id is null or invite.status not in ('sent','substitute_requested') or invite.expires_at<=now() then raise exception 'Invite is unavailable'; end if;
  select * into event from command.food_events where id=invite.event_id for update;
  select coalesce(sum(1+guest_count),0) into attending from command.food_event_rsvps where event_id=event.id and response='yes' and participant_id<>participant.id;
  if p_response='substitute' then update command.food_event_invites set status='substitute_requested' where id=invite.id; return null; end if;
  if p_response='yes' and attending+1+p_guest_count>event.capacity then p_response:='waitlist'; end if;
  insert into command.food_event_rsvps(event_id,participant_id,response,guest_count,dietary_needs,accessibility_needs,confirmed_at)
  values(event.id,participant.id,p_response,p_guest_count,coalesce(p_dietary_needs,'{}'),coalesce(p_accessibility_needs,'{}'),case when p_response='yes' then now() else null end)
  on conflict(event_id,participant_id) do update set response=excluded.response,guest_count=excluded.guest_count,dietary_needs=excluded.dietary_needs,accessibility_needs=excluded.accessibility_needs,confirmed_at=excluded.confirmed_at
  returning * into result;
  update command.food_event_invites set status=case when p_response in ('yes','waitlist') then 'accepted' else 'declined' end where id=invite.id;
  if p_response='yes' and invite.proposed_item_id is not null and invite.proposed_quantity is not null then
    update command.food_event_items set committed_quantity=committed_quantity+invite.proposed_quantity,status=case when committed_quantity+invite.proposed_quantity>=target_quantity then 'filled' else 'open' end where id=invite.proposed_item_id and status='open' and target_quantity-committed_quantity>=invite.proposed_quantity;
    if found then insert into command.food_event_assignments(event_id,participant_id,item_id,assignment_type,quantity,unit,status,note,idempotency_key) select event.id,participant.id,item.id,'food',invite.proposed_quantity,item.unit,'committed','Accepted targeted event contribution',p_idempotency_key from command.food_event_items item where item.id=invite.proposed_item_id; end if;
  end if;
  insert into command.food_outbox(topic,aggregate_type,aggregate_id,payload,idempotency_key) values('food.event.rsvp_changed','food_event',event.id,jsonb_build_object('event_id',event.id,'participant_id',participant.id,'response',p_response),'event-rsvp:' || p_idempotency_key);
  return result;
end;
$$;

create or replace function command.release_food_location(p_location_id uuid, p_commitment_id uuid, p_purpose text, p_precision text, p_policy_decision_id uuid)
returns bytea
language plpgsql security definer set search_path = command, public as $$
declare location command.food_locations; commitment command.food_commitments; decision command.food_policy_decisions; need command.food_needs; supply command.food_supplies; allowed boolean:=false; action_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_precision not in ('service_zone','exact') then raise exception 'Unsupported location precision'; end if;
  select * into location from command.food_locations where id=p_location_id and deleted_at is null;
  select * into commitment from command.food_commitments where id=p_commitment_id;
  select * into need from command.food_needs where id=commitment.need_id;
  select * into supply from command.food_supplies where id=commitment.supply_id;
  if p_policy_decision_id is not null then select * into decision from command.food_policy_decisions where id=p_policy_decision_id and decision='allow'; end if;
  if location.id is null or commitment.id is null or commitment.fulfillment_state not in ('committed','in_fulfillment') then raise exception 'Active commitment is required'; end if;
  if location.participant_id not in (need.participant_id,supply.participant_id) then raise exception 'Location is not part of this commitment'; end if;
  allowed := command.current_role()='admin' or exists(select 1 from command.food_needs where id=commitment.need_id and created_by=auth.uid()) or exists(select 1 from command.food_supplies where id=commitment.supply_id and created_by=auth.uid());
  if not allowed then raise exception 'Location access is not authorized'; end if;
  if p_precision='exact' and location.sharing_policy not in ('after_commitment','active_run') then raise exception 'Location sharing policy blocks exact access'; end if;
  if decision.id is null then
    insert into command.food_agent_actions(agent_principal,participant_id,action_type,resource_type,resource_id,request_payload,status,evidence) values(auth.uid()::text,location.participant_id,'release_commitment_location','food_commitment',commitment.id,jsonb_build_object('purpose',p_purpose,'precision',p_precision),'executed','{}') returning id into action_id;
    insert into command.food_policy_decisions(agent_action_id,actor_principal,policy_version,decision,reason_codes,evaluated_facts) values(action_id,auth.uid()::text,'commitment-location-v1','allow',array['active_commitment','party_authorized','sharing_policy_allows'],jsonb_build_object('commitment_id',commitment.id,'location_id',location.id,'precision',p_precision)) returning * into decision;
  end if;
  insert into command.food_location_access_events(location_id,actor_principal,purpose,precision_released,commitment_id,policy_decision_id) values(location.id,auth.uid()::text,btrim(p_purpose),p_precision,commitment.id,decision.id);
  if p_precision='service_zone' then return convert_to(location.service_zone,'utf8'); end if;
  return location.exact_location_ciphertext;
end;
$$;

create or replace function command.lease_food_outbox(p_worker text, p_topics text[], p_limit integer, p_lease_seconds integer)
returns setof command.food_outbox
language plpgsql security definer set search_path = command, public as $$
begin
  if current_user not in ('postgres','service_role') then raise exception 'Worker permission is required'; end if;
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
  if current_user not in ('postgres','service_role') then raise exception 'Worker permission is required'; end if;
  update command.food_outbox set processed_at=case when p_error is null then now() else processed_at end,last_error=p_error,available_at=case when p_error is null then available_at else now()+least(interval '15 minutes',make_interval(secs=>power(2,least(attempt_count,9))::integer)) end,lease_owner=null,lease_expires_at=null
  where id=p_id and lease_owner=p_worker returning * into result;
  if result.id is null then raise exception 'Outbox lease is not owned by this worker'; end if;
  return result;
end;
$$;

alter table command.food_conversations enable row level security;
alter table command.food_messages enable row level security;
alter table command.food_voice_sessions enable row level security;
alter table command.food_payment_orders enable row level security;
alter table command.food_transfers enable row level security;
alter table command.food_subsidy_campaigns enable row level security;
alter table command.food_donations enable row level security;
alter table command.food_subsidy_ledger enable row level security;
alter table command.food_stripe_events enable row level security;
alter table command.food_reputation_ledger enable row level security;
alter table command.food_venues enable row level security;
alter table command.food_events enable row level security;
alter table command.food_event_items enable row level security;
alter table command.food_event_invites enable row level security;
alter table command.food_event_rsvps enable row level security;
alter table command.food_event_assignments enable row level security;
alter table command.food_lane_readiness enable row level security;

drop policy if exists food_conversations_party_read on command.food_conversations;
create policy food_conversations_party_read on command.food_conversations for select using(command.current_role()='admin' or created_by_principal=auth.uid()::text or assigned_coordinator=auth.uid() or exists(select 1 from command.food_participants p where p.id=participant_id and p.profile_id=auth.uid()));
drop policy if exists food_messages_party_read on command.food_messages;
create policy food_messages_party_read on command.food_messages for select using(exists(select 1 from command.food_conversations c where c.id=conversation_id and (c.created_by_principal=auth.uid()::text or c.assigned_coordinator=auth.uid() or command.current_role()='admin' or exists(select 1 from command.food_participants p where p.id=c.participant_id and p.profile_id=auth.uid()))));
drop policy if exists food_payments_party_read on command.food_payment_orders;
create policy food_payments_party_read on command.food_payment_orders for select using(command.current_role()='admin' or exists(select 1 from command.food_participants p where p.id in (provider_participant_id,purchaser_participant_id) and p.profile_id=auth.uid()));
drop policy if exists food_events_public_read on command.food_events;
create policy food_events_public_read on command.food_events for select using(status in ('inviting','confirmed','in_progress','completed') or created_by=auth.uid() or command.current_role()='admin');
drop policy if exists food_venues_owner_read on command.food_venues;
create policy food_venues_owner_read on command.food_venues for select using(created_by=auth.uid() or command.current_role()='admin');
drop policy if exists food_event_invites_self_read on command.food_event_invites;
create policy food_event_invites_self_read on command.food_event_invites for select using(command.current_role()='admin' or exists(select 1 from command.food_participants p where p.id=participant_id and p.profile_id=auth.uid()));
drop policy if exists food_event_rsvps_self_read on command.food_event_rsvps;
create policy food_event_rsvps_self_read on command.food_event_rsvps for select using(command.current_role()='admin' or exists(select 1 from command.food_participants p where p.id=participant_id and p.profile_id=auth.uid()));
drop policy if exists food_reputation_self_read on command.food_reputation_ledger;
create policy food_reputation_self_read on command.food_reputation_ledger for select using(command.current_role()='admin' or exists(select 1 from command.food_participants p where p.id=participant_id and p.profile_id=auth.uid()));

grant select on command.food_conversations,command.food_messages,command.food_payment_orders,command.food_venues,command.food_events,command.food_event_invites,command.food_event_rsvps,command.food_reputation_ledger to authenticated;
grant select on command.food_events to anon;
revoke insert,update,delete on command.food_conversations,command.food_messages,command.food_voice_sessions,command.food_payment_orders,command.food_transfers,command.food_subsidy_campaigns,command.food_donations,command.food_subsidy_ledger,command.food_stripe_events,command.food_reputation_ledger,command.food_venues,command.food_events,command.food_event_items,command.food_event_invites,command.food_event_rsvps,command.food_event_assignments,command.food_lane_readiness from anon,authenticated;

revoke execute on function command.ensure_food_participant(text) from public;
revoke execute on function command.create_food_need(jsonb,text) from public;
revoke execute on function command.create_food_supply(jsonb,text) from public;
revoke execute on function command.create_food_payment_order(uuid,uuid,bigint,bigint,bigint,bigint,text) from public;
revoke execute on function command.apply_food_subsidy(uuid,uuid,bigint,text) from public;
revoke execute on function command.create_food_potluck(jsonb,text) from public;
revoke execute on function command.respond_food_event_invite(uuid,text,integer,text[],text[],text) from public;
revoke execute on function command.release_food_location(uuid,uuid,text,text,uuid) from public;
revoke execute on function command.lease_food_outbox(text,text[],integer,integer) from public,anon,authenticated;
revoke execute on function command.complete_food_outbox(bigint,text,text) from public,anon,authenticated;
grant execute on function command.ensure_food_participant(text),command.create_food_need(jsonb,text),command.create_food_supply(jsonb,text),command.create_food_payment_order(uuid,uuid,bigint,bigint,bigint,bigint,text),command.create_food_potluck(jsonb,text),command.respond_food_event_invite(uuid,text,integer,text[],text[],text),command.release_food_location(uuid,uuid,text,text,uuid) to authenticated;
grant execute on function command.apply_food_subsidy(uuid,uuid,bigint,text) to authenticated;
grant execute on function command.lease_food_outbox(text,text[],integer,integer),command.complete_food_outbox(bigint,text,text) to service_role;

comment on table command.food_payment_orders is 'Commercial orders with HAND fee separated from tax, tip, donation, and aid.';
comment on table command.food_subsidy_ledger is 'Append-only restricted subsidy accounting, separate from commercial orders.';
comment on table command.food_events is 'Noncommercial potlucks isolated from charitable inventory and paid marketplace orders.';
comment on table command.food_lane_readiness is 'Independent go or no-go evidence for each Austin pilot lane.';
