-- 001_command_schema.sql
-- HAND Command Center, Phase 1.
-- Creates the `command` schema and the extensions the operational tables
-- depend on. Idempotent. Pattern lifted from noredFarms/reps/supabase/migrations/.
--
-- Run order: this file first, then 002 through 013.
-- Apply via Supabase SQL editor, `supabase db push`, or `psql`.

create schema if not exists command;

-- gen_random_uuid() for primary keys
create extension if not exists pgcrypto with schema extensions;
-- pg_trgm for fuzzy text search across grants, funders, boilerplate, comments
create extension if not exists pg_trgm with schema extensions;

-- Expose the `command` schema to PostgREST so the Next.js app can reach
-- the tables via @supabase/ssr with `db: { schema: "command" }`.
-- The Supabase REST gateway reads `pgrst.db_schemas` from the database
-- settings. This grant statement is what makes the schema reachable
-- once the API config is told to look here. Setting the config is a
-- one-time dashboard step (Project Settings > API > Exposed schemas).
grant usage on schema command to anon, authenticated, service_role;
alter default privileges in schema command
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema command
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema command
  grant execute on functions to authenticated, service_role;

comment on schema command is
  'HAND Command Center operational schema. Markdown is canonical, this schema is the read replica and the relationship CRM.';
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
-- 003_funders.sql
-- HAND Command Center funder library.
-- Per PRD section 6.3. Canonical (no markdown counterpart yet). Curated by
-- the operator. Indexed for the funder library view (Phase 3 N1).

create table if not exists command.funders (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique,
  name                     text not null,
  funder_url               text,
  type                     text check (type in (
                             'foundation','government','corporate',
                             'community','individual','dao','program'
                           )),
  geography                text[] default '{}',
  focus_areas              text[] default '{}',
  mission_alignment_notes  text,
  fit_score                int check (fit_score between 1 and 5),
  annual_cycle             text,
  ein                      text,
  last_990_year            int,
  giving_total_recent      numeric,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table command.funders is
  'Curated funder library. Tied to grants via funders.id. Touchpoints tied to the funder, not the grant.';

create index if not exists funders_slug_idx on command.funders(slug);
create index if not exists funders_name_trgm_idx on command.funders using gin (name extensions.gin_trgm_ops);
create index if not exists funders_type_idx on command.funders(type);
create index if not exists funders_focus_areas_idx on command.funders using gin (focus_areas);
create index if not exists funders_geography_idx on command.funders using gin (geography);

-- updated_at trigger
create or replace function command.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists funders_touch_updated_at on command.funders;
create trigger funders_touch_updated_at
  before update on command.funders
  for each row execute function command.touch_updated_at();
-- 004_grants.sql
-- HAND Command Center grants table.
-- Mirror of the markdown frontmatter at funding/grants/<slug>.md. Markdown
-- is canonical, this row is the read replica. Writes flow through server
-- actions: markdown first, then upsert here.

create table if not exists command.grants (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  funder_id           uuid references command.funders(id) on delete set null,
  name                text not null,
  status              text not null default 'discovery'
                      check (status in (
                        'discovery','drafting','submitted',
                        'awarded','declined','withdrawn','closed'
                      )),
  award_type          text,
  award_size          text,
  amount_requested    numeric,
  amount_awarded      numeric,
  match_required      text,
  reporting           text,
  deadline            date,
  discovered_on       date,
  submitted_on        date,
  decided_on          date,
  reciprocate_group   text,
  fit_score           int check (fit_score between 1 and 5),
  hand_lead           text,
  contact             text,
  funder_url          text,
  program_url         text,
  application_url     text,
  kanban_position     int not null default 0,
  column_entered_at   timestamptz not null default now(),
  markdown_path       text not null,
  content_checksum    text,
  last_synced_at      timestamptz default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table command.grants is
  'Grants pipeline. One row per funding/grants/<slug>.md. Markdown remains canonical.';
comment on column command.grants.content_checksum is
  'SHA-256 of the full markdown file. Updated on every write so the nightly reconciler can detect drift.';

create index if not exists grants_status_idx on command.grants(status);
create index if not exists grants_deadline_idx on command.grants(deadline);
create index if not exists grants_funder_idx on command.grants(funder_id);
create index if not exists grants_group_idx on command.grants(reciprocate_group);
create index if not exists grants_name_trgm_idx on command.grants using gin (name extensions.gin_trgm_ops);
create index if not exists grants_kanban_idx on command.grants(status, kanban_position);

-- updated_at trigger (reuses the helper from 003)
drop trigger if exists grants_touch_updated_at on command.grants;
create trigger grants_touch_updated_at
  before update on command.grants
  for each row execute function command.touch_updated_at();

-- column_entered_at tracker: when status changes, stamp the moment so
-- cycle-time analytics (Phase 4 D2) can read it cheaply.
create or replace function command.stamp_column_entered_at()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.column_entered_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists grants_stamp_column_entered on command.grants;
create trigger grants_stamp_column_entered
  before update on command.grants
  for each row execute function command.stamp_column_entered_at();
-- 005_touchpoints.sql
-- HAND Command Center touchpoint log.
-- Every interaction with a funder, tied to the funder, optionally tied to
-- a grant. Per PRD section 6.3 and 7.3 (Nurture pillar).

create table if not exists command.touchpoints (
  id            uuid primary key default gen_random_uuid(),
  funder_id     uuid not null references command.funders(id) on delete cascade,
  grant_id      uuid references command.grants(id) on delete set null,
  occurred_on   date not null default current_date,
  channel       text check (channel in (
                  'email','call','meeting','conference',
                  'intro','letter','social','other'
                )),
  direction     text check (direction in ('outbound','inbound','mutual')),
  summary       text not null,
  notes         text,
  attachments   jsonb not null default '[]',
  follow_up_on  date,
  created_by    uuid references command.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

comment on table command.touchpoints is
  'Every funder interaction, tied to the funder. Relationships outlive single grants.';

create index if not exists touchpoints_funder_idx on command.touchpoints(funder_id);
create index if not exists touchpoints_grant_idx on command.touchpoints(grant_id);
create index if not exists touchpoints_follow_up_idx on command.touchpoints(follow_up_on)
  where follow_up_on is not null;
create index if not exists touchpoints_occurred_idx on command.touchpoints(occurred_on desc);
-- 006_boilerplate.sql
-- HAND Command Center boilerplate library.
-- Reusable snippets (mission paragraph, theory of change, team bios, the
-- 501(c)(3) in formation language, foundation tiers, three communities,
-- eight sovereignty principles). Versioned. Phase 2 feature, schema in
-- place from Phase 1 so the relationship survives.

create table if not exists command.boilerplate (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  category     text not null,
  title        text not null,
  content      text not null,
  word_count   int generated always as (
                 array_length(string_to_array(trim(content), ' '), 1)
               ) stored,
  version      int not null default 1,
  active       boolean not null default true,
  tags         text[] default '{}',
  notes        text,
  created_by   uuid references command.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table command.boilerplate is
  'Curated reusable snippets. Insert via slash menu in the grant detail view (Phase 2 A2).';

create index if not exists boilerplate_category_idx on command.boilerplate(category);
create index if not exists boilerplate_active_idx on command.boilerplate(active);
create index if not exists boilerplate_tags_idx on command.boilerplate using gin (tags);
create index if not exists boilerplate_title_trgm_idx on command.boilerplate
  using gin (title extensions.gin_trgm_ops);

drop trigger if exists boilerplate_touch_updated_at on command.boilerplate;
create trigger boilerplate_touch_updated_at
  before update on command.boilerplate
  for each row execute function command.touch_updated_at();
-- 007_attachments.sql
-- HAND Command Center attachment vault.
-- File references (PDFs, supporting documents, screenshots, award letters).
-- Files live in Supabase Storage bucket `command-attachments`. This table
-- holds the metadata and the foreign keys.

create table if not exists command.attachments (
  id            uuid primary key default gen_random_uuid(),
  grant_id      uuid references command.grants(id) on delete cascade,
  funder_id     uuid references command.funders(id) on delete set null,
  storage_path  text not null,
  filename      text not null,
  mime_type     text,
  byte_size     bigint,
  uploaded_by   uuid references command.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

comment on table command.attachments is
  'Attachment vault. Files in Supabase Storage at command-attachments/, metadata here.';

create index if not exists attachments_grant_idx on command.attachments(grant_id);
create index if not exists attachments_funder_idx on command.attachments(funder_id);
create index if not exists attachments_uploaded_at_idx on command.attachments(uploaded_at desc);

-- Storage bucket. Private by default. Access policies for the bucket are
-- managed in the Supabase Storage policies UI (or in a follow-up migration
-- that uses storage.create_policy()). Phase 2 feature H6, schema in place
-- from Phase 1.
insert into storage.buckets (id, name, public)
  values ('command-attachments', 'command-attachments', false)
  on conflict (id) do nothing;
-- 008_comments.sql
-- HAND Command Center inline comments and section locks.
-- Per PRD section 9 (collaboration). Phase 4 feature, schema in place from
-- Phase 1 so foreign keys are stable.

create table if not exists command.comments (
  id          uuid primary key default gen_random_uuid(),
  grant_id    uuid not null references command.grants(id) on delete cascade,
  section     text not null,
  parent_id   uuid references command.comments(id) on delete cascade,
  body        text not null,
  resolved    boolean not null default false,
  created_by  uuid references command.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table command.comments is
  'Inline comments on grant draft sections (H2/H3 headings). Threaded via parent_id.';

create index if not exists comments_grant_idx on command.comments(grant_id);
create index if not exists comments_section_idx on command.comments(grant_id, section);
create index if not exists comments_resolved_idx on command.comments(resolved);

drop trigger if exists comments_touch_updated_at on command.comments;
create trigger comments_touch_updated_at
  before update on command.comments
  for each row execute function command.touch_updated_at();

-- Section locks: soft locks during editing. 12-minute window with
-- auto-extend on activity. Inspired by Figma's presence model.
create table if not exists command.section_locks (
  grant_id     uuid not null references command.grants(id) on delete cascade,
  section      text not null,
  locked_by    uuid not null references command.profiles(id) on delete cascade,
  locked_at    timestamptz not null default now(),
  expires_at   timestamptz not null,
  primary key (grant_id, section)
);

create index if not exists section_locks_expires_idx on command.section_locks(expires_at);
-- 009_activity_log.sql
-- HAND Command Center activity log.
-- Every state change, every save, every export, every assistant run is
-- logged here. Plus git history of the markdown files, this gives the
-- operator a complete audit trail. Per PRD section 6.8.

create table if not exists command.activity_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references command.profiles(id) on delete set null,
  entity_type  text not null,
  entity_id    uuid not null,
  action       text not null,
  before       jsonb,
  after        jsonb,
  metadata     jsonb,
  occurred_at  timestamptz not null default now()
);

comment on table command.activity_log is
  'Append-only activity feed. Pair with git history for the full audit picture.';

create index if not exists activity_entity_idx on command.activity_log(entity_type, entity_id, occurred_at desc);
create index if not exists activity_actor_idx on command.activity_log(actor_id, occurred_at desc);
create index if not exists activity_occurred_idx on command.activity_log(occurred_at desc);

-- Helper function callable from triggers and from server actions.
-- Signature kept stable so future migrations can call it.
create or replace function command.log_activity(
  p_actor_id    uuid,
  p_entity_type text,
  p_entity_id   uuid,
  p_action      text,
  p_before      jsonb default null,
  p_after       jsonb default null,
  p_metadata    jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = command, public
as $$
declare
  v_id uuid;
begin
  insert into command.activity_log
    (actor_id, entity_type, entity_id, action, before, after, metadata)
  values
    (p_actor_id, p_entity_type, p_entity_id, p_action, p_before, p_after, p_metadata)
  returning id into v_id;
  return v_id;
end;
$$;

-- Trigger: log grant status changes automatically. Server actions can also
-- call log_activity() directly for other actions (save, export, assistant
-- run). The trigger guarantees status changes are never missed even if a
-- write bypasses the server action layer.
create or replace function command.log_grant_status_change()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    perform command.log_activity(
      null,
      'grant',
      new.id,
      'status_changed',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      jsonb_build_object('slug', new.slug)
    );
  elsif (tg_op = 'INSERT') then
    perform command.log_activity(
      null,
      'grant',
      new.id,
      'created',
      null,
      jsonb_build_object('status', new.status, 'slug', new.slug),
      null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists grants_log_status on command.grants;
create trigger grants_log_status
  after insert or update on command.grants
  for each row execute function command.log_grant_status_change();
-- 010_notifications.sql
-- HAND Command Center in-app notification feed.
-- Per PRD section 6.5. Email, Slack, and Discord delivery hooks land in
-- Phase 4. The in-app surface ships here so the bell icon has a real
-- table to query.

create table if not exists command.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references command.profiles(id) on delete cascade,
  kind          text not null,
  title         text not null,
  body          text,
  entity_type   text,
  entity_id     uuid,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

comment on table command.notifications is
  'Per-user notification feed. Kinds: deadline_approaching, decision_received, comment_added, assignment_changed, draft_review_requested, weekly_digest, follow_up_due.';

create index if not exists notifications_recipient_idx
  on command.notifications(recipient_id, read_at, created_at desc);
create index if not exists notifications_kind_idx on command.notifications(kind);
-- 011_assistant_runs.sql
-- HAND Command Center AI assistant usage log.
-- Phase 2 lights up the drafting assistant. This table records every call
-- for cost accounting. Per PRD section 6.6 and 10. Provider name is logged
-- internally but never displayed in operator-facing copy.

create table if not exists command.assistant_runs (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid references command.profiles(id) on delete set null,
  surface         text not null,
  grant_id        uuid references command.grants(id) on delete set null,
  provider        text not null,
  model_key       text not null,
  tokens_in       int,
  tokens_out      int,
  cost_usd        numeric(10,4),
  duration_ms     int,
  input_hash      text,
  output_preview  text,
  accepted        boolean,
  occurred_at     timestamptz not null default now()
);

comment on table command.assistant_runs is
  'AI assistant call log. Cost accounting only. Provider names never surface in UI copy.';

create index if not exists assistant_runs_actor_idx
  on command.assistant_runs(actor_id, occurred_at desc);
create index if not exists assistant_runs_surface_idx on command.assistant_runs(surface);
create index if not exists assistant_runs_grant_idx on command.assistant_runs(grant_id);
create index if not exists assistant_runs_occurred_idx on command.assistant_runs(occurred_at desc);
-- 012_invites.sql
-- HAND Command Center invite codes.
-- Per PRD section 6.4. Admin generates a code, sends via email, the
-- recipient signs up, a trigger checks the code, applies the role and
-- group scoping, marks the invite consumed.

create table if not exists command.invites (
  code               text primary key,
  email              text,
  role               text not null default 'contributor'
                     check (role in ('admin','contributor','viewer')),
  reciprocate_group  text,
  expires_at         timestamptz not null,
  used_at            timestamptz,
  used_by            uuid references command.profiles(id) on delete set null,
  created_by         uuid references command.profiles(id) on delete set null,
  created_at         timestamptz not null default now()
);

comment on table command.invites is
  'One-time-use invite codes. Phase 5 wires the signup flow; the table is here from Phase 1 so foreign keys are stable.';

create index if not exists invites_email_idx on command.invites(email);
create index if not exists invites_expires_idx on command.invites(expires_at);
create index if not exists invites_used_idx on command.invites(used_at);
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
