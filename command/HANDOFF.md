# HAND Command Center Handoff

Last updated: 2026-07-16

## Release status

The compact shell, five-item dashboard summary, and Kitty Express visit integration described below are present in the local worktree but are not published. The current branch also contains unrelated in-progress work and predates the live Kitty Express merges on `main`. Read `../web/kitties/HANDOFF.md` for the verified file map, Git-state warning, and safe publication sequence before preparing a release.

## Current shell design

The Command Center shell now uses a compact, Supabase-inspired operator layout:

- A persistent 48px icon rail keeps the work canvas wide.
- Desktop hover reveals the full labeled navigation. The rail control opens a pinned drawer for touch and deliberate use.
- The sticky top bar identifies the HAND workspace, environment, branch, search, and notifications.
- The dashboard opens with workspace health, connected operating areas, and a five-item definition-list summary backed by current query results, including recent Kitty Express views.
- The desktop work canvas is capped at 1120px so the desk keeps the compact proportions of the mobile interface instead of spreading modules across a wide monitor.
- Surfaces are flatter and closer to black, with thin neutral borders. Amber remains the HAND action color, while green is reserved for operational health.

The shell lives in `src/app/(dashboard)/layout.tsx`, the responsive rail and drawer live in `src/components/mobile-rail.tsx`, and the new shell styling lives in `src/app/globals.css`.

## What this is now

The Command Center is the internal operating desk for HAND Protocol. It is not only a grant tracker anymore. It now carries four kinds of operating signals:

1. Grants and funders
2. Project outreach and generated sites
3. Public-site feedback
4. Public-site visit activity

The product has outgrown the original grant-only HUD framing. The next design direction should keep the dark, late-night operator surface, but make the interface read more like a clear work desk and less like a technical cockpit.

## Current framework

### Public website

The public website is served from `web/`.

The canonical foundation campaign URL is now `/`. The implementation still lives in `web/foundation-campaign/index.html`, and deploy config rewrites `/` to that file. Old `/foundation-campaign` URLs redirect back to `/`.

Feedback is collected by:

- `web/assets/feedback-widget.js`
- `netlify/functions/feedback.js`
- Supabase table `command.feedback_pins`
- Command routes `/feedback` and `/review`

Public visit activity is collected by:

- `web/assets/visit-beacon.js`
- `netlify/functions/visit.js`
- Supabase table `command.public_visits`
- Command route `/public`

Kitty Express reports the canonical `/kitties/game/` path from both `handprotocol.org` and `kitties.handprotocol.org`, so game views roll up as one page in Command.

Project demo visit activity is separate:

- `web/assets/demo-visit.js`
- `netlify/functions/biz-visit.js`
- Supabase table `command.biz_visits`
- Command project routes under `/projects`

### Command Center

The Command Center is a Next.js app in `command/`.

Important routes:

- `/dashboard`, the home desk
- `/grants`, grant pipeline
- `/funders`, funder library
- `/inbox`, capture queue
- `/projects`, project and local-business outreach board
- `/projects/sites`, live site registry
- `/feedback`, feedback triage
- `/review`, page-review inspector
- `/public`, public-site visit activity
- `/reciprocates`, Reciprocate groups and scoped work
- `/settings`, invites, roles, applications

The schema is Supabase schema `command`. Migrations live in `command/supabase/migrations/`.

### Data model summary

Core tables:

- `command.grants`, grant pipeline mirror from markdown
- `command.funders`, funder library
- `command.activity_log`, internal grant and operator activity
- `command.feedback_pins`, public feedback and page-review notes
- `command.biz_leads`, project and outreach leads
- `command.biz_visits`, generated demo and pitch page visits
- `command.public_visits`, high-value public site visits
- `command.access_applications`, pre-account requests
- `command.inbox_items`, quick-capture queue

Reciprocate groups are present but not yet backed by a dedicated table. Current authoritative fields are `reciprocate_group` on grants, profiles, invites, and access applications. The `/reciprocates` route rolls these up until a first-class group table exists.

## What is working

- Public feedback lands in Command Center.
- The foundation campaign can be served from `/`.
- Project demo visits are counted in the project area.
- Public visits have a database table and a route.
- The app builds with Next.js 16.

## What was confusing

- Feedback existed, but not on the dashboard.
- Project work was labeled `Develop`, which hid the actual meaning.
- Public visits were in `/public`, but the name was vague.
- The dashboard led with H-A-N-D pillar tiles instead of the day-to-day work.
- The UI copy leaned on HUD language: bridge, radar, pipeline state, node, build.
- The sidebar showed internal pillar letters instead of helping the operator find work.
- Reciprocates existed as a schema field but not as an area in the product.

## New design direction

Make the Command Center feel like a clear internal desk:

- Use plain labels: Projects, Feedback, Site activity, Templates.
- Keep the dark surface and polished HUD chrome.
- Put live work on the dashboard: deadlines, feedback, projects, site activity.
- Make Reciprocates first-class in navigation and on the dashboard.
- Keep H-A-N-D as brand structure in docs, not as the primary navigation model.
- Use technical terms only where they help operation, for example slugs, statuses, and database-backed logs.

## Near-term product map

1. Dashboard becomes the home desk:
   - Feedback waiting
   - Projects moving
   - Deadlines due
   - Public interest
   - Reciprocate groups with active work

2. Projects becomes a real umbrella:
   - Local-business outreach
   - Generated demos
   - Live sites
   - Pitch responses
   - Reciprocate project work later

3. Feedback becomes a visible loop:
   - Recent public notes on dashboard
   - `/feedback` for triage
   - `/review` for page review

4. Site activity becomes supporting evidence:
   - Public visits on dashboard
   - Detail view at `/public`
   - Demo visits remain inside Projects

5. Reciprocates becomes a first-class area:
   - Group-level rollups from grants, access requests, and scoped accounts
   - Later, a dedicated `command.reciprocate_groups` table for notes, stage, needs, and project ownership

## Operational notes

When adding public website instrumentation, route it into Command Center by default unless there is a privacy reason not to.

Use these sinks:

- Visitor feedback: `command.feedback_pins`
- High-value public page visits: `command.public_visits`
- Generated project demo visits: `command.biz_visits`
- Form submissions from Reciprocates or applicants: a named table in `command`, not email only

Avoid adding new Telegram-only workflows. Telegram is useful for urgent alerts, but Command Center should be the durable system of record.
