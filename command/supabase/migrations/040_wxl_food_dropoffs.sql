-- WXL:FOOD community drop-off log and recognition board.
-- Exact household locations do not belong here. Public visibility is opt-in
-- for each drop-off, and public leaderboard identity is a separate opt-in.

create table if not exists command.food_dropoffs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dropped_off_at timestamptz not null default now(),
  destination_name text not null check (char_length(btrim(destination_name)) between 2 and 120),
  address text check (address is null or char_length(btrim(address)) between 5 and 240),
  neighborhood text not null check (char_length(btrim(neighborhood)) between 2 and 100),
  latitude numeric check (latitude is null or latitude between 30.05 and 30.55),
  longitude numeric check (longitude is null or longitude between -98.00 and -97.45),
  note text not null check (char_length(btrim(note)) between 2 and 280),
  quantity numeric check (quantity is null or quantity > 0),
  quantity_unit text check (quantity_unit is null or quantity_unit in ('lb', 'boxes', 'bags', 'meals', 'items')),
  public_location boolean not null default false,
  created_by uuid not null references command.profiles(id) on delete cascade,
  check (address is not null or (latitude is not null and longitude is not null)),
  check ((quantity is null and quantity_unit is null) or (quantity is not null and quantity_unit is not null))
);

create table if not exists command.food_dropoff_preferences (
  profile_id uuid primary key references command.profiles(id) on delete cascade,
  public_leaderboard boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists food_dropoffs_created_by_idx
  on command.food_dropoffs(created_by, dropped_off_at desc);
create index if not exists food_dropoffs_public_idx
  on command.food_dropoffs(public_location, dropped_off_at desc);
create index if not exists food_dropoffs_location_idx
  on command.food_dropoffs(latitude, longitude)
  where latitude is not null and longitude is not null;

drop trigger if exists food_dropoffs_touch_updated_at on command.food_dropoffs;
create trigger food_dropoffs_touch_updated_at before update on command.food_dropoffs
  for each row execute function command.touch_updated_at();

alter table command.food_dropoffs enable row level security;
alter table command.food_dropoff_preferences enable row level security;

drop policy if exists food_dropoffs_public_read on command.food_dropoffs;
create policy food_dropoffs_public_read on command.food_dropoffs
  for select using (public_location = true);
drop policy if exists food_dropoffs_member_read on command.food_dropoffs;
create policy food_dropoffs_member_read on command.food_dropoffs
  for select using (auth.uid() is not null);
drop policy if exists food_dropoffs_owner_insert on command.food_dropoffs;
create policy food_dropoffs_owner_insert on command.food_dropoffs
  for insert with check (auth.uid() is not null and created_by = auth.uid());
drop policy if exists food_dropoffs_owner_update on command.food_dropoffs;
create policy food_dropoffs_owner_update on command.food_dropoffs
  for update using (created_by = auth.uid() or command.current_role() = 'admin')
  with check (created_by = auth.uid() or command.current_role() = 'admin');
drop policy if exists food_dropoffs_owner_delete on command.food_dropoffs;
create policy food_dropoffs_owner_delete on command.food_dropoffs
  for delete using (created_by = auth.uid() or command.current_role() = 'admin');

drop policy if exists food_dropoff_preferences_owner_read on command.food_dropoff_preferences;
create policy food_dropoff_preferences_owner_read on command.food_dropoff_preferences
  for select using (profile_id = auth.uid() or command.current_role() = 'admin');
drop policy if exists food_dropoff_preferences_owner_insert on command.food_dropoff_preferences;
create policy food_dropoff_preferences_owner_insert on command.food_dropoff_preferences
  for insert with check (profile_id = auth.uid());
drop policy if exists food_dropoff_preferences_owner_update on command.food_dropoff_preferences;
create policy food_dropoff_preferences_owner_update on command.food_dropoff_preferences
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create or replace function command.list_food_dropoffs(p_public_only boolean default false)
returns table (
  id uuid,
  created_at timestamptz,
  dropped_off_at timestamptz,
  destination_name text,
  address text,
  neighborhood text,
  latitude numeric,
  longitude numeric,
  note text,
  quantity numeric,
  quantity_unit text,
  public_location boolean,
  created_by uuid,
  contributor_name text
)
language plpgsql
stable
security definer
set search_path = command, public
as $$
declare
  public_request boolean := p_public_only or auth.uid() is null;
begin
  return query
  select
    dropoff.id,
    dropoff.created_at,
    dropoff.dropped_off_at,
    dropoff.destination_name,
    dropoff.address,
    dropoff.neighborhood,
    dropoff.latitude,
    dropoff.longitude,
    dropoff.note,
    dropoff.quantity,
    dropoff.quantity_unit,
    dropoff.public_location,
    dropoff.created_by,
    case
      when not public_request or coalesce(preference.public_leaderboard, false)
        then coalesce(nullif(btrim(profile.display_name), ''), 'WXL Contributor')
      else 'WXL Contributor'
    end
  from command.food_dropoffs as dropoff
  join command.profiles as profile on profile.id = dropoff.created_by
  left join command.food_dropoff_preferences as preference on preference.profile_id = dropoff.created_by
  where not public_request or dropoff.public_location = true
  order by dropoff.dropped_off_at desc, dropoff.created_at desc;
end;
$$;

create or replace function command.list_food_dropoff_leaderboard(p_public_only boolean default false)
returns table (
  rank bigint,
  profile_id uuid,
  display_name text,
  dropoff_count bigint,
  latest_dropoff_at timestamptz
)
language plpgsql
stable
security definer
set search_path = command, public
as $$
begin
  if not p_public_only and auth.uid() is null then
    raise exception 'Sign in to view the internal drop-off leaderboard';
  end if;

  return query
  with totals as (
    select
      dropoff.created_by as profile_id,
      coalesce(nullif(btrim(profile.display_name), ''), 'WXL Contributor') as display_name,
      count(*)::bigint as dropoff_count,
      max(dropoff.dropped_off_at) as latest_dropoff_at
    from command.food_dropoffs as dropoff
    join command.profiles as profile on profile.id = dropoff.created_by
    left join command.food_dropoff_preferences as preference on preference.profile_id = dropoff.created_by
    where not p_public_only or coalesce(preference.public_leaderboard, false)
    group by dropoff.created_by, profile.display_name
  )
  select
    row_number() over (order by totals.dropoff_count desc, totals.latest_dropoff_at asc, totals.display_name asc),
    totals.profile_id,
    totals.display_name,
    totals.dropoff_count,
    totals.latest_dropoff_at
  from totals
  order by totals.dropoff_count desc, totals.latest_dropoff_at asc, totals.display_name asc;
end;
$$;

create or replace function command.get_food_dropoff_preferences()
returns table (public_leaderboard boolean)
language sql
stable
security definer
set search_path = command, public
as $$
  select coalesce(
    (select preference.public_leaderboard
     from command.food_dropoff_preferences as preference
     where preference.profile_id = auth.uid()),
    false
  );
$$;

create or replace function command.set_food_dropoff_leaderboard_public(p_public boolean)
returns boolean
language plpgsql
security definer
set search_path = command, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to change leaderboard visibility';
  end if;

  insert into command.food_dropoff_preferences(profile_id, public_leaderboard, updated_at)
  values(auth.uid(), p_public, now())
  on conflict(profile_id) do update
    set public_leaderboard = excluded.public_leaderboard,
        updated_at = excluded.updated_at;

  return p_public;
end;
$$;

revoke all on function command.list_food_dropoffs(boolean) from public;
revoke all on function command.list_food_dropoff_leaderboard(boolean) from public;
revoke all on function command.get_food_dropoff_preferences() from public;
revoke all on function command.set_food_dropoff_leaderboard_public(boolean) from public;

revoke select on command.food_dropoffs from anon;
grant select on command.food_dropoffs to authenticated;
grant select on command.food_dropoff_preferences to authenticated;
grant insert, update, delete on command.food_dropoffs to authenticated;
grant insert, update on command.food_dropoff_preferences to authenticated;
grant execute on function command.list_food_dropoffs(boolean) to anon, authenticated;
grant execute on function command.list_food_dropoff_leaderboard(boolean) to anon, authenticated;
grant execute on function command.get_food_dropoff_preferences() to authenticated;
grant execute on function command.set_food_dropoff_leaderboard_public(boolean) to authenticated;

comment on table command.food_dropoffs is 'Contributor-reported food drop-offs at community-facing destinations. Household locations are prohibited.';
comment on table command.food_dropoff_preferences is 'Contributor-controlled public recognition preference. Internal recognition remains visible to authenticated members.';
comment on function command.list_food_dropoffs(boolean) is 'Returns internal drop-offs to members and public drop-offs to anonymous visitors without disclosing non-opted-in contributor names.';
comment on function command.list_food_dropoff_leaderboard(boolean) is 'Returns the complete member board internally or only opted-in contributors publicly.';
