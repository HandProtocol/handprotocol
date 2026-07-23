/*
  038_wxl_compost_route_gate.sql
  Prevents assignment when collected compost has no later route destination.
*/

create or replace function command.require_food_harvest_compost_dropoff()
returns trigger
language plpgsql
set search_path = command, public
as $$
declare last_compost_pickup_order integer;
begin
  if new.status = 'assigned' and old.status is distinct from new.status then
    select max(stop_order) into last_compost_pickup_order
    from command.food_harvest_run_stops
    where run_id = new.id and compost_pickup_requested;

    if last_compost_pickup_order is not null and not exists (
      select 1 from command.food_harvest_run_stops
      where run_id = new.id
        and stop_type = 'compost_dropoff'
        and stop_order > last_compost_pickup_order
    ) then
      raise exception 'A compost drop-off must follow every planned compost pickup';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists food_harvest_runs_require_compost_dropoff on command.food_harvest_runs;
create trigger food_harvest_runs_require_compost_dropoff
  before update of status on command.food_harvest_runs
  for each row execute function command.require_food_harvest_compost_dropoff();

comment on function command.require_food_harvest_compost_dropoff() is 'Requires a later compost destination before assigning a run with compost-return deliveries.';
