-- 014_inbox_items.sql
-- HAND Command Center quick-capture inbox.
-- Operator pastes a funder URL, an RFP excerpt, or a screenshot of a
-- program page. The capture lands here as a raw lead, to be triaged
-- later into a grant or a funder, or discarded with a reason. PRD
-- section 7.1 H4. Phase 2.

create table if not exists command.inbox_items (
  id            uuid primary key default gen_random_uuid(),
  title         text,                 -- short label; nullable when only a URL was pasted
  url           text,                 -- the source URL, if any
  body          text,                 -- the pasted RFP text or notes
  source        text not null default 'manual'
                check (source in ('manual','api','email','extension')),
  status        text not null default 'needs_triage'
                check (status in (
                  'needs_triage',
                  'becomes_grant',
                  'becomes_funder',
                  'discarded'
                )),
  resolution_notes text,              -- why discarded, or which slug it became
  resolved_slug text,                 -- grant or funder slug the lead became
  captured_by   uuid references command.profiles(id) on delete set null,
  captured_at   timestamptz not null default now(),
  resolved_at   timestamptz
);

comment on table command.inbox_items is
  'Quick-capture inbox for raw funder leads. Operator triages into a grant, a funder, or discards.';

create index if not exists inbox_items_status_idx
  on command.inbox_items(status, captured_at desc);
create index if not exists inbox_items_captured_idx
  on command.inbox_items(captured_at desc);
create index if not exists inbox_items_title_trgm_idx
  on command.inbox_items using gin (title extensions.gin_trgm_ops);
create index if not exists inbox_items_body_trgm_idx
  on command.inbox_items using gin (body extensions.gin_trgm_ops);

-- RLS aligned with the rest of the command schema. Admins read and
-- write. The API route uses the service role for unauthenticated
-- captures (e.g. the future browser extension), so the policies stay
-- restrictive on the user-facing side.
alter table command.inbox_items enable row level security;

drop policy if exists "inbox_items admin all" on command.inbox_items;
create policy "inbox_items admin all"
  on command.inbox_items
  for all
  to authenticated
  using (
    exists (
      select 1 from command.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from command.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "inbox_items contributor read" on command.inbox_items;
create policy "inbox_items contributor read"
  on command.inbox_items
  for select
  to authenticated
  using (
    exists (
      select 1 from command.profiles p
      where p.id = auth.uid() and p.role = 'contributor'
    )
  );
