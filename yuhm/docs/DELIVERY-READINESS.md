# yuhm delivery readiness

Last updated: 2026-07-18

Status: operating plan. This document defines what must be true before yuhm coordinates real food pickup and delivery. It is not evidence that those gates have already passed. The protocol foundation is documented in `COORDINATION-PROTOCOL.md`.

## Release principle

yuhm should expand through controlled operating stages. A polished screen is not a readiness signal. Each stage needs named ownership, recorded evidence, a rollback path, and a completed rehearsal.

1. **Directory:** public, source-backed resource discovery only.
2. **Signals:** reviewed community pins, requests, and time-limited public alerts.
3. **Partner pilot:** a small set of approved food sources, receiving groups, coordinators, and trained Contributors complete supervised runs.
4. **Austin network:** more partners and volunteers join only after pilot incidents, waste, timing, and fulfillment data have been reviewed.

The current production product is between Directory and Signals. Migrations 024 through 041 are deployed and verified at the schema and privilege level, but the rescue, Contributor-readiness, harvest-run, inventory, and coordination workflows are not operationally approved. yuhm is not ready for unsupervised delivery dispatch.

## Public-health and food-safety gate

Austin Public Health treats nonprofit meal delivery programs and organizations that solicit, warehouse, or redistribute edible food as Charitable Feeding Organizations in applicable cases. The operating entity must confirm its category and receive required approval before yuhm coordinates handling. Time and temperature controlled food, prepared food, open food handling, storage, and redistribution have stricter requirements than sealed shelf-stable goods or whole uncut produce.

Authoritative starting points:

- [Austin Public Health Charitable Feeding Organizations](https://www.austintexas.gov/health/austin-public-health-charitable-feeding-organizations)
- [Austin Public Health Fixed Food Establishments and donation guidance](https://www.austintexas.gov/health/programs/fixed-food-establishments)
- [Austin Public Health Food Establishments Resource Library](https://www.austintexas.gov/health/food-establishments-resource-library)
- [FDA retail food protection resources](https://www.fda.gov/food/retail-food-protection/listing-retail-food-protection-information-and-resources)

Required evidence before the partner pilot:

| Gate | Evidence | Owner |
|---|---|---|
| Regulatory classification | Written determination of the operating model, jurisdiction, required registration or permit, and permitted food categories | Operations lead |
| Partner eligibility | Permit or registration status, public-health contact, food categories, handling limits, and expiration dates recorded per partner | Partner coordinator |
| Training | Current food-handler or food-manager credentials where required, plus yuhm run training completion | Safety lead |
| Handling plan | Approved pickup, inspection, packaging, separation, temperature control, transport, handoff, rejection, and disposal procedures | Safety lead |
| Equipment | Calibrated thermometers, clean food-grade containers, cold and hot holding equipment where needed, sanitation supplies, and vehicle checklists | Run coordinator |
| Traceability | Source, food description, quantity, preparation or receipt date, lot or label details when available, pickup time, handoff time, and responsible people | Run coordinator |
| Recall response | Documented lookup, quarantine, notification, and disposal procedure tested in a tabletop drill | Safety lead |
| Incident response | Stop-work, emergency contact, exposure record, escalation, and after-action procedure rehearsed | Operations lead |

The app must not calculate legal eligibility from a few form answers. It should capture evidence and block assignment when required review fields are missing or expired.

## Product gate for a real rescue

A rescue cannot be a generic community request. It needs a dedicated persisted record with:

- food source and a reviewed partner reference
- food category and description
- quantity and unit
- packaging and label condition
- allergen information when supplied by the source
- preparation, receipt, sell-by, use-by, or discard information when applicable
- temperature-control classification and required handling method
- pickup window and hard deadline
- public location summary and private pickup instructions
- receiving organization and delivery window
- vehicle, storage, and accessibility requirements
- current status, assignee, and claim expiration
- inspection, rejection, cancellation, and completion reason codes
- immutable status history and timestamps

Required status path:

`draft → awaiting review → open → claimed → picked up → delivered → accepted`

Exceptional paths must include `released`, `cancelled`, `rejected`, `expired`, and `incident hold`. Only accepted deliveries can contribute to impact totals.

## Dispatch and volunteer gate

Before a Contributor can claim a run, yuhm needs:

- verified email and accepted volunteer agreement
- emergency contact stored privately
- training and credential status where the run requires it
- availability, vehicle type, capacity, refrigeration capability, lifting limits, and accessibility needs
- coordinator approval for the run class
- conflict-safe claiming so only one active claim can win
- claim timeout and release behavior
- private pickup and delivery instructions visible only to the assigned people
- check-in at pickup, check-in at delivery, and an overdue escalation
- a no-contact and unsafe-conditions exit path

No public screen should expose household addresses, household names, phone numbers, medical details, immigration status, or delivery patterns.

## Receiving and consent gate

Receiving organizations and Reciprocate groups must be able to:

- choose public, partner-only, or coordinator-only visibility
- specify accepted food categories and unavailable categories
- record storage capacity and operating hours
- provide allergy and cultural-preference notes without identifying households
- accept, partially accept, or reject an offered delivery
- correct or remove their data
- name an authorized contact and backup contact
- report a safety, privacy, quality, or conduct concern

The app should minimize direct household data. When household-level coordination is unavoidable, use a private record with narrow access, an explicit retention period, and an auditable access history.

## Operational runbook required before pilot

The operating team must publish and rehearse these short runbooks:

1. Partner onboarding and permit verification
2. Food acceptance and rejection
3. Cold, hot, shelf-stable, frozen, produce, and prepared-food handling
4. Allergen and labeling handoff
5. Volunteer onboarding and vehicle readiness
6. Rescue creation, review, claim, release, and reassignment
7. Pickup and delivery proof without household surveillance
8. Late, missed, cancelled, and unreachable stops
9. Vehicle breakdown and loss of temperature control
10. Recall, illness report, contamination, damaged packaging, and other incidents
11. Privacy request, correction, removal, and breach response
12. Severe weather, heat, air quality, and stop-work decisions

Each runbook needs an owner, backup owner, last-reviewed date, emergency contacts, decision thresholds, the record created in the app, and the after-action process.

## Technical production gate

Before the partner pilot, require evidence for all of the following:

- production auth lifecycle smoke-tested, including signup, restore, reset, expired recovery, and sign out
- migrations 024 through 041 applied and verified
- row-level security tested for anonymous, member, coordinator, and administrator roles
- server-side validation for every state transition
- idempotency and duplicate prevention for claims, alerts, messages, and delivery completion
- rate limits and abuse reporting on public submissions
- audit history for assignment, status, safety, and privacy changes
- offline and retry behavior that never duplicates a rescue or completion
- monitoring for function failures, database errors, realtime disconnects, and overdue runs
- encrypted backups and a tested restore procedure
- documented data retention and deletion schedule
- accessibility checks at 360px, keyboard-only, screen reader, zoom, and reduced motion
- incident contacts and a release rollback procedure

## Pilot success measures

Pilot reporting must use completed records, not estimates from dashboard samples:

- rescues opened, accepted, rejected, cancelled, and expired
- claim collisions and reassignment count
- pickup and delivery timeliness
- quantity offered, picked up, delivered, accepted, rejected, and discarded by unit
- reasons for rejection or waste
- temperature or handling exceptions where applicable
- volunteer hours and travel distance, recorded with consent
- partner satisfaction and correction requests
- privacy, safety, conduct, and reliability incidents
- median coordinator intervention time

Do not publish household counts or maps at a precision that could identify recipients. Impact reports must state their date range, units, inclusion rules, and missing-data limitations.

## Next implementation sequence

### Milestone 1: trustworthy accounts and requests

- Complete live multi-role and retry verification for migrations 026 and 027.
- Complete the live auth smoke test.
- Verify request messages after refresh and all database-maintained activity counts.
- Add request-owner editing and visibility controls. Status ownership is implemented in migration 027.
- Add public-content moderation, reporting, and takedown.

### Milestone 2: structured offers

- Complete live multi-account verification for the persisted offer flow in migration 027.
- Add request-changes negotiation without replacing the original offer history.
- Add private, consent-based contact handoff after acceptance.
- Notify only people connected to the request.

### Milestone 3: reviewed rescue pilot

- Complete supervised live verification for migration 028, which adds the rescue schema, server-validated transitions, coordinator review, conflict-safe claim and release, restricted run instructions, safety checkpoints, incident hold, and event history.
- Replace the current review confirmation with durable partner permit, eligibility, category, and expiry records.
- Complete supervised live verification for migration 029, which adds private Contributor profiles, agreement acceptance, coordinator review, training and credential expiry, equipment-gated run classes, and claim authorization.
- Complete supervised live verification for migration 030, which adds private route plans, rescue-linked stops, exact capacity, lifting, vehicle, run-class and expiry checks, start revalidation, ordered outcomes, incident holds, and completion evidence.
- Add normalized availability calendars and service areas, acknowledgement deadlines, overdue escalation, notifications, and offline-safe stop recording.
- Add notification, overdue escalation, reassignment, privacy-safe access history, retention, and partial-acceptance behavior.
- Run tabletop tests before any food moves.

### Milestone 4: inventory and auditable impact

- Complete supervised live verification for migration 031, which creates lots only from accepted delivery checkpoints and tracks storage limits, condition checks, reservations, fulfilled distributions, holds, and discards in a quantity ledger.
- Add approved storage-location records, transfers, cycle counts, recall quarantine, disposal authorization, and automatic expiry handling.
- Derive impact only from accepted delivery and inventory records.
- Replace all sample metrics and charts with honest empty or auditable states.

## Release decision record

Before moving between stages, create a dated decision record with:

- stage requested
- approved geography, partners, food categories, and run volume
- evidence links for every applicable gate
- known risks and mitigations
- named go or no-go decision maker
- monitoring window and rollback trigger
- date of the next review

If evidence is missing, stale, or indirect, the stage does not advance.
