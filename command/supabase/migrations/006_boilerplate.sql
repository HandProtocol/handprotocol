-- 006_boilerplate.sql
-- HAND Command Center boilerplate library.
-- Reusable snippets (mission paragraph, theory of change, team bios, the
-- 501(c)(3) in formation language, foundation tiers, three communities,
-- eight sovereignty principles). Versioned. Phase 2 feature, schema in
-- place from Phase 1 so the relationship survives.

create table if not exists command.boilerplate (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  category     text not null,
  title        text not null,
  content      text not null,
  word_count   int generated always as (
                 array_length(string_to_array(trim(content), ' '), 1)
               ) stored,
  version      int not null default 1,
  active       boolean not null default true,
  tags         text[] default '{}',
  notes        text,
  created_by   uuid references command.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table command.boilerplate is
  'Curated reusable snippets. Insert via slash menu in the grant detail view (Phase 2 A2).';

create index if not exists boilerplate_category_idx on command.boilerplate(category);
create index if not exists boilerplate_active_idx on command.boilerplate(active);
create index if not exists boilerplate_tags_idx on command.boilerplate using gin (tags);
create index if not exists boilerplate_title_trgm_idx on command.boilerplate
  using gin (title extensions.gin_trgm_ops);

drop trigger if exists boilerplate_touch_updated_at on command.boilerplate;
create trigger boilerplate_touch_updated_at
  before update on command.boilerplate
  for each row execute function command.touch_updated_at();
