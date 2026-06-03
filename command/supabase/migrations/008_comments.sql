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
