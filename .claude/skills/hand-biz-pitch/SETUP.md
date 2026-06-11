# hand-biz-pitch — new-machine setup (cross-PC handoff)

The skill itself (`SKILL.md` in this directory) ships with the repo: any Claude
Code session working inside this checkout can invoke `/hand-biz-pitch` with no
install. This file covers the pieces git does NOT carry. Work through it once
per machine before running the pipeline.

## 1. Checkout

```bash
git clone git@github.com:HandProtocol/handprotocol.git
cd handprotocol
git checkout feat/command-develop-biz-outreach   # until PR #2 lands on main
```

Optional, to use the skill outside the repo:
`cp .claude/skills/hand-biz-pitch/SKILL.md ~/.claude/skills/hand-biz-pitch/`

## 2. Secrets (never in repo or chat — move via 1Password)

- `command/.env.local` — Supabase URL + service key. Required for
  `register-lead.mts` / `build-lead.mts` (lead + review rows in
  `command.biz_leads` / `biz_reviews`). Without it you can still scrape and
  build demos, but nothing reaches the Command Center kanban.
- `ANTHROPIC_API_KEY` — leave EMPTY. The pitch generator's deterministic
  fallback is the normal local path; hand-tune category-isms after.
- Netlify auth (`netlify login`) — only if this machine will run surgical
  deploys. Otherwise just land commits on main; prod auto-deploys.

## 3. Headless Chromium (scraper + screenshots)

```bash
cd command && npm install          # playwright-core is a devDependency
npx playwright-core install chromium
```

The scraper drives the cached Chromium under `~/.cache/ms-playwright/`.

## 4. Smoke test

```bash
cd command
npx tsx scripts/scrape-lead.mts "<any-maps-place-url>" --dry --max=3
```

If that prints a lead skeleton, the machine is ready. Full pipeline entrypoint
is `npx tsx scripts/build-lead.mts "<maps-url>"` — see `SKILL.md` for phases.

## 5. Multi-session etiquette (learned the hard way 2026-06-10)

- One writer per checkout. If two sessions must work the same machine, give
  each its own clone or `git worktree`.
- Never `git reset` / rebase in a checkout another session is committing to.
- Commit with explicit pathspecs (`git commit -- <files>`) so you never sweep
  in another session's staged work.
- Coordinate batch state through handoff docs in `biz/_handoff-*.md`, and let
  commits meet on the branch.

## Current batch state

See `biz/_handoff-east-austin-food-trucks.md` — 34 East Austin food-truck
leads built 2026-06-10, with 5 handed-off tasks (phone confirmation, premium
rebuilds for the top 5, pitch voice tuning, kanban work, Telegram watch).
