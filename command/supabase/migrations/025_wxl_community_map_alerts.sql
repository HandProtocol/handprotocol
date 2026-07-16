-- WXL:FOOD community map, time-bound app alerts, and privacy-conscious
-- interaction analytics. Community spots are public but visibly unverified.

create table if not exists command.food_spots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  spot_type text not null,
  neighborhood text not null,
  address text not null,
  latitude numeric not null check (latitude between 30.15 and 30.45),
  longitude numeric not null check (longitude between -97.85 and -97.55),
  produce text not null check (char_length(produce) between 2 and 500),
  availability text,
  status text not null default 'community' check (status in ('community', 'verified', 'paused', 'removed')),
  created_by uuid not null references command.profiles(id) on delete cascade
);

create table if not exists command.food_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  spot_id uuid references command.food_spots(id) on delete set null,
  title text not null check (char_length(title) between 2 and 120),
  message text not null check (char_length(message) between 2 and 500),
  neighborhood text not null,
  expires_at timestamptz not null default (now() + interval '6 hours'),
  created_by uuid not null references command.profiles(id) on delete cascade
);

create table if not exists command.food_engagement_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references command.profiles(id) on delete cascade,
  event_name text not null,
  variant text not null,
  path text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists food_spots_status_idx on command.food_spots(status, created_at desc);
create index if not exists food_spots_location_idx on command.food_spots(latitude, longitude);
create index if not exists food_alerts_active_idx on command.food_alerts(expires_at desc);
create index if not exists food_engagement_variant_idx on command.food_engagement_events(variant, event_name, created_at desc);

create or replace function command.can_post_food_alert(requesting_user uuid)
returns boolean language sql stable security definer set search_path = command as $$
  select count(*) < 5
  from command.food_alerts
  where created_by = requesting_user and created_at > now() - interval '15 minutes';
$$;

drop trigger if exists food_spots_touch_updated_at on command.food_spots;
create trigger food_spots_touch_updated_at before update on command.food_spots
  for each row execute function command.touch_updated_at();

alter table command.food_spots enable row level security;
alter table command.food_alerts enable row level security;
alter table command.food_engagement_events enable row level security;

create policy food_spots_public_read on command.food_spots
  for select using (status in ('community', 'verified'));
create policy food_spots_authenticated_insert on command.food_spots
  for insert with check (auth.uid() is not null and created_by = auth.uid() and status = 'community');
create policy food_spots_owner_update on command.food_spots
  for update using (created_by = auth.uid() or command.current_role() = 'admin')
  with check ((created_by = auth.uid() and status = 'community') or command.current_role() = 'admin');

create policy food_alerts_active_public_read on command.food_alerts
  for select using (expires_at > now());
create policy food_alerts_authenticated_insert on command.food_alerts
  for insert with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and expires_at <= now() + interval '6 hours 5 minutes'
    and command.can_post_food_alert(auth.uid())
  );

create policy food_engagement_own_insert on command.food_engagement_events
  for insert with check (auth.uid() is not null and user_id = auth.uid());
create policy food_engagement_admin_read on command.food_engagement_events
  for select using (command.current_role() = 'admin');

create or replace view command.food_engagement_leaderboard
with (security_invoker = true) as
select
  events.user_id,
  coalesce(profiles.display_name, 'WXL member') as display_name,
  count(*)::bigint as interactions,
  max(events.created_at) as last_active_at
from command.food_engagement_events events
join command.profiles profiles on profiles.id = events.user_id
group by events.user_id, profiles.display_name
order by interactions desc, last_active_at desc;

grant select on command.food_spots, command.food_alerts to anon, authenticated;
grant insert on command.food_spots, command.food_alerts, command.food_engagement_events to authenticated;
grant update on command.food_spots to authenticated;
grant usage, select on sequence command.food_engagement_events_id_seq to authenticated;
grant execute on function command.can_post_food_alert(uuid) to authenticated;
grant select on command.food_engagement_leaderboard to authenticated;

create or replace function command.sync_food_request_counts()
returns trigger language plpgsql security definer set search_path = command as $$
begin
  if tg_table_name = 'food_request_messages' then
    update command.food_requests set responses_count = (
      select count(*) from command.food_request_messages where request_id = coalesce(new.request_id, old.request_id)
    ) where id = coalesce(new.request_id, old.request_id);
  else
    update command.food_requests set supporters_count = (
      select count(*) from command.food_request_supporters where request_id = coalesce(new.request_id, old.request_id)
    ) where id = coalesce(new.request_id, old.request_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists food_messages_sync_count on command.food_request_messages;
create trigger food_messages_sync_count after insert or delete on command.food_request_messages
  for each row execute function command.sync_food_request_counts();
drop trigger if exists food_supporters_sync_count on command.food_request_supporters;
create trigger food_supporters_sync_count after insert or delete on command.food_request_supporters
  for each row execute function command.sync_food_request_counts();

comment on table command.food_spots is 'Community-submitted and coordinator-verified food access spots for the WXL map.';
comment on table command.food_alerts is 'Public, time-bound FOOD IS HERE alerts. Never store private household locations.';
comment on table command.food_engagement_events is 'Authenticated interaction events used for aggregate WXL product experiments.';
comment on view command.food_engagement_leaderboard is 'Admin-only internal WXL interaction leaderboard enforced through invoker RLS.';
