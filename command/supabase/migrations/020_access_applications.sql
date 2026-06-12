-- 020_access_applications.sql
-- HAND Command Center — public "Apply for Command Center" requests.
--
-- Flow: a prospective user submits the public apply form (no auth account yet)
-- -> a row lands here via the apply Netlify function / server action running
-- with the service_role (so no public INSERT policy is needed) -> Telegram
-- ping to the team -> an admin reviews in /settings, and on approve issues an
-- invite at the chosen role (command.invites). The invite code is stamped back
-- onto the application so the two records stay linked.
--
-- Applicants do NOT get a command.profiles row until they redeem the invite and
-- sign up; this table is the pre-account queue.

create table if not exists command.access_applications (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  name              text,
  organization      text,
  -- what they're asking for; an admin can override at approval time
  desired_role      text not null default 'contributor'
                    check (desired_role in ('admin','funding_lead','develop_rep','contributor','viewer')),
  reciprocate_group text,
  message           text,
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  -- set when approved: links to the invite that was issued
  invite_code       text references command.invites(code) on delete set null,
  reviewed_by       uuid references command.profiles(id) on delete set null,
  reviewed_at       timestamptz,
  -- light anti-abuse / provenance
  source            text,
  user_agent        text,
  ip_hash           text,
  created_at        timestamptz not null default now()
);

comment on table command.access_applications is
  'Public access requests from the Apply for Command Center form. Reviewed by admins; approval issues an invite.';

create index if not exists access_applications_status_idx on command.access_applications(status);
create index if not exists access_applications_email_idx on command.access_applications(email);
create index if not exists access_applications_created_idx on command.access_applications(created_at desc);

-- RLS: only admins read/manage from the app. Inserts come from the service_role
-- (the public apply endpoint), which bypasses RLS, so there is deliberately no
-- public/anon insert policy.
alter table command.access_applications enable row level security;

drop policy if exists access_applications_admin_all on command.access_applications;
create policy access_applications_admin_all on command.access_applications
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');
