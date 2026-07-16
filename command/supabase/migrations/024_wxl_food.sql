-- WXL:FOOD, local food coordination layer.
-- Public discovery is readable without an account. Coordination writes require
-- an authenticated HAND profile and remain scoped to the author's identity.

create table if not exists command.food_partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  partner_type text not null,
  neighborhood text,
  address text,
  latitude numeric,
  longitude numeric,
  operating_hours text,
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  created_by uuid references command.profiles(id) on delete set null
);

create table if not exists command.food_source_nominations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_name text not null,
  source_type text not null,
  neighborhood text not null,
  website text,
  contact text,
  notes text not null,
  status text not null default 'nominated' check (status in ('nominated', 'reviewing', 'verified', 'declined')),
  nominated_by uuid references command.profiles(id) on delete set null,
  reviewed_by uuid references command.profiles(id) on delete set null,
  reviewed_at timestamptz
);

create table if not exists command.food_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  group_name text not null,
  neighborhood text not null,
  category text not null check (category in ('resource_request', 'help_needed', 'storage_request', 'transport_request')),
  detail text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'fulfilled', 'closed')),
  responses_count integer not null default 0,
  supporters_count integer not null default 0,
  is_public boolean not null default true,
  created_by uuid references command.profiles(id) on delete set null
);

create table if not exists command.food_request_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid not null references command.food_requests(id) on delete cascade,
  author_name text not null,
  author_role text,
  message text not null,
  created_by uuid references command.profiles(id) on delete set null
);

create table if not exists command.food_request_supporters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid not null references command.food_requests(id) on delete cascade,
  supporter_id uuid not null references command.profiles(id) on delete cascade,
  unique (request_id, supporter_id)
);

create index if not exists food_partners_status_idx on command.food_partners(status);
create index if not exists food_source_nominations_status_idx on command.food_source_nominations(status, created_at desc);
create index if not exists food_requests_status_idx on command.food_requests(status, created_at desc);
create index if not exists food_requests_neighborhood_idx on command.food_requests(neighborhood);
create index if not exists food_messages_request_idx on command.food_request_messages(request_id, created_at);

drop trigger if exists food_partners_touch_updated_at on command.food_partners;
create trigger food_partners_touch_updated_at before update on command.food_partners
  for each row execute function command.touch_updated_at();
drop trigger if exists food_source_nominations_touch_updated_at on command.food_source_nominations;
create trigger food_source_nominations_touch_updated_at before update on command.food_source_nominations
  for each row execute function command.touch_updated_at();
drop trigger if exists food_requests_touch_updated_at on command.food_requests;
create trigger food_requests_touch_updated_at before update on command.food_requests
  for each row execute function command.touch_updated_at();

alter table command.food_partners enable row level security;
alter table command.food_source_nominations enable row level security;
alter table command.food_requests enable row level security;
alter table command.food_request_messages enable row level security;
alter table command.food_request_supporters enable row level security;

drop policy if exists food_partners_public_read on command.food_partners;
create policy food_partners_public_read on command.food_partners
  for select using (status = 'active');
drop policy if exists food_partners_admin_write on command.food_partners;
create policy food_partners_admin_write on command.food_partners
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists food_sources_public_verified_read on command.food_source_nominations;
create policy food_sources_public_verified_read on command.food_source_nominations
  for select using (status = 'verified');
drop policy if exists food_sources_authenticated_insert on command.food_source_nominations;
create policy food_sources_authenticated_insert on command.food_source_nominations
  for insert with check (auth.uid() is not null and nominated_by = auth.uid());
drop policy if exists food_sources_admin_manage on command.food_source_nominations;
create policy food_sources_admin_manage on command.food_source_nominations
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists food_requests_public_read on command.food_requests;
create policy food_requests_public_read on command.food_requests
  for select using (is_public = true);
drop policy if exists food_requests_authenticated_insert on command.food_requests;
create policy food_requests_authenticated_insert on command.food_requests
  for insert with check (auth.uid() is not null and created_by = auth.uid());
drop policy if exists food_requests_admin_update on command.food_requests;
create policy food_requests_admin_update on command.food_requests
  for update using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists food_messages_public_read on command.food_request_messages;
create policy food_messages_public_read on command.food_request_messages
  for select using (
    exists (
      select 1 from command.food_requests r
      where r.id = request_id and r.is_public = true
    )
  );
drop policy if exists food_messages_authenticated_insert on command.food_request_messages;
create policy food_messages_authenticated_insert on command.food_request_messages
  for insert with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists food_supporters_own_read on command.food_request_supporters;
create policy food_supporters_own_read on command.food_request_supporters
  for select using (supporter_id = auth.uid());
drop policy if exists food_supporters_authenticated_insert on command.food_request_supporters;
create policy food_supporters_authenticated_insert on command.food_request_supporters
  for insert with check (auth.uid() is not null and supporter_id = auth.uid());

grant select on command.food_partners, command.food_requests, command.food_request_messages to anon, authenticated;
grant select on command.food_source_nominations to anon, authenticated;
grant insert on command.food_requests, command.food_request_messages, command.food_request_supporters, command.food_source_nominations to authenticated;
grant update on command.food_requests to authenticated;

comment on table command.food_requests is 'WXL:FOOD public requests for food, storage, transport, and volunteer coordination.';
comment on table command.food_request_messages is 'Dialogue attached to a WXL:FOOD request.';
comment on table command.food_source_nominations is 'Community nominations for local food sources awaiting human verification.';
