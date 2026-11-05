# KC Collective star guestbook

The old-style guestbook for the KC Collective site, drawn as a night sky. A visitor leaves the collective a message (first name, email, message) and a star with her first name joins the sky beside one of the thirteen named stars. If she opts in, Claude reads her message and designs her star (its name, a short line, colour, points, brightness, and which named star it sits beside) and screens the note for the admin. The admin gets the message by email with one-tap buttons; she gets a keepsake email with a link to remove everything.

Built 2026-10-30 ahead of the full site. **2026-10-31: the database is live on the HAND Supabase project (`command.kc_stars`, migration 061) and the handprotocol.org env vars are set. The code is not deployed (nothing committed yet), and there is no Anthropic key, so every star is a plain gold one until `ANTHROPIC_API_KEY` is set.** The island it powers is Nightbloom (`kc-collective/src/nightbloom/app.jsx`), which falls back to "Soon you can leave a message here" when `/api/stars` doesn't answer, so the page is safe to publish before this backend is.

## What is public and what isn't

| | Public sky | Admin email | Claude |
|---|---|---|---|
| First name | yes | yes | **never** |
| Email | **never** | yes (reply goes to her) | **never** |
| Message | only if she ticked "show my message" **and** the admin approved | yes | only if she ticked "Shape my star (uses AI)", with emails, phone numbers, links and @handles stripped first |
| Star (name, line, colour, place) | yes | yes | (Claude writes it) |
| Screening flag | never | yes | (Claude writes it) |

Screening: `spam`, `abuse`, `sexual`, `other` hold the star off the sky until the admin taps "Put the star on the sky", and get no keepsake email (the address may not be hers). `distress` is **not** held. The admin email is titled "Please reach out" so a person follows up.

Her keepsake never quotes her message back, so the form can't be used to send someone else words "from KC Collective".

## Files

| File | What |
|---|---|
| `lib/sky.mjs` | Sky size, the thirteen named stars, the palette. Shared by the server and the island (esbuild bundles it). |
| `lib/star-core.mjs` | Validation, redaction, the prompt, structured-output schema, the Claude call, placement, the public projection, signed links. No storage or site imports (the same pattern as `clients/_template/.../review-core.mjs`). |
| `lib/star-store.mjs` | Supabase REST store (schema `command` by default) + an in-memory store with the same shape. |
| `lib/claude-client.mjs` | The one Anthropic call over plain `fetch`, same shape as the SDK's `beta.messages.create`, so nothing needs installing. |
| `lib/star-mail.mjs` | The keepsake and admin emails, and the Resend call. |
| `lib/star-handler.mjs` | HTTP: `GET/POST /api/stars`, `GET/POST /stars/act`. Takes every dependency as an argument. |
| `lib/star-deps.mjs` | Real dependencies from env vars. |
| `netlify/functions/stars.mjs`, `star-action.mjs` | Thin Netlify Functions (v2, `config.path`, per-IP `rateLimit`) for deploying this folder on its own. |
| `../../netlify/functions/kc-stars.mjs`, `kc-star-action.mjs` | The same two functions on the handprotocol.org site, importing `lib/` from here. This is how it runs now. |
| `../../command/supabase/migrations/061_kc_stars.sql` | The live table, `command.kc_stars` on the HAND project (RLS on, service role only). Applied 2026-10-31. |
| `supabase/001_kc_stars.sql` | The same table in `public`, for when KC Collective has its own Supabase project (set `KC_STARS_SCHEMA=public`). |
| `tests/` | `npm test`: 25 tests, no network, no dependencies. |
| `scripts/dev.mjs` | `npm run dev`: the real handlers + the real page on http://localhost:8787/kc-collective/styles/nightbloom/, memory store, emails printed to the terminal, a stand-in for Claude unless `ANTHROPIC_API_KEY` is set. |

## Claude

`claude-opus-5-5` at `effort: "low"`, structured output (`output_config.format` with a JSON schema, so the reply always parses), `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) so a safety-classifier decline is retried on Anthropic's recommended model. The SDK client has an 8s timeout and no retries: Netlify cuts a sync function at 10s, and on any failure she gets a plain gold star while the admin still gets her message (`ai_status = 'failed'`). Roughly 1 to 2 cents a star (about 1,000 tokens in at $4/M, a few hundred out at $20/M including low-effort thinking; `max_tokens` 2000 caps one star at about 4.5 cents). `claude-haiku-5-5` ($0.10/$0.50 per M) is about a fortieth of that, a few hundredths of a cent, if cost matters more than the writing (change `MODEL` in `star-core.mjs`). Stars without the AI box cost nothing. The prompt lives in `buildStarPrompt()` and fences the note as data, not instructions.

Spend is bounded by `KC_STARS_DAILY_CAP` (default 120 stars a day across everyone), per-IP and per-email limits counted in the table itself (3 per IP per 10 min, 10 per IP per day, 2 per email per day), and Netlify's per-IP rate limit on the route. Also set a monthly spend limit on the API key's workspace.

## Going live

Now (on handprotocol.org, beside the review page at /kc-collective/styles/nightbloom/):

1. ~~Table~~: done, `command.kc_stars` on the HAND project (migration 061, recorded in `schema_migrations`). A real POST and GET through the bundled functions were run against it on 2026-10-31 and the test row deleted.
2. ~~Env vars on the `handprotocol` Netlify site~~: done for `KC_STARS_SECRET`, `KC_STARS_EMAIL_FROM` (`KC Collective stars <hand@handprotocol.org>`), `KC_STARS_ADMIN_EMAIL` (`hand@handprotocol.org` until Kimberly's address), `KC_SITE_URL` (`https://handprotocol.org`), `KC_SKY_PATH` (`/kc-collective/styles/nightbloom/#sky`). `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` were already there. **Still missing: `ANTHROPIC_API_KEY`** (the Command Center site's is set but empty). Netlify Free can't scope env vars, so they're visible to builds too.
3. **Deploy = commit to main** (the site deploys from main): `kc-collective/stars/` (not `node_modules`), `web/kc-collective/`, `netlify/functions/kc-stars.mjs`, `netlify/functions/kc-star-action.mjs`, `command/supabase/migrations/061_kc_stars.sql`. The repo is public; the rest of `kc-collective/` (the creative brief PDF, the video, the copy deck) should stay out of it.
4. Walk it once for real: leave a star (AI on once the key is set), check both emails arrive, tap approve, see the message on the sky, tap remove from the keepsake.

Later, when the KC Collective site is scaffolded with `/hand-client-site`: copy `lib/` into its `netlify/functions/lib/` and the two function files into its `netlify/functions/`, and move the rows to its own project if it gets one.

When the site's own admin exists, add a Stars panel there (list, approve, hide, delete). Until then the admin works from the email buttons and the Supabase table editor.

## Decisions still open

1. **The privacy wording.** The form says Anthropic "does not use it to train its models". That matches Anthropic's commercial API terms as I understand them, but check it (and whether to mention Anthropic's retention period) before launch. If the wording changes, bump `PRIVACY_VERSION` in both `lib/star-core.mjs` and `kc-collective/src/nightbloom/app.jsx`. The server only accepts AI consent given against the current wording.
2. **How long to keep messages.** Nothing expires now. A yearly clean-up of hidden or held rows, or of message text after N months, is easy to add.
3. **Sender and admin addresses.** No KC Collective domain or inbox yet (see HANDOFF open question 2).
4. **Brand on the page.** The new copy says "KC Collective" (per the 2026-10-30 creative brief); the rest of Nightbloom still says KC Collective.
