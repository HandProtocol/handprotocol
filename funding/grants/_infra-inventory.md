---
date: 2026-05-19
status: research-only
scope: feed reusable patterns into /home/koh/Documents/handprotocol/command/ (grants command center, Next.js)
---

# Infra Inventory — for HAND Grants Command Center

Read-only audit of local projects. No files modified. Output is a shortlist of
file paths and patterns to copy/adapt when building the admin portal at
`/home/koh/Documents/handprotocol/command/` (does **not** exist yet — empty
greenfield).

---

## 1. noredFarms — strongest reuse target

**Two parallel codebases under one repo:**

- **Static legacy site** (`/home/koh/Documents/noredFarms/`) — vanilla HTML/JS,
  Netlify Functions API, Supabase as backing store. Where the kanban lives.
- **`reps/` subproject** (`/home/koh/Documents/noredFarms/reps/`) — modern
  **Next.js 16 + React 19 + Supabase SSR + shadcn/ui + Tailwind 4** admin app.
  This is the closest thing to the command center the user wants. Treat this
  as the **structural template**.

### Tech stack (reps/)
- Next.js 16.2.3, React 19.2.4, TypeScript 5, Tailwind 4
- `@supabase/ssr` 0.10 + `@supabase/supabase-js` 2.103 (cookie-based auth, dedicated `reps` schema)
- shadcn/ui (`components.json` present), `@base-ui/react`, `lucide-react`, `sonner` toasts
- Netlify deploy (`netlify.toml`, `@netlify/plugin-nextjs`)
- Stripe Connect for payouts, XLSX export, Leaflet for maps
- Server Actions (`"use server"`) pattern throughout `src/lib/actions/`

### Auth pattern (best in any local project)
- `/home/koh/Documents/noredFarms/reps/src/lib/supabase/client.ts` — browser client
- `/home/koh/Documents/noredFarms/reps/src/lib/supabase/server.ts` — server client + admin client (service role)
- `/home/koh/Documents/noredFarms/reps/src/lib/supabase/middleware.ts` — session refresh, public-route allowlist, PEA notify hook
- `/home/koh/Documents/noredFarms/reps/src/lib/supabase/profile.ts` — `getCurrentUser()` + `getCurrentProfile()` helpers
- `/home/koh/Documents/noredFarms/reps/src/app/auth/login/page.tsx` — email/password login UI
- `/home/koh/Documents/noredFarms/reps/src/app/auth/callback/route.ts` — magic-link/OAuth callback
- `/home/koh/Documents/noredFarms/reps/src/app/(dashboard)/layout.tsx` — gated route group with role check
- Role check pattern: `profiles.role` table lookup after `auth.getUser()`. Roles in noredFarms: `admin`, `customer`, plus per-rep records in `rep_profiles`.

**For HAND command center: copy this auth stack verbatim, swap schema name `reps` → `hand` (or `command`), strip Stripe/PEA hooks.**

### Reusable components (reps/)
- `/home/koh/Documents/noredFarms/reps/src/components/sidebar-nav.tsx` — desktop sidebar
- `/home/koh/Documents/noredFarms/reps/src/components/mobile-nav.tsx` — mobile drawer
- `/home/koh/Documents/noredFarms/reps/src/components/notification-bell.tsx` — bell w/ Supabase realtime unread count
- `/home/koh/Documents/noredFarms/reps/src/components/charts.tsx`, `sparkline.tsx` — dashboard viz
- `/home/koh/Documents/noredFarms/reps/src/components/list-toolbar.tsx` — search/filter/export header for tables
- `/home/koh/Documents/noredFarms/reps/src/components/export-button.tsx` + `src/lib/export.ts` — XLSX export
- `/home/koh/Documents/noredFarms/reps/src/components/status-badge.tsx` — colored pill badges
- `/home/koh/Documents/noredFarms/reps/src/components/admin/field.tsx`, `settings-form-wrapper.tsx`, `settings-tabs.tsx` — admin form scaffold
- `/home/koh/Documents/noredFarms/reps/src/components/ui/*.tsx` — full shadcn set already wired

### Server Actions pattern (very reusable)
- 20+ action files in `/home/koh/Documents/noredFarms/reps/src/lib/actions/` — `leads.ts`, `accounts.ts`, `applications.ts`, `audit.ts`, `notifications.ts`, `feedback.ts`, `dashboard.ts`, `kpi.ts`, etc.
- Pattern: `"use server"` at top, `getProfile()` guard inside each action, `revalidatePath()` after mutation. Clean template for grant CRUD.

### Kanban implementations — TWO exist
1. **Vanilla JS standalone** (legacy site): `/home/koh/Documents/noredFarms/kanban-app.js` + `/home/koh/Documents/noredFarms/kanban-styles.css` + `/home/koh/Documents/noredFarms/kanban-schema.sql` + `/home/koh/Documents/noredFarms/kanban.html`. SortableJS, Supabase Realtime, markdown, attachments, dependencies, subtasks, WIP limits, time-tracking. ~5000 LOC. Feature-complete but **NOT a React component**.
2. **Schema only — reuse**: `/home/koh/Documents/noredFarms/kanban-schema.sql` is the cleanest part. Tables: `kanban_boards`, `kanban_tasks` with `column_name`, `position`, `priority`, `labels text[]`, `due_date`, `subtasks jsonb`, `assigned_to`, `column_entered_at`, `wip_limits jsonb`. Triggers + RLS scaffolding included. **Copy this SQL as-is** for grant pipeline (columns: prospect → drafting → submitted → awarded/declined).
3. There is also `/home/koh/Documents/noredFarms/supabase/functions/kanban-api/` (Deno edge function) — skip unless using Supabase Edge.

### Netlify Functions pattern
- `/home/koh/Documents/noredFarms/api/_shared/auth.js` — `authorizeWrite()` / `authorizeUser()` helpers (JWT + service role + `x-api-key` fallback). **Copy directly** for grant intake webhook auth.
- `/home/koh/Documents/noredFarms/api/_shared/compliance.js` — pattern example, not topically relevant.
- `/home/koh/Documents/noredFarms/api/send-notification.js` (23KB) — multi-channel notification fan-out (email + Telegram + in-app via Supabase). **Worth adapting** for grant deadline alerts.
- `/home/koh/Documents/noredFarms/api/submit-contact.js`, `submit-sample-lead.js` — form intake patterns with validation.

### Supabase migrations as a reference library
- `/home/koh/Documents/noredFarms/reps/supabase/migrations/` — 29 numbered migrations. Highly relevant for HAND:
  - `003_notifications.sql`, `026_notification_grants.sql`, `027_notifications_delete.sql` — notifications system
  - `005_announcements.sql` — announcement broadcast pattern
  - `006_rep_roles.sql`, `008_applications_self_read.sql`, `013_fix_rls_recursion.sql` — RLS role patterns (the `013` fix is a known gotcha to learn from)
  - `017_team_lead_invites.sql` — invite codes for onboarding
  - `022_rep_feedback.sql` — feedback/comment threads
  - `025_audit_log_insert_policy.sql` — audit log

### What NOT to borrow from noredFarms
- **`/home/koh/Documents/noredFarms/kanban-app.js`** — hardcoded `SUPABASE_URL` + `SUPABASE_ANON_KEY` + hardcoded password (`PASSWORD = 'bud'`) at top of file. Repo may be public; **do not copy with keys**. Anon key is meant to be public but the inline password is a smell.
- Heavy vanilla-JS legacy code at root of noredFarms (`admin-app.js` 136KB, `inspector-app.js` 54KB) — superseded by the `reps/` Next.js app. Don't go backwards.
- `reps/` ties to `reps` Postgres schema and `rep_profiles` shape — strip these names when copying.

---

## 2. kohlabsAI / nerve — AI orchestration & notifications

Located at `/home/koh/Documents/kohlabsAI/nerve/`. Turbo monorepo, TypeScript, npm workspaces.

### Tech stack
- Turbo monorepo (`packages/`, `services/`, `agents/`)
- **BullMQ + Redis** job queues, **Drizzle ORM** + Postgres, **pino** logging
- **OpenAI / Anthropic / Venice / xAI** via custom router
- nodemailer for SMTP; Slack/Discord/webhook channels
- Docker Compose for local infra (`docker-compose.yml`)

### Reusable for command center

**AI router** — `/home/koh/Documents/kohlabsAI/nerve/packages/ai-router/`
- `src/router.ts` — multi-provider router with primary + fallback chain, usage logging
- `src/providers/anthropic.ts`, `openai.ts`, `venice.ts`, `xai.ts` — per-provider adapters
- `src/types.ts` — `ChatCompletionRequest/Response`, `ImageGenerationRequest`, `UsageRecord`
- **Use case for HAND**: drafting grant answers from project context (the `grants` skill mentioned in this workspace). Drop in this router instead of calling OpenAI directly.

**Notifier service** — `/home/koh/Documents/kohlabsAI/nerve/services/notifier/`
- `src/index.ts` — BullMQ worker pattern
- `src/processor.ts` — DB-logged dispatch
- `src/channels/{email,discord,slack,webhook}.ts` — four channel adapters
- **Use case for HAND**: grant-deadline alerts, decision notifications. If we don't want Redis, lift the channel adapters and call directly from a Netlify Function.

**Shared package** — `/home/koh/Documents/kohlabsAI/nerve/packages/shared/`
- Drizzle schemas, pino logger factory (`createLogger`), queue name constants, Redis connection factory
- Worth grabbing `createLogger` + queue patterns even without BullMQ.

**Dashboard service** — `/home/koh/Documents/kohlabsAI/nerve/services/dashboard/` (has `app/`, `components/`, `lib/`, `server/`, `store/`) — Next.js operator dashboard. Skim for layout patterns, but `reps/` is a stronger template.

### What NOT to borrow from nerve
- The full BullMQ + Redis stack is overkill for a grants admin. Lift channel handlers; skip the queue layer unless we already need it elsewhere.
- `.env` file in repo at `/home/koh/Documents/kohlabsAI/nerve/.env` — **flag**, do not surface contents, do not commit if forked.
- `docker-compose.yml` is large (15KB) — only relevant if we stand up the full stack.

---

## 3. FlowB — communication / community systems

Located at `/home/koh/Documents/flowb/`. Multi-app monorepo (web, mobile, kanban, danz, bot, miniapps, backend).

### Most relevant subprojects

**FlowB Kanban** — `/home/koh/Documents/flowb/kanban/`
- **This is the React kanban the noredFarms one isn't.** Vite + React 19 + TS + Supabase + Tailwind 4 + shadcn primitives + sonner + react-markdown + remark-gfm
- Components: `/home/koh/Documents/flowb/kanban/src/components/kanban/`
  - `kanban-board.tsx`, `kanban-column.tsx`, `task-card.tsx`, `task-modal/`, `task-filters.tsx`, `quick-add-form.tsx`, `board-header.tsx`, `command-palette.tsx`
- Hooks: `/home/koh/Documents/flowb/kanban/src/hooks/`
  - `use-kanban.ts`, `use-auto-save.ts`, `use-notifications.ts`, `use-task-activity.ts`, `use-leads.ts`, `use-crews.ts`, `use-local-preferences.ts`
- Auth context: `/home/koh/Documents/flowb/kanban/src/contexts/auth-context.tsx`
- Types: `/home/koh/Documents/flowb/kanban/src/types/kanban.ts`
- **For HAND command center: this is the kanban to port.** Vite → Next.js App Router conversion is mechanical. Pair with noredFarms `kanban-schema.sql` for the DB side.

**FlowB Web** — `/home/koh/Documents/flowb/web/` — Vite static site, `auth.js`, `chat-widget.js`, `app.js`. Older vanilla-JS pattern. Skip unless we want the chat widget.

**FlowB Backend** — `/home/koh/Documents/flowb/danz/backend/` — has session management notes (`SESSION-MANAGEMENT.md`). Worth a skim only if we hit a session issue.

### What NOT to borrow from FlowB
- `/home/koh/Documents/flowb/.env` exists in working tree — **flag** but file content not inspected.
- The repo sprawls across DANZ, FlowBond, flowb-vip, flowmobile — don't get lost. Stick to `flowb/kanban/` for the command center.
- `findings.md` at root is 43KB of unresolved debugging notes — not a pattern to copy.

---

## 4. Other relevant projects (quick callouts)

- **`/home/koh/Documents/decleanup/`** — Next.js 16, App Router, Farcaster miniapp + RainbowKit + wagmi + zustand + react-query + Supabase. Has `middleware.ts` at root and jest scaffolding. **Useful for**: zustand store pattern, react-query setup, if HAND command center grows to need wallet auth for contributor-side. Not core to grants.
- **`/home/koh/Documents/handprotocol/sweetspot/app/`** — already-in-repo Next.js 12-era app (different stack: vanilla `next.config.js`). Don't use as template.
- **`/home/koh/Documents/handprotocol/web/landingpage/`** — Next.js 12 landing. Read-only inspirational, design system reference.
- **`/home/koh/Documents/AIeGator/apps/web/`** — Next.js. Not inspected in depth; user has not flagged it.
- **`/home/koh/Documents/DANZ/danz-web/`**, **`danz-landingpage/`** — Next.js, design-heavy. Pattern reference for marketing pages only.
- **`/home/koh/Documents/handprotocol/netlify/functions/intake.js`** — already present, Resend-based form intake. **Active blueprint** for any new grant form intake; mirror its style.
- **`/home/koh/Documents/handprotocol/netlify/functions/subscribe.js`** — paired mailing-list intake. Same style.
- **`/home/koh/Documents/handprotocol/governance/`** — mission/governance markdown the grants skill already reads. Source-of-truth, not infra.

---

## 5. Recommended reuse list for the command center

Greenfield directory: `/home/koh/Documents/handprotocol/command/`. Build it as Next.js 16 App Router + Supabase SSR + Tailwind 4 + shadcn — same shape as `noredFarms/reps/`.

### By concern

**Project scaffold / package.json**
- Copy from `/home/koh/Documents/noredFarms/reps/package.json` (Next 16 + React 19 + Supabase SSR + shadcn + Tailwind 4). Strip Stripe/Leaflet/XLSX unless needed for grant exports (XLSX is probably worth keeping).

**Auth (login + role-gated routes)**
- `/home/koh/Documents/noredFarms/reps/src/lib/supabase/{client,server,middleware,profile}.ts`
- `/home/koh/Documents/noredFarms/reps/src/app/auth/login/page.tsx`
- `/home/koh/Documents/noredFarms/reps/src/app/auth/callback/route.ts`
- `/home/koh/Documents/noredFarms/reps/src/app/(dashboard)/layout.tsx`
- Schema swap: `reps` → `command` (or whatever HAND chooses). Roles: `admin` + `contributor` + `reciprocate` instead of `admin`/`customer`.

**Kanban (grant pipeline view)**
- React components: `/home/koh/Documents/flowb/kanban/src/components/kanban/*` + `hooks/use-kanban.ts`
- Schema: `/home/koh/Documents/noredFarms/kanban-schema.sql` — copy tables, drop the open RLS, replace with role-aware policies modeled on `/home/koh/Documents/noredFarms/reps/supabase/migrations/006_rep_roles.sql`
- Domain rename: `kanban_boards` → `grant_pipelines`, `kanban_tasks` → `grant_applications` (or keep generic).

**Server Actions / CRUD layer**
- Template: any file in `/home/koh/Documents/noredFarms/reps/src/lib/actions/` — `leads.ts` is closest in shape to a grant record (lifecycle, ownership, status).
- Pattern: `"use server"` + `getProfile()` guard + `revalidatePath()`.

**Layout chrome (sidebar / mobile nav / notifications)**
- `/home/koh/Documents/noredFarms/reps/src/components/{sidebar-nav,mobile-nav,notification-bell}.tsx`
- Update nav entries: Dashboard / Grants / Deadlines / Drafts / Decisions / Settings.

**Forms + tables**
- `/home/koh/Documents/noredFarms/reps/src/components/list-toolbar.tsx` (toolbar)
- `/home/koh/Documents/noredFarms/reps/src/components/admin/{field,settings-form-wrapper,settings-tabs}.tsx` (form scaffold)
- `/home/koh/Documents/noredFarms/reps/src/components/{export-button,status-badge}.tsx`
- `/home/koh/Documents/noredFarms/reps/src/lib/export.ts` (XLSX export for grant ledger)

**Notifications (deadline reminders, decisions)**
- Channel adapters: `/home/koh/Documents/kohlabsAI/nerve/services/notifier/src/channels/{email,slack,discord,webhook}.ts`
- Skip BullMQ; invoke directly from a Netlify scheduled function. Use existing Resend pattern from `/home/koh/Documents/handprotocol/netlify/functions/intake.js` for email.
- In-app notification table: copy `/home/koh/Documents/noredFarms/reps/supabase/migrations/003_notifications.sql` + `026_notification_grants.sql`.

**AI-assisted grant drafting**
- `/home/koh/Documents/kohlabsAI/nerve/packages/ai-router/` — drop in as a workspace package or copy `router.ts` + the one provider you need. Anthropic provider preferred given the Claude-native skill (`grants` skill).

**Webhook / Netlify Function auth**
- `/home/koh/Documents/noredFarms/api/_shared/auth.js` — JWT + `x-api-key` fallback. Use for any public grant-intake webhook.

**Markdown rendering (grants skill outputs markdown)**
- FlowB kanban already pulls in `react-markdown` + `remark-gfm`. Lift the dependency choice; no specific component to copy.

### One-paragraph build order
1. `cp -r noredFarms/reps/{package.json, src/lib/supabase, src/app/auth, src/app/(dashboard)/layout.tsx, src/components/ui}` → `handprotocol/command/`. Rename schema.
2. Stand up Supabase with: noredFarms `kanban-schema.sql` + migrations `003_notifications.sql` + `006_rep_roles.sql` (adapted).
3. Port `flowb/kanban/src/components/kanban/*` and `hooks/use-kanban.ts` into `command/src/app/(dashboard)/grants/`.
4. Wire Netlify Functions for intake (existing `intake.js` style) + scheduled deadline scanner (calls nerve email channel directly).
5. Layer in `ai-router` (Anthropic provider only at first) behind a `/api/draft-answer` route called from the grant drawer.

---

## Security flags (no values printed)
- `/home/koh/Documents/noredFarms/kanban-app.js` — inline `SUPABASE_URL` + anon JWT + plain-text password constant. Anon key is public-safe by design but password constant is a smell. Do not copy lines 1–20 verbatim.
- `/home/koh/Documents/kohlabsAI/nerve/.env` — present in working tree.
- `/home/koh/Documents/flowb/.env` — present in working tree.
- `/home/koh/Documents/noredFarms/reps/.env.local` — present in working tree (expected for local dev).
- None of these were read or surfaced; just flagged.
