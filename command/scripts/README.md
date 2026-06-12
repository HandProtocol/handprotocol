# Develop lead scripts

Headless helpers for the business-development ("Develop") pillar, the `hand-biz-pitch`
workflow. They use the **service-role** Supabase key on purpose: the `/develop` UI and
the `generate-*` API routes read through the authenticated SSR client (RLS), so an
unauthenticated process cannot use them. Run from anywhere, each pins cwd to `command/`.

**One-shot:** `npx tsx scripts/build-lead.mts "<maps-url>" [--max=12] [--slug=] [--price=75] [--no-pitch]`
runs scrape → register → generate-site → generate-pitch and prints the demo + pitch
URLs (last stdout line is JSON). This is the "drop a Maps link" entrypoint; stamping
`demo_generated_at` makes HandAI's `develop-leads` poll post the demo to the Telegram
💼 Develop topic within ~3 min. The steps below are the same pipeline, run by hand.

Order of use for a new lead:

0. **`npx tsx scripts/scrape-lead.mts "<maps-url>" [--max=25] [--slug=] [--dry]`**
   Opens the place in headless Chrome (`playwright-core` + the cached Chromium /
   system google-chrome) and writes `biz/<slug>/lead.md`: facts (name, category,
   city/state, phone, address, website status, rating, true review count) plus the
   most-relevant reviews verbatim. Reviews come from the place feature id +
   Google's `listentitiesreviews` endpoint, not the (headless-hidden) reviews UI.
   Best input is a real `/maps/place/` or `maps.app.goo.gl` link (carries the pin).
   `--dry` prints without writing; re-scraping a slug needs `--slug=`. The phone is
   from the Maps card — confirm it before it hits the public demo's `tel:` link.

1. **`npx tsx scripts/enrich-lead.mts <slug> [--url=<listing>]`**
   Reverse-geocodes the Google Maps pin in `lead.md` to a locality, and (with `--url`)
   best-effort scrapes a directory listing for phone candidates. Reports only, it does
   not write, you confirm and edit `lead.md`. A found phone goes on the gated pitch
   page, not the public demo, until confirmed.

2. **`npx tsx scripts/register-lead.mts <slug>`**
   Syncs the canonical `biz/<slug>/lead.md` (frontmatter + `## Reviews`) into
   `command.biz_leads` / `biz_reviews`. Idempotent. Markdown is the source of truth,
   edit it first, then re-run this.

3. **`npx tsx scripts/generate-site.mts <slug> [--out=path] [--dry]`**
   Builds the demo site `web/demos/<slug>/index.html` from the lead + reviews
   (Anthropic if `ANTHROPIC_API_KEY` is set, else the grounded fallback), using the
   real `renderDemoSite` (injects the visit beacon), and stamps `demo_url` +
   `demo_generated_at`. This is the QUICK template baseline; the premium path is an
   `/impeccable` hand-build that overwrites `index.html`. `--out` previews + skips the
   DB stamp; `--dry` reports only.

4. **`npx tsx scripts/generate-pitch.mts <slug> [--price=75] [--out=path] [--dry]`**
   Writes the gated pitch page `web/demos/<slug>/pitch/index.html` from the lead +
   reviews. Anthropic if `ANTHROPIC_API_KEY` is set, else a grounded deterministic
   fallback. Default offer is a flat $75 with optional add-ons. `--out` previews
   elsewhere (e.g. `/tmp`) without clobbering a hand-tuned page; `--dry` just reports.

For a lead worth the effort, replace the quick `generate-site` output with a premium
`/impeccable` hand-build (same `web/demos/<slug>/index.html`). Env: `command/.env.local`.
