---
title: WXL:FOOD Living Documentation
description: Current product behavior, community workflows, safety boundaries, and development status for WXL:FOOD.
status: living
last_updated: 2026-07-16
canonical_path: /docs/
---

# WXL:FOOD living documentation

WXL:FOOD is a local food coordination app for Austin, Texas. It helps neighbors, community groups, food sources, volunteers, and coordinators see public food resources, share current availability, publish needs, and organize support.

This document describes what the product does now, what remains experimental, and what the community can expect next. It is written as the future source for a public HTML documentation page.

> **Document status:** Living. Update this page whenever a public workflow, safety rule, data model, or product promise changes.

## Quick links

- [Open WXL:FOOD](https://wxl.handprotocol.org)
- [Open WaterDrop](https://waterdrop.handprotocol.org)
- [Visit HAND Protocol](https://handprotocol.org)
- [Read the development handoff](../HANDOFF.md)
- [Read the food-source agent boundary](FOOD-SOURCE-AGENT.md)

## What WXL:FOOD is for

Food already moves through Austin every day. It moves through pantries, farms, community refrigerators, kitchens, mutual-aid groups, neighborhood centers, restaurants, volunteers, and informal relationships.

WXL:FOOD is intended to make that movement easier to see and coordinate without replacing the people and organizations who already hold it together.

The product currently supports four core activities:

1. Find public food resources in East Austin.
2. Share a public food spot and describe what is available.
3. Publish or respond to a community request.
4. Send a time-sensitive `FOOD IS HERE!` alert across the app.

## Current product status

Status labels used throughout this document:

- **Live:** Implemented and connected to the current production architecture.
- **Needs migration:** Implemented in code, but requires the latest database migration before production use.
- **Prototype:** Visible for evaluation, but not yet a complete persisted workflow.
- **Planned:** Documented direction, not yet implemented.

| Area | Status | Current behavior |
|---|---|---|
| Public landing page | Live | Opens WXL:FOOD, login, or anonymous browsing. |
| WaterDrop link | Live | Opens the WaterDrop river stewardship app. |
| Email and password authentication | Live | Supports signup, login, password reset, and recovery. |
| Public community requests | Live | Loads public requests from Supabase when configured. |
| New community requests | Live | Authenticated members can post persisted requests. |
| Request replies | Live | Authenticated members can add persisted messages. |
| Request support | Live | Authenticated members can persist support for database-backed requests. |
| East Austin food map | Live | Shows public-directory listings and links to current food-bank information. |
| Community food pins | Needs migration | Authenticated members can submit public food spots and produce details. |
| `FOOD IS HERE!` alerts | Needs migration | Authenticated members can send six-hour app-wide alerts. |
| Alert email hook | Needs migration | A validated Netlify Function sends a best-effort Resend operations alert. |
| Feedback | Live | Sends notes to HAND's shared feedback system and queues failures offline. |
| A/B testing | Live | Assigns a stable CTA-order variant and records authenticated interactions. |
| Interaction leaderboard | Needs migration | Provides an internal, admin-only aggregate view. |
| Rescue board | Prototype | Shows sample opportunities but does not yet support claiming and completion. |
| Volunteer command | Prototype | The focused volunteer workflow is not yet connected. |
| Harvest runs | Prototype | Summary content is illustrative. |
| Inventory and impact reports | Prototype | No complete repository or auditable reporting flow exists yet. |

## Access and accounts

Anyone can browse public food information and public community requests.

An authenticated account is required to:

- Add a food spot
- Share produce or availability
- Publish `FOOD IS HERE!`
- Post a community request
- Reply to a persisted request
- Support a persisted request
- Nominate a food source

Write access always follows the active Supabase session. A query parameter does not grant write access.

## East Austin food map

The map combines two kinds of listings.

### Directory-listed locations

Initial pantry and program locations come from public food-access directories, including the City of Austin and Central Texas Food Bank. A directory listing means the place appears in a recognized public source. It does not guarantee that food is available at this moment.

Always confirm hours and eligibility before traveling:

- [City of Austin neighborhood centers](https://www.austintexas.gov/my-mm/services/get-help-neighborhood-centers)
- [Central Texas Food Bank Find Food Now](https://www.centraltexasfoodbank.org/find-food-now)

### Community pins

Authenticated members can add a public food spot with:

- Place name
- Spot type
- Public address
- Produce or food currently available
- Availability window

New submissions are labeled **Community pin** until a coordinator verifies them. Community submission does not imply endorsement or guaranteed availability.

Private homes must not be added to the public map.

## `FOOD IS HERE!` alerts

`FOOD IS HERE!` is for public, time-sensitive food availability.

An alert includes:

- A public food spot when one is available
- A short title
- Food, quantity, pickup window, and access notes
- A neighborhood
- A six-hour expiration time

Active alerts appear in the top-right alert center. Other open app sessions receive new alerts through Supabase Realtime.

To limit abuse, one account can publish no more than five alerts in 15 minutes. Alerts must not include private household addresses, names of households receiving support, medical details, or other sensitive information.

## Community requests

Community requests can describe needs involving:

- Food
- Storage
- Transportation
- Volunteer help

Authenticated members can post requests, add messages, and support database-backed requests. Message and supporter totals are maintained from the database rather than browser-only counters.

The current offer flow is not complete. The next version should capture what is offered, quantity, availability, transportation, and preferred contact method.

## Feedback

The feedback button sends notes into HAND Protocol's shared feedback system. Feedback can include a quick tag, written note, and optional name.

The shared endpoint can route feedback to:

- HAND Command Center
- Telegram operations alerts
- Resend email alerts

If a submission cannot reach the server, it is stored locally and retried when the browser reconnects or regains focus.

## Experiments and interaction progress

WXL:FOOD currently tests two CTA orders:

- `map_first`
- `rescue_first`

The assigned variant is stored in the browser so the experience remains stable between visits.

Every visitor receives a locally persisted community-click count. For authenticated members, interaction events are batched to the database after ten interactions. The internal leaderboard is available only to administrators through row-level security.

These events are intended for product learning, not advertising or cross-site tracking. Event metadata is limited to the current path, experiment variant, control label, and timestamp.

## Mobile experience

On phones, WXL:FOOD keeps a compact icon rail visible along the left edge. The arrow or top menu button expands it into the full labeled navigation.

Mobile product requirements:

- Remain usable at 360px wide
- Maintain visible keyboard focus
- Keep primary touch targets at least 44px where practical
- Avoid horizontal page scrolling
- Preserve access to alerts, map pins, feedback, and account gates
- Respect reduced-motion preferences

## Privacy and safety boundaries

WXL:FOOD coordinates public resources. It is not a suitable place for sensitive household information.

Do not publish:

- Private home addresses
- Full names of households receiving food
- Medical or disability details
- Immigration status
- Children's identifying information
- Private phone numbers without consent
- Information that could expose someone to harassment or unwanted contact

Food availability can change quickly. A map pin or alert is a coordination signal, not a guarantee. Call or confirm before traveling when contact information is available.

## Data and security model

WXL:FOOD uses the HAND Supabase project and the `command` schema.

The browser receives only the public Supabase anonymous key. Service-role credentials must never be exposed through a `VITE_` environment variable or committed to the repository.

Primary tables:

- `command.food_requests`
- `command.food_request_messages`
- `command.food_request_supporters`
- `command.food_partners`
- `command.food_source_nominations`
- `command.food_spots`
- `command.food_alerts`
- `command.food_engagement_events`

Internal aggregate view:

- `command.food_engagement_leaderboard`

The community-map, alert, experiment, and leaderboard structures are defined in:

```text
command/supabase/migrations/025_wxl_community_map_alerts.sql
```

## Alert delivery

Creating a `FOOD IS HERE!` alert invokes:

```text
/.netlify/functions/food-alert
```

The function:

1. Requires an authenticated Supabase access token.
2. Validates the session with Supabase Auth.
3. Reads the newly created alert through the authenticated API.
4. Sends a best-effort operations email through Resend.
5. Leaves the in-app alert intact if email delivery is unavailable.

If the WXL site does not have Resend variables, the function forwards the authenticated alert to HAND's shared feedback endpoint. The shared endpoint provides the existing Command Center, Telegram, and Resend notification fan-out.

The database remains the source of truth. Email is an additional notification channel.

## Local development

From the `wxl` directory:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173/
http://localhost:5173/app/?mode=anonymous
http://localhost:5173/app/?mode=login
```

Required browser environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Resend keys belong only in the Netlify Function environment.

## Testing

Run the interaction and repository tests:

```bash
npm test
```

Run the production build:

```bash
npm run build
```

Current automated coverage includes:

- WaterDrop landing link
- Anonymous write gates
- Feedback modal access
- Mobile navigation expansion
- Supabase schema selection
- Authenticated food-pin persistence contracts

GitHub Actions configuration lives at:

```text
.github/workflows/wxl-ci.yml
```

It runs tests and a production build for relevant pull requests, relevant pushes to `main`, and manual dispatches.

## What remains illustrative

The current interface still contains sample information in these areas:

- Network summary values
- Rescue opportunities
- Needs signals
- Weekly impact chart
- Harvest-run summaries
- Some fallback requests and conversations
- Volunteer command
- Inventory and impact reports

Sample content should remain labeled until it is replaced by auditable records.

## Near-term roadmap

### Complete the coordination loop

1. Load request messages from the database.
2. Add structured offers for food, transportation, storage, and volunteer help.
3. Let request owners accept or decline offers.
4. Add `open`, `in progress`, `fulfilled`, and `closed` transitions.
5. Preserve status history and completion evidence.

### Improve the map

1. Add reviewed geocoding instead of placing new pins at a shared approximate point.
2. Add coordinator verification and correction tools.
3. Add expiration and freshness checks for community availability.
4. Add accessible list and map views with the same information.
5. Document a takedown and correction process.

### Strengthen testing

1. Test signup, login, logout, reset, and recovery against a test Supabase project.
2. Add end-to-end tests for food spots and alerts.
3. Test realtime alert delivery across two sessions.
4. Verify Resend delivery on a Netlify deploy preview.
5. Add automated accessibility checks at desktop and 360px widths.

## Documentation maintenance

When product behavior changes:

1. Update `last_updated` in the front matter.
2. Update the status table.
3. Update the affected workflow section.
4. Add a short entry to the change log.
5. Update `HANDOFF.md` when operational or deployment behavior also changes.

When this document becomes HTML, preserve the headings and anchors so existing links remain stable.

## Change log

### 2026-07-16

- Created the living documentation source.
- Documented the East Austin food map and community-pin review state.
- Documented `FOOD IS HERE!`, realtime alerts, expiry, and abuse controls.
- Documented shared feedback, offline retry, experiments, click persistence, and the internal leaderboard.
- Documented the mobile icon rail, database structures, tests, safety boundaries, and roadmap.
