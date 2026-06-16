---
name: hand-biz-pitch
description: "HAND business-development outreach: turn a local business's Google Maps info + reviews into a free demo website (built with /impeccable) and a password-gated pitch page with a call script and a follow-up form. Use when asked to: build a demo site for a business, make a pitch page, pitch a local business, biz outreach, generate a sales site from reviews, work a lead in the Develop pipeline."
---

# HAND Business-Development Pitch Builder

Turns a local business that has no website but strong Google reviews into two
hand-off-able artifacts: a **free demo website** and a **gated pitch page** a
volunteer can use to call them. A third of any closed deal funds the HAND pool.

**Working directory**: `/home/koh/Documents/handprotocol`

**Where things live**
- Pipeline + data (operator tool): the Command Center, `command/` — the
  "Develop" pillar at `/develop`. Lead records in Supabase schema `command`
  (`biz_leads`, `biz_reviews`, `biz_pitch_responses`).
- Canonical lead source: `biz/<slug>/lead.md` (frontmatter + reviews).
- Demo site (public): `web/demos/<slug>/index.html` → `handprotocol.org/demos/<slug>/`.
- Pitch page (gated): `web/demos/<slug>/pitch/index.html` →
  `handprotocol.org/demos/<slug>/pitch/`, Basic-Auth login **`hand` / `handme`**
  (edge fn `netlify/edge-functions/demos-pitch-auth.js`, env `DEMOS_PITCH_PASSWORD`
  + optional `DEMOS_PITCH_USER`, default `hand`).
- Follow-up write-back: `netlify/functions/biz-pitch-response.js` → inserts into
  `command.biz_pitch_responses` (env `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  on the public Netlify site).
- Visit tracking: `web/assets/demo-visit.js` (a beacon on every demo) →
  `netlify/functions/biz-visit.js` → `command.biz_visits`. Surfaced on
  `/develop/<slug>` ("SITE ACTIVITY", with "when built") and on the kanban cards.
- Demo portfolio (gated, operator-only): `web/demos/index.html` at
  `handprotocol.org/demos/`, same `hand` / `handme` login (edge fn
  `demos-portfolio-auth.js`). Its data comes from `netlify/functions/biz-portfolio.js`
  via the edge-gated rewrite `/demos/portfolio.json`. Individual demos
  `/demos/<slug>/` stay public; only the `/demos/` index + its data are gated.
- Supabase creds for local work: `command/.env.local`.

**Data contract** (mirror `command/src/lib/develop/types.ts`): a lead has name,
category, city, state, phone, address, google_url, google_rating, reviews_count,
website_status (`none|poor|ok`), status (`prospect|built|contacted|interested|closed|passed`).
Slug = kebab of `name` + `city`. Markdown is canonical; Supabase is the read replica.

Two build paths exist. The Command Center has a **quick** template generator
(`/api/develop/generate-site`, the "Generate site" button) for a zero-effort
baseline. This skill is the **premium** path: `/impeccable` for a genuinely good
demo. Use the quick path only when impeccable is overkill.

**Urgent path (demo-first).** When the operator signals speed ("asap", "quick
site", "just get the demo up", "send it"), ship the demo before touching the
pitch. The demo is the artifact that has to exist and be shareable; the pitch
page is the follow-up. Run the phases in this order:

1. Phase 1 + 1.5 — capture + enrich (run the enrichment as a background agent so
   image conversion and the build proceed in parallel; the phone is often already
   confirmed off the truck's own signage, which clears it for the demo's click-to-call).
2. Phase 2 — register the lead (`register-lead.mts`), stamps `built`.
3. Phase 3 — build the demo with `/impeccable` (or by hand to the same bar).
4. **Phase 5 — deploy the demo NOW and verify it live** (surgical cherry-pick to
   `main`; confirm 200 + the visit beacon + it shows on the gated `/demos/` portfolio).
   Hand the demo URL over at this point.
5. Phase 4 — generate + hand-tune the pitch page, then redeploy as a fast follow
   (the pitch lives under the same `web/demos/<slug>/` dir, so it's a second small
   commit + cherry-pick). The deploy machinery (env gate, verify steps) is the same.

For non-urgent runs, keep the natural Phase 1 → 5 order (pitch built before the
single deploy).

---

## Finding leads near a place — `find-nearby.mts`

Before you have a Maps link, find the businesses worth one. Drop a street, an
address, or a business you are standing next to and get a ranked shortlist of
nearby places with no (or weak) website — each with the `build-lead` command
ready to paste. This is the front door on the sidewalk: "what's near me that a
low-cost site would help?"

```bash
# what's near me that needs a site
npx tsx scripts/find-nearby.mts "Barton Springs Rd, Austin TX" --category="food truck"
# standing on the corner — search from exact coords, tighten to a walk
npx tsx scripts/find-nearby.mts --lat=30.2615 --lng=-97.7682 --radius-km=1
# anchor on a business instead of a street
npx tsx scripts/find-nearby.mts "Terry Black's Barbecue Austin"
```

It geocodes `<where>` with Nominatim (OSM, no API key), builds a Maps search URL,
then runs the existing discovery pipeline headless — `discover-leads.mts` (scroll
the Maps feed) → `check-websites.mts` (authoritative website_status + phone +
address per place) — and keeps only the ones worth a knock: **no/weak website,
rating + reviews above the floor.** Output is a ranked list with distance, phone,
address, and the `build-lead.mts "<href>"` command per pick.

Flags: `--category` (default `food truck`), `--zoom` (lower = wider net),
`--radius-km` (0 = no limit; set it to keep the list walkable), `--min-rating`
(4.0), `--min-reviews` (10), `--top` (20), `--skip-known` (drop places already in
`biz/_registry/checked-places.ndjson`), `--out=<file.ndjson>`, `--headful`. Needs
headless Chrome, same as the scrapers.

Then run `build-lead.mts` on the hrefs worth building. The phone-confirm rule still
applies before any number goes on a public demo.

---

## Automated path — drop a link, get a lead + demo + pitch

`npx tsx scripts/build-lead.mts "<maps-url>" [--max=12] [--slug=] [--price=75] [--no-pitch]`
runs the whole Phase 1 → 4 pipeline headless, no agent in the loop:
scrape → register → generate-site (quick template) → generate-pitch. It writes
`biz/<slug>/lead.md`, `web/demos/<slug>/index.html`, and the pitch page, then
prints the demo + pitch URLs (last stdout line is JSON `{slug,demo,pitch,website_status}`).

This is the entrypoint for the "drop a Maps link in Telegram" flow. Stamping
`demo_generated_at` in the generate-site step is what the agent's `develop-leads`
poll turns into the **"demo built" post in the 💼 Develop topic** within ~3 min, so
a dropped link self-announces with a working demo URL. (HandAI in the
`kohlabsAI/nerve` repo owns that poll; nothing to wire here.)

Two things a human still does after the pipeline: **confirm the phone** before it
goes on the public demo's `tel:` link (the scraper takes it from the Maps card, but
the Phase 1.5 "unconfirmed until a human checks" rule still holds), and — for a
lead worth it — **upgrade the quick template demo to a premium `/impeccable` build**
(Phase 3), then deploy (Phase 5). The quick template is the auto baseline; the
premium hand-build is the differentiator. Nothing deploys until a human runs Phase 5.

## Phase 1 — Capture the business

Default: **scrape it.** `npx tsx scripts/scrape-lead.mts "<maps-url>" [--max=25]
[--slug=] [--dry]` opens the place in headless Chrome and writes `biz/<slug>/lead.md`
(facts + reviews verbatim) in one pass. It pulls name, category, city/state, phone,
address, website status, rating, and the true review count, plus the most-relevant
reviews. `--dry` prints without writing; re-scraping an existing slug needs `--slug=`
(otherwise it disambiguates to `<slug>-2` so it never clobbers a live lead).

How it works (so you can fix it when Google shifts): headless Maps never renders the
interactive reviews UI, but the place's **feature id** (`0x..:0x..`, in the place URL
and the embedded `APP_INITIALIZATION_STATE`) keys Google's own review endpoint
(`/maps/preview/review/listentitiesreviews`), which the script calls from the page so
consent cookies apply. One request returns up to ~49 reviews, most-relevant first —
exactly what a demo leads with. Facts come from stable `data-item-id` DOM anchors.
The old "you cannot scrape Maps" note was about the gstack `browse` daemon (sandbox-
blocked here); raw headless Chrome via `playwright-core` works fine. A paid reviews
API (SerpApi/Outscraper) is the planned upgrade for reliability at volume.

**Best input is a real place/share link** (`/maps/place/...` or `maps.app.goo.gl/...`):
it carries the `!3d<lat>!4d<lng>` pin (used in Phase 1.5) and the feature id. A bare
`?q=` search query still works for facts + reviews but yields no pin, so the
`google_url` falls back to a search URL.

When the scrape comes up short (no feature id, a place type with no review endpoint,
or you just have text), fall back to **manual paste** — the operator qualifies on
Maps and pastes. Either way you want:

- Name, category, city, state, phone, address, Google Maps URL
- Google rating and review count
- **3 to 8 of the best reviews, verbatim** (this is the content seed)
- Optional: 1 to 3 photo URLs, hours, any standout detail (signature dish, named staff)

Qualification bar: no website, rating ≥ 4.2, ≥ 15 reviews, has phone + address.
The bar is a guide, not a gate. The operator may pick a thinner lead (969foodtruck
shipped on 7 reviews, only 2 with usable text). When reviews are thin, lean on the
photos + the aggregate rating, curate out garbled or negative reviews for the demo,
and keep all of them verbatim in `lead.md`. The scraper flags `website_status: ok`
when a real site exists (social-only links read as `poor`) — that usually means the
lead does not qualify, so confirm before pitching.

Never invent a phone, address, hours, services, awards, or staff — scraped or pasted.

**The phone is load-bearing.** The pitch IS a phone call, so a number is required
before a caller can work the lead, and the demo wants a `tel:` click-to-call. The
Maps paste often omits the phone and the street address. Do not block on it, get
what you can here and fill the gaps in Phase 1.5. Never invent a phone, address,
hours, services, awards, or staff.

## Phase 1.5 — Enrich what the paste is missing

The Maps paste usually lacks phone, full address, and hours. Fill them now so the
demo and pitch are complete in one pass instead of circling back later.

- **Locality from the pin.** Pull `!3d<lat>!4d<lng>` from the Maps URL and reverse-
  geocode it (Nominatim: `.../reverse?format=jsonv2&lat=<lat>&lon=<lng>`) to get the
  city/county. Trust the pin over aggregator addresses for directions.
- **Phone / address / hours from directory aggregators.** WebSearch the business
  name + town, then WebFetch the listing pages (restaurantji, yelp, allmenus,
  bizapedia). They often carry the phone + hours the Maps card omits. Confirm the
  digits map to THIS business, not a neighbor with a similar name (search the digits
  back).
- **Treat aggregator data as unconfirmed.** Put a found phone on the gated pitch
  page with a visible "from a listing, confirm on the call" note, the caller verifies
  it live. Keep it OFF the public demo's `tel:` click-to-call until the operator
  confirms it. A wrong number on a real business's live customer-facing site is the
  one genuinely harmful mistake here.

Tooling: `npx tsx scripts/enrich-lead.mts <slug> [--url=<listing>]` does the
reverse-geocode (and a best-effort listing scrape) for you, report-only.

## Phase 2 — Register the lead

So it lands in the pipeline and the pitch follow-up can link back.

- If the Command Center dev server is running (`cd command && npm run dev`),
  the cleanest path is the UI at `/develop/new` (or the operator already added it).
- Otherwise register it directly:
  1. Compute `<slug>`.
  2. Write `biz/<slug>/lead.md` with YAML frontmatter (the fields above) and a
     `## Reviews` body, one review per blockquote. Match the format produced by
     `command/src/lib/develop/markdown.ts` (`serializeBizLead` + `reviewsToBody`).
  3. Insert the rows into Supabase via REST using creds from `command/.env.local`
     (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`):
     POST `${URL}/rest/v1/biz_leads` and `${URL}/rest/v1/biz_reviews` with headers
     `apikey`, `Authorization: Bearer <service_role>`, `Content-Profile: command`.

Keep `biz/<slug>/lead.md` canonical: if you change facts later, edit it first.

- The slug defaults to kebab(`name` + `city`), but honor an operator override
  (e.g. `969foodtruck`) as long as you use it the same everywhere: `biz/<slug>/`,
  `web/demos/<slug>/`, the frontmatter `slug`, and the Supabase row.
- Clean direct path: `npx tsx scripts/register-lead.mts <slug>` syncs the canonical
  `lead.md` (frontmatter + `## Reviews`) into Supabase with the service-role key.
  Idempotent, edit `lead.md` first then re-run. (See `command/scripts/`.)
- **RLS gotcha (bites in Phase 4):** the `/develop` board and the `generate-*` API
  routes read Supabase through the authenticated **SSR client**. A row inserted with
  the service-role key is invisible to an unauthenticated request, so an un-logged-in
  `curl` to those routes 404s ("Lead not found"). It works in the browser when the
  operator is logged in.

## Phase 3 — Build the demo with /impeccable

This is the skill's main value: hand `/impeccable` a **complete brief** so it does
not have to ask its usual discovery questions. Assemble the brief from the reviews:

- **Who / what**: `<name>`, a `<category>` in `<city>, <state>`.
- **Audience**: local customers searching on their phone; the goal is a call,
  a visit, or directions.
- **Proof**: the rating + review count, and the verbatim reviews as testimonials.
- **Services**: extract them from what reviews praise (do not invent services,
  awards, years in business, or staff names not present in the reviews).
- **Voice**: plain, warm, the owner talking, not an agency. No em dashes, no AI
  tells (leverage, robust, elevate, nestled, passionate, one-stop, top-notch).
- **Typography (legibility over flair)**: the business name is the most-read text on
  the page, so its display font must be instantly readable by an everyday local customer
  (often older, on a phone in sunlight), not theatrical. Before committing a face, look
  at the business name's ACTUAL letters in it and reject any with swashy or ambiguous
  capitals/descenders. **Do not use Fraunces.** Its descending swash "J" and curly
  "G/R" read as "too funky" and it had to be ripped off three live demos (get-juicy-roots,
  frontier-valley, novas-tex-mex) for exactly that — do not reach for it again. Use a
  proven face instead: a calm serif like **Spectral** (get-juicy-roots, frontier-valley,
  roberts-realty) when you want warmth, a slab like **Bitter** (novas-tex-mex) when you
  want something sturdier, or a sans display — Bricolage Grotesque (969foodtruck), Anton
  (amburguesas), Bebas Neue (jazzi-barber) — when that fits the brand. Whatever you pick,
  the test is the same: if a single glyph makes you pause to decode the name, change the
  font.
- **Sections**: hero (promise + rating + click-to-call), services, testimonials
  (the reviews), about (2–3 grounded sentences), contact (phone tel: link, address,
  map link to the Google URL).
- **Photos**: if the operator gives photos, convert to webp first, they are usually
  multi-MB PNG screenshots. `ffmpeg -i in.png -c:v libwebp -preset photo -quality 82
  out.webp` (no cwebp/ImageMagick in this env) takes ~3MB to ~250KB. Reference
  relatively from `img/`; hero `loading=eager fetchpriority=high`, the rest
  `loading=lazy decoding=async`; set width/height to kill layout shift.
- **Image policy (settled 2026-06-11, do not relitigate per-lead)**:
  - **Scraped Google Maps photos NEVER go on a public demo.** Copyright belongs to
    the uploaders, and customer-uploaded photos cannot even be licensed by the
    business. Scraped photos live ONLY under `web/demos/<slug>/pitch/img/` (the
    Basic-Auth gated path) as the "With your photos" preview the caller shows the
    owner. `scrape-photos.mts <slug>` collects them there; run it at pitch-prep
    time (top leads pre-warmed), not in bulk for the whole pipeline (repo bloat).
  - **On close**: the owner provides or explicitly approves those photos (they own
    the ones they uploaded), and the production site uses them with permission.
    Note the approval in the pitch follow-up.
  - **Public demos** stay sellable through design plus the curated free-license
    sample library at `web/assets/biz-samples/` (manifest + LICENSES.md, CC0 or
    equivalent only) used as AMBIENT imagery with the honest footer line; never
    presented as the business's own food. Operator-provided photos (the business
    handed them over) remain fine on public demos as before.
- **Constraints**: single self-contained `index.html`, no build step, mobile-first,
  fast. Footer credit: "A free preview site built by HAND" linking handprotocol.org.
- **Visit beacon (required)**: add `<script defer src="/assets/demo-visit.js"></script>`
  just before `</body>`. Shared, top-frame-only, no cookies; it records each session view
  to `command.biz_visits` so the Command Center and the portfolio show visits. The quick
  generator (`site-template.ts`) injects it automatically; `/impeccable` demos must include
  it by hand. Do NOT put it on the pitch page (the beacon is demo-only, and its iframe guard
  keeps the pitch's embedded preview from counting).

Invoke `/impeccable` with that brief and have it write
`web/demos/<slug>/index.html`. Review the result; iterate once if needed.

**Verify visually.** The gstack `browse` daemon is often sandbox-blocked here. Drive
Chromium directly instead, then Read the PNG: `chrome-headless-shell --no-sandbox
--headless --screenshot=/tmp/x.png --window-size=1280,3200 file://<abs>/index.html`
(the binary is under `~/.cache/ms-playwright/chromium_headless_shell-*/`). Shoot a
1280 desktop and a ~390 mobile.

**Parked idea, not yet a feature: a map intro.** A Leaflet `flyTo` loading screen
that opens on the metro and zooms to the business pin (keyless CARTO tiles, pin
coords from the Maps URL, skippable + `prefers-reduced-motion` bypass) is a
high-delight, shareable touch. It was prototyped on 969foodtruck and pulled, it
deserves to become a real, reusable component before it ships on any demo. Do not
bolt it onto a one-off.

(If you only need the baseline, call `POST /api/develop/generate-site {slug}`
with the dev server up, or use the Generate site button. It uses the same
reviews-as-content approach with a simpler template.)

## Phase 4 — Pitch page + call script

Generate the gated pitch page. With the dev server up, the simplest path is
`POST /api/develop/generate-pitch {slug}` (or the "Generate pitch page" button on
`/develop/<slug>`). It writes `web/demos/<slug>/pitch/index.html` with:
- the call script (opener, hook, demo walkthrough, offer, objections, close),
  grounded in the reviews and the demo,
- the business facts and a live preview of the demo,
- the follow-up form that POSTs to the `biz-pitch-response` function.

If you build it by hand instead, render with `renderPitchPage` in
`command/src/lib/develop/pitch-template.ts` and generate the script with the
prompt in `prompts.ts` (`buildScriptSystemPrompt` / `buildFallbackScript`). The
HAND grant voice rules do NOT apply to the demo (it is the business's own site);
they DO apply loosely to anything carrying the HAND name. No em dashes anywhere.

**Headless path (no login):** `npx tsx scripts/generate-pitch.mts <slug> [--price=75]`
reads the lead via the service-role client and writes the pitch with the real
`renderPitchPage` + a $75-aware grounded script (Anthropic if `ANTHROPIC_API_KEY` is
set, else a deterministic fallback that already folds in the add-ons). Use
`--out=/tmp/x.html` to preview without clobbering a hand-tuned page. This exists
because a `curl` to the `generate-pitch` API route 404s ("Lead not found"), the
Phase 2 RLS gotcha; the logged-in UI button also works.

**Price**: confirm the offer before generating. Default is a flat **$75** one-time
(claim + publish), a third to the HAND pool, with optional add-ons priced only if they
ask (more pages, the full menu, a custom domain, automatic social posting, SEO, online
ordering). Price lives on the pitch page, never the demo.

## Phase 5 — Deploy and hand off

- **Deploy surgically.** Prod auto-deploys from `main` (`publish = "web"`), but the
  working branch is usually a dirty feature branch ahead of main. Do NOT `git add -A`.
  Stage only `biz/<slug>/` + `web/demos/<slug>/`, commit, then land that commit on
  `main`: if you are cleanly on main, push; if on a dirty feature branch, cherry-pick
  the commit onto `origin/main` through a detached worktree (`git worktree add
  --detach /tmp/hp-main origin/main` → `git -C ... cherry-pick <sha>` → `git -C ...
  push origin HEAD:main` → `worktree remove`). The added files apply with no conflict.
- **Check the pitch-gate env BEFORE handing off.** `netlify env:list | grep DEMOS_PITCH`.
  If `DEMOS_PITCH_PASSWORD` is unset the pitch returns **HTTP 503 "misconfigured"**
  (a clean function response, not a bug, not the lib/ build gotcha). Set with
  `netlify env:set DEMOS_PITCH_PASSWORD handme` (+ `DEMOS_PITCH_USER hand`) and
  redeploy. The gate checks BOTH: the login is **user `hand`, password `handme`**.
- **Verify live** (Netlify publishes in ~10-30s): `curl` the demo (expect 200,
  public), the pitch with no auth (401), and the pitch `-u hand:handme` (200). Spot
  check the served HTML for the photos, intro, and price. Confirm the demo carries
  `/assets/demo-visit.js`. The gated portfolio `/demos/` should 401 with no auth and
  200 with `hand:handme`.
- **Visit table once:** the tracker needs `command.biz_visits` (migration
  `018_biz_visits.sql`, apply via `psql` / `supabase db push` / dashboard). Until it
  exists the beacon just no-ops, nothing breaks. `register-lead.mts` stamps
  `demo_generated_at` ("when built") the first time the demo file exists, so re-run it
  after the demo lands if the build date is blank.
- Hand the pitch URL + login (`hand` / `handme`) to whoever is calling. Their
  follow-up answers land in `command.biz_pitch_responses` and show on
  `/develop/<slug>` under "Call results".
- Move the lead through the kanban as it progresses (`built → contacted →
  interested → closed`).

## Phase 6 — Graduate to production (claim the domain, own the site)

The endgame. A lead closes, the business wants the site for real, and they have
(or buy) a domain. This step lifts the demo OUT of the demo namespace into a
**standalone, owned site on its own Netlify project and custom domain**. The demo
at `/demos/<slug>/` stays up as a portfolio piece; the production site is a clean,
decoupled thing the client owns.

Run it only once the deal is `closed` and the domain is registered. First run:
**Hamburguesas Emilia** (`amburguesas-del-chef` → HamburguesasEmilia.com), 2026-06-10.

**Where production sites live:** new top-level `clients/<slug>/` — OUTSIDE `web/`,
so it is never swept into handprotocol.org's publish. Self-contained static folder,
deployed as its OWN Netlify site. Use a production-appropriate slug that matches the
domain (`clients/hamburguesas-emilia/`), distinct from the lead/demo slug.

### 6a. Promote the demo → a production folder

```
mkdir -p clients/<prod-slug>/img
cp web/demos/<demo-slug>/index.html clients/<prod-slug>/index.html
cp web/demos/<demo-slug>/img/*.webp clients/<prod-slug>/img/
```

Then make the production edits to `clients/<prod-slug>/index.html`:
- **canonical + og:image** → the production domain (`https://<domain>/...`), not handprotocol.org.
- **Footer credit**: the demo's "A free preview site built by HAND" is wrong on a paid,
  owned site. Default per operator call is a discreet maker credit: **"Made by `<a>HAND</a>`"**
  (HAND links to handprotocol.org — a quiet backlink). The alternative is fully white-label
  (remove the HAND mention). Confirm which the deal wants.
- **Remove the `/assets/demo-visit.js` beacon.** It is HAND-pipeline tracking on the
  handprotocol.org origin; the relative path will not resolve off-domain. Production gets
  no beacon (or real privacy-respecting analytics if the client asks). The beacon STAYS on
  the `/demos/` copy.
- Add `robots.txt` (with `Sitemap:` line) and a one-URL `sitemap.xml`, both on the production domain.
- Add a local `netlify.toml` pinning `publish = "."`, no functions/edge. This stops a deploy
  run from inside the monorepo from inheriting the **root** `netlify.toml` (`publish="web"`,
  the HAND site config). Good place for long-cache headers on `/img/*`.

### 6b. Its own Netlify site + deploy

The repo is `netlify link`ed to the `handprotocol` site, so **every client deploy MUST be
`--site`-scoped** and run from inside the client folder. A bare `netlify deploy` from repo
root would publish to the live HAND site.

```
# create (api createSite auto-names the subdomain, so rename after)
netlify api createSite --data '{"name":"<prod-slug>","account_slug":"<slug>"}'
netlify api updateSite --data '{"site_id":"<id>","body":{"name":"<prod-slug>"}}'   # -> <prod-slug>.netlify.app
# deploy from inside the folder (uses the local toml; --site targets the client project)
cd clients/<prod-slug> && netlify deploy --prod --dir . --site <site-id>
```

Account slug: `netlify api listAccountsForUser '{}'` (koH's is `cryptokoh`). "Uploaded N
files" being less than the file count is normal — Netlify dedupes assets by content hash
globally, so webp images already on the HAND CDN are not re-uploaded.

### 6c. Custom domain + Netlify DNS (nameserver delegation)

```
netlify api updateSite --data '{"site_id":"<id>","body":{"custom_domain":"<domain>","domain_aliases":["www.<domain>"]}}'
```

Then create the Netlify-managed DNS zone. **`netlify api createDnsZone` 500s** (CLI passthrough
bug) — hit the REST endpoint directly with the stored CLI token:

```
TOK=$(python3 -c "import json,os;d=json.load(open(os.path.expanduser('~/.config/netlify/config.json')));print(next(u['auth']['token'] for u in d['users'].values() if u.get('auth',{}).get('token')))")
curl -s -X POST https://api.netlify.com/api/v1/dns_zones -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" -d '{"account_slug":"<slug>","name":"<domain>"}'
```

The response's `dns_servers` are the four `dnsN.pXX.nsone.net` nameservers. Creating the zone
auto-adds `NETLIFY` ALIAS records for apex + www pointing at the site (confirm with
`GET /api/v1/dns_zones/<zone>/dns_records`) — Netlify matches them to the site via the
custom_domain even though `zone.site_id` reads null.

**Relay the four nameservers to the operator.** Changing them at the registrar is the one
step a human does (it is their registrar login). For Namecheap: Domain List → Manage →
Nameservers → **Custom DNS** → paste the four → save. Propagation is minutes-to-hours; once
it resolves, Netlify auto-provisions Let's Encrypt SSL for apex + www. (External-DNS
alternative: keep the registrar's nameservers and add an `A @ → 75.2.60.5` + `CNAME www →
<prod-slug>.netlify.app`. Netlify DNS delegation is preferred for a fresh single-purpose domain.)

### 6d. Mark it progressed (in the demos + pipeline)

- `biz/<demo-slug>/lead.md`: `status: closed`, plus the production frontmatter the Sites
  registry reads — `production_url:`, `live_domain:`, `netlify_site_id:`, `dns_zone_id:`,
  `ssl_state:` (and `lat:`/`lng:` if not already backfilled) — and a `## Notes` line
  recording the site/zone/nameserver IDs. Re-run `command/scripts/register-lead.mts
  <demo-slug>` (from `command/`) to push `closed` + the production fields to Supabase: it
  moves the kanban card to **Closed / YIELD** and makes the site appear in the
  **`/develop/sites`** registry (live domain, SSL state, visits). `live_at` is stamped the
  first time `live_domain` appears. (Requires migration `019_biz_develop_scaling.sql`.)
- On the **`/demos/<demo-slug>/` demo**: flip its canonical to the production domain (so the
  portfolio copy doesn't compete in search) and add a slim "✦ Now live — … at `<domain>`"
  banner linking the live site. Keep the beacon ON the demo. Deploy this demo change
  surgically to `main` (same cherry-pick machinery as Phase 5; stage only the demo file).

### 6e. Verify

- `curl` the `<prod-slug>.netlify.app` subdomain immediately: `/` 200, footer "Made by HAND",
  no `demo-visit`, `/img/*` + `/robots.txt` + `/sitemap.xml` all 200.
- After NS propagation: `curl -I https://<domain>/` and `https://www.<domain>/` → 200 over
  valid HTTPS. `dig +short NS <domain>` should show the nsone nameservers.

## Notes
- The scraper ships (`scrape-lead.mts` via `playwright-core` + the Maps review
  endpoint). Still deferred: a paid reviews API (SerpApi/Outscraper) for volume
  reliability, PageSpeed scoring for the "poor website" bucket, and the 33%-to-pool
  Stripe routing (track via the `fiscal` skill until volume justifies automation).
- `playwright-core` is a `command/` devDependency; the cached Chromium / system
  google-chrome is the browser (no bundled download). The scripts run headless here
  and on the OVH bot box.
- Required Netlify env on the public site: `DEMOS_PITCH_PASSWORD=handme`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
