---
title: WXL:FOOD Living Documentation
description: Current product behavior, community workflows, safety boundaries, and development status for WXL:FOOD.
status: living
last_updated: 2026-07-23
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
- [Read the delivery-readiness plan](DELIVERY-READINESS.md)

## What WXL:FOOD is for

Food already moves through Austin every day. It moves through pantries, farms, community refrigerators, kitchens, mutual-aid groups, neighborhood centers, restaurants, volunteers, and informal relationships.

WXL:FOOD is intended to make that movement easier to see and coordinate without replacing the people and organizations who already hold it together.

The public interface organizes the product around four immediate intents, with operational coordination available as an opt-in advanced workspace:

1. Find public food resources on a map and compare nearby directory listings.
2. Contribute food or open the delivery and Contributor workflows.
3. Gather around a shared meal.
4. View, make, or answer a community request.

## Current product status

Status labels used throughout this document:

- **Live:** Implemented and connected to the current production architecture.
- **Needs migration:** Implemented in code, but requires the latest database migration before production use.
- **Prototype:** Visible for evaluation, but not yet a complete persisted workflow.
- **Planned:** Documented direction, not yet implemented.

| Area | Status | Current behavior |
|---|---|---|
| Public landing page | Live | Starts with three direct paths: find food, contribute food or delivery help, and gather around a shared table. |
| Simple public app shell | Live | Uses persistent Find food, Contribute, Gather, and Requests navigation. Everyday actions stay in this shell instead of opening coordinator tools without warning. |
| Experience modes | Live | Simple mode is the default. Advanced workspace is an explicit, remembered setting for coordination, routes, inventory, and reporting, with a visible return to simple mode. |
| Gather experience | Prototype | Shows clearly labeled sample gathering patterns and uses focused action sheets for joining or planning. It does not claim that sample gatherings are scheduled events. |
| WaterDrop link | Live | Opens the WaterDrop river stewardship app. |
| Email and password authentication | Live | Signup creates a session immediately, login uses email and password, reset and recovery remain email-based, and members can sign out. |
| Email-only updates | Live | Visitors can submit only an email to hear about platform progress and future offerings. This does not create an account or grant write access. |
| Member identity and profile readiness | Needs migration | The interface uses the active Supabase identity. Migration 026 backfills any missing profile rows required by food-record foreign keys. |
| Public community requests | Live | Loads public requests from Supabase when configured. |
| New community requests | Live | Authenticated members can post persisted requests. |
| Request replies | Live | Authenticated members can add persisted messages. |
| Request support | Live | Authenticated members can persist support for database-backed requests. |
| Structured request offers | Needs migration | Members can offer food, transport, storage, or volunteer help. Request owners can accept or decline, and offer authors can withdraw. |
| Request status and history | Needs migration | Request owners can start, fulfill, close, or reopen coordination. Every transition is preserved in database history. |
| Austin food map | Live | Uses an interactive OpenStreetMap base with pan, zoom, food markers, listing synchronization, and platform-aware navigation. |
| Community food pins | Live | Authenticated members can submit public food spots and produce details. |
| `FOOD IS HERE!` alerts | Live | Authenticated members can send six-hour app-wide alerts that appear on Overview, in the alert workspace, and in the alert center. |
| Alert email hook | Live | A validated Netlify Function sends a best-effort operations alert through Resend or HAND's shared notification endpoint. |
| Feedback | Live | Sends notes to HAND's shared feedback system and queues failures offline. |
| A/B testing | Live | Assigns a stable CTA-order variant and records authenticated interactions. |
| Interaction leaderboard | Needs migration | Provides an internal, admin-only aggregate view. |
| Rescue operations | Needs migration | Members submit rescues for coordinator review. Approved records support atomic claims, private assignment details, safety checkpoints, acceptance, incident hold, and audited resolution through migration 028. |
| Volunteer Command | Needs migration | Members submit private readiness details. Coordinators approve training, equipment, and run classes. Migration 029 enforces that approval during rescue claims. |
| Harvest runs | Needs migration | Coordinators plan private food delivery, opt-in compost return, and compost drop-off stops, then assign one eligible Contributor. Assigned people record ordered outcomes, while safety checkpoints and incidents block unsafe completion. |
| Inventory | Needs migration | Coordinators receive only accepted rescues, reserve and distribute quantities, record storage checks and holds, and preserve every balance in a ledger. |
| Impact reports | Prototype | No complete auditable reporting view exists yet. |

## Access and accounts

Anyone can browse public food information and public community requests.

Visitors who only want to follow WXL can join the updates list with one email address. This email-only path does not create a Supabase account, ask for a password, or grant access to posting and coordination. Updates cover meaningful platform development and future offerings, and every message must include an unsubscribe option.

The public entry presents three starting choices: find food, contribute, or gather. These paths open a simplified public interface with persistent navigation for those three intents plus Requests. The food path opens an Austin map and nearby listing shelf. Contribute keeps food drafts, delivery-run previews, compost-return guidance, and Contributor setup prompts in the simple shell. Gather uses the same focused pattern for shared meals. Requests has a short privacy-aware composer and a readable list of open needs. Drafts survive the sign-in handoff in the current browser session. Intent parameters select the public experience only and never grant write access.

Simple mode is the default, including at `/app/`. The account and display menu lets experienced coordinators turn on Advanced workspace. That preference is remembered in the browser. Advanced workspace labels itself clearly and includes a **Use simple mode** control that clears the preference. Legacy links with a specific `workspace` parameter still open the requested operational tool directly.

After choosing the food path, visitors are asked whether they want to share their current location. Sharing is optional. When allowed, WXL compares the browser location with the coordinates of its verified public listings and selects the nearest listing. The visitor's coordinates remain in browser memory for that calculation and are not written to Supabase, local storage, an account, or an engagement event. Skipping location sharing opens the complete Austin map. The location control in the command center can reopen the choice.

An authenticated account is required to:

- Add a food spot
- Share produce or availability
- Publish `FOOD IS HERE!`
- Post a community request
- Reply to a persisted request
- Support a persisted request
- Offer food, transportation, storage, or volunteer help
- Accept or decline an offer on a request you created
- Change the status of a request you created
- Nominate a food source

Write access always follows the active Supabase session. A query parameter does not grant write access.

New accounts do not require an email-confirmation step. A successful signup starts the member session and returns to the relevant simple intent when one was provided, otherwise it opens Find food. The signup fields use standard password-manager metadata so the browser can offer to save the password locally. Whether that prompt appears is controlled by the member's browser and password-manager settings.

Password-reset emails return to `https://wxl.handprotocol.org/app/?mode=recovery`, where the member chooses a new password. After a successful update, WXL ends the recovery session and opens the login page so the member can sign in with the new password. The production callback must remain in the Supabase redirect allowlist.

The command center waits for Supabase session restoration before deciding whether write actions are available. Authenticated members see their current account identity and can sign out from the navigation account menu. Signing out keeps public browsing open and removes write access.

## Austin food map

The public Find food experience uses a real interactive Austin map. Visitors can pan, zoom, select food markers, and move between a marker and its listing card. On phones, cards remain in a horizontal shelf below the map. On larger screens, the map and scrollable listing panel sit side by side.

The map uses OpenStreetMap tiles through Leaflet and keeps the required OpenStreetMap contributor attribution visible. WXL does not prefetch maps for offline use. Only public listings with reviewed coordinates receive a marker. A listing without confirmed coordinates remains in the result shelf with its pending-location label.

Each verified listing has a **Navigate** button. It opens Apple Maps on Apple devices and Google Maps on other platforms, using reviewed coordinates when available and the public address as a fallback.

### Directory-listed locations

Initial pantry and program locations come from public food-access directories, including the City of Austin and Central Texas Food Bank. The current set includes City neighborhood centers across Austin and a Food Bank partner listing. A directory listing means the place appears in a recognized public source. It does not guarantee that food is available at this moment.

Always confirm hours and eligibility before traveling:

- [City of Austin neighborhood centers](https://www.austintexas.gov/services/get-help-neighborhood-centers)
- [Central Texas Food Bank Find Food Now](https://www.centraltexasfoodbank.org/find-food-now)

The selected listing card exposes the public source category, known center hours or access notes, and a navigation link when the location is directory-listed.

South Oak Baptist food pantry appears as a community report, not a verified directory listing. The report says the pantry is open Thursdays from 9 to 11 AM and uses one form without requiring ID. Its exact public location and current access details still require coordinator confirmation before WXL:FOOD treats it as verified.

### Community pins

Authenticated members can add a public food spot with:

- Place name
- Spot type
- Public address
- Produce or food currently available
- Availability window

New submissions are labeled **Community pin** until a coordinator verifies them. Community submission does not imply endorsement or guaranteed availability.

Private homes must not be added to the public map. Public route lines end at anonymous neighborhood clusters. Exact household stops belong only in a future private, authenticated volunteer run.

## `FOOD IS HERE!` alerts

`FOOD IS HERE!` is for public, time-sensitive food availability.

An alert includes:

- A public food spot when one is available
- A short title
- Food, quantity, pickup window, and access notes
- A neighborhood
- A six-hour expiration time

Active alerts appear at the top of Overview, in the dedicated Food available now workspace, and in the top-right alert center. Alerts linked to a public food spot can open that spot on the Overview map. Other open app sessions receive new alerts through Supabase Realtime, and open sessions remove alerts when their six-hour window ends.

To limit abuse, one account can publish no more than five alerts in 15 minutes. Alerts must not include private household addresses, names of households receiving support, medical details, or other sensitive information.

## Community requests

Community requests can describe needs involving:

- Food
- Storage
- Transportation
- Volunteer help

Authenticated members can post requests, add messages, support database-backed requests, and submit structured offers. An offer captures its type, description, optional quantity and unit, availability, transport capability, contact preference, and status.

The member who created a request can accept or decline proposed offers. Accepting an offer moves an open request into `in progress`. Offer authors can withdraw their own proposal while it is still pending. Request owners can also start coordination, mark a request fulfilled, close it, or reopen it.

Message, supporter, and active-offer totals are maintained by database triggers. Status changes are preserved in an immutable history table. Persisted conversations and offers reload whenever a request is selected.

Public requests have public replies and offer details. The interface warns members not to include private addresses, household names, phone numbers, medical details, or other sensitive information. Account email is not displayed or exchanged by the public offer board.

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

On phones, the public experience uses a persistent bottom navigation for Find food, Contribute, Gather, and Requests. The interactive map supports touch panning and pinch zoom, and food results scroll horizontally beneath it. The opt-in Advanced workspace retains the full-width coordination layout and labeled navigation drawer. Short landscape screens use a compact two-column drawer so every workspace and account control remains reachable.

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
- `command.food_request_offers`
- `command.food_request_status_history`
- `command.food_partners`
- `command.food_source_nominations`
- `command.food_spots`
- `command.food_alerts`
- `command.food_engagement_events`

The unreleased coordination protocol in migrations 032 through 036 adds canonical needs, supplies, commitments, mandates, match evidence, private location containers, conversations, voice sessions, payments, donations, subsidies, potlucks, policy decisions, command receipts, and an outbox. The web application exposes these records through its Coordination protocol workspace when the separate API is configured. SMS remains in the next scope. These records are not a claim that automated matching or dispatch is live.

Internal aggregate view:

- `command.food_engagement_leaderboard`

The community-map, alert, experiment, and leaderboard structures are defined in:

```text
command/supabase/migrations/025_wxl_community_map_alerts.sql
```

Profile readiness for WXL foreign keys is defined in:

```text
command/supabase/migrations/026_wxl_profile_readiness.sql
```

Structured offers, transactional counts, request-owner decisions, and status history are defined in:

```text
command/supabase/migrations/027_wxl_request_coordination.sql
```

Safety-reviewed rescue submission, privacy-safe discovery, assignment, checkpoints, incident hold, and event history are defined in:

```text
command/supabase/migrations/028_wxl_rescue_operations.sql
```

Migration 028 does not make the network ready for unsupervised food movement. Contributor approval and training eligibility, operational runbooks, notification and escalation, retention rules, and a supervised rehearsal remain required.

Private Contributor readiness, review history, expiring approval evidence, and claim eligibility are defined in:

```text
command/supabase/migrations/029_wxl_contributor_readiness.sql
```

Migration 029 closes the account-only claim gap. It does not replace coordinator scheduling judgment or the operational gates in the delivery-readiness plan.

Private multi-stop dispatch, exact capability assignment, rescue reservation, ordered stop evidence, incident holds, and run completion are defined in:

```text
command/supabase/migrations/030_wxl_harvest_runs.sql
```

Opt-in compost pickup during food delivery, separate compost drop-off stops, contamination outcomes, quantities, and private handoff evidence are defined in:

```text
command/supabase/migrations/037_wxl_compost_returns.sql
command/supabase/migrations/038_wxl_compost_route_gate.sql
command/supabase/migrations/039_wxl_compost_trigger_permissions.sql
```

Compost pickup is never inferred from a food delivery. A coordinator must opt the delivery stop in, record the expected sealed container or quantity, add private handling instructions, and plan a compost drop-off before the run ends. The assigned Contributor records whether compost was collected, unavailable, or rejected for contamination. Compost stays physically separate from food throughout the route.

Accepted-rescue inventory, lot-specific storage limits, allocations, condition checks, holds, distributions, discards, and immutable quantity balances are defined in:

```text
command/supabase/migrations/031_wxl_inventory.sql
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
- Persisted request-message query order
- Structured offer persistence contracts
- Owner-checked offer-decision and request-status function contracts
- Anonymous gating and public-privacy guidance for request offers
- Privacy-safe rescue-list and authenticated rescue-insert contracts
- Coordinator review and incident-resolution function contracts
- Audited rescue safety-checkpoint contracts
- Private Contributor submission and coordinator approval contracts
- Volunteer Command anonymous and database-readiness states
- Harvest-run assignment and ordered stop repository contracts
- Harvest Runs navigation and database-readiness state
- Accepted-rescue receiving and storage-condition repository contracts
- Inventory navigation and database-readiness state

GitHub Actions configuration lives at:

```text
.github/workflows/wxl-ci.yml
```

It runs tests and a production build for relevant pull requests, relevant pushes to `main`, and manual dispatches.

## What remains illustrative

The current interface still contains sample information in these areas:

- Network summary values
- Sample rescue patterns on the Overview
- Needs signals
- Weekly impact chart
- Sample harvest-run patterns on the Overview
- Some fallback requests and conversations
- Impact reports

Sample content should remain labeled until it is replaced by auditable records.

## Near-term roadmap

### Complete the coordination loop

1. Deploy and verify migrations 027 through 031 with separate creator, Contributor, and administrator test accounts.
2. Add request editing and public-visibility controls for request owners.
3. Add moderation, reporting, and takedown paths.
4. Add private, consent-based contact handoff after offer acceptance.
5. Add pagination for requests, messages, and offers.

### Prepare a supervised rescue pilot

1. Verify Contributor application, re-review, expiry, suspension, equipment, and claim boundaries against a test database.
2. Verify harvest-run planning, exact eligibility matching, rescue reservation, start revalidation, ordered outcomes, and incident disposition against a test database.
3. Add rescue notifications, overdue escalation, reassignment, incident reporting, and privacy-safe access history.
4. Add partner permit and eligibility records instead of relying only on a coordinator confirmation.
5. Complete runbooks, retention rules, local database tests, and a tabletop rehearsal before food moves.

### Complete inventory and traceability

1. Verify accepted-rescue provenance, concurrent reservations, storage holds, expiry, distributions, cancellations, and discards against a test database.
2. Add approved storage locations, lot transfers, cycle counts, recall quarantine, disposal authorization, and automatic expiry processing.
3. Derive impact only from accepted rescue quantities and fulfilled inventory allocations.

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

### 2026-07-21

- Made the clean simple interface the default app experience.
- Added Requests as a fourth simple-mode destination with a short composer and public need previews.
- Kept contribution, delivery, and gathering details in focused action sheets instead of unexpectedly opening the dashboard.
- Added a remembered Advanced workspace setting for coordinators and a clear return to simple mode.
- Preserved food and request drafts across the sign-in handoff in the current browser session.

### 2026-07-18

- Added active `FOOD IS HERE!` posts to Overview and a dedicated Food available now workspace.
- Linked the alert drawer and primary navigation to the full active-alert list.
- Added map handoff for alerts tied to a public food spot and automatic expiry cleanup in open sessions.
- Rebuilt the mobile landscape drawer as a compact, scrollable two-column layout.

### 2026-07-17

- Activated Inventory with accepted-rescue provenance, quantity reservations, private group handoffs, storage checks, holds, distributions, discards, and ledger balances.
- Added migration 031 for inventory lots, allocations, condition checks, row-level security, and transactional quantity history.
- Activated Harvest Runs with private multi-stop planning, rescue-linked windows, eligibility-checked assignment, ordered outcomes, incidents, and completion.
- Added migration 030 for harvest runs, stops, immutable events, row-level security, and restricted transitions.
- Relabeled Overview route content as sample patterns and connected it to the real dispatch workspace.
- Replaced Volunteer Command placeholder content with private Contributor readiness and coordinator review workflows.
- Added migration 029 with expiring training evidence, run-class and equipment approval, review history, and claim authorization.
- Removed the sample Volunteer Command count and connected open rescues to readiness setup.
- Replaced the rescue placeholder with a persisted, privacy-safe operations workspace.
- Added coordinator review, atomic claims, private pickup details, claim release, safety checkpoints, receiving acceptance, incident hold, and audited incident resolution.
- Added migration 028 for rescue records, checkpoint evidence, event history, row-level security, and restricted database functions.
- Kept real delivery blocked on deployment verification, Contributor eligibility, operating approval, and rehearsal evidence.
- Added persisted request-message loading and separated it from sample conversations.
- Added structured offers for food, transportation, storage, and volunteer time.
- Added owner-checked offer decisions, author withdrawal, and request status controls.
- Added database-maintained activity counts and immutable request status history.
- Added public privacy guidance to request, reply, and offer workflows.
- Added restored-session loading, current-member identity, and sign out.
- Replaced fixed request and reply attribution with the active member identity.
- Added a defensive profile backfill migration for older Supabase auth accounts.
- Added the delivery-readiness plan with operational safety, privacy, dispatch, incident, and release gates.

### 2026-07-16

- Moved the food-node map to the opening position in Overview and moved sample statistics below it.
- Expanded the public-source set with City neighborhood centers, added selected-node hours, access notes, source links, and directions.
- Added a schematic volunteer node with routes to anonymous household clusters, keeping exact home locations off the public map.
- Added South Oak Baptist as a clearly labeled community report pending public-source confirmation.
- Made the sidebar WXL:FOOD title return to Overview.
- Adapted the HAND Protocol landing-page menu's traced hand, network nodes, and brand-dot language into WXL navigation.
- Changed the top location trail to `Directory / WXL:FOOD / Current page` with a view-aware final segment.
- Made the X the signature WXL mark across the landing page and command-center navigation.
- Replaced the mobile icon rail with a full-width layout and off-canvas navigation drawer.
- Changed signup to create an immediate session without an email-confirmation step and added browser password-manager metadata.
- Pinned password-reset callbacks to the WXL recovery screen and documented the required Supabase URL configuration.
- Created the living documentation source.
- Documented the East Austin food map and community-pin review state.
- Documented `FOOD IS HERE!`, realtime alerts, expiry, and abuse controls.
- Documented shared feedback, offline retry, experiments, click persistence, and the internal leaderboard.
- Documented the mobile icon rail, database structures, tests, safety boundaries, and roadmap.
