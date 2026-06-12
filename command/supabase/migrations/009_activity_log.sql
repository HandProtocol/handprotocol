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
