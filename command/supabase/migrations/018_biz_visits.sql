-- 018_biz_visits.sql
-- HAND Command Center, demo-site visit tracking (the "Develop" pillar).
-- Each generated demo at /demos/<slug>/ carries a tiny beacon
-- (web/assets/demo-visit.js) that fires once per browser session, top-frame
-- only (so the pitch page's embedded preview and the portfolio thumbnails never
-- count). The Netlify biz-visit function persists each hit here via the service
-- role, so the Command Center and the gated /demos portfolio can show who
-- looked at a site and when it was built.
--
-- Privacy-light: no cookies, no raw IP. Coarse Netlify geo (city, country), the
-- referrer, and a truncated user-agent only. Writes are service-role only.

create table if not exists command.biz_visits (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid references command.biz_leads(id) on delete cascade,
  lead_slug    text not null,
  kind         text not null default 'demo'
               check (kind in ('demo','pitch')),
  path         text,
  referrer     text,
  country      text,
  city         text,
  ua           text,
  created_at   timestamptz not null default now()
);

comment on table command.biz_visits is
  'Visits to generated demo sites. Written by the Netlify biz-visit function via service role. One row per browser session per page (client-deduped, top-frame only).';

create index if not exists biz_visits_lead_idx
  on command.biz_visits(lead_id, created_at desc);
create index if not exists biz_visits_slug_idx
  on command.biz_visits(lead_slug, created_at desc);

-- ─── RLS: read for the team, writes only via service role ───────────────────
alter table command.biz_visits enable row level security;

drop policy if exists biz_visits_read on command.biz_visits;
create policy biz_visits_read on command.biz_visits
  for select using (command.current_role() in ('admin','contributor','viewer'));
