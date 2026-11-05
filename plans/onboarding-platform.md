# Reusable onboarding platform

Status: wireframe and contract foundation, 2026-07-28

## Purpose

HAND needs one durable way to receive structured introductions from Reciprocates, Contributors, funders, and partners. The same system must later work for a hosted journey, an embedded journey, or a conversational channel without making a browser form the system of record.

The first deliverable is a clickable, local-data wireframe. It is not connected to the public intake, Resend, Supabase, or Command Center. The current `/reciprocates/` intake remains live until a production migration is verified.

## Product contract

Each project owns a `site`, and each site has named journeys. A journey has immutable published versions. A visitor submits stable field keys with the version they saw. The submission is then validated against that exact version, routed, stored, assigned, and queued for delivery.

Supported node types are `information`, `single_choice`, `multiple_choice`, `short_text`, `long_text`, `email`, `phone`, `consent`, `review`, `external_action`, and `completion`.

Edges and routing use only allowlisted predicates: `equals`, `includes`, `exists`, and `not`. They never execute arbitrary JavaScript.

## HAND v1 journey

The public starting point asks, “What brings you to HAND?” A person may complete the same journey as an ordered form or as a conversational web experience. The conversational presentation is a web renderer, not a future autonomous agent. It collects the same stable answer keys, presents review and consent in the conversation, and works at desktop and phone widths.

| Entry path | Outcome |
| --- | --- |
| Receive support | Impact entrepreneur, community-rooted small business, grassroots organization, or emerging group. Captures work, stage, place, obstacle, desired support, timing, current resources, and contact details. |
| Contribute skills | Captures trade or profession, skills, remote or local availability, capacity, Donate or Exchange preference, credentials, preferred work, and contact details. |
| Fund the work | Direct gifts exit to the existing donation page. Institutional, major-gift, sponsorship, and grant conversations collect interest, organization, expected range, timing, and contact details. |
| Partner with HAND | Captures organization type, proposed relationship, mutual value, timeline, and contact details. |
| Help me choose | Asks plain-language prompts, transfers its answers into the closest path, and always offers a human-triage route. |

Every submitted path includes review and correction, privacy notice acknowledgement, optional communication consent, a reference number, a precise five-business-day reply date, an immediate receipt, and path-relevant links.

## Privacy and delivery

- No personal data is written until a submission is made.
- Browser drafts live only in local storage for 30 days and have a visible clear action.
- Aggregate event counts may record views, starts, exits, and completions without answers, IP addresses, or fingerprints.
- The submitted envelope includes `channel` and optional `externalThreadId` for future chat, SMS, WhatsApp, voice, and email agents.
- The durable store is Command Center through the onboarding service. Email, Telegram, Slack, Discord, and webhooks are adapters only.
- Private-channel alerts contain reference, path, priority, due date, and a Command Center link. They never include sensitive answers.

## Operational workflow

1. Validate the envelope against the published journey version.
2. Deduplicate with `(site, idempotency key)`.
3. Store submission, answers, and initial `new` status transactionally.
4. Evaluate routing rules, create assignment and five-business-day due date.
5. Queue receipt and notification delivery attempts in the outbox.
6. Return success once storage is durable, even if a delivery adapter is temporarily unavailable.

Statuses are `new`, `triaged`, `assigned`, `contacted`, and `closed`. Closure requires `proceed`, `referred`, `not_now`, `withdrawn`, or `spam`. A reminder remains due every five business days until `contacted` or `closed`.

## Builder and publication

The Command Center builder is ordered, not a canvas. Its sections are Start, Steps, Branches, Completion, Routing, Preview, and Publish. Publish validates unreachable steps, dead ends, loops, missing consent, invalid fields, and missing destinations.

Publishing produces the next immutable version. Editing begins from a draft. Restoring an earlier design clones it into a new version so historical records remain reproducible. Preview supports desktop, mobile, and test-answer simulation.

## Public interfaces

```text
GET  /v1/public/sites/{siteKey}/journeys/{journeyKey}
POST /v1/public/submissions
```

`POST /v1/public/submissions` accepts site and journey keys, published version, channel, entry point, idempotency key, stable answer keys, privacy notice version, communication consent, and optional external thread ID. It returns a submission ID, reference, `received` status, reply-by date, and completion actions.

## Implementation phases

1. Wireframe and lock the HAND paths, field keys, routing outcomes, copy, mobile behavior, and accessibility behavior.
2. Add service migrations, RLS, API, outbox, rate limits, honeypot, origin allowlists, and retention jobs.
3. Add the guided Command Center builder and submission inbox.
4. Ship the renderer at `/start/`, update the public CTA, migrate legacy Reciprocates payload compatibility, and enable Resend receipts.
5. Add project registration, portable exports, hosted links, embed installation, then conversational channel adapters after real structured-journey usage.

## Acceptance checks for the current phase

- All five paths are clickable, including donation exit and human triage.
- The full journey can be completed as either the standard form flow or the conversational web flow.
- Review, correction, consent, receipt, and while-you-wait states are visible.
- Route inspector can open every entry path, mobile frame, completion frame, builder, and inbox.
- Prototype uses local fake data only and is no-index.
- Contract tests cover predicate evaluation, graph validation, and immutable version semantics.
