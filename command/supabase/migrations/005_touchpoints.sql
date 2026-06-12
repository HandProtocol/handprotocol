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
