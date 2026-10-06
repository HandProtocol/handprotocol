# SolarPunk Summit 2026 driver sign-up

Live: **https://sps.handprotocol.org** (access code required; the transport team has it)

Drivers for the artist airport transport (Oct 7–13, Son's Blue River Camp ↔ AUS) enter their name and mark which runs they can cover. No passenger details appear on the site.

## Where things are

| What | Where |
|---|---|
| Page | `public/index.html` + `public/app.js` |
| Backend (read / save / remove) | `netlify/functions/drivers.mjs` → `/api/drivers` |
| The runs (times, routes, riders) | `netlify/functions/lib/slots.mjs` |
| Validation + per-device tokens | `netlify/functions/lib/entry.mjs` |
| Stored entries | Netlify Blobs store `sps-drivers` on the `sps-drivers` Netlify site |
| Access code | Netlify env var `SPS_ACCESS_CODE` on that site (not in this repo) |
| Tests | `npm test` |

## Deploy

Not repo-linked. Deploy by CLI with the cryptokoh Netlify token:

```bash
cd solarpunk && npm ci && npm test
netlify deploy --prod --site 059d962f-d68f-4d8e-8ddf-d3c44aeac9fb --dir public --functions netlify/functions
```

## Read the sign-ups

```bash
curl -H "x-sps-code: $CODE" https://sps.handprotocol.org/api/drivers
```

Returns the runs plus every driver's name, seats, note and answers (`yes` / `maybe` per run id).

## Change the runs

Edit `netlify/functions/lib/slots.mjs` and redeploy. Keep passenger names, phones and booking codes out: the site is shared with every driver and this repo is public.
