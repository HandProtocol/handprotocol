# Handoff: hand-client-seo (SEO tool) · 2026-10-01

Resume point for a cold session. **The skill is not usable yet**: the audit
libraries and 85 checks are written, but there is no runner, no entry script,
no `SKILL.md`. Nothing was deployed, committed, or changed on any live site
or in any client folder. Everything is inside `.claude/skills/hand-client-seo/`.

## What koH asked for (2026-09-30)

1. "Make an SEO tool like our clients tool (`hand-client-site`) that does
   everything needed, has questions in an interactive menu that asks what
   stage you need to help the client: just our basic SEO setup, or guiding the
   user with setting up Google Search Console etc., to doing SEO tests. Go all out."
2. "After you make the tool, go all out making threehandshealing with the
   tool, make sure all SEO is done."
3. "Then set a standup for the client and HAND to go over to set up all the things."

## How to work (rules that bind this job)

- **No multi-agent Workflow runs.** koH's saved preference; on 2026-09-30 one
  9-agent research run hit the usage limit in about 15 minutes. Build directly
  in-session. A single subagent for a sweep is fine.
- Another Claude session shares this checkout (`omnione/`, `kohsi/`, `yuhm/`,
  `command/`). Touch nothing there. Never `git add -A`. **Do not commit** unless
  koH asks; `clients/` and both skills are untracked.
- Never invent a phone, address, city, hours, price or review link. THH's are
  all unknown. An unknown fact is an owner item, not a gap to fill.
- HAND-voiced copy (SKILL.md, guides, Setup items, standup, messages): no em
  dashes, none of the AI-tell words. THH wording: "EFT / Tapping sessions",
  never "EFT therapy".
- Owner UX: the button is the step; items tick themselves; never make an owner
  type a URL.
- Engine changes go in `clients/_template` with a test, then `sync-engine.mjs`.
  Never edit engine files inside a client.
- Read `reference/research/engine-seo-map.md` before touching the engine and
  `reference/research/skill-conventions.md` (sections 3, 4, 6) before
  deploying, signing in headlessly, or touching DNS.

## Files and their state

Run tests: `cd .claude/skills/hand-client-seo/scripts && node --test tests/*.test.mjs` → 21 pass.

| File (under `scripts/lib/`) | What | State |
|---|---|---|
| `util.mjs` | helpers; re-exports sibling skill's `REPO`, `clientDirs`, `loadClientConfig`, `args`, `die`, `ok` | used by tests |
| `net.mjs` | `request()` never throws, `follow()` records hops, `probe()` HEAD then GET | run against live sites |
| `html.mjs` | `parseHtml`, `headInfo`, `headings`, `images`, `anchors`, `anchorName`, `jsonLdBlocks`, `visibleText`, `wordCount`, `fragmentTargets`; `doc.headBrokenBy` | **tested** (14 tests) + six live pages |
| `robots.mjs` | `parseRobots`, `isAllowed`, `hasGroupFor`, `CRAWLERS` | **tested**. `CRAWLERS` tokens are from memory: verify |
| `sitemap.mjs` | `parseSitemap` | **tested** |
| `image.mjs` | `imageSize` (PNG/JPEG/GIF/WebP/AVIF/SVG) | **tested** |
| `serve.mjs` | `serveDir(dir, { mount })` static server for local builds | loads; never run |
| `crawl.mjs` | `crawlSite(url, { maxPages, rewrite })`, `checkResources(crawl, { extraImages })` | loads; never run |
| `analyze.mjs` | `analyzePage(page, crawl, facts)`, `robotsDirectives`, `likelyLcpImage` | loads; never run |
| `jsonld.mjs` | `validateBlocks`, `collectNodes`, `LOCAL_BUSINESS_TYPES` (schema.org's real subtree; `BarberShop` does not exist) | loads; never run |
| `checks/kit.mjs` | `fail/warn/info`, `phonesIn`, `PLACEHOLDER_RE`, `UNFINISHED_RE` | loads |
| `checks/site.mjs` (21), `page.mjs` (21), `data.mjs` (12), `links.mjs` (12), `perf.mjs` (11), `local.mjs` (8) | the 85 checks | load; **none has ever run** |

## Contracts already fixed by the code (the runner must honor them)

**Check**: `{ id, category, title, gate?, site(ctx) | page(ctx, a) }`, may be
async, returns findings `[]` or `{ skip: 'reason' }`.
**Finding**: `{ severity: 'fail'|'warn'|'info', message, url?, evidence?, fix?, engineFix?, who? }`.
`who` = `hand` (default) | `owner` | `cutover`. `gate: true` = launch gate.
Categories used: crawlability, indexability, on-page, content, structured-data,
social, links, images, performance, mobile, security, local, i18n.

**ctx the checks read**:
- `crawl` from `crawlSite` (`start, origin, host, scope, local, robots, allowed(), sitemaps, sitemapEntries, variants, notFound, pages, redirects, io, inScope()`).
- `res` from `checkResources` (`links` Map, `images` Map). Pass `extraImages`:
  every page's `ogImageAbs`, every icon href (`iconLinks(a)` in `data.mjs`),
  and `${origin}/favicon.ico`.
- `pages`: analyses (`analyzePage`) of in-scope HTML pages that answered 200.
  The raw crawl page is `a.page`.
- `byUrl`: Map of normalized URL → analysis (key both `page.url` and `page.requested`).
- `home`: the analysis of `crawl.start` (may be undefined).
- `facts`: `{ name, phone, email, locality, region, areaServed[], serviceMode ('storefront'|'service-area'|'online'|'hybrid'), bookingUrl, business (false disables local checks), medical }`. All optional.
- `target`: `{ otherUrls: [] }` (other addresses of the same site, for `duplicate-hosts`).
- `probe(url)`: cached `io.probe`. `fetchPage(url)`: → `{ status, finalUrl, hops, headers, text }`.
- `psi`: `null` or `{ mobile, desktop }`, each `{ error }` or
  `{ scores: { performance, seo, accessibility, 'best-practices' } (0..1), failedSeoAudits: [], lab: { lcp, cls, tbt } (ms / unitless), field: null | { scope, lcp: { category, display }, inp, cls } }`.
- `lab`: `null`, `{ error }`, or `{ mobile: { overflow, overflowCulprits[], smallTapTargets, smallTapExamples[], tinyText, contentInHtml, errors[], failedRequests[] }, desktop: { errors[], failedRequests[] } }`.

**Local builds**: `crawlSite(publicUrl, { rewrite: { from: 'https://site', to: 'http://127.0.0.1:port' } })`.
URLs in the result stay public; only the wire request is rewritten. For
`web/threehandshealing` use `serveDir(dir, { mount: '/threehandshealing' })`.

## Next steps, in order

1. **`checks/index.mjs`**: registry + `runChecks(ctx)` (await each; attach
   `id, category, title, gate`, default `who: 'hand'`, default `url`; collect
   `passed` and `skipped`).
2. **`score.mjs`** (designed): each category starts at 100; a fail costs 25
   (+5 per extra instance of the same check, max +15), a warn 8 (+2, max +6),
   info 0. Total = weighted mean of categories that ran: crawlability 15,
   indexability 20, on-page 15, structured-data 10, social 5, links 8,
   images 7, performance 10, mobile 4, security 3, local 10, i18n 1, content 2.
   Bands A≥90 B≥80 C≥70 D≥60 F. Gate passes when no `gate` check has a fail.
3. **`audit.mjs`**: crawl → analyze → resources → (psi, lab) → checks → score.
   Output JSON: `{ tool, version, target, startedAt, finishedAt, options, site, pages[], findings[], passed[], skipped[], score: { total, band, byCategory, gate: { pass, blocking[] } }, psi, lab }`.
4. **Fixtures + tests**: `tests/fixtures/good/` and `bad/` served by
   `serveDir`; assert the bad site raises the expected ids and the good site
   raises no fail. This is the first real run of crawl/analyze/checks: expect bugs.
5. **`psi.mjs`** (PageSpeed Insights v5; test keyless first) and **`lab.mjs`**
   (Playwright from `~/.claude/skills/gstack/node_modules/playwright/index.mjs`,
   `chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox'] })`,
   390×844 and 1440×900; degrade to `{ error }` when absent). Lighthouse 12.8.2
   sits in the npx cache (`~/.npm/_npx/*/node_modules/lighthouse`): find it by
   scanning, never by the hash.
6. **`report.mjs`**: terminal, Markdown, HTML, JSON. Group findings by who
   must act (HAND now / needs the owner / at cutover).
7. **`facts.mjs` + `target.mjs` + `state.mjs`**: resolve a slug, URL or folder;
   facts from the engine config + content for engine clients; state and audit
   history under `clients/<slug>/seo/` (`state.json`, `audits/<stamp>/`).
8. **`seo.mjs`**: `status | menu | baseline | audit | test | google | cutover | standup | report`.
   `menu --json` prints the question tree so Claude drives `AskUserQuestion`
   from the same data; with a TTY it asks the questions itself.
9. **Engine SEO upgrade** in `clients/_template` (see below), tests, sync THH.
10. **References + `SKILL.md`** (frontmatter: `name`, `description` ending in
    "Use when asked to: …"; stage table first; phases; gotchas; instances).
11. **Run it on Three Hands Healing** (see below).
12. **Standup** (see below).
13. Update `clients/three-hands-healing/HANDOFF.md` with a dated section, and
    the memory notes.

## Stage menu (designed)

Stages: `baseline` (our standard on-site setup, proven by an audit), `google`
(owner walkthrough: Search Console, Business Profile, Bing, review link),
`test` (the audit; `--gate` exits non-zero), `cutover` (domain move),
`standup` (prep the client session), `monitor` (re-audit and compare), `full`.
Questions: which client; which stage (Baseline / Google setup with the owner /
Tests and audit / Full run); how the owner steps happen (standup together /
owner alone from the Setup tab / HAND with shared access / not now); test
depth (quick / full crawl + PageSpeed / launch gate).

## Engine SEO upgrade (planned, nothing changed yet)

From the gap list in `reference/research/engine-seo-map.md` section 5. All
must be no-ops for a pack that has not opted in:

- `config.seo` via a new `normalizeSeo()` in `lib/config.mjs`: `type`,
  `areaServed`, `address`, `geo`, `hours`, `priceRange`, `sameAs`, `locale`,
  `indexing: 'index' | 'hold'` (default `index`; `hold` sends
  `X-Robots-Tag: noindex`), share-image crop position.
- `headTags()`: `path` param for per-route canonical; canonical from
  `productionUrl` when the request host is not the production host; omit an
  empty description; `og:site_name`, `og:locale`, `og:image:width/height/alt`,
  `twitter:title/description/image`, Bing `msvalidate.01`; skip any tag the
  pack already passes in `extra` (THH passes `og:site_name` and `og:image:alt`).
- Share image as a 1200×630 JPEG through the Image CDN, keeping the source
  file name in the URL (PrecisionFix's pack test matches on it).
- `jsonLd()`: `@graph` with `@id`, a `WebSite` node, the new config facts;
  emit a key only when its source is set; `...overrides` stays last.
- `lib/site.mjs`: append `google_verification` and `bing_verification` to the
  pack's `seo` section only when absent. An engine section named `seo` would
  crash every site (duplicate section).
- New `robots.mjs` function (`preferStatic: true`) with a `Sitemap:` line;
  each pack's static `public/robots.txt` must be deleted by hand to take effect.
- `sitemap.mjs`: `lastmod` from `updated_at`, production origin.
- `lib/render.mjs`: 301 `/about/` → `/about`; `X-Robots-Tag: noindex` on
  404s, `NOINDEX` routes and non-production hosts (guarded so it is a no-op
  while `productionUrl` is the netlify.app host).
- `gen-netlify-toml.mjs`: forced 301 from `<site>.netlify.app` to the
  production domain once `productionUrl` is a custom domain (needs the Netlify
  site name in config). LHWT's hand-kept toml is the working pattern.
- Checklist: `copy` action and Bing / reviews items; `render-static.mjs --origin=`.
- THH, PrecisionFix and Legacy Care are 28 engine items behind the template.
  Syncing THH also brings the multi-page and review-page changes and needs
  `npm install`. Test and preview before any deploy.

## Three Hands Healing plan

- Engine site `clients/three-hands-healing/`, live at
  `https://three-hands-healing.netlify.app` (site id `5d0bc794-27d0-4af8-b1b1-1116b34e6350`,
  account cryptokoh, deploy by CLI with the cryptokoh token, never the active login).
- Do: sync the engine; add the `seo` config block (`HealthAndBeautyBusiness`,
  area "Texas" only until the city is confirmed); add `site/checklist.mjs` so
  Maria gets a Setup tab with the SEO items; drop the pack's duplicate
  `og:site_name` / `og:image:alt` from `extra`; rewrite title and description
  without em dashes (the live copy is in the database, so change it through
  `PATCH /api/admin/content` signed in as `hand@handprotocol.org` with a
  minted token; recipe in `skill-conventions.md` 3.5); tests; preview; deploy;
  audit live; fix; re-audit.
- Known live state: `/index.html` answers 200 (duplicate), robots.txt has no
  Sitemap line, og:image is a 1066×1600 portrait WebP, JSON-LD has only
  name/description/url/image, no contact route at all (Book only scrolls), the
  page says details "will be added at launch".
- `https://handprotocol.org/threehandshealing/` (`web/threehandshealing/`) is a
  second self-canonical copy with no JSON-LD. Changing it needs a push to
  `main`: prepare the change, ask koH before pushing.
- `3handshealing.com` still serves a systeme.io page holding Maria's email
  list. Export the list before any DNS change. koH earlier said not to chase
  the DNS; it belongs on the standup agenda.

## Standup plan

"Set a standup" = a working session between Maria and HAND for everything
that needs her. `seo.mjs standup <slug> --when= --tz=America/Chicago` should
write `clients/<slug>/seo/standup/`: an operator agenda, an owner-facing page,
an `.ics` invite, and a message draft. Agenda items come from findings with
`who: 'owner'`, unknown facts, the Google stage, and the domain move. For THH:
her city, phone, email, booking link, prices and hours; her Google account
for Search Console and Business Profile (verification is usually a video);
Namecheap and systeme.io logins; the email-list export. Publish the owner
page as a private Artifact for koH to share. Do not send Maria anything;
draft only.

## Open decisions for koH

1. Which THH address is the indexable one until the domain moves
   (recommended: the engine site; the handprotocol.org copy points its
   canonical at it).
2. Date, time and channel for the standup.
3. Whether engine SEO changes sync to PrecisionFix, Legacy Care and LHWT now or later.
4. Whether pushing the `web/threehandshealing/` canonical change to `main` is approved.

## Progress 2026-10-01 (later session)

Steps 1 to 11 done; step 12 partly; step 13 not done.
- Tool complete: `checks/index.mjs`, `score.mjs`, `audit.mjs`, `psi.mjs` (API, falls back to local Lighthouse; keyless API is 429), `lab.mjs`, `report.mjs`, `facts.mjs`, `target.mjs`, `state.mjs`, `guides.mjs`, `standup.mjs`, `seo.mjs`, `SKILL.md`, `reference/checks.md`, `reference/engine-seo.md`. 38 tests pass (fixture sites in `tests/fixtures/`).
- Engine SEO upgrade in `clients/_template` (126 tests pass), synced to THH only, deployed live. THH 88 → 96 (A). Live title/description rewritten via the editor API (no em dashes). Setup tab live (7 items).
- Left: (a) standup files written WITHOUT a date (`clients/three-hands-healing/seo/standup/`); re-run with `--when=` once koH picks a time, then publish `owner.html` as a private Artifact; (b) handprotocol.org copy canonical patch in `clients/three-hands-healing/seo/pending/`, needs koH's OK to push to main; (c) add a dated section to `clients/three-hands-healing/HANDOFF.md` and update memory notes; (d) open decisions 2 and 3 above unchanged. Gate still blocked by "no way to contact or book" (Maria's booking link or email).
- Backups of template and THH before the engine change: session scratchpad only (gone after this session).

## Progress 2026-10-01 (evening session)

First runs beyond THH (all `--no-save`, nothing written to those clients):
PrecisionFix 98, Legacy Care 96, ZeroBlur 93, hamburguesasemilia.com 97,
eds-barbershop.com 99, handprotocol.org 85. Tool fixes from those runs
(42 tests pass, 86 checks):
- `links-broken-external` is site-wide now: one dead footer link was one warn per page.
- New `url-twins` (indexability): `/page` and `/page.html` both indexable. Duplicate-title/description checks no longer count twins twice.
- `og-image` fails a placeholder share image (path has placeholder/ph-NN/sample); "an SVG" grammar.
- Evidence quotes cut at word boundaries (`excerpt()` in `checks/kit.mjs`).
- `seo.mjs checks --md > reference/checks.md` regenerates the check list; help text reads the whole header.
- THH `baseline` recorded: 9/13 clean, `in progress`. The one HAND item is the handprotocol.org copy (patch in `clients/three-hands-healing/seo/pending/`, still applies clean, waits on koH's OK to push to main). The other three items wait on Maria.

Findings for other clients (reported to koH, nothing changed):
- ZeroBlur: structured data carries a 555-0100 placeholder phone; og:image is `img/placeholder/ph-01.svg`; no sitemap.
- Legacy Care: two meta descriptions (pack + engine), page names no city.
- PrecisionFix / Legacy Care: robots.txt has no Sitemap line, WebP share image (fixed by syncing the current engine).
- handprotocol.org: broken internal link `/funding/mcgovern-letter.md` (from /sovereign-reciprocates/), `discord.handprotocol.org` does not resolve, 3 anchors missing on /reciprocates/, two discovery pages indexable at .html and extensionless, 13 pages without canonical.
