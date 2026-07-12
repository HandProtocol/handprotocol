---
name: hand-command-center
description: "HAND Command Center workflow. Use when editing the internal Next.js app in command/, including dashboard, projects, feedback, page review, public activity, Reciprocates, grants, funders, settings, Supabase queries, roles, RLS-aware flows, or operator-facing UI copy."
---

# HAND Command Center

Use this for internal operator software in `command/`. The Command Center is a dark, polished internal operating desk, not generic SaaS and not a grant-only cockpit.

## Read First

From repo root:

1. `command/HANDOFF.md`
2. `command/PRODUCT.md`
3. `command/DESIGN.md`
4. `command/AGENTS.md`

For Next.js changes, read the relevant local docs in `command/node_modules/next/dist/docs/` before touching route conventions.

## Current Product Shape

- Home desk: `/dashboard`
- Grants: `/grants`, `/grants/[slug]`
- Funders: `/funders`
- Projects umbrella: `/projects`, with legacy implementation still under `/develop`
- Feedback triage: `/feedback`, legacy alias `/pins`
- Page review: `/review`, legacy alias `/inspector`
- Public-site activity: `/public`
- Reciprocate groups: `/reciprocates`
- Templates: `/templates`, legacy alias `/boilerplate`
- Settings, invites, applications: `/settings`

## Design Direction

- Keep dark colors, amber accent, and sleek HUD feel.
- Do not change `command/public/loading.html` unless explicitly asked.
- Make pages clearer and more user-friendly than the old technical cockpit.
- Prefer labels like Projects, Feedback, Site activity, Page review, Templates, and Reciprocates.
- Keep H-A-N-D as brand structure in docs, not the primary navigation model.
- Empty states are helpful and restrained, not cute.

## Data Sinks

- Feedback: `command.feedback_pins`
- Public visits: `command.public_visits`
- Project demo and pitch visits: `command.biz_visits`
- Project outreach: `command.biz_leads`, `command.biz_reviews`, `command.biz_touchpoints`, `command.biz_pitch_responses`
- Reciprocate grouping today: `reciprocate_group` on grants, profiles, invites, and access applications.

## Implementation Rules

- Use existing query patterns: SSR client first, service-role admin fallback only where the app already does it.
- Server actions that use service role must gate capabilities in app code.
- Maintain compatibility aliases when renaming routes in the UI.
- Do not flatten the app into light CRM styling.
- Do not add visible AI model names in operator-facing copy.
- Do not use em dashes.

## Verify

Run from `command/`:

```bash
npm run build
```

For route work, confirm the build route table includes the route and alias you expect.

For copy sweeps, use targeted scans:

```bash
rg -n 'beneficiar|recipient|client|stakeholder|AI-powered|supercharge|leverage|robust' command/src command/HANDOFF.md
LC_ALL=C rg -n $'\xE2\x80\x94' command/src command/HANDOFF.md
```

When checking the loading screen preservation:

```bash
git diff -- command/public/loading.html
```
