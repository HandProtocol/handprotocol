---
date: 2026-05-19
status: research-only
title: hand-biz-outreach scoping
related: noredFarms/reps (SaleScale spine), funding/grants/_command-center-prd.md
---

# hand-biz-outreach scoping

A sales-outreach pipeline targeting local commercial small businesses, selling
web/SEO/ecommerce services, with 50% of revenue routed into HAND's resource
pool. Built on top of the existing `noredFarms/reps` rep portal (referred to
internally as SaleScale).

## 1. SaleScale current state (Part 1)

### What it is

The codebase at `/home/koh/Documents/noredFarms/reps/` is a Next.js 16 + Supabase
multi-tenant rep portal currently branded "Pure Extracts Rep Portal." It is a
field-sales CRM for independent reps selling kava/kanna products to retail
accounts. The repo does not literally contain the string "SaleScale" anywhere,
so the SaleScale label is a re-brand the founder is applying on top of the same
spine. The architecture is generic enough (tenants, applications, rep_profiles,
accounts, contacts, follow_ups, leads, orders, commissions) that it can be
forked into a separate tenant for HAND or extended in place. Schema is isolated
under a `reps` Postgres schema with RLS.

### Data model (entities, verified from `supabase/migrations/`)

- **tenants** — multi-tenant from day one (`id, name, slug`). Seeds one row,
  `pure-extracts`. A second tenant row could host `hand-biz-outreach`.
- **settings** — versioned JSONB config per tenant per category (commission,
  kpi, bonus, milestone, payment_terms, followup, checkin, contact_quota,
  compliance, alerts).
- **applications** — public pre-interview form for would-be reps.
- **rep_profiles** — approved reps linked to `auth.users`, roles
  `admin | rep | senior_rep | team_lead`, status
  `active | inactive | probation | terminated`.
- **territories** — named regions, array of city strings, optional assignee.
- **accounts** — the retail customers reps sell to. Status
  `prospect | active | inactive | flagged`. Fields include `store_type`,
  contact name/email/phone, address, payment terms, `lifetime_collected`.
- **contacts** — immutable activity log. Methods `in_person | phone | email |
  other`. Interest level `hot | warm | cold | not_interested | could_not_reach`.
  Auto-computed `follow_up_due_at`.
- **follow_ups** — separate table, status `pending | completed | skipped`, with
  a generated `on_time` boolean.
- **leads** — CSV-importable prospect list. Status `unassigned | assigned |
  contacted | converted | disqualified`. Migration 014 added enriched fields
  (`street, website, google_url, total_score, reviews_count, country_code`).
  Migrations 015, 019 added geocoding columns and provenance. Migration 018
  added `lead_saves` (reps bookmark leads). Migration 014 also added a
  lead_applications table (reps claim a lead, admin approves).
- **orders / order_items / commissions / payouts / invoices** — full sales
  back end with commission snapshots and Stripe Connect (migration 024).
- **notifications, audit_log, store_visits, check_ins, announcements,
  rep_feedback, consignment** — the rest of the supporting tables.

### Current features (verified by inspecting routes and actions)

- Public application flow at `/apply`, status check at `/status`, auth at
  `/auth`.
- `(dashboard)` group contains routes: `accounts`, `actions`, `admin`,
  `announcements`, `checkin`, `commissions`, `compliance`, `consignment`,
  `contacts`, `feedback`, `follow-ups`, `leaderboard`, `leads`, `onboarding`,
  `orders`, `resources`, `team`, `visits`.
- `admin` has sub-routes for `accounts, announcements, applications, audit,
  commissions, feedback, leads, orders, reps, settings, territories`.
- Leads import: there is an existing `scripts/import-leads-xlsx.ts` plus
  geocoding scripts using Google and Mapbox.
- The Leads page (`src/app/(dashboard)/leads/page.tsx`) has a paginated list
  with filters by store type and state.
- Follow-up reminders: `follow_ups` table with `due_at`, plus a
  `next-actions.ts` server action that surfaces a typed feed of next-best
  actions per rep (reorder, follow_up, stale_account, new_lead, visit_due,
  quota_gap).
- Notifications layer (migration 003) feeds in-app and push.
- Compliance settings store forbidden phrases and disclaimers.
- Map view: `leaflet` and `leaflet.markercluster` are dependencies, so a map of
  leads/accounts is likely present.

### What is missing for hand-biz-outreach

- **A scraper.** No discovery code exists. Leads arrive via XLSX or manual
  entry. No code touches Google Places, OSM, screenshots, or PageSpeed.
- **A kanban view.** The pipeline today is a flat list filtered by status. The
  lead lifecycle (`unassigned → assigned → contacted → converted |
  disqualified`) is only five states and is rendered as a table. The user wants
  cards with drag-between-columns and per-card notes/follow-up.
- **A website-quality field on leads.** Migration 014 added `website` (string)
  but there is no quality score, no screenshot URL, no "has website / no
  website / poor website" flag.
- **A services-sold pricing model.** Orders today are for physical product
  (tier-priced bottles). A web/SEO/ecommerce sale is a service with retainer
  and one-time fees. The `orders` and `pricing_tiers` shape will need a parallel
  or generalized product type.
- **Revenue-split routing.** No code today knows how to route 50% of collected
  revenue into a "HAND pool." Stripe Connect (migration 024) exists for paying
  reps but not for routing to a pool account.
- **A new tenant.** A `hand-biz-outreach` tenant row and seed settings would
  be needed before anything else.

## 2. Scraping tool survey (Part 2)

### Discovery sources

- **Google Maps Places API.** Pay-as-you-go with SKU tiering (Essentials, Pro,
  Enterprise). Per-month free caps: 10,000 Essentials events, 5,000 Pro, 1,000
  Enterprise (source: developers.google.com pricing page). The `website` field
  is part of Place Details Pro, so each lead probe is one Pro call. Fits inside
  the free tier up to ~5K leads/month if we are careful with field masking.
  Highest data quality, official, no JS rendering. Recommendation: primary
  source.
- **Yelp Places / Fusion API.** Paid subscriptions only, no free tier as of
  2026, and the older free Fusion endpoints are deprecating. Recommendation:
  skip unless we already have a Yelp contract.
- **OpenStreetMap Overpass API.** Free, no key, query by amenity + bbox + `[!website]` to find businesses *without* a website tag. Coverage is patchy for
  small US businesses, so it should be a supplemental source, not primary.
  Recommendation: use for the "no website at all" bucket as a free seed list,
  cross-checked against Google.
- **Outscraper.** Commercial wrapper around Google Maps. Around $3 per 1,000
  basic listings after a free tier of 500 results, dropping to ~$1 per 1,000
  above 100K. Full profile with email/reviews is ~$14 per 1,000. No code to
  maintain. Recommendation: good for batched seed dumps by city.
- **Apify Google Maps Scraper.** ~$4 per 1,000 base results, $6 with email
  enrichment, and a few community actors at ~$2.50 per 1,000. Apify also has
  an OpenStreetMap POI scraper actor with no API key. Recommendation: viable
  alternative to Outscraper, slightly cheaper at the low end.
- **Apollo / Clay / Hunter.** These are enrichment platforms, not directory
  scrapers. Apollo's free tier is 10K emails/month; Hunter starts ~$49/mo;
  Clay starts at $149/mo (waterfall enrichment across providers).
  Recommendation: not needed for v1, since our target businesses often have
  no website and decision-maker email lookup is a later concern. Hunter as a
  pay-per-credit fallback once we have a domain.
- **Texas-specific.** The Texas Comptroller publishes a Taxable Entity Search
  and bulk Sales Tax Permit data; Austin Chamber publishes a member directory.
  These are useful for ground truth on "business exists, here is the legal
  name" but rarely include a website field. Recommendation: phase 2.

### Website-presence detection (does the lead have a website?)

- Google Places returns `website` as a nullable field. Null = top-priority
  candidate (rule a).
- Fallback if the directory source has no website field: a Google search via
  SerpAPI or DuckDuckGo HTML scrape with the business name + city, then a
  simple "did we land on a domain that looks like theirs" heuristic. SerpAPI
  costs ~$75/mo for 5K searches; the free DuckDuckGo route is rate-limited and
  brittle. Recommendation: rely on Google Places `website` for v1, skip the
  fallback.

## 3. Website-quality assessment options

For leads that DO have a website (rule b: poor/dated), we need a score.

- **Google PageSpeed Insights API.** Free, no card required, API key optional.
  Returns full Lighthouse JSON (performance, accessibility, best-practices,
  SEO scores 0-100), as of Oct 2025 running Lighthouse 13. Official rate
  limits are not published on the get-started page; historical community
  threads mention 25K/day with a key. Recommendation: primary scoring tool.
  Composite "this site is dated" score = (perf < 50) + (mobile not friendly)
  + (no HTTPS) + (SEO < 60) + (a11y < 60).
- **Lighthouse CI / self-hosted Lighthouse.** Same engine, run locally. No
  external rate limit but uses our compute. Recommendation: skip until we hit
  PageSpeed rate ceilings.
- **HTTP-only checks.** Cheap heuristics from a single fetch: SSL cert valid?
  Has a `<meta viewport>` tag? `Last-Modified` header? Page weight? Presence
  of jQuery 1.x or Bootstrap 2.x in markup? Domain WHOIS age via the free
  RDAP endpoint at rdap.verisign.com? Wayback Machine `availability` API for
  "when was this last archived." Recommendation: pair with PageSpeed for a
  layered "dated" score.

## 4. Screenshot service comparison

- **ScreenshotOne.** Starts at $17/mo for 2K screenshots, ~$79/mo for 10K.
  Caches duplicate URLs free. Strong cookie-banner handling
  (claimed ~95% block success). Recommendation: best price/quality for v1.
- **Urlbox.** Starts at $19/mo for 2K renders, $99/mo for 10K. Stealth and
  proxy features, more expensive at scale. Recommendation: only if we hit
  anti-bot blocks on ScreenshotOne.
- **hcti.io (htmlcsstoimage).** Strong for rendering HTML-to-image but less
  competitive on URL-to-screenshot pricing. Recommendation: skip for this use.
- **Self-hosted Playwright on a Netlify Function or Fly machine.** Free per
  screenshot but Netlify Functions have a 10s default timeout and cold-start
  issues with Chromium, and Fly costs ~$5/mo for a small always-on machine
  plus storage for the images (Supabase storage works). Recommendation:
  fallback option if commercial costs sting at scale; not v1.
- **Apify scraper actor.** Some Google Maps actors return screenshots, but
  per-screenshot cost via Apify is generally higher than the dedicated
  services. Recommendation: skip.

## 5. Recommended hand-biz-outreach v1 architecture

Fork the `reps` codebase into a new tenant row inside the same Supabase
project (cheapest path) or stand up a sibling Next.js app that shares the
same `reps` schema (cleaner separation, slightly more deploy work). Drive the
scraper from a Netlify scheduled function: nightly Overpass + weekly Places
sweep by Austin-area city, write candidates into `reps.leads` with a new
`website_status` column (`none | poor | ok`) and a `screenshot_url`. Score
sites with PageSpeed Insights on insert. Render the existing
`/leads` list as a kanban grouped by lead status (re-using the five existing
status values, possibly adding `qualified` and `proposal_sent` between
`contacted` and `converted`). Each card shows the screenshot, the score, the
contact info, and an inline "log contact" action that writes a `reps.contacts`
row exactly as today. The kanban is a thin presentation layer on top of the
existing data model; we are not redesigning the spine.

### Build phases

1. **Tenant + schema deltas.** Add `hand-biz-outreach` tenant, add columns to
   `reps.leads`: `website_status`, `pagespeed_perf`, `pagespeed_seo`,
   `pagespeed_a11y`, `screenshot_url`, `screenshot_taken_at`, `domain_age_years`,
   `last_archived_at`, `quality_score`. Add two new lead status values
   (`qualified`, `proposal_sent`) via a CHECK constraint update.
2. **Scraper worker.** Netlify scheduled function (or a small Fly machine if
   we outgrow Netlify's runtime). Pulls from Google Places (primary) and OSM
   Overpass (no-website seed). Dedupes by `google_place_id` and
   `(name, city, state)`. Writes to `reps.leads`.
3. **Quality enrichment.** For leads with a website, call PageSpeed Insights
   and ScreenshotOne. Cache by domain for 30 days. Compute composite
   `quality_score` and set `website_status`.
4. **Kanban UI.** New route `/(dashboard)/pipeline` showing columns
   `unassigned → assigned → contacted → qualified → proposal_sent → converted
   | disqualified`. Drag-to-move calls a server action that updates status and
   writes a `reps.contacts` row when entering a column that implies outreach.
5. **Services product type.** Add a new `reps.products.line` value (`service`)
   or split into a separate `reps.service_offerings` table with retainer +
   one-time pricing. Make `orders` accept either.
6. **HAND pool routing.** New `reps.revenue_splits` table referencing an
   order, with destination = `hand_pool` and percentage = 0.5. On payout
   (collected), create two payout rows: rep commission and HAND pool transfer.
   Plug into existing Stripe Connect from migration 024.

## 6. Open questions for the founder

1. Same tenant or separate tenant? Pure Extracts and HAND share the `reps`
   schema cleanly if separated by `tenant_id`, but the products catalog,
   commission rules, and compliance phrases are very different. Recommend
   separate tenant, same schema, same Supabase project; revisit if it gets
   awkward.
2. Geographic scope for v1: Austin metro only, all of Travis County, or all
   of Texas? Scope determines the scraper budget and dedup strategy. The
   Google Places free tier (5K Pro events/mo) covers ~5K Austin candidates
   easily but would need pagination for the full state.
3. Service offerings to list: is this one tier (build + monthly retainer),
   three tiers (starter/standard/premium), or fully bespoke per lead? This
   shapes whether we adapt `reps.products` or add a separate `service_offerings`
   table.
4. Who closes the sale: HAND directly, or contracted reps using the same
   commission flow as Pure Extracts? If the latter, the existing commission
   tables work; if direct, the orders flow simplifies but we still need
   `revenue_splits` for the 50% pool transfer.
5. Is the 50% HAND split tracked as a Stripe transfer (visible on the customer
   invoice or split silently at our end), or as an internal accounting entry
   we record but settle in bulk? The former is donor-transparent and
   501(c)(3)-friendly; the latter is simpler operationally.

Sources:

- [Google Maps Platform core services pricing list](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Places API Usage and Billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Outscraper pricing](https://outscraper.com/pricing/)
- [Apify pricing](https://apify.com/pricing)
- [Apify Google Maps Scraper $2.5 per 1K](https://apify.com/solidcode/google-maps-scraper-2-5-per-1-000-results)
- [Apify OpenStreetMap POI Scraper](https://apify.com/logiover/openstreetmap-business-poi-scraper)
- [PageSpeed Insights API get started](https://developers.google.com/speed/docs/insights/v5/get-started)
- [PageSpeed Insights release notes](https://developers.google.com/speed/docs/insights/release_notes)
- [Overpass API by Example](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example)
- [ScreenshotOne and screenshot API comparison 2026](https://medium.com/@TheTechDude/screenshot-api-pricing-compared-what-you-actually-pay-per-screenshot-in-2026-18f38320251f)
- [Hunter.io pricing 2026](https://marketbetter.ai/blog/hunter-io-pricing-breakdown-2026/)
- [Apollo.io pricing 2026](https://www.enrich.so/blog/apollo-pricing-breakdown)
- [Clay vs Apollo pricing 2026](https://salesmotion.io/clay-vs-apollo)
- [Yelp Fusion changelog](https://docs.developer.yelp.com/changelog)
