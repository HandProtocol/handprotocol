/*
  032_wxl_coordination_core.sql
  Canonical WXL:FOOD coordination records and deterministic command boundary.
  Operational records are changed only through security-definer commands or a
  trusted backend. Exact locations are opaque ciphertext at rest.
*/

create table if not exists command.food_participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  profile_id uuid unique references command.profiles(id) on delete set null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 160),
  roles text[] not null default '{}' check (roles <@ array['reciprocate','contributor','provider','host','coordinator','organization']::text[]),
  trust_tier smallint not null default 0 check (trust_tier between 0 and 4),
  status text not null default 'active' check (status in ('active','review','restricted','suspended','closed')),
  restriction_reason text,
  restriction_expires_at timestamptz,
  appeal_status text check (appeal_status is null or appeal_status in ('requested','reviewing','upheld','removed')),
  check (status <> 'restricted' or restriction_reason is not null)
);

create table if not exists command.food_verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  verification_type text not null,
  issuer text not null,
  evidence_status text not null check (evidence_status in ('pending','verified','rejected','expired','revoked')),
  evidence_reference text,
  expires_at timestamptz,
  reviewed_by uuid references command.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text
);

create table if not exists command.food_contact_channels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  channel_type text not null check (channel_type in ('sms','voice','email','web')),
  address_ciphertext bytea,
  address_fingerprint text,
  verified_at timestamptz,
  consent_status text not null default 'unknown' check (consent_status in ('unknown','opted_in','opted_out')),
  consent_source text,
  consent_recorded_at timestamptz,
  language text not null default 'en',
  accessibility_preferences jsonb not null default '{}'::jsonb,
  quiet_hours_start time,
  quiet_hours_end time,
  unique nulls not distinct (participant_id, channel_type, address_fingerprint),
  check (consent_status = 'unknown' or consent_recorded_at is not null)
);

create table if not exists command.food_agent_mandates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  agent_principal text not null,
  permitted_actions text[] not null,
  lanes text[] not null check (lanes <@ array['aid','marketplace','potluck']::text[]),
  service_zones text[] not null default '{}',
  per_transaction_limit_cents bigint not null default 0 check (per_transaction_limit_cents >= 0),
  daily_limit_cents bigint not null default 0 check (daily_limit_cents >= 0),
  total_limit_cents bigint not null default 0 check (total_limit_cents >= 0),
  spent_cents bigint not null default 0 check (spent_cents >= 0),
  valid_from timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references command.profiles(id) on delete set null,
  revocation_reason text,
  check (expires_at > valid_from),
  check (spent_cents <= total_limit_cents or total_limit_cents = 0)
);

create table if not exists command.food_locations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  label text not null,
  service_zone text not null,
  location_type text not null check (location_type in ('public_handoff','partner','shelter','library','service_anchor','private_home','venue','mobile')),
  exact_location_ciphertext bytea,
  verification_method text,
  verified_at timestamptz,
  retention_deadline timestamptz,
  saved_for_reuse boolean not null default false,
  sharing_policy text not null default 'after_commitment' check (sharing_policy in ('never','coarse_only','after_commitment','active_run')),
  deleted_at timestamptz,
  check (location_type <> 'private_home' or sharing_policy <> 'coarse_only')
);

create table if not exists command.food_location_access_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  location_id uuid not null references command.food_locations(id) on delete restrict,
  actor_principal text not null,
  purpose text not null,
  precision_released text not null check (precision_released in ('service_zone','exact','live')),
  commitment_id uuid,
  run_id uuid references command.food_harvest_runs(id) on delete set null,
  policy_decision_id uuid
);

create table if not exists command.food_needs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  participant_id uuid not null references command.food_participants(id) on delete restrict,
  lane text not null check (lane in ('aid','marketplace','potluck')),
  item_category text not null,
  item_description text not null,
  quantity numeric not null check (quantity > 0),
  held_quantity numeric not null default 0 check (held_quantity >= 0),
  committed_quantity numeric not null default 0 check (committed_quantity >= 0),
  fulfilled_quantity numeric not null default 0 check (fulfilled_quantity >= 0),
  unit text not null,
  substitutions jsonb not null default '[]'::jsonb,
  dietary_constraints text[] not null default '{}',
  allergens text[] not null default '{}',
  preparation_state text not null,
  urgency smallint not null default 2 check (urgency between 1 and 4),
  required_by timestamptz not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  fulfillment_method text not null check (fulfillment_method in ('pickup','delivery','either')),
  service_zone text not null,
  recurrence_rule text,
  mobility_constraints text,
  handoff_constraints text,
  subsidy_eligible boolean not null default false,
  status text not null default 'draft' check (status in ('draft','verified','open','held','matched','committed','in_fulfillment','fulfilled','expired','cancelled','failed','disputed','incident_hold')),
  source_request_id uuid unique references command.food_requests(id) on delete set null,
  created_by uuid not null references command.profiles(id) on delete restrict,
  check (window_end > window_start),
  check (required_by >= window_start),
  check (held_quantity+committed_quantity+fulfilled_quantity<=quantity)
);

create table if not exists command.food_supplies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  participant_id uuid not null references command.food_participants(id) on delete restrict,
  lane text not null check (lane in ('aid','marketplace','potluck')),
  item_category text not null,
  item_description text not null,
  quantity numeric not null check (quantity > 0),
  held_quantity numeric not null default 0 check (held_quantity >= 0),
  committed_quantity numeric not null default 0 check (committed_quantity >= 0),
  fulfilled_quantity numeric not null default 0 check (fulfilled_quantity >= 0),
  unit text not null,
  origin text not null,
  preparation_location text,
  lot_code text,
  date_mark text,
  expires_at timestamptz not null,
  preparation_class text not null,
  allergens text[] not null default '{}',
  dietary_tags text[] not null default '{}',
  temperature_class text not null check (temperature_class in ('not_controlled','chilled','frozen','hot')),
  compliance_evidence jsonb not null default '{}'::jsonb,
  fulfillment_method text not null check (fulfillment_method in ('pickup','delivery','either')),
  service_zone text not null,
  available_from timestamptz not null,
  available_until timestamptz not null,
  source_approved boolean not null default false,
  provider_eligible boolean not null default false,
  price_cents bigint check (price_cents is null or price_cents >= 0),
  tax_treatment text,
  transport_responsibility text not null,
  maximum_delivery_radius_miles numeric check (maximum_delivery_radius_miles is null or maximum_delivery_radius_miles >= 0),
  source_rescue_id uuid unique references command.food_rescues(id) on delete set null,
  source_inventory_lot_id uuid unique references command.food_inventory_lots(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','verified','open','held','matched','committed','in_fulfillment','fulfilled','expired','cancelled','failed','disputed','incident_hold')),
  created_by uuid not null references command.profiles(id) on delete restrict,
  check (held_quantity + committed_quantity + fulfilled_quantity <= quantity),
  check (available_until > available_from),
  check (expires_at >= available_from),
  check (lane <> 'aid' or source_approved),
  check (lane = 'potluck' or preparation_class <> 'home_prepared'),
  check ((lane = 'marketplace' and price_cents is not null and provider_eligible) or (lane <> 'marketplace' and price_cents is null))
);

create table if not exists command.food_match_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  algorithm_version text not null,
  input_snapshot jsonb not null,
  input_snapshot_hash text not null,
  objective_settings jsonb not null,
  trigger_reason text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  lease_owner text,
  lease_expires_at timestamptz,
  failure_code text
);

create table if not exists command.food_match_candidates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  match_run_id uuid not null references command.food_match_runs(id) on delete cascade,
  need_id uuid not null references command.food_needs(id) on delete cascade,
  supply_id uuid not null references command.food_supplies(id) on delete cascade,
  eligible boolean not null,
  hard_rule_results jsonb not null,
  score_components jsonb not null default '{}'::jsonb,
  explanation_codes text[] not null,
  rejection_reasons text[] not null default '{}',
  proposed_quantity numeric check (proposed_quantity is null or proposed_quantity > 0),
  rank integer check (rank is null or rank > 0),
  unique (match_run_id, need_id, supply_id),
  check (
    (eligible and cardinality(rejection_reasons) = 0 and proposed_quantity is not null and hard_rule_results @> '{"all_passed": true}'::jsonb)
    or (not eligible and cardinality(rejection_reasons) > 0)
  )
);

create table if not exists command.food_match_holds (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  candidate_id uuid not null unique references command.food_match_candidates(id) on delete cascade,
  need_id uuid not null references command.food_needs(id) on delete restrict,
  supply_id uuid not null references command.food_supplies(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  status text not null default 'active' check (status in ('active','committed','released','expired')),
  released_at timestamptz,
  check (expires_at > created_at)
);

create table if not exists command.food_commitments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  candidate_id uuid not null references command.food_match_candidates(id) on delete restrict,
  need_id uuid not null references command.food_needs(id) on delete restrict,
  supply_id uuid not null references command.food_supplies(id) on delete restrict,
  lane text not null check (lane in ('aid','marketplace','potluck')),
  quantity numeric not null check (quantity > 0),
  unit text not null,
  hold_expires_at timestamptz,
  committed_at timestamptz,
  fulfillment_deadline timestamptz not null,
  payment_state text not null default 'not_required' check (payment_state in ('not_required','pending','authorized','captured','refunded','failed','disputed')),
  fulfillment_state text not null default 'held' check (fulfillment_state in ('held','committed','in_fulfillment','fulfilled','cancelled','failed','disputed','incident_hold')),
  mandate_id uuid references command.food_agent_mandates(id) on delete restrict,
  created_by_principal text not null,
  cancellation_reason text
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'food_location_access_commitment_fk' and conrelid = 'command.food_location_access_events'::regclass) then
    alter table command.food_location_access_events add constraint food_location_access_commitment_fk foreign key (commitment_id) references command.food_commitments(id) on delete set null;
  end if;
end;
$$;

create table if not exists command.food_agent_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agent_principal text not null,
  participant_id uuid references command.food_participants(id) on delete set null,
  mandate_id uuid references command.food_agent_mandates(id) on delete set null,
  action_type text not null,
  resource_type text not null,
  resource_id uuid,
  request_payload jsonb not null,
  status text not null check (status in ('requested','blocked','approved','executed','failed','rolled_back')),
  evidence jsonb not null default '{}'::jsonb,
  rollback_reference text
);

create table if not exists command.food_policy_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agent_action_id uuid references command.food_agent_actions(id) on delete set null,
  actor_principal text not null,
  policy_version text not null,
  decision text not null check (decision in ('allow','deny','review')),
  reason_codes text[] not null,
  evaluated_facts jsonb not null,
  override_by uuid references command.profiles(id) on delete set null,
  override_reason text,
  check ((override_by is null and override_reason is null) or (override_by is not null and override_reason is not null))
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'food_location_access_policy_fk' and conrelid = 'command.food_location_access_events'::regclass) then
    alter table command.food_location_access_events add constraint food_location_access_policy_fk foreign key (policy_decision_id) references command.food_policy_decisions(id) on delete restrict;
  end if;
end;
$$;

create table if not exists command.food_command_receipts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_principal text not null,
  command_name text not null,
  idempotency_key text not null,
  request_hash text not null,
  resource_type text,
  resource_id uuid,
  response jsonb,
  status text not null default 'started' check (status in ('started','completed','failed')),
  unique (actor_principal, command_name, idempotency_key)
);

create table if not exists command.food_outbox (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  topic text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  lease_owner text,
  lease_expires_at timestamptz,
  processed_at timestamptz,
  last_error text
);

create index if not exists food_needs_matching_idx on command.food_needs(status, lane, service_zone, required_by);
create index if not exists food_supplies_matching_idx on command.food_supplies(status, lane, service_zone, expires_at);
create index if not exists food_commitments_state_idx on command.food_commitments(fulfillment_state, fulfillment_deadline);
create index if not exists food_match_holds_expiry_idx on command.food_match_holds(status,expires_at) where status='active';
create index if not exists food_outbox_ready_idx on command.food_outbox(processed_at, available_at) where processed_at is null;
create index if not exists food_location_retention_idx on command.food_locations(retention_deadline) where deleted_at is null;
create index if not exists food_mandates_active_idx on command.food_agent_mandates(agent_principal, expires_at) where revoked_at is null;

drop trigger if exists food_participants_touch_updated_at on command.food_participants;
create trigger food_participants_touch_updated_at before update on command.food_participants for each row execute function command.touch_updated_at();
drop trigger if exists food_contacts_touch_updated_at on command.food_contact_channels;
create trigger food_contacts_touch_updated_at before update on command.food_contact_channels for each row execute function command.touch_updated_at();
drop trigger if exists food_locations_touch_updated_at on command.food_locations;
create trigger food_locations_touch_updated_at before update on command.food_locations for each row execute function command.touch_updated_at();
drop trigger if exists food_needs_touch_updated_at on command.food_needs;
create trigger food_needs_touch_updated_at before update on command.food_needs for each row execute function command.touch_updated_at();
drop trigger if exists food_supplies_touch_updated_at on command.food_supplies;
create trigger food_supplies_touch_updated_at before update on command.food_supplies for each row execute function command.touch_updated_at();
drop trigger if exists food_commitments_touch_updated_at on command.food_commitments;
create trigger food_commitments_touch_updated_at before update on command.food_commitments for each row execute function command.touch_updated_at();

create or replace function command.food_guard_immutable()
returns trigger language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists food_location_access_immutable on command.food_location_access_events;
create trigger food_location_access_immutable before update or delete on command.food_location_access_events for each row execute function command.food_guard_immutable();
drop trigger if exists food_agent_actions_immutable on command.food_agent_actions;
create trigger food_agent_actions_immutable before update or delete on command.food_agent_actions for each row execute function command.food_guard_immutable();
drop trigger if exists food_policy_decisions_immutable on command.food_policy_decisions;
create trigger food_policy_decisions_immutable before update or delete on command.food_policy_decisions for each row execute function command.food_guard_immutable();

create or replace function command.food_lifecycle_transition_allowed(p_from text, p_to text)
returns boolean language sql immutable as $$
  select case
    when p_to in ('expired','cancelled','failed','disputed','incident_hold') then p_from not in ('fulfilled','expired','cancelled','failed')
    when p_from = 'draft' then p_to = 'verified'
    when p_from = 'verified' then p_to = 'open'
    when p_from = 'open' then p_to in ('held','matched')
    when p_from = 'held' then p_to in ('open','matched')
    when p_from = 'matched' then p_to in ('open','committed')
    when p_from = 'committed' then p_to = 'in_fulfillment'
    when p_from = 'in_fulfillment' then p_to = 'fulfilled'
    when p_from = 'incident_hold' then p_to in ('cancelled','failed')
    else false
  end;
$$;

create or replace function command.transition_food_need(
  p_need_id uuid, p_to_status text, p_idempotency_key text, p_reason text
)
returns command.food_needs
language plpgsql security definer set search_path = command, public as $$
declare result command.food_needs; actor text := auth.uid()::text; receipt command.food_command_receipts;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(btrim(coalesce(p_idempotency_key, ''))) < 8 then raise exception 'Idempotency key must contain at least 8 characters'; end if;
  select * into receipt from command.food_command_receipts where actor_principal = actor and command_name = 'transition_food_need' and idempotency_key = p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash <> encode(extensions.digest(p_need_id::text || ':' || p_to_status || ':' || coalesce(p_reason,''), 'sha256'), 'hex') then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_needs where id = receipt.resource_id;
    return result;
  end if;
  insert into command.food_command_receipts(actor_principal, command_name, idempotency_key, request_hash)
  values (actor, 'transition_food_need', p_idempotency_key, encode(extensions.digest(p_need_id::text || ':' || p_to_status || ':' || coalesce(p_reason,''), 'sha256'), 'hex'));
  select * into result from command.food_needs where id = p_need_id for update;
  if result.id is null or (result.created_by <> auth.uid() and command.current_role() <> 'admin') then raise exception 'Need not found or access denied'; end if;
  if result.status = 'incident_hold' and command.current_role() <> 'admin' then raise exception 'Only a coordinator can disposition an incident hold'; end if;
  if not command.food_lifecycle_transition_allowed(result.status, p_to_status) then raise exception 'Lifecycle transition from % to % is not allowed', result.status, p_to_status; end if;
  if p_to_status in ('cancelled','failed','disputed','incident_hold') and char_length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'An exceptional transition requires a reason'; end if;
  update command.food_needs set status = p_to_status where id = p_need_id returning * into result;
  insert into command.food_outbox(topic, aggregate_type, aggregate_id, payload, idempotency_key)
  values ('food.need.changed', 'food_need', result.id, jsonb_build_object('need_id', result.id, 'status', result.status, 'reason', p_reason), 'need:' || result.id || ':' || p_idempotency_key);
  update command.food_command_receipts set status = 'completed', resource_type = 'food_need', resource_id = result.id, response = jsonb_build_object('id', result.id, 'status', result.status)
  where actor_principal = actor and command_name = 'transition_food_need' and idempotency_key = p_idempotency_key;
  return result;
end;
$$;

create or replace function command.commit_food_match(
  p_candidate_id uuid, p_quantity numeric, p_mandate_id uuid, p_actor_principal text,
  p_idempotency_key text
)
returns command.food_commitments
language plpgsql security definer set search_path = command, public as $$
declare candidate command.food_match_candidates; hold command.food_match_holds; need command.food_needs; supply command.food_supplies; mandate command.food_agent_mandates; result command.food_commitments; actor text := auth.uid()::text; receipt command.food_command_receipts;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(p_actor_principal,'') is not null and p_actor_principal<>actor then raise exception 'Actor principal must match the authenticated subject'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Commitment quantity must be positive'; end if;
  if char_length(btrim(coalesce(p_idempotency_key,''))) < 8 then raise exception 'Idempotency key must contain at least 8 characters'; end if;
  select * into receipt from command.food_command_receipts where actor_principal = actor and command_name = 'commit_food_match' and idempotency_key = p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash <> encode(extensions.digest(p_candidate_id::text || ':' || p_quantity::text || ':' || coalesce(p_mandate_id::text,''), 'sha256'), 'hex') then raise exception 'Idempotency key was reused with different input'; end if;
    select * into result from command.food_commitments where id = receipt.resource_id;
    return result;
  end if;
  insert into command.food_command_receipts(actor_principal, command_name, idempotency_key, request_hash)
  values (actor, 'commit_food_match', p_idempotency_key, encode(extensions.digest(p_candidate_id::text || ':' || p_quantity::text || ':' || coalesce(p_mandate_id::text,''), 'sha256'), 'hex'));
  select * into candidate from command.food_match_candidates where id = p_candidate_id;
  if candidate.id is null or not candidate.eligible then raise exception 'Only an eligible candidate can be committed'; end if;
  select * into hold from command.food_match_holds where candidate_id=candidate.id for update;
  if hold.id is null or hold.status<>'active' or hold.expires_at<=now() then raise exception 'Candidate hold is unavailable or expired'; end if;
  select * into need from command.food_needs where id = candidate.need_id for update;
  select * into supply from command.food_supplies where id = candidate.supply_id for update;
  if need.status <> 'matched' or supply.status <> 'matched' then raise exception 'Need and supply must be in matched state'; end if;
  if need.lane <> supply.lane or p_quantity > need.quantity or p_quantity > hold.quantity or p_quantity > candidate.proposed_quantity then raise exception 'Commitment violates lane or held quantity constraints'; end if;
  if p_mandate_id is not null then
    select * into mandate from command.food_agent_mandates where id = p_mandate_id for update;
    if mandate.id is null or mandate.agent_principal <> actor or mandate.revoked_at is not null or now() not between mandate.valid_from and mandate.expires_at or not ('commit_match' = any(mandate.permitted_actions)) or not (need.lane = any(mandate.lanes)) or not (need.service_zone = any(mandate.service_zones)) or mandate.participant_id<>need.participant_id then raise exception 'Active mandate does not authorize this commitment'; end if;
  elsif actor <> auth.uid()::text then
    raise exception 'Agent commitments require a mandate';
  elsif need.created_by <> auth.uid() and supply.created_by <> auth.uid() and command.current_role() <> 'admin' then
    raise exception 'Only a party to the match or a coordinator can commit it';
  end if;
  insert into command.food_commitments(candidate_id, need_id, supply_id, lane, quantity, unit, committed_at, fulfillment_deadline, payment_state, fulfillment_state, mandate_id, created_by_principal)
  values (candidate.id, need.id, supply.id, need.lane, p_quantity, need.unit, now(), least(need.required_by, supply.expires_at), case when need.lane = 'marketplace' then 'pending' else 'not_required' end, 'committed', p_mandate_id, actor)
  returning * into result;
  update command.food_match_holds set status='committed',released_at=now() where id=hold.id;
  update command.food_supplies set held_quantity=held_quantity-hold.quantity,committed_quantity=committed_quantity+p_quantity,status='committed' where id=supply.id;
  update command.food_needs set held_quantity=held_quantity-hold.quantity,committed_quantity=committed_quantity+p_quantity,status='committed' where id=need.id;
  insert into command.food_policy_decisions(actor_principal, policy_version, decision, reason_codes, evaluated_facts)
  values (actor, 'coordination-core-v1', 'allow', array['eligible_candidate','lane_match','quantity_available','actor_authorized'], jsonb_build_object('candidate_id', candidate.id, 'need_id', need.id, 'supply_id', supply.id, 'quantity', p_quantity, 'mandate_id', p_mandate_id));
  insert into command.food_outbox(topic, aggregate_type, aggregate_id, payload, idempotency_key)
  values ('food.commitment.created', 'food_commitment', result.id, jsonb_build_object('commitment_id', result.id, 'lane', result.lane), 'commitment:' || result.id);
  update command.food_command_receipts set status = 'completed', resource_type = 'food_commitment', resource_id = result.id, response = jsonb_build_object('id', result.id, 'state', result.fulfillment_state)
  where actor_principal = actor and command_name = 'commit_food_match' and idempotency_key = p_idempotency_key;
  return result;
end;
$$;

alter table command.food_participants enable row level security;
alter table command.food_verifications enable row level security;
alter table command.food_contact_channels enable row level security;
alter table command.food_agent_mandates enable row level security;
alter table command.food_locations enable row level security;
alter table command.food_location_access_events enable row level security;
alter table command.food_needs enable row level security;
alter table command.food_supplies enable row level security;
alter table command.food_match_runs enable row level security;
alter table command.food_match_candidates enable row level security;
alter table command.food_match_holds enable row level security;
alter table command.food_commitments enable row level security;
alter table command.food_agent_actions enable row level security;
alter table command.food_policy_decisions enable row level security;
alter table command.food_command_receipts enable row level security;
alter table command.food_outbox enable row level security;

drop policy if exists food_participants_self_read on command.food_participants;
create policy food_participants_self_read on command.food_participants for select using (profile_id = auth.uid() or command.current_role() = 'admin');
drop policy if exists food_needs_owner_read on command.food_needs;
create policy food_needs_owner_read on command.food_needs for select using (created_by = auth.uid() or command.current_role() = 'admin');
drop policy if exists food_supplies_owner_read on command.food_supplies;
create policy food_supplies_owner_read on command.food_supplies for select using (created_by = auth.uid() or command.current_role() = 'admin');
drop policy if exists food_commitments_party_read on command.food_commitments;
create policy food_commitments_party_read on command.food_commitments for select using (command.current_role() = 'admin' or exists (select 1 from command.food_needs n where n.id = food_commitments.need_id and n.created_by = auth.uid()) or exists (select 1 from command.food_supplies s where s.id = food_commitments.supply_id and s.created_by = auth.uid()));

grant select on command.food_participants, command.food_needs, command.food_supplies, command.food_commitments to authenticated;
revoke insert, update, delete on command.food_participants, command.food_verifications, command.food_contact_channels, command.food_agent_mandates, command.food_locations, command.food_location_access_events, command.food_needs, command.food_supplies, command.food_match_runs, command.food_match_candidates, command.food_match_holds, command.food_commitments, command.food_agent_actions, command.food_policy_decisions, command.food_command_receipts, command.food_outbox from anon, authenticated;
revoke execute on function command.transition_food_need(uuid, text, text, text) from public;
revoke execute on function command.commit_food_match(uuid, numeric, uuid, text, text) from public;
grant execute on function command.transition_food_need(uuid, text, text, text) to authenticated;
grant execute on function command.commit_food_match(uuid, numeric, uuid, text, text) to authenticated;

comment on table command.food_needs is 'Canonical channel-independent food needs. Mutations use server-side commands.';
comment on table command.food_supplies is 'Canonical channel-independent food supplies and reservable quantities.';
comment on table command.food_commitments is 'Atomic allocations joining eligible needs and supplies.';
comment on table command.food_outbox is 'Transactional jobs for replaceable channel, matching, and routing workers.';
comment on column command.food_locations.exact_location_ciphertext is 'Opaque exact-location ciphertext. Never return through public or matching APIs.';
