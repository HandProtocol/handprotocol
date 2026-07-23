---
slug: cloudflare-startups
name: Cloudflare · Startup Program (Tier 1)
funder: Cloudflare
funder_url: https://www.cloudflare.com
program_url: https://www.cloudflare.com/startups/
application_url: https://www.cloudflare.com/startups/
status: drafting
award_type: Platform credits
award_size: $10,000 Tier 1 (bootstrapped, no minimum funding). Standalone BOOTSTRAPPED promo gives $5K.
deadline: rolling
match_required: none
reporting: standard startup-program reporting
discovered_on: 2026-05-18
submitted_on:
decided_on:
contact: via cloudflare.com/startups
hand_lead: Russell Herod
fit_score: 4
---

# Cloudflare · Startup Program (Tier 1)

## TL;DR

$10K in Cloudflare credits for bootstrapped companies/projects ≤5 years old with a real product and a real business email. No 501(c)(3) required. Decision in days. Apply with `hand@handprotocol.org`, not a Gmail address — the survey called this explicitly.

## The program

- **Tier 1 (bootstrapped):** $10,000 in credits. No funding minimum required.
- **BOOTSTRAPPED promo code:** $5,000 standalone (lower bar; faster path).
- Eligibility:
  - Company ≤5 years old
  - "Real business entity, legitimate product"
  - Business email (not Gmail)
- Covers Workers, R2 (object storage), Pages, Stream, etc.

## Fit assessment

**Score: 4/5.**

- **Infra fit: excellent.** Cloudflare Workers + R2 + Pages cover edge compute, image hosting, rate limiting, and ancillary infra without burning Vercel/Supabase quotas.
- **Eligibility fit: clean.** HAND Protocol Foundation is pre-revenue and bootstrapped by definition. handprotocol.org is the business email domain.
- **Strategic fit: strong.** Cloudflare credits free up Vercel/Supabase quotas for the customer-facing surfaces (Mystic Hearts) while moving asset hosting, edge auth, and background workers to CF.

## Application answers — draft

### Company / project name

HAND Protocol Foundation

### Website

https://handprotocol.org

### Business email

hand@handprotocol.org

### What does your company do?

HAND Protocol Foundation is a curated skill-and-resource pool for impact entrepreneurs, community-rooted small businesses, and grassroots organizations. We coordinate three flows: donate, exchange, receive. We also build open-source AI agent systems (Sovereign Reciprocates) that let each Reciprocate group own their own infrastructure rather than depend on platform-owned tooling.

### Company age

Founded August 2024 (first public push); pivoted to current resource-pool model in early 2026. Less than 5 years.

### Funding status

Bootstrapped. Pre-revenue. Currently running a $22,777–$222,222 community filing raise for 501(c)(3) incorporation.

### Why Cloudflare?

Three concrete use cases:
1. **Workers** for the SR reference template's edge auth and rate-limited intake (instead of Next.js middleware on Vercel).
2. **R2** for healer portfolio image hosting (Mystic Hearts), keeping Supabase storage quota free for ledger/operational data.
3. **Pages** for the foundation-campaign and discovery static surfaces, keeping the Netlify deploy focused on the main hand site.

### Headcount

1 (founder).

## Decision criteria for us

- **Accepted at Tier 1 ($10K):** Migrate static surfaces and image hosting to Cloudflare immediately. Free up Vercel/Supabase headroom.
- **Accepted at BOOTSTRAPPED promo ($5K):** Still meaningful; same migration plan at smaller scale.
- **Declined:** Stay on Vercel/Supabase. Revisit in 2027 with a tighter pitch.

## Timeline

- 2026-05-18 — Discovered (survey)
- 2026-05-?? — Application submitted
- 2026-05-?? — Decision (typically days)

## Follow-up

TBD.
