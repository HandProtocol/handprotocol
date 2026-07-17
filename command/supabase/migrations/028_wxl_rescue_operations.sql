/*
  028_wxl_rescue_operations.sql
  Safety-reviewed food rescue operations for WXL:FOOD. Public discovery uses
  a privacy-safe function. Private pickup instructions are readable only by
  the rescue creator, assigned Contributor, or a Command Center administrator.
*/

create table if not exists command.food_rescues (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_partner_id uuid references command.food_partners(id) on delete set null,
  source_name text not null check (char_length(btrim(source_name)) between 2 and 200),
  receiving_group text not null check (char_length(btrim(receiving_group)) between 2 and 200),
  food_category text not null check (food_category in ('whole_produce', 'shelf_stable', 'chilled', 'frozen', 'hot_prepared', 'bakery', 'mixed')),
  description text not null check (char_length(btrim(description)) between 3 and 1500),
  quantity numeric not null check (quantity > 0),
  unit text not null check (char_length(btrim(unit)) between 1 and 40),
  packaging_condition text not null check (char_length(btrim(packaging_condition)) between 2 and 500),
  allergen_information text not null check (char_length(btrim(allergen_information)) between 2 and 1000),
  date_mark text not null check (char_length(btrim(date_mark)) between 2 and 300),
  temperature_class text not null check (temperature_class in ('not_controlled', 'chilled', 'frozen', 'hot')),
  handling_notes text not null check (char_length(btrim(handling_notes)) between 2 and 1000),
  pickup_window_start timestamptz not null,
  pickup_window_end timestamptz not null,
  public_neighborhood text not null check (char_length(btrim(public_neighborhood)) between 2 and 120),
  private_pickup_instructions text not null check (char_length(btrim(private_pickup_instructions)) between 3 and 1500),
  delivery_window_start timestamptz not null,
  delivery_window_end timestamptz not null,
  vehicle_requirements text not null check (char_length(btrim(vehicle_requirements)) between 2 and 500),
  storage_requirements text not null check (char_length(btrim(storage_requirements)) between 2 and 500),
  accessibility_notes text not null check (char_length(btrim(accessibility_notes)) between 2 and 500),
  status text not null default 'awaiting_review' check (status in ('draft', 'awaiting_review', 'open', 'claimed', 'picked_up', 'delivered', 'accepted', 'released', 'cancelled', 'rejected', 'expired', 'incident_hold')),
  review_note text,
  created_by uuid not null references command.profiles(id) on delete restrict,
  reviewed_by uuid references command.profiles(id) on delete set null,
  reviewed_at timestamptz,
  claimed_by uuid references command.profiles(id) on delete set null,
  claimed_at timestamptz,
  claim_expires_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  check (pickup_window_end > pickup_window_start),
  check (delivery_window_end > delivery_window_start),
  check (delivery_window_end >= pickup_window_start),
  check (
    (food_category = 'hot_prepared' and temperature_class = 'hot')
    or (food_category = 'chilled' and temperature_class = 'chilled')
    or (food_category = 'frozen' and temperature_class = 'frozen')
    or (food_category = 'shelf_stable' and temperature_class = 'not_controlled')
    or food_category in ('whole_produce', 'bakery', 'mixed')
  )
);

create table if not exists command.food_rescue_checkpoints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rescue_id uuid not null references command.food_rescues(id) on delete cascade,
  stage text not null check (stage in ('pickup', 'delivery', 'acceptance')),
  packaging_ok boolean not null,
  label_ok boolean not null,
  temperature_f numeric,
  temperature_control_maintained boolean not null,
  contamination_concern boolean not null,
  quantity_observed numeric check (quantity_observed is null or quantity_observed >= 0),
  note text not null check (char_length(btrim(note)) between 2 and 1000),
  passed boolean not null,
  recorded_by uuid not null references command.profiles(id) on delete restrict,
  unique (rescue_id, stage)
);

create table if not exists command.food_rescue_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rescue_id uuid not null references command.food_rescues(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text not null,
  note text,
  actor_id uuid references command.profiles(id) on delete set null
);

create index if not exists food_rescues_status_deadline_idx
  on command.food_rescues(status, pickup_window_end);
create index if not exists food_rescues_creator_idx
  on command.food_rescues(created_by, created_at desc);
create index if not exists food_rescues_claimed_idx
  on command.food_rescues(claimed_by, status);
create index if not exists food_rescue_events_rescue_idx
  on command.food_rescue_events(rescue_id, created_at);

drop trigger if exists food_rescues_touch_updated_at on command.food_rescues;
create trigger food_rescues_touch_updated_at
  before update on command.food_rescues
  for each row execute function command.touch_updated_at();

create or replace function command.record_food_rescue_status_change()
returns trigger
language plpgsql
security definer
set search_path = command, public
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into command.food_rescue_events (rescue_id, event_type, from_status, to_status, actor_id)
    values (
      new.id,
      case when tg_op = 'INSERT' then 'created' else 'status_changed' end,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists food_rescues_record_status on command.food_rescues;
create trigger food_rescues_record_status
  after insert or update of status on command.food_rescues
  for each row execute function command.record_food_rescue_status_change();

create or replace function command.list_food_rescues()
returns table (
  id uuid,
  created_at timestamptz,
  source_name text,
  receiving_group text,
  food_category text,
  description text,
  quantity numeric,
  unit text,
  temperature_class text,
  pickup_window_start timestamptz,
  pickup_window_end timestamptz,
  public_neighborhood text,
  delivery_window_start timestamptz,
  delivery_window_end timestamptz,
  status text,
  claim_expires_at timestamptz,
  is_creator boolean,
  is_claimer boolean,
  can_review boolean
)
language plpgsql
security definer
set search_path = command, public
as $$
begin
  return query
  select
    rescue.id,
    rescue.created_at,
    rescue.source_name,
    rescue.receiving_group,
    rescue.food_category,
    rescue.description,
    rescue.quantity,
    rescue.unit,
    rescue.temperature_class,
    rescue.pickup_window_start,
    rescue.pickup_window_end,
    rescue.public_neighborhood,
    rescue.delivery_window_start,
    rescue.delivery_window_end,
    case
      when rescue.status = 'open' and rescue.pickup_window_end <= now() then 'expired'
      when rescue.status = 'claimed' and rescue.claim_expires_at <= now() and rescue.pickup_window_end > now() then 'open'
      else rescue.status
    end,
    rescue.claim_expires_at,
    coalesce(rescue.created_by = auth.uid(), false),
    coalesce(rescue.claimed_by = auth.uid(), false),
    coalesce(command.current_role() = 'admin', false)
  from command.food_rescues as rescue
  where rescue.status in ('open', 'claimed', 'picked_up', 'delivered', 'accepted', 'expired')
     or rescue.created_by = auth.uid()
     or rescue.claimed_by = auth.uid()
     or command.current_role() = 'admin'
  order by
    case when rescue.status in ('open', 'claimed', 'picked_up', 'delivered') then 0 else 1 end,
    rescue.pickup_window_end asc,
    rescue.created_at desc;
end;
$$;

create or replace function command.get_food_rescue_private(p_rescue_id uuid)
returns table (
  rescue_id uuid,
  source_partner_id uuid,
  packaging_condition text,
  allergen_information text,
  date_mark text,
  handling_notes text,
  private_pickup_instructions text,
  vehicle_requirements text,
  storage_requirements text,
  accessibility_notes text,
  review_note text
)
language sql
stable
security definer
set search_path = command, public
as $$
  select
    rescue.id,
    rescue.source_partner_id,
    rescue.packaging_condition,
    rescue.allergen_information,
    rescue.date_mark,
    rescue.handling_notes,
    rescue.private_pickup_instructions,
    rescue.vehicle_requirements,
    rescue.storage_requirements,
    rescue.accessibility_notes,
    rescue.review_note
  from command.food_rescues as rescue
  where rescue.id = p_rescue_id
    and auth.uid() is not null
    and (
      rescue.created_by = auth.uid()
      or rescue.claimed_by = auth.uid()
      or command.current_role() = 'admin'
    );
$$;

create or replace function command.review_food_rescue(p_rescue_id uuid, p_approved boolean, p_note text, p_safety_confirmed boolean)
returns command.food_rescues
language plpgsql
security definer
set search_path = command, public
as $$
declare
  result command.food_rescues;
begin
  if command.current_role() is distinct from 'admin' then
    raise exception 'Coordinator review permission is required';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'A review note is required';
  end if;
  if p_approved and not coalesce(p_safety_confirmed, false) then
    raise exception 'Partner eligibility and the handling plan must be confirmed before publication';
  end if;

  update command.food_rescues as rescue
  set
    status = case when p_approved then 'open' else 'rejected' end,
    review_note = btrim(p_note),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where rescue.id = p_rescue_id and rescue.status = 'awaiting_review'
  returning rescue.* into result;

  if result.id is null then
    raise exception 'Rescue was not found or is no longer awaiting review';
  end if;
  return result;
end;
$$;

create or replace function command.claim_food_rescue(p_rescue_id uuid)
returns command.food_rescues
language plpgsql
security definer
set search_path = command, public
as $$
declare
  result command.food_rescues;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update command.food_rescues as rescue
  set status = 'open', claimed_by = null, claimed_at = null, claim_expires_at = null
  where rescue.id = p_rescue_id
    and rescue.status = 'claimed'
    and rescue.claim_expires_at is not null
    and rescue.claim_expires_at <= now()
    and rescue.pickup_window_end > now();

  update command.food_rescues as rescue
  set
    status = 'claimed',
    claimed_by = auth.uid(),
    claimed_at = now(),
    claim_expires_at = least(rescue.pickup_window_end, now() + interval '2 hours')
  where rescue.id = p_rescue_id
    and rescue.status = 'open'
    and rescue.pickup_window_end > now()
  returning rescue.* into result;

  if result.id is null then
    raise exception 'This rescue is no longer available to claim';
  end if;
  return result;
end;
$$;

create or replace function command.release_food_rescue(p_rescue_id uuid, p_note text)
returns command.food_rescues
language plpgsql
security definer
set search_path = command, public
as $$
declare
  result command.food_rescues;
begin
  if char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'A release note is required';
  end if;

  update command.food_rescues as rescue
  set status = 'open', claimed_by = null, claimed_at = null, claim_expires_at = null
  where rescue.id = p_rescue_id
    and rescue.status = 'claimed'
    and (rescue.claimed_by = auth.uid() or command.current_role() = 'admin')
  returning rescue.* into result;

  if result.id is null then
    raise exception 'Only the assigned Contributor can release this rescue before pickup';
  end if;

  insert into command.food_rescue_events (rescue_id, event_type, from_status, to_status, note, actor_id)
  values (result.id, 'claim_released', 'claimed', 'open', btrim(p_note), auth.uid());
  return result;
end;
$$;

create or replace function command.record_food_rescue_checkpoint(
  p_rescue_id uuid,
  p_stage text,
  p_packaging_ok boolean,
  p_label_ok boolean,
  p_temperature_f numeric,
  p_temperature_control_maintained boolean,
  p_contamination_concern boolean,
  p_quantity_observed numeric,
  p_note text
)
returns command.food_rescues
language plpgsql
security definer
set search_path = command, public
as $$
declare
  rescue command.food_rescues;
  passed boolean;
  next_status text;
begin
  select * into rescue from command.food_rescues where id = p_rescue_id for update;
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if rescue.id is null then
    raise exception 'Rescue not found';
  end if;
  if p_stage not in ('pickup', 'delivery', 'acceptance') then
    raise exception 'Invalid checkpoint stage';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) < 2 then
    raise exception 'A checkpoint note is required';
  end if;
  if p_quantity_observed is null or p_quantity_observed < 0 then
    raise exception 'Observed quantity is required';
  end if;
  if p_packaging_ok is null
    or p_label_ok is null
    or p_temperature_control_maintained is null
    or p_contamination_concern is null then
    raise exception 'Every safety check must be answered';
  end if;
  if rescue.temperature_class in ('chilled', 'hot') and p_temperature_f is null then
    raise exception 'A measured temperature is required for chilled and hot food';
  end if;

  if p_stage = 'pickup' then
    if rescue.status <> 'claimed' or rescue.claimed_by <> auth.uid() then
      raise exception 'Only the assigned Contributor can record pickup';
    end if;
    next_status := 'picked_up';
  elsif p_stage = 'delivery' then
    if rescue.status <> 'picked_up' or rescue.claimed_by <> auth.uid() then
      raise exception 'Only the assigned Contributor can record delivery';
    end if;
    next_status := 'delivered';
  else
    if rescue.status <> 'delivered' or not (rescue.created_by = auth.uid() or coalesce(command.current_role() = 'admin', false)) then
      raise exception 'Only the receiving coordinator can accept delivery';
    end if;
    next_status := 'accepted';
  end if;

  passed := p_packaging_ok
    and p_label_ok
    and p_temperature_control_maintained
    and not p_contamination_concern
    and (rescue.temperature_class <> 'chilled' or p_temperature_f <= 41)
    and (rescue.temperature_class <> 'hot' or p_temperature_f >= 135);

  insert into command.food_rescue_checkpoints (
    rescue_id, stage, packaging_ok, label_ok, temperature_f,
    temperature_control_maintained, contamination_concern, quantity_observed,
    note, passed, recorded_by
  ) values (
    rescue.id, p_stage, p_packaging_ok, p_label_ok, p_temperature_f,
    p_temperature_control_maintained, p_contamination_concern, p_quantity_observed,
    btrim(p_note), passed, auth.uid()
  );

  update command.food_rescues as target
  set
    status = case when passed then next_status else 'incident_hold' end,
    picked_up_at = case when p_stage = 'pickup' and passed then now() else target.picked_up_at end,
    delivered_at = case when p_stage = 'delivery' and passed then now() else target.delivered_at end,
    accepted_at = case when p_stage = 'acceptance' and passed then now() else target.accepted_at end,
    claim_expires_at = case when p_stage = 'pickup' then null else target.claim_expires_at end
  where target.id = rescue.id
  returning target.* into rescue;

  insert into command.food_rescue_events (rescue_id, event_type, from_status, to_status, note, actor_id)
  values (rescue.id, p_stage || '_checkpoint', case p_stage when 'pickup' then 'claimed' when 'delivery' then 'picked_up' else 'delivered' end, rescue.status, btrim(p_note), auth.uid());
  return rescue;
end;
$$;

create or replace function command.cancel_food_rescue(p_rescue_id uuid, p_note text)
returns command.food_rescues
language plpgsql
security definer
set search_path = command, public
as $$
declare
  result command.food_rescues;
begin
  if char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'A cancellation note is required';
  end if;

  update command.food_rescues as rescue
  set status = 'cancelled', cancelled_at = now(), claimed_by = null, claimed_at = null, claim_expires_at = null
  where rescue.id = p_rescue_id
    and rescue.status in ('awaiting_review', 'open', 'claimed')
    and (rescue.created_by = auth.uid() or command.current_role() = 'admin')
  returning rescue.* into result;

  if result.id is null then
    raise exception 'Rescue cannot be cancelled by this account or at this stage';
  end if;

  insert into command.food_rescue_events (rescue_id, event_type, from_status, to_status, note, actor_id)
  values (result.id, 'cancelled', null, 'cancelled', btrim(p_note), auth.uid());
  return result;
end;
$$;

create or replace function command.resolve_food_rescue_hold(p_rescue_id uuid, p_disposition text, p_note text)
returns command.food_rescues
language plpgsql
security definer
set search_path = command, public
as $$
declare
  result command.food_rescues;
begin
  if command.current_role() is distinct from 'admin' then
    raise exception 'Coordinator incident permission is required';
  end if;
  if p_disposition not in ('rejected', 'cancelled') then
    raise exception 'Incident disposition must be rejected or cancelled';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'An incident disposition note is required';
  end if;

  update command.food_rescues as rescue
  set
    status = p_disposition,
    review_note = concat_ws(E'\n', rescue.review_note, 'Incident disposition: ' || btrim(p_note)),
    claimed_by = null,
    claimed_at = null,
    claim_expires_at = null,
    cancelled_at = case when p_disposition = 'cancelled' then now() else rescue.cancelled_at end
  where rescue.id = p_rescue_id and rescue.status = 'incident_hold'
  returning rescue.* into result;

  if result.id is null then
    raise exception 'Rescue was not found or is not on incident hold';
  end if;

  insert into command.food_rescue_events (rescue_id, event_type, from_status, to_status, note, actor_id)
  values (result.id, 'incident_resolved', 'incident_hold', p_disposition, btrim(p_note), auth.uid());
  return result;
end;
$$;

alter table command.food_rescues enable row level security;
alter table command.food_rescue_checkpoints enable row level security;
alter table command.food_rescue_events enable row level security;

drop policy if exists food_rescues_assigned_read on command.food_rescues;
create policy food_rescues_assigned_read on command.food_rescues
  for select using (
    created_by = auth.uid()
    or claimed_by = auth.uid()
    or command.current_role() = 'admin'
  );

drop policy if exists food_rescues_authenticated_submit on command.food_rescues;
create policy food_rescues_authenticated_submit on command.food_rescues
  for insert with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and status = 'awaiting_review'
    and pickup_window_end > now()
    and delivery_window_end > now()
  );

drop policy if exists food_rescue_checkpoints_assigned_read on command.food_rescue_checkpoints;
create policy food_rescue_checkpoints_assigned_read on command.food_rescue_checkpoints
  for select using (
    exists (
      select 1 from command.food_rescues as rescue
      where rescue.id = rescue_id
        and (rescue.created_by = auth.uid() or rescue.claimed_by = auth.uid() or command.current_role() = 'admin')
    )
  );

drop policy if exists food_rescue_events_assigned_read on command.food_rescue_events;
create policy food_rescue_events_assigned_read on command.food_rescue_events
  for select using (
    exists (
      select 1 from command.food_rescues as rescue
      where rescue.id = rescue_id
        and (rescue.created_by = auth.uid() or rescue.claimed_by = auth.uid() or command.current_role() = 'admin')
    )
  );

grant select on command.food_rescues, command.food_rescue_checkpoints, command.food_rescue_events to authenticated;
grant insert (
  source_partner_id, source_name, receiving_group, food_category, description,
  quantity, unit, packaging_condition, allergen_information, date_mark,
  temperature_class, handling_notes, pickup_window_start, pickup_window_end,
  public_neighborhood, private_pickup_instructions, delivery_window_start,
  delivery_window_end, vehicle_requirements, storage_requirements,
  accessibility_notes, status, created_by
) on command.food_rescues to authenticated;
revoke update, delete on command.food_rescues from anon, authenticated;
revoke insert, update, delete on command.food_rescue_checkpoints, command.food_rescue_events from anon, authenticated;

revoke execute on function command.list_food_rescues() from public;
revoke execute on function command.get_food_rescue_private(uuid) from public;
revoke execute on function command.review_food_rescue(uuid, boolean, text, boolean) from public;
revoke execute on function command.claim_food_rescue(uuid) from public;
revoke execute on function command.release_food_rescue(uuid, text) from public;
revoke execute on function command.record_food_rescue_checkpoint(uuid, text, boolean, boolean, numeric, boolean, boolean, numeric, text) from public;
revoke execute on function command.cancel_food_rescue(uuid, text) from public;
revoke execute on function command.resolve_food_rescue_hold(uuid, text, text) from public;

grant execute on function command.list_food_rescues() to anon, authenticated;
grant execute on function command.get_food_rescue_private(uuid) to authenticated;
grant execute on function command.review_food_rescue(uuid, boolean, text, boolean) to authenticated;
grant execute on function command.claim_food_rescue(uuid) to authenticated;
grant execute on function command.release_food_rescue(uuid, text) to authenticated;
grant execute on function command.record_food_rescue_checkpoint(uuid, text, boolean, boolean, numeric, boolean, boolean, numeric, text) to authenticated;
grant execute on function command.cancel_food_rescue(uuid, text) to authenticated;
grant execute on function command.resolve_food_rescue_hold(uuid, text, text) to authenticated;

comment on table command.food_rescues is 'Safety-reviewed WXL:FOOD rescue opportunities with private assignment details and an audited operational state.';
comment on table command.food_rescue_checkpoints is 'Pickup, delivery, and receiving safety evidence for a WXL:FOOD rescue.';
comment on table command.food_rescue_events is 'Immutable operational event history for WXL:FOOD rescues.';
