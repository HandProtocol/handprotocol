# Onboarding service handoff

Last updated: 2026-07-28

## Current state

This directory contains the contract and deterministic engine foundation for the reusable onboarding platform. It is not deployed and does not connect to Supabase, Resend, or the Command Center yet.

- Schema version: `0.1.0` (source contracts only)
- Published HAND journey version: none, prototype only
- Verification: `npm test` in this directory runs graph and routing checks
- Wireframe: `web/onboarding-wireframe/`, local fake data only
- Web chat presentation: implemented in the wireframe only. It shares field keys with the standard renderer and is not a chat agent or external-channel integration.

## Current production boundary

`web/reciprocates/` and `netlify/functions/intake.js` remain the live Reciprocates intake. Do not replace them until the service has durable storage, receipts, and a verified legacy-payload bridge.

## Environment variables for the next phase

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ONBOARDING_PUBLIC_ORIGINS=
RESEND_API_KEY=
RESEND_FROM=
COMMAND_CENTER_URL=
```

Do not add secrets to this repository. Public renderer configuration uses only a site key and an allowed public API origin.

## Next bounded task

Create the Supabase migration set for sites, journeys, immutable versions, submissions, answers, assignments, status events, notification destinations, and delivery attempts. Define RLS before writing the public submission endpoint.

## Known issues

- The journey shown in the wireframe is intentionally represented in browser JavaScript, not yet as the service JSON definition.
- The Command Center has no Onboarding navigation or operator routes yet.
- No API, origin enforcement, rate limiting, email receipt, outbox worker, or retention job exists yet.
