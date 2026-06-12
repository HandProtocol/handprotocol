-- 003_funders.sql
-- HAND Command Center funder library.
-- Per PRD section 6.3. Canonical (no markdown counterpart yet). Curated by
-- the operator. Indexed for the funder library view (Phase 3 N1).

create table if not exists command.funders (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique,
  name                     text not null,
  funder_url               text,
  type                     text check (type in (
                             'foundation','government','corporate',
                             'community','individual','dao','program'
                           )),
  geography                text[] default '{}',
  focus_areas              text[] default '{}',
  mission_alignment_notes  text,
  fit_score                int check (fit_score between 1 and 5),
  annual_cycle             text,
  ein                      text,
  last_990_year            int,
  giving_total_recent      numeric,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table command.funders is
  'Curated funder library. Tied to grants via funders.id. Touchpoints tied to the funder, not the grant.';

create index if not exists funders_slug_idx on command.funders(slug);
create index if not exists funders_name_trgm_idx on command.funders using gin (name extensions.gin_trgm_ops);
create index if not exists funders_type_idx on command.funders(type);
create index if not exists funders_focus_areas_idx on command.funders using gin (focus_areas);
create index if not exists funders_geography_idx on command.funders using gin (geography);

-- updated_at trigger
create or replace function command.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists funders_touch_updated_at on command.funders;
create trigger funders_touch_updated_at
  before update on command.funders
  for each row execute function command.touch_updated_at();
