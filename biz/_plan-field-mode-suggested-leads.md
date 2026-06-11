# Plan — Field Mode: location-aware suggested leads on /demos/

*Drafted 2026-06-10, alongside the Austin-wide food-truck sweep.*

## The one-sentence idea

A rep opens the gated portfolio at `handprotocol.org/demos/` on their phone, taps
**"Near me"**, and gets a ranked walk-up list of leads — nearest first, weighted by
what has actually sold — each with directions, click-to-call, the demo QR to hand
the owner, and one-tap outcome logging.

## Why this is the right system (the constraint analysis)

The pipeline now builds a demo in about a minute, fully automated. Demos are no
longer scarce; **rep-hours are**. After the East Austin batch there are 40+ leads
at `built` and one human calling them. The best system is therefore the one that
maximizes *closes per rep-hour*, and for food trucks that means:

1. **In-person beats phone.** Owners are on the truck, often cash-first, often
   Spanish-speaking. A walk-up where you hand them a phone showing *their own
   site* is the strongest pitch we have.
2. **Geography is the route to volume.** Trucks cluster (E 7th, E Riverside,
   trailer parks). A geographic rank turns a list of 100 leads into a 90-minute
   walking route of 8.
3. **Social proof compounds locally.** "We built Hamburguesas Emilia's site —
   it's live at hamburguesasemilia.com, they're 10 minutes away" closes harder
   than any feature list. Every close becomes a proof-pin that raises the score
   of every lead near it. The strategy that falls out: **dominate corridors,
   not the metro** — density of live clients in one neighborhood beats spread.

## Ranking model (v1: explainable, client-side)

`score = proximity × warmth`, where:

| Signal | Function | Why |
|---|---|---|
| Proximity | `exp(-km/2)` decay from shared location | walking-route radius |
| Sold-similarity | boost if category matches a closed deal; extra boost if within 3km of a live client (proof-pin) | "what has been sold" — n=1 today (Mexican burger truck), treated as a prior that sharpens with each close |
| Review strength | `rating × log10(reviews)` | a 4.7★/2,712 lead is worth a detour |
| Demo engagement | visits on the demo since built (beacon data) | organic visits = the owner has seen it or is sharing it; warmest signal we have |
| Status freshness | `built` never-contacted first; `interested` pinned; `contacted` decays back in after ~2 weeks; `closed`/`passed` excluded | don't re-knock yesterday's door |

Weights start hand-set and visible in the UI (sliders behind a debug toggle).
Re-fit manually from outcome logs until there are ≥10 closes; only then is
anything fancier than a weighted sum honest.

## UX (mobile-first, inside the existing gate)

- **"Near me" button** on `/demos/` (already Basic-Auth gated, operator-only).
  Browser geolocation; the coordinate **never leaves the device** — ranking is
  computed client-side against `portfolio.json`. No new privacy surface.
- **List view**: top 10 with distance, category, rating/reviews, visit count,
  status chip. Per-card: **Directions** (Maps dir link), **Call** (tel:),
  **Demo QR** (full-screen QR of the demo URL — the walk-up move), **Pitch**
  (the gated script page).
- **Map view**: MapLibre (same stack as the command center's develop map) with
  lead pins + gold proof-pins for live clients.
- **Outcome logging**: two taps — "pitched in person" + result
  (interested / follow up / passed) — POSTs to the existing
  `biz-pitch-response` function with a `channel: in_person` field, lands on
  `/develop/<slug>` like call results do.
- **Route hint**: greedy nearest-neighbor chain through the top 8 within 2km
  ("your next 90 minutes"). No fancy TSP; a hint, not a navigator.

## Data plumbing

v0 needs only **portfolio.json to say more**: add `lat`, `lng`, `category`,
`status`, `phone`, `visits`, `live_domain` (proof-pins) per lead. The lead rows
already carry geo + production columns (migration 019); visits aggregate from
`command.biz_visits`. Detailed current-state spec: see Appendix A.

Pins for new leads come from the scrape's `!3d!4d` URL params; run
`backfill-geo.mts` after bulk batches so nothing ships pin-less.

## v2 — the prospect layer (close the discovery loop)

Discovery now produces a checked-places registry (every place swept, its
website status, why it was rejected). Persist it (`biz/_registry/` now, a
`biz_discovery` table when volume justifies). Then field mode can also show
**unbuilt candidates** near you — "qualifying truck on this corner, no demo
yet" — with a **Build now** tap that fires `build-lead.mts` remotely (the hand
CLI / OVH bot already runs this stack). Rep walks up 3 minutes later with a
live demo. That is the full loop: *discover → build → pitch → close → proof-pin
→ better discovery*, all from a phone on the street.

## Conversion levers the system should carry (flagged, not yet built)

- **Spanish pitch variant.** A large share of qualified trucks are
  Spanish-speaking businesses; an `es` script + demo toggle is probably the
  single biggest conversion lever in the queue.
- **Visit-spike alert.** The Telegram demo-views poll already posts visits; a
  spike on an uncontacted lead should bump it to the top of field mode.
- **Premium-upgrade trigger.** Only hand-upgrade (impeccable) demos for leads
  showing engagement (visits > threshold or status ≥ interested) — taste over
  spray.
- **Leave-behind QR card** print sheet generated per lead from the same data.

## Guardrails

- **Phones stay human-confirmed** before any walk-up relies on tel: (Maps-card
  sourced numbers are good but unverified — the one harmful failure mode).
- **Takedown courtesy**: demos are unsolicited; if an owner objects, the demo
  comes down same-day and the lead goes `passed`. Note it on the pitch script.
- **Tax gates before first invoice** (UBIT + TX sales tax memos in the hand-tax
  skill) — field mode should not outrun the paperwork; the close flow links the
  two gate checklists.
- **Telegram digest mode** for bulk builds (100 posts in the Develop topic is
  noise, not signal — batch them; HandAI-side change, noted for the nerve repo).
- **Name-fragility lint** before deploy (scraper occasionally mislabels names /
  carries stray glyphs); the bulk path now greps for known failure patterns.

## Build order

| Phase | Scope | Effort |
|---|---|---|
| v0 | portfolio.json + client-side rank + list UI + geolocate | a day |
| v1 | MapLibre map, outcome logging (in_person channel), route hint | 1–2 days |
| v2 | prospect layer + remote Build-now | 2–3 days, needs bot wiring |
| v3 | learned weights | only after ≥10 closes |

## Appendix A — current-state integration spec

*(code survey, 2026-06-10)*

**portfolio.json today** (`netlify/functions/biz-portfolio.js`): per lead —
slug, name, category, city, state, google_rating, reviews_count, status,
demo_url, pitch_url, built_at, **visits**, **last_visit**. Visits are already
aggregated from `command.biz_visits` in the function. Gated via the
`demos-portfolio-auth` edge function (Basic Auth `hand`/`handme`), served
`Cache-Control: no-store`, reads Supabase with the service-role key +
`Accept-Profile: command`.

**Columns already in `command.biz_leads`** (migrations 016 + 019): `lat`/`lng`
(numeric, geo index), `phone`, `category`, `status`, `campaign_id`, `tags`,
`live_domain` / `production_url` / `live_at` (graduated sites), rating/review
counts. `command.biz_visits` stores one row per session with `lead_slug`,
`kind` (demo|pitch), coarse visitor geo, `created_at`.

**v0 gaps** (small): portfolio.json doesn't select `lat`, `lng`, `phone`,
`live_domain`. `biz_pitch_responses` has outcome/interest enums but no
in-person channel field (needs a tiny migration or reuse of `outcome`).

**Gotchas**:
- `scrape-lead.mts` does NOT auto-write lat/lng — bulk batches must run
  `backfill-geo.mts` + re-register, or (better) the scraper learns to extract
  the `!3d!4d` pin at capture time (queued change).
- Visitor geo on `biz_visits` is ISP-coarse — never confuse with business pins.
- Graduated leads (`live_domain` set) leave the demo portfolio; field mode
  wants them back as proof-pins, so the function must include them explicitly.
- Ranking must stay client-side anyway (location privacy), so the no-store
  static-shape portfolio.json is the right transport: no per-coordinate
  server queries, no cache-poisoning concern.
