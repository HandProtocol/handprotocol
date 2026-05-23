-- 015_feedback_pins.sql
-- HAND Command Center UX feedback pins. Ported from
-- noredFarms/admin/migration-feedback-pins.sql into the `command` schema.
--
-- A pin records a click-target on a public HAND surface
-- (handprotocol.org/foundation-campaign/, etc.) plus operator comment,
-- priority, and an optional element screenshot. The inspector UI lives at
-- /inspector and the triage kanban at /pins.

create table if not exists command.feedback_pins (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Where the pin landed. page_url is a path like "/foundation-campaign/".
  page_url            text not null,
  page_title          text,

  -- Element selectors. Primary is the best guess, fallback is an ordered
  -- list of degrading-confidence alternatives (id, class combo, nth-child,
  -- full DOM path). The inspector tries them in order when re-rendering
  -- the overlay.
  selector_primary    text not null,
  selector_fallback   text[],
  element_tag         text,
  element_classes     text[],
  element_text        text,
  bounding_box        jsonb,

  -- Operator-supplied
  comment             text not null,
  priority            text not null default 'normal'
                        check (priority in ('low','normal','high','critical')),
  status              text not null default 'open'
                        check (status in ('open','in-progress','resolved')),

  -- Authorship. author_id is the command.profiles row, mirroring how the
  -- rest of the schema attributes records.
  author_id           uuid references command.profiles(id) on delete set null,
  author_email        text,
  author_name         text,

  -- Threaded replies on a pin live in this jsonb array. Shape:
  --   [{ author: "koH", text: "...", time: "2026-05-22T..." }]
  thread              jsonb not null default '[]'::jsonb,

  -- Element context captured at pin time so the kanban can render
  -- something useful even after the public site has shifted.
  element_context     jsonb,
  css_overrides       jsonb not null default '{}'::jsonb,
  screenshot_url      text,
  viewport_width      integer
);

comment on table command.feedback_pins is
  'UX feedback pins. One row per operator pin dropped on a HAND public surface via the /inspector route.';

create index if not exists feedback_pins_page_idx
  on command.feedback_pins(page_url);
create index if not exists feedback_pins_status_idx
  on command.feedback_pins(status);
create index if not exists feedback_pins_author_idx
  on command.feedback_pins(author_id);
create index if not exists feedback_pins_created_idx
  on command.feedback_pins(created_at desc);

drop trigger if exists feedback_pins_touch_updated_at on command.feedback_pins;
create trigger feedback_pins_touch_updated_at
  before update on command.feedback_pins
  for each row execute function command.touch_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────
-- Matches the role matrix established in 013_rls_policies.sql:
--   admin       full access
--   contributor read all, write own
--   viewer      read all (pins are operator-internal, not group-scoped)

alter table command.feedback_pins enable row level security;

drop policy if exists feedback_pins_admin_all on command.feedback_pins;
create policy feedback_pins_admin_all on command.feedback_pins
  for all using (command.current_role() = 'admin')
  with check (command.current_role() = 'admin');

drop policy if exists feedback_pins_contributor_read on command.feedback_pins;
create policy feedback_pins_contributor_read on command.feedback_pins
  for select using (command.current_role() in ('contributor','viewer'));

drop policy if exists feedback_pins_contributor_insert on command.feedback_pins;
create policy feedback_pins_contributor_insert on command.feedback_pins
  for insert with check (
    command.current_role() = 'contributor'
    and author_id = auth.uid()
  );

drop policy if exists feedback_pins_contributor_update_own on command.feedback_pins;
create policy feedback_pins_contributor_update_own on command.feedback_pins
  for update using (
    command.current_role() = 'contributor'
    and author_id = auth.uid()
  ) with check (
    command.current_role() = 'contributor'
    and author_id = auth.uid()
  );
