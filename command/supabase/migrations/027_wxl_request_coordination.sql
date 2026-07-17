/*
  027_wxl_request_coordination.sql
  Complete the WXL:FOOD community-request coordination loop with structured
  offers, database-maintained counters, owner-controlled decisions, and an
  immutable request status history.
*/

alter table command.food_requests
  add column if not exists offers_count integer not null default 0;

create table if not exists command.food_request_offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  request_id uuid not null references command.food_requests(id) on delete cascade,
  offer_type text not null check (offer_type in ('food', 'transport', 'storage', 'volunteer')),
  item_description text not null check (char_length(btrim(item_description)) between 2 and 1000),
  quantity numeric check (quantity is null or quantity > 0),
  unit text check (unit is null or char_length(btrim(unit)) between 1 and 40),
  availability text not null check (char_length(btrim(availability)) between 2 and 500),
  can_transport boolean not null default false,
  contact_preference text not null default 'in_app' check (contact_preference in ('in_app', 'email')),
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'declined', 'withdrawn')),
  created_by uuid not null references command.profiles(id) on delete cascade,
  decided_by uuid references command.profiles(id) on delete set null,
  decided_at timestamptz,
  check ((quantity is null and unit is null) or (quantity is not null and unit is not null))
);

create table if not exists command.food_request_status_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid not null references command.food_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references command.profiles(id) on delete set null
);

create index if not exists food_request_offers_request_idx
  on command.food_request_offers(request_id, created_at desc);
create index if not exists food_request_offers_status_idx
  on command.food_request_offers(status, created_at desc);
create index if not exists food_request_status_history_request_idx
  on command.food_request_status_history(request_id, created_at);

drop trigger if exists food_request_offers_touch_updated_at on command.food_request_offers;
create trigger food_request_offers_touch_updated_at
  before update on command.food_request_offers
  for each row execute function command.touch_updated_at();

create or replace function command.refresh_food_request_counts()
returns trigger
language plpgsql
security definer
set search_path = command, public
as $$
declare
  target_request_id uuid;
begin
  target_request_id := coalesce(new.request_id, old.request_id);

  update command.food_requests
  set
    responses_count = (select count(*) from command.food_request_messages where request_id = target_request_id),
    supporters_count = (select count(*) from command.food_request_supporters where request_id = target_request_id),
    offers_count = (select count(*) from command.food_request_offers where request_id = target_request_id and status <> 'withdrawn')
  where id = target_request_id;

  return null;
end;
$$;

drop trigger if exists food_messages_refresh_request_counts on command.food_request_messages;
create trigger food_messages_refresh_request_counts
  after insert or delete on command.food_request_messages
  for each row execute function command.refresh_food_request_counts();

drop trigger if exists food_supporters_refresh_request_counts on command.food_request_supporters;
create trigger food_supporters_refresh_request_counts
  after insert or delete on command.food_request_supporters
  for each row execute function command.refresh_food_request_counts();

drop trigger if exists food_offers_refresh_request_counts on command.food_request_offers;
create trigger food_offers_refresh_request_counts
  after insert or update of status or delete on command.food_request_offers
  for each row execute function command.refresh_food_request_counts();

update command.food_requests as requests
set
  responses_count = (select count(*) from command.food_request_messages where request_id = requests.id),
  supporters_count = (select count(*) from command.food_request_supporters where request_id = requests.id),
  offers_count = (select count(*) from command.food_request_offers where request_id = requests.id and status <> 'withdrawn');

create or replace function command.record_food_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = command, public
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into command.food_request_status_history (request_id, from_status, to_status, changed_by)
    values (new.id, case when tg_op = 'INSERT' then null else old.status end, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists food_requests_record_status on command.food_requests;
create trigger food_requests_record_status
  after insert or update of status on command.food_requests
  for each row execute function command.record_food_request_status_change();

insert into command.food_request_status_history (request_id, from_status, to_status, changed_by)
select requests.id, null, requests.status, requests.created_by
from command.food_requests as requests
where not exists (
  select 1 from command.food_request_status_history as history where history.request_id = requests.id
);

create or replace function command.decide_food_request_offer(p_offer_id uuid, p_decision text)
returns command.food_request_offers
language plpgsql
security definer
set search_path = command, public
as $$
declare
  result command.food_request_offers;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_decision not in ('accepted', 'declined') then
    raise exception 'Offer decision must be accepted or declined';
  end if;

  update command.food_request_offers as offers
  set status = p_decision, decided_by = auth.uid(), decided_at = now()
  where offers.id = p_offer_id
    and offers.status = 'proposed'
    and exists (
      select 1 from command.food_requests as requests
      where requests.id = offers.request_id
        and (requests.created_by = auth.uid() or command.current_role() = 'admin')
        and (p_decision = 'declined' or requests.status in ('open', 'in_progress'))
    )
  returning offers.* into result;

  if result.id is null then
    raise exception 'Offer was not found, is already decided, or you do not own the request';
  end if;
  if p_decision = 'accepted' then
    update command.food_requests
    set status = 'in_progress'
    where id = result.request_id and status = 'open';
  end if;
  return result;
end;
$$;

create or replace function command.withdraw_food_request_offer(p_offer_id uuid)
returns command.food_request_offers
language plpgsql
security definer
set search_path = command, public
as $$
declare
  result command.food_request_offers;
begin
  update command.food_request_offers as offers
  set status = 'withdrawn', decided_by = auth.uid(), decided_at = now()
  where offers.id = p_offer_id
    and offers.created_by = auth.uid()
    and offers.status = 'proposed'
  returning offers.* into result;

  if result.id is null then
    raise exception 'Offer was not found, is already decided, or does not belong to you';
  end if;
  return result;
end;
$$;

create or replace function command.change_food_request_status(p_request_id uuid, p_status text)
returns command.food_requests
language plpgsql
security definer
set search_path = command, public
as $$
declare
  result command.food_requests;
begin
  if p_status not in ('open', 'in_progress', 'fulfilled', 'closed') then
    raise exception 'Invalid request status';
  end if;

  update command.food_requests as requests
  set status = p_status
  where requests.id = p_request_id
    and (requests.created_by = auth.uid() or command.current_role() = 'admin')
    and (
      (requests.status = 'open' and p_status in ('in_progress', 'closed'))
      or (requests.status = 'in_progress' and p_status in ('open', 'fulfilled', 'closed'))
      or (requests.status = 'fulfilled' and p_status in ('open', 'closed'))
      or (requests.status = 'closed' and p_status = 'open')
    )
  returning requests.* into result;

  if result.id is null then
    raise exception 'Request was not found or you do not own it';
  end if;
  return result;
end;
$$;

alter table command.food_request_offers enable row level security;
alter table command.food_request_status_history enable row level security;

drop policy if exists food_offers_public_request_read on command.food_request_offers;
create policy food_offers_public_request_read on command.food_request_offers
  for select using (
    exists (
      select 1 from command.food_requests as requests
      where requests.id = request_id and requests.is_public = true
    )
  );

drop policy if exists food_offers_authenticated_insert on command.food_request_offers;
create policy food_offers_authenticated_insert on command.food_request_offers
  for insert with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and status = 'proposed'
    and exists (
      select 1 from command.food_requests as requests
      where requests.id = request_id
        and requests.is_public = true
        and requests.status in ('open', 'in_progress')
    )
  );

drop policy if exists food_messages_authenticated_insert on command.food_request_messages;
create policy food_messages_authenticated_insert on command.food_request_messages
  for insert with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and exists (
      select 1 from command.food_requests as requests
      where requests.id = request_id
        and requests.is_public = true
        and requests.status in ('open', 'in_progress')
    )
  );

drop policy if exists food_supporters_authenticated_insert on command.food_request_supporters;
create policy food_supporters_authenticated_insert on command.food_request_supporters
  for insert with check (
    auth.uid() is not null
    and supporter_id = auth.uid()
    and exists (
      select 1 from command.food_requests as requests
      where requests.id = request_id
        and requests.is_public = true
        and requests.status in ('open', 'in_progress')
    )
  );

drop policy if exists food_status_history_public_request_read on command.food_request_status_history;
create policy food_status_history_public_request_read on command.food_request_status_history
  for select using (
    exists (
      select 1 from command.food_requests as requests
      where requests.id = request_id and requests.is_public = true
    )
  );

drop policy if exists food_requests_owner_update on command.food_requests;
create policy food_requests_owner_update on command.food_requests
  for update using (created_by = auth.uid())
  with check (created_by = auth.uid());

grant select on command.food_request_offers, command.food_request_status_history to anon, authenticated;
grant insert on command.food_request_offers to authenticated;
revoke update on command.food_requests from authenticated;
grant update (title, group_name, neighborhood, category, detail, priority, is_public) on command.food_requests to authenticated;
revoke update, delete on command.food_request_offers from anon, authenticated;
revoke execute on function command.decide_food_request_offer(uuid, text) from public, anon;
revoke execute on function command.withdraw_food_request_offer(uuid) from public, anon;
revoke execute on function command.change_food_request_status(uuid, text) from public, anon;
grant execute on function command.decide_food_request_offer(uuid, text) to authenticated;
grant execute on function command.withdraw_food_request_offer(uuid) to authenticated;
grant execute on function command.change_food_request_status(uuid, text) to authenticated;

comment on table command.food_request_offers is 'Structured food, transport, storage, and volunteer offers attached to a WXL:FOOD request.';
comment on table command.food_request_status_history is 'Immutable status history for auditable WXL:FOOD request coordination.';
