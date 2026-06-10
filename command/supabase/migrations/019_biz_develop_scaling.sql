-- 019_biz_develop_scaling.sql
-- Scaling the Develop pillar past a single status axis. Three additions, all
-- idempotent:
--   1. command.biz_campaigns — first-class batches you work ("Manor food
--      trucks", "East Austin barbershops"). A lead belongs to 0 or 1 campaign.
--   2. geo on biz_leads (lat/lng) — backfilled from the Maps pin where present,
--      geocoded from the address otherwise. Powers the /develop/map view.
--   3. the production-site lifecycle on biz_leads — once a lead graduates
--      (hand-biz-pitch Phase 6) it becomes an owned, live site we operate. These
--      columns + the /develop/sites registry are how we manage them at volume.
--
-- biz/<slug>/lead.md stays canonical for the fields it already owns; campaign
-- assignment, geo, and production state are written markdown-first too (new
-- frontmatter keys), then upserted here, same posture as the rest of Develop.

-- ─── biz_campaigns ────────────────────────────────────────────────────────
create table if not exists command.biz_campaigns (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  region      text,                              -- "East Austin", "Manor", ...
  color       text,                              -- accent (hex) for board + map
  goal        int,                               -- target # of closes, optional
  notes       text,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table command.biz_campaigns is
  'Develop-pillar batches. A working set of leads (by area/category/push). A lead references at most one campaign.';

create index if not exists biz_campaigns_archived_idx
  on command.biz_campaigns(archived, created_at desc);

-- ─── biz_leads: campaign + geo + production lifecycle ───────────────────────
alter table command.biz_leads
  add column if not exists campaign_id     uuid references command.biz_campaigns(id) on delete set null,
  add column if not exists tags            text[] not null default '{}',
  add column if not exists lat             numeric(9,6),
  add column if not exists lng             numeric(9,6),
  add column if not exists production_url  text,
  add column if not exists live_domain     text,
  add column if not exists netlify_site_id text,
  add column if not exists dns_zone_id     text,
  add column if not exists ssl_state       text
                          check (ssl_state is null or ssl_state in ('issued','pending','none')),
  add column if not exists live_at         timestamptz;

comment on column command.biz_leads.campaign_id is
  'Optional batch this lead belongs to (command.biz_campaigns).';
comment on column command.biz_leads.live_domain is
  'Set once the lead graduates to its own owned site (Phase 6). Its presence is what makes a lead show in the /develop/sites registry.';
comment on column command.biz_leads.production_url is
  'The live owned site URL, e.g. https://hamburguesasemilia.com/. Distinct from demo_url (the /demos/<slug>/ preview).';

create index if not exists biz_leads_campaign_idx on command.biz_leads(campaign_id);
create index if not exists biz_leads_geo_idx on command.biz_leads(lat, lng);
create index if not exists biz_leads_live_idx
  on command.biz_leads(live_at desc) where live_domain is not null;

-- ─── updated_at trigger on campaigns (reuses command.touch_updated_at) ──────
drop trigger if exists biz_campaigns_touch_updated_at on command.biz_campaigns;
create trigger biz_campaigns_touch_updated_at
  before update on command.biz_campaigns
  for each row execute function command.touch_updated_at();

-- ─── RLS (mirrors biz_leads from 016) ───────────────────────────────────────
alter table command.biz_campaigns enable row level security;

drop policy if exists biz_campaigns_read on command.biz_campaigns;
create policy biz_campaigns_read on command.biz_campaigns
  for select using (command.current_role() in ('admin','contributor','viewer'));

drop policy if exists biz_campaigns_admin_write on command.biz_campaigns;
create policy biz_campaigns_admin_write on command.biz_campaigns
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');
