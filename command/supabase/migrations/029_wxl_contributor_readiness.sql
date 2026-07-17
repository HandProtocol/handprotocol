/*
  029_wxl_contributor_readiness.sql
  Private Contributor readiness profiles and server-enforced rescue eligibility.
  Operational approval is separate from Command Center account roles.
*/

create table if not exists command.food_contributors (
  profile_id uuid primary key references command.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  phone text not null check (char_length(btrim(phone)) between 7 and 40),
  emergency_contact_name text not null check (char_length(btrim(emergency_contact_name)) between 2 and 120),
  emergency_contact_phone text not null check (char_length(btrim(emergency_contact_phone)) between 7 and 40),
  availability text not null check (char_length(btrim(availability)) between 3 and 1000),
  service_area text not null check (char_length(btrim(service_area)) between 2 and 300),
  vehicle_type text not null check (vehicle_type in ('none', 'bicycle', 'car', 'suv', 'van', 'truck')),
  capacity_value numeric check (capacity_value is null or capacity_value > 0),
  capacity_unit text check (capacity_unit is null or char_length(btrim(capacity_unit)) between 1 and 40),
  has_insulated_coolers boolean not null default false,
  has_refrigeration boolean not null default false,
  has_frozen_storage boolean not null default false,
  has_hot_holding boolean not null default false,
  lifting_limit_lb numeric not null check (lifting_limit_lb >= 0 and lifting_limit_lb <= 1000),
  accessibility_needs text not null check (char_length(btrim(accessibility_needs)) between 2 and 1000),
  agreement_version text not null,
  agreement_accepted_at timestamptz not null,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'declined', 'suspended')),
  approved_run_classes text[] not null default '{}',
  training_completed_at timestamptz,
  training_expires_at timestamptz,
  credential_type text,
  credential_expires_at date,
  review_note text,
  reviewed_by uuid references command.profiles(id) on delete set null,
  reviewed_at timestamptz,
  check ((capacity_value is null) = (capacity_unit is null)),
  check (approved_run_classes <@ array['not_controlled', 'chilled', 'frozen', 'hot']::text[]),
  check (training_expires_at is null or training_completed_at is not null),
  check (training_expires_at is null or training_expires_at > training_completed_at)
);

create table if not exists command.food_contributor_review_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contributor_id uuid not null references command.food_contributors(profile_id) on delete cascade,
  from_status text,
  to_status text not null,
  note text not null,
  actor_id uuid references command.profiles(id) on delete set null
);

create index if not exists food_contributors_status_idx
  on command.food_contributors(status, updated_at desc);
create index if not exists food_contributor_review_events_profile_idx
  on command.food_contributor_review_events(contributor_id, created_at desc);

drop trigger if exists food_contributors_touch_updated_at on command.food_contributors;
create trigger food_contributors_touch_updated_at
  before update on command.food_contributors
  for each row execute function command.touch_updated_at();

create or replace function command.get_food_contributor_profile()
returns table (
  profile_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  display_name text,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  availability text,
  service_area text,
  vehicle_type text,
  capacity_value numeric,
  capacity_unit text,
  has_insulated_coolers boolean,
  has_refrigeration boolean,
  has_frozen_storage boolean,
  has_hot_holding boolean,
  lifting_limit_lb numeric,
  accessibility_needs text,
  agreement_version text,
  agreement_accepted_at timestamptz,
  status text,
  approved_run_classes text[],
  training_completed_at timestamptz,
  training_expires_at timestamptz,
  credential_type text,
  credential_expires_at date,
  review_note text,
  reviewed_at timestamptz,
  can_review boolean
)
language sql
stable
security definer
set search_path = command, public
as $$
  select
    contributor.profile_id, contributor.created_at, contributor.updated_at,
    contributor.display_name, contributor.phone, contributor.emergency_contact_name,
    contributor.emergency_contact_phone, contributor.availability, contributor.service_area,
    contributor.vehicle_type, contributor.capacity_value, contributor.capacity_unit,
    contributor.has_insulated_coolers, contributor.has_refrigeration,
    contributor.has_frozen_storage, contributor.has_hot_holding,
    contributor.lifting_limit_lb, contributor.accessibility_needs,
    contributor.agreement_version, contributor.agreement_accepted_at,
    contributor.status, contributor.approved_run_classes,
    contributor.training_completed_at, contributor.training_expires_at,
    contributor.credential_type, contributor.credential_expires_at,
    contributor.review_note, contributor.reviewed_at,
    coalesce(command.current_role() = 'admin', false)
  from command.food_contributors as contributor
  where contributor.profile_id = auth.uid();
$$;

create or replace function command.list_food_contributors_for_review()
returns setof command.food_contributors
language sql
stable
security definer
set search_path = command, public
as $$
  select contributor.*
  from command.food_contributors as contributor
  where command.current_role() = 'admin'
  order by
    case contributor.status when 'submitted' then 0 when 'suspended' then 1 else 2 end,
    contributor.updated_at asc;
$$;

create or replace function command.submit_food_contributor_profile(
  p_display_name text,
  p_phone text,
  p_emergency_contact_name text,
  p_emergency_contact_phone text,
  p_availability text,
  p_service_area text,
  p_vehicle_type text,
  p_capacity_value numeric,
  p_capacity_unit text,
  p_has_insulated_coolers boolean,
  p_has_refrigeration boolean,
  p_has_frozen_storage boolean,
  p_has_hot_holding boolean,
  p_lifting_limit_lb numeric,
  p_accessibility_needs text,
  p_agreement_accepted boolean
)
returns command.food_contributors
language plpgsql
security definer
set search_path = command, public
as $$
declare
  previous_status text;
  result command.food_contributors;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not coalesce(p_agreement_accepted, false) then raise exception 'The Contributor agreement must be accepted'; end if;
  if p_vehicle_type not in ('none', 'bicycle', 'car', 'suv', 'van', 'truck') then raise exception 'Select a valid vehicle type'; end if;
  if p_capacity_value is not null and char_length(btrim(coalesce(p_capacity_unit, ''))) < 1 then raise exception 'Capacity needs a unit'; end if;
  if p_capacity_value is null and nullif(btrim(coalesce(p_capacity_unit, '')), '') is not null then raise exception 'Capacity needs a value'; end if;

  select status into previous_status from command.food_contributors where profile_id = auth.uid();

  insert into command.food_contributors (
    profile_id, display_name, phone, emergency_contact_name, emergency_contact_phone,
    availability, service_area, vehicle_type, capacity_value, capacity_unit,
    has_insulated_coolers, has_refrigeration, has_frozen_storage, has_hot_holding,
    lifting_limit_lb, accessibility_needs, agreement_version, agreement_accepted_at,
    status, approved_run_classes, training_completed_at, training_expires_at,
    credential_type, credential_expires_at, review_note, reviewed_by, reviewed_at
  ) values (
    auth.uid(), btrim(p_display_name), btrim(p_phone), btrim(p_emergency_contact_name),
    btrim(p_emergency_contact_phone), btrim(p_availability), btrim(p_service_area),
    p_vehicle_type, p_capacity_value, nullif(btrim(coalesce(p_capacity_unit, '')), ''),
    coalesce(p_has_insulated_coolers, false), coalesce(p_has_refrigeration, false),
    coalesce(p_has_frozen_storage, false), coalesce(p_has_hot_holding, false),
    p_lifting_limit_lb, btrim(p_accessibility_needs), '2026-07-17', now(),
    'submitted', '{}', null, null, null, null, null, null, null
  )
  on conflict (profile_id) do update set
    display_name = excluded.display_name,
    phone = excluded.phone,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_phone = excluded.emergency_contact_phone,
    availability = excluded.availability,
    service_area = excluded.service_area,
    vehicle_type = excluded.vehicle_type,
    capacity_value = excluded.capacity_value,
    capacity_unit = excluded.capacity_unit,
    has_insulated_coolers = excluded.has_insulated_coolers,
    has_refrigeration = excluded.has_refrigeration,
    has_frozen_storage = excluded.has_frozen_storage,
    has_hot_holding = excluded.has_hot_holding,
    lifting_limit_lb = excluded.lifting_limit_lb,
    accessibility_needs = excluded.accessibility_needs,
    agreement_version = excluded.agreement_version,
    agreement_accepted_at = excluded.agreement_accepted_at,
    status = 'submitted',
    approved_run_classes = '{}',
    training_completed_at = null,
    training_expires_at = null,
    credential_type = null,
    credential_expires_at = null,
    review_note = null,
    reviewed_by = null,
    reviewed_at = null
  returning * into result;

  insert into command.food_contributor_review_events (contributor_id, from_status, to_status, note, actor_id)
  values (result.profile_id, previous_status, 'submitted', 'Contributor submitted or updated readiness information', auth.uid());
  return result;
end;
$$;

create or replace function command.review_food_contributor(
  p_profile_id uuid,
  p_decision text,
  p_approved_run_classes text[],
  p_training_completed_at timestamptz,
  p_training_expires_at timestamptz,
  p_credential_type text,
  p_credential_expires_at date,
  p_note text
)
returns command.food_contributors
language plpgsql
security definer
set search_path = command, public
as $$
declare
  previous_status text;
  result command.food_contributors;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Coordinator review permission is required'; end if;
  if p_decision not in ('approved', 'declined', 'suspended') then raise exception 'Invalid readiness decision'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'A review note is required'; end if;
  if p_approved_run_classes is null or not (p_approved_run_classes <@ array['not_controlled', 'chilled', 'frozen', 'hot']::text[]) then raise exception 'Invalid run classes'; end if;
  if p_decision = 'approved' and (
    cardinality(p_approved_run_classes) = 0
    or p_training_completed_at is null
    or p_training_expires_at is null
    or p_training_expires_at <= now()
  ) then raise exception 'Current training and at least one run class are required for approval'; end if;

  select status into previous_status from command.food_contributors where profile_id = p_profile_id for update;
  update command.food_contributors as contributor
  set
    status = p_decision,
    approved_run_classes = case when p_decision = 'approved' then p_approved_run_classes else '{}' end,
    training_completed_at = p_training_completed_at,
    training_expires_at = p_training_expires_at,
    credential_type = nullif(btrim(coalesce(p_credential_type, '')), ''),
    credential_expires_at = p_credential_expires_at,
    review_note = btrim(p_note),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where contributor.profile_id = p_profile_id
  returning * into result;

  if result.profile_id is null then raise exception 'Contributor profile not found'; end if;
  if result.status = 'approved' and 'chilled' = any(result.approved_run_classes)
    and not (result.has_insulated_coolers or result.has_refrigeration) then
    raise exception 'Chilled approval requires insulated coolers or refrigeration';
  end if;
  if result.status = 'approved' and 'frozen' = any(result.approved_run_classes)
    and not result.has_frozen_storage then raise exception 'Frozen approval requires frozen storage capability'; end if;
  if result.status = 'approved' and 'hot' = any(result.approved_run_classes)
    and not result.has_hot_holding then raise exception 'Hot approval requires hot-holding capability'; end if;

  insert into command.food_contributor_review_events (contributor_id, from_status, to_status, note, actor_id)
  values (result.profile_id, previous_status, result.status, btrim(p_note), auth.uid());
  return result;
end;
$$;

/* Replace migration 028 claiming with operational eligibility enforcement. */
create or replace function command.claim_food_rescue(p_rescue_id uuid)
returns command.food_rescues
language plpgsql
security definer
set search_path = command, public
as $$
declare
  target command.food_rescues;
  contributor command.food_contributors;
  result command.food_rescues;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into target from command.food_rescues where id = p_rescue_id for update;
  if target.id is null then raise exception 'Rescue not found'; end if;

  if target.status = 'claimed' and target.claim_expires_at is not null
    and target.claim_expires_at <= now() and target.pickup_window_end > now() then
    update command.food_rescues set status = 'open', claimed_by = null, claimed_at = null, claim_expires_at = null
    where id = target.id;
    target.status := 'open';
  end if;

  select * into contributor from command.food_contributors where profile_id = auth.uid();
  if contributor.profile_id is null or contributor.status <> 'approved' then
    raise exception 'An approved Contributor profile is required to claim rescues';
  end if;
  if contributor.training_expires_at is null or contributor.training_expires_at <= now() then
    raise exception 'Contributor training is missing or expired';
  end if;
  if contributor.credential_expires_at is not null and contributor.credential_expires_at < current_date then
    raise exception 'Contributor credential is expired';
  end if;
  if not (target.temperature_class = any(contributor.approved_run_classes)) then
    raise exception 'This rescue is outside the Contributor approved run classes';
  end if;
  if target.temperature_class = 'chilled' and not (contributor.has_insulated_coolers or contributor.has_refrigeration) then
    raise exception 'This chilled rescue requires approved cold-holding equipment';
  end if;
  if target.temperature_class = 'frozen' and not contributor.has_frozen_storage then
    raise exception 'This frozen rescue requires approved frozen-storage capability';
  end if;
  if target.temperature_class = 'hot' and not contributor.has_hot_holding then
    raise exception 'This hot rescue requires approved hot-holding equipment';
  end if;

  update command.food_rescues as rescue
  set status = 'claimed', claimed_by = auth.uid(), claimed_at = now(),
      claim_expires_at = least(rescue.pickup_window_end, now() + interval '2 hours')
  where rescue.id = target.id and rescue.status = 'open' and rescue.pickup_window_end > now()
  returning rescue.* into result;
  if result.id is null then raise exception 'This rescue is no longer available to claim'; end if;
  return result;
end;
$$;

alter table command.food_contributors enable row level security;
alter table command.food_contributor_review_events enable row level security;

create policy food_contributors_private_read on command.food_contributors
  for select using (profile_id = auth.uid() or command.current_role() = 'admin');
create policy food_contributor_events_private_read on command.food_contributor_review_events
  for select using (contributor_id = auth.uid() or command.current_role() = 'admin');

grant select on command.food_contributors, command.food_contributor_review_events to authenticated;
revoke insert, update, delete on command.food_contributors, command.food_contributor_review_events from anon, authenticated;

revoke execute on function command.get_food_contributor_profile() from public;
revoke execute on function command.list_food_contributors_for_review() from public;
revoke execute on function command.submit_food_contributor_profile(text, text, text, text, text, text, text, numeric, text, boolean, boolean, boolean, boolean, numeric, text, boolean) from public;
revoke execute on function command.review_food_contributor(uuid, text, text[], timestamptz, timestamptz, text, date, text) from public;
grant execute on function command.get_food_contributor_profile() to authenticated;
grant execute on function command.list_food_contributors_for_review() to authenticated;
grant execute on function command.submit_food_contributor_profile(text, text, text, text, text, text, text, numeric, text, boolean, boolean, boolean, boolean, numeric, text, boolean) to authenticated;
grant execute on function command.review_food_contributor(uuid, text, text[], timestamptz, timestamptz, text, date, text) to authenticated;

comment on table command.food_contributors is 'Private WXL:FOOD Contributor applications, capabilities, training, and operational approval.';
comment on table command.food_contributor_review_events is 'Immutable review history for WXL:FOOD Contributor readiness decisions.';
