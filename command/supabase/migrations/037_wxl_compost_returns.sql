/*
  037_wxl_compost_returns.sql
  Adds an audited compost-return leg to private WXL delivery routes.
*/

alter table command.food_harvest_run_stops
  add column if not exists compost_pickup_requested boolean not null default false,
  add column if not exists expected_compost_quantity numeric,
  add column if not exists compost_quantity_unit text,
  add column if not exists compost_private_instructions text,
  add column if not exists compost_outcome text,
  add column if not exists collected_compost_quantity numeric,
  add column if not exists compost_outcome_note text;

alter table command.food_harvest_run_stops
  drop constraint if exists food_harvest_run_stops_stop_type_check,
  drop constraint if exists food_harvest_run_stops_check,
  drop constraint if exists food_harvest_run_stops_check1,
  drop constraint if exists food_harvest_run_stops_window_check,
  drop constraint if exists food_harvest_run_stops_rescue_check,
  drop constraint if exists food_harvest_run_stops_compost_request_check,
  drop constraint if exists food_harvest_run_stops_compost_outcome_check;

alter table command.food_harvest_run_stops
  add constraint food_harvest_run_stops_stop_type_check
    check (stop_type in ('pickup', 'delivery', 'hub', 'compost_dropoff')),
  add constraint food_harvest_run_stops_window_check
    check (window_end > window_start),
  add constraint food_harvest_run_stops_rescue_check
    check ((stop_type in ('hub', 'compost_dropoff')) or rescue_id is not null),
  add constraint food_harvest_run_stops_compost_request_check check (
    (
      compost_pickup_requested
      and stop_type = 'delivery'
      and expected_compost_quantity is not null
      and expected_compost_quantity > 0
      and char_length(btrim(compost_quantity_unit)) between 1 and 40
      and char_length(btrim(compost_private_instructions)) between 3 and 1500
    )
    or (
      not compost_pickup_requested
      and expected_compost_quantity is null
      and compost_quantity_unit is null
      and compost_private_instructions is null
    )
  ),
  add constraint food_harvest_run_stops_compost_outcome_check check (
    compost_outcome is null
    or (
      compost_pickup_requested
      and compost_outcome in ('collected', 'none_available', 'rejected_contamination')
      and collected_compost_quantity is not null
      and collected_compost_quantity >= 0
      and char_length(btrim(compost_outcome_note)) between 3 and 1500
      and (
        (compost_outcome = 'collected' and collected_compost_quantity > 0)
        or (compost_outcome in ('none_available', 'rejected_contamination') and collected_compost_quantity = 0)
      )
    )
  );

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
      'compost_pickup_requested', stop.compost_pickup_requested,
      'expected_compost_quantity', stop.expected_compost_quantity,
      'compost_quantity_unit', stop.compost_quantity_unit,
      'compost_private_instructions', stop.compost_private_instructions,
      'compost_outcome', stop.compost_outcome,
      'collected_compost_quantity', stop.collected_compost_quantity,
      'compost_outcome_note', stop.compost_outcome_note,
      'completed_at', stop.completed_at
    ) order by stop.stop_order) filter (where stop.id is not null), '[]'::jsonb)
  from command.food_harvest_runs as run
  left join command.food_harvest_run_stops as stop on stop.run_id = run.id
  where run.id = p_run_id and auth.uid() is not null
    and (run.assigned_to = auth.uid() or command.current_role() = 'admin')
  group by run.id;
$$;

create or replace function command.add_food_harvest_run_stop_v2(
  p_run_id uuid, p_stop_order integer, p_stop_type text, p_rescue_id uuid,
  p_public_label text, p_private_instructions text, p_window_start timestamptz,
  p_window_end timestamptz, p_expected_quantity numeric, p_quantity_unit text,
  p_compost_pickup_requested boolean, p_expected_compost_quantity numeric,
  p_compost_quantity_unit text, p_compost_private_instructions text
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
  if p_compost_pickup_requested and p_stop_type <> 'delivery' then raise exception 'Compost pickup can be attached only to a delivery stop'; end if;
  if p_compost_pickup_requested and (
    p_expected_compost_quantity is null or p_expected_compost_quantity <= 0
    or char_length(btrim(coalesce(p_compost_quantity_unit, ''))) < 1
    or char_length(btrim(coalesce(p_compost_private_instructions, ''))) < 3
  ) then raise exception 'Expected compost quantity, unit, and private pickup instructions are required'; end if;
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
    window_start, window_end, expected_quantity, quantity_unit,
    compost_pickup_requested, expected_compost_quantity, compost_quantity_unit,
    compost_private_instructions
  ) values (
    p_run_id, p_stop_order, p_stop_type, p_rescue_id, btrim(p_public_label),
    btrim(p_private_instructions), p_window_start, p_window_end,
    p_expected_quantity, btrim(p_quantity_unit), coalesce(p_compost_pickup_requested, false),
    case when p_compost_pickup_requested then p_expected_compost_quantity end,
    case when p_compost_pickup_requested then btrim(p_compost_quantity_unit) end,
    case when p_compost_pickup_requested then btrim(p_compost_private_instructions) end
  ) returning * into result;
  insert into command.food_harvest_run_events (run_id, stop_id, event_type, from_status, to_status, note, actor_id)
  values (
    run.id, result.id,
    case when result.compost_pickup_requested then 'delivery_and_compost_stop_added' else 'stop_added' end,
    'planning', 'planning', result.public_label, auth.uid()
  );
  return result;
end;
$$;

create or replace function command.record_food_harvest_stop_v2(
  p_stop_id uuid, p_outcome text, p_observed_quantity numeric, p_note text,
  p_compost_outcome text, p_collected_compost_quantity numeric, p_compost_outcome_note text
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
  if stop.compost_pickup_requested and p_outcome = 'completed' then
    if p_compost_outcome not in ('collected', 'none_available', 'rejected_contamination') then raise exception 'A compost pickup outcome is required'; end if;
    if char_length(btrim(coalesce(p_compost_outcome_note, ''))) < 3 then raise exception 'A compost outcome note is required'; end if;
    if p_compost_outcome = 'collected' and coalesce(p_collected_compost_quantity, 0) <= 0 then raise exception 'Collected compost quantity must be greater than zero'; end if;
    if p_compost_outcome in ('none_available', 'rejected_contamination') and coalesce(p_collected_compost_quantity, 0) <> 0 then raise exception 'Uncollected compost quantity must be zero'; end if;
  end if;
  update command.food_harvest_run_stops as target set
    status = p_outcome,
    observed_quantity = p_observed_quantity,
    completion_note = btrim(p_note),
    compost_outcome = case when stop.compost_pickup_requested and p_outcome = 'completed' then p_compost_outcome end,
    collected_compost_quantity = case when stop.compost_pickup_requested and p_outcome = 'completed' then p_collected_compost_quantity end,
    compost_outcome_note = case when stop.compost_pickup_requested and p_outcome = 'completed' then btrim(p_compost_outcome_note) end,
    completed_at = now(), recorded_by = auth.uid()
  where target.id = stop.id returning target.* into result;
  if p_outcome = 'incident_hold' then
    update command.food_harvest_runs set status = 'incident_hold' where id = run.id;
    update command.food_rescues set status = 'incident_hold'
    where id = stop.rescue_id and status in ('claimed', 'picked_up', 'delivered');
  end if;
  insert into command.food_harvest_run_events (run_id, stop_id, event_type, from_status, to_status, note, actor_id)
  values (
    run.id, stop.id,
    case when result.compost_outcome = 'collected' then 'delivery_completed_compost_collected' else 'stop_outcome' end,
    'planned', p_outcome,
    concat_ws(E'\n', btrim(p_note), case when result.compost_outcome is not null then 'Compost: ' || result.compost_outcome || ', ' || result.collected_compost_quantity || ' ' || result.compost_quantity_unit || '. ' || result.compost_outcome_note end),
    auth.uid()
  );
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
declare stop command.food_harvest_run_stops;
begin
  select * into stop from command.food_harvest_run_stops where id = p_stop_id;
  if stop.compost_pickup_requested then raise exception 'Use the compost-aware stop outcome command'; end if;
  return command.record_food_harvest_stop_v2(p_stop_id, p_outcome, p_observed_quantity, p_note, null, null, null);
end;
$$;

revoke execute on function command.add_food_harvest_run_stop_v2(uuid, integer, text, uuid, text, text, timestamptz, timestamptz, numeric, text, boolean, numeric, text, text) from public;
revoke execute on function command.record_food_harvest_stop_v2(uuid, text, numeric, text, text, numeric, text) from public;
grant execute on function command.add_food_harvest_run_stop_v2(uuid, integer, text, uuid, text, text, timestamptz, timestamptz, numeric, text, boolean, numeric, text, text) to authenticated;
grant execute on function command.record_food_harvest_stop_v2(uuid, text, numeric, text, text, numeric, text) to authenticated;

comment on column command.food_harvest_run_stops.compost_pickup_requested is 'Whether this food delivery includes an opt-in reverse-leg compost pickup.';
comment on column command.food_harvest_run_stops.compost_private_instructions is 'Restricted compost container, access, and contamination guidance for the assigned Contributor.';
comment on column command.food_harvest_run_stops.compost_outcome is 'Audited result of an expected compost pickup.';
