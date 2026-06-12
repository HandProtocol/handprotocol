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
