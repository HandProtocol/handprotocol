---
name: hand-client-seo
description: "SEO for HAND client sites, by stage: HAND's standard on-site setup proven by an audit, the owner's Google steps (Search Console, Business Profile, review link, Bing), a crawl-and-score audit with PageSpeed and a real-browser check, a launch gate, the domain move, and a prepared standup with the owner. Use when asked to: do SEO for a client, audit a client site, run an SEO test, check if a site is ready to launch, set up Google Search Console or a Business Profile for a client, prepare an SEO standup, move a client site to its domain without losing search, compare SEO before and after."
---

# HAND Client SEO (stages, audit, standup)

Gets a client's site found. One tool, `seo.mjs`, asks what stage the client is at and runs that stage: the on-site setup HAND does for every site, the steps only the owner can do, the tests, and the session that brings the two together. It reads the site the way a crawler does (robots.txt, sitemap, host variants, every page), runs 86 checks, scores them, and says who has to act on each finding: HAND now, the owner, or at the domain move.

**Working directory**: repo root (`/home/koh/Documents/handprotocol`).
**Script**: `node .claude/skills/hand-client-seo/scripts/seo.mjs <command> <client|url|folder> [--flags]` (run with no arguments for the full usage).
**Sibling skill**: `hand-client-site` (the engine and the Setup tab). Engine changes go in `clients/_template`, never in a client.
**Results**: `clients/<slug>/seo/` (`state.json`, `audits/<stamp>/{audit.json,report.md,report.html}`, `standup/`). Untracked, like the rest of `clients/`.
**First instance**: Three Hands Healing, 2026-10-01 (88 → 96 live).

## Pick the stage first (30 seconds)

Ask with `AskUserQuestion`, using the menu data: `seo.mjs menu --json` prints the questions and options (client, stage, how the owner steps happen, test depth); `seo.mjs plan --client= --stage= --owner= --depth=` turns the answers into the exact commands. On a terminal, `seo.mjs menu` asks the questions itself.

| The client needs | Stage | What happens |
|---|---|---|
| Our basic setup on their site | `baseline` | An audit, then HAND's standard list item by item (crawlable, sitemap, one address per page, titles, structured data, previews, photos, contact). HAND fixes what is HAND's. |
| Google set up with them | `google` | The owner's steps with progress: Search Console, Business Profile, review link, Bing, analytics choice. |
| A test or an audit | `test` / `audit` | Crawl, 86 checks, score, reports. `--psi --lab` adds PageSpeed and a phone/desktop browser check; `--gate` fails on launch blockers. |
| Everything | `full` | Baseline, a full audit, the Google steps, a standup, the domain-move plan. |
| To move to their domain | `cutover` | The ordered steps, owner's and HAND's. Nothing runs by itself. |
| A session with the owner | `standup` | Agenda, owner page, calendar invite, message draft. Nothing is sent. |
| To see if it is holding | `monitor` | `audit --compare` against the last run. |

## Phase 1: Facts (never guess one)

```bash
node .claude/skills/hand-client-seo/scripts/seo.mjs facts <slug>
node .claude/skills/hand-client-seo/scripts/seo.mjs facts <slug> set locality=Austin phone="+1 512 …"
```

Facts come from the engine config (`name`, the `seo` block), the live content (`/api/content`: phone, email, booking link the owner filled in) and `state.json` (only what the owner confirmed). The checks hold the page against them. An unknown fact (city, phone, hours, prices) is an owner question, never a gap to fill. Keys: `name phone email locality region areaServed serviceMode bookingUrl business medical`.

## Phase 2: Baseline (HAND's standard on-site setup)

```bash
node .claude/skills/hand-client-seo/scripts/seo.mjs baseline <slug>            # the live site
node .claude/skills/hand-client-seo/scripts/seo.mjs baseline <slug> --local    # clients/<slug>/dist-preview (run npm run preview first)
```

For engine clients most of the baseline is the engine itself (added 2026-10-01, see `reference/engine-seo.md`): canonical on `productionUrl` per route, robots.txt with a Sitemap line, sitemap with `lastmod`, a 1200×630 JPEG share image, the full Open Graph and Twitter set, a `WebSite` + business `@graph`, `/index.html` and trailing-slash 301s, noindex on 404s. A pack opts into the business facts through `seo: { type, areaServed, address, geo, hours, priceRange, sameAs, logo, locale, indexing, ogPosition }` in `site.config.mjs`. Per pack, HAND still writes the title and description (place + service + name, about 60 and 150 characters), adds the Setup tab items, and deletes the pack's static `public/robots.txt` so the engine serves its own.

Changing live copy (title, description) goes through the editor API, not the code: the stored document wins over the schema defaults. Recipe: `reference/research/skill-conventions.md` 3.5 (mint a one-time token for `hand@handprotocol.org`, verify, `PATCH /api/admin/content { set: { 'seo.title': … } }`, log out).

## Phase 3: Test and audit

```bash
node .claude/skills/hand-client-seo/scripts/seo.mjs audit <slug|url|folder> [--psi] [--lab] [--max=25] [--also=<url>] [--compare] [--verbose]
node .claude/skills/hand-client-seo/scripts/seo.mjs test <slug> --psi --lab --gate      # exits 1 when the launch gate is blocked
node .claude/skills/hand-client-seo/scripts/seo.mjs report <slug> [--format=md|html|json]
```

A target is a client slug (its `productionUrl`, or `dist-preview` with `--local`), any URL, or a folder (`web/threehandshealing` is served locally and audited as `https://handprotocol.org/threehandshealing/`). `--also=<url>` tests another address of the same site for a duplicate copy and is remembered for every later run. Every run is saved; `--compare` lists what was fixed, what is new, and what was not checked this time.

Score: each area starts at 100; a fail costs 25 (+5 per repeat, at most +15 more), a warn 8 (+2, at most +6), info nothing; the total is weighted toward indexability, crawlability and on-page. Bands A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60. The launch gate passes when no gate check fails. Check list: `reference/checks.md`.

## Phase 4: Google with the owner

```bash
node .claude/skills/hand-client-seo/scripts/seo.mjs google <slug>
node .claude/skills/hand-client-seo/scripts/seo.mjs google <slug> --done=search-console,bing
```

Prints each step for the owner (one verb per line, the button in bold) and HAND's part around it; ticks are recorded in `state.json`. Engine clients carry the same steps in the Setup tab: Search Console has **Copy your site address** and **Copy the sitemap address** buttons (`kind: 'copy'`, added 2026-10-01), so the owner never types a URL, and the verification code field is added to every pack's `seo` section by the engine. Business Profile verification is usually a short video: say so ahead of time.

## Phase 5: Standup (prepare the session; send nothing)

```bash
node .claude/skills/hand-client-seo/scripts/seo.mjs standup <slug> --when=2026-10-07T10:00 --tz=America/Chicago --channel="Zoom"
```

Writes `clients/<slug>/seo/standup/`: `agenda.md` (operator: preparation, timed blocks), `owner.html` (owner: what we will do, questions, what to have ready), `invite.ics` (only with `--when`), `message.md` (a short draft). Questions come from missing facts, owner findings and open Google items; extra asks and logins come from `state.json` `standup.asks` / `standup.logins`. Publish `owner.html` as a private Artifact for the operator to share. Never send the owner anything; the operator does.

## Phase 6: Domain move (DNS and deploys: confirm with the operator first)

```bash
node .claude/skills/hand-client-seo/scripts/seo.mjs cutover <slug> --domain=example.com
```

Order matters: export what the old site holds first, DNS zone first (propagation overlaps the rest), then set `productionUrl` to the domain and `netlify.siteName` in `site.config.mjs`, sync and deploy (canonical, sitemap, robots, structured data and `og:url` all move together; the generated `netlify.toml` gains forced 301s from `<siteName>.netlify.app`), then `test --gate` on the domain, then the owner adds the domain in Search Console and on the Business Profile. The exact Netlify calls are Phase 6c of `hand-biz-pitch`.

## Engine maintenance

The SEO engine changes live in `clients/_template` (tests: `tests/seo.test.mjs`, `tests/sitemap.test.mjs`, `tests/checklist.test.mjs`). To bring a client up: `node .claude/skills/hand-client-site/scripts/sync-engine.mjs <slug> --test`, then delete its `public/robots.txt`, drop any `og:site_name` / `og:image:alt` it passes through `extra` (the engine skips duplicates, but the pack should not carry them), bump `assetVersion` (the admin changed), preview, draft deploy, check, deploy. The tool's own tests: `cd .claude/skills/hand-client-seo/scripts && node --test tests/*.test.mjs`.

## Instances

| Client | State (2026-10-01) |
|---|---|
| Three Hands Healing (`clients/three-hands-healing`) | Engine synced and deployed; live 96/100 (A). Gate blocked only by "no way to contact or book" (owner: booking link or email). Setup tab live with 7 items. handprotocol.org copy still self-canonical: patch in `seo/pending/`, needs koH's OK to push to main. Read `clients/three-hands-healing/HANDOFF.md`. |
| PrecisionFix, Legacy Care, LHWT | Not synced to the SEO engine yet (koH's call). LHWT keeps its own head and robots/sitemap files; the engine changes it would receive are render, sitemap, site and config. |

## Gotchas

- **Keyless PageSpeed is usually out of quota** (429, shared by everyone). `--psi` then runs Lighthouse 12.8.2 from the npx cache with Playwright's Chromium: lab numbers, no field data. Set `PAGESPEED_API_KEY` for field data.
- **A local build is not the live site.** `dist-preview` has no Image CDN, so photos are full JPEGs and `og:image` is the raw portrait: those two warnings in a `--local` run are expected. Judge images on a draft deploy.
- **Netlify adds `X-Robots-Tag: noindex` to every deploy-permalink URL** (including robots.txt). A draft audit will flag noindex everywhere; that is Netlify, not the site.
- **Look at the share-image crop.** `ogPosition: 'top'` cut Maria's face to the top of her head; center was right. Fetch the 1200×630 URL from a draft and look before choosing.
- **Live copy lives in the database.** Changing schema defaults changes nothing on a published site; change title and description through the editor API.
- **The engine's noindex for stray hosts only fires once `productionUrl` is a custom domain**, and stray-host responses are never CDN-cached, so a noindex can never be served on the real domain.
- **Never name an engine section `seo`**: every pack has one; the engine appends its fields into it instead.
- **Concurrent sessions share this checkout.** Do not edit `web/` in the working tree for a client change; write a patch and land it on `main` from a scratch worktree once koH says yes.
- `CRAWLERS` tokens in `scripts/lib/robots.mjs` (OAI-SearchBot, Claude-SearchBot, PerplexityBot, GPTBot, ClaudeBot, Google-Extended, CCBot, Applebot) are from the vendors' published names as of 2026; recheck if a vendor renames one.
