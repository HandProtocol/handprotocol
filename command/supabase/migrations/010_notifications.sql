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
