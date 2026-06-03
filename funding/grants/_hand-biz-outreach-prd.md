---
date_created: 2026-05-21
date_revised: 2026-05-25
version: 0.3
status: draft
owner: Russell Herod (koH)
title: HAND Biz Outreach
subtitle: A small-business services arm that funds the HAND pool
parent_framework: handprotocol/salescale (forked from noredFarms/reps)
contributing_research:
  - funding/grants/_hand-biz-outreach-scoping.md (2026-05-19)
  - funding/grants/_infra-inventory.md (2026-05-19)
  - funding/grants/_command-center-prd.md (sibling PRD)
canonical_context:
  - ~/.claude/skills/grants/references/hand-context.md
voice_compliance: no em dashes, no AI tells, no specific model names in operator-facing copy, full HAND mission terms, dollar amounts with commas
---

# HAND Biz Outreach

A revenue-generating arm of HAND Protocol that sells web, SEO, and ecommerce services to local small businesses, with 33% minimum of every collected dollar routing to the HAND resource pool to fund local impact entrepreneurs. Workers fulfilling a build may contribute their own share back to the pool to draw other pool resources (design, mentorship, agent compute, fiscal services).

Forked from SaleScale (the canonical white-label CRM template at `handprotocol/salescale/`, itself extracted from `noredFarms/reps/`). Lives at `handprotocol/biz-outreach/` as a sibling Next.js app to the grants command center.

This is v0.1 of the PRD. It builds on the scoping doc at `funding/grants/_hand-biz-outreach-scoping.md` and answers the questions that have been settled, while surfacing the ones that remain open for founder direction.

---

## 1. The five-stage lifecycle

The framework is a literal sales lifecycle, named so each stage maps cleanly to a kanban column.

| Stage | Pillar | What it covers |
|---|---|---|
| **Discover** | Lead generation | Scrape Google Places and OSM for candidate small businesses in target geography. Two qualifying rules: no website at all, or website present but visibly dated. |
| **Qualify** | Pre-outreach scoring | PageSpeed Insights composite score, screenshot capture, manual review of the visual. Reps cherry-pick the highest-fit leads. |
| **Reach** | Outreach itself | Cold email, follow-up cadence, contact logging, response handling. The bulk of the operator's daily work. |
| **Convert** | Proposal and close | Service tier selection, scope confirmation, deposit, contract. Status flips to Won or Lost with a reason code. |
| **Reciprocate** | Delivery plus pool routing | Service fulfillment by HAND or contracted designers, monthly settlement of the 33% minimum pool split, retrospective on what won. |

The dashboard navigation reads `Discover · Qualify · Reach · Convert · Reciprocate`. Each links to the section that holds the matching features.

---

## 2. The wedge

Every grant we apply for is one-shot revenue. Every grant takes the same effort to write whether the funder gives us $5,000 or $50,000. The biz-outreach arm flips that math: every closed sale becomes recurring revenue (web hosting, SEO retainer, e-commerce maintenance) where each new month is incrementally cheap. Half of every dollar funds HAND directly. The other half pays the operator and the contractors who actually do the work.

Three downstream consequences of that wedge:

1. **HAND becomes a service business with a charitable arm,** not a charity that begs for grants. This is a defensible posture for any funder asking how we sustain ourselves between awards.
2. **The lead pipeline becomes the surface that future Reciprocates (impact entrepreneurs) get pulled in through.** A small business we close becomes a candidate to refer to a Reciprocate group later, or to host a Mystic Hearts event in their space, or to support a grassroots fundraiser. The CRM doubles as a relationship graph for the broader HAND network.
3. **Reps can be HAND beneficiaries themselves.** A Reciprocate joining HAND can become a rep at the same time, drawing commission income from the work they do for HAND. This is a literal example of the resource-pool model: a Reciprocate received support, then provides skill back, then collects revenue.

---

## 3. Audience

### Internal audience (v1)
- koH (founder, initial sole rep and admin)
- Future part-time or contract reps as the pipeline scales
- HAND Foundation treasurer or fiscal sponsor liaison reviewing monthly pool settlements

### External audience (v1)
- Small business owners in Austin metro: restaurants, healers, small retailers, service providers, makers
- Typical decision-maker: owner-operator, between 25 and 65, comfortable on a phone, varies on tech literacy
- Typical website state: WordPress or Wix from 2018, never updated, or no website at all and reachable only via Instagram/Facebook

### Future audience (v2 plus)
- Reciprocate groups across multiple cities (Mesquitos rolls out next per the Mystic Hearts framing doc)
- Contract designers and developers fulfilling won work
- Grant funders reviewing the social enterprise side of HAND's program

---

## 4. Non-goals

- Replacing a full agency tool stack (Basecamp, Linear, Notion for project management). Biz-outreach is the front of the funnel; fulfillment lives elsewhere.
- Replacing the donor CRM. Donors and small business customers are different relationships.
- Becoming the proposal authoring tool. Proposals are PDFs or simple web pages, not built inside this app.
- E-commerce platform building. We sell ecommerce services. We do not build a Shopify alternative.
- Lead enrichment beyond what Google Places returns. No Hunter, no Apollo waterfall in v1.
- A native mobile app. Responsive web is the answer.
- AI-generated outreach emails. The trust dynamic with small business owners hinges on the email feeling human. Templates are fine; mass-generated AI copy is not.

---

## 5. Architecture

### 5.1 Stack

Inherited from SaleScale (`handprotocol/salescale/`):

- Next.js 16 App Router, React 19, TypeScript 5
- Tailwind 4 with the salescale.config.ts brand layer extended for HAND biz-outreach
- shadcn/ui primitives
- Supabase SSR (separate Supabase project from the grants command center; data sovereignty per `governance/policies/data-sovereignty-and-ai.md`)
- Server Actions for all mutations
- Netlify Functions for the scraper schedule and for outbound email
- Stripe Connect (already in SaleScale via migration 024), used in v2 once split-routing is automated

### 5.2 Source-of-truth pattern

Unlike the grants command center, biz-outreach is Supabase-first. There is no markdown-native version of "leads scraped from Google Places." The database is the canonical record.

Two exceptions:

1. **Outreach email templates** live in `handprotocol/biz-outreach/templates/*.md` for version control. Editable in the app, but the canonical version is git-tracked.
2. **Monthly pool settlement reports** are exported as markdown to `handprotocol/biz-outreach/settlements/YYYY-MM.md` for transparent finance history. Sent to the foundation treasurer and archived publicly later.

### 5.3 Tenant and schema

A new Supabase project, separately provisioned. Schema name: `biz_outreach` (not `reps`, not `salescale`, since this is a downstream fork with its own life).

The schema extends what SaleScale provides:

```sql
-- Leads, extended for website-quality
alter table biz_outreach.leads
  add column website_status text check (website_status in ('none','poor','ok','unknown')) default 'unknown',
  add column pagespeed_perf int check (pagespeed_perf between 0 and 100),
  add column pagespeed_seo int check (pagespeed_seo between 0 and 100),
  add column pagespeed_a11y int check (pagespeed_a11y between 0 and 100),
  add column screenshot_url text,
  add column screenshot_taken_at timestamptz,
  add column domain_age_years numeric(4,1),
  add column last_archived_at date,
  add column quality_score int check (quality_score between 0 and 100),
  add column qualification_notes text;

-- Two new lead status values
alter table biz_outreach.leads
  drop constraint leads_status_check,
  add constraint leads_status_check check (status in (
    'unassigned','assigned','contacted','qualified','proposal_sent','converted','disqualified'
  ));

-- Service offerings (replaces or parallels physical product pricing)
create table biz_outreach.service_offerings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tier text not null check (tier in ('starter','standard','premium','custom')),
  description text,
  one_time_price numeric,
  monthly_retainer numeric,
  scope_summary text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Outreach email templates (mirrored to git markdown)
create table biz_outreach.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  subject text not null,
  body_markdown text not null,
  category text check (category in ('cold','followup','proposal','closed','nurture')),
  variables text[],  -- ['lead.name', 'lead.business_name', 'rep.name']
  version int default 1,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Revenue splits (manual ledger for v1; Stripe Connect automation for v2)
create table biz_outreach.revenue_splits (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references biz_outreach.orders(id) on delete cascade,
  collected_amount numeric not null,
  collected_at date not null,
  hand_pool_share numeric not null,  -- 33% of collected_amount, floor; workers may opt to contribute more from their share
  rep_share numeric,
  ops_share numeric,
  settlement_status text default 'pending' check (settlement_status in ('pending','settled','disputed')),
  settled_on date,
  settlement_reference text,  -- bank transfer reference once transferred
  notes text,
  created_at timestamptz default now()
);

-- Monthly pool settlements
create table biz_outreach.pool_settlements (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  total_collected numeric not null,
  hand_pool_total numeric not null,
  settlement_count int not null,
  report_markdown text,  -- snapshot of the markdown report
  exported_to_path text,  -- 'settlements/YYYY-MM.md'
  settled_on date,
  settled_by uuid references auth.users(id),
  created_at timestamptz default now()
);
```

Indexes added for `leads.website_status`, `leads.status`, `revenue_splits.settlement_status`, `pool_settlements.period_start`.

### 5.4 Scraper pipeline

A two-track ingestion strategy:

1. **Weekly Google Places sweep.** Netlify scheduled function runs every Monday at 6am Central. Iterates target cities (Austin, then Travis County, then optionally surrounding metro). For each city, queries Places by type (restaurant, retail, services, healers) within the city bbox. Field mask limited to Pro tier fields (`name`, `formattedAddress`, `websiteUri`, `phoneNumbers`, `googleMapsUri`, `id`). Dedupe by `google_place_id`. Insert new leads with `website_status` set based on whether `websiteUri` is null (=`none`) or present (=`unknown`, to be scored later).

2. **Nightly Overpass top-up.** A separate Netlify scheduled function queries OpenStreetMap Overpass for businesses missing the `website` tag in target bbox. Cross-checks against Google Places by name and address. Inserts new candidates as `website_status: none` (high confidence, since two sources agree on no website).

3. **Quality enrichment worker.** A third scheduled function picks up leads where `website_status = unknown` and `website_uri is not null`. Calls PageSpeed Insights, captures composite quality_score, captures ScreenshotOne for the card art. Updates `website_status` to `poor` if score under 50, `ok` if 50 or higher. Caches results by domain for 30 days.

All three workers respect a daily quota (10K Places events, 25K PageSpeed calls, 2K screenshots per month on the basic tier). The dashboard surfaces current quota usage in the Settings panel.

### 5.5 Auth and roles

Inherited from SaleScale. Roles for biz-outreach:

- `admin`, full access (koH initially)
- `rep`, can see assigned leads, log outreach, send templated emails, mark converted
- `senior_rep`, can self-assign new leads and approve proposals
- `viewer`, read-only access to the kanban and converted-deals report (for the foundation treasurer)

Invite codes from SaleScale's `invites` table. Onboarding for a new rep: admin generates code, rep applies via the public `/apply` flow inherited from SaleScale, admin approves.

### 5.6 Notifications

Same channel adapters as the grants command center (Resend for email, optional Slack and Discord webhooks). Notification kinds delivered:

- `new_lead_assigned` when a rep is assigned a lead
- `lead_response_received` when a contacted lead replies (manually triggered by the rep when logging the response)
- `proposal_sent_followup_due` when a proposal has been out for 5+ days
- `settlement_ready` to admin and treasurer at the end of each month
- `quota_warning` when scraper budget hits 80% of the monthly cap

### 5.7 Deployment

V1: localhost only. `pnpm dev` on port 3002 (3000 is grants command center, 3001 is SaleScale template demo).

V2: deploy as a separate Netlify site at `biz.handprotocol.org`. Gated by Supabase Auth. Stripe Connect onboarding for reps in V2 once split-routing is automated.

### 5.8 Audit and finance reporting

The 33% minimum pool split is the heart of the system's credibility with both customers and grant funders.

Audit surfaces:

1. **Git history** of the `settlements/YYYY-MM.md` exports. Every settlement is a markdown file in the public repo, signed by koH and the treasurer.
2. **`revenue_splits` table** with immutable `created_at` and `collected_at`. Edits flagged in an audit log.
3. **Stripe receipts** (V2) once Connect routing is automated. The customer's invoice shows the split visibly.

Reporting:

- **Monthly settlement report**, auto-generated on the first of each month. Markdown export to `settlements/YYYY-MM.md`. Summary fields: period, total collected, total to HAND pool, number of deals, biggest customer, smallest customer, settlements pending. Sent to treasurer for review.
- **Quarterly board report**, summing four monthly reports plus narrative. Manual write-up by koH, exportable to PDF.
- **Annual transparency report**, public, included in HAND's 990 narrative once 501(c)(3) status lands.

---

## 6. The visual language

Internal dashboard reuses the HUD-dark aesthetic from the grants command center, with biz-outreach-specific accents. The two apps feel like sibling rooms, same building, slightly different chairs.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#07090f` | Background, shared with command center |
| `--ink` | `#f5efe1` | Cream text, shared |
| `--amber` | `#d97706` | Signature accent, shared |
| `--biz-accent` | `#0d9488` | Teal counterpart, biz-outreach signature |
| `--biz-accent-soft` | `#5eead4` | Glow, focus rings |

The teal accent quietly distinguishes biz-outreach from the grants command center while keeping the HAND family palette. JetBrains Mono and Inter as before.

Outreach-facing surfaces (the proposal pages, the email templates rendered for preview) use warm-editorial colors, not HUD-dark. The SMB owner who clicks through to a proposal lands on a friendly, light, readable page, not the operator's bridge.

The loader from `web/3d-test/loading.html` is reused, with biz-outreach-specific stage names: `PROSPECT · QUALIFY · REACH · CLOSE · RECIPROCATE`.

---

## 7. Features by lifecycle stage

### 7.1 Discover

| # | Feature | Phase | Description |
|---|---|---|---|
| BD1 | Google Places scraper | 1 | Weekly scheduled function, target city bbox, Places API Pro tier. Dedupe by place_id. |
| BD2 | OSM Overpass top-up | 1 | Nightly scheduled function, supplemental no-website seeding. |
| BD3 | Map view of leads | 2 | Leaflet map (already in SaleScale deps) showing leads colored by status, sized by quality_score. |
| BD4 | Lead deduplication | 1 | By place_id, by phone, by name+address fuzzy match. |
| BD5 | City and territory targeting | 1 | Admin sets active cities and per-rep territories. Scraper respects bounds. |
| BD6 | Discovery quota dashboard | 2 | Current month Places events used, PageSpeed calls, screenshot quota. Soft alerts at 80%. |
| BD7 | Manual lead entry | 1 | Quick-add form for leads the operator finds outside the scraper (referrals, walk-ins). |
| BD8 | XLSX import (existing in SaleScale) | 1 | Reuse `scripts/import-leads-xlsx.ts`. |

### 7.2 Qualify

| # | Feature | Phase | Description |
|---|---|---|---|
| BQ1 | PageSpeed scoring | 1 | Performance, SEO, accessibility scores per website. Composite quality_score. |
| BQ2 | Screenshot capture | 1 | ScreenshotOne integration. Image stored in Supabase Storage. Updated every 30 days. |
| BQ3 | Quality filter on the kanban | 2 | Toggle: show only no-website, or only quality_score under 40, or both. |
| BQ4 | Domain age and Wayback check | 2 | RDAP for domain age, Wayback availability API for last-archived date. Surfaces a "site stale since YYYY" badge. |
| BQ5 | Manual disqualify | 1 | Reps can disqualify a lead with a reason code (closed business, hostile, out of scope, etc.). |
| BQ6 | Fit-score 1 to 5 | 1 | Manual score per lead, paired with the auto quality_score. Sortable. |

### 7.3 Reach

| # | Feature | Phase | Description |
|---|---|---|---|
| BR1 | Outreach kanban | 1 | Five-column kanban: Assigned, Contacted, Qualified, Proposal Sent, Closed (Won or Lost). Drag-to-transition writes contact entry. |
| BR2 | Email template library | 1 | Versioned templates with variables (lead.name, lead.business_name). Renders in app, sends via Resend. Templates also mirrored to git markdown. |
| BR3 | One-click "log contact" | 1 | Phone, in-person, email channel buttons. Inline notes. Auto-sets follow_up_due. |
| BR4 | Follow-up cadence reminders | 1 | Reuse SaleScale's follow_ups table. Reminders trigger 3 days after contact, 7 days, 14 days. Configurable. |
| BR5 | Email send via Resend | 2 | Render template, fill variables, send through HAND's existing Resend account. Track opens (if possible) and clicks. |
| BR6 | Reply capture | 2 | Inbound email parsing (Resend inbound webhook) auto-creates a contact entry. |
| BR7 | Cadence pause on response | 2 | When lead replies, pause the auto-followup cadence. Manual restart by rep. |
| BR8 | "Do not contact" flag | 1 | Permanent disqualification with reason. Hides from all scraper top-ups. |

### 7.4 Convert

| # | Feature | Phase | Description |
|---|---|---|---|
| BC1 | Service offerings catalog | 2 | Three default tiers (Starter, Standard, Premium) plus Custom. Each tier has one-time and monthly pricing. Editable in admin. |
| BC2 | Proposal generator | 2 | Picks a service tier, fills a markdown proposal template with lead details and pricing. Exports to PDF or to a public shareable URL. |
| BC3 | Deal record | 1 | When a lead converts, create an order row with total_value, monthly_value, deal_close_date. |
| BC4 | Lost-reason capture | 1 | When status flips to disqualified or lost, structured reason code plus optional note. |
| BC5 | Conversion velocity report | 2 | Average days from first-contact to close, by quality_score band and by lead source. |
| BC6 | Contract or DocuSign integration | V2 | Skipped V1. Manual contract send via email. |

### 7.5 Reciprocate

| # | Feature | Phase | Description |
|---|---|---|---|
| BR1 | Revenue split entry | 1 | When a customer pays, log to `revenue_splits` with the 33% minimum HAND pool share. Admin only in v1. |
| BR2 | Monthly settlement report | 2 | Auto-generated markdown report. Exported to `settlements/YYYY-MM.md`. Sent to treasurer. |
| BR3 | Settlement status tracking | 2 | `pending → settled` flow with bank transfer reference. |
| BR4 | Customer transparency footer | 2 | Every customer invoice notes the 33% minimum pool share in plain language, with a link to HAND's pool transparency page. |
| BR5 | Quarterly pool impact report | 3 | Narrative + numbers report. Total pool dollars, deployment to Reciprocate groups, projects funded. |
| BR6 | Stripe Connect split routing | V2 | Automate the 33% minimum transfer at payment time, removing the manual ledger. |
| BR7 | Win retrospective | 2 | After a deal closes, capture what worked. Tags feed future lead-scoring. |

---

## 8. The 33% minimum pool routing mechanic (v1)

V1 mechanism, manual ledger:

1. **Invoice the customer for the full amount** (one-time + monthly retainer if any), through HAND's regular invoicing flow.
2. **Customer pays** via ACH, card, or check, into the HAND operating account.
3. **Operator records a `revenue_splits` row** with collected_amount, hand_pool_share = 33% (floor; workers may opt to contribute more from their cut), rep_share if applicable, ops_share for the remainder.
4. **End of month**, the system generates a settlement report. Total collected, total pool share. Markdown export to `settlements/YYYY-MM.md`.
5. **Treasurer reviews and transfers** the pool share to the HAND program account. Manual bank transfer or internal accounting entry. Settlement status flips to `settled`, with bank reference logged.
6. **Quarterly,** the pool report shows what the half-funded.

The math stays operator-readable. No black box. The customer can request to see the pool report at any time, and HAND publishes it.

V2 mechanism, automated via Stripe Connect:

1. **Stripe Connect splits at payment time.** Customer pays once, Stripe routes 33% to a HAND program Connect account, 67% to the operating account, in a single transaction. Any worker-elected over-contribution is settled on the operating side as a second transfer.
2. **The split appears on the customer invoice** as a visible line: "Programs and operations: $X. HAND pool contribution: $Y."
3. **Reconciliation is automatic.** The `revenue_splits` table mirrors the Stripe transfers; the `pool_settlements` table is generated from the mirror.

V2 is also when the customer transparency footer ships (BR4 above).

---

## 9. Service tiers (v1 proposal)

Three default offerings, editable in admin. These are sketch numbers; refine with founder before launch.

### Starter ($2,500 one-time + $222/mo)
- One-page brochure site, mobile-first
- Custom domain setup
- Hosting included
- Basic SEO (sitemap, meta tags, GA4)
- Monthly: hosting + small updates (one hour per month)
- Best for: solo practitioners, small retailers, food trucks

### Standard ($7,777 one-time + $555/mo)
- Multi-page site with custom design
- Booking or contact form integration
- Local SEO (Google Business Profile setup, schema markup, local backlinks)
- Monthly: hosting + content updates (three hours per month) + monthly performance report
- Best for: established small businesses, healers with multiple offerings, restaurants

### Premium ($22,222 one-time + $1,111/mo)
- Multi-page site with ecommerce capability
- Stripe integration, inventory management, order workflow
- Comprehensive SEO (technical audit, content strategy, link building)
- Monthly: full retainer (eight hours per month), ongoing optimization, monthly reporting call
- Best for: retail with active sales, growing service businesses

### Custom (quoted per project)
- Anything outside the above tiers
- Multi-location, complex integrations, bespoke design
- Pricing per scope

Dollar amounts above respect the angel-number tier pattern from HAND's foundation campaign (anchored angels with asymmetric tails where applicable). The 222 in monthly retainer carries the same heritage thread as the foundation ladder.

33% minimum of each collected invoice routes to the HAND pool. Workers on a build may route additional share from their cut into the pool to draw other pool resources (design, mentorship, agent compute, fiscal services).

---

## 10. Voice and copy

Two voices, two audiences.

### Internal voice (the dashboard, the kanban, the admin views)
Same as the grants command center.
- No em dashes, commas and periods instead
- No AI tells
- Mission terms exact: Reciprocates, Contributors, 501(c)(3) in formation
- JetBrains Mono for chrome, Inter for prose
- Dollar amounts with commas

### External voice (outreach emails, proposals, customer-facing surfaces)
Warmer than the dashboard, still HAND-honest.
- Conversational, not corporate
- No "we're disrupting" or "best-in-class" language
- Lead with what we're doing for the customer, not what we believe about ourselves
- Mention the 33% minimum pool routing in every proposal, briefly and concretely
- Email signatures include koH's name, the HAND mission line, and a link to the foundation campaign
- Subject lines lowercase, concrete: "your website + austin's healers" not "Boost Your Online Presence Today!"

The voice linter from the command center is reused for both, with separate rulesets per audience.

---

## 10.5 Service fulfillment via AI-agent teams

The service delivery model for hand-biz-outreach is not "freelancer marketplace" or "small agency." It is a curated team of AI agents, supervised and signed off by HAND workers (or whatever Reciprocate-aligned team is in place at the time). This is the architectural decision that separates HAND from a normal small-business web shop.

### The shape of a delivery team

A team scales with the work, not with the customer's budget.

| Customer size | Team composition | HAND-worker time |
|---|---|---|
| Starter | One generalist agent, one HAND worker reviewer | Two to four hours total |
| Standard | Three agents: design, content, build. One HAND worker as integrator and reviewer | Eight to twelve hours total |
| Premium | Five agents: design, content, build, SEO, ongoing maintenance. One HAND worker as project lead, one as quality reviewer | Twenty to thirty hours over the first three months, then five to eight hours per month for maintenance |
| Custom | Whatever fits the scope. The HAND worker lead has discretion to add or drop agent roles per phase. | Variable, scoped per project |

The HAND worker's job is not to do the work the agent does. The HAND worker's job is to make sure the work is good, to know the customer, and to keep the agents pointed at the right outcome.

### Agent roles in the team

These are the first-pass roles. The orchestration layer can mix and match per project; not every team needs every role.

- **Design agent**: layout, typography, color, hierarchy, mood
- **Content agent**: copy, voice match, SEO-aware writing
- **Build agent**: HTML, CSS, framework code, integrations
- **SEO agent**: technical audit, schema markup, local SEO setup
- **Maintenance agent**: monthly checks, content refresh, performance monitoring
- **Customer-comms agent**: drafts emails and status updates for the HAND worker to review and send

### The connection to Sovereign Reciprocates

Each delivery team is, in effect, a Sovereign Reciprocates instance in production. The biz-outreach customer is one Reciprocate group, the HAND-worker-plus-agents is the system serving them. The eight sovereignty principles apply:

- **Open methodology**: the prompts, the orchestration patterns, the quality rubrics are all published in `handprotocol/biz-outreach/agent-playbook/`
- **Group-owned adapters**: each HAND worker who runs a team owns the configuration of their team's agents
- **Self-hostable end-to-end**: nothing in the agent stack locks us to a single provider
- **Revocable consent**: customers can take their site and walk
- **Full audit trail**: every agent decision is logged and reviewable
- **Case-by-case weights publication**: if a team builds something novel, the prompt patterns can be open-sourced
- **No cross-customer data extraction**: agents serving customer A do not see customer B's content
- **The open option always live**: the customer is told from day one what stack runs their site and how to migrate it

This is the architectural symmetry the PRD was missing in v0.1: biz-outreach is not a side hustle that funds HAND. Biz-outreach is HAND's Sovereign Reciprocates workstream in revenue mode. The agents that build websites for local businesses are the same kind of agents that will eventually serve healer collectives and grassroots organizers, and the playbook generalizes.

### Pricing implications

The agent-team model changes the cost structure considerably. Human time is the dominant cost driver, not agent compute.

- Agent compute per Starter site: estimated $5 to $20 (a few hours of mid-cap model usage)
- Agent compute per Standard site: estimated $30 to $80
- Agent compute per Premium site: estimated $100 to $250 for build phase, $20 to $50 per month for maintenance

HAND worker time, at internal rates of $40 to $80 per hour (reciprocated, not market), is by far the larger cost. The pricing tiers in Section 9 still hold; margin is generous enough to fund HAND worker time, agent compute, ops overhead, and the 33% minimum pool routing.

### Quality assurance loop

Every customer-facing artifact (the live site, the proposal, the monthly report) is signed off by a HAND worker before it reaches the customer. The workflow:

1. **Agent produces a draft** (design mock, copy block, code commit, monthly report, etc.)
2. **Lead HAND worker reviews** against the project brief and a per-tier quality rubric
3. **Either**: ship to customer with worker sign-off; or send the agent back with specific feedback; or escalate to a second HAND worker for a fresh review
4. **Customer feedback**, if any, returns through the worker, not directly to the agent
5. **Retrospective at project close**: what the agents did well, what needed re-doing, what to add to the playbook

The customer-facing fiction is "your project team," not "your AI." But the disclosure is honest: every proposal mentions that delivery is AI-augmented under HAND-worker supervision, with the playbook open-sourced. Customers who want a human-only build pay the Custom tier rate and get a non-AI scope.

### Operational risks specific to this model

- **Agent drift**: an agent that performs well in one project may regress in another. The playbook is the antidote; promote what works, retire what doesn't.
- **Customer trust**: some small business owners will hear "AI" and walk away. The HAND-worker relationship is the trust layer; lead with the worker's name and face in every customer touchpoint.
- **HAND-worker burnout from review fatigue**: review work is mentally heavier than people expect. Cap each worker at three concurrent projects.
- **Model availability shifts**: per the AI stance framing doc, no specific model is the long-term home. The orchestration layer in `kohlabsAI/nerve/packages/ai-router/` is the abstraction that lets us swap providers without rewriting agent prompts.

---

## 11. Build phases

### Phase 0: SaleScale fork plus prereq alignment (target: same day SaleScale ships)
- Clone `handprotocol/salescale/` into `handprotocol/biz-outreach/`
- Override `salescale.config.ts` with biz-outreach branding (teal accent, biz-outreach product name, scraper feature flags on, Stripe Connect off for now)
- Schema rename from `salescale` to `biz_outreach`
- New Supabase project provisioned
- README documenting the fork
- **Prereq conversation 1**: Mystic Hearts referral scope (open question 10). Cannot launch outreach into the healer-aligned segment until this happens.
- **Prereq conversation 2**: HAND nonprofit counsel re tax structure (open question 8) — the UBIT / taxable-subsidiary decision **and** Texas sales-tax registration. Cannot send the first invoice until both (a) the entity/UBIT posture is set with counsel and (b) Texas sales-tax collection is configured. Background + citations: `/hand-tax` skill and its brief.
- **Prereq setup 1**: Resend sender for biz-outreach (`biz@handprotocol.org` or similar) with SPF, DKIM, DMARC records on the handprotocol.org zone. Warm-up cadence at 10 emails per day for week one.
- **Prereq setup 2**: Service-tier numbers locked. Founder review of the proposed $2,500 / $7,777 / $22,222 ladder. Update Section 9 with final numbers before any proposal goes out.
- **Prereq setup 3**: Initial agent playbook scaffolded at `handprotocol/biz-outreach/agent-playbook/` with the six agent role templates from Section 10.5.

### Phase 1: Discover and Reach core (week 1)
- Schema deltas (Section 5.3) applied
- Google Places scraper worker
- OSM Overpass top-up worker
- PageSpeed scoring worker
- ScreenshotOne integration
- Lead deduplication
- Manual lead entry
- Outreach kanban (5 columns)
- Email template library (basic CRUD, no send yet)
- "Log contact" inline action
- Follow-up reminders from SaleScale's existing tables
- Disqualify with reason
- Fit-score 1 to 5

### Phase 2: Qualify and Convert core (week 2)
- Quality filter on kanban
- Domain age and Wayback check
- Map view of leads
- Discovery quota dashboard
- Email send via Resend (template render + send)
- Reply capture (Resend inbound webhook)
- Cadence pause on response
- Service offerings catalog
- Proposal generator with markdown template
- Conversion velocity report
- Revenue split entry (manual ledger)
- Monthly settlement report generation

### Phase 3: Reciprocate and ops (week 3)
- Settlement status tracking
- Pool settlement export to `settlements/YYYY-MM.md`
- Win retrospective auto-prompt
- Quarterly pool impact report
- Customer transparency footer on proposals
- Notifications: settlement_ready, quota_warning, lead_response_received

### Phase 4: Production hardening (week 4)
- RLS audit
- CSP lock-down for production deploy
- Deploy to `biz.handprotocol.org`
- Backup automation
- Cost dashboard tile
- Rate limiting on the scraper workers
- Invite code flow for second rep

### Phase 5: Polish (week 5)
- Map view refinements
- Onboarding flow for new reps
- Help system
- Print views for proposals
- Voice linter for outreach copy
- Email signature template

### Phase 6+ (V2): Stripe Connect automation
- Stripe Connect onboarding for HAND program account
- Split routing at payment time
- Customer invoice transparency footer (BR4)
- Reconciliation between Stripe and `revenue_splits`
- DocuSign or HelloSign for contracts
- Multi-city expansion

---

## 12. Open questions, with founder answers from 2026-05-22

The five questions from the scoping doc plus three that surfaced in this PRD pass. Founder answers captured below; remaining open items have **[STILL OPEN]**.

1. **Separate Supabase project vs. shared with command center.** Recommend separate, named `hand-biz-outreach`. Reason: data sovereignty per `governance/policies/data-sovereignty-and-ai.md`. Cost is minimal at the free or Pro tier.

2. **Geographic scope for v1.** Recommend Austin metro only (city of Austin plus adjacent: Round Rock, Cedar Park, Pflugerville, Buda, Kyle, Manor). Reason: fits within Google Places free quota, gives a manageable lead volume to validate the funnel. Expand to Travis County after first close, then full Hill Country, then statewide. **[STILL OPEN]** confirm metro list.

3. **Service offerings shape. [STILL OPEN]** Three-tier structure in Section 9 still pending founder confirmation on the actual numbers ($2,500 / $7,777 / $22,222 one-time, $222 / $555 / $1,111 monthly). The structure is approved; the numbers need a pass.

4. **Who closes the sale.** Recommend HAND-direct (koH) for v1, contracted reps in v2 once the funnel is proven. Reason: founder voice and relationship trust matter most early; reps come in once the script is repeatable.

5. **Pool split mechanic. [ANSWERED 2026-05-19, REVISED 2026-05-25]** 33% minimum to the pool (lowered from 50% to leave more margin for reps, contractors, and ops without weakening pool credibility). Manual ledger for v1, Stripe Connect for v2. Workers may contribute additional share from their cut to draw pool resources. Section 8 reflects this.

6. **Service fulfillment. [ANSWERED 2026-05-22]** AI-agent teams curated by HAND workers (or the team in place at the time). Tiered effort: some sites are simple enough for a single agent, others require a team of three to five specialized agents pulling in different skill sets. Maintenance is part of the team scope, not a separate handoff. This is now its own section: see Section 10.5 "Service fulfillment via AI-agent teams."

7. **Reciprocate-group customer conflict. [ANSWERED 2026-05-22]** Referral fee model approved. When a biz-outreach customer fits a Reciprocate group's territory (the prototype case: a healer-focused website that Mystic Hearts practitioners could deliver), the customer is referred to that group, biz-outreach takes a referral fee, and 100% of the referral fee routes to the HAND pool. **Specifically flagged for Mystic Hearts discussion**: before any healer-aligned customer closes, a sit-down with Mystic Hearts is required to scope what they want first refusal on, what they decline, and how the referral handoff actually works in practice. Treat this as Phase 0 of biz-outreach, not a Phase 2 polish.

8. **Tax treatment (UBIT + Texas sales tax). [RESEARCHED 2026-06-01 via `/hand-tax`; STRUCTURE STILL NEEDS COUNSEL]** Verified against IRS primary sources (deep-research run + the `/hand-tax` brief). The earlier provisional posture — "services are aligned with HAND's charitable purpose, so should qualify as related business" — is **wrong as stated**: using profit to fund the mission does **not** make an activity substantially related (Treas. Reg. §1.513-1; Pub 598). Selling web/SEO/ecommerce to unaffiliated for-profits is **almost certainly unrelated business income** — Form 990-T at $1,000 gross, 21% on net; the volunteer-labor exception fails (paid reps) and the convenience exception fails (outside clients). **Second exposure the original posture missed:** web design is a **taxable Texas "data processing service"** (34 TAC §3.330) — HAND must obtain a sales-tax permit and **collect sales tax from clients**, separate from and on top of the 33% pool math. **Recommended structure (needs counsel):** house the Develop pillar in a **taxable subsidiary** to isolate UBIT, protect the 501(c)(3), and carry sales-tax collection. See `/hand-tax` Modes A, B, F, G and `~/.claude/skills/hand-tax/references/hand-tax-research.md`.

9. **Email infrastructure for outreach. [STILL OPEN, founder flagged 2026-05-22]** Current state: only `cryptokoh@gmail.com` is wired as a working sender. The foundation site has Resend configured for mailing-list intake (`RESEND_API_KEY` in Netlify env vars), but a dedicated sender for biz-outreach has not been set up. Required before Phase 1 launches outreach emails. Recommend: a separate `biz@handprotocol.org` or `hello@handprotocol.org` sender on the same Resend account, with its own DKIM record, so sender reputation is isolated from the foundation campaign list. DNS records (SPF, DKIM, DMARC) need adding to the handprotocol.org zone. Warm-up cadence: start at 10 emails per day for the first week, ramp to 50 per day over two weeks before pushing higher volume.

10. **Mystic Hearts referral scope conversation. [STILL OPEN, founder flagged 2026-05-22]** Specifically pending: a conversation with Mystic Hearts about what counts as a healer-aligned customer, what categories they want first refusal on, what they explicitly want to decline (e.g., "we don't take wedding officiants even though they're adjacent"), and the referral fee structure. Recommend: 10% referral fee on the first year of collected revenue, 5% on year two, zero after. All routes to HAND pool, not to Mystic Hearts directly (they get their portion through the pool's allocation to the Mystic Hearts Reciprocate group).

---

## 13. What success looks like

V1 (first 90 days of operation):

- 50 candidate leads scraped per week, narrowed to ~15 qualified leads per week
- First conversion within 30 days of launch
- Five paying customers by day 90
- Pipeline value (qualified leads × average deal size) exceeds $25,000
- First monthly settlement transferred to HAND pool

V1.5 (months 4 through 6):

- 10 customers active
- Recurring monthly revenue exceeds $5,000 (HAND pool share $2,500/mo)
- Customer NPS conversation with each customer, captured as a win-retro entry
- One Reciprocate referral fulfilled (a customer matched to a Reciprocate-provided service)

V2 (months 7 through 12):

- 25 customers active
- Recurring monthly revenue exceeds $15,000 (HAND pool share $7,500/mo)
- Stripe Connect automation live, customer invoices show the visible split
- First contracted rep onboarded
- First public quarterly pool impact report published

---

## 14. The honest constraints

- **Cold outreach is slow and rejected often.** The first 100 emails will produce 2-5 responses. This is normal. The system must make rejection cheap to absorb.
- **Local SMB owners answer phones more than email.** The kanban needs a strong phone-call logging surface, not just email. Voice notes captured per call.
- **Google Places rate limits will pinch as we expand.** The cost dashboard plus the quota soft-alert at 80% should keep us safe, but pace expansion to actual quota headroom.
- **Customer trust hinges on the 33% minimum pool being visible.** If a customer ever feels misled about where their money goes, the entire premise collapses. Transparency footer on every proposal, every invoice, every quarterly report.
- **Service fulfillment is the bottleneck, not lead generation.** We can scrape thousands of leads. We can only close as many deals as we can deliver. Phase 1 should not optimize for lead volume beyond what koH can personally fulfill.
- **UBIT risk.** Confirm with counsel before invoice #1. The PRD assumes related-business posture; that may be wrong.
- **Reciprocate-group conflict potential.** Open question #7 above. Resolve before any healer-focused customer closes.

---

## 15. Files this PRD references

**Source frameworks**
- `handprotocol/salescale/` (the fork source, in progress as of 2026-05-21)
- `/home/koh/Documents/noredFarms/reps/` (upstream of SaleScale; read-only reference)

**Sibling docs**
- `funding/grants/_hand-biz-outreach-scoping.md` (the input research)
- `funding/grants/_command-center-prd.md` (sibling PRD, shared design vocabulary)
- `funding/grants/_infra-inventory.md`
- `funding/grants/_platform-research.md`

**HAND canonical context**
- `~/.claude/skills/grants/references/hand-context.md`
- `funding/framing/ai-stance.md`
- `funding/framing/mystic-hearts.md`

**Governance**
- `governance/policies/data-sovereignty-and-ai.md` (cited in Section 5.3 for the separate-Supabase-project decision)
- `governance/policies/conflict-of-interest.md` (relevant to open question #7 once a Reciprocate-group conflict actually arises)

**Existing deployment context**
- `netlify.toml` (root; biz-outreach deploys as a separate site, no impact on the public foundation site)
- `netlify/functions/intake.js` (Resend pattern, reused for outreach email send)

---

## 16. Founder notes

(Append below this line. The build agent reads everything.)

