/*
  026_wxl_profile_readiness.sql
  Ensure every existing Supabase auth account has the command.profiles row
  required by WXL:FOOD foreign keys. New accounts continue to use the
  command.handle_new_user() trigger defined by the Command Center migrations.
*/

insert into command.profiles (id, email, display_name, role, status)
select
  users.id,
  users.email,
  coalesce(users.raw_user_meta_data->>'display_name', split_part(users.email, '@', 1)),
  'viewer',
  'pending'
from auth.users as users
where users.email is not null
  and not exists (
    select 1 from command.profiles as profiles where profiles.id = users.id
  );

comment on table command.food_requests is
  'WXL:FOOD public requests. Authenticated food coordination is allowed independently of Command Center role approval; created_by must resolve to command.profiles.';
