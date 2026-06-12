# HAND Command Center

A working command bridge for HAND Protocol's grant program. Next.js 16
admin portal for the grant pipeline. Localhost-only through Phase 5.

This directory is the operator's chair, not the operator's filing cabinet.
Markdown files in `funding/grants/*.md` remain canonical. The command
center renders, sorts, filters, and edits them, mirroring the
frontmatter into Supabase as a fast read replica. See the PRD at
`../funding/grants/_command-center-prd.md`.

## Run

```bash
cd /home/koh/Documents/handprotocol/command
npm install            # first time only
cp .env.example .env.local   # then fill in (see "Auth flow" below)
npm run dev
```

The dev server binds to `127.0.0.1:3000`. Visit
[http://127.0.0.1:3000](http://127.0.0.1:3000). You will land on the cold-boot
loader, then transition to `/dashboard` after the minimum 1.4s dwell.

`npm run build` produces the production build. `npm run start` serves it,
also bound to 127.0.0.1.

## What ships in Phase 1

- Full Supabase schema for the command center at the `command` namespace.
  Thirteen numbered migrations under `supabase/migrations/`. Includes
  profiles, funders, grants, touchpoints, boilerplate, attachments,
  comments, section locks, activity log, notifications, assistant runs,
  invites, and RLS policies for the three roles.
- Markdown ingest at `npm run ingest:grants`. Reads every
  `funding/grants/*.md` (skipping `_`-prefixed files), parses
  frontmatter, upserts funders by slug, upserts grants by slug.
- Pipeline kanban at `/grants`. Six columns matching the PRD status
  enum, drag-to-transition fires a server action that writes the
  markdown frontmatter first and then upserts Supabase. Sort toggle
  between deadline-ascending and fit-score-descending.
- Grant detail view at `/grants/<slug>`. Reads the markdown file
  directly so the page works even when Supabase is unreachable. Has
  three panels: editable frontmatter form, editable section tabs with
  1-second autosave, append-only activity timeline.
- New-grant scaffold at `/grants/new`. Copies the standard template,
  fills frontmatter, generates a slug, writes the file, upserts the
  row, redirects to the detail view.
- Fit-score field as a 1-5 chip selector on the detail view. Color
  band on the kanban card (1-2 muted, 3 neutral, 4-5 amber-glow).
  Persists immediately on change.
- HUD-dark theme extended with status-chip palette and prose styling
  for the markdown render.

## What ships in Phase 2

- Attachment vault at `/grants/<slug>/attachments`. Drag-and-drop zone
  at the top, list of existing files below. Uploads land in the
  Supabase Storage bucket `command-attachments` under
  `<slug>/<uuid>-<filename>`, metadata rows in `command.attachments`.
  Open links are 24-hour signed URLs. Delete is a two-step (arm,
  confirm) and removes both the Storage object and the metadata row in
  one transaction-like flow, with a `attachment_deleted` activity log
  entry. Per-file constraints: 25 MB max, allowed types are PDF,
  PNG, JPG, WEBP, Markdown, plain text, DOCX, XLSX.
- Submission archive snapshot. When a grant's status flips to
  `submitted`, the action snapshots the canonical state before any
  mutation: copies the markdown to
  `funding/grants/_submissions/<slug>-<YYYYMMDD-HHmm>/grant.md`, copies
  every attachment from Supabase Storage into the same archive
  directory under `attachments/`, writes a `metadata.json` next to
  them with the timestamp, content checksum, and attachment count.
  Logs `submitted_archive` to `command.activity_log` pointing at the
  archive directory. A snapshot failure aborts the status flip with a
  clear error, so the record of what was sent stays exact.
- Pre-submit checklist at `src/components/grants/submit-checklist.tsx`.
  Renders before the status flip is confirmed. Auto-derives a list of
  checks from the grant markdown (required H2 sections non-empty,
  attachments present, funder and application URL populated). Override
  available if the operator already submitted out of band.
- Quick-capture inbox at `/inbox`. A capture form at the top accepts a
  URL, an optional title, and a free-form notes body; pulse on save.
  The list below filters by status (needs triage, became grant, became
  funder, discarded). Each row expands inline into a triage panel with
  three outcomes: promote to a new grant (writes the markdown file
  first, then the Supabase rows, same writeback contract as
  `createGrant`), promote to a new funder, or discard with a one-line
  reason. External integrations land via `POST /api/inbox/capture`
  with a shared-secret header `x-hand-capture-key` checked against
  `INBOX_CAPTURE_KEY`. The browser extension and an email-forward
  worker share this endpoint.
- Universal search at cmd+K (or ctrl+K) from any dashboard route.
  Mounted globally in `(dashboard)/layout.tsx`. Searches grants by
  slug or name, funders by slug or name, boilerplate by slug or
  title, inbox items by title or body. Five results per type, grouped
  in the dropdown. Empty query shows recents from `localStorage`
  (last eight visits). Arrow keys navigate, enter opens, esc closes.
- Drafting assistant. Each H2 section in the grant detail view has an
  Assist button (sparkle icon) that opens a slide-out drawer. The
  operator types a question, the route handler at `POST /api/draft-answer`
  pulls the grant's context, grounds the call on `hand-context.md`,
  the AI stance, the Mystic Hearts framing, and the top-3 boilerplate
  snippets that match the question (pg_trgm), then composes a
  voice-rules-enforcing system prompt and routes through the AI router
  (Anthropic primary, see `src/lib/ai-router/`). The drawer renders the
  draft as markdown with the grounding snippet chips and a voice-flag
  panel; Accept replaces the section content via a server-action
  helper and fires the amber pulse, Reject closes the drawer. Every
  call logs to `command.assistant_runs` with provider, model_key,
  tokens, cost estimate, duration, output preview, and the operator's
  accept or reject flag. If `ANTHROPIC_API_KEY` is not set the route
  returns a stub draft listing the grounding snippets that would have
  been used.
- RFP checklist extractor. A Paste RFP button at the top right of the
  grant detail view opens a modal. The operator pastes RFP text, hits
  Extract, the route handler at `POST /api/extract-checklist` calls
  the AI router with a tight JSON-only prompt and returns a structured
  list `[{title, description, attachment_needed}]`. The modal previews
  the parsed checklist; Save writes it as a new `## Requirements
  checklist` section in the grant markdown via the same server-action
  helper. Each item renders with an attachment marker when the
  funder asked for a file upload. Calls log to `command.assistant_runs`
  with surface `rfp-extract`. Without `ANTHROPIC_API_KEY` the route
  returns a stub with an empty checklist and a friendly note.

## What stays stubbed for later phases

- AI features beyond drafting and RFP extraction (fit-score generator,
  voice linter inline in the editor, retrospective prompt). Phase 3
  and beyond.
- Funder library and touchpoint log UI (schema exists). Phase 3.
- Deadline radar, pipeline analytics, XLSX export. Phase 4.
- Collaboration (comments, section locks, presence, assignments,
  mentions). Phase 4. Schema is in place from Phase 1.
- Notifications. Schema and bell are in place; delivery channels in
  Phase 4.
- Deploy to `command.handprotocol.org` as a separate Netlify site.
  Phase 5.

## Schema deployment

Migrations live at `supabase/migrations/` and apply in numerical order.
The detailed steps live at `supabase/migrations/README.md`. The
condensed version:

```bash
supabase link --project-ref vconmgerblqbworcqkvr --password "$SUPABASE_DB_PASSWORD"
supabase db push
```

If `supabase db push` cannot reach the project (some environments lack
IPv6 outbound and the IPv4 pooler add-on may not be enabled), paste
each file from `supabase/migrations/0*.sql` into the Supabase SQL
editor in order.

After applying:

1. Expose the `command` schema to PostgREST. In the dashboard:
   `Project Settings → API → Exposed schemas` → add `command`. This is
   the line that flips PostgREST from "Invalid schema: command" to
   honoring the queries.
2. Promote the founder to admin. After first sign-in at
   `/auth/login`, run in SQL editor:

   ```sql
   update command.profiles set role = 'admin' where email = 'cshearer210@gmail.com';
   ```

3. Verify:

   ```sql
   select count(*) from command.grants;
   select count(*) from command.funders;
   select tablename from pg_tables where schemaname = 'command' order by tablename;
   ```

4. Spot-check the assistant log after a few drafting runs:

   ```sql
   select surface, model_key, tokens_in, tokens_out, cost_usd, accepted, occurred_at
     from command.assistant_runs
     order by occurred_at desc
     limit 5;
   ```

## Markdown ingest

```bash
npm run ingest:grants
```

Reads every `funding/grants/*.md` (skipping `_`-prefixed templates and
research docs), parses YAML frontmatter, derives a funder slug from the
`funder:` field, upserts into `command.funders`, upserts into
`command.grants`. Idempotent. Run after applying migrations, then on
demand to pick up edits made directly to the markdown files outside
the command center.

The summary prints scanned, inserted, updated, unchanged, funders
created, funders updated, and any per-file errors.

## Markdown writeback contract

The load-bearing rule of the command center. Every server action that
mutates a grant:

1. Reads the current markdown file at `funding/grants/<slug>.md`.
2. Computes the new content (updated frontmatter or replaced section).
3. Writes the file atomically: a temp file in the same directory,
   fsync, then rename. A process crash mid-write never corrupts the
   canonical source.
4. Computes the new SHA-256 checksum.
5. Upserts the Supabase row with the new fields, the new checksum, and
   `last_synced_at = now()`.
6. If the Supabase write fails after the markdown write succeeds, sets
   `last_synced_at = null` so the nightly reconciler (Phase 5) picks
   it up. The markdown remains canonical either way.

Server actions that follow this contract:

- `updateGrantStatus(slug, status)`, also stamps `submitted_on` or
  `decided_on` when entering Submitted, Awarded, or Declined. On a
  fresh transition into `submitted`, runs the submission archive
  snapshot first (see `src/lib/grants/submission-archive.ts`). A
  snapshot failure aborts the status flip.
- `updateGrantFrontmatter(slug, patch)`, partial frontmatter update.
- `updateGrantSection(slug, heading, content)`, replaces a single H2
  section in the markdown body, leaves frontmatter untouched.
- `updateGrantFitScore(slug, score)`, convenience wrapper around
  `updateGrantFrontmatter` clamped to 1-5 or null.
- `createGrant(formData)`, copies `_template.md`, fills frontmatter,
  generates a slug, inserts the row, redirects to the detail view.
- `uploadAttachments(slug, formData)`, validates file size and type,
  uploads to the Supabase Storage bucket `command-attachments`,
  inserts a `command.attachments` row, logs `attachment_uploaded` to
  `command.activity_log`.
- `deleteAttachment(slug, attachmentId)`, removes the Storage object
  first, then the metadata row, logs `attachment_deleted`.
- `writeGrantSectionFromAssistant(slug, heading, content)`, the
  assistant-lane helper that the drafting drawer and RFP modal use to
  write accepted drafts and parsed checklists. Same atomic write
  contract; defers the Supabase row refresh to the next regular save.

All paths in this layer are absolute. The repo root is resolved as
`path.resolve(process.cwd(), "..")` from the `command/` project.

## Auth flow

The command center uses Supabase Auth, lifted from
`noredFarms/reps/src/lib/supabase/*`. The schema name is `command`
(versus `reps` in the source). To make auth real:

1. Apply migrations (above).
2. Expose the `command` schema (above).
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Phase 0 already wired
   these.
4. Restart `npm run dev`. The proxy (`src/proxy.ts`) gates routes and
   redirects unauth'd traffic to `/auth/login`.
5. After first sign-in, promote the founder to admin (see "Schema
   deployment").

Until those vars are set, the dashboard renders in a preview role so
the scaffold is visible end-to-end without a live project. The grant
detail view reads from the markdown file directly, so it also works
without Supabase. The kanban shows an empty pipeline with a
configuration hint until the ingest has populated rows.

## AI router and assistant config

The drafting assistant and RFP extractor route every model call through
`src/lib/ai-router/`. Anthropic is the only wired provider for now; the
factory map in `router.ts` accepts additional providers behind a
keyed-config check, so adding an OpenAI or Venice provider is a single
file and one env var.

Env vars the assistant reads:

- `ANTHROPIC_API_KEY`, the active provider key. When absent, both
  routes return a stub instead of failing.
- `AI_PRIMARY_PROVIDER`, defaults to `anthropic`. The fallback chain is
  set via `AI_FALLBACK_PROVIDERS` as a comma-separated list.
- `AI_DEFAULT_MODEL`, defaults to `claude-sonnet-4-5-20250929`.

The voice rules in `src/lib/ai-router/voice.ts` are embedded into every
system prompt the assistant sends. The post-pass auto-fixes em dashes
before the draft is shown; vendor-name leaks and forbidden phrases
surface as voice-flag chips inside the assist drawer so the operator
can correct them before accepting.

## Data model contract

| Layer | What it holds | Authoritative? |
|---|---|---|
| Markdown frontmatter in `../funding/grants/*.md` | `slug`, `name`, `status`, `deadline`, `fit_score`, contacts | Canonical |
| Markdown body | TL;DR, fit assessment, draft answers, retrospective | Canonical |
| Supabase `command.grants` | Frontmatter mirror plus `kanban_position`, `column_entered_at`, `last_synced_at`, `content_checksum` | Read replica |
| Supabase `command.funders` | Curated funder library | Canonical (no markdown counterpart yet) |
| Supabase `command.touchpoints` | Funder communication log | Canonical |
| Supabase `command.boilerplate` | Reusable snippets | Canonical, exports to markdown on demand |
| Supabase `command.attachments` | File metadata for files in Storage bucket `command-attachments` | Canonical |
| Supabase `command.assistant_runs` | One row per AI call. Surface, provider, model_key, tokens, cost, duration, accept/reject. | Canonical |
| Supabase `command.activity_log` | Every state change, every save | Canonical |
| `funding/grants/_submissions/<slug>-<ts>/` | Frozen snapshot at submission time (markdown + attachments + metadata.json) | Canonical, immutable |
| Git history | Diffs of every markdown change | The audit log |

The implication: server actions write the markdown file first, then
upsert the Supabase row. If Supabase disappears, the grants are still
in git. If a new admin pulls main on a new laptop,
`npm run ingest:grants` rebuilds the Supabase mirror from markdown.

## HUD-dark theme

Two rooms in one building. Public surfaces are warm editorial. Operator
surfaces, including this one, are HUD-dark. The palette comes verbatim
from the loader at `../web/3d-test/loading.html` and lives in
`src/app/globals.css`.

Token reference (extend by adding new CSS custom properties at the top
of `globals.css`, then mirroring them into the `@theme inline` block so
Tailwind 4 utilities pick them up):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#07090f` | Page background |
| `--bg-2` | `#0c1220` | Card / panel base |
| `--ink` | `#f5efe1` | Primary text, cream |
| `--ink-dim` | `#8e8a7e` | Secondary text |
| `--ink-faint` | `#4a4940` | Captions, decorative |
| `--amber` | `#d97706` | Signature accent |
| `--amber-soft` | `#ffba49` | Glow, focus rings |
| `--grid` | `rgba(217,119,6,0.08)` | 56px HUD grid, radial-masked |
| `--hud` | `rgba(245,239,225,0.18)` | Brackets, ring chrome |
| `--status-discovery` | `#6b8eff` | Discovery chip |
| `--status-drafting` | `#ffba49` | Drafting chip |
| `--status-submitted` | `#d97706` | Submitted chip |
| `--status-awarded` | `#4ade80` | Awarded chip |
| `--status-declined` | `#8e8a7e` | Declined chip |
| `--status-withdrawn` | `#4a4940` | Withdrawn chip |

Helper classes:

- `.hud-surface`, page wrapper that adds the radial backdrop and grid mask
- `.hud-bracket` + `.hud-bracket-{tl,tr,bl,br}`, the 18px corner brackets
- `.eyebrow`, JetBrains Mono uppercase label, used for status, timestamps, IDs
- `.panel`, baseline card surface
- `.status-chip[data-status="..."]`, pipeline status pill
- `.prose-hud`, dark-theme markdown body styling
- `.hud-input`, `.hud-textarea`, `.hud-label`, form primitives

Typography: Inter for body, JetBrains Mono for any string that looks
like a database value. Both load via `next/font/google` in
`src/app/layout.tsx`.

## Voice rules

These apply to everything written into this app, including README copy,
UI strings, engineering comments visible to operators, and any text the
assistant ever generates into a grant draft.

- No em dashes. Use commas, periods, parentheses, or "and"
- No AI tells. Avoid: furthermore, leverage, robust, ecosystem,
  navigate the complexities, delve into, in conclusion
- No specific AI model names in operator-facing copy. Engineering
  comments may name models for clarity.
- Mission terms: Reciprocates, Contributors, Sovereign Reciprocates,
  501(c)(3) in formation
- Dollar amounts with commas, no rounding: `$22,777` not `$22K`

## File map

```
command/
├─ public/
│  ├─ loading.html              # the 3D loader, copied from web/3d-test/
│  └─ models/
│     └─ jtoastie-rigged-hand.glb
├─ scripts/
│  └─ ingest-grants.ts          # CLI for markdown -> supabase mirror
├─ supabase/
│  └─ migrations/
│     ├─ 001_command_schema.sql
│     ├─ 002_profiles.sql
│     ├─ 003_funders.sql
│     ├─ 004_grants.sql
│     ├─ 005_touchpoints.sql
│     ├─ 006_boilerplate.sql
│     ├─ 007_attachments.sql
│     ├─ 008_comments.sql
│     ├─ 009_activity_log.sql
│     ├─ 010_notifications.sql
│     ├─ 011_assistant_runs.sql
│     ├─ 012_invites.sql
│     ├─ 013_rls_policies.sql
│     └─ README.md              # how to apply
├─ src/
│  ├─ app/
│  │  ├─ globals.css            # HUD-dark token layer + prose
│  │  ├─ layout.tsx             # Inter + JetBrains Mono, dark by default
│  │  ├─ page.tsx               # cold-boot loader, hands off to /dashboard
│  │  ├─ api/
│  │  │  ├─ draft-answer/route.ts        # Phase 2 drafting assistant
│  │  │  └─ extract-checklist/route.ts   # Phase 2 RFP extractor
│  │  ├─ auth/
│  │  │  ├─ login/page.tsx
│  │  │  └─ callback/route.ts
│  │  └─ (dashboard)/
│  │     ├─ layout.tsx          # gated route group, sidebar + HUD chrome
│  │     ├─ dashboard/page.tsx  # H/A/N/D pillar placeholder
│  │     └─ grants/
│  │        ├─ page.tsx         # H1: kanban
│  │        ├─ new/page.tsx     # H3: new-grant scaffold
│  │        ├─ [slug]/page.tsx  # H2: grant detail
│  │        └─ [slug]/
│  │           └─ attachments/page.tsx  # H6: attachment vault
│  ├─ components/
│  │  ├─ loader-splash.tsx
│  │  ├─ sidebar-nav.tsx
│  │  ├─ mobile-nav.tsx
│  │  ├─ notification-bell.tsx
│  │  ├─ kanban/
│  │  │  ├─ kanban-board.tsx    # H1: six columns, drag-to-transition
│  │  │  ├─ grant-card.tsx
│  │  │  ├─ status-chip.tsx
│  │  │  ├─ fit-score-chip.tsx  # A1: color-banded fit score
│  │  │  └─ deadline-chip.tsx
│  │  ├─ grants/
│  │  │  ├─ frontmatter-form.tsx  # H2: editable frontmatter
│  │  │  ├─ section-editor.tsx    # H2: editable sections, 1s autosave, assist button
│  │  │  ├─ grant-markdown.tsx    # react-markdown wrapper
│  │  │  ├─ activity-panel.tsx    # H2: append-only timeline
│  │  │  ├─ assist-drawer.tsx     # Phase 2: drafting assistant drawer
│  │  │  ├─ rfp-modal.tsx         # Phase 2: paste-RFP modal + trigger
│  │  │  └─ submit-checklist.tsx  # H2: pre-submit checks, Phase 2
│  │  ├─ attachments/
│  │  │  ├─ upload-zone.tsx       # H6: drag-and-drop upload
│  │  │  ├─ attachment-list.tsx   # H6: list wrapper
│  │  │  └─ attachment-row.tsx    # H6: one row, open + delete
│  │  └─ ui/                    # button, input, label, sonner
│  ├─ lib/
│  │  ├─ utils.ts               # cn()
│  │  ├─ supabase/              # client, server, middleware, profile
│  │  ├─ ai-router/             # Phase 2 provider-agnostic LLM router
│  │  │  ├─ types.ts
│  │  │  ├─ router.ts
│  │  │  ├─ voice.ts            # voice rules prompt + linter
│  │  │  └─ providers/anthropic.ts
│  │  ├─ assistant/             # Phase 2 drafting + RFP-extract surfaces
│  │  │  ├─ grounding.ts        # hand-context + framing + top-3 boilerplate
│  │  │  ├─ prompts.ts          # system prompt builders
│  │  │  ├─ log.ts              # assistant_runs writer
│  │  │  └─ actions.ts          # server actions (accept/reject, write section)
│  │  ├─ attachments/           # Phase 2 attachment vault data layer
│  │  │  ├─ types.ts
│  │  │  ├─ queries.ts
│  │  │  └─ actions.ts          # upload + delete server actions
│  │  └─ grants/                # the data layer for Phase 1
│  │     ├─ types.ts
│  │     ├─ paths.ts
│  │     ├─ slug.ts
│  │     ├─ markdown.ts         # gray-matter wrapper + atomic write
│  │     ├─ file-read.ts        # disk reader for the detail view
│  │     ├─ queries.ts          # supabase reads
│  │     ├─ activity.ts         # activity-log + row-derived merger
│  │     ├─ actions.ts          # server actions
│  │     ├─ submission-archive.ts # Phase 2 snapshot on status flip
│  │     └─ ingest.ts           # the markdown -> supabase mirror
│  └─ proxy.ts                  # Next.js 16 middleware (renamed Proxy)
├─ .env.example
├─ .gitignore
└─ package.json                 # dev/start scripts bound to 127.0.0.1
```

## Why this directory is excluded from the public Netlify site

The handprotocol Netlify site is configured at the repo root with
`publish = "web"`, so only files under `web/` ever ship to the public
site. The `command/` directory builds locally, never as part of the
public deploy. The `.gitignore` here also blocks `.next/` and
`node_modules/` from being committed by accident.
