/*
  051_profiles_self_update_guard.sql
  Close the self-activation hole on command.profiles.

  Problem (koord review 2026-09-30, finding 12): profiles_self_update
  (013:49-52) lets a person update their own profile row and only checks
  that `role` is unchanged. `status` (022) and `reciprocate_group` were never
  covered, so a signed-in 'pending' account (every yuhm sign-up gets one) could
  set status='active' and clear reciprocate_group, becoming a Command Center
  viewer with full access.

  Fix: a BEFORE UPDATE trigger, command.profiles_guard_self_update(), rejects
  any change to a privileged column unless the caller is allowed to make it.
  A trigger rather than a longer WITH CHECK because the privileged column list
  lives in one function that is easy to extend, and a policy cannot compare
  old and new values without a self-select per column.

  Who may change privileged columns (role, status, reciprocate_group):
    - an active admin (command.current_role() = 'admin');
    - trusted server code: service_role and direct SQL have no auth.uid(),
      so invite redemption and approval flows keep working.
  Everyone else may still edit display_name, last_seen_at, etc. on their own
  row. The policy is tightened to match (id = auth.uid(), and id unchanged).

  Pillar roles (funding_lead, develop_rep, ...) are values of `role`, so the
  role check covers them. id and email are also frozen for non-admins.
*/

create or replace function command.profiles_guard_self_update()
returns trigger
language plpgsql
security invoker
set search_path = command, public
as $$
begin
  -- Trusted server paths (service_role, migrations, psql) carry no end-user uid.
  if auth.uid() is null then
    return new;
  end if;

  -- Active admins manage everyone's access.
  if command.current_role() = 'admin' then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.reciprocate_group is distinct from old.reciprocate_group
     or new.id is distinct from old.id
     or new.email is distinct from old.email then
    raise exception 'profiles: role, status, reciprocate_group, id and email can only be changed by an admin'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function command.profiles_guard_self_update() from public;

drop trigger if exists profiles_guard_self_update on command.profiles;
create trigger profiles_guard_self_update
  before update on command.profiles
  for each row execute function command.profiles_guard_self_update();

drop policy if exists profiles_self_update on command.profiles;
create policy profiles_self_update on command.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());
