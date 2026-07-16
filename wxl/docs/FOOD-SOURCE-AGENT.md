# WXL:FOOD source intelligence, Phase 4

## Why this exists

WXL:FOOD should become better at seeing the local food system without becoming another opaque directory. Communities can nominate food pantries, fridges, farms, kitchens, churches, schools, restaurants, markets, distributors, and mutual-aid groups. The network then verifies what each source actually does, when it is open, what it can provide, and who should be contacted.

The source-intelligence agent is a later phase. It comes after the request, dialogue, partner, rescue, and harvest-run workflows have been used in real conditions and their data quality has been tested.

## Phase 4 objective

Maintain a living, locally grounded source registry and surface useful changes:

- A pantry changed its hours.
- A community fridge is temporarily offline.
- A farm has a seasonal surplus.
- A restaurant has recurring end-of-day meals.
- A school pantry opened enrollment.
- A road closure changes a harvest route.
- A source has not been confirmed recently.

The agent does not publish a source as verified by itself. It gathers evidence, drafts an update, scores confidence, and sends a human or partner a clear next action.

## Inputs

- Community nominations from WXL:FOOD.
- Partner-submitted source profiles.
- Public websites and operating-hour pages.
- Public social posts and newsletters, where permitted.
- Local government and emergency-management notices.
- Source confirmations and corrections from Contributors.
- Successful and failed rescue or harvest-run outcomes.

## Outputs

- Suggested source record or update.
- Evidence links and capture time.
- Confidence: `low`, `medium`, or `high`.
- Freshness state: `confirmed`, `stale`, `conflicting`, or `offline_reported`.
- Draft outreach message in the source's preferred channel.
- Suggested impact on open requests and active routes.
- A review queue for the WXL:FOOD coordinator.

## Guardrails

1. Never invent availability, inventory, hours, eligibility, or contact information.
2. Never contact a source automatically in the first release.
3. Respect robots.txt, terms of service, rate limits, and source preferences.
4. Keep source evidence and model inference separate in the data model.
5. Preserve corrections. Do not overwrite a partner's report with a scrape.
6. Do not expose private household needs in public source discovery.
7. Treat emergency information as time-sensitive and require confirmation before routing people.
8. Make every agent action auditable: input, tool, evidence, draft, reviewer, outcome.

## Suggested phases

### Phase 4A, observe

Read only. The agent ingests nominated sources and approved public URLs, normalizes names and locations, detects duplicates, and creates review tasks. No outbound contact and no automatic changes to public source status.

### Phase 4B, recommend

The agent proposes source updates, matches sources to open requests, flags likely stale records, and drafts outreach. A coordinator approves every material update.

### Phase 4C, assist outreach

Only after explicit source consent and a tested audit trail, the agent can send a low-volume confirmation message through an approved channel. A human owns the relationship and can pause the agent per source.

### Phase 4D, coordinate

The agent can suggest consolidated harvest runs, volunteer assignments, and source-to-request matches. It still cannot promise food, dispatch people, or change a source's public status without confirmation.

## Battle-test gate

Do not start Phase 4 until WXL:FOOD has:

- 30 days of real request and response activity.
- At least 10 partner organizations using the source or request workflow.
- A documented correction and takedown process.
- Measured freshness and false-match rates.
- Confirmed ownership for the source registry.
- A review queue that a human can clear in one working session.
- A privacy review covering household needs, location data, and outreach logs.

## First implementation shape

The smallest useful agent is a scheduled evidence collector plus a review queue. It should not begin as a chatbot. The durable artifact is a trustworthy local source registry with provenance, freshness, and human approval.
