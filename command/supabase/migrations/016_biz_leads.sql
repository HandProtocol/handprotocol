-- 016_biz_leads.sql
-- HAND Command Center, business-development outreach (the "Develop" pillar).
-- Targets local businesses with no website but strong Google reviews. The
-- operator qualifies leads by hand, pastes their real Google reviews, and the
-- assistant turns those reviews into a free demo site used as the cold-outreach
-- hook. 33% minimum of any closed deal routes to the HAND pool (deferred).
--
-- Markdown stays canonical at biz/<slug>/lead.md (frontmatter + reviews). These
-- rows are the read replica the app drives off. Writes flow markdown first,
-- then upsert here, same posture as command.grants.

-- ─── biz_leads ──────────────────────────────────────────────────────────
create table if not exists command.biz_leads (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  name                text not null,
  category            text,
  city                text,
  state               text default 'TX',
  phone               text,
  address             text,
  google_url          text,
  google_rating       numeric(2,1) check (google_rating between 0 and 5),
  reviews_count       int,
  website_status      text not null default 'none'
                      check (website_status in ('none','poor','ok')),
  status              text not null default 'prospect'
                      check (status in (
                        'prospect','built','contacted',
                        'interested','closed','passed'
                      )),
  demo_url            text,
  demo_generated_at   timestamptz,
  demo_deployed_at    timestamptz,
  hand_lead           text,
  notes               text,
  kanban_position     int not null default 0,
  column_entered_at   timestamptz not null default now(),
  markdown_path       text not null,
  content_checksum    text,
  last_synced_at      timestamptz default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table command.biz_leads is
  'Business-development outreach leads. One row per biz/<slug>/lead.md. Markdown remains canonical.';
comment on column command.biz_leads.website_status is
  'none = no website (top target), poor = dated site, ok = has a decent site.';
comment on column command.biz_leads.demo_url is
  'Path to the generated demo site, e.g. /demos/<slug>/. Lives in web/demos so the main Netlify deploy serves it.';

create index if not exists biz_leads_status_idx on command.biz_leads(status);
create index if not exists biz_leads_category_idx on command.biz_leads(category);
create index if not exists biz_leads_city_idx on command.biz_leads(city);
create index if not exists biz_leads_kanban_idx on command.biz_leads(status, kanban_position);
create index if not exists biz_leads_name_trgm_idx
  on command.biz_leads using gin (name extensions.gin_trgm_ops);

-- ─── biz_reviews ────────────────────────────────────────────────────────
-- The pasted Google reviews. The content seed for the demo site and the
-- testimonials shown on it. Verbatim, never AI-invented.
create table if not exists command.biz_reviews (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references command.biz_leads(id) on delete cascade,
  author       text,
  rating       int check (rating between 1 and 5),
  body         text not null,
  posted_label text,
  sort         int not null default 0,
  created_at   timestamptz not null default now()
);

comment on table command.biz_reviews is
  'Verbatim Google reviews pasted by the operator. Content seed for the demo site.';

create index if not exists biz_reviews_lead_idx
  on command.biz_reviews(lead_id, sort);

-- ─── biz_touchpoints ────────────────────────────────────────────────────
-- Outreach log. Every call, walk-in, email, text against a lead.
create table if not exists command.biz_touchpoints (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references command.biz_leads(id) on delete cascade,
  method       text not null default 'other'
               check (method in ('call','walk_in','email','text','other')),
  note         text,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

comment on table command.biz_touchpoints is
  'Outreach activity log per business lead.';

create index if not exists biz_touchpoints_lead_idx
  on command.biz_touchpoints(lead_id, occurred_at desc);

-- ─── updated_at + column_entered_at triggers ────────────────────────────
drop trigger if exists biz_leads_touch_updated_at on command.biz_leads;
create trigger biz_leads_touch_updated_at
  before update on command.biz_leads
  for each row execute function command.touch_updated_at();

-- Reuse the same column-entered stamper shape as grants (004): stamp the
-- moment status changes so cycle-time reads stay cheap.
create or replace function command.stamp_biz_column_entered_at()
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

drop trigger if exists biz_leads_stamp_column on command.biz_leads;
create trigger biz_leads_stamp_column
  before update on command.biz_leads
  for each row execute function command.stamp_biz_column_entered_at();

-- ─── activity log trigger (reuses command.log_activity from 009) ─────────
create or replace function command.log_biz_lead_change()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status) then
    perform command.log_activity(
      null, 'biz_lead', new.id, 'status_changed',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      jsonb_build_object('slug', new.slug)
    );
  elsif (tg_op = 'INSERT') then
    perform command.log_activity(
      null, 'biz_lead', new.id, 'created',
      null,
      jsonb_build_object('status', new.status, 'slug', new.slug),
      null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists biz_leads_log_change on command.biz_leads;
create trigger biz_leads_log_change
  after insert or update on command.biz_leads
  for each row execute function command.log_biz_lead_change();

-- ─── RLS (mirrors the funders posture from 013) ─────────────────────────
-- admin full access, contributor read, service_role bypasses by design.
alter table command.biz_leads enable row level security;
alter table command.biz_reviews enable row level security;
alter table command.biz_touchpoints enable row level security;

drop policy if exists biz_leads_read on command.biz_leads;
create policy biz_leads_read on command.biz_leads
  for select using (command.current_role() in ('admin','contributor','viewer'));

drop policy if exists biz_leads_admin_write on command.biz_leads;
create policy biz_leads_admin_write on command.biz_leads
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists biz_reviews_read on command.biz_reviews;
create policy biz_reviews_read on command.biz_reviews
  for select using (command.current_role() in ('admin','contributor','viewer'));

drop policy if exists biz_reviews_admin_write on command.biz_reviews;
create policy biz_reviews_admin_write on command.biz_reviews
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists biz_touchpoints_read on command.biz_touchpoints;
create policy biz_touchpoints_read on command.biz_touchpoints
  for select using (command.current_role() in ('admin','contributor','viewer'));

drop policy if exists biz_touchpoints_admin_write on command.biz_touchpoints;
create policy biz_touchpoints_admin_write on command.biz_touchpoints
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');
