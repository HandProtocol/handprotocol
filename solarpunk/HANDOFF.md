# Handoff: SolarPunk Summit 2026 driver sign-up

Dated 2026-10-06, end of the first build session. Read `README.md` for the file map and deploy steps.

## What exists and is live

- **https://sps.handprotocol.org** — a code-gated page where a driver types their name, car seats, a note, and taps **Can drive / Maybe / Can't** on each of 15 airport runs (Oct 7–13, Son's Blue River Camp ↔ AUS). Answers save as they tap; each device holds a token so only that device can edit or remove its entry; duplicate names are refused with a hint to add a last initial.
- **Backend**: one Netlify function (`netlify/functions/drivers.mjs`, path `/api/drivers`, GET/POST/DELETE) with entries in the Netlify Blobs store `sps-drivers`. No database.
- **Email**: every sign-up, change and removal emails the transport team through Resend (`lib/notify.mjs`). Recipient is the env var `SPS_NOTIFY_TO` (comma-separated to add people).
- **Access code**: env var `SPS_ACCESS_CODE` on the Netlify site. The page sends it as the `x-sps-code` header; every API call without it gets 401. The code is not in the repo (the repo is public): ask koH.
- **Netlify site** `sps-drivers` (id `059d962f-d68f-4d8e-8ddf-d3c44aeac9fb`), cryptokoh account, custom domain via a NETLIFY record in the handprotocol.org zone. Not repo-linked: deploy by CLI (README). Env vars on it: `SPS_ACCESS_CODE`, `SPS_NOTIFY_TO`, `RESEND_API_KEY`, `EMAIL_FROM` (the last two copied from the main handprotocol site).
- **Tests**: `npm test` (7 passing). Browser round trips were run against the live site with Playwright: gate, sign-up, update, reload, remove, no console errors, no sideways scroll at 390px.
- All of it is on `main` (commits `62a2612d`, `98f9809d`, `7d523b20`).

## What is deliberately NOT on the page

Passenger names, phones, emails, flight confirmations, and the transport team's internal notes. Every driver sees the whole page and the repo is public. The runs in `lib/slots.mjs` carry only date, pickup time, busy window, route, rider count and a neutral note.

## State of the data

Real drivers have started signing up (first entry arrived 2026-10-06 23:45 CT, before the email trigger went live, so no email for it). Read the list any time:

```bash
curl -H "x-sps-code: $CODE" https://sps.handprotocol.org/api/drivers
```

## Gotchas learned

1. `netlify env:set --site <id>` run inside the monorepo **ignores `--site`** and writes to the main handprotocol site. Use the API: `POST /api/v1/accounts/cryptokoh/env?site_id=…`. The Free plan also rejects scoped env vars (`scopes`), so set them unscoped.
2. Netlify Blobs `store.list()` + per-key `get` is fine at this size (hundreds of entries); it is not a query engine.
3. A `change` event on an input fires as the user taps a button elsewhere; re-rendering the list in that handler swallows the tap. Render on save success instead.
4. `[hidden]` loses to any `display:` rule; add `[hidden]{display:none!important}` when panels are toggled with the attribute.

## Next (koH's ask, 2026-10-06, message cut off mid-sentence)

Turn this into a driver **portal**: a front door that asks "Driving?" / "New driver?", a per-driver shift view (your runs, when to be ready, where to meet, who to call, what to bring), a visual diagram of the week, and feed what this teaches back into **koord** (the booking/coordination platform). The plan with open questions is in `PLAN-driver-portal.md`; the koord write-up is in `koord/docs/research/2026-10-06-sps-driver-signup-lessons.md`. Nothing of the portal is built.
