-- 020_public_visits.sql
-- HAND Command Center, public-site visit tracking.
-- High-value public pages use web/assets/visit-beacon.js, which fires once per
-- browser session. The Netlify visit function writes here via service role so
-- the Command Center can show foundation campaign activity beside feedback.

create table if not exists command.public_visits (
  id          uuid primary key default gen_random_uuid(),
  page_path   text not null,
  page_label  text not null,
  page_title  text,
  referrer    text,
  country     text,
  city        text,
  ua          text,
  created_at  timestamptz not null default now()
);

comment on table command.public_visits is
  'Visits to high-value public HAND pages. Written by the Netlify visit function via service role. One row per browser session per page.';

create index if not exists public_visits_page_idx
  on command.public_visits(page_path, created_at desc);

create index if not exists public_visits_created_idx
  on command.public_visits(created_at desc);

alter table command.public_visits enable row level security;

drop policy if exists public_visits_read on command.public_visits;
create policy public_visits_read on command.public_visits
  for select using (command.current_role() in ('admin','contributor','viewer','funding_lead','develop_rep'));
