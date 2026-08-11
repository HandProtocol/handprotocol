/*
  031_wxl_inventory.sql
  Traceable inventory lots derived only from accepted rescue checkpoints.
  Quantities change through restricted functions and immutable ledger entries.
*/

create table if not exists command.food_inventory_lots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rescue_id uuid not null unique references command.food_rescues(id) on delete restrict,
  source_name text not null,
  description text not null,
  food_category text not null,
  temperature_class text not null check (temperature_class in ('not_controlled', 'chilled', 'frozen', 'hot')),
  allergen_information text not null,
  date_mark text not null,
  unit text not null,
  received_quantity numeric not null check (received_quantity > 0),
  current_quantity numeric not null check (current_quantity >= 0),
  reserved_quantity numeric not null default 0 check (reserved_quantity >= 0),
  storage_location text not null check (char_length(btrim(storage_location)) between 2 and 300),
  storage_condition text not null check (char_length(btrim(storage_condition)) between 2 and 1000),
  minimum_temperature_f numeric,
  maximum_temperature_f numeric,
  received_at timestamptz not null,
  use_by_at timestamptz not null,
  status text not null default 'available' check (status in ('available', 'allocated', 'depleted', 'discarded', 'hold', 'expired')),
  created_by uuid not null references command.profiles(id) on delete restrict,
  check (reserved_quantity <= current_quantity),
  check (use_by_at > received_at),
  check (minimum_temperature_f is null or maximum_temperature_f is null or minimum_temperature_f <= maximum_temperature_f),
  check (
    (temperature_class = 'not_controlled' and minimum_temperature_f is null and maximum_temperature_f is null)
    or (temperature_class = 'chilled' and maximum_temperature_f is not null and maximum_temperature_f <= 41)
    or (temperature_class = 'frozen' and maximum_temperature_f is not null and maximum_temperature_f <= 32)
    or (temperature_class = 'hot' and minimum_temperature_f is not null and minimum_temperature_f >= 135)
  )
);

create table if not exists command.food_inventory_allocations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lot_id uuid not null references command.food_inventory_lots(id) on delete restrict,
  recipient_group text not null check (char_length(btrim(recipient_group)) between 2 and 200),
  quantity numeric not null check (quantity > 0),
  pickup_window_start timestamptz not null,
  pickup_window_end timestamptz not null,
  private_handoff_instructions text not null check (char_length(btrim(private_handoff_instructions)) between 3 and 1500),
  status text not null default 'reserved' check (status in ('reserved', 'fulfilled', 'cancelled')),
  note text not null check (char_length(btrim(note)) between 3 and 1000),
  created_by uuid not null references command.profiles(id) on delete restrict,
  fulfilled_by uuid references command.profiles(id) on delete set null,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  check (pickup_window_end > pickup_window_start)
);

create table if not exists command.food_inventory_condition_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lot_id uuid not null references command.food_inventory_lots(id) on delete restrict,
  measured_temperature_f numeric,
  packaging_ok boolean not null,
  contamination_concern boolean not null,
  storage_control_maintained boolean not null,
  passed boolean not null,
  note text not null check (char_length(btrim(note)) between 3 and 1000),
  recorded_by uuid not null references command.profiles(id) on delete restrict
);

create table if not exists command.food_inventory_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lot_id uuid not null references command.food_inventory_lots(id) on delete restrict,
  allocation_id uuid references command.food_inventory_allocations(id) on delete set null,
  event_type text not null check (event_type in ('received', 'reserved', 'reservation_released', 'distributed', 'discarded', 'corrected', 'condition_hold', 'hold_released', 'expired')),
  quantity_delta numeric not null,
  balance_after numeric not null check (balance_after >= 0),
  reserved_after numeric not null check (reserved_after >= 0),
  destination_group text,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  actor_id uuid references command.profiles(id) on delete set null
);

create index if not exists food_inventory_lots_status_use_by_idx on command.food_inventory_lots(status, use_by_at);
create index if not exists food_inventory_allocations_lot_idx on command.food_inventory_allocations(lot_id, status);
create index if not exists food_inventory_condition_checks_lot_idx on command.food_inventory_condition_checks(lot_id, created_at desc);
create index if not exists food_inventory_ledger_lot_idx on command.food_inventory_ledger(lot_id, created_at);

drop trigger if exists food_inventory_lots_touch_updated_at on command.food_inventory_lots;
create trigger food_inventory_lots_touch_updated_at before update on command.food_inventory_lots
  for each row execute function command.touch_updated_at();

create or replace function command.list_food_inventory_lots()
returns table (
  id uuid, created_at timestamptz, rescue_id uuid, source_name text, description text,
  food_category text, temperature_class text, unit text, received_quantity numeric,
  current_quantity numeric, reserved_quantity numeric, available_quantity numeric,
  storage_location text, storage_condition text, received_at timestamptz,
  minimum_temperature_f numeric, maximum_temperature_f numeric,
  use_by_at timestamptz, status text
)
language sql
stable
security definer
set search_path = command, public
as $$
  select
    lot.id, lot.created_at, lot.rescue_id, lot.source_name, lot.description,
    lot.food_category, lot.temperature_class, lot.unit, lot.received_quantity,
    lot.current_quantity, lot.reserved_quantity,
    lot.current_quantity - lot.reserved_quantity,
    lot.storage_location, lot.storage_condition, lot.received_at,
    lot.minimum_temperature_f, lot.maximum_temperature_f, lot.use_by_at,
    case when lot.use_by_at <= now() and lot.status not in ('depleted', 'discarded') then 'expired' else lot.status end
  from command.food_inventory_lots as lot
  where command.current_role() = 'admin'
  order by
    case when lot.status in ('hold', 'expired') or lot.use_by_at <= now() then 0 else 1 end,
    lot.use_by_at asc;
$$;

create or replace function command.get_food_inventory_lot_private(p_lot_id uuid)
returns table (
  lot_id uuid, allergen_information text, date_mark text,
  allocations jsonb, condition_checks jsonb, ledger jsonb
)
language sql
stable
security definer
set search_path = command, public
as $$
  select
    lot.id, lot.allergen_information, lot.date_mark,
    coalesce((select jsonb_agg(to_jsonb(allocation) order by allocation.created_at desc) from command.food_inventory_allocations as allocation where allocation.lot_id = lot.id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(check_record) order by check_record.created_at desc) from command.food_inventory_condition_checks as check_record where check_record.lot_id = lot.id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(entry) order by entry.created_at desc) from command.food_inventory_ledger as entry where entry.lot_id = lot.id), '[]'::jsonb)
  from command.food_inventory_lots as lot
  where lot.id = p_lot_id and command.current_role() = 'admin';
$$;

create or replace function command.create_food_inventory_lot_from_rescue(
  p_rescue_id uuid, p_storage_location text, p_storage_condition text,
  p_minimum_temperature_f numeric, p_maximum_temperature_f numeric,
  p_use_by_at timestamptz, p_note text
)
returns command.food_inventory_lots
language plpgsql
security definer
set search_path = command, public
as $$
declare rescue command.food_rescues; checkpoint command.food_rescue_checkpoints; result command.food_inventory_lots;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Inventory coordinator permission is required'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'A receiving note is required'; end if;
  select * into rescue from command.food_rescues where id = p_rescue_id for update;
  if rescue.id is null or rescue.status <> 'accepted' then raise exception 'Only an accepted rescue can create inventory'; end if;
  select * into checkpoint from command.food_rescue_checkpoints where rescue_id = rescue.id and stage = 'acceptance';
  if checkpoint.id is null or not checkpoint.passed or checkpoint.quantity_observed is null or checkpoint.quantity_observed <= 0 then raise exception 'A passing acceptance checkpoint with quantity is required'; end if;
  if p_use_by_at <= coalesce(rescue.accepted_at, checkpoint.created_at) then raise exception 'Use-by time must be after acceptance'; end if;
  insert into command.food_inventory_lots (
    rescue_id, source_name, description, food_category, temperature_class,
    allergen_information, date_mark, unit, received_quantity, current_quantity,
    storage_location, storage_condition, minimum_temperature_f,
    maximum_temperature_f, received_at, use_by_at, created_by
  ) values (
    rescue.id, rescue.source_name, rescue.description, rescue.food_category,
    rescue.temperature_class, rescue.allergen_information, rescue.date_mark,
    rescue.unit, checkpoint.quantity_observed, checkpoint.quantity_observed,
    btrim(p_storage_location), btrim(p_storage_condition),
    p_minimum_temperature_f, p_maximum_temperature_f,
    coalesce(rescue.accepted_at, checkpoint.created_at), p_use_by_at, auth.uid()
  ) returning * into result;
  insert into command.food_inventory_ledger (
    lot_id, event_type, quantity_delta, balance_after, reserved_after, reason, actor_id
  ) values (
    result.id, 'received', result.received_quantity, result.current_quantity,
    result.reserved_quantity, btrim(p_note), auth.uid()
  );
  return result;
end;
$$;

create or replace function command.allocate_food_inventory(
  p_lot_id uuid, p_recipient_group text, p_quantity numeric,
  p_pickup_window_start timestamptz, p_pickup_window_end timestamptz,
  p_private_handoff_instructions text, p_note text
)
returns command.food_inventory_allocations
language plpgsql
security definer
set search_path = command, public
as $$
declare lot command.food_inventory_lots; allocation command.food_inventory_allocations;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Inventory coordinator permission is required'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Allocation quantity must be positive'; end if;
  if p_pickup_window_start <= now() or p_pickup_window_end <= p_pickup_window_start then raise exception 'Allocation window must be future and ordered'; end if;
  select * into lot from command.food_inventory_lots where id = p_lot_id for update;
  if lot.id is null or lot.status not in ('available', 'allocated') then raise exception 'Lot is not available for allocation'; end if;
  if lot.use_by_at <= p_pickup_window_end then raise exception 'Allocation must finish before the lot use-by time'; end if;
  if lot.current_quantity - lot.reserved_quantity < p_quantity then raise exception 'Allocation exceeds available quantity'; end if;
  insert into command.food_inventory_allocations (
    lot_id, recipient_group, quantity, pickup_window_start, pickup_window_end,
    private_handoff_instructions, note, created_by
  ) values (
    lot.id, btrim(p_recipient_group), p_quantity, p_pickup_window_start,
    p_pickup_window_end, btrim(p_private_handoff_instructions), btrim(p_note), auth.uid()
  ) returning * into allocation;
  update command.food_inventory_lots set reserved_quantity = reserved_quantity + p_quantity,
    status = 'allocated' where id = lot.id returning * into lot;
  insert into command.food_inventory_ledger (
    lot_id, allocation_id, event_type, quantity_delta, balance_after,
    reserved_after, destination_group, reason, actor_id
  ) values (
    lot.id, allocation.id, 'reserved', 0, lot.current_quantity,
    lot.reserved_quantity, allocation.recipient_group, btrim(p_note), auth.uid()
  );
  return allocation;
end;
$$;

create or replace function command.fulfill_food_inventory_allocation(p_allocation_id uuid, p_note text)
returns command.food_inventory_lots
language plpgsql
security definer
set search_path = command, public
as $$
declare allocation command.food_inventory_allocations; lot command.food_inventory_lots; result command.food_inventory_lots;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Inventory coordinator permission is required'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'A distribution evidence note is required'; end if;
  select * into allocation from command.food_inventory_allocations where id = p_allocation_id for update;
  if allocation.id is null or allocation.status <> 'reserved' then raise exception 'Allocation is not reserved'; end if;
  select * into lot from command.food_inventory_lots where id = allocation.lot_id for update;
  if lot.status = 'hold' or lot.use_by_at <= now() then raise exception 'Held or expired inventory cannot be distributed'; end if;
  update command.food_inventory_allocations set status = 'fulfilled', fulfilled_by = auth.uid(), fulfilled_at = now()
  where id = allocation.id;
  update command.food_inventory_lots set
    current_quantity = current_quantity - allocation.quantity,
    reserved_quantity = reserved_quantity - allocation.quantity,
    status = case when current_quantity - allocation.quantity = 0 then 'depleted'
      when reserved_quantity - allocation.quantity > 0 then 'allocated' else 'available' end
  where id = lot.id returning * into result;
  insert into command.food_inventory_ledger (
    lot_id, allocation_id, event_type, quantity_delta, balance_after,
    reserved_after, destination_group, reason, actor_id
  ) values (
    result.id, allocation.id, 'distributed', -allocation.quantity,
    result.current_quantity, result.reserved_quantity, allocation.recipient_group,
    btrim(p_note), auth.uid()
  );
  return result;
end;
$$;

create or replace function command.cancel_food_inventory_allocation(p_allocation_id uuid, p_note text)
returns command.food_inventory_lots
language plpgsql
security definer
set search_path = command, public
as $$
declare allocation command.food_inventory_allocations; result command.food_inventory_lots;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Inventory coordinator permission is required'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'A cancellation note is required'; end if;
  select * into allocation from command.food_inventory_allocations where id = p_allocation_id for update;
  if allocation.id is null or allocation.status <> 'reserved' then raise exception 'Allocation is not reserved'; end if;
  update command.food_inventory_allocations set status = 'cancelled', cancelled_at = now() where id = allocation.id;
  update command.food_inventory_lots set reserved_quantity = reserved_quantity - allocation.quantity,
    status = case when status = 'hold' then 'hold'
      when reserved_quantity - allocation.quantity > 0 then 'allocated' else 'available' end
  where id = allocation.lot_id returning * into result;
  insert into command.food_inventory_ledger (
    lot_id, allocation_id, event_type, quantity_delta, balance_after,
    reserved_after, destination_group, reason, actor_id
  ) values (
    result.id, allocation.id, 'reservation_released', 0, result.current_quantity,
    result.reserved_quantity, allocation.recipient_group, btrim(p_note), auth.uid()
  );
  return result;
end;
$$;

create or replace function command.record_food_inventory_condition(
  p_lot_id uuid, p_temperature_f numeric, p_packaging_ok boolean,
  p_contamination_concern boolean, p_storage_control_maintained boolean, p_note text
)
returns command.food_inventory_lots
language plpgsql
security definer
set search_path = command, public
as $$
declare lot command.food_inventory_lots; passed boolean; result command.food_inventory_lots;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Inventory coordinator permission is required'; end if;
  select * into lot from command.food_inventory_lots where id = p_lot_id for update;
  if lot.id is null or lot.status in ('depleted', 'discarded', 'expired') then raise exception 'Lot is not active'; end if;
  if p_packaging_ok is null or p_contamination_concern is null or p_storage_control_maintained is null then raise exception 'Every condition check must be answered'; end if;
  if (lot.minimum_temperature_f is not null or lot.maximum_temperature_f is not null) and p_temperature_f is null then raise exception 'Measured temperature is required'; end if;
  passed := p_packaging_ok and not p_contamination_concern and p_storage_control_maintained
    and (lot.minimum_temperature_f is null or p_temperature_f >= lot.minimum_temperature_f)
    and (lot.maximum_temperature_f is null or p_temperature_f <= lot.maximum_temperature_f);
  insert into command.food_inventory_condition_checks (
    lot_id, measured_temperature_f, packaging_ok, contamination_concern,
    storage_control_maintained, passed, note, recorded_by
  ) values (
    lot.id, p_temperature_f, p_packaging_ok, p_contamination_concern,
    p_storage_control_maintained, passed, btrim(p_note), auth.uid()
  );
  if not passed then
    update command.food_inventory_lots set status = 'hold' where id = lot.id returning * into result;
    insert into command.food_inventory_ledger (lot_id, event_type, quantity_delta, balance_after, reserved_after, reason, actor_id)
    values (result.id, 'condition_hold', 0, result.current_quantity, result.reserved_quantity, btrim(p_note), auth.uid());
  else
    result := lot;
  end if;
  return result;
end;
$$;

create or replace function command.release_food_inventory_hold(p_lot_id uuid, p_note text)
returns command.food_inventory_lots
language plpgsql
security definer
set search_path = command, public
as $$
declare result command.food_inventory_lots;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Inventory coordinator permission is required'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'A hold disposition note is required'; end if;
  if not coalesce((
    select check_record.passed
    from command.food_inventory_condition_checks as check_record
    where check_record.lot_id = p_lot_id
    order by check_record.created_at desc
    limit 1
  ), false) then raise exception 'A newer passing condition check is required before releasing the hold'; end if;
  update command.food_inventory_lots set status = case when reserved_quantity > 0 then 'allocated' else 'available' end
  where id = p_lot_id and status = 'hold' and use_by_at > now() returning * into result;
  if result.id is null then raise exception 'Lot is not on an active hold or has expired'; end if;
  insert into command.food_inventory_ledger (lot_id, event_type, quantity_delta, balance_after, reserved_after, reason, actor_id)
  values (result.id, 'hold_released', 0, result.current_quantity, result.reserved_quantity, btrim(p_note), auth.uid());
  return result;
end;
$$;

create or replace function command.discard_food_inventory(p_lot_id uuid, p_quantity numeric, p_reason text)
returns command.food_inventory_lots
language plpgsql
security definer
set search_path = command, public
as $$
declare lot command.food_inventory_lots; result command.food_inventory_lots;
begin
  if command.current_role() is distinct from 'admin' then raise exception 'Inventory coordinator permission is required'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Discard quantity must be positive'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'A discard reason is required'; end if;
  select * into lot from command.food_inventory_lots where id = p_lot_id for update;
  if lot.id is null or p_quantity > lot.current_quantity - lot.reserved_quantity then raise exception 'Discard exceeds unreserved on-hand quantity'; end if;
  update command.food_inventory_lots set current_quantity = current_quantity - p_quantity,
    status = case when current_quantity - p_quantity = 0 then 'discarded'
      when status = 'hold' then 'hold' when reserved_quantity > 0 then 'allocated' else 'available' end
  where id = lot.id returning * into result;
  insert into command.food_inventory_ledger (lot_id, event_type, quantity_delta, balance_after, reserved_after, reason, actor_id)
  values (result.id, 'discarded', -p_quantity, result.current_quantity, result.reserved_quantity, btrim(p_reason), auth.uid());
  return result;
end;
$$;

alter table command.food_inventory_lots enable row level security;
alter table command.food_inventory_allocations enable row level security;
alter table command.food_inventory_condition_checks enable row level security;
alter table command.food_inventory_ledger enable row level security;

drop policy if exists food_inventory_lots_admin_read on command.food_inventory_lots;
create policy food_inventory_lots_admin_read on command.food_inventory_lots for select using (command.current_role() = 'admin');
drop policy if exists food_inventory_allocations_admin_read on command.food_inventory_allocations;
create policy food_inventory_allocations_admin_read on command.food_inventory_allocations for select using (command.current_role() = 'admin');
drop policy if exists food_inventory_checks_admin_read on command.food_inventory_condition_checks;
create policy food_inventory_checks_admin_read on command.food_inventory_condition_checks for select using (command.current_role() = 'admin');
drop policy if exists food_inventory_ledger_admin_read on command.food_inventory_ledger;
create policy food_inventory_ledger_admin_read on command.food_inventory_ledger for select using (command.current_role() = 'admin');

grant select on command.food_inventory_lots, command.food_inventory_allocations, command.food_inventory_condition_checks, command.food_inventory_ledger to authenticated;
revoke insert, update, delete on command.food_inventory_lots, command.food_inventory_allocations, command.food_inventory_condition_checks, command.food_inventory_ledger from anon, authenticated;

revoke execute on function command.list_food_inventory_lots() from public;
revoke execute on function command.get_food_inventory_lot_private(uuid) from public;
revoke execute on function command.create_food_inventory_lot_from_rescue(uuid, text, text, numeric, numeric, timestamptz, text) from public;
revoke execute on function command.allocate_food_inventory(uuid, text, numeric, timestamptz, timestamptz, text, text) from public;
revoke execute on function command.fulfill_food_inventory_allocation(uuid, text) from public;
revoke execute on function command.cancel_food_inventory_allocation(uuid, text) from public;
revoke execute on function command.record_food_inventory_condition(uuid, numeric, boolean, boolean, boolean, text) from public;
revoke execute on function command.release_food_inventory_hold(uuid, text) from public;
revoke execute on function command.discard_food_inventory(uuid, numeric, text) from public;
grant execute on function command.list_food_inventory_lots() to authenticated;
grant execute on function command.get_food_inventory_lot_private(uuid) to authenticated;
grant execute on function command.create_food_inventory_lot_from_rescue(uuid, text, text, numeric, numeric, timestamptz, text) to authenticated;
grant execute on function command.allocate_food_inventory(uuid, text, numeric, timestamptz, timestamptz, text, text) to authenticated;
grant execute on function command.fulfill_food_inventory_allocation(uuid, text) to authenticated;
grant execute on function command.cancel_food_inventory_allocation(uuid, text) to authenticated;
grant execute on function command.record_food_inventory_condition(uuid, numeric, boolean, boolean, boolean, text) to authenticated;
grant execute on function command.release_food_inventory_hold(uuid, text) to authenticated;
grant execute on function command.discard_food_inventory(uuid, numeric, text) to authenticated;

comment on table command.food_inventory_lots is 'Accepted WXL:FOOD rescue quantities held in traceable storage lots.';
comment on table command.food_inventory_allocations is 'Private reservations and documented group handoffs from inventory lots.';
comment on table command.food_inventory_condition_checks is 'Storage safety checks that automatically hold failed lots.';
comment on table command.food_inventory_ledger is 'Immutable quantity, reservation, distribution, discard, and safety history.';
