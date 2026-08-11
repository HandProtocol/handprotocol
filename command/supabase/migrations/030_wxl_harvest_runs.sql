/*
  030_wxl_harvest_runs.sql
  Reviewed multi-stop dispatch plans connecting approved Contributors to
  rescue pickup and delivery records without exposing private route details.
*/

create table if not exists command.food_harvest_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 3 and 160),
  public_area text not null check (char_length(btrim(public_area)) between 2 and 160),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity_value numeric not null check (capacity_value > 0),
  capacity_unit text not null check (char_length(btrim(capacity_unit)) between 1 and 40),
  max_item_weight_lb numeric not null check (max_item_weight_lb >= 0 and max_item_weight_lb <= 1000),
  required_run_classes text[] not null check (
    cardinality(required_run_classes) > 0
    and required_run_classes <@ array['not_controlled', 'chilled', 'frozen', 'hot']::text[]
  ),
  allowed_vehicle_types text[] not null check (
    cardinality(allowed_vehicle_types) > 0
    and allowed_vehicle_types <@ array['bicycle', 'car', 'suv', 'van', 'truck']::text[]
  ),
  public_summary text not null check (char_length(btrim(public_summary)) between 3 and 1000),
  private_dispatch_notes text not null check (char_length(btrim(private_dispatch_notes)) between 3 and 2000),
  accessibility_notes text not null check (char_length(btrim(accessibility_notes)) between 2 and 1000),
  status text not null default 'planning' check (status in ('planning', 'ready', 'assigned', 'in_progress', 'completed', 'cancelled', 'incident_hold')),
  created_by uuid not null references command.profiles(id) on delete restrict,
  reviewed_by uuid references command.profiles(id) on delete set null,
  reviewed_at timestamptz,
  assigned_to uuid references command.profiles(id) on delete set null,
  assigned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  check (ends_at > starts_at)
);

create table if not exists command.food_harvest_run_stops (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references command.food_harvest_runs(id) on delete cascade,
  stop_order integer not null check (stop_order > 0),
  stop_type text not null check (stop_type in ('pickup', 'delivery', 'hub')),
  rescue_id uuid references command.food_rescues(id) on delete restrict,
  public_label text not null check (char_length(btrim(public_label)) between 2 and 160),
  private_instructions text not null check (char_length(btrim(private_instructions)) between 3 and 1500),
  window_start timestamptz not null,
  window_end timestamptz not null,
  expected_quantity numeric not null check (expected_quantity >= 0),
  quantity_unit text not null check (char_length(btrim(quantity_unit)) between 1 and 40),
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped', 'incident_hold')),
  observed_quantity numeric check (observed_quantity is null or observed_quantity >= 0),
  completion_note text,
  completed_at timestamptz,
  recorded_by uuid references command.profiles(id) on delete set null,
  unique (run_id, stop_order),
  check (window_end > window_start),
  check ((stop_type = 'hub') or rescue_id is not null)
);

create table if not exists command.food_harvest_run_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references command.food_harvest_runs(id) on delete cascade,
  stop_id uuid references command.food_harvest_run_stops(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text not null,
  note text,
  actor_id uuid references command.profiles(id) on delete set null
);

create index if not exists food_harvest_runs_status_window_idx on command.food_harvest_runs(status, starts_at);
create index if not exists food_harvest_runs_assignee_idx on command.food_harvest_runs(assigned_to, status);
create index if not exists food_harvest_run_stops_run_idx on command.food_harvest_run_stops(run_id, stop_order);
create index if not exists food_harvest_run_events_run_idx on command.food_harvest_run_events(run_id, created_at);

drop trigger if exists food_harvest_runs_touch_updated_at on command.food_harvest_runs;
create trigger food_harvest_runs_touch_updated_at before update on command.food_harvest_runs
  for each row execute function command.touch_updated_at();

create or replace function command.can_manage_food_operations()
returns boolean
language sql
stable
security definer
set search_path = command, public
as $$ select coalesce(command.current_role() = 'admin', false); $$;

create or replace function command.list_food_harvest_runs()
returns table (
  id uuid, created_at timestamptz, name text, public_area text,
  starts_at timestamptz, ends_at timestamptz, capacity_value numeric,
  capacity_unit text, max_item_weight_lb numeric, required_run_classes text[],
  allowed_vehicle_types text[], public_summary text, status text,
  assigned_at timestamptz, started_at timestamptz, completed_at timestamptz,
  stop_count bigint, completed_stop_count bigint,
  is_assignee boolean, can_manage boolean
)
language sql
stable
security definer
set search_path = command, public
as $$
  select
    run.id, run.created_at, run.name, run.public_area, run.starts_at, run.ends_at,
    run.capacity_value, run.capacity_unit, run.max_item_weight_lb,
    run.required_run_classes, run.allowed_vehicle_types, run.public_summary,
    run.status, run.assigned_at, run.started_at, run.completed_at,
    count(stop.id), count(stop.id) filter (where stop.status in ('completed', 'skipped')),
    coalesce(run.assigned_to = auth.uid(), false),
    coalesce(command.current_role() = 'admin', false)
  from command.food_harvest_runs as run
  left join command.food_harvest_run_stops as stop on stop.run_id = run.id
  where auth.uid() is not null
    and (run.assigned_to = auth.uid() or command.current_role() = 'admin')
  group by run.id
  order by case run.status when 'in_progress' then 0 when 'assigned' then 1 when 'ready' then 2 else 3 end,
    run.starts_at asc;
$$;

create or replace function command.get_food_harvest_run_private(p_run_id uuid)
returns table (
  run_id uuid, private_dispatch_notes text, accessibility_notes text,
  assigned_to uuid, stops jsonb
)
language sql
stable
security definer
set search_path = command, public
as $$
  select
    run.id, run.private_dispatch_notes, run.accessibility_notes, run.assigned_to,
    coalesce(jsonb_agg(jsonb_build_object(
      'id', stop.id,
      'stop_order', stop.stop_order,
      'stop_type', stop.stop_type,
      'rescue_id', stop.rescue_id,
      'public_label', stop.public_label,
      'private_instructions', stop.private_instructions,
      'window_start', stop.window_start,
      'window_end', stop.window_end,
      'expected_quantity', stop.expected_quantity,
      'quantity_unit', stop.quantity_unit,
      'status', stop.status,
      'observed_quantity', stop.observed_quantity,
      'completion_note', stop.completion_note,
      'completed_at', stop.completed_at
    ) order by stop.stop_order) filter (where stop.id is not null), '[]'::jsonb)
  from command.food_harvest_runs as run
  left join command.food_harvest_run_stops as stop on stop.run_id = run.id
  where run.id = p_run_id and auth.uid() is not null
    and (run.assigned_to = auth.uid() or command.current_role() = 'admin')
  group by run.id;
$$;

create or replace function command.create_food_harvest_run(
  p_name text, p_public_area text, p_starts_at timestamptz, p_ends_at timestamptz,
  p_capacity_value numeric, p_capacity_unit text, p_max_item_weight_lb numeric,
  p_required_run_classes text[], p_allowed_vehicle_types text[],
  p_public_summary text, p_private_dispatch_notes text, p_accessibility_notes text
)
returns command.food_harvest_runs
language plpgsql
security definer
set search_path = command, public
as $$
declare result command.food_harvest_runs;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Coordinator permission is required'; end if;
  if p_starts_at <= now() or p_ends_at <= p_starts_at then raise exception 'Run windows must be future and ordered'; end if;
  insert into command.food_harvest_runs (
    name, public_area, starts_at, ends_at, capacity_value, capacity_unit,
    max_item_weight_lb, required_run_classes, allowed_vehicle_types,
    public_summary, private_dispatch_notes, accessibility_notes, created_by
  ) values (
    btrim(p_name), btrim(p_public_area), p_starts_at, p_ends_at,
    p_capacity_value, btrim(p_capacity_unit), p_max_item_weight_lb,
    p_required_run_classes, p_allowed_vehicle_types, btrim(p_public_summary),
    btrim(p_private_dispatch_notes), btrim(p_accessibility_notes), auth.uid()
  ) returning * into result;
  insert into command.food_harvest_run_events (run_id, event_type, to_status, note, actor_id)
  values (result.id, 'created', 'planning', 'Harvest run created', auth.uid());
  return result;
end;
$$;

create or replace function command.add_food_harvest_run_stop(
  p_run_id uuid, p_stop_order integer, p_stop_type text, p_rescue_id uuid,
  p_public_label text, p_private_instructions text, p_window_start timestamptz,
  p_window_end timestamptz, p_expected_quantity numeric, p_quantity_unit text
)
returns command.food_harvest_run_stops
language plpgsql
security definer
set search_path = command, public
as $$
declare run command.food_harvest_runs; rescue command.food_rescues; result command.food_harvest_run_stops;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Coordinator permission is required'; end if;
  select * into run from command.food_harvest_runs where id = p_run_id for update;
  if run.id is null or run.status <> 'planning' then raise exception 'Stops can be added only while planning'; end if;
  if p_window_start < run.starts_at or p_window_end > run.ends_at then raise exception 'Stop window must fit inside the run window'; end if;
  if p_stop_type in ('pickup', 'delivery') and not exists (
    select 1 from command.food_rescues where id = p_rescue_id and status in ('open', 'claimed')
  ) then raise exception 'Linked rescue is unavailable for planning'; end if;
  if p_stop_type in ('pickup', 'delivery') then
    select * into rescue from command.food_rescues where id = p_rescue_id;
    if not (rescue.temperature_class = any(run.required_run_classes)) then
      raise exception 'The run is missing the linked rescue temperature class';
    end if;
    if p_stop_type = 'pickup' and (p_window_start < rescue.pickup_window_start or p_window_end > rescue.pickup_window_end) then
      raise exception 'Pickup stop window must fit inside the rescue pickup window';
    end if;
    if p_stop_type = 'delivery' and (p_window_start < rescue.delivery_window_start or p_window_end > rescue.delivery_window_end) then
      raise exception 'Delivery stop window must fit inside the rescue delivery window';
    end if;
  end if;
  insert into command.food_harvest_run_stops (
    run_id, stop_order, stop_type, rescue_id, public_label, private_instructions,
    window_start, window_end, expected_quantity, quantity_unit
  ) values (
    p_run_id, p_stop_order, p_stop_type, p_rescue_id, btrim(p_public_label),
    btrim(p_private_instructions), p_window_start, p_window_end,
    p_expected_quantity, btrim(p_quantity_unit)
  ) returning * into result;
  insert into command.food_harvest_run_events (run_id, stop_id, event_type, from_status, to_status, note, actor_id)
  values (run.id, result.id, 'stop_added', 'planning', 'planning', result.public_label, auth.uid());
  return result;
end;
$$;

create or replace function command.assign_food_harvest_run(
  p_run_id uuid, p_contributor_id uuid, p_schedule_confirmed boolean, p_note text
)
returns command.food_harvest_runs
language plpgsql
security definer
set search_path = command, public
as $$
declare run command.food_harvest_runs; contributor command.food_contributors; result command.food_harvest_runs;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Coordinator permission is required'; end if;
  if not coalesce(p_schedule_confirmed, false) then raise exception 'Availability and service area must be confirmed'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'An assignment note is required'; end if;
  select * into run from command.food_harvest_runs where id = p_run_id for update;
  if run.id is null or run.status not in ('planning', 'ready') then raise exception 'Run is not available for assignment'; end if;
  if run.starts_at <= now() then raise exception 'A run must be assigned before its start window'; end if;
  if not exists (select 1 from command.food_harvest_run_stops where run_id = run.id) then raise exception 'At least one stop is required'; end if;
  select * into contributor from command.food_contributors where profile_id = p_contributor_id;
  if contributor.profile_id is null or contributor.status <> 'approved' then raise exception 'An approved Contributor is required'; end if;
  if contributor.training_expires_at is null or contributor.training_expires_at < run.ends_at then raise exception 'Contributor training must remain current through the run'; end if;
  if contributor.credential_expires_at is not null and contributor.credential_expires_at < run.ends_at::date then raise exception 'Contributor credential expires before the run ends'; end if;
  if not (run.required_run_classes <@ contributor.approved_run_classes) then raise exception 'Contributor is not approved for every run class'; end if;
  if not (contributor.vehicle_type = any(run.allowed_vehicle_types)) then raise exception 'Contributor vehicle is not approved for this run'; end if;
  if contributor.capacity_value is null or contributor.capacity_unit <> run.capacity_unit or contributor.capacity_value < run.capacity_value then raise exception 'Contributor capacity does not meet this run'; end if;
  if contributor.lifting_limit_lb < run.max_item_weight_lb then raise exception 'Contributor lifting limit does not meet this run'; end if;
  if 'chilled' = any(run.required_run_classes) and not (contributor.has_insulated_coolers or contributor.has_refrigeration) then raise exception 'Cold-holding equipment is required'; end if;
  if 'frozen' = any(run.required_run_classes) and not contributor.has_frozen_storage then raise exception 'Frozen holding is required'; end if;
  if 'hot' = any(run.required_run_classes) and not contributor.has_hot_holding then raise exception 'Hot holding is required'; end if;
  if exists (
    select 1 from command.food_harvest_run_stops as stop
    join command.food_rescues as rescue on rescue.id = stop.rescue_id
    where stop.run_id = run.id and rescue.status = 'claimed' and rescue.claimed_by <> contributor.profile_id
  ) then raise exception 'A linked rescue is assigned to another Contributor'; end if;
  if exists (
    select 1 from command.food_harvest_run_stops as proposed
    join command.food_harvest_run_stops as existing on existing.rescue_id = proposed.rescue_id and existing.run_id <> proposed.run_id
    join command.food_harvest_runs as other_run on other_run.id = existing.run_id
    where proposed.run_id = run.id and proposed.rescue_id is not null
      and other_run.status in ('assigned', 'in_progress', 'incident_hold')
  ) then raise exception 'A linked rescue already belongs to another active harvest run'; end if;

  update command.food_rescues as rescue
  set status = 'claimed', claimed_by = contributor.profile_id, claimed_at = now(),
      claim_expires_at = rescue.pickup_window_end
  where rescue.id in (select stop.rescue_id from command.food_harvest_run_stops as stop where stop.run_id = run.id)
    and rescue.status = 'open' and rescue.pickup_window_end > now();

  if exists (
    select 1 from command.food_harvest_run_stops as stop
    join command.food_rescues as rescue on rescue.id = stop.rescue_id
    where stop.run_id = run.id and (rescue.status <> 'claimed' or rescue.claimed_by <> contributor.profile_id)
  ) then raise exception 'Every linked rescue must be claimable by the assigned Contributor'; end if;

  update command.food_harvest_runs set status = 'assigned', assigned_to = contributor.profile_id,
    assigned_at = now(), reviewed_by = auth.uid(), reviewed_at = now()
  where id = run.id returning * into result;
  insert into command.food_harvest_run_events (run_id, event_type, from_status, to_status, note, actor_id)
  values (run.id, 'assigned', run.status, 'assigned', btrim(p_note), auth.uid());
  return result;
end;
$$;

create or replace function command.cancel_food_harvest_run(p_run_id uuid, p_note text)
returns command.food_harvest_runs
language plpgsql
security definer
set search_path = command, public
as $$
declare run command.food_harvest_runs; result command.food_harvest_runs;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Coordinator permission is required'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'A cancellation note is required'; end if;
  select * into run from command.food_harvest_runs where id = p_run_id for update;
  if run.id is null or run.status not in ('planning', 'ready', 'assigned') then raise exception 'Run cannot be cancelled at this stage'; end if;
  update command.food_rescues as rescue set status = 'open', claimed_by = null, claimed_at = null, claim_expires_at = null
  where rescue.id in (select stop.rescue_id from command.food_harvest_run_stops as stop where stop.run_id = run.id)
    and rescue.status = 'claimed' and rescue.claimed_by = run.assigned_to and rescue.pickup_window_end > now();
  update command.food_harvest_runs set status = 'cancelled', cancelled_at = now(), assigned_to = null, assigned_at = null
  where id = run.id returning * into result;
  insert into command.food_harvest_run_events (run_id, event_type, from_status, to_status, note, actor_id)
  values (run.id, 'cancelled', run.status, 'cancelled', btrim(p_note), auth.uid());
  return result;
end;
$$;

create or replace function command.start_food_harvest_run(p_run_id uuid, p_note text)
returns command.food_harvest_runs
language plpgsql
security definer
set search_path = command, public
as $$
declare run command.food_harvest_runs; contributor command.food_contributors; result command.food_harvest_runs;
begin
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'A start check-in note is required'; end if;
  select * into run from command.food_harvest_runs where id = p_run_id for update;
  if run.id is null or run.status <> 'assigned' or run.assigned_to <> auth.uid() then raise exception 'Only the assigned Contributor can start this run'; end if;
  if now() < run.starts_at - interval '30 minutes' then raise exception 'Run check-in opens 30 minutes before the start window'; end if;
  if now() >= run.ends_at then raise exception 'The run window has ended'; end if;
  select * into contributor from command.food_contributors where profile_id = auth.uid();
  if contributor.profile_id is null or contributor.status <> 'approved' then raise exception 'Contributor approval is no longer active'; end if;
  if contributor.training_expires_at is null or contributor.training_expires_at < run.ends_at then raise exception 'Contributor training is not current through the run'; end if;
  if contributor.credential_expires_at is not null and contributor.credential_expires_at < run.ends_at::date then raise exception 'Contributor credential expires before the run ends'; end if;
  if not (run.required_run_classes <@ contributor.approved_run_classes) then raise exception 'Contributor run-class approval changed'; end if;
  if not (contributor.vehicle_type = any(run.allowed_vehicle_types)) then raise exception 'Contributor vehicle approval changed'; end if;
  if contributor.capacity_value is null or contributor.capacity_unit <> run.capacity_unit or contributor.capacity_value < run.capacity_value then raise exception 'Contributor capacity no longer meets the run'; end if;
  if contributor.lifting_limit_lb < run.max_item_weight_lb then raise exception 'Contributor lifting limit no longer meets the run'; end if;
  update command.food_harvest_runs as run set status = 'in_progress', started_at = now()
  where run.id = p_run_id and run.status = 'assigned' and run.assigned_to = auth.uid()
  returning run.* into result;
  insert into command.food_harvest_run_events (run_id, event_type, from_status, to_status, note, actor_id)
  values (result.id, 'started', 'assigned', 'in_progress', btrim(p_note), auth.uid());
  return result;
end;
$$;

create or replace function command.record_food_harvest_stop(
  p_stop_id uuid, p_outcome text, p_observed_quantity numeric, p_note text
)
returns command.food_harvest_run_stops
language plpgsql
security definer
set search_path = command, public
as $$
declare stop command.food_harvest_run_stops; run command.food_harvest_runs; rescue command.food_rescues; result command.food_harvest_run_stops;
begin
  if p_outcome not in ('completed', 'skipped', 'incident_hold') then raise exception 'Invalid stop outcome'; end if;
  if p_observed_quantity is null or p_observed_quantity < 0 then raise exception 'Observed quantity is required'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'A stop outcome note is required'; end if;
  select * into stop from command.food_harvest_run_stops where id = p_stop_id for update;
  select * into run from command.food_harvest_runs where id = stop.run_id for update;
  if run.id is null or run.status <> 'in_progress' or run.assigned_to <> auth.uid() then raise exception 'Only the assigned Contributor can record an active stop'; end if;
  if stop.status <> 'planned' then raise exception 'This stop already has an outcome'; end if;
  if exists (select 1 from command.food_harvest_run_stops where run_id = run.id and stop_order < stop.stop_order and status = 'planned') then raise exception 'Earlier stops need an outcome first'; end if;
  if stop.rescue_id is not null and p_outcome = 'completed' then
    select * into rescue from command.food_rescues where id = stop.rescue_id;
    if stop.stop_type = 'pickup' and rescue.status <> 'picked_up' then raise exception 'Record the rescue pickup safety checkpoint first'; end if;
    if stop.stop_type = 'delivery' and rescue.status not in ('delivered', 'accepted') then raise exception 'Record the rescue delivery safety checkpoint first'; end if;
  end if;
  update command.food_harvest_run_stops as target set status = p_outcome,
    observed_quantity = p_observed_quantity, completion_note = btrim(p_note),
    completed_at = now(), recorded_by = auth.uid()
  where target.id = stop.id returning target.* into result;
  if p_outcome = 'incident_hold' then
    update command.food_harvest_runs set status = 'incident_hold' where id = run.id;
    update command.food_rescues set status = 'incident_hold'
    where id = stop.rescue_id and status in ('claimed', 'picked_up', 'delivered');
  end if;
  insert into command.food_harvest_run_events (run_id, stop_id, event_type, from_status, to_status, note, actor_id)
  values (run.id, stop.id, 'stop_outcome', 'planned', p_outcome, btrim(p_note), auth.uid());
  return result;
end;
$$;

create or replace function command.complete_food_harvest_run(p_run_id uuid, p_note text)
returns command.food_harvest_runs
language plpgsql
security definer
set search_path = command, public
as $$
declare result command.food_harvest_runs;
begin
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'A completion note is required'; end if;
  if exists (select 1 from command.food_harvest_run_stops where run_id = p_run_id and status not in ('completed', 'skipped')) then raise exception 'Every stop needs a final outcome'; end if;
  update command.food_harvest_runs as run set status = 'completed', completed_at = now()
  where run.id = p_run_id and run.status = 'in_progress'
    and (run.assigned_to = auth.uid() or command.current_role() = 'admin')
  returning run.* into result;
  if result.id is null then raise exception 'Run cannot be completed by this account or at this stage'; end if;
  insert into command.food_harvest_run_events (run_id, event_type, from_status, to_status, note, actor_id)
  values (result.id, 'completed', 'in_progress', 'completed', btrim(p_note), auth.uid());
  return result;
end;
$$;

create or replace function command.resolve_food_harvest_run_hold(p_run_id uuid, p_disposition text, p_note text)
returns command.food_harvest_runs
language plpgsql
security definer
set search_path = command, public
as $$
declare result command.food_harvest_runs;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Coordinator incident permission is required'; end if;
  if p_disposition not in ('resume', 'cancelled') then raise exception 'Disposition must be resume or cancelled'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'An incident disposition note is required'; end if;
  update command.food_harvest_run_stops set status = 'skipped',
    completion_note = concat_ws(E'\n', completion_note, 'Coordinator disposition: ' || btrim(p_note))
  where run_id = p_run_id and status = 'incident_hold';
  update command.food_harvest_runs as run set
    status = case when p_disposition = 'resume' then 'in_progress' else 'cancelled' end,
    cancelled_at = case when p_disposition = 'cancelled' then now() else run.cancelled_at end
  where run.id = p_run_id and run.status = 'incident_hold'
  returning run.* into result;
  if result.id is null then raise exception 'Run was not found or is not on incident hold'; end if;
  insert into command.food_harvest_run_events (run_id, event_type, from_status, to_status, note, actor_id)
  values (result.id, 'incident_resolved', 'incident_hold', result.status, btrim(p_note), auth.uid());
  return result;
end;
$$;

alter table command.food_harvest_runs enable row level security;
alter table command.food_harvest_run_stops enable row level security;
alter table command.food_harvest_run_events enable row level security;

drop policy if exists food_harvest_runs_private_read on command.food_harvest_runs;
create policy food_harvest_runs_private_read on command.food_harvest_runs for select
  using (assigned_to = auth.uid() or command.current_role() = 'admin');
drop policy if exists food_harvest_stops_private_read on command.food_harvest_run_stops;
create policy food_harvest_stops_private_read on command.food_harvest_run_stops for select
  using (exists (select 1 from command.food_harvest_runs as run where run.id = run_id and (run.assigned_to = auth.uid() or command.current_role() = 'admin')));
drop policy if exists food_harvest_events_private_read on command.food_harvest_run_events;
create policy food_harvest_events_private_read on command.food_harvest_run_events for select
  using (exists (select 1 from command.food_harvest_runs as run where run.id = run_id and (run.assigned_to = auth.uid() or command.current_role() = 'admin')));

grant select on command.food_harvest_runs, command.food_harvest_run_stops, command.food_harvest_run_events to authenticated;
revoke insert, update, delete on command.food_harvest_runs, command.food_harvest_run_stops, command.food_harvest_run_events from anon, authenticated;

revoke execute on function command.can_manage_food_operations() from public;
revoke execute on function command.list_food_harvest_runs() from public;
revoke execute on function command.get_food_harvest_run_private(uuid) from public;
revoke execute on function command.create_food_harvest_run(text, text, timestamptz, timestamptz, numeric, text, numeric, text[], text[], text, text, text) from public;
revoke execute on function command.add_food_harvest_run_stop(uuid, integer, text, uuid, text, text, timestamptz, timestamptz, numeric, text) from public;
revoke execute on function command.assign_food_harvest_run(uuid, uuid, boolean, text) from public;
revoke execute on function command.cancel_food_harvest_run(uuid, text) from public;
revoke execute on function command.start_food_harvest_run(uuid, text) from public;
revoke execute on function command.record_food_harvest_stop(uuid, text, numeric, text) from public;
revoke execute on function command.complete_food_harvest_run(uuid, text) from public;
revoke execute on function command.resolve_food_harvest_run_hold(uuid, text, text) from public;
grant execute on function command.can_manage_food_operations() to authenticated;
grant execute on function command.list_food_harvest_runs() to authenticated;
grant execute on function command.get_food_harvest_run_private(uuid) to authenticated;
grant execute on function command.create_food_harvest_run(text, text, timestamptz, timestamptz, numeric, text, numeric, text[], text[], text, text, text) to authenticated;
grant execute on function command.add_food_harvest_run_stop(uuid, integer, text, uuid, text, text, timestamptz, timestamptz, numeric, text) to authenticated;
grant execute on function command.assign_food_harvest_run(uuid, uuid, boolean, text) to authenticated;
grant execute on function command.cancel_food_harvest_run(uuid, text) to authenticated;
grant execute on function command.start_food_harvest_run(uuid, text) to authenticated;
grant execute on function command.record_food_harvest_stop(uuid, text, numeric, text) to authenticated;
grant execute on function command.complete_food_harvest_run(uuid, text) to authenticated;
grant execute on function command.resolve_food_harvest_run_hold(uuid, text, text) to authenticated;

comment on table command.food_harvest_runs is 'Private, reviewed WXL:FOOD multi-stop dispatch plans.';
comment on table command.food_harvest_run_stops is 'Ordered private stops linked to rescue safety checkpoints.';
comment on table command.food_harvest_run_events is 'Immutable assignment, stop, incident, and completion history for harvest runs.';
