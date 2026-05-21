# HAND Command Center

A working command bridge for HAND Protocol's grant program. Next.js 16 admin
portal for the grant pipeline. Localhost-only in Phase 0.

This directory is the operator's chair, not the operator's filing cabinet.
Markdown files in `funding/grants/*.md` remain canonical. The command center
renders, sorts, and filters them. See the PRD at
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

## Auth flow assumption

The command center uses Supabase Auth, lifted from
`noredFarms/reps/src/lib/supabase/*`. The schema name is `command` (versus
`reps` in the source). To make auth real:

1. Create or designate a Supabase project for HAND. Open question 1 in the
   PRD is whether this is a new project or extends an existing one.
2. Create a `command` schema, with a `profiles` table that joins to
   `auth.users` via `user_id` and stores `role` (`admin` / `contributor` /
   `viewer`), `display_name`, and `reciprocate_group`.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
4. Restart `npm run dev`. The proxy (`src/proxy.ts`) will start gating routes
   and redirecting unauth'd traffic to `/auth/login`.

Until those vars are set, the dashboard renders in a preview role so the
scaffold is visible end to end without a live project. The auth code still
compiles and is wired, it just no-ops the session refresh.

## Data model contract

This is the load-bearing rule of the command center, the same one stated in
PRD section 6.

| Layer | What it holds | Authoritative? |
|---|---|---|
| Markdown frontmatter in `../funding/grants/*.md` | `slug`, `name`, `status`, `deadline`, `fit_score`, contacts | Canonical |
| Markdown body | TL;DR, fit assessment, draft answers, retrospective | Canonical |
| Supabase `command.grants` | Frontmatter mirror plus `kanban_position`, `column_entered_at`, `last_synced_at` | Read replica |
| Supabase `command.funders` | Curated funder library | Canonical (no markdown counterpart yet) |
| Supabase `command.touchpoints` | Funder communication log | Canonical |
| Supabase `command.boilerplate` | Reusable snippets | Canonical, exports to markdown on demand |
| Git history | Diffs of every markdown change | The audit log |

The implication: server actions write the markdown file first, then upsert
the Supabase row. If Supabase disappears, the grants are still in git. If a
new admin pulls main on a new laptop, `npm run sync:grants` (Phase 1) will
rebuild Supabase from markdown.

Phase 0 ships none of this yet. The schema is the contract, not the code.

## HUD-dark theme

Two rooms in one building. Public surfaces are warm editorial. Operator
surfaces, including this one, are HUD-dark. The palette comes verbatim from
the loader at `../web/3d-test/loading.html` and lives in `src/app/globals.css`.

Token reference (extend by adding new CSS custom properties at the top of
`globals.css`, then mirroring them into the `@theme inline` block so Tailwind
4 utilities pick them up):

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

Helper classes:

- `.hud-surface`, page wrapper that adds the radial backdrop and grid mask
- `.hud-bracket` + `.hud-bracket-{tl,tr,bl,br}`, the 18px corner brackets
- `.eyebrow`, JetBrains Mono uppercase label, used for status, timestamps, IDs
- `.panel`, baseline card surface

Typography: Inter for body, JetBrains Mono for any string that looks like a
database value. Both load via `next/font/google` in `src/app/layout.tsx`.

## Loader hand-off

`src/app/page.tsx` renders the `LoaderSplash` component. The splash mounts
`public/loading.html` inside a full-bleed iframe (so the three.js + anime.js
code stays untouched), prefetches `/dashboard`, and runs `router.replace` once
both `window.load` has fired AND a 1.4s dwell has elapsed. A 2.5s safety net
catches stalled environments.

The loader cycles H · A · N · D and runs the progress bar through SIGNAL ·
LINK · WEAVE · BLOOM. Those stage names map to operator semantics in Phase 1+
(scanning for opportunities, matching to mission, drafting, awaiting decision).

If the session is missing once auth lands, the proxy will catch the redirect
to `/dashboard` and bounce to `/auth/login` instead.

## Voice rules

These apply to everything written into this app, including README copy, UI
strings, and engineering comments visible to operators.

- No em dashes. Use commas, periods, parentheses, or "and"
- No AI tells. Avoid: furthermore, leverage, robust, ecosystem, navigate
  the complexities, delve into
- No specific AI model names in operator-facing copy. Engineering comments
  may name models for clarity.
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
├─ src/
│  ├─ app/
│  │  ├─ globals.css            # HUD-dark token layer
│  │  ├─ layout.tsx             # Inter + JetBrains Mono, dark by default
│  │  ├─ page.tsx               # cold-boot loader, hands off to /dashboard
│  │  ├─ auth/
│  │  │  ├─ login/page.tsx
│  │  │  └─ callback/route.ts
│  │  └─ (dashboard)/
│  │     ├─ layout.tsx          # gated route group, sidebar + HUD chrome
│  │     └─ dashboard/page.tsx  # Phase 0 placeholder
│  ├─ components/
│  │  ├─ loader-splash.tsx
│  │  ├─ sidebar-nav.tsx        # H-A-N-D pillared nav
│  │  ├─ mobile-nav.tsx
│  │  ├─ notification-bell.tsx  # stubbed in v1
│  │  └─ ui/                    # button, input, label, sonner (Toaster)
│  ├─ lib/
│  │  ├─ utils.ts               # cn() for class merging
│  │  └─ supabase/              # client, server, middleware, profile
│  └─ proxy.ts                  # Next.js 16 middleware (renamed Proxy)
├─ .env.example
├─ .gitignore
└─ package.json                 # dev/start scripts bound to 127.0.0.1
```

## What ships in Phase 0

- Next.js 16 + React 19 + Tailwind 4 scaffold
- HUD-dark theme tokens applied to globals.css and Tailwind
- Inter + JetBrains Mono via `next/font/google`
- Supabase SSR auth stack (`client`, `server`, `middleware`, `profile`) with
  the schema renamed from `reps` to `command`
- Login page at `/auth/login`, callback route at `/auth/callback`
- Gated dashboard route group with a Phase 0 placeholder page
- Sidebar nav with the six pillared destinations (Dashboard, Grants,
  Funders, Boilerplate, Deadlines, Settings)
- Mobile slide-over nav
- Notification bell, stubbed
- The loader integrated as the cold-boot splash, hand-off at 1.4s
- Dev server bound to 127.0.0.1
- The build passes (`npm run build`)

## What is stubbed or deferred

- The notification bell renders inert. Real Supabase realtime hookup lands
  in Phase 4 (Develop).
- The Grants, Funders, Boilerplate, Deadlines, and Settings pages 404. They
  are nav destinations in Phase 0, real routes in Phases 1 through 5.
- Markdown ingest from `../funding/grants/*.md` is Phase 1.
- The drafting assistant route at `/api/draft-answer` is Phase 2.
- Auth gating is wired but inert until env vars are set.

See PRD section 10 for the full phase plan.

## Why this directory is excluded from the public Netlify site

The handprotocol Netlify site is configured at the repo root with
`publish = "web"`, so only files under `web/` ever ship to the public site.
The `command/` directory builds locally, never as part of the public deploy.
The `.gitignore` here also blocks `.next/` and `node_modules/` from being
committed by accident.
