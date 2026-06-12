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
