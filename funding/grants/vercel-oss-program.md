---
slug: vercel-oss-program
name: Vercel · Open Source Program
funder: Vercel
funder_url: https://vercel.com
program_url: https://vercel.com/open-source-program
application_url: TBD — page currently shows "Applications are currently closed. They will reopen in May."
status: drafting
award_type: Platform credits
award_size: $3,600 in Vercel credits over 12 months + OSS Starter Pack (third-party credits)
deadline: quarterly cohort — Spring 2026 application window opening this month
match_required: none
reporting: standard OSS program reporting (project updates, public maintainership)
discovered_on: 2026-05-18
submitted_on:
decided_on:
contact: via Vercel Community
hand_lead: Russell Herod
fit_score: 4
---

# Vercel · Open Source Program

## TL;DR

$3,600 in Vercel credits over 12 months for active OSS projects deployed on Vercel, plus an OSS Starter Pack of third-party credits. No 501(c)(3) required. Currently between cohorts — Spring 2026 application window opening in May. Apply the day it opens.

**One flag**: program excludes "marketplace providers." Mystic Hearts is technically a healer marketplace. Frame the application around the **Sovereign Reciprocates reference template** (the open-source agent harness HAND is releasing) rather than Mystic Hearts itself, and Mystic Hearts becomes "a project built using the template."

## The program

From the Vercel OSS Program page (verified 2026-05-18):

- $3,600 in Vercel platform credits, distributed over 12 months
- OSS Starter Pack: third-party service credits to enhance the project
- Selection-based, quarterly cohorts (Winter 2026 cohort active; 33 selected projects)

Eligibility:
- Actively developed and maintained OSS initiative
- Hosted on or intended for Vercel deployment
- "Measurable impact" or growth potential
- Code of Conduct established
- Credits used exclusively for OSS work and the project itself

Explicit exclusions:
- **Funded open-source companies are redirected to the Startups Program** (likely doesn't apply — HAND is pre-funding, foundation-track, not a venture-backed startup)
- **Marketplace providers are explicitly excluded** (frame around the SR reference template, not Mystic Hearts directly)

## Fit assessment

**Score: 4/5.** Strong with one caveat:

- **Stack fit: excellent.** Mystic Hearts is Next.js, which is Vercel-native by definition.
- **OSS fit: strong if framed correctly.** The Sovereign Reciprocates reference template is fully open-source. The "marketplace" exclusion language is the only friction.
- **Dollar fit: useful, not transformative.** $3,600 + Starter Pack covers Mystic Hearts hosting at expected early-user scale through 2027.

## Application answers — draft

To be drafted when the form opens. Skeleton:

### Project name

Sovereign Reciprocates — Open-Source Agent Harness for Community Resource Pools

### Description

Sovereign Reciprocates is an open-source reference template for building group-owned AI agent systems on top of community resource pools. Each Reciprocate group (e.g., a collective of healers, an impact-driven business cohort, a grassroots mutual-aid network) gets a custom agent harness — fully forkable, deployable on Vercel + Supabase — that covers intake, scheduling, ledger entries, and bounty matchmaking for that community. The template is being battle-tested by Mystic Hearts, the first Reciprocate-group product, before the template is released for forks.

### Why Vercel?

Mystic Hearts is built on Next.js, and the SR reference template will ship Next.js-first because that's the surface most community technologists already know. Vercel credits cover the Mystic Hearts pilot deployment while the template is hardened for fork-ability.

### Code of Conduct

(Need to publish to repo before applying — TODO)

### Maintainers

- Russell Herod (koH) — founder, HAND Protocol Foundation
- (TBD — additional maintainers as project formalizes)

### Repos

- github.com/HandProtocol/handprotocol (foundation repo, currently public)
- github.com/HandProtocol/sovereign-reciprocates (SR reference template — TODO: create + publish initial scaffolding before applying)

## TODO before applying

- [ ] Publish a Code of Conduct in the repo (CODE_OF_CONDUCT.md — Contributor Covenant 2.1)
- [ ] Create `github.com/HandProtocol/sovereign-reciprocates` with at least scaffolding + README
- [ ] Confirm application form opens (currently "reopens in May")
- [ ] Verify the "marketplace exclusion" doesn't bite by emailing the program team if uncertain

## Decision criteria for us

- **Accepted:** $3,600 covers Mystic Hearts hosting through 2027. Use Starter Pack credits for the partner services (analytics, error tracking, etc.).
- **Declined:** Hit Cloudflare Pages + Workers as the alternative for SR template deployments. Mystic Hearts stays on Vercel paid tier.

## Timeline

- 2026-05-18 — Discovered (survey)
- 2026-05-?? — Application window opens (watch program page)
- 2026-05-?? — Application submitted
- 2026-??-?? — Cohort decision

## Follow-up

TBD.
