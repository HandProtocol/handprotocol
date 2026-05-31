---
date: 2026-05-30
status: plan-pending-build
title: hand-biz-outreach v1 plan (reviews-as-content)
supersedes_scope: refines funding/grants/_hand-biz-outreach-scoping.md for v1
related: command/PRODUCT.md, funding/grants/_command-center-prd.md
decisions:
  home: Command Center, new "Develop" pillar surface
  demo_hosting: Netlify subdomain per business (subdomain.handprotocol.org or demos.handprotocol.org/<slug>)
  v1_mode: manual qualification, reviews-as-content (no scraper in v1)
  revenue_split: 33% minimum to HAND pool, deferred past v1
---

# hand-biz-outreach v1 plan

## Why this exists

Generate unrestricted revenue for the HAND pool by building free demo websites
for local businesses that have no web presence but a proven base of happy
customers (strong Google reviews). The pitch writes itself: "Your customers
already love you on Google. Here is the website that finally matches. We built
it already." 33% minimum of every closed deal routes to the HAND resource pool.

## The cost lever (the founder's reviews-as-content insight)

The scoped pipeline's expensive parts were (1) paid Places API review
enrichment and (2) AI generation inventing plausible site content. v1 collapses
both:

- Discovery finds businesses with **no website** (free OSM Overpass seed, or a
  cheap Places `website = null` probe).
- The operator **manually reads the Google reviews** while qualifying the lead,
  pasting the best ones into an intake form. Zero review-API cost, and the
  operator is eyeballing fit anyway.
- The real reviews become the **content seed**. The assistant *arranges and
  grounds* real customer language (services mentioned, tone, named staff,
  signature dishes) instead of *inventing* copy. Cheaper, faster, and far more
  convincing on the call because it is literally their customers' words.

Net: v1 needs almost no paid API. The only hard cost is the screenshot/preview
and the eventual live Netlify deploy.

## Target list (who to reach out to)

The sweet spot is **proven demand, zero web presence.**

| Filter | v1 value | Why |
|---|---|---|
| Website | none | the entire pitch |
| Google rating | >= 4.2 | proves a real, satisfied customer base |
| Review count | >= 15 | enough real content to seed a site |
| Phone + physical address | present | reachable and legitimate |
| Geography | Austin metro | tight enough to manage by hand |

Best categories (high "no website" rate, visual businesses that sell well with
a site, review-dependent already):

- **Trades / home services** — HVAC, plumbing, landscaping, fencing, roofing,
  pool service, junk hauling, pressure washing, mobile mechanics
- **Food** — taco trucks, BBQ, panaderias, food trailers, small restaurants,
  bakeries
- **Personal services** — barbers, salons, nail, massage, auto detailing

Anti-targets for v1: franchises (corporate sites already), anything regulated
heavily (we are not doing medical/legal), businesses with < 4.0 or < 10 reviews
(thin content, harder sell).

## The operator loop (the process)

1. **Pick an area + category** (e.g. "South Austin landscapers").
2. **Pull a no-website seed list** — v1 manual: search Google Maps, note the
   ones with no website link. (Optional cheap automation later: OSM Overpass
   `[!website]` query or a Places `website`-masked call.)
3. **Qualify + capture.** For each promising lead, the operator opens an
   intake form in the Command Center and pastes: business name, category,
   phone, address, Google rating, review count, and 3 to 6 of the best
   reviews (verbatim). Optionally a couple of photos.
4. **Generate.** One click runs the assistant against the reviews to produce
   a one-page site: hero, services (extracted from reviews), testimonials
   (the reviews themselves), contact block, map. Voice-checked by the existing
   linter.
5. **Preview + screenshot.** The generated static site renders to a Netlify
   subdomain; the operator screenshots it for the cold outreach.
6. **Reach out.** Card moves through the kanban: `prospect -> built ->
   contacted -> interested -> closed | passed`. Each move logs a touchpoint
   (reuse the Command Center activity-log pattern).
7. **Close.** On yes, point the real domain (or keep the subdomain), invoice,
   and route 33% minimum to the HAND pool (deferred mechanism, see below).

## Build (Command Center "Develop" pillar)

Reuse what already exists: AI router, kanban component, Supabase, design
system, activity log, voice linter.

### New surfaces
- `/(dashboard)/develop` — kanban of biz-dev leads (mirrors the grants kanban).
- `/(dashboard)/develop/[slug]` — lead detail: intake form, pasted reviews,
  generated-site preview iframe, deploy button, touchpoint timeline.
- `/(dashboard)/develop/new` — capture a new lead.

### New API routes
- `/api/develop/generate-site` — assistant turns reviews -> static one-pager
  (Pretext-native HTML, reusing the `design-html` patterns; text reflows, no
  build step).
- `/api/develop/deploy` — push the generated folder to a Netlify subdomain.

### Data model (new Supabase migration)
- `biz_leads` — `id, slug, name, category, city, phone, address,
  google_rating, reviews_count, google_url, website_status (none|poor|ok),
  status (prospect|built|contacted|interested|closed|passed),
  demo_url, demo_deployed_at, created_at, updated_at`.
- `biz_reviews` — `id, lead_id, author, rating, text, posted_at` (the pasted
  source content).
- `biz_touchpoints` — `id, lead_id, method, note, occurred_at` (reuse the
  Command Center touchpoint shape).
- Site copy and the markdown source live in git per the "markdown is canonical"
  principle: `biz/<slug>/site.md` + generated `biz/<slug>/index.html`.

### Demo hosting
Netlify subdomain per business. Either a wildcard subdomain
(`<slug>.handprotocol.org`) or a path on a demos site
(`demos.handprotocol.org/<slug>`). Generated static folder deploys via the
Netlify API; live URL is shown on the card and used on the sales call. Keep the
subdomain after close, or repoint their real domain.

## Cost model (rough, Austin metro v1)

- Discovery: $0 (manual Maps browse) to ~free (OSM Overpass).
- Reviews: $0 (operator pastes them).
- Site generation: a few cents of assistant tokens per site (grounded, short).
- Screenshot/preview: $0 (the live Netlify URL is the preview).
- Hosting: within Netlify's existing plan for low volume.

So v1 is effectively free to run; cost scales only when volume justifies adding
the scraper + PageSpeed + screenshot services from the original scoping doc.

## Deferred (not in v1)
- Automated scraper worker (Places + Overpass sweep).
- PageSpeed website-quality scoring for the "poor website" bucket.
- 33% pool revenue routing via Stripe (use the `fiscal` skill + manual
  accounting entry until volume justifies Stripe Connect).
- Rep team / commissions (the reps spine handles this if we ever need a sales
  team).

## Open questions for the founder
1. Subdomain style: `<slug>.handprotocol.org` (wildcard DNS) or
   `demos.handprotocol.org/<slug>` (single site, simpler)?
2. Outreach channel: call, walk-in, or email? Determines what the card's
   "contact" action captures.
3. Pricing to name on the call: one build + monthly retainer, or tiered? Shapes
   the eventual invoice/split.
4. Do we disclose HAND's 501(c)(3) angle in the pitch (mission-driven, a third
   of this funds the pool) or lead purely commercial and reveal later?
