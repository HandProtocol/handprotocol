---
date_created: 2026-05-19
date_revised: 2026-05-19
version: 0.2
status: draft
owner: Russell Herod (koH)
title: HAND Command Center
subtitle: A holistic approach to nurture and develop HAND's grant pipeline
contributing_research:
  - funding/grants/_platform-research.md (2026-05-19)
  - funding/grants/_infra-inventory.md (2026-05-19)
  - funding/grants/_hand-biz-outreach-scoping.md (2026-05-19)
  - funding/grants/_low-hanging-survey.md (2026-05-18)
canonical_context:
  - ~/.claude/skills/grants/references/hand-context.md
  - funding/framing/ai-stance.md
  - funding/framing/mystic-hearts.md
voice_compliance: no em dashes, no AI tells, no specific model names in operator-facing copy, full HAND mission terms, dollar amounts with commas
---

# HAND Command Center

A working command bridge for HAND Protocol's grant program. The interface a future bench of grant admins will live in. Today, koH solo. Tomorrow, three. Eventually, a real desk.

This document is the v1 plan, v0.2 of the PRD. It rests on three pieces of research from 2026-05-18 and 2026-05-19, the canonical HAND context, the AI stance and Mystic Hearts framing docs, and the visual language of `web/3d-test/loading.html`. Phase 0 (scaffold and loader handoff) is already shipped at `handprotocol/command/`. This revision expands the feature set, the data model, the AI surface, the collaboration model, and the system operations layer, in preparation for Phases 1 through 6.

---

## 1. The naming as the spine

HAND already stands for **Holistic Approach to Nurture and Develop**. The loading screen says it letter by letter. The command center honors that:

| Letter | Pillar | What it covers |
|---|---|---|
| **H** olistic | One source of truth | Every grant, funder, retro, follow-up, attachment, and boilerplate snippet visible in one bridge. Markdown is canonical. Supabase is the read replica. Git is the audit log. |
| **A** pproach | The operator's methodology | A command center that teaches the workflow it expects. Kanban, deadline radar, fit-score field, boilerplate library, voice linter, and AI assistants all encode the way HAND chooses to work. |
| **N** urture | Funder relationships, voice consistency | Touchpoint log tied to the funder, not the grant. Boilerplate that carries the voice across applications. Win/loss retros that feed back into fit-scoring. Relationship cadence reminders. |
| **D** evelop | Pipeline growth, learning loops | Discovery curation. Fit assessment as a first-class action. Cross-grant analytics on cycle time, win rate, funder concentration. The pipeline gets smarter every quarter. |

The dashboard navigation reads `Holistic · Approach · Nurture · Develop`, each linking to a section that contains the features below. The corner HUD label on every page names the active pillar.

---

## 2. The wedge

Every commercial platform in the survey (Sweetspot, Instrumentl, Submittable, Fluxx, Grantable, Foundant) assumes the operator's source of truth lives inside their database. HAND already has a different source of truth: one markdown file per grant in `funding/grants/`, frontmatter for structured fields, prose body for the actual draft.

The wedge: **do not replace that.** Build a renderer, a kanban, a calendar, an AI assistant, and a relationship CRM **on top of** the existing markdown. Every feature is a `frontmatter + view + agent` composition. The markdown stays canonical. The command center becomes the operator's chair, not the operator's filing cabinet.

Three downstream consequences of that wedge:

1. **Sovereignty by default.** The operator can leave the tool tomorrow and the work walks out with them as a git repo. This is the same sovereignty stance the AI framing doc takes about model choice.
2. **Git history is the audit trail.** No commercial platform offers a free, complete, cryptographically-signed audit log of every change. We get it because the source of truth is files in a versioned repo.
3. **AI surfaces stay grounded.** Every AI feature reads from the markdown plus the canonical context files. There is no hidden model context; the operator can see exactly what the assistant saw.

---

## 3. Audience and stages

### V1 audience (today through Q3 2026)
- koH (founder, primary admin)
- One to three additional admins joining as HAND formalizes
- Specifically: a future board grant chair, a future ED, the fiscal sponsor liaison once that lands

### V2 audience (Q4 2026 through Q2 2027)
- Reciprocate-group leads accessing grants tied to their group (Mystic Hearts lead can see Mystic Hearts-tagged grants, no others)
- Contributors with comment-only access for review rounds
- Board members with read-only quarterly reporting view

### V3 audience (not in this PRD)
- A grant-applicant portal where Reciprocate groups can request HAND support for their own grants
- Public transparency view (a redacted version of the pipeline showing what HAND is going after, no draft details)

---

## 4. Non-goals

Explicit list of what v1 does not build, drawn from the platform survey's "do not build for solo founders" list and HAND's actual stage:

- Multi-reviewer scoring rubrics and conflict-of-interest workflows. One operator does not need a review board.
- E-sign integration. Every funder uses a different portal.
- Direct submission portal integrations. Same reason.
- Disbursement ledger and accounts-payable integration. Wait until five active awards.
- Enterprise SSO, SOC 2 audit logging, role matrices. Wait until ten admin users.
- A 130,000-funder discovery crawl. HAND curates fifty to one hundred fifty high-fit funders. Quality over quantity is the posture.
- Replacement of the existing markdown grant files. They stay canonical.
- A new web design system. Reuse the warm-editorial system for the public side and the HUD-dark system from `loading.html` for the admin side.
- Donor CRM. That is a separate problem and a separate tool. Grant funders and individual donors live apart.
- Real-time collaborative editing (Google Docs style). Section locks plus presence indicators are enough.
- Internationalization or multi-language. HAND is English-first, US-focused. Revisit when international funders enter the pipeline.
- Native mobile app. Responsive web is the answer.

---

## 5. Visual language

Two rooms in one building.

### Public surfaces (existing)

Warm editorial. White surfaces, near-black text with warm cast, amber accent at five to ten percent coverage. Used by `web/foundation-campaign/`, `web/discovery/`, `web/governance/`, `web/grants/` (the public tracker), `web/reciprocates/`, `web/sovereign-reciprocates/`. Patron-facing.

### Command center (new)

HUD-dark. Deep navy `#07090f` with subtle amber grid, cream ink, signature amber for action and state. Operator-facing. The design tokens come directly from `web/3d-test/loading.html`:

| Token | Value | Use |
|---|---|---|
| `--bg` | `#07090f` | Page background |
| `--bg-2` | `#0c1220` | Card and panel base |
| `--ink` | `#f5efe1` | Primary text, cream |
| `--ink-dim` | `#8e8a7e` | Secondary text |
| `--ink-faint` | `#4a4940` | Captions, decorative |
| `--amber` | `#d97706` | Signature accent |
| `--amber-soft` | `#ffba49` | Glow, focus rings |
| `--amber-deep` | `#b45309` | Hover state |
| `--ok` | `#10b981` | Success, awarded state |
| `--warn` | `#f59e0b` | Caution, deadline approaching |
| `--danger` | `#dc2626` | Destructive action, declined state |
| `--grid` | `rgba(217,119,6,0.08)` | 56px HUD grid, radial-masked |
| `--hud` | `rgba(245,239,225,0.18)` | Brackets, ring chrome |

Typography:
- **Inter** for body, headings, all UI text
- **JetBrains Mono** for eyebrows, status labels, timestamps, IDs, table headers, monospace chrome
- **Source Serif italic** rare, reserved for retrospective pull-quotes if at all

Component vocabulary inherited from `loading.html`:
- Corner brackets at 18px inset on every full-screen view
- Concentric ring motif for the loader and any "scanning" state
- 1px amber gradient progress lines for sync, save, regenerate operations
- HUD readouts in JetBrains Mono at corners for context (current pillar, last sync, build version, latency)
- Pulse and burst particles on state transitions (awarded, declined, submitted) as one-shot celebrations
- Letter and word reveals for stage transitions

Buttons:
- Primary: amber fill with soft glow on hover
- Secondary: amber outline on dark
- Destructive: warning red outline, never solid
- Ghost: ink-dim text only

Status badges (kanban chips and detail-view pills) reuse the existing grants tracker classes: `--discovery`, `--drafting`, `--submitted`, `--awarded`, `--declined`, `--withdrawn`. Color values port from light theme to dark theme.

### Motion language

- **Pulse** (radial expand, 1.1s): used on submit, on save, on accepting an AI suggestion
- **Burst** (particle field, one-shot): used on `awarded` status flip, the celebration moment
- **Sweep** (amber gradient arc rotating): used on regenerate, on sync, on scanning operations
- **Cycle** (letter or word morph): used on stage transitions in long flows
- **Bloom** (radial light from center, soft): used on the loader-to-dashboard handoff, on "decision arrived" notification

All motion is mutable via a Settings toggle `Reduce motion`. The toggle respects `prefers-reduced-motion` by default.

### Sound design (optional, off by default)

- Subtle low-amplitude tones tied to state transitions. The amplitudes are quiet enough to be ambient, not jarring. Sound files in `public/audio/` as `submit.mp3`, `award.mp3`, `decline.mp3`, `save.mp3`, `bloom.mp3`. Sound is off by default. Enabled via Settings, plays only on direct user-triggered events, never on background polls.

### Ambient mode

When the command center is idle (no input for two minutes, dashboard view), the screen quietly switches to an ambient visualization: a slow drift of grants represented as soft points of light, sized by ask amount, color-coded by status. No interaction needed. Click anywhere to return. Useful as a "wall display" mode for the future office. Off by default; opt-in in Settings.

### The loader as bootstrap

`web/3d-test/loading.html` runs as the cold-boot splash for every command center session. The 3D hand cycles `H · A · N · D`, the rings spin, the progress bar runs through `SIGNAL · LINK · WEAVE · BLOOM`, and at the moment the app shell finishes hydrating, the loader gracefully fades into the dashboard.

V1 implementation (shipped in Phase 0): serve `loading.html` verbatim as a static splash via iframe, then `router.replace('/dashboard')` once the Supabase session and initial markdown index are loaded. The loader is the first thing a new admin sees and the first thing every returning admin sees.

V2 (Phase 6): port to react-three-fiber as a reusable transitional component for heavy operations (full pipeline regeneration, AI draft burst, bulk export).

Stage names `SIGNAL · LINK · WEAVE · BLOOM` carry semantic meaning that surfaces elsewhere in the app:
- `SIGNAL` = scanning for new opportunities (discovery refresh)
- `LINK` = matching opportunity to HAND mission (fit-score regenerate)
- `WEAVE` = drafting and assembling an application
- `BLOOM` = submission and awaiting decision

---

## 6. Architecture

### 6.1 Stack

Inherited wholesale from `noredFarms/reps/` per the infra inventory:

- **Next.js 16 App Router**, **React 19**, **TypeScript 5**
- **Tailwind 4** with custom token layer for the HUD palette
- **shadcn/ui** primitives, restyled to the dark theme
- **Supabase SSR** for auth and operational data
- **Server Actions** for all mutations
- **Netlify Functions** for scheduled jobs and webhooks
- **`@netlify/plugin-nextjs`** for deploy compatibility

### 6.2 Source-of-truth pattern

Markdown files in `funding/grants/*.md` remain canonical. Supabase mirrors operational fields (everything in frontmatter) for fast queries.

| Layer | What it holds | Authoritative? |
|---|---|---|
| Markdown frontmatter | `slug`, `name`, `status`, `deadline`, `fit_score`, `submitted_on`, `decided_on`, contacts | Canonical |
| Markdown body | TL;DR, fit assessment, draft answers, retrospective | Canonical |
| Supabase `grants` table | Frontmatter mirror plus `kanban_position`, `column_entered_at`, `last_synced_at` | Read replica |
| Supabase `funders` table | Curated funder library | Canonical (no markdown counterpart yet) |
| Supabase `touchpoints` table | Funder communication log | Canonical |
| Supabase `boilerplate` table | Reusable snippets | Canonical, exportable to markdown on demand |
| Supabase `attachments` table | File references (PDFs, supporting documents) | Canonical, files in Supabase Storage |
| Supabase `comments` table | Inline draft comments | Canonical |
| Supabase `activity_log` table | Every state change, every save | Canonical |
| Supabase `notifications` table | In-app notification feed | Canonical |
| Git history | Diffs of all markdown changes | Audit log, immutable |

Sync direction: server actions write the markdown file first, then upsert the Supabase row. A `last_synced_at` field plus a content checksum lets a reconciler catch drift. A nightly Netlify scheduled function runs `pnpm reconcile:grants` and emails a summary if any drift is detected.

This means:
- If Supabase disappears, every grant draft and retrospective is still in git
- If the operator pulls main on a new laptop, `pnpm sync:grants` rebuilds Supabase from markdown
- The git diff history is a free audit trail no commercial platform provides

### 6.3 Supabase schema (v1.0 draft)

Schema name: `command` (selected to avoid collision with existing `reps` schema or any future tenant).

```sql
-- Profiles (extends Supabase auth.users)
create table command.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  display_name  text,
  role          text not null default 'viewer'
                check (role in ('admin','contributor','viewer')),
  reciprocate_group text,  -- null = all groups (for V2 scoping)
  created_at    timestamptz default now(),
  last_seen_at  timestamptz
);

-- Funders (curated library, canonical)
create table command.funders (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  funder_url    text,
  type          text check (type in ('foundation','government','corporate','community','individual','dao','program')),
  geography     text[],  -- ['austin','texas','national']
  focus_areas   text[],  -- ['healing','mutual-aid','community-tech']
  mission_alignment_notes text,
  fit_score     int check (fit_score between 1 and 5),
  annual_cycle  text,  -- 'rolling' | 'jan-mar' | 'fall' | ...
  ein           text,
  last_990_year int,
  giving_total_recent numeric,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Grants (frontmatter mirror)
create table command.grants (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  funder_id     uuid references command.funders(id),
  name          text not null,
  status        text not null default 'discovery'
                check (status in ('discovery','drafting','submitted','awarded','declined','withdrawn','closed')),
  award_type    text,
  award_size    text,
  amount_requested numeric,
  amount_awarded numeric,
  match_required text,
  reporting     text,
  deadline      date,
  discovered_on date,
  submitted_on  date,
  decided_on    date,
  reciprocate_group text,  -- null = HAND general
  fit_score     int check (fit_score between 1 and 5),
  hand_lead     text,
  contact       text,
  kanban_position int default 0,
  column_entered_at timestamptz default now(),
  markdown_path text not null,  -- 'funding/grants/<slug>.md'
  content_checksum text,
  last_synced_at timestamptz default now(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index grants_status_idx on command.grants(status);
create index grants_deadline_idx on command.grants(deadline);
create index grants_funder_idx on command.grants(funder_id);
create index grants_group_idx on command.grants(reciprocate_group);

-- Touchpoints (every interaction with a funder)
create table command.touchpoints (
  id            uuid primary key default gen_random_uuid(),
  funder_id     uuid not null references command.funders(id) on delete cascade,
  grant_id      uuid references command.grants(id) on delete set null,
  occurred_on   date not null default current_date,
  channel       text check (channel in ('email','call','meeting','conference','intro','letter','social','other')),
  direction     text check (direction in ('outbound','inbound','mutual')),
  summary       text not null,
  notes         text,
  attachments   jsonb default '[]',
  follow_up_on  date,
  created_by    uuid references command.profiles(id),
  created_at    timestamptz default now()
);

create index touchpoints_funder_idx on command.touchpoints(funder_id);
create index touchpoints_follow_up_idx on command.touchpoints(follow_up_on);

-- Boilerplate snippets (versioned)
create table command.boilerplate (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  category      text not null,
  title         text not null,
  content       text not null,
  word_count    int generated always as (array_length(string_to_array(content, ' '), 1)) stored,
  version       int not null default 1,
  active        boolean default true,
  tags          text[],
  notes         text,
  created_by    uuid references command.profiles(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Attachments (PDFs, supporting docs, screenshots)
create table command.attachments (
  id            uuid primary key default gen_random_uuid(),
  grant_id      uuid references command.grants(id) on delete cascade,
  funder_id     uuid references command.funders(id) on delete set null,
  storage_path  text not null,  -- Supabase Storage path
  filename      text not null,
  mime_type     text,
  byte_size     bigint,
  uploaded_by   uuid references command.profiles(id),
  uploaded_at   timestamptz default now()
);

-- Comments on draft sections
create table command.comments (
  id            uuid primary key default gen_random_uuid(),
  grant_id      uuid not null references command.grants(id) on delete cascade,
  section       text not null,  -- which H2/H3 in the markdown
  parent_id     uuid references command.comments(id) on delete cascade,
  body          text not null,
  resolved      boolean default false,
  created_by    uuid references command.profiles(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Section locks (soft locks during editing)
create table command.section_locks (
  grant_id      uuid not null references command.grants(id) on delete cascade,
  section       text not null,
  locked_by     uuid not null references command.profiles(id) on delete cascade,
  locked_at    timestamptz default now(),
  expires_at    timestamptz not null,
  primary key (grant_id, section)
);

-- Activity log (every state change)
create table command.activity_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references command.profiles(id),
  entity_type   text not null,  -- 'grant','funder','touchpoint','boilerplate'
  entity_id     uuid not null,
  action        text not null,  -- 'created','updated','status_changed','deleted','exported'
  before        jsonb,
  after         jsonb,
  metadata      jsonb,
  occurred_at   timestamptz default now()
);

create index activity_entity_idx on command.activity_log(entity_type, entity_id);

-- Notifications (in-app feed)
create table command.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references command.profiles(id) on delete cascade,
  kind          text not null,
  title         text not null,
  body          text,
  entity_type   text,
  entity_id     uuid,
  read_at       timestamptz,
  created_at    timestamptz default now()
);

create index notifications_recipient_idx on command.notifications(recipient_id, read_at);

-- AI assistant usage log
create table command.assistant_runs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references command.profiles(id),
  surface       text not null,  -- 'draft','fit-score','rfp-extract','linter','enrichment','retrospective'
  grant_id      uuid references command.grants(id) on delete set null,
  provider      text not null,
  model_key     text not null,  -- internal key, NEVER displayed in UI
  tokens_in     int,
  tokens_out    int,
  cost_usd      numeric(10,4),
  duration_ms   int,
  input_hash    text,
  output_preview text,
  accepted      boolean,
  occurred_at   timestamptz default now()
);

-- Invite codes for onboarding new admins
create table command.invites (
  code          text primary key,
  email         text,
  role          text not null default 'contributor',
  reciprocate_group text,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  used_by       uuid references command.profiles(id),
  created_by    uuid references command.profiles(id),
  created_at    timestamptz default now()
);
```

RLS policy summary (full policies in migration files):

| Table | admin | contributor | viewer |
|---|---|---|---|
| `grants` | full | read + comment + draft suggestions | read scoped to `reciprocate_group` |
| `funders` | full | read + new touchpoint | read only |
| `touchpoints` | full | own + grant-related read | read scoped |
| `boilerplate` | full | suggest new, can use existing | read only |
| `attachments` | full | read | read scoped |
| `comments` | full | own + read all | read only |
| `activity_log` | read all | read scoped | read own actions only |
| `notifications` | own only | own only | own only |
| `assistant_runs` | full | own only | none |

Sensitive fields with extra RLS:
- `touchpoints.notes` containing rejection rationale: admin-only read after first 30 days
- `comments` marked confidential: admin-only

### 6.4 Auth and roles

Lifted from `noredFarms/reps/src/lib/supabase/{client,server,middleware,profile}.ts`. Already shipped in Phase 0 with schema renamed `reps` → `command`.

Roles for HAND:

- `admin`, full access (koH, future grant chair, future ED)
- `contributor`, comment + draft suggestions, no status changes (board members, advisors)
- `viewer`, read-only, scoped by Reciprocate group tag (V2)

Login: email/password and magic link via Supabase Auth. Invite codes for onboarding new admins via the `invites` table. The invite flow: admin generates a code, sends it via email, recipient signs up, the trigger checks the invite code, applies role and group scoping, marks the invite consumed.

Session refresh handled by Next.js 16 Proxy (formerly Middleware) at `src/proxy.ts`. Public routes: `/loading`, `/auth/login`, `/auth/callback`. Everything under `(dashboard)/` is gated.

### 6.5 Notifications

Lifted from `kohlabsAI/nerve/services/notifier/src/channels/{email,slack,discord,webhook}.ts`. Skip BullMQ. Invoke directly from:

- Netlify scheduled function for daily deadline scan
- Server action for immediate alerts (decision received, draft requested, comment received)
- In-app notification table from `noredFarms/reps/supabase/migrations/003_notifications.sql`, adapted to the `command.notifications` schema

Email goes through the existing Resend integration pattern in `netlify/functions/intake.js`. No new keys to manage.

Notification kinds delivered:
- `deadline_approaching` (30d, 14d, 7d, 1d before)
- `decision_received` (when status flips to awarded/declined)
- `comment_added` (when someone mentions you or comments on a draft you own)
- `assignment_changed` (when a grant is reassigned to you)
- `draft_review_requested` (when a draft is marked ready for review)
- `weekly_digest` (every Monday at 7am Central, summary of the week ahead)
- `follow_up_due` (when a touchpoint has a follow_up_on date arriving)

Delivery channels per admin, configurable in Settings:
- In-app (always on)
- Email (default on)
- Slack (opt-in, webhook URL in env)
- Discord (opt-in, webhook URL in env)
- SMS (V2, via Twilio if needed)

### 6.6 AI router

Lifted from `kohlabsAI/nerve/packages/ai-router/`. Drop in as a workspace package. Default provider is the Claude-family model the `grants` skill already speaks to. Fallback chain configurable per environment. The router lives behind several server routes (see Section 10).

Per the AI stance framing doc:
- No model names appear in command center UI copy
- Drafts cite "the drafting assistant," not a vendor
- The provider is swappable via environment variable, never hardcoded into a component
- Outputs land in the markdown body as a suggested draft, never auto-applied
- The `assistant_runs` table logs every call with cost, but the operator-facing UI shows only "monthly assistant cost so far: $X" in Settings, never per-model breakdowns

### 6.7 Deployment

V1: localhost only. `pnpm dev` on port 3000, bound to 127.0.0.1.

V2 (Phase 5 of the build): deploy as a separate Netlify site at `command.handprotocol.org` (the recommended subdomain; `bridge.`, `admin.`, and `desk.` are also candidates). Gated by Supabase Auth. CSP locked tight. CSP nonce for the loader inline script.

V3 (Phase 6+): when the fiscal sponsor lands, the production deploy must be RLS-verified per `governance/policies/data-sovereignty-and-ai.md`.

### 6.8 Audit and sovereignty

Three layered audit surfaces, by purpose:

1. **Git history.** Every markdown change is a commit. `git log -p funding/grants/<slug>.md` reproduces every prior version of any draft. No commercial platform offers this for free.
2. **`activity_log` table.** Every status change, every save, every export, every assistant run is logged with actor, before, after, and timestamp. Queryable, filterable, exportable.
3. **Supabase Auth audit.** Login, logout, role changes, invite consumption all flow through Supabase's built-in audit (in the `auth` schema).

Per the data sovereignty policy:
- Every export requires the operator to confirm intent (no silent exports)
- Personal practitioner data (Mystic Hearts context) never leaves the encrypted Supabase project except through explicit aggregated export
- Funder communications marked confidential have a stricter retention policy
- The operator can revoke any admin's access immediately, and all their pending edits are surfaced to a different admin for review

### 6.9 Backup and disaster recovery

Three independent backups:

1. **Git.** Markdown is in git, in a remote (GitHub). Disaster scenario: laptop dies. Recovery: clone the repo.
2. **Supabase point-in-time recovery.** Supabase Pro plan provides 7-day PITR. Disaster scenario: bad migration. Recovery: rewind to a known good point.
3. **Weekly JSON export.** Netlify scheduled function exports the full Supabase state as JSON to a private storage bucket every Sunday at 3am Central. Retention: 12 weeks. Disaster scenario: Supabase project deletion. Recovery: restore from JSON.

The reconciler job (nightly) detects drift between markdown and Supabase. If detected, it emails the admin with a diff summary and pauses sync until the operator confirms a direction (markdown wins, or Supabase wins, per file).

---

## 7. The feature catalog, mapped to H-A-N-D

Each feature is tagged with a build phase. Phase numbers correspond to Section 15.

### 7.1 Holistic (one source of truth)

| # | Feature | Phase | Description |
|---|---|---|---|
| H1 | Grant pipeline kanban | 1 | Six columns: Discovery, Drafting, Submitted, Awarded, Declined, Withdrawn. Cards show name, funder, deadline, fit-score, days-since-discovered. Drag-to-transition writes both the markdown frontmatter status and the Supabase row. Components ported from `flowb/kanban/`. |
| H2 | Grant detail view | 1 | Renders the markdown file. Editable frontmatter form. Editable draft answers (tabbed by question, autosaved). Append-only timeline. Funder-touchpoint history. Activity log derived from git history plus `activity_log`. |
| H3 | New-grant scaffold | 1 | Form that copies `funding/grants/_template.md`, fills frontmatter from a single discovery URL or pasted text, opens the detail view. Optionally calls the drafting assistant for a starter fit assessment. |
| H4 | Quick-capture inbox | 2 | Paste a funder URL, an RFP PDF, or a screenshot. Lands in an inbox view as a "raw lead" to be triaged later. Becomes a grant or a funder record, or gets discarded. |
| H5 | Universal search | 2 | One search bar (cmd+K) searches grants, funders, boilerplate, comments, touchpoints. Fuzzy match, status filters, recent-first ordering. |
| H6 | Attachment vault | 2 | Centralized file store. Drag-and-drop into any grant or funder record. PDFs (990s, award letters, supporting docs), images, screenshots. Tagged, searchable, scoped to admin/contributor/viewer via RLS. |
| H7 | Activity feed | 3 | Per-grant, per-funder, and global. Who did what, when. Reads from `activity_log` plus git history. Filterable by actor and entity. |

### 7.2 Approach (the operator's methodology)

| # | Feature | Phase | Description |
|---|---|---|---|
| A1 | Fit-score field | 1 | One to five with reasoning captured in the markdown body's `## Fit assessment` section. Color-coded in pipeline view. Sortable. Filter by min-score. |
| A2 | Boilerplate library | 2 | Curated snippets (mission paragraph, theory of change, team bios, 501(c)(3) language, foundation tiers, AI stance one-liner, three communities, eight sovereignty principles). Versioned. Insert into any draft via a slash menu. Stored in `command.boilerplate`. |
| A3 | Drafting assistant | 2 | Server route `/api/draft-answer`. Takes current grant frontmatter plus the application question plus access to `hand-context.md`, framing docs, boilerplate library. Returns a draft as a suggestion. Never auto-applies. Voice rules enforced via system prompt. |
| A4 | RFP checklist extractor | 2 | Paste a funder's guidelines, get a structured requirements checklist as `## Requirements checklist` in the grant markdown. Items become trackable tasks tied to the grant. |
| A5 | Voice and tone linter | 3 | Real-time check of any draft for em dashes, AI tells, forbidden phrases, outdated tier numbers, model names in operator-facing copy. Inline highlights. One-click fix suggestions for common cases. |
| A6 | Boilerplate suggester | 3 | While drafting an answer, AI suggests which existing snippets fit the current question. Click to insert. |
| A7 | Multi-version drafts | 3 | Keep multiple drafts of the same answer (different angles, different lengths). A/B view side-by-side. Pick the winner before submission. |
| A8 | Submission checklist | 2 | Per-grant checklist auto-generated from the RFP extractor plus standard items (every attachment, every contact, every signed form). Required before status flips to Submitted. |
| A9 | Submission archive snapshot | 2 | On status flip to Submitted, save a frozen snapshot of the exact draft, all attachments, all metadata. Immutable archive. Referenced as `submissions/<slug>-<timestamp>/`. |
| A10 | Funder portal credentials | 3 | Secure vault for funder portal logins (1Password-style, encrypted at rest, never logged). One-click open the portal for a given grant. |

### 7.3 Nurture (relationships and voice)

| # | Feature | Phase | Description |
|---|---|---|---|
| N1 | Funder library | 3 | Fifty to one hundred fifty curated funders. Each has its own page with all grants tied to it, all touchpoints, mission alignment notes, prior giving summary. Supabase `funders` table. |
| N2 | Touchpoint log | 3 | Every email, call, intro, conference encounter logged against the funder. Relationships outlive single applications. `command.touchpoints` table. |
| N3 | Win/loss retrospective | 3 | Auto-prompted on status flip to `awarded`, `declined`, `withdrawn`. Captures what worked, what did not, what the funder said, what we would do differently. Appended as `## Retrospective` in the markdown. Tags feed future fit-scoring. |
| N4 | Funder enrichment | 3 | Paste a funder URL, AI parses mission statement, leadership, recent grants from public 990 data and the funder's website. Lands in the funder record as a starter profile. Operator edits before saving. |
| N5 | Funder cadence reminders | 4 | Per-funder: typical cycle (rolling, annual, biannual). When a cycle approaches, surface a reminder even if no application is open. Encourages outreach in the window. |
| N6 | Common-question cross-reference | 4 | When drafting an answer to a question that resembles a previous answer (semantic search across past drafts), show the prior answers side-by-side. Operator can reuse, adapt, or write fresh. |
| N7 | Funder relationship score | 4 | Surface a heuristic 1-5 score per funder based on: number of touchpoints, recency, outcome history, intro warmth. Helps prioritize where to invest relationship time. |
| N8 | Decision rationale archive | 3 | When a funder shares why they declined (informally over email), capture verbatim. Searchable later. Confidential. Feeds future fit-scoring and drafting choices. |
| N9 | Practitioner-data warning | 3 | If a draft mentions Mystic Hearts attendees or specific practitioner names, soft flag in the editor. Mystic Hearts framing doc says individual practitioners stay aggregate. The flag is advisory, not blocking. |

### 7.4 Develop (pipeline growth and learning)

| # | Feature | Phase | Description |
|---|---|---|---|
| D1 | Deadline radar | 4 | Calendar view sourced from frontmatter `deadline:` fields plus funder-level annual cycles. Surfaces 30/14/7/1-day windows. Daily scheduled scan produces a digest email. |
| D2 | Pipeline analytics | 4 | Submitted dollar value, expected-value (amount × fit-score for in-flight), win rate by funder type, cycle time research-to-decision, funder concentration risk. Single dashboard tile. Sparklines from `noredFarms/reps`. |
| D3 | Annual report view | 4 | Last 12 months, trailing. Total submitted, total awarded, win rate, cycle time, top funders, top declines with rationale. Exportable for board reports. |
| D4 | XLSX export | 4 | Full pipeline export for board meetings. Filterable. Reuses `noredFarms/reps/src/lib/export.ts`. |
| D5 | Funder concentration alert | 4 | Soft warning when more than 40% of expected revenue depends on one funder. Encourages diversification. |
| D6 | Pipeline value forecast | 5 | Time-series view: pipeline value trending up or down. Twelve-week rolling forecast based on submitted-but-undecided × historical win rate. |
| D7 | Reason-for-decline taxonomy | 5 | Structured decline reasons (out of scope, geography, budget, timing, etc). Tags feed fit-scoring. Helps avoid the same mistake twice. |
| D8 | Quarterly retrospective view | 5 | At the end of each quarter, an auto-generated review: what we learned, what we won, what we lost, what to do differently. Editable, exportable to board pack. |

---

## 8. Cross-cutting operator experience

Features that span every pillar, focused on making the operator fast and the tool a joy to use.

### 8.1 Command palette

`cmd+K` (or `ctrl+K`) opens a global command palette. Actions: jump to any grant, jump to any funder, create new grant, run universal search, toggle ambient mode, regenerate fit-score, open recent draft, open keyboard shortcut reference. Lift the pattern from FlowB kanban's `command-palette.tsx`.

### 8.2 Keyboard shortcuts

| Key | Action |
|---|---|
| `cmd+K` | Command palette |
| `/` | Focus search |
| `n` | New grant |
| `j` / `k` | Navigate kanban cards |
| `g g` | Go to grants pipeline |
| `g f` | Go to funder library |
| `g d` | Go to deadline radar |
| `g b` | Go to boilerplate library |
| `cmd+s` | Save current draft |
| `cmd+enter` | Submit current draft (trigger checklist) |
| `?` | Show keyboard shortcut reference |
| `esc` | Close modal / dismiss focus |

### 8.3 Mobile and responsive

Responsive web only. Three breakpoints: phone (<640px), tablet (640-1024px), desktop (>1024px).

- Phone: dashboard cards stack, kanban switches to a single-column status filter, drafts open full-screen
- Tablet: kanban shows three columns at a time with horizontal scroll
- Desktop: full HUD experience

The loader works on all breakpoints (the 3D hand is already responsive via the existing `loading.html`).

### 8.4 Accessibility

- WCAG 2.1 AA target (the public-facing site's standard, applied here too)
- Every action keyboard-reachable
- `aria-label` on every icon-only button
- Focus rings on every interactive element (amber, 2px)
- Color contrast verified for the HUD-dark palette (cream on navy passes AAA at body sizes)
- `prefers-reduced-motion` respected; ambient mode and pulse animations gated
- Screen reader: announce status transitions, AI suggestion arrival, comment received

### 8.5 Print and shareable read-only

- Per-grant print view: clean white background, ink-black text, no chrome. For offline review.
- Shareable read-only link: generate a token URL that gives a non-admin (board member, advisor) view of one specific grant draft. Token expires in 7 days. No login required. Audit-logged.

### 8.6 Ambient mode

(Described in Section 5.) Idle dashboard switches to a slow drift of grants as soft points of light. Wall-display friendly.

---

## 9. Collaboration and multi-admin

V1 builds for one operator. V1.5 (Phase 4-5) lights up multi-admin features for the future bench.

| Feature | Phase | Description |
|---|---|---|
| Comments on draft sections | 4 | Inline comments on any H2/H3 section in the markdown body. Threaded. Resolved/unresolved. Stored in `command.comments`. |
| Section locks | 4 | When an admin opens a section for editing, a soft lock (12 minutes, auto-extending while typing) prevents another admin from saving conflicting changes. Other admins see "koH is editing this section." Stored in `command.section_locks`. |
| Presence indicators | 4 | On every page, see which other admins are currently viewing. Lightweight Supabase realtime presence. Inspired by Figma's presence dots. |
| Assignments | 4 | Each grant has an `assigned_to` field. Assignee sees the grant in their dashboard "needs your attention" lane. |
| Mentions | 4 | `@russell` in a comment notifies that admin. Mentions trigger an in-app notification plus optional email. |
| Review requests | 5 | An admin marks a draft "ready for review." The reviewer gets a notification with a direct link to the draft. The reviewer can comment, suggest, or approve. |
| Activity feed | 4 | See what other admins did today. Filterable by actor. |

V2 will add Reciprocate-group scoping: a grant tagged `reciprocate_group: mystic-hearts` is visible to viewers in that group, hidden from others.

---

## 10. AI features (sovereign by default)

Every AI call passes through the `ai-router` from `nerve`. Provider is configurable per environment. Default chain: primary Claude-family, fallback to a second provider for resilience. No model names appear in operator-facing copy.

| Surface | Route | What it does | Grounding |
|---|---|---|---|
| **Drafting** | `/api/draft-answer` | Drafts an answer to an application question, grounded in HAND context. Returns suggestion, never auto-applies. | `hand-context.md`, framing docs, boilerplate library, current grant frontmatter |
| **Fit-score** | `/api/score-fit` | Given a funder URL or description, returns a 1-5 fit score with one-paragraph rationale. | `hand-context.md`, funder library, past retrospectives |
| **RFP extractor** | `/api/extract-checklist` | Parses funder guidelines, returns a structured requirements checklist. | The pasted RFP text; the structured output schema |
| **Voice linter** | `/api/lint-voice` | Catches em dashes, AI tells, forbidden phrases, outdated tier numbers, model names. Returns inline highlights and one-click fixes. | `hand-context.md` voice rules section |
| **Boilerplate suggester** | `/api/suggest-snippets` | Given current draft text plus the question prompt, recommends three boilerplate snippets that fit. | Boilerplate library, current grant |
| **Cross-reference** | `/api/find-similar-answers` | Semantic search across past drafts for similar questions. Returns top-three matches with context. | Embeddings of past draft sections (stored in Supabase pgvector) |
| **Retrospective prompt** | `/api/draft-retrospective` | On decision status flip, generates a starter retrospective using grant context + funder communications. | The grant markdown, touchpoint log, decision rationale |
| **Funder enrichment** | `/api/enrich-funder` | Given a funder URL, parses mission, leadership, recent grants, public 990 data. | The funder's website (fetched), 990 data if available |

Cost monitoring:
- Every call logs to `command.assistant_runs` with provider, tokens, cost, duration
- Settings shows the operator a single number: `Monthly assistant cost so far: $X.XX`. No per-model breakdown surfaced.
- Soft rate limit per surface (configurable in env, default 50 calls/day per surface)
- Hard rate limit on total cost ($100/month default, configurable)

Provider-rotation behavior (per AI stance framing doc):
- The router picks per task based on task type and current availability
- Operator-facing copy never reveals which provider answered
- Engineering logs and `assistant_runs` table do record the provider for cost accounting and debugging
- Env-var override lets the operator force a specific provider when debugging

---

## 11. Voice and copy rules

The command center is a workplace, not a brochure. The voice rules apply everywhere: UI labels, error messages, system notifications, system-prompt-generated text, README copy.

- **No em dashes anywhere.** Commas, periods, parentheses, or "and" instead.
- **No AI tells.** Forbidden: furthermore, delve into, leverage, robust, ecosystem, in conclusion, navigate the complexities, it is worth noting, game-changing, best-in-class.
- **No specific model names in operator-facing copy.** "The drafting assistant" or "the assistant" only.
- **Full mission terms**: Reciprocates, Contributors, Sovereign Reciprocates, 501(c)(3) in formation.
- **Tier amounts with commas, no rounding.** `$22,777` not `$22K`.
- **Status verbs in present tense.** "Drafting Trinity Builders" not "Trinity Builders is being drafted."
- **JetBrains Mono for any string that looks like a database value** (status keys, slugs, IDs, timestamps). Inter for prose.
- **System messages follow the warm-editorial tone even on dark surface.** Errors do not yell. Empty states are helpful, not cute.

A voice and tone reference card lives at `/help/voice` in the command center, drawn directly from `hand-context.md`.

---

## 12. Integrations

Selective, deliberately small. Every integration is opt-in per admin.

| Integration | Surface | Phase | Notes |
|---|---|---|---|
| Resend | Email (digests, alerts, invites) | 1 | Already wired in `netlify/functions/intake.js`. Reuse. |
| Google Calendar | Deadline export (iCal feed) | 4 | One feed URL per admin. Subscribe in any calendar app. |
| Slack | Webhook for notifications | 4 | Channel adapter from `kohlabsAI/nerve`. Per-admin webhook URL in Settings. |
| Discord | Webhook for notifications | 4 | Same pattern as Slack. |
| GitHub | View commit history per grant | 3 | Deep link into git history for the grant's markdown file. No write back from the UI. |
| Twilio | SMS notifications | V2 | Skipped V1; lots of overhead for marginal value. |
| Notion | Two-way sync of grants | Never | Out of scope. Markdown plus the rendered tracker is enough. |

---

## 13. System and operations

### 13.1 Migrations

SQL migration files in `command/supabase/migrations/`, numbered, idempotent. Pattern lifted from `noredFarms/reps/supabase/migrations/`. Run via Supabase CLI or `pnpm db:migrate`.

### 13.2 Monitoring

- **Error tracking**: Sentry. DSN in env. Initialized in `instrumentation.ts`.
- **Performance**: Vercel Speed Insights or Netlify Analytics. Page-level load metrics.
- **Action latency**: Server actions log duration to `activity_log` for any action exceeding 500ms.
- **Uptime**: Netlify Functions monitor for the scheduled jobs. Failures alert via email.

### 13.3 Rate limiting

- AI endpoints: per-surface daily caps (default 50), per-month cost cap ($100). Configurable in env.
- Webhook endpoints: 60 requests per minute per IP. Standard Netlify Edge throttling.
- Login: Supabase default rate limits, no override.

### 13.4 Cost dashboard

Single tile in Settings. Shows:
- Monthly assistant cost (sum of `assistant_runs.cost_usd` for the current month)
- Supabase project tier and rough usage
- Netlify build minutes used
- Storage used (Supabase Storage + git LFS if any)

No per-call cost breakdown surfaced to operators below admin role.

### 13.5 Health checks

Lightweight `/health` endpoint returns Supabase reachability, last-sync time, queue depth (if any). Used by Netlify uptime monitor.

---

## 14. The loader handoff

The cold-boot experience:

1. Operator navigates to the command center URL or runs `pnpm dev`.
2. Browser loads `loading.html` from the public folder. The 3D hand cycle starts immediately. The progress bar runs through `SIGNAL · LINK · WEAVE · BLOOM`.
3. While the loader animates, an inline script begins:
   - Resolves the Supabase session (`supabase.auth.getSession()`)
   - Fetches the grants index (lightweight JSON of frontmatter from Supabase)
   - Prefetches the dashboard route
4. Once all three resolve and the loader has run for at least 1.4 seconds (so the artwork is not robbed by a fast network), the loader fades to black and `location.replace('/dashboard')` runs.
5. The dashboard hydrates against the prefetched data, no second loading state.

If the session is missing, the loader transitions to `/auth/login` instead. The login page uses the same dark palette but no rings or particles. Just the corner brackets and the hand silhouette as a small accent.

Recurring uses of the loader pattern (Phase 6):
- Bulk regeneration of fit scores: full loader cycle
- Pipeline reconciliation: sweep ring only, no full loader
- AI draft burst (generating five drafts at once): pulse plus burst particles
- Submission moment: pulse plus burst particles, with a single tone if sound is enabled

---

## 15. Build phases

Each phase ships a slice the operator can actually use. No phase ships a half-feature.

### Phase 0: Scaffold and theme (shipped 2026-05-19)

- Next.js 16 + Tailwind 4 + Supabase SSR scaffold
- Auth stack lifted from `noredFarms/reps`
- HUD-dark theme tokens applied
- Loader integrated as static splash with iframe handoff
- Dashboard placeholder with HUD chrome
- README documenting setup and data-model contract

### Phase 1: Holistic core (target: 2026-05-26, week 1)

- Supabase schema deployment (`command` schema, all tables in Section 6.3)
- RLS policies for the three roles
- Markdown ingest job: parse `funding/grants/*.md`, upsert into `command.grants`
- Pipeline kanban (H1) using flowb/kanban components
- Grant detail view (H2)
- New-grant scaffold from `_template.md` (H3)
- Fit-score field (A1)
- Markdown writeback on every save with checksum reconciliation

### Phase 2: Approach core (target: 2026-06-02, week 2)

- Boilerplate library (A2) with v1 seed of 12 snippets
- Drafting assistant (A3) backed by ai-router
- RFP checklist extractor (A4)
- Submission checklist (A8)
- Submission archive snapshot (A9)
- Quick-capture inbox (H4)
- Universal search (H5)
- Attachment vault (H6)

### Phase 3: Nurture core (target: 2026-06-09, week 3)

- Funder library (N1)
- Touchpoint log (N2)
- Win/loss retrospective auto-prompt (N3)
- Funder enrichment (N4)
- Decision rationale archive (N8)
- Practitioner-data warning (N9)
- Voice and tone linter (A5)
- Boilerplate suggester (A6)
- Activity feed (H7)
- GitHub integration (deep links to git history per grant)

### Phase 4: Develop core (target: 2026-06-16, week 4)

- Deadline radar (D1)
- Pipeline analytics tile (D2)
- Annual report view (D3)
- XLSX export (D4)
- Funder concentration alert (D5)
- Funder cadence reminders (N5)
- Cross-reference (N6)
- Funder relationship score (N7)
- Multi-version drafts (A7)
- Collaboration: comments, section locks, presence, assignments, mentions (Section 9)
- Notification channels: Email (Resend), Slack, Discord webhooks
- Google Calendar export

### Phase 5: Production hardening (target: 2026-06-23, week 5)

- RLS audit against `governance/policies/data-sovereignty-and-ai.md`
- CSP lock-down for production deploy
- Backup automation (weekly JSON export)
- Reconciler job (nightly drift detection)
- Sentry error tracking
- Health endpoint
- Cost dashboard tile
- Rate limiting on AI endpoints
- Funder portal credentials vault (A10)
- Invite code flow for second admin
- Deploy to `command.handprotocol.org` as a separate Netlify site
- Smoke-test under load

### Phase 6: Polish and v1.1 (target: 2026-06-30, week 6)

- Port the loader to react-three-fiber for reusable transitional states
- Burst particles on `awarded` status flip
- Pulse on `submitted`
- Bloom on the loader handoff
- Sound design (optional, off by default)
- Ambient mode (Section 8.6)
- Pipeline value forecast (D6)
- Reason-for-decline taxonomy (D7)
- Quarterly retrospective view (D8)
- Review request flow (collaboration enhancement)
- Print and shareable read-only views (8.5)
- Full keyboard shortcut surface (8.2)
- Accessibility audit (WCAG 2.1 AA verification)
- README polish, screencast of full operator flow, README in `command/` cross-linked from this PRD

### Phase 7 and beyond (V2)

- Reciprocate-group scoping (`reciprocate_group` field, viewer role scoping)
- Multi-version drafts with A/B comparison view
- Quarterly auto-generated retrospective
- SMS notifications via Twilio if needed
- Public transparency view (redacted pipeline for the foundation campaign page)
- Cross-grant analytics: which boilerplate snippets win most often, which funder types have the highest hit rate
- Reciprocate-group leads as viewers of their own grants

---

## 16. Open questions

Things to align on, captured here so we move with both eyes open. None are blockers for Phase 1; all need answers before Phase 5.

1. **Supabase project**: new HAND-owned project, or extend the existing `handprotocol` Supabase? Sovereignty argues for HAND-owned. Cost argues for shared. The data sovereignty policy says HAND-owned. Recommend a fresh project named `hand-command`.
2. **Subdomain naming**: `command.`, `bridge.`, `admin.`, `desk.handprotocol.org`. Recommend `command.` for the operator-bridge metaphor.
3. **Initial admin invitations**: who joins koH first? The fiscal sponsor liaison once that lands? A board grant chair?
4. **Boilerplate v1 seed**: ten to fifteen snippets drawn from existing language in `web/foundation-campaign/`, `hand-context.md`, `funding/framing/*.md`. The list of which snippets to seed first.
5. **AI provider stance for v1**: lock to one provider for predictability, or wire the full router with fallback from day one? Recommend single provider for Phase 2, full router by Phase 5.
6. **Mystic Hearts and Reciprocate-group tagging**: confirm the field name (`reciprocate_group`), confirm the set of allowed values (`mystic-hearts`, `mesquitos`, `sovereign-reciprocates`, `hand-foundation` for general).
7. **Print view design**: warm-editorial light theme, or a stripped HUD-dark print theme? Recommend warm-editorial light for legibility on paper.
8. **Sound design source**: do we commission audio, or use Creative Commons CC0 minimal tones? Recommend CC0 for V1, commission for V2 if the tool gets daily love.
9. **First grant to use the new assistant on**: dogfood candidate. Probably the next opportunity from the low-hanging survey (Cohere Catalyst or Hugging Face ZeroGPU).

---

## 17. What success looks like

A grant admin can:

- Open the command center, see every grant in the pipeline within three seconds of the loader fading
- Move a grant from Drafting to Submitted with a drag and two confirmations (date + funder confirmation page)
- Draft a new application question by writing a sentence of intent, pressing the assist key, and editing the suggestion the assistant produces. The draft inherits voice, tier numbers, and current mission terms without prompting.
- See "Patagonia Family Foundation closes in 7 days" in the deadline radar and click straight into the grant draft
- After a decision, complete the retrospective in under five minutes, then watch the funder's record update with the new touchpoint and the new fit-score signal
- Export an XLSX of the quarter's pipeline for the board meeting in two clicks
- Type `cmd+K`, type "trinity," hit enter, and land in the Trinity Builders draft in under a second
- Cite a boilerplate snippet in three keystrokes (`/`, type, enter)
- Mention `@russell` in a comment and have him receive the notification in Slack within 30 seconds
- Receive the Monday-morning weekly digest at 7am Central and know exactly what needs attention this week

A board member with `contributor` access can:

- See the pipeline and grant detail views
- Leave comments on draft answers
- Mark a draft as reviewed
- Cannot change status, cannot delete

A future Reciprocate-group lead with `viewer` access (V2) can:

- See only grants tagged with their group
- Cannot edit anything
- Receive notifications about decisions on their group's grants

The operator never has to:

- Remember which version of a tier amount is current (the linter catches it)
- Write the same sentence twice (the boilerplate library carries it)
- Manually track which funders are due for a check-in (the cadence reminder surfaces them)
- Wonder what was submitted (the archive snapshot is immutable)
- Wonder who changed what (the activity log answers)

---

## 18. The honest constraints

What we do not yet know how to handle, surfaced so the build does not pretend otherwise.

- **Funder ingestion at curated scale.** HAND is hand-curating. We need a clean import flow for new funders. The Instrumentl-style 990 pull is out of scope for v1; manual is fine and probably more accurate.
- **Markdown conflict resolution.** Two admins editing the same draft section simultaneously is possible by V2. Section locks plus presence indicators handle most cases. Real collaborative editing (CRDT-style) is out of scope.
- **Personally identifying information about practitioners** (the Mystic Hearts framing doc is emphatic about anonymity). The practitioner-data warning is advisory, not blocking. We rely on operator judgment.
- **Long-term storage of decision rationale.** Foundations sometimes share rejection reasons informally. The retrospective field captures these. We treat them as confidential. RLS policy: rejection rationale visible to admins only.
- **Cost runaway risk on AI calls.** The rate limits plus cost dashboard catch most cases. A bad prompt loop could still rack up cost. Phase 5 hardens this with a hard monthly cap.
- **Email deliverability.** Resend handles transactional well, but funders' spam filters vary. The send-from address matters. Use `command@handprotocol.org` for command center transactional, separate from `hand@handprotocol.org` for human correspondence.
- **GitHub rate limits.** The git history viewer makes API calls. Cache aggressively. Fall back to local git log when API limit hit.

---

## 19. Files this PRD references

For the build agent's next-step convenience.

**HAND canonical context**
- `~/.claude/skills/grants/references/hand-context.md`
- `~/.claude/skills/grants/SKILL.md`
- `funding/framing/ai-stance.md`
- `funding/framing/mystic-hearts.md`

**Research inputs**
- `funding/grants/_platform-research.md`
- `funding/grants/_infra-inventory.md`
- `funding/grants/_hand-biz-outreach-scoping.md`
- `funding/grants/_low-hanging-survey.md`

**Visual reference**
- `web/3d-test/loading.html`
- `web/3d-test/models/jtoastie-rigged-hand.glb`
- `web/discovery/style.css` (warm-editorial counterpart, for two-room reference)

**Reuse targets**
- `/home/koh/Documents/noredFarms/reps/` (full scaffold; Phase 0 already pulled the auth stack)
- `/home/koh/Documents/noredFarms/kanban-schema.sql`
- `/home/koh/Documents/flowb/kanban/src/components/kanban/`
- `/home/koh/Documents/kohlabsAI/nerve/packages/ai-router/`
- `/home/koh/Documents/kohlabsAI/nerve/services/notifier/src/channels/`

**Existing grant data**
- `funding/grants/_template.md`
- `funding/grants/trinity-builders.md` (reference grant, submitted)
- `funding/grants/hcb-fiscal-sponsorship.md`
- `funding/grants/aspiration-fiscal-sponsorship.md`
- `funding/grants/vercel-oss-program.md`
- `funding/grants/cloudflare-startups.md`
- `funding/grants/netlify-oss-plan.md`

**Active deployment context**
- `netlify.toml` (root; the `publish = "web"` setting keeps `command/` out of the public deploy)
- `netlify/edge-functions/grants-auth.js`
- `netlify/functions/intake.js` (Resend pattern reference)
- `web/grants/index.html` (the public, password-gated tracker; the command center will not replace it)

**Shipped Phase 0**
- `command/README.md`
- `command/src/app/page.tsx` (loader splash entry)
- `command/src/components/loader-splash.tsx`
- `command/public/loading.html`
- `command/public/models/jtoastie-rigged-hand.glb`
- `command/src/app/(dashboard)/dashboard/page.tsx`
- `command/src/lib/supabase/{client,server,middleware,profile}.ts`
- `command/src/app/globals.css`

---

## 20. Founder notes

(Append below this line as the PRD evolves. The build agent reads everything.)

