# WaterDrop — Ops & Integration (for HAND AI / future sessions)

Single reference for how WaterDrop is deployed and wired into HAND Protocol's infra.
Last updated 2026-06-20.

## What it is
A mobile-first PWA (great on desktop too) for paddling Central Texas: find drop-in
spots, plan a float, read live river conditions, and (as crew) log field
observations. 4 regions / ~15 waterways / ~91 drop-ins / 20 live USGS gauges
(Austin, San Marcos, Hill Country, Guadalupe & Comal). Local-first (Dexie); no
backend DB yet.

## Hosting / deploy
- **Live:** https://waterdrop.handprotocol.org
- **Netlify site:** `waterdrop-app`, id `8a5f8ec9-e857-4196-887b-8bd1cb83ad10`
  (default URL `waterdrop-app.netlify.app`), team **koH** (`cryptokoh`). (Renamed from
  `waterdrop-sanmarcos` 2026-06-20 — the plain `waterdrop` subdomain is taken globally.)
- **Custom domain:** set as the site's PRIMARY `custom_domain` via the Netlify API
  (PATCH the site with `{"custom_domain":"waterdrop.handprotocol.org"}`). That auto-
  created the NETLIFY DNS record in the handprotocol.org zone (`6a034490d8f0c5ec10542e20`)
  and provisioned SSL. (A plain `domain_aliases` PATCH 422s; and a manually created
  NETLIFY record auto-claims to the zone-owner site — setting `custom_domain` is the fix.)
- **Deploy = git auto-deploy from `main`** (since 2026-06-20). The site is repo-connected
  (`HandProtocol/handprotocol`, GitHub app installation `108354379`) with **base directory
  `waterdrop`**, so a push to `main` that touches `waterdrop/` builds (`npm run build`) and
  publishes `dist` + the functions. Netlify's monorepo detection SKIPS the build when
  `waterdrop/` is unchanged (shows as a benign "no content change" / canceled deploy — not
  a failure). The whole repo tree must therefore carry `waterdrop/`; it lands on `main` via
  PR (don't entangle it with feature branches). Build config lives in `netlify.toml`
  (publish `dist`, `[functions] directory`, SPA fallback, no-cache for sw.js/index.html) +
  `public/_redirects`.
- **Manual fallback** (hotfix without a push, MUST include functions):
  ```bash
  cd ~/Documents/handprotocol/waterdrop
  npm run build
  netlify deploy --prod --dir dist --functions netlify/functions \
    --site 8a5f8ec9-e857-4196-887b-8bd1cb83ad10
  ```

## Netlify functions (on the WaterDrop site)
- `netlify/functions/subscribe.mjs` — "subscribe to updates". Adds the email to a
  Resend audience. Same-origin from the SPA. Env: `RESEND_API_KEY`,
  `RESEND_AUDIENCE_ID` (optional `TELEGRAM_BOT_TOKEN`+`TELEGRAM_CHAT_ID` to ping on
  signup). Until those env vars are set it returns `{status:"pending"}` and logs the
  email (recoverable in Netlify function logs), so no early signup is lost.

## Feedback (no function on WaterDrop — reuses HAND's)
- The feedback modal POSTs cross-origin to HAND's shared function
  `https://handprotocol.org/.netlify/functions/feedback` (CORS `*`, OPTIONS handled)
  with `source: "WaterDrop"`, so notes pin into the Command Center
  (`command.feedback_pins`) + Telegram + email alongside the other apps. Each note also
  carries the active region as a tag (`region:austin`). Offline notes queue in
  localStorage and flush on reconnect.

## Email / Resend (for the updates list)
- **One domain for all apps.** `handprotocol.org` is the verified Resend sending
  domain (DNS added 2026-06-19; see `command/docs/resend-dns-setup.md`). Resend free
  tier = 1 domain — do NOT add `waterdrop.handprotocol.org` as a second domain.
- **Separate apps by audience + from-address, not domain.** WaterDrop sends as
  `WaterDrop <updates@handprotocol.org>` to its own Resend **audience**.
- **To turn on collection:** create a "WaterDrop" audience in Resend → set
  `RESEND_AUDIENCE_ID` (its UUID) + `RESEND_API_KEY` (the existing send-only key works
  for audience writes) on the **waterdrop** Netlify site → redeploy. Domain
  verification is NOT required to collect, only to send.
- **To send updates:** after the domain shows verified in Resend, set `EMAIL_FROM`.
  HAND AI / Resend can then email the WaterDrop audience.
- Client endpoint overrides (rarely needed): `VITE_FEEDBACK_ENDPOINT`,
  `VITE_SUBSCRIBE_ENDPOINT`.

## Crew (open, local-first)
- No passcode. Anyone joins by entering a name (+ optional group) in the "Join the
  crew" form; observations are authored under that name. `crewMode` persists across
  reloads (localStorage `wd-crew-unlocked`); "Exit crew" clears it. Identity in
  `src/features/crew/passcode.ts` (`joinCrew`, `crewName`, `crewTeam`, `isUnlocked`,
  `lock`).

## Future DB / accounts (deferred)
- Local-first via Dexie behind `src/lib/repository.ts`. To sync: create a separate
  Supabase project `hand-waterdrop` (HAND's data-sovereignty policy wants one project
  per app — do NOT reuse the command-center project), swap the repository impl, add
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Command-center Supabase creds (for
  reference only) are in `command/.env.local`.

## Region data
`src/data/ctx-*.ts` (one file per region) merged + region-tagged in `src/data/index.ts`;
all app code imports `@/data`. Region registry: `src/data/regions.ts`.
```
