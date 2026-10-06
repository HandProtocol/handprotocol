/*
  050_yuhm_food_runs.sql
  yuhm pickup runs: one person picks food up from a source (a church pantry,
  a food bank, a store, a farm) and shares it out to the households they look
  after. The run sheet holds the haul, the households on the run, what each
  household needs or does not want, the portion split, and every check-off
  from "asked" to "delivered".

  Privacy boundary
  - Households, contact details, addresses, and portions belong to the runner
    who entered them. No anonymous read, no coordinator read, no public map.
  - Clients never write these tables. Every write goes through
    apply_food_run_changes(): an ordered batch of changes, each with a client
    key and the phone's own timestamp, so a phone that lost signal at the
    pantry can replay its queue later and the times stay true.
  - A household marked "only for this run" (keep_info = false) is forgotten
    when the run completes: the household row is deleted and its stops keep
    only "A family" and a head count.
  - The activity log stores operation names and ids, never names, numbers,
    or addresses.
  - Practice runs (the sample a newcomer tries) never plant seeds and never
    count in the circle or network totals.

  Recognition (THE MISSION, plans/004-yuhm-the-mission.md)
  - Seeds land in food_reputation_ledger, and only for people who opted in
    (food_mission_enrollments). Seeds are thanks, never money, never
    deducted. Finishing a run before opting in still works; opting in later
    backfills those runs once.
  - Weekly rhythm (Monday to Sunday, America/Chicago) with one rest week
    banked per four active weeks (two at most) and pauses that freeze it.
    The rhythm is read from the ledger, so deleting a run never erases it.
  - Stamps for firsts and milestones. A circle goal (every runner's family
    portions this week) instead of a leaderboard.
  - This migration creates the plan-004 tables the runs need
    (food_mission_enrollments, food_mission_stamps) with the plan's columns,
    plus food_mission_pauses so a pause can freeze the rhythm.
*/

-- 1. Recognition foundations ----------------------------------------------

alter table command.food_reputation_ledger drop constraint if exists food_reputation_ledger_event_type_check;
alter table command.food_reputation_ledger add constraint food_reputation_ledger_event_type_check
  check (event_type in (
    'food_contributed','delivery_completed','event_hosted','event_supported','capacity_supplied',
    'reliability_positive','reliability_context','training_completed','waste_prevented','volunteer_hours',
    'cancellation','correction','appeal_resolution','mission_bonus'
  ));

create index if not exists food_reputation_evidence_idx
  on command.food_reputation_ledger(participant_id, evidence_type, evidence_id);

create table if not exists command.food_mission_enrollments (
  participant_id uuid primary key references command.food_participants(id) on delete cascade,
  status text not null default 'active' check (status in ('active','paused','left')),
  routes text[] not null default array['move']::text[]
    check (cardinality(routes) between 1 and 6 and routes <@ array['eat','grow','make','move','share','organize']::text[]),
  rhythm_goal smallint not null default 2 check (rhythm_goal between 1 and 3),
  zone text check (zone is null or char_length(btrim(zone)) between 2 and 80),
  capabilities jsonb not null default '{}'::jsonb check (jsonb_typeof(capabilities) = 'object'),
  available_until timestamptz,
  paused_until timestamptz,
  consent_version text not null check (char_length(consent_version) between 3 and 60),
  enrolled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  left_at timestamptz,
  check (status <> 'left' or left_at is not null),
  check (status <> 'paused' or paused_until is not null)
);

create table if not exists command.food_mission_pauses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  paused_at timestamptz not null default now(),
  resumed_at timestamptz,
  check (resumed_at is null or resumed_at >= paused_at)
);

create unique index if not exists food_mission_pauses_open_idx
  on command.food_mission_pauses(participant_id) where resumed_at is null;
create index if not exists food_mission_pauses_participant_idx
  on command.food_mission_pauses(participant_id, paused_at);

create table if not exists command.food_mission_stamps (
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  stamp_slug text not null check (stamp_slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  awarded_at timestamptz not null default now(),
  evidence_id uuid,
  primary key (participant_id, stamp_slug)
);

-- One row of network-wide recognition rules, tuned by coordinators.
create table if not exists command.food_run_rules (
  id boolean primary key default true check (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references command.profiles(id) on delete set null,
  seeds_ask smallint not null default 2 check (seeds_ask between 0 and 100),
  seeds_intake smallint not null default 3 check (seeds_intake between 0 and 100),
  seeds_pickup smallint not null default 10 check (seeds_pickup between 0 and 100),
  seeds_delivered smallint not null default 5 check (seeds_delivered between 0 and 100),
  seeds_full_circle smallint not null default 10 check (seeds_full_circle between 0 and 100),
  seeds_no_waste smallint not null default 5 check (seeds_no_waste between 0 and 100),
  seeds_tough_each smallint not null default 5 check (seeds_tough_each between 0 and 100),
  seeds_tough_cap smallint not null default 20 check (seeds_tough_cap between 0 and 200),
  seeds_complete smallint not null default 10 check (seeds_complete between 0 and 100),
  seeds_stamp smallint not null default 5 check (seeds_stamp between 0 and 100),
  intake_threshold smallint not null default 3 check (intake_threshold between 1 and 10),
  circle_goal integer not null default 40 check (circle_goal between 1 and 100000),
  stamps_enabled boolean not null default true
);

insert into command.food_run_rules(id) values (true) on conflict (id) do nothing;

-- 2. Pickup runs -----------------------------------------------------------

create or replace function command.food_run_tags_ok(p_tags text[], p_max integer)
returns boolean
language sql
immutable
as $$
  select coalesce(cardinality(p_tags), 0) <= p_max
    and not exists (
      select 1 from unnest(coalesce(p_tags, '{}'::text[])) as tag
      where tag is null or char_length(btrim(tag)) not between 1 and 40
    );
$$;

create table if not exists command.food_run_households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references command.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  label text not null check (char_length(btrim(label)) between 1 and 80),
  adults smallint not null default 1 check (adults between 0 and 30),
  kids smallint not null default 0 check (kids between 0 and 30),
  seniors smallint not null default 0 check (seniors between 0 and 30),
  language text not null default 'en' check (language in ('en','es','other')),
  contact_method text not null default 'sms' check (contact_method in ('sms','call','whatsapp','email','in_person')),
  contact_value text check (contact_value is null or char_length(btrim(contact_value)) between 3 and 120),
  place text check (place is null or char_length(btrim(place)) between 2 and 200),
  neighborhood text check (neighborhood is null or char_length(btrim(neighborhood)) between 2 and 80),
  access_notes text check (access_notes is null or char_length(btrim(access_notes)) between 1 and 280),
  best_time text not null default 'any' check (best_time in ('morning','afternoon','evening','any')),
  handoff text not null default 'door' check (handoff in ('door','meet','pickup')),
  allergies text[] not null default '{}' check (command.food_run_tags_ok(allergies, 20)),
  avoids text[] not null default '{}' check (command.food_run_tags_ok(avoids, 20)),
  never_needs text[] not null default '{}' check (command.food_run_tags_ok(never_needs, 30)),
  wants text[] not null default '{}' check (command.food_run_tags_ok(wants, 20)),
  kitchen text[] not null default '{}' check (command.food_run_tags_ok(kitchen, 6)),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 600),
  keep_info boolean not null default true,
  is_practice boolean not null default false,
  status text not null default 'active' check (status in ('active','paused','archived')),
  answered jsonb not null default '{}'::jsonb check (jsonb_typeof(answered) = 'object'),
  last_asked_at timestamptz,
  last_served_at timestamptz,
  check (adults + kids + seniors between 1 and 40)
);

create table if not exists command.food_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references command.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  source_name text not null check (char_length(btrim(source_name)) between 2 and 120),
  source_kind text not null default 'church'
    check (source_kind in ('church','pantry','food_bank','grocery','farm','restaurant','garden','event','other')),
  source_place text check (source_place is null or char_length(btrim(source_place)) between 2 and 200),
  source_contact text check (source_contact is null or char_length(btrim(source_contact)) between 3 and 120),
  pickup_starts_at timestamptz not null,
  pickup_ends_at timestamptz not null,
  deliver_by timestamptz,
  status text not null default 'planned' check (status in ('planned','pickup','delivering','completed','cancelled')),
  is_practice boolean not null default false,
  conditions text[] not null default '{}'
    check (conditions <@ array['heat','rain','cold_snap','long_drive','heavy_lifting','solo','short_notice','no_car']::text[]),
  pickup_checks jsonb not null default '{}'::jsonb check (jsonb_typeof(pickup_checks) = 'object'),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 1000),
  started_at timestamptz,
  picked_up_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text check (cancel_reason is null or char_length(btrim(cancel_reason)) between 1 and 280),
  leftovers_rehomed boolean not null default false,
  leftovers_note text check (leftovers_note is null or char_length(btrim(leftovers_note)) between 1 and 280),
  seeds_awarded integer not null default 0 check (seeds_awarded >= 0),
  awards jsonb not null default '[]'::jsonb check (jsonb_typeof(awards) = 'array'),
  check (pickup_ends_at > pickup_starts_at and pickup_ends_at <= pickup_starts_at + interval '24 hours'),
  check (deliver_by is null or deliver_by > pickup_starts_at),
  check (status not in ('delivering','completed') or picked_up_at is not null),
  check (status <> 'completed' or completed_at is not null),
  check (status <> 'cancelled' or cancelled_at is not null)
);

create table if not exists command.food_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references command.food_runs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  position smallint not null default 0 check (position between 0 and 500),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind text not null default 'other'
    check (kind in ('produce','bread','dairy','eggs','meat','poultry','fish','canned','dry_goods','frozen','prepared','snacks','baby','hygiene','drinks','other')),
  unit text not null default 'item'
    check (unit in ('box','bag','item','loaf','lb','gallon','dozen','can','pack','tray','meal','bunch','jar')),
  expected_qty numeric(7,1) not null default 0 check (expected_qty between 0 and 9999),
  received_qty numeric(7,1) check (received_qty is null or received_qty between 0 and 9999),
  contains text[] not null default '{}'
    check (contains <@ array['dairy','egg','gluten','peanut','tree_nut','soy','fish','shellfish','sesame','pork','beef','meat','sugar','salt','alcohol']::text[]),
  temp text not null default 'shelf' check (temp in ('shelf','chilled','frozen','hot')),
  note text check (note is null or char_length(btrim(note)) between 1 and 200),
  unique (run_id, id)
);

create table if not exists command.food_run_stops (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references command.food_runs(id) on delete cascade,
  household_id uuid references command.food_run_households(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  label text not null check (char_length(btrim(label)) between 1 and 80),
  people smallint not null default 1 check (people between 1 and 40),
  lang text not null default 'en' check (lang in ('en','es','other')),
  forgotten boolean not null default false,
  position smallint not null default 0 check (position between 0 and 500),
  bag smallint check (bag is null or bag between 1 and 99),
  contact_state text not null default 'to_ask' check (contact_state in ('to_ask','asked','confirmed','declined','no_answer')),
  delivery_state text not null default 'pending' check (delivery_state in ('pending','packed','on_the_way','delivered','missed')),
  asked_at timestamptz,
  answered_at timestamptz,
  packed_at timestamptz,
  notified_at timestamptz,
  delivered_at timestamptz,
  planned_at timestamptz,
  skip_item_ids uuid[] not null default '{}' check (coalesce(cardinality(skip_item_ids), 0) <= 80),
  intake_keys text[] not null default '{}'
    check (intake_keys <@ array['size','allergies','avoids','skip','wants','kitchen','handoff','time','language','keep']::text[]),
  note text check (note is null or char_length(btrim(note)) between 1 and 280),
  unique (run_id, id),
  unique (run_id, household_id),
  check (delivery_state <> 'delivered' or delivered_at is not null),
  check (not (contact_state = 'declined' and delivery_state in ('packed','on_the_way','delivered')))
);

create table if not exists command.food_run_portions (
  run_id uuid not null,
  stop_id uuid not null,
  item_id uuid not null,
  quantity numeric(7,1) not null check (quantity > 0 and quantity <= 9999),
  locked boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (stop_id, item_id),
  foreign key (run_id, stop_id) references command.food_run_stops(run_id, id) on delete cascade,
  foreign key (run_id, item_id) references command.food_run_items(run_id, id) on delete cascade
);

create table if not exists command.food_run_settings (
  owner_id uuid primary key references command.profiles(id) on delete cascade,
  updated_at timestamptz not null default now(),
  prefs jsonb not null default '{}'::jsonb check (jsonb_typeof(prefs) = 'object' and octet_length(prefs::text) <= 20000)
);

-- Idempotency receipts and the run's activity log in one append-only table.
-- run_id is deliberately not a foreign key: a deleted run or a forgotten
-- household leaves a tombstone so a stale offline queue cannot recreate it.
create table if not exists command.food_run_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  owner_id uuid not null references command.profiles(id) on delete cascade,
  run_id uuid,
  op text not null check (char_length(op) between 3 and 40),
  entity_id uuid,
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 120),
  unique (owner_id, idempotency_key)
);

create index if not exists food_run_households_owner_idx on command.food_run_households(owner_id, status);
create index if not exists food_runs_owner_idx on command.food_runs(owner_id, status, pickup_starts_at desc);
create index if not exists food_runs_completed_idx on command.food_runs(status, completed_at) where status = 'completed';
create index if not exists food_run_items_run_idx on command.food_run_items(run_id, position);
create index if not exists food_run_stops_run_idx on command.food_run_stops(run_id, position);
create index if not exists food_run_stops_household_idx on command.food_run_stops(household_id) where household_id is not null;
create index if not exists food_run_portions_run_idx on command.food_run_portions(run_id);
create index if not exists food_run_portions_item_idx on command.food_run_portions(item_id);
create index if not exists food_run_events_run_idx on command.food_run_events(owner_id, run_id, occurred_at desc);
create index if not exists food_run_events_entity_idx on command.food_run_events(owner_id, entity_id, op);
create index if not exists food_run_events_age_idx on command.food_run_events(created_at);

drop trigger if exists food_run_households_touch_updated_at on command.food_run_households;
create trigger food_run_households_touch_updated_at before update on command.food_run_households for each row execute function command.touch_updated_at();
drop trigger if exists food_runs_touch_updated_at on command.food_runs;
create trigger food_runs_touch_updated_at before update on command.food_runs for each row execute function command.touch_updated_at();
drop trigger if exists food_run_items_touch_updated_at on command.food_run_items;
create trigger food_run_items_touch_updated_at before update on command.food_run_items for each row execute function command.touch_updated_at();
drop trigger if exists food_run_stops_touch_updated_at on command.food_run_stops;
create trigger food_run_stops_touch_updated_at before update on command.food_run_stops for each row execute function command.touch_updated_at();
drop trigger if exists food_run_portions_touch_updated_at on command.food_run_portions;
create trigger food_run_portions_touch_updated_at before update on command.food_run_portions for each row execute function command.touch_updated_at();
drop trigger if exists food_run_settings_touch_updated_at on command.food_run_settings;
create trigger food_run_settings_touch_updated_at before update on command.food_run_settings for each row execute function command.touch_updated_at();
drop trigger if exists food_run_rules_touch_updated_at on command.food_run_rules;
create trigger food_run_rules_touch_updated_at before update on command.food_run_rules for each row execute function command.touch_updated_at();
drop trigger if exists food_mission_enrollments_touch_updated_at on command.food_mission_enrollments;
create trigger food_mission_enrollments_touch_updated_at before update on command.food_mission_enrollments for each row execute function command.touch_updated_at();

create or replace function command.food_run_events_guard()
returns trigger
language plpgsql
as $$
begin
  raise exception 'food_run_events is append-only';
end;
$$;

drop trigger if exists food_run_events_append_only on command.food_run_events;
create trigger food_run_events_append_only before update on command.food_run_events
  for each row execute function command.food_run_events_guard();

-- A stop may only point at a household of the run's own runner.
create or replace function command.food_run_stops_guard()
returns trigger
language plpgsql
security definer
set search_path = command, public
as $$
begin
  if new.household_id is not null and not exists (
    select 1
    from command.food_run_households as household
    join command.food_runs as run on run.owner_id = household.owner_id
    where household.id = new.household_id and run.id = new.run_id
  ) then
    raise exception 'A run can only include your own households';
  end if;
  return new;
end;
$$;

drop trigger if exists food_run_stops_owner_guard on command.food_run_stops;
create trigger food_run_stops_owner_guard before insert or update of household_id, run_id on command.food_run_stops
  for each row execute function command.food_run_stops_guard();

alter table command.food_run_households enable row level security;
alter table command.food_runs enable row level security;
alter table command.food_run_items enable row level security;
alter table command.food_run_stops enable row level security;
alter table command.food_run_portions enable row level security;
alter table command.food_run_settings enable row level security;
alter table command.food_run_events enable row level security;
alter table command.food_run_rules enable row level security;
alter table command.food_mission_enrollments enable row level security;
alter table command.food_mission_pauses enable row level security;
alter table command.food_mission_stamps enable row level security;

drop policy if exists food_run_households_owner_read on command.food_run_households;
create policy food_run_households_owner_read on command.food_run_households
  for select using (owner_id = auth.uid());
drop policy if exists food_runs_owner_read on command.food_runs;
create policy food_runs_owner_read on command.food_runs
  for select using (owner_id = auth.uid());
drop policy if exists food_run_items_owner_read on command.food_run_items;
create policy food_run_items_owner_read on command.food_run_items
  for select using (exists (select 1 from command.food_runs as run where run.id = food_run_items.run_id and run.owner_id = auth.uid()));
drop policy if exists food_run_stops_owner_read on command.food_run_stops;
create policy food_run_stops_owner_read on command.food_run_stops
  for select using (exists (select 1 from command.food_runs as run where run.id = food_run_stops.run_id and run.owner_id = auth.uid()));
drop policy if exists food_run_portions_owner_read on command.food_run_portions;
create policy food_run_portions_owner_read on command.food_run_portions
  for select using (exists (select 1 from command.food_runs as run where run.id = food_run_portions.run_id and run.owner_id = auth.uid()));
drop policy if exists food_run_settings_owner_read on command.food_run_settings;
create policy food_run_settings_owner_read on command.food_run_settings
  for select using (owner_id = auth.uid());
drop policy if exists food_run_events_owner_read on command.food_run_events;
create policy food_run_events_owner_read on command.food_run_events
  for select using (owner_id = auth.uid());
drop policy if exists food_run_rules_public_read on command.food_run_rules;
create policy food_run_rules_public_read on command.food_run_rules
  for select using (true);
drop policy if exists food_mission_enrollments_own_read on command.food_mission_enrollments;
create policy food_mission_enrollments_own_read on command.food_mission_enrollments
  for select using (exists (select 1 from command.food_participants as participant where participant.id = food_mission_enrollments.participant_id and participant.profile_id = auth.uid()));
drop policy if exists food_mission_pauses_own_read on command.food_mission_pauses;
create policy food_mission_pauses_own_read on command.food_mission_pauses
  for select using (exists (select 1 from command.food_participants as participant where participant.id = food_mission_pauses.participant_id and participant.profile_id = auth.uid()));
drop policy if exists food_mission_stamps_own_read on command.food_mission_stamps;
create policy food_mission_stamps_own_read on command.food_mission_stamps
  for select using (exists (select 1 from command.food_participants as participant where participant.id = food_mission_stamps.participant_id and participant.profile_id = auth.uid()));

-- 3. Input helpers (internal) ----------------------------------------------

create or replace function command.food_run_txt(p jsonb, k text, lo integer, hi integer, required boolean default false)
returns text
language plpgsql
immutable
as $$
declare value text;
begin
  if p ? k and jsonb_typeof(p->k) not in ('string','null') then
    raise exception 'Field % must be text', k;
  end if;
  value := nullif(btrim(coalesce(p->>k, '')), '');
  if value is null then
    if required then raise exception 'Field % is required', k; end if;
    return null;
  end if;
  if char_length(value) < lo or char_length(value) > hi then
    raise exception 'Field % must be % to % characters', k, lo, hi;
  end if;
  return value;
end;
$$;

create or replace function command.food_run_num(p jsonb, k text, lo numeric, hi numeric, fallback numeric)
returns numeric
language plpgsql
immutable
as $$
declare value numeric;
begin
  if not (p ? k) or jsonb_typeof(p->k) = 'null' then return fallback; end if;
  if jsonb_typeof(p->k) <> 'number' then raise exception 'Field % must be a number', k; end if;
  value := (p->>k)::numeric;
  if value < lo or value > hi then raise exception 'Field % must be between % and %', k, lo, hi; end if;
  return value;
end;
$$;

create or replace function command.food_run_bool(p jsonb, k text, fallback boolean)
returns boolean
language plpgsql
immutable
as $$
begin
  if not (p ? k) or jsonb_typeof(p->k) = 'null' then return fallback; end if;
  if jsonb_typeof(p->k) <> 'boolean' then raise exception 'Field % must be true or false', k; end if;
  return (p->>k)::boolean;
end;
$$;

create or replace function command.food_run_ts(p jsonb, k text, required boolean default false)
returns timestamptz
language plpgsql
stable
as $$
declare value timestamptz;
begin
  if not (p ? k) or jsonb_typeof(p->k) = 'null' or btrim(coalesce(p->>k, '')) = '' then
    if required then raise exception 'Field % is required', k; end if;
    return null;
  end if;
  begin
    value := (p->>k)::timestamptz;
  exception when others then
    raise exception 'Field % must be a date and time', k;
  end;
  return value;
end;
$$;

-- When a change happened, as the phone recorded it. Accepted when it is at
-- most 90 days old and not ahead of the server clock; otherwise the server's
-- own time is used.
create or replace function command.food_run_at(p jsonb)
returns timestamptz
language plpgsql
stable
as $$
declare value timestamptz;
begin
  if not (p ? 'at') or jsonb_typeof(p->'at') <> 'string' then return now(); end if;
  begin
    value := (p->>'at')::timestamptz;
  exception when others then
    return now();
  end;
  if value > now() + interval '2 minutes' or value < now() - interval '90 days' then return now(); end if;
  return least(value, now());
end;
$$;

create or replace function command.food_run_uuid(p jsonb, k text, required boolean default true)
returns uuid
language plpgsql
immutable
as $$
declare value uuid;
begin
  if not (p ? k) or jsonb_typeof(p->k) = 'null' or btrim(coalesce(p->>k, '')) = '' then
    if required then raise exception 'Field % is required', k; end if;
    return null;
  end if;
  begin
    value := (p->>k)::uuid;
  exception when others then
    raise exception 'Field % must be an id', k;
  end;
  return value;
end;
$$;

create or replace function command.food_run_pick(p jsonb, k text, allowed text[], fallback text)
returns text
language plpgsql
immutable
as $$
declare value text;
begin
  if p ? k and jsonb_typeof(p->k) not in ('string','null') then raise exception 'Field % must be text', k; end if;
  value := coalesce(nullif(btrim(coalesce(p->>k, '')), ''), fallback);
  if value is null then raise exception 'Field % is required', k; end if;
  if not value = any(allowed) then raise exception 'Field % cannot be %', k, value; end if;
  return value;
end;
$$;

create or replace function command.food_run_arr(p jsonb, k text, max_items integer)
returns text[]
language plpgsql
immutable
as $$
declare value text[];
begin
  if not (p ? k) or jsonb_typeof(p->k) = 'null' then return '{}'::text[]; end if;
  if jsonb_typeof(p->k) <> 'array' then raise exception 'Field % must be a list', k; end if;
  if exists (select 1 from jsonb_array_elements(p->k) as element where jsonb_typeof(element) <> 'string') then
    raise exception 'Field % must be a list of words', k;
  end if;
  select coalesce(array_agg(entry order by entry collate "C"), '{}'::text[])
    into value
    from (select distinct btrim(element) as entry from jsonb_array_elements_text(p->k) as element where btrim(element) <> '') as entries;
  if cardinality(value) > max_items then raise exception 'Field % has more than % entries', k, max_items; end if;
  if exists (select 1 from unnest(value) as entry where char_length(entry) > 40) then
    raise exception 'Each entry in % must be 40 characters or fewer', k;
  end if;
  return value;
end;
$$;

create or replace function command.food_run_answers(p jsonb)
returns jsonb
language plpgsql
immutable
as $$
begin
  if p is null or jsonb_typeof(p) = 'null' then return '{}'::jsonb; end if;
  if jsonb_typeof(p) <> 'object' then raise exception 'Field answered must be an object'; end if;
  if (select count(*) from jsonb_object_keys(p)) > 24 then raise exception 'Field answered has too many questions'; end if;
  if exists (
    select 1 from jsonb_each(p) as entry
    where entry.key !~ '^[a-z_]{2,30}$' or jsonb_typeof(entry.value) <> 'string' or char_length(entry.value #>> '{}') > 40
  ) then
    raise exception 'Field answered holds an unknown question';
  end if;
  return p;
end;
$$;

create or replace function command.food_run_valid_prefs(p jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  entry record;
  template record;
  variant record;
  result jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'Settings must be an object'; end if;
  for entry in select * from jsonb_each(p) loop
    case entry.key
      when 'contactLeadHours' then result := result || jsonb_build_object(entry.key, command.food_run_num(p, entry.key, 1, 72, null));
      when 'followUpMinutes' then result := result || jsonb_build_object(entry.key, command.food_run_num(p, entry.key, 10, 1440, null));
      when 'travelMinutes' then result := result || jsonb_build_object(entry.key, command.food_run_num(p, entry.key, 5, 240, null));
      when 'coldMinutes' then result := result || jsonb_build_object(entry.key, command.food_run_num(p, entry.key, 30, 240, null));
      when 'reserveEach' then result := result || jsonb_build_object(entry.key, command.food_run_num(p, entry.key, 0, 10, null));
      when 'splitBy' then result := result || jsonb_build_object(entry.key, command.food_run_pick(p, entry.key, array['people','household'], null));
      when 'onlyConfirmed', 'respectWants', 'alerts', 'quietHours' then result := result || jsonb_build_object(entry.key, command.food_run_bool(p, entry.key, null));
      when 'myName' then result := result || jsonb_build_object(entry.key, command.food_run_txt(p, entry.key, 1, 60));
      when 'templates' then
        if jsonb_typeof(entry.value) <> 'object' then raise exception 'Message templates must be an object'; end if;
        for template in select * from jsonb_each(entry.value) loop
          if template.key not in ('ask','confirm','onway','delivered','questions','missed') then raise exception 'Unknown message template %', template.key; end if;
          if jsonb_typeof(template.value) <> 'object' then raise exception 'Template % must hold languages', template.key; end if;
          for variant in select * from jsonb_each(template.value) loop
            if variant.key not in ('en','es') then raise exception 'Template % has an unknown language', template.key; end if;
            if jsonb_typeof(variant.value) <> 'string' or char_length(variant.value #>> '{}') > 700 then
              raise exception 'Template % in % must be text of 700 characters or fewer', template.key, variant.key;
            end if;
          end loop;
        end loop;
        result := result || jsonb_build_object(entry.key, entry.value);
      else
        raise exception 'Unknown setting %', entry.key;
    end case;
  end loop;
  return result;
end;
$$;

create or replace function command.food_run_participant_id()
returns uuid
language plpgsql
security definer
set search_path = command, public
as $$
declare
  participant uuid;
  profile command.profiles;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select id into participant from command.food_participants where profile_id = auth.uid();
  if participant is not null then return participant; end if;
  select * into profile from command.profiles where id = auth.uid();
  if profile.id is null then raise exception 'Your yuhm profile is missing. Sign out and back in.'; end if;
  insert into command.food_participants(profile_id, display_name, roles, trust_tier)
  values (
    auth.uid(),
    left(coalesce(nullif(btrim(profile.display_name), ''), nullif(split_part(profile.email, '@', 1), ''), 'yuhm member'), 160),
    array['contributor']::text[],
    1
  )
  on conflict (profile_id) do nothing
  returning id into participant;
  if participant is null then
    select id into participant from command.food_participants where profile_id = auth.uid();
  end if;
  return participant;
end;
$$;

-- A pause that has run past its end date is closed, and the person is active again.
create or replace function command.food_mission_settle(p_participant uuid)
returns void
language plpgsql
security definer
set search_path = command, public
as $$
begin
  update command.food_mission_pauses as pause
    set resumed_at = greatest(enrollment.paused_until, pause.paused_at)
    from command.food_mission_enrollments as enrollment
    where pause.participant_id = p_participant and enrollment.participant_id = p_participant
      and pause.resumed_at is null and enrollment.status = 'paused' and enrollment.paused_until <= now();
  update command.food_mission_enrollments
    set status = 'active', paused_until = null
    where participant_id = p_participant and status = 'paused' and paused_until <= now();
end;
$$;

-- 4. Commands: one dispatcher for every change ------------------------------

create or replace function command.food_run_owned(p_owner uuid, p_run_id uuid, p_writable boolean default true)
returns command.food_runs
language plpgsql
security definer
set search_path = command, public
as $$
declare result command.food_runs;
begin
  select * into result from command.food_runs where id = p_run_id and owner_id = p_owner for update;
  if result.id is null then raise exception 'Run not found'; end if;
  if p_writable and result.status = 'completed' then raise exception 'This run is finished. Reopen it to change it.'; end if;
  if p_writable and result.status = 'cancelled' then raise exception 'This run was cancelled. Restore it to change it.'; end if;
  return result;
end;
$$;

create or replace function command.food_run_forget_household(p_owner uuid, p_household_id uuid)
returns boolean
language plpgsql
security definer
set search_path = command, public
as $$
begin
  update command.food_run_stops as stop
    set label = 'A family', forgotten = true, note = null
    from command.food_runs as run
    where run.id = stop.run_id and run.owner_id = p_owner and stop.household_id = p_household_id;
  delete from command.food_run_households where id = p_household_id and owner_id = p_owner;
  return found;
end;
$$;

create or replace function command.food_run_apply_op(p_owner uuid, p_op text, p_change jsonb)
returns jsonb
language plpgsql
security definer
set search_path = command, public
as $$
declare
  happened timestamptz := command.food_run_at(p_change);
  body jsonb;
  target uuid;
  run_ref uuid;
  stop_ref uuid;
  item_ref uuid;
  household_ref uuid;
  run_row command.food_runs;
  stop_row command.food_run_stops;
  household command.food_run_households;
  state text;
  tags text[];
  starts timestamptz;
  ends timestamptz;
  deliver timestamptz;
  qty numeric;
  skip_ids uuid[];
  portion jsonb;
  people_count numeric;
begin
  case p_op

  when 'household.save' then
    body := p_change->'household';
    if jsonb_typeof(body) is distinct from 'object' then raise exception 'household.save needs a household'; end if;
    target := command.food_run_uuid(body, 'id');
    select * into household from command.food_run_households where id = target;
    if household.id is not null and household.owner_id <> p_owner then raise exception 'Family not found'; end if;
    if household.id is null then
      if exists (select 1 from command.food_run_events where owner_id = p_owner and op = 'household.forget' and entity_id = target) then
        raise exception 'This family was forgotten. Add them again as a new family.';
      end if;
      if (select count(*) from command.food_run_households where owner_id = p_owner) >= 500 then
        raise exception 'You have reached the limit of 500 families';
      end if;
    end if;
    people_count := command.food_run_num(body, 'adults', 0, 30, 1) + command.food_run_num(body, 'kids', 0, 30, 0) + command.food_run_num(body, 'seniors', 0, 30, 0);
    if people_count < 1 or people_count > 40 then raise exception 'A household counts 1 to 40 people'; end if;
    insert into command.food_run_households as existing (
      id, owner_id, label, adults, kids, seniors, language, contact_method, contact_value, place, neighborhood,
      access_notes, best_time, handoff, allergies, avoids, never_needs, wants, kitchen, notes, keep_info, is_practice, status, answered
    ) values (
      target, p_owner,
      command.food_run_txt(body, 'label', 1, 80, true),
      command.food_run_num(body, 'adults', 0, 30, 1)::smallint,
      command.food_run_num(body, 'kids', 0, 30, 0)::smallint,
      command.food_run_num(body, 'seniors', 0, 30, 0)::smallint,
      command.food_run_pick(body, 'language', array['en','es','other'], 'en'),
      command.food_run_pick(body, 'contact_method', array['sms','call','whatsapp','email','in_person'], 'sms'),
      command.food_run_txt(body, 'contact_value', 3, 120),
      command.food_run_txt(body, 'place', 2, 200),
      command.food_run_txt(body, 'neighborhood', 2, 80),
      command.food_run_txt(body, 'access_notes', 1, 280),
      command.food_run_pick(body, 'best_time', array['morning','afternoon','evening','any'], 'any'),
      command.food_run_pick(body, 'handoff', array['door','meet','pickup'], 'door'),
      command.food_run_arr(body, 'allergies', 20),
      command.food_run_arr(body, 'avoids', 20),
      command.food_run_arr(body, 'never_needs', 30),
      command.food_run_arr(body, 'wants', 20),
      command.food_run_arr(body, 'kitchen', 6),
      command.food_run_txt(body, 'notes', 1, 600),
      command.food_run_bool(body, 'keep_info', true),
      command.food_run_bool(body, 'is_practice', false),
      command.food_run_pick(body, 'status', array['active','paused','archived'], 'active'),
      command.food_run_answers(body->'answered')
    )
    on conflict (id) do update set
      label = excluded.label, adults = excluded.adults, kids = excluded.kids, seniors = excluded.seniors,
      language = excluded.language, contact_method = excluded.contact_method, contact_value = excluded.contact_value,
      place = excluded.place, neighborhood = excluded.neighborhood, access_notes = excluded.access_notes,
      best_time = excluded.best_time, handoff = excluded.handoff, allergies = excluded.allergies, avoids = excluded.avoids,
      never_needs = excluded.never_needs, wants = excluded.wants, kitchen = excluded.kitchen, notes = excluded.notes,
      keep_info = excluded.keep_info, status = excluded.status, answered = excluded.answered
    where existing.owner_id = p_owner
    returning * into household;
    -- Open runs follow the family's current name, size, and language.
    update command.food_run_stops as stop
      set label = household.label, people = (household.adults + household.kids + household.seniors)::smallint, lang = household.language
      from command.food_runs as run
      where run.id = stop.run_id and run.owner_id = p_owner and run.status in ('planned','pickup','delivering')
        and stop.household_id = target
        and (stop.label, stop.people, stop.lang) is distinct from (household.label, (household.adults + household.kids + household.seniors)::smallint, household.language);
    return jsonb_build_object('entity_id', target);

  when 'household.forget' then
    target := command.food_run_uuid(p_change, 'id');
    perform command.food_run_forget_household(p_owner, target);
    return jsonb_build_object('entity_id', target);

  when 'run.save' then
    body := p_change->'run';
    if jsonb_typeof(body) is distinct from 'object' then raise exception 'run.save needs a run'; end if;
    target := command.food_run_uuid(body, 'id');
    select * into run_row from command.food_runs where id = target for update;
    if run_row.id is not null then
      if run_row.owner_id <> p_owner then raise exception 'Run not found'; end if;
      if run_row.status = 'completed' then raise exception 'This run is finished. Reopen it to change it.'; end if;
      if run_row.status = 'cancelled' then raise exception 'This run was cancelled. Restore it to change it.'; end if;
    else
      if exists (select 1 from command.food_run_events where owner_id = p_owner and op = 'run.delete' and entity_id = target) then
        raise exception 'This run was deleted.';
      end if;
      if (select count(*) from command.food_runs where owner_id = p_owner and status in ('planned','pickup','delivering')) >= 60 then
        raise exception 'You have 60 open runs. Finish or delete one first.';
      end if;
    end if;
    starts := command.food_run_ts(body, 'pickup_starts_at', true);
    ends := command.food_run_ts(body, 'pickup_ends_at', true);
    deliver := command.food_run_ts(body, 'deliver_by');
    if ends <= starts then raise exception 'The pickup window has to end after it starts'; end if;
    if ends > starts + interval '24 hours' then raise exception 'A pickup window can be 24 hours at most'; end if;
    if deliver is not null and deliver <= starts then raise exception 'Deliver-by has to come after the pickup starts'; end if;
    tags := command.food_run_arr(body, 'conditions', 12);
    if not tags <@ array['heat','rain','cold_snap','long_drive','heavy_lifting','solo','short_notice','no_car']::text[] then
      raise exception 'Unknown tough-window condition';
    end if;
    insert into command.food_runs as existing (
      id, owner_id, title, source_name, source_kind, source_place, source_contact,
      pickup_starts_at, pickup_ends_at, deliver_by, conditions, notes, is_practice
    ) values (
      target, p_owner,
      command.food_run_txt(body, 'title', 2, 120, true),
      command.food_run_txt(body, 'source_name', 2, 120, true),
      command.food_run_pick(body, 'source_kind', array['church','pantry','food_bank','grocery','farm','restaurant','garden','event','other'], 'church'),
      command.food_run_txt(body, 'source_place', 2, 200),
      command.food_run_txt(body, 'source_contact', 3, 120),
      starts, ends, deliver, tags,
      command.food_run_txt(body, 'notes', 1, 1000),
      command.food_run_bool(body, 'is_practice', false)
    )
    on conflict (id) do update set
      title = excluded.title, source_name = excluded.source_name, source_kind = excluded.source_kind,
      source_place = excluded.source_place, source_contact = excluded.source_contact,
      pickup_starts_at = excluded.pickup_starts_at, pickup_ends_at = excluded.pickup_ends_at,
      deliver_by = excluded.deliver_by, conditions = excluded.conditions, notes = excluded.notes
    where existing.owner_id = p_owner;
    return jsonb_build_object('run_id', target, 'entity_id', target);

  when 'run.status' then
    target := command.food_run_uuid(p_change, 'id');
    run_row := command.food_run_owned(p_owner, target, false);
    state := command.food_run_pick(p_change, 'status', array['planned','pickup','delivering','cancelled'], null);
    if state = run_row.status then
      return jsonb_build_object('run_id', target, 'entity_id', target, 'summary', jsonb_build_object('from', state, 'to', state));
    end if;
    if not ((run_row.status, state) in (
      ('planned','pickup'), ('planned','delivering'), ('planned','cancelled'),
      ('pickup','planned'), ('pickup','delivering'), ('pickup','cancelled'),
      ('delivering','pickup'), ('delivering','cancelled'),
      ('completed','delivering'), ('cancelled','planned')
    )) then
      raise exception 'A run cannot go from % to %', run_row.status, state;
    end if;
    if state in ('pickup','cancelled') and run_row.status = 'delivering'
      and exists (select 1 from command.food_run_stops where run_id = target and delivery_state = 'delivered') then
      raise exception 'Some families already have their food. Finish the run instead.';
    end if;
    update command.food_runs set
      status = state,
      started_at = case when state = 'planned' then null when state in ('pickup','delivering') then coalesce(started_at, happened) else started_at end,
      picked_up_at = case when state in ('planned','pickup') then null when state = 'delivering' then coalesce(picked_up_at, happened) else picked_up_at end,
      completed_at = case when run_row.status = 'completed' then null else completed_at end,
      cancelled_at = case when state = 'cancelled' then happened else null end,
      cancel_reason = case when state = 'cancelled' then command.food_run_txt(p_change, 'reason', 1, 280) else null end
    where id = target;
    return jsonb_build_object('run_id', target, 'entity_id', target, 'summary', jsonb_build_object('from', run_row.status, 'to', state));

  when 'run.check' then
    target := command.food_run_uuid(p_change, 'id');
    run_row := command.food_run_owned(p_owner, target);
    state := command.food_run_pick(p_change, 'check', array['checked_in','counted','cooler','thanked'], null);
    if command.food_run_bool(p_change, 'on', true) then
      update command.food_runs set pickup_checks = pickup_checks || jsonb_build_object(state, happened) where id = target;
    else
      update command.food_runs set pickup_checks = pickup_checks - state where id = target;
    end if;
    return jsonb_build_object('run_id', target, 'entity_id', target, 'summary', jsonb_build_object('check', state, 'on', command.food_run_bool(p_change, 'on', true)));

  when 'run.leftovers' then
    target := command.food_run_uuid(p_change, 'id');
    run_row := command.food_run_owned(p_owner, target);
    update command.food_runs set
      leftovers_rehomed = command.food_run_bool(p_change, 'rehomed', false),
      leftovers_note = command.food_run_txt(p_change, 'note', 1, 280)
    where id = target;
    return jsonb_build_object('run_id', target, 'entity_id', target, 'summary', jsonb_build_object('rehomed', command.food_run_bool(p_change, 'rehomed', false)));

  when 'run.complete' then
    target := command.food_run_uuid(p_change, 'id');
    return jsonb_build_object('run_id', target, 'entity_id', target, 'output', command.food_run_complete(p_owner, target, happened));

  when 'run.delete' then
    target := command.food_run_uuid(p_change, 'id');
    select * into run_row from command.food_runs where id = target and owner_id = p_owner for update;
    if run_row.id is not null then
      if run_row.is_practice then
        delete from command.food_run_households as practice_household
          using command.food_run_stops as stop
          where stop.run_id = target and stop.household_id = practice_household.id
            and practice_household.owner_id = p_owner and practice_household.is_practice;
      end if;
      delete from command.food_runs where id = target;
      delete from command.food_run_events where owner_id = p_owner and run_id = target;
    end if;
    return jsonb_build_object('run_id', target, 'entity_id', target);

  when 'item.save' then
    body := p_change->'item';
    if jsonb_typeof(body) is distinct from 'object' then raise exception 'item.save needs an item'; end if;
    target := command.food_run_uuid(body, 'id');
    run_ref := command.food_run_uuid(body, 'run_id');
    run_row := command.food_run_owned(p_owner, run_ref);
    if exists (select 1 from command.food_run_items where id = target and run_id <> run_ref) then raise exception 'Item not found'; end if;
    if not exists (select 1 from command.food_run_items where id = target)
      and (select count(*) from command.food_run_items where run_id = run_ref) >= 80 then
      raise exception 'A run can list 80 items at most';
    end if;
    tags := command.food_run_arr(body, 'contains', 16);
    if not tags <@ array['dairy','egg','gluten','peanut','tree_nut','soy','fish','shellfish','sesame','pork','beef','meat','sugar','salt','alcohol']::text[] then
      raise exception 'Unknown ingredient tag';
    end if;
    insert into command.food_run_items as existing (id, run_id, position, name, kind, unit, expected_qty, received_qty, contains, temp, note)
    values (
      target, run_ref,
      command.food_run_num(body, 'position', 0, 500, 0)::smallint,
      command.food_run_txt(body, 'name', 1, 80, true),
      command.food_run_pick(body, 'kind', array['produce','bread','dairy','eggs','meat','poultry','fish','canned','dry_goods','frozen','prepared','snacks','baby','hygiene','drinks','other'], 'other'),
      command.food_run_pick(body, 'unit', array['box','bag','item','loaf','lb','gallon','dozen','can','pack','tray','meal','bunch','jar'], 'item'),
      command.food_run_num(body, 'expected_qty', 0, 9999, 0),
      command.food_run_num(body, 'received_qty', 0, 9999, null),
      tags,
      command.food_run_pick(body, 'temp', array['shelf','chilled','frozen','hot'], 'shelf'),
      command.food_run_txt(body, 'note', 1, 200)
    )
    on conflict (id) do update set
      position = excluded.position, name = excluded.name, kind = excluded.kind, unit = excluded.unit,
      expected_qty = excluded.expected_qty, received_qty = excluded.received_qty, contains = excluded.contains,
      temp = excluded.temp, note = excluded.note;
    return jsonb_build_object('run_id', run_ref, 'entity_id', target, 'summary', jsonb_build_object('name', command.food_run_txt(body, 'name', 1, 80, true)));

  when 'item.delete' then
    target := command.food_run_uuid(p_change, 'id');
    select item.run_id into run_ref
      from command.food_run_items as item
      join command.food_runs as run on run.id = item.run_id
      where item.id = target and run.owner_id = p_owner;
    if run_ref is null then return jsonb_build_object('entity_id', target); end if;
    perform command.food_run_owned(p_owner, run_ref);
    delete from command.food_run_items where id = target;
    update command.food_run_stops set skip_item_ids = array_remove(skip_item_ids, target)
      where run_id = run_ref and target = any(skip_item_ids);
    return jsonb_build_object('run_id', run_ref, 'entity_id', target);

  when 'stop.save' then
    body := p_change->'stop';
    if jsonb_typeof(body) is distinct from 'object' then raise exception 'stop.save needs a stop'; end if;
    target := command.food_run_uuid(body, 'id');
    run_ref := command.food_run_uuid(body, 'run_id');
    run_row := command.food_run_owned(p_owner, run_ref);
    select * into stop_row from command.food_run_stops where id = target;
    if stop_row.id is not null and stop_row.run_id <> run_ref then raise exception 'Stop not found'; end if;
    if stop_row.id is null then
      if (select count(*) from command.food_run_stops where run_id = run_ref) >= 80 then
        raise exception 'A run can include 80 families at most';
      end if;
      household_ref := command.food_run_uuid(body, 'household_id', false);
    else
      household_ref := stop_row.household_id;
    end if;
    if household_ref is not null then
      select * into household from command.food_run_households where id = household_ref and owner_id = p_owner;
      if household.id is null then raise exception 'Family not found'; end if;
      if household.is_practice is distinct from run_row.is_practice then
        raise exception 'Practice runs use practice families, and real runs use your own families';
      end if;
      if exists (select 1 from command.food_run_stops where run_id = run_ref and household_id = household_ref and id <> target) then
        raise exception 'That family is already on this run';
      end if;
    end if;
    if body ? 'skip_item_ids' and jsonb_typeof(body->'skip_item_ids') not in ('array','null') then
      raise exception 'Field skip_item_ids must be a list';
    end if;
    begin
      select coalesce(array_agg(item.id order by item.id), '{}'::uuid[]) into skip_ids
        from command.food_run_items as item
        where item.run_id = run_ref and item.id in (
          select requested.value::uuid
          from jsonb_array_elements_text(coalesce(nullif(body->'skip_item_ids', 'null'::jsonb), '[]'::jsonb)) as requested(value)
        );
    exception when invalid_text_representation then
      raise exception 'Field skip_item_ids must hold item ids';
    end;
    insert into command.food_run_stops as existing (id, run_id, household_id, label, people, lang, position, bag, planned_at, skip_item_ids, note)
    values (
      target, run_ref, household_ref,
      case when household.id is not null then household.label
           else coalesce(command.food_run_txt(body, 'label', 1, 80), stop_row.label, 'A family') end,
      case when household.id is not null then (household.adults + household.kids + household.seniors)
           else coalesce(command.food_run_num(body, 'people', 1, 40, null), stop_row.people, 1) end::smallint,
      case when household.id is not null then household.language
           else command.food_run_pick(body, 'lang', array['en','es','other'], coalesce(stop_row.lang, 'en')) end,
      command.food_run_num(body, 'position', 0, 500, 0)::smallint,
      command.food_run_num(body, 'bag', 1, 99, null)::smallint,
      command.food_run_ts(body, 'planned_at'),
      skip_ids,
      command.food_run_txt(body, 'note', 1, 280)
    )
    on conflict (id) do update set
      label = excluded.label, people = excluded.people, lang = excluded.lang,
      position = excluded.position, bag = excluded.bag, planned_at = excluded.planned_at,
      skip_item_ids = excluded.skip_item_ids, note = excluded.note;
    return jsonb_build_object('run_id', run_ref, 'entity_id', target);

  when 'stop.order' then
    run_ref := command.food_run_uuid(p_change, 'run_id');
    run_row := command.food_run_owned(p_owner, run_ref);
    if jsonb_typeof(p_change->'ids') is distinct from 'array' then raise exception 'stop.order needs a list of ids'; end if;
    if jsonb_array_length(p_change->'ids') > 80 then raise exception 'Too many stops in one change'; end if;
    update command.food_run_stops as stop
      set position = ordered.spot::smallint
      from (
        select requested.value::uuid as id, requested.ordinality as spot
        from jsonb_array_elements_text(p_change->'ids') with ordinality as requested(value, ordinality)
      ) as ordered
      where stop.id = ordered.id and stop.run_id = run_ref;
    return jsonb_build_object('run_id', run_ref, 'entity_id', run_ref, 'summary', jsonb_build_object('stops', jsonb_array_length(p_change->'ids')));

  when 'stop.contact' then
    target := command.food_run_uuid(p_change, 'id');
    select stop.* into stop_row
      from command.food_run_stops as stop
      join command.food_runs as run on run.id = stop.run_id
      where stop.id = target and run.owner_id = p_owner;
    if stop_row.id is null then raise exception 'Stop not found'; end if;
    perform command.food_run_owned(p_owner, stop_row.run_id);
    state := command.food_run_pick(p_change, 'state', array['to_ask','asked','confirmed','declined','no_answer'], null);
    if state = 'declined' and stop_row.delivery_state in ('on_the_way','delivered') then
      raise exception 'This family already has their food on the way';
    end if;
    update command.food_run_stops set
      contact_state = state,
      asked_at = case when state = 'to_ask' then null else coalesce(asked_at, happened) end,
      answered_at = case when state in ('confirmed','declined','no_answer') then happened else null end,
      delivery_state = case when state = 'declined' then 'pending' else delivery_state end,
      packed_at = case when state = 'declined' then null else packed_at end,
      notified_at = case when state = 'declined' then null else notified_at end
    where id = target;
    if state <> 'to_ask' and stop_row.household_id is not null then
      update command.food_run_households set last_asked_at = happened where id = stop_row.household_id;
    end if;
    return jsonb_build_object('run_id', stop_row.run_id, 'entity_id', target, 'summary', jsonb_build_object('state', state));

  when 'stop.delivery' then
    target := command.food_run_uuid(p_change, 'id');
    select stop.* into stop_row
      from command.food_run_stops as stop
      join command.food_runs as run on run.id = stop.run_id
      where stop.id = target and run.owner_id = p_owner;
    if stop_row.id is null then raise exception 'Stop not found'; end if;
    run_row := command.food_run_owned(p_owner, stop_row.run_id);
    state := command.food_run_pick(p_change, 'state', array['pending','packed','on_the_way','delivered','missed'], null);
    if stop_row.contact_state = 'declined' and state in ('packed','on_the_way','delivered') then
      raise exception 'This family said they do not need it this time';
    end if;
    if state in ('on_the_way','delivered') and run_row.status in ('planned','pickup') then
      update command.food_runs set status = 'delivering', started_at = coalesce(started_at, happened), picked_up_at = coalesce(picked_up_at, happened)
        where id = run_row.id;
    end if;
    update command.food_run_stops set
      delivery_state = state,
      contact_state = case when state in ('on_the_way','delivered') and contact_state in ('to_ask','asked','no_answer') then 'confirmed' else contact_state end,
      asked_at = case when state in ('on_the_way','delivered') then coalesce(asked_at, happened) else asked_at end,
      answered_at = case when state in ('on_the_way','delivered') and contact_state in ('to_ask','asked','no_answer') then happened else answered_at end,
      packed_at = case when state in ('packed','on_the_way','delivered') then coalesce(packed_at, happened) else null end,
      notified_at = case when state = 'on_the_way' then coalesce(notified_at, happened) when state in ('pending','packed') then null else notified_at end,
      delivered_at = case when state = 'delivered' then coalesce(delivered_at, happened) else null end
    where id = target;
    if state = 'delivered' and stop_row.household_id is not null then
      update command.food_run_households set last_served_at = happened where id = stop_row.household_id;
    end if;
    return jsonb_build_object('run_id', stop_row.run_id, 'entity_id', target, 'summary', jsonb_build_object('state', state));

  when 'stop.intake' then
    target := command.food_run_uuid(p_change, 'id');
    select stop.* into stop_row
      from command.food_run_stops as stop
      join command.food_runs as run on run.id = stop.run_id
      where stop.id = target and run.owner_id = p_owner;
    if stop_row.id is null then raise exception 'Stop not found'; end if;
    perform command.food_run_owned(p_owner, stop_row.run_id);
    tags := command.food_run_arr(p_change, 'keys', 10);
    if not tags <@ array['size','allergies','avoids','skip','wants','kitchen','handoff','time','language','keep']::text[] then
      raise exception 'Unknown checklist question';
    end if;
    update command.food_run_stops set intake_keys = tags where id = target;
    return jsonb_build_object('run_id', stop_row.run_id, 'entity_id', target, 'summary', jsonb_build_object('answered', cardinality(tags)));

  when 'stop.delete' then
    target := command.food_run_uuid(p_change, 'id');
    select stop.run_id into run_ref
      from command.food_run_stops as stop
      join command.food_runs as run on run.id = stop.run_id
      where stop.id = target and run.owner_id = p_owner;
    if run_ref is null then return jsonb_build_object('entity_id', target); end if;
    perform command.food_run_owned(p_owner, run_ref);
    delete from command.food_run_stops where id = target;
    return jsonb_build_object('run_id', run_ref, 'entity_id', target);

  when 'portion.set' then
    run_ref := command.food_run_uuid(p_change, 'run_id');
    stop_ref := command.food_run_uuid(p_change, 'stop_id');
    item_ref := command.food_run_uuid(p_change, 'item_id');
    run_row := command.food_run_owned(p_owner, run_ref);
    if not exists (select 1 from command.food_run_stops where id = stop_ref and run_id = run_ref) then raise exception 'That family is not on this run'; end if;
    if not exists (select 1 from command.food_run_items where id = item_ref and run_id = run_ref) then raise exception 'That item is not on this run'; end if;
    qty := command.food_run_num(p_change, 'quantity', 0, 9999, 0);
    if qty = 0 then
      delete from command.food_run_portions where stop_id = stop_ref and item_id = item_ref;
    else
      insert into command.food_run_portions(run_id, stop_id, item_id, quantity, locked)
      values (run_ref, stop_ref, item_ref, qty, command.food_run_bool(p_change, 'locked', false))
      on conflict (stop_id, item_id) do update set quantity = excluded.quantity, locked = excluded.locked;
    end if;
    return jsonb_build_object('run_id', run_ref, 'entity_id', stop_ref, 'summary', jsonb_build_object('item_id', item_ref, 'quantity', qty));

  when 'portion.replace' then
    run_ref := command.food_run_uuid(p_change, 'run_id');
    run_row := command.food_run_owned(p_owner, run_ref);
    if jsonb_typeof(p_change->'portions') is distinct from 'array' then raise exception 'portion.replace needs a list of portions'; end if;
    if jsonb_array_length(p_change->'portions') > 2000 then raise exception 'Too many portions in one change'; end if;
    delete from command.food_run_portions where run_id = run_ref;
    for portion in select * from jsonb_array_elements(p_change->'portions') loop
      if jsonb_typeof(portion) <> 'object' then raise exception 'Each portion must be an object'; end if;
      qty := command.food_run_num(portion, 'quantity', 0, 9999, 0);
      continue when qty = 0;
      stop_ref := command.food_run_uuid(portion, 'stop_id');
      item_ref := command.food_run_uuid(portion, 'item_id');
      if not exists (select 1 from command.food_run_stops where id = stop_ref and run_id = run_ref) then raise exception 'A portion points at a family that is not on this run'; end if;
      if not exists (select 1 from command.food_run_items where id = item_ref and run_id = run_ref) then raise exception 'A portion points at an item that is not on this run'; end if;
      insert into command.food_run_portions(run_id, stop_id, item_id, quantity, locked)
      values (run_ref, stop_ref, item_ref, qty, command.food_run_bool(portion, 'locked', false))
      on conflict (stop_id, item_id) do update set quantity = excluded.quantity, locked = excluded.locked;
    end loop;
    return jsonb_build_object('run_id', run_ref, 'entity_id', run_ref, 'summary', jsonb_build_object('portions', jsonb_array_length(p_change->'portions')));

  when 'settings.save' then
    body := command.food_run_valid_prefs(p_change->'prefs');
    insert into command.food_run_settings as existing (owner_id, prefs) values (p_owner, body)
    on conflict (owner_id) do update set prefs = existing.prefs || excluded.prefs;
    return jsonb_build_object('summary', jsonb_build_object('keys', (select coalesce(jsonb_agg(key), '[]'::jsonb) from jsonb_object_keys(body) as key)));

  else
    raise exception 'Unknown change %', coalesce(p_op, '(none)');
  end case;
end;
$$;

-- 5. Recognition: the award plan, stamps, progress -------------------------

create or replace function command.food_run_tough_conditions(p_run_id uuid)
returns text[]
language sql
stable
security definer
set search_path = command, public
as $$
  with run as (select * from command.food_runs where id = p_run_id)
  select coalesce(array(
    select condition from (
      select unnest(run.conditions) as condition from run
      union
      select 'early_window' from run where extract(hour from run.pickup_starts_at at time zone 'America/Chicago') < 8
      union
      select 'late_window' from run where (run.pickup_ends_at at time zone 'America/Chicago')::time > time '19:00'
      union
      select 'tight_window' from run where run.pickup_ends_at - run.pickup_starts_at <= interval '30 minutes'
      union
      select 'big_run' from run where (select count(*) from command.food_run_stops as stop where stop.run_id = run.id and stop.delivery_state = 'delivered') >= 6
      union
      select 'cold_chain' from run where exists (
        select 1 from command.food_run_items as item
        where item.run_id = run.id and item.temp in ('chilled','frozen') and coalesce(item.received_qty, item.expected_qty) > 0
      )
    ) as conditions
    order by condition collate "C"
  ), '{}'::text[]);
$$;

create or replace function command.food_run_award_plan(p_run_id uuid)
returns table (component text, stop_id uuid, event_type text, seeds integer)
language plpgsql
stable
security definer
set search_path = command, public
as $$
declare
  run command.food_runs;
  rules command.food_run_rules;
  delivered_count integer;
  leftover numeric;
  hauled numeric;
  condition text;
  tough_total integer := 0;
  give integer;
begin
  select * into run from command.food_runs where id = p_run_id;
  select * into rules from command.food_run_rules where id;
  if run.id is null then return; end if;

  return query
    select 'ask'::text, stop.id, 'reliability_positive'::text, rules.seeds_ask::integer
    from command.food_run_stops as stop
    where stop.run_id = run.id and stop.contact_state <> 'to_ask' and rules.seeds_ask > 0
    order by stop.position, stop.created_at, stop.id;

  return query
    select 'intake'::text, stop.id, 'reliability_positive'::text, rules.seeds_intake::integer
    from command.food_run_stops as stop
    where stop.run_id = run.id and cardinality(stop.intake_keys) >= rules.intake_threshold and rules.seeds_intake > 0
    order by stop.position, stop.created_at, stop.id;

  if run.picked_up_at is not null and rules.seeds_pickup > 0 then
    return query select 'pickup'::text, null::uuid, 'delivery_completed'::text, rules.seeds_pickup::integer;
  end if;

  return query
    select 'delivered'::text, stop.id, 'delivery_completed'::text, rules.seeds_delivered::integer
    from command.food_run_stops as stop
    where stop.run_id = run.id and stop.delivery_state = 'delivered' and rules.seeds_delivered > 0
    order by stop.position, stop.created_at, stop.id;

  select count(*) into delivered_count from command.food_run_stops as stop where stop.run_id = run.id and stop.delivery_state = 'delivered';

  if delivered_count > 0 and rules.seeds_full_circle > 0 and not exists (
    select 1 from command.food_run_stops as stop
    where stop.run_id = run.id and stop.contact_state = 'confirmed' and stop.delivery_state <> 'delivered'
  ) then
    return query select 'full_circle'::text, null::uuid, 'mission_bonus'::text, rules.seeds_full_circle::integer;
  end if;

  select coalesce(sum(coalesce(item.received_qty, item.expected_qty)), 0),
         coalesce(sum(greatest(coalesce(item.received_qty, item.expected_qty) - coalesce((
           select sum(portion.quantity)
           from command.food_run_portions as portion
           join command.food_run_stops as stop on stop.id = portion.stop_id
           where portion.item_id = item.id and stop.delivery_state = 'delivered'
         ), 0), 0)), 0)
    into hauled, leftover
    from command.food_run_items as item
    where item.run_id = run.id;

  if delivered_count > 0 and hauled > 0 and rules.seeds_no_waste > 0 and (run.leftovers_rehomed or leftover = 0) then
    return query select 'no_waste'::text, null::uuid, 'waste_prevented'::text, rules.seeds_no_waste::integer;
  end if;

  -- The tough-window bonus and the finish seeds need at least one family fed.
  if delivered_count > 0 then
    foreach condition in array command.food_run_tough_conditions(run.id) loop
      give := least(rules.seeds_tough_each, rules.seeds_tough_cap - tough_total);
      exit when give <= 0;
      tough_total := tough_total + give;
      return query select ('tough:' || condition)::text, null::uuid, 'mission_bonus'::text, give;
    end loop;
    if rules.seeds_complete > 0 then
      return query select 'complete'::text, null::uuid, 'delivery_completed'::text, rules.seeds_complete::integer;
    end if;
  end if;
end;
$$;

create or replace function command.food_run_award(p_run_id uuid, p_participant uuid)
returns integer
language plpgsql
security definer
set search_path = command, public
as $$
declare
  component record;
  finished timestamptz;
  awarded integer := 0;
begin
  select completed_at into finished from command.food_runs where id = p_run_id;
  for component in select * from command.food_run_award_plan(p_run_id) loop
    insert into command.food_reputation_ledger(
      participant_id, event_type, recognition_points, evidence_type, evidence_id, context, actor_principal, idempotency_key
    ) values (
      p_participant, component.event_type, component.seeds, 'food_run', p_run_id,
      jsonb_build_object('component', component.component, 'stop_id', component.stop_id, 'completed_at', finished),
      'runner:' || coalesce(auth.uid()::text, 'system'),
      'food-run:' || p_run_id || ':' || component.component || coalesce(':' || component.stop_id::text, '')
    )
    on conflict (idempotency_key) do nothing;
    if found then awarded := awarded + component.seeds; end if;
  end loop;
  return awarded;
end;
$$;

create or replace function command.food_run_award_stamps(p_run_id uuid, p_participant uuid, p_owner uuid)
returns text[]
language plpgsql
security definer
set search_path = command, public
as $$
declare
  rules command.food_run_rules;
  run command.food_runs;
  components text[];
  tough text[];
  candidates text[] := '{}';
  slug text;
  awarded text[] := '{}';
  completed_runs integer;
begin
  select * into rules from command.food_run_rules where id;
  if not rules.stamps_enabled then return awarded; end if;
  select * into run from command.food_runs where id = p_run_id and owner_id = p_owner;
  if run.id is null or run.status <> 'completed' or run.is_practice then return awarded; end if;

  select coalesce(array_agg(plan.component), '{}') into components from command.food_run_award_plan(p_run_id) as plan;
  if not 'complete' = any(components) then return awarded; end if;
  tough := command.food_run_tough_conditions(p_run_id);
  select count(*) into completed_runs from command.food_runs as done
    where done.owner_id = p_owner and done.status = 'completed' and not done.is_practice
      and exists (select 1 from command.food_run_stops as stop where stop.run_id = done.id and stop.delivery_state = 'delivered');

  if completed_runs >= 1 then candidates := candidates || 'first-run'::text; end if;
  if completed_runs >= 5 then candidates := candidates || 'five-runs'::text; end if;
  if 'full_circle' = any(components) then candidates := candidates || 'full-circle'::text; end if;
  if 'no_waste' = any(components) then candidates := candidates || 'zero-waste'::text; end if;
  if 'early_window' = any(tough) then candidates := candidates || 'early-bird'::text; end if;
  if 'tight_window' = any(tough) then candidates := candidates || 'tight-window'::text; end if;
  if tough && array['heat','rain','cold_snap']::text[] then candidates := candidates || 'rain-or-shine'::text; end if;
  if 'late_window' = any(tough) or exists (
    select 1 from command.food_run_stops as stop
    where stop.run_id = run.id and stop.delivery_state = 'delivered'
      and extract(hour from stop.delivered_at at time zone 'America/Chicago') >= 20
  ) then candidates := candidates || 'night-owl'::text; end if;
  if exists (select 1 from command.food_run_stops as stop where stop.run_id = run.id and stop.delivery_state = 'delivered' and stop.lang = 'es') then
    candidates := candidates || 'bilingual'::text;
  end if;
  if (
    select count(distinct coalesce(stop.household_id::text, stop.id::text))
    from command.food_run_stops as stop
    join command.food_runs as owned on owned.id = stop.run_id
    where owned.owner_id = p_owner and not owned.is_practice and cardinality(stop.intake_keys) >= rules.intake_threshold
  ) >= 5 then candidates := candidates || 'listener'::text; end if;
  if (
    select count(distinct coalesce(stop.household_id::text, stop.id::text))
    from command.food_run_stops as stop
    join command.food_runs as owned on owned.id = stop.run_id
    where owned.owner_id = p_owner and not owned.is_practice and stop.delivery_state = 'delivered'
  ) >= 10 then candidates := candidates || 'ten-families'::text; end if;
  if 'cold_chain' = any(tough) and run.picked_up_at is not null
    and exists (
      select 1 from command.food_run_stops as stop
      join command.food_run_portions as portion on portion.stop_id = stop.id
      join command.food_run_items as item on item.id = portion.item_id
      where stop.run_id = run.id and stop.delivery_state = 'delivered' and item.temp in ('chilled','frozen')
    )
    and not exists (
      select 1 from command.food_run_stops as stop
      join command.food_run_portions as portion on portion.stop_id = stop.id
      join command.food_run_items as item on item.id = portion.item_id
      where stop.run_id = run.id and item.temp in ('chilled','frozen')
        and stop.contact_state <> 'declined'
        and (stop.delivery_state <> 'delivered' or stop.delivered_at > run.picked_up_at + interval '2 hours')
    ) then candidates := candidates || 'cold-keeper'::text; end if;

  foreach slug in array candidates loop
    insert into command.food_mission_stamps(participant_id, stamp_slug, evidence_id)
    values (p_participant, slug, p_run_id)
    on conflict (participant_id, stamp_slug) do nothing;
    if found then
      awarded := awarded || slug;
      if rules.seeds_stamp > 0 then
        insert into command.food_reputation_ledger(
          participant_id, event_type, recognition_points, evidence_type, evidence_id, context, actor_principal, idempotency_key
        ) values (
          p_participant, 'mission_bonus', rules.seeds_stamp, 'food_run', p_run_id,
          jsonb_build_object('component', 'stamp:' || slug), 'runner:' || coalesce(auth.uid()::text, 'system'),
          'stamp:' || p_participant || ':' || slug
        )
        on conflict (idempotency_key) do nothing;
      end if;
    end if;
  end loop;
  return awarded;
end;
$$;

-- Seeds and the breakdown shown on a finished run come from the ledger itself.
create or replace function command.food_run_refresh_awards(p_run_id uuid, p_participant uuid)
returns integer
language plpgsql
security definer
set search_path = command, public
as $$
declare total integer;
begin
  select coalesce(sum(recognition_points), 0) into total
    from command.food_reputation_ledger
    where participant_id = p_participant and evidence_type = 'food_run' and evidence_id = p_run_id;
  update command.food_runs set
    seeds_awarded = total,
    awards = coalesce((
      select jsonb_agg(jsonb_build_object('component', entry.context->>'component', 'stop_id', entry.context->>'stop_id', 'seeds', entry.recognition_points) order by entry.created_at, entry.idempotency_key)
      from command.food_reputation_ledger as entry
      where entry.participant_id = p_participant and entry.evidence_type = 'food_run' and entry.evidence_id = p_run_id
    ), '[]'::jsonb)
  where id = p_run_id;
  return total;
end;
$$;

create or replace function command.food_mission_progress_for(p_owner uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = command, public
as $$
declare
  participant uuid;
  enrollment command.food_mission_enrollments;
  effective_status text := null;
  seeds integer := 0;
  level_name text;
  level_floor integer;
  next_name text;
  next_floor integer;
  current_week date := date_trunc('week', now() at time zone 'America/Chicago')::date;
  finished timestamp[] := '{}';
  active_weeks date[] := '{}';
  paused_weeks date[] := '{}';
  week date;
  streak integer := 0;
  longest integer := 0;
  bank integer := 0;
  since_bank integer := 0;
  week_state text;
  history jsonb := '[]'::jsonb;
  this_week integer := 0;
  days jsonb;
begin
  select id into participant from command.food_participants where profile_id = p_owner;
  if participant is not null then
    select * into enrollment from command.food_mission_enrollments where participant_id = participant;
    select coalesce(sum(recognition_points), 0) into seeds from command.food_reputation_ledger where participant_id = participant;
    -- Finished runs as the ledger recorded them, in Austin local time.
    select coalesce(array_agg((entry.context->>'completed_at')::timestamptz at time zone 'America/Chicago'), '{}') into finished
      from command.food_reputation_ledger as entry
      where entry.participant_id = participant and entry.evidence_type = 'food_run'
        and entry.context->>'component' = 'complete' and entry.context->>'completed_at' is not null;
    select coalesce(array_agg(distinct pause_week::date), '{}') into paused_weeks
      from command.food_mission_pauses as pause,
        lateral generate_series(
          date_trunc('week', pause.paused_at at time zone 'America/Chicago'),
          date_trunc('week', coalesce(pause.resumed_at, least(now(), coalesce(enrollment.paused_until, now()))) at time zone 'America/Chicago'),
          interval '1 week'
        ) as pause_week
      where pause.participant_id = participant;
  end if;
  if enrollment.participant_id is not null then
    effective_status := case
      when enrollment.status = 'paused' and enrollment.paused_until is not null and enrollment.paused_until <= now() then 'active'
      else enrollment.status
    end;
  end if;

  select ladder.rung, ladder.at_seeds into level_name, level_floor
    from (values ('seed', 0), ('sprout', 50), ('vine', 150), ('bloom', 400), ('harvest', 900), ('perennial', 2000)) as ladder(rung, at_seeds)
    where ladder.at_seeds <= seeds order by ladder.at_seeds desc limit 1;
  select ladder.rung, ladder.at_seeds into next_name, next_floor
    from (values ('seed', 0), ('sprout', 50), ('vine', 150), ('bloom', 400), ('harvest', 900), ('perennial', 2000)) as ladder(rung, at_seeds)
    where ladder.at_seeds > seeds order by ladder.at_seeds asc limit 1;

  select coalesce(array_agg(run_week order by run_week), '{}') into active_weeks
    from (select distinct date_trunc('week', moment)::date as run_week from unnest(finished) as moment) as weeks;

  if cardinality(active_weeks) > 0 then
    week := active_weeks[1];
    while week < current_week loop
      if week = any(active_weeks) then
        streak := streak + 1;
        since_bank := since_bank + 1;
        if since_bank = 4 then bank := least(2, bank + 1); since_bank := 0; end if;
        longest := greatest(longest, streak);
        week_state := 'active';
      elsif week = any(paused_weeks) then
        week_state := 'paused';
      elsif bank > 0 then
        bank := bank - 1;
        week_state := 'rest';
      else
        streak := 0;
        since_bank := 0;
        week_state := 'missed';
      end if;
      history := history || jsonb_build_object('week', week, 'state', week_state);
      week := week + 7;
    end loop;
  end if;
  if current_week = any(active_weeks) then
    streak := streak + 1;
    since_bank := since_bank + 1;
    if since_bank = 4 then bank := least(2, bank + 1); since_bank := 0; end if;
    longest := greatest(longest, streak);
    week_state := 'active';
  elsif current_week = any(paused_weeks) or effective_status = 'paused' then
    week_state := 'paused';
  else
    week_state := 'current';
  end if;
  history := history || jsonb_build_object('week', current_week, 'state', week_state);
  if jsonb_array_length(history) > 8 then
    history := (select jsonb_agg(entries.element order by entries.idx) from jsonb_array_elements(history) with ordinality as entries(element, idx) where entries.idx > jsonb_array_length(history) - 8);
  end if;

  select count(*) into this_week from unnest(finished) as moment where moment::date >= current_week;
  select jsonb_agg(exists (select 1 from unnest(finished) as moment where moment::date = current_week + offset_days) order by offset_days)
    into days
    from generate_series(0, 6) as offset_days;

  return jsonb_build_object(
    'enrolled', effective_status is not null and effective_status <> 'left',
    'status', coalesce(effective_status, 'none'),
    'rhythm_goal', coalesce(enrollment.rhythm_goal, 2),
    'paused_until', case when effective_status = 'paused' then enrollment.paused_until else null end,
    'seeds', seeds,
    'level', level_name,
    'level_floor', level_floor,
    'next_level', next_name,
    'next_at', next_floor,
    'rhythm_weeks', streak,
    'longest_rhythm', longest,
    'rest_weeks', bank,
    'this_week', this_week,
    'days', days,
    'history', history,
    'stamps', coalesce((
      select jsonb_agg(jsonb_build_object('slug', stamp.stamp_slug, 'awarded_at', stamp.awarded_at) order by stamp.awarded_at, stamp.stamp_slug)
      from command.food_mission_stamps as stamp where stamp.participant_id = participant
    ), '[]'::jsonb),
    'runs_completed', (select count(*) from command.food_runs where owner_id = p_owner and status = 'completed' and not is_practice),
    'families_served', (
      select count(distinct coalesce(stop.household_id::text, stop.id::text))
      from command.food_run_stops as stop join command.food_runs as run on run.id = stop.run_id
      where run.owner_id = p_owner and not run.is_practice and stop.delivery_state = 'delivered'
    )
  );
end;
$$;

-- Finishing a run: mark it done, plant seeds and stamps for people who opted
-- in, and forget the families that asked to be kept only for this run.
create or replace function command.food_run_complete(p_owner uuid, p_run_id uuid, p_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = command, public
as $$
declare
  run command.food_runs;
  participant uuid;
  enrolled boolean := false;
  seeds_new integer := 0;
  seeds_before integer := 0;
  stamps_new text[] := '{}';
  seeds_run integer := 0;
  breakdown jsonb;
  forgotten uuid;
begin
  select * into run from command.food_runs where id = p_run_id and owner_id = p_owner for update;
  if run.id is null then raise exception 'Run not found'; end if;
  if run.status = 'cancelled' then raise exception 'This run was cancelled. Restore it before finishing.'; end if;
  if run.status <> 'completed' then
    if run.picked_up_at is null then raise exception 'Mark the pickup done before finishing the run'; end if;
    update command.food_runs set status = 'completed', completed_at = greatest(p_at, run.picked_up_at) where id = run.id returning * into run;
  end if;

  select id into participant from command.food_participants where profile_id = p_owner;
  if participant is not null then perform command.food_mission_settle(participant); end if;
  enrolled := participant is not null and exists (
    select 1 from command.food_mission_enrollments where participant_id = participant and status <> 'left'
  );
  if enrolled and not run.is_practice then
    select coalesce(sum(recognition_points), 0) into seeds_before
      from command.food_reputation_ledger
      where participant_id = participant and evidence_type = 'food_run' and evidence_id = run.id;
    perform command.food_run_award(run.id, participant);
    stamps_new := command.food_run_award_stamps(run.id, participant, p_owner);
    seeds_run := command.food_run_refresh_awards(run.id, participant);
    -- Everything this finish planted: the run's own seeds and any new stamps.
    seeds_new := seeds_run - seeds_before;
    select awards into breakdown from command.food_runs where id = run.id;
  else
    select coalesce(jsonb_agg(jsonb_build_object('component', plan.component, 'stop_id', plan.stop_id, 'seeds', plan.seeds)), '[]'::jsonb)
      into breakdown from command.food_run_award_plan(run.id) as plan;
    update command.food_runs set awards = breakdown where id = run.id;
  end if;

  for forgotten in
    select stop.household_id from command.food_run_stops as stop
    join command.food_run_households as household on household.id = stop.household_id
    where stop.run_id = run.id and not household.keep_info
  loop
    if command.food_run_forget_household(p_owner, forgotten) then
      insert into command.food_run_events(owner_id, op, entity_id, summary, idempotency_key, occurred_at)
      values (p_owner, 'household.forget', forgotten, jsonb_build_object('reason', 'one_run'), 'forget:' || forgotten, p_at)
      on conflict (owner_id, idempotency_key) do nothing;
    end if;
  end loop;

  return jsonb_build_object(
    'run_id', run.id,
    'practice', run.is_practice,
    'enrolled', enrolled,
    'seeds_new', seeds_new,
    'seeds_run', seeds_run,
    'breakdown', coalesce(breakdown, '[]'::jsonb),
    'stamps_new', to_jsonb(stamps_new),
    'progress', command.food_mission_progress_for(p_owner)
  );
end;
$$;

-- 6. Member commands --------------------------------------------------------

create or replace function command.get_food_run_circle_week()
returns jsonb
language sql
stable
security definer
set search_path = command, public
as $$
  with week as (select date_trunc('week', now() at time zone 'America/Chicago')::date as start),
  finished as (
    select run.id from command.food_runs as run, week
    where run.status = 'completed' and not run.is_practice
      and (run.completed_at at time zone 'America/Chicago')::date >= week.start
  ),
  served as (
    select stop.people from command.food_run_stops as stop join finished on finished.id = stop.run_id
    where stop.delivery_state = 'delivered'
  )
  select jsonb_build_object(
    'week_start', (select start from week),
    'runs_completed', (select count(*) from finished),
    'families_reached', (select count(*) from served),
    'people_fed', (select coalesce(sum(people), 0) from served),
    'goal', (select circle_goal from command.food_run_rules where id)
  );
$$;

create or replace function command.get_food_run_board()
returns jsonb
language plpgsql
stable
security definer
set search_path = command, public
as $$
declare
  owner uuid := auth.uid();
  run_ids uuid[];
begin
  if owner is null then raise exception 'Sign in to see your runs'; end if;
  select coalesce(array_agg(id), '{}') into run_ids from (
    select id from command.food_runs where owner_id = owner and status in ('planned','pickup','delivering')
    union all
    (select id from command.food_runs where owner_id = owner and status in ('completed','cancelled')
      order by coalesce(completed_at, cancelled_at, updated_at) desc limit 40)
  ) as chosen;
  return jsonb_build_object(
    'households', coalesce((select jsonb_agg(to_jsonb(household) - 'owner_id' order by lower(household.label), household.id) from command.food_run_households as household where household.owner_id = owner), '[]'::jsonb),
    'runs', coalesce((select jsonb_agg(to_jsonb(run) - 'owner_id' order by run.pickup_starts_at desc, run.id) from command.food_runs as run where run.id = any(run_ids)), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(to_jsonb(item) order by item.run_id, item.position, item.created_at, item.id) from command.food_run_items as item where item.run_id = any(run_ids)), '[]'::jsonb),
    'stops', coalesce((select jsonb_agg(to_jsonb(stop) order by stop.run_id, stop.position, stop.created_at, stop.id) from command.food_run_stops as stop where stop.run_id = any(run_ids)), '[]'::jsonb),
    'portions', coalesce((select jsonb_agg(to_jsonb(portion) order by portion.stop_id, portion.item_id) from command.food_run_portions as portion where portion.run_id = any(run_ids)), '[]'::jsonb),
    'settings', coalesce((select prefs from command.food_run_settings where owner_id = owner), '{}'::jsonb),
    'rules', (select to_jsonb(rules) - 'id' - 'updated_by' from command.food_run_rules as rules where rules.id),
    'progress', command.food_mission_progress_for(owner),
    'circle', command.get_food_run_circle_week(),
    'server_time', now()
  );
end;
$$;

create or replace function command.get_food_run(p_run_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = command, public
as $$
declare
  owner uuid := auth.uid();
  run command.food_runs;
begin
  if owner is null then raise exception 'Sign in to see your runs'; end if;
  select * into run from command.food_runs where id = p_run_id and owner_id = owner;
  if run.id is null then raise exception 'Run not found'; end if;
  return jsonb_build_object(
    'run', to_jsonb(run) - 'owner_id',
    'items', coalesce((select jsonb_agg(to_jsonb(item) order by item.position, item.created_at, item.id) from command.food_run_items as item where item.run_id = run.id), '[]'::jsonb),
    'stops', coalesce((select jsonb_agg(to_jsonb(stop) order by stop.position, stop.created_at, stop.id) from command.food_run_stops as stop where stop.run_id = run.id), '[]'::jsonb),
    'portions', coalesce((select jsonb_agg(to_jsonb(portion) order by portion.stop_id, portion.item_id) from command.food_run_portions as portion where portion.run_id = run.id), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('created_at', recent.occurred_at, 'op', recent.op, 'entity_id', recent.entity_id, 'summary', recent.summary) order by recent.occurred_at desc, recent.id desc)
      from (select * from command.food_run_events where owner_id = owner and run_id = run.id order by occurred_at desc, id desc limit 200) as recent
    ), '[]'::jsonb)
  );
end;
$$;

-- The one write path. Changes apply in order. A change the server refuses
-- (bad input, a finished run) is reported in "failed" and does not block the
-- rest, so one mistake can never jam a phone's offline queue.
create or replace function command.apply_food_run_changes(p_changes jsonb, p_return_board boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = command, public
as $$
declare
  owner uuid := auth.uid();
  change jsonb;
  change_key text;
  change_op text;
  result jsonb;
  applied integer := 0;
  replayed integer := 0;
  failed jsonb := '[]'::jsonb;
  outputs jsonb := '{}'::jsonb;
begin
  if owner is null then raise exception 'Sign in to save your runs'; end if;
  if jsonb_typeof(p_changes) is distinct from 'array' then raise exception 'Changes must be a list'; end if;
  if jsonb_array_length(p_changes) > 100 then raise exception 'Send at most 100 changes at a time'; end if;
  for change in select entry.value from jsonb_array_elements(p_changes) with ordinality as entry(value, spot) order by entry.spot loop
    if jsonb_typeof(change) <> 'object' then raise exception 'Each change must be an object'; end if;
    change_key := change->>'key';
    change_op := change->>'op';
    if change_key is null or char_length(change_key) not between 8 and 120 then raise exception 'Each change needs a key of 8 to 120 characters'; end if;
    if change_op is null or char_length(change_op) not between 3 and 40 then raise exception 'Each change needs an op'; end if;
    if exists (select 1 from command.food_run_events where owner_id = owner and idempotency_key = change_key) then
      replayed := replayed + 1;
      continue;
    end if;
    begin
      result := command.food_run_apply_op(owner, change_op, change);
      insert into command.food_run_events(owner_id, run_id, op, entity_id, summary, idempotency_key, occurred_at)
      values (owner, (result->>'run_id')::uuid, change_op, (result->>'entity_id')::uuid, coalesce(result->'summary', '{}'::jsonb), change_key, command.food_run_at(change));
      if result ? 'output' then outputs := outputs || jsonb_build_object(change_key, result->'output'); end if;
      applied := applied + 1;
    exception when raise_exception or integrity_constraint_violation or data_exception then
      failed := failed || jsonb_build_object('key', change_key, 'op', change_op, 'error', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('applied', applied, 'replayed', replayed, 'failed', failed, 'outputs', outputs)
    || case when p_return_board then jsonb_build_object('board', command.get_food_run_board()) else '{}'::jsonb end;
end;
$$;

create or replace function command.enroll_food_mission(p_rhythm_goal smallint default 2)
returns jsonb
language plpgsql
security definer
set search_path = command, public
as $$
declare
  owner uuid := auth.uid();
  participant uuid;
  finished record;
begin
  if owner is null then raise exception 'Sign in to keep score'; end if;
  if p_rhythm_goal is null or p_rhythm_goal not between 1 and 3 then raise exception 'Pick a weekly goal of 1, 2, or 3'; end if;
  participant := command.food_run_participant_id();
  insert into command.food_mission_enrollments(participant_id, status, routes, rhythm_goal, consent_version)
  values (participant, 'active', array['move']::text[], p_rhythm_goal, 'mission-runs-2026-09')
  on conflict (participant_id) do update set
    status = 'active', rhythm_goal = excluded.rhythm_goal, paused_until = null, left_at = null,
    consent_version = excluded.consent_version;
  update command.food_mission_pauses set resumed_at = greatest(now(), paused_at) where participant_id = participant and resumed_at is null;
  -- Runs finished before opting in count once.
  for finished in
    select id from command.food_runs where owner_id = owner and status = 'completed' and not is_practice order by completed_at, id
  loop
    perform command.food_run_award(finished.id, participant);
    perform command.food_run_award_stamps(finished.id, participant, owner);
    perform command.food_run_refresh_awards(finished.id, participant);
  end loop;
  return command.food_mission_progress_for(owner);
end;
$$;

create or replace function command.set_food_mission_status(p_status text, p_until timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = command, public
as $$
declare
  owner uuid := auth.uid();
  participant uuid;
  enrollment command.food_mission_enrollments;
  until_at timestamptz;
begin
  if owner is null then raise exception 'Sign in first'; end if;
  select id into participant from command.food_participants where profile_id = owner;
  if participant is not null then
    perform command.food_mission_settle(participant);
    select * into enrollment from command.food_mission_enrollments where participant_id = participant for update;
  end if;
  if enrollment.participant_id is null then raise exception 'Opt in before pausing'; end if;
  if p_status = 'paused' then
    if enrollment.status = 'left' then raise exception 'Opt in again before pausing'; end if;
    until_at := coalesce(p_until, now() + interval '14 days');
    if until_at < now() + interval '1 day' or until_at > now() + interval '90 days' then raise exception 'Pause for 1 to 90 days'; end if;
    update command.food_mission_enrollments set status = 'paused', paused_until = until_at where participant_id = participant;
    insert into command.food_mission_pauses(participant_id) values (participant) on conflict do nothing;
  elsif p_status = 'active' then
    if enrollment.status = 'left' then raise exception 'Opt in again to come back'; end if;
    update command.food_mission_enrollments set status = 'active', paused_until = null where participant_id = participant;
    update command.food_mission_pauses set resumed_at = greatest(now(), paused_at) where participant_id = participant and resumed_at is null;
  elsif p_status = 'left' then
    update command.food_mission_enrollments set status = 'left', left_at = now(), paused_until = null where participant_id = participant;
    update command.food_mission_pauses set resumed_at = greatest(now(), paused_at) where participant_id = participant and resumed_at is null;
  else
    raise exception 'Status must be active, paused, or left';
  end if;
  return command.food_mission_progress_for(owner);
end;
$$;

create or replace function command.set_food_mission_goal(p_goal smallint)
returns jsonb
language plpgsql
security definer
set search_path = command, public
as $$
declare
  owner uuid := auth.uid();
  participant uuid;
begin
  if owner is null then raise exception 'Sign in first'; end if;
  if p_goal is null or p_goal not between 1 and 3 then raise exception 'Pick a weekly goal of 1, 2, or 3'; end if;
  select id into participant from command.food_participants where profile_id = owner;
  if participant is not null then perform command.food_mission_settle(participant); end if;
  update command.food_mission_enrollments set rhythm_goal = p_goal where participant_id = participant and status <> 'left';
  if not found then raise exception 'Opt in before setting a goal'; end if;
  return command.food_mission_progress_for(owner);
end;
$$;

create or replace function command.get_food_mission_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = command, public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  return command.food_mission_progress_for(auth.uid());
end;
$$;

-- 7. Coordinator and worker commands ----------------------------------------

create or replace function command.set_food_run_rules(p_rules jsonb)
returns jsonb
language plpgsql
security definer
set search_path = command, public
as $$
declare
  rules command.food_run_rules;
  entry record;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Only coordinators can change recognition rules'; end if;
  if jsonb_typeof(p_rules) is distinct from 'object' then raise exception 'Rules must be an object'; end if;
  for entry in select * from jsonb_each(p_rules) loop
    if entry.key not in ('seeds_ask','seeds_intake','seeds_pickup','seeds_delivered','seeds_full_circle','seeds_no_waste','seeds_tough_each','seeds_tough_cap','seeds_complete','seeds_stamp','intake_threshold','circle_goal','stamps_enabled') then
      raise exception 'Unknown rule %', entry.key;
    end if;
  end loop;
  select * into rules from command.food_run_rules where id for update;
  update command.food_run_rules set
    seeds_ask = coalesce(command.food_run_num(p_rules, 'seeds_ask', 0, 100, null), rules.seeds_ask)::smallint,
    seeds_intake = coalesce(command.food_run_num(p_rules, 'seeds_intake', 0, 100, null), rules.seeds_intake)::smallint,
    seeds_pickup = coalesce(command.food_run_num(p_rules, 'seeds_pickup', 0, 100, null), rules.seeds_pickup)::smallint,
    seeds_delivered = coalesce(command.food_run_num(p_rules, 'seeds_delivered', 0, 100, null), rules.seeds_delivered)::smallint,
    seeds_full_circle = coalesce(command.food_run_num(p_rules, 'seeds_full_circle', 0, 100, null), rules.seeds_full_circle)::smallint,
    seeds_no_waste = coalesce(command.food_run_num(p_rules, 'seeds_no_waste', 0, 100, null), rules.seeds_no_waste)::smallint,
    seeds_tough_each = coalesce(command.food_run_num(p_rules, 'seeds_tough_each', 0, 100, null), rules.seeds_tough_each)::smallint,
    seeds_tough_cap = coalesce(command.food_run_num(p_rules, 'seeds_tough_cap', 0, 200, null), rules.seeds_tough_cap)::smallint,
    seeds_complete = coalesce(command.food_run_num(p_rules, 'seeds_complete', 0, 100, null), rules.seeds_complete)::smallint,
    seeds_stamp = coalesce(command.food_run_num(p_rules, 'seeds_stamp', 0, 100, null), rules.seeds_stamp)::smallint,
    intake_threshold = coalesce(command.food_run_num(p_rules, 'intake_threshold', 1, 10, null), rules.intake_threshold)::smallint,
    circle_goal = coalesce(command.food_run_num(p_rules, 'circle_goal', 1, 100000, null), rules.circle_goal)::integer,
    stamps_enabled = coalesce(command.food_run_bool(p_rules, 'stamps_enabled', null), rules.stamps_enabled),
    updated_by = auth.uid()
  where id
  returning * into rules;
  return to_jsonb(rules) - 'id' - 'updated_by';
end;
$$;

create or replace function command.get_food_run_network(p_weeks integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = command, public
as $$
declare
  current_week date := date_trunc('week', now() at time zone 'America/Chicago')::date;
  span integer := least(greatest(coalesce(p_weeks, 8), 1), 26);
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Only coordinators can see network totals'; end if;
  return jsonb_build_object(
    'rules', (select to_jsonb(rules) - 'id' - 'updated_by' from command.food_run_rules as rules where rules.id),
    'enrolled', (select count(*) from command.food_mission_enrollments where status in ('active','paused')),
    'runners_this_week', (
      select count(distinct owner_id) from command.food_runs
      where status = 'completed' and not is_practice and (completed_at at time zone 'America/Chicago')::date >= current_week
    ),
    'open_runs', (select count(*) from command.food_runs where status in ('planned','pickup','delivering') and not is_practice),
    'weeks', (
      select jsonb_agg(jsonb_build_object(
        'week_start', week_start,
        'runs', (select count(*) from command.food_runs as run where run.status = 'completed' and not run.is_practice and date_trunc('week', run.completed_at at time zone 'America/Chicago')::date = week_start),
        'tough_runs', (select count(*) from command.food_runs as run where run.status = 'completed' and not run.is_practice and date_trunc('week', run.completed_at at time zone 'America/Chicago')::date = week_start and cardinality(command.food_run_tough_conditions(run.id)) > 0),
        'families', (select count(*) from command.food_run_stops as stop join command.food_runs as run on run.id = stop.run_id where run.status = 'completed' and not run.is_practice and stop.delivery_state = 'delivered' and date_trunc('week', run.completed_at at time zone 'America/Chicago')::date = week_start),
        'people', (select coalesce(sum(stop.people), 0) from command.food_run_stops as stop join command.food_runs as run on run.id = stop.run_id where run.status = 'completed' and not run.is_practice and stop.delivery_state = 'delivered' and date_trunc('week', run.completed_at at time zone 'America/Chicago')::date = week_start),
        'seeds', (select coalesce(sum(entry.recognition_points), 0) from command.food_reputation_ledger as entry where entry.evidence_type = 'food_run' and date_trunc('week', entry.created_at at time zone 'America/Chicago')::date = week_start)
      ) order by week_start)
      from (select (current_week - (offset_weeks * 7))::date as week_start from generate_series(0, span - 1) as offset_weeks) as weeks
    )
  );
end;
$$;

-- Old receipts are only needed while a phone might still replay them.
-- Tombstones for deleted runs and forgotten families are kept.
create or replace function command.prune_food_run_events(p_keep interval default interval '180 days')
returns integer
language plpgsql
security definer
set search_path = command, public
as $$
declare removed integer;
begin
  if not command.is_food_worker_caller() then raise exception 'Only the yuhm worker can prune receipts'; end if;
  if p_keep < interval '120 days' then raise exception 'Keep receipts for at least 120 days'; end if;
  delete from command.food_run_events
    where created_at < now() - p_keep and op not in ('household.forget', 'run.delete');
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- 8. Privileges --------------------------------------------------------------

revoke all on table
  command.food_run_households, command.food_runs, command.food_run_items, command.food_run_stops,
  command.food_run_portions, command.food_run_settings, command.food_run_events, command.food_run_rules,
  command.food_mission_enrollments, command.food_mission_pauses, command.food_mission_stamps
from anon, authenticated;

grant select on table
  command.food_run_households, command.food_runs, command.food_run_items, command.food_run_stops,
  command.food_run_portions, command.food_run_settings, command.food_run_events,
  command.food_mission_enrollments, command.food_mission_pauses, command.food_mission_stamps
to authenticated;
grant select on table command.food_run_rules to anon, authenticated;

grant all on table
  command.food_run_households, command.food_runs, command.food_run_items, command.food_run_stops,
  command.food_run_portions, command.food_run_settings, command.food_run_events, command.food_run_rules,
  command.food_mission_enrollments, command.food_mission_pauses, command.food_mission_stamps
to service_role;

revoke all on function command.food_run_tags_ok(text[], integer) from public, anon, authenticated;
grant execute on function command.food_run_tags_ok(text[], integer) to service_role;
revoke all on function command.food_run_txt(jsonb, text, integer, integer, boolean) from public, anon, authenticated;
revoke all on function command.food_run_num(jsonb, text, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function command.food_run_bool(jsonb, text, boolean) from public, anon, authenticated;
revoke all on function command.food_run_ts(jsonb, text, boolean) from public, anon, authenticated;
revoke all on function command.food_run_at(jsonb) from public, anon, authenticated;
revoke all on function command.food_run_uuid(jsonb, text, boolean) from public, anon, authenticated;
revoke all on function command.food_run_pick(jsonb, text, text[], text) from public, anon, authenticated;
revoke all on function command.food_run_arr(jsonb, text, integer) from public, anon, authenticated;
revoke all on function command.food_run_answers(jsonb) from public, anon, authenticated;
revoke all on function command.food_run_valid_prefs(jsonb) from public, anon, authenticated;
revoke all on function command.food_run_participant_id() from public, anon, authenticated;
revoke all on function command.food_mission_settle(uuid) from public, anon, authenticated;
revoke all on function command.food_run_owned(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function command.food_run_forget_household(uuid, uuid) from public, anon, authenticated;
revoke all on function command.food_run_apply_op(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function command.food_run_tough_conditions(uuid) from public, anon, authenticated;
revoke all on function command.food_run_award_plan(uuid) from public, anon, authenticated;
revoke all on function command.food_run_award(uuid, uuid) from public, anon, authenticated;
revoke all on function command.food_run_award_stamps(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function command.food_run_refresh_awards(uuid, uuid) from public, anon, authenticated;
revoke all on function command.food_mission_progress_for(uuid) from public, anon, authenticated;
revoke all on function command.food_run_complete(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function command.food_run_events_guard() from public, anon, authenticated;
revoke all on function command.food_run_stops_guard() from public, anon, authenticated;
revoke all on function command.prune_food_run_events(interval) from public, anon, authenticated;
grant execute on function command.prune_food_run_events(interval) to service_role;

revoke all on function command.apply_food_run_changes(jsonb, boolean) from public, anon, authenticated;
revoke all on function command.get_food_run_board() from public, anon, authenticated;
revoke all on function command.get_food_run(uuid) from public, anon, authenticated;
revoke all on function command.enroll_food_mission(smallint) from public, anon, authenticated;
revoke all on function command.set_food_mission_status(text, timestamptz) from public, anon, authenticated;
revoke all on function command.set_food_mission_goal(smallint) from public, anon, authenticated;
revoke all on function command.get_food_mission_progress() from public, anon, authenticated;
revoke all on function command.get_food_run_circle_week() from public, anon, authenticated;
revoke all on function command.set_food_run_rules(jsonb) from public, anon, authenticated;
revoke all on function command.get_food_run_network(integer) from public, anon, authenticated;

grant execute on function command.apply_food_run_changes(jsonb, boolean) to authenticated, service_role;
grant execute on function command.get_food_run_board() to authenticated, service_role;
grant execute on function command.get_food_run(uuid) to authenticated, service_role;
grant execute on function command.enroll_food_mission(smallint) to authenticated, service_role;
grant execute on function command.set_food_mission_status(text, timestamptz) to authenticated, service_role;
grant execute on function command.set_food_mission_goal(smallint) to authenticated, service_role;
grant execute on function command.get_food_mission_progress() to authenticated, service_role;
grant execute on function command.get_food_run_circle_week() to anon, authenticated, service_role;
grant execute on function command.set_food_run_rules(jsonb) to authenticated, service_role;
grant execute on function command.get_food_run_network(integer) to authenticated, service_role;

comment on table command.food_run_households is 'Households a runner shares food with. Private to that runner; written only through apply_food_run_changes.';
comment on table command.food_runs is 'Pickup runs: one pickup from a source, shared out to households. Private to the runner. Practice runs never count.';
comment on table command.food_run_items is 'What a run picks up (the haul), with allergen and temperature tags used for safe portioning.';
comment on table command.food_run_stops is 'One household on one run: contact and delivery check-offs, with a name snapshot that becomes "A family" when the household is forgotten.';
comment on table command.food_run_portions is 'How much of each item goes to each household on a run.';
comment on table command.food_run_events is 'Append-only idempotency receipts and activity log for pickup runs. Holds operation names and ids, never personal details.';
comment on table command.food_run_rules is 'Network-wide recognition rules for pickup runs (seeds per step, tough-window bonus, circle goal). Coordinators edit through set_food_run_rules.';
comment on table command.food_mission_enrollments is 'THE MISSION opt-in (plan 004). Seeds and stamps only accrue while a participant is enrolled.';
comment on table command.food_mission_pauses is 'Pause history so a pause freezes the weekly rhythm instead of breaking it.';
comment on table command.food_mission_stamps is 'Stamps (firsts and milestones) earned by enrolled participants.';
comment on function command.apply_food_run_changes(jsonb, boolean) is 'Applies an ordered batch of pickup-run changes. Each change carries a client key (replays are skipped) and the phone''s own timestamp. Refused changes are reported in "failed" without blocking the rest.';
comment on function command.get_food_run_circle_week() is 'Anonymous weekly totals across every runner: runs, families reached, people fed, and the circle goal. No names.';
