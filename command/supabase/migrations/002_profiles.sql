-- 002_profiles.sql
-- HAND Command Center profiles table.
-- Per PRD section 6.3, profiles extends auth.users. Role enum gates the
-- three audiences: admin (full), contributor (read + comment + suggest),
-- viewer (read scoped to a reciprocate_group).

create table if not exists command.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null unique,
  display_name      text,
  role              text not null default 'viewer'
                    check (role in ('admin','contributor','viewer')),
  reciprocate_group text,
  created_at        timestamptz not null default now(),
  last_seen_at      timestamptz
);

comment on table command.profiles is
  'Command center users. Joined to auth.users by id. Role gates feature access.';
comment on column command.profiles.reciprocate_group is
  'V2: scopes viewers to a single group (mystic-hearts, mesquitos, etc). NULL means full access.';

create index if not exists profiles_email_idx on command.profiles(email);
create index if not exists profiles_role_idx on command.profiles(role);

-- When a new auth user signs up, mirror them into command.profiles with
-- the default viewer role. Admins promote roles by direct UPDATE.
create or replace function command.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = command, public
as $$
begin
  insert into command.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function command.handle_new_user();

-- Bootstrap helper: the first user to sign up after a fresh deploy can be
-- promoted to admin manually via SQL editor, or via the seed snippet at
-- the bottom of 013_rls_policies.sql.
