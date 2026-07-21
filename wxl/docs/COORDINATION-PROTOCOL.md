# WXL:FOOD coordination protocol

Last updated: 2026-07-18

Status: non-SMS implementation complete and production schema deployed. Operational activation remains gated.

## Purpose

WXL:FOOD is becoming a channel-independent coordination network. Web, SMS, voice, HAND agents, and approved external agents must operate on the same records and use the same command and policy boundary.

Three lanes remain separately governed:

1. Charitable aid from approved sources to Reciprocates and Reciprocate groups.
2. Paid marketplace orders from reviewed permitted providers.
3. Noncommercial potlucks at public venues or vetted private homes.

One lane failing its readiness gate does not block supervised work in another lane.

## Implemented protocol

Migrations 032 through 036 implement the protocol data and command layer:

- participants, tiered trust, verification evidence, consented contact channels, and agent mandates
- encrypted-location containers, coarse service zones, retention deadlines, sharing policy, and append-only access events
- canonical needs and supplies with lane, food, timing, fulfillment, safety, and quantity fields
- replayable match runs, candidate hard-rule results, score components, explanation codes, and rejection reasons
- commitments tied to eligible candidates, atomic supply quantity checks, payment state, fulfillment state, and mandate references
- append-only agent actions and deterministic policy decisions
- command receipts that bind an actor, command, idempotency key, and request hash
- a transactional outbox with availability, attempts, leases, completion, and error evidence
- deterministic lifecycle validation and an atomic match-commit command
- cross-channel conversations and sensitive voice-session retention
- separate commercial orders, Stripe transfers, donations, and subsidy accounting
- potluck venues, menus, invitations, RSVPs, assignments, capacity, and timed address release
- append-only recognition and contextual operational reliability events
- independent lane-readiness decisions and external-agent certification

Clients do not receive direct insert, update, or delete privileges on these operational tables. Exact locations are stored as opaque ciphertext and are excluded from public and matching records.

Migrations 024 and 025 have also been restored from repository history. They are required predecessors for the existing public request, map, alert, and engagement flows.

The TypeScript Coordination API implements scoped REST resources, remote MCP, A2A task history, OAuth protected-resource metadata, signed Stripe webhooks, and signed Twilio Voice intake. Voice includes English and Spanish prompts, speech and keypad input, replay confirmation, and coordinator transfer.

The Python worker uses OR-Tools for hard-filtered min-cost allocation and capacity-aware vehicle routing. Separate supervised workers process payments, potluck planning, and retention. Five-minute match holds, worker leases, retries, Stripe event reconciliation, mandate ceilings, and location releases execute through database functions.

The WXL web application includes a Coordination protocol workspace for canonical needs, supplies, matching requests, commitments, and potlucks.

## Deliberately deferred

SMS remains the next scope. No Messaging webhook, A2P campaign, SMS consent workflow, STOP, START, HELP, delivery receipt, or SMS retry adapter is included here.

## Production gates

The implementation does not make WXL:FOOD ready for live automated dispatch. The following remain operationally unapproved:

- live multi-role, retry, and concurrency verification, safety approval, and tabletop exercises
- provider account onboarding and live Stripe mode
- a production Twilio Voice number and verified voice-contact consent records
- regulatory approval, named lane coordinators, incident contacts, evidence, and volume ceilings
- external-agent conformance certification before high-authority mandates

No external agent may receive commit, payment, or exact-location authority until conformance and adversarial tests pass.

## Command rules

Every command that can create a commitment, reservation, payment, message, assignment, or checkpoint must include an idempotency key. Reusing the key with different input is an error. A command, its policy decision, its state change, and its outbox event must commit in one database transaction.

Agent judgment may propose or rank an action. Deterministic checks decide whether it executes. Lane eligibility, allergen and food-safety rules, consent, exact-location release, Contributor capability, mandate validity, budget, and incident holds cannot be overridden by model text.

## Lifecycle

The shared normal lifecycle is:

`draft → verified → open → held → matched → committed → in_fulfillment → fulfilled`

Exceptional states are `expired`, `cancelled`, `failed`, `disputed`, and `incident_hold`. The database transition guard permits only explicit edges. Incident holds can move only to a documented terminal disposition in the current foundation.

## Next engineering slice

Migrations 024 through 036 are present in production, and migration history is baselined through 036. Apply them to a nonproduction Supabase branch for destructive, retry, and adversarial acceptance tests, then start the matching worker in shadow mode. Configure Stripe test mode and Twilio Voice only in a supervised environment. SMS registration and implementation remain the next engineering scope.
