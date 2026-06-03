-- 013_rls_policies.sql
-- HAND Command Center row-level security.
-- Implements the role matrix from PRD section 6.3:
--
--   admin       full access
--   contributor read everything, comment, suggest drafts; no status changes
--   viewer      read scoped to reciprocate_group (V2)
--
-- All tables get RLS enabled. The service_role bypasses RLS by design,
-- so server actions running with the admin client are unaffected.

-- ─── Helper: lookup the current user's role ────────────────────────────
create or replace function command.current_role()
returns text
language sql
stable
security definer
set search_path = command, public
as $$
  select role from command.profiles where id = auth.uid();
$$;

create or replace function command.current_group()
returns text
language sql
stable
security definer
set search_path = command, public
as $$
  select reciprocate_group from command.profiles where id = auth.uid();
$$;

-- ─── profiles ─────────────────────────────────────────────────────────
alter table command.profiles enable row level security;

drop policy if exists profiles_self_read on command.profiles;
create policy profiles_self_read on command.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_admin_read on command.profiles;
create policy profiles_admin_read on command.profiles
  for select using (command.current_role() = 'admin');

drop policy if exists profiles_admin_write on command.profiles;
create policy profiles_admin_write on command.profiles
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists profiles_self_update on command.profiles;
create policy profiles_self_update on command.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from command.profiles where id = auth.uid()));

-- ─── funders ─────────────────────────────────────────────────────────
alter table command.funders enable row level security;

drop policy if exists funders_read_all on command.funders;
create policy funders_read_all on command.funders
  for select using (command.current_role() in ('admin','contributor','viewer'));

drop policy if exists funders_admin_write on command.funders;
create policy funders_admin_write on command.funders
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

-- ─── grants ─────────────────────────────────────────────────────────
alter table command.grants enable row level security;

drop policy if exists grants_admin_all on command.grants;
create policy grants_admin_all on command.grants
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists grants_contributor_read on command.grants;
create policy grants_contributor_read on command.grants
  for select using (command.current_role() = 'contributor');

drop policy if exists grants_viewer_scoped_read on command.grants;
create policy grants_viewer_scoped_read on command.grants
  for select using (
    command.current_role() = 'viewer'
    and (
      command.current_group() is null
      or reciprocate_group = command.current_group()
    )
  );

-- ─── touchpoints ─────────────────────────────────────────────────────
alter table command.touchpoints enable row level security;

drop policy if exists touchpoints_admin_all on command.touchpoints;
create policy touchpoints_admin_all on command.touchpoints
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists touchpoints_contributor_read on command.touchpoints;
create policy touchpoints_contributor_read on command.touchpoints
  for select using (command.current_role() = 'contributor');

drop policy if exists touchpoints_contributor_insert on command.touchpoints;
create policy touchpoints_contributor_insert on command.touchpoints
  for insert with check (
    command.current_role() = 'contributor'
    and created_by = auth.uid()
  );

drop policy if exists touchpoints_viewer_scoped_read on command.touchpoints;
create policy touchpoints_viewer_scoped_read on command.touchpoints
  for select using (
    command.current_role() = 'viewer'
    and grant_id in (
      select id from command.grants
      where command.current_group() is null
         or reciprocate_group = command.current_group()
    )
  );

-- ─── boilerplate ─────────────────────────────────────────────────────
alter table command.boilerplate enable row level security;

drop policy if exists boilerplate_read_all on command.boilerplate;
create policy boilerplate_read_all on command.boilerplate
  for select using (command.current_role() in ('admin','contributor','viewer'));

drop policy if exists boilerplate_admin_write on command.boilerplate;
create policy boilerplate_admin_write on command.boilerplate
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists boilerplate_contributor_insert on command.boilerplate;
create policy boilerplate_contributor_insert on command.boilerplate
  for insert with check (
    command.current_role() = 'contributor'
    and created_by = auth.uid()
    and active = false
  );

-- ─── attachments ─────────────────────────────────────────────────────
alter table command.attachments enable row level security;

drop policy if exists attachments_admin_all on command.attachments;
create policy attachments_admin_all on command.attachments
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists attachments_contributor_read on command.attachments;
create policy attachments_contributor_read on command.attachments
  for select using (command.current_role() = 'contributor');

drop policy if exists attachments_viewer_scoped_read on command.attachments;
create policy attachments_viewer_scoped_read on command.attachments
  for select using (
    command.current_role() = 'viewer'
    and grant_id in (
      select id from command.grants
      where command.current_group() is null
         or reciprocate_group = command.current_group()
    )
  );

-- ─── comments ─────────────────────────────────────────────────────
alter table command.comments enable row level security;

drop policy if exists comments_admin_all on command.comments;
create policy comments_admin_all on command.comments
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists comments_contributor_read on command.comments;
create policy comments_contributor_read on command.comments
  for select using (command.current_role() = 'contributor');

drop policy if exists comments_contributor_write_own on command.comments;
create policy comments_contributor_write_own on command.comments
  for insert with check (
    command.current_role() = 'contributor'
    and created_by = auth.uid()
  );

drop policy if exists comments_contributor_update_own on command.comments;
create policy comments_contributor_update_own on command.comments
  for update using (
    command.current_role() = 'contributor'
    and created_by = auth.uid()
  );

drop policy if exists comments_viewer_read on command.comments;
create policy comments_viewer_read on command.comments
  for select using (command.current_role() = 'viewer');

-- ─── section_locks ─────────────────────────────────────────────────────
alter table command.section_locks enable row level security;

drop policy if exists section_locks_admin_all on command.section_locks;
create policy section_locks_admin_all on command.section_locks
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists section_locks_contributor_own on command.section_locks;
create policy section_locks_contributor_own on command.section_locks
  for all using (
    command.current_role() in ('admin','contributor')
    and locked_by = auth.uid()
  ) with check (
    command.current_role() in ('admin','contributor')
    and locked_by = auth.uid()
  );

drop policy if exists section_locks_read_all on command.section_locks;
create policy section_locks_read_all on command.section_locks
  for select using (command.current_role() in ('admin','contributor','viewer'));

-- ─── activity_log ─────────────────────────────────────────────────────
alter table command.activity_log enable row level security;

drop policy if exists activity_log_admin_read on command.activity_log;
create policy activity_log_admin_read on command.activity_log
  for select using (command.current_role() = 'admin');

drop policy if exists activity_log_contributor_read on command.activity_log;
create policy activity_log_contributor_read on command.activity_log
  for select using (command.current_role() = 'contributor');

drop policy if exists activity_log_viewer_own on command.activity_log;
create policy activity_log_viewer_own on command.activity_log
  for select using (
    command.current_role() = 'viewer' and actor_id = auth.uid()
  );

-- activity_log is append-only via the log_activity() helper and the
-- log_grant_status_change() trigger. No insert/update/delete policies
-- for non-service_role roles.

-- ─── notifications ─────────────────────────────────────────────────────
alter table command.notifications enable row level security;

drop policy if exists notifications_own on command.notifications;
create policy notifications_own on command.notifications
  for select using (recipient_id = auth.uid());

drop policy if exists notifications_own_update on command.notifications;
create policy notifications_own_update on command.notifications
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ─── assistant_runs ─────────────────────────────────────────────────────
alter table command.assistant_runs enable row level security;

drop policy if exists assistant_runs_admin_all on command.assistant_runs;
create policy assistant_runs_admin_all on command.assistant_runs
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists assistant_runs_own_read on command.assistant_runs;
create policy assistant_runs_own_read on command.assistant_runs
  for select using (actor_id = auth.uid());

-- ─── invites ─────────────────────────────────────────────────────
alter table command.invites enable row level security;

drop policy if exists invites_admin_all on command.invites;
create policy invites_admin_all on command.invites
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

-- ─── Bootstrap helper ──────────────────────────────────────────────────
-- After the first admin signs up via /auth/login, run this in the SQL
-- editor to promote them. Replace the email with the founder's.
--
--   update command.profiles
--   set role = 'admin'
--   where email = 'cshearer210@gmail.com';
--
-- Subsequent admins are invited via the invite-code flow (Phase 5).
