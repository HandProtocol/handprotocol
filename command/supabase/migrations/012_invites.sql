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
