# Owner-editable client site (template)

A single-page client site the owner edits themselves: server-rendered from a
database, with a passwordless `/admin/` (one-time email link) for every line
of copy, all photos (upload, reorder, caption, replace in place, featured
image), extra editors, and publish history with one-click restore. Edits go
live instantly. First built for ZeroBlur (2026-09-05); this directory is the
reusable template — **scaffold a client with the `hand-client-site` skill,
do not copy this by hand.**

## Engine vs site pack

Two kinds of files live here. The split is the whole point.

| | Files | Who edits |
|---|---|---|
| **Engine** | `netlify/functions/**`, `public/admin/**` (css + js; the shell is server-rendered), `scripts/**`, `tests/**`, `netlify.toml` (generated), `package.json`, `.gitignore` — listed in `ENGINE_FILES` | Nobody, per client. Fix once in `clients/_template`, run `sync-engine.mjs` to push to every client. |
| **Site pack** | `site.config.mjs` (identity, theme, fonts, logo, nav, seed media), `site/schema.mjs` (what the owner can edit + default copy), `site/page.mjs` (the layout), `public/assets/site.css` + `site.js` (design + effects), `public/favicon.svg`, `public/img/**`, `tests/page.test.mjs` (the layout's own test) | The person building the client's site. This is the only work per client. |

The engine reaches the pack only through `netlify/functions/lib/site.mjs`
(schema + renderer) and `lib/config.mjs` (config). A pack is therefore exactly
three contracts:

1. `site.config.mjs` — default export, validated by `normalizeConfig()`.
   Required: `slug`, `name`, `theme.{bg,ink,accent}`. See the file's comments.
2. `site/schema.mjs` — `SECTIONS`, `DEFAULT_CONTENT`, `CONTENT_KEY`.
   Validated at startup by `assertSections()`.
3. `site/page.mjs` — `renderPage({ content, media, origin }) → html string`.
   Compose from `lib/blocks.mjs` (head tags with theme injection, JSON-LD,
   CTA resolution, image tags with srcset, lightbox, footer links).

Two ways to build a client:

- **Fast path (same layout, new skin + copy):** edit `site.config.mjs`
  (theme, fonts, logo, nav labels) and `site/schema.mjs` defaults. No layout
  code. ~80 lines of edits.
- **Bespoke design:** keep the schema (or extend it), replace `site/page.mjs`
  + `site.css` + `site.js` with the client's design, composed from blocks.
  Porting an existing static design is mechanical: hardcoded copy →
  `${e(c.section.field)}`, `<head>` → `B.headTags()`, images → `B.img()`.

## How it works

```
public/                 static assets (CSS, JS, seed images, /admin/ app)
netlify/functions/
  render.mjs            GET /            server-renders the page from the DB (CDN-cached, tag = slug)
  content.mjs           GET /api/content copy + media + editing schema + site identity (public, read-only)
  review.mjs            GET /review + POST /api/review  guest review page: PIN pad, links, Claude writing helper (config.reviews)
  admin-page.mjs        GET /admin/      the owner editor, server-rendered in the site's theme (lib/admin-page.mjs + lib/theme.mjs)
  auth.mjs              /api/auth/*      magic-link sign-in → HttpOnly session cookie
  admin.mjs             /api/admin/*     publish copy, media CRUD + order + in-place replace, editors, revisions, bookings, payments
  lib/payments.mjs      /api/admin/payments  the owner connects their own Stripe (config.payments)
  lib/secrets.mjs       sealed owner keys in <prefix>_secrets (AES-256-GCM, HKDF of the session secret)
  lib/stripe.mjs        Stripe over fetch; keys from env or the sealed store (loadStripeKeys())
  lib/config.mjs        normalized site.config.mjs + derived names (tables, bucket, cookie, env prefix)
  lib/site.mjs          the ONLY import path from engine → pack
  lib/blocks.mjs        renderer building blocks (escaping, meta, CTA, images, lightbox)
  lib/sanitize.mjs      schema-driven sanitizer (unknown keys dropped, lengths clipped)
  lib/db.mjs            Supabase REST/Storage + Netlify cache purge; '/{media}' → '/<prefix>_media'
scripts/
  gen-migration.mjs     the Supabase migration from config (tables, RLS, bucket, seed rows)
  gen-netlify-toml.mjs  netlify.toml from config (Image CDN allow-list)
  make-placeholders.mjs placeholder SVGs in the site palette
  render-static.mjs     dist-preview/ from defaults for local design review (no DB)
tests/                  node --test; runs with no network, no DB
```

- **Rendering.** `GET /` loads the copy document + media rows and returns
  finished HTML (all owner text escaped). The CDN caches it 10 minutes under
  the slug tag; every admin write purges it, so edits are live immediately.
  DB unreachable → 503 with `Retry-After`; no DB configured → defaults + seed
  media (local preview).
- **Editing schema.** `site/schema.mjs` drives the admin forms and the
  sanitizer. Every publish writes a revision row; the History tab restores any.
- **Themed editor.** `/admin/` is rendered with the site's palette and fonts
  (`config.theme` + `config.fonts`); missing surfaces are derived from
  `bg`/`ink`/`accent` (`lib/theme.mjs`), and `config.theme.admin` sets the
  editor's feel (radii, label case, weights, primary-button fill). One
  brand's editor is pill-and-glow, another's is square gold hairlines.
- **Photos.** Browser resizes to ≤2400 px WebP, PUTs straight to a signed
  Supabase upload URL, then registers the row (after a HEAD check). Served via
  the Netlify Image CDN with responsive `srcset`. Replace swaps a file while
  keeping the slot. Seed rows are ordinary rows pointing at site-relative
  files (`/img/...`); "Remove all placeholders" clears the ones flagged.
- **Database.** Shared HAND Supabase project, tables `command.<prefix>_*`,
  RLS on with no policies (service role only). Storage bucket = slug.
- **The admin is one portal.** Sign-in lands on **Home** (what needs the
  owner now, then a tile for every place). A grouped menu (a rail on a
  computer, a bottom sheet on a phone) has a Find box. A phone dock shows
  Home · Bookings · Edit · Photos · Menu. Places are routes (`#home`,
  `#content/<section>`, `#payments` …) and come from one list,
  `destinations()` in `lib/admin-page.mjs`.
- **Payments** (`config.payments`, opt-in): the owner pastes one Stripe key.
  The engine checks it, creates the webhook endpoint, and seals both into
  `<prefix>_secrets`; only the account name, Live/Test and the last 4 are ever
  shown again. Env `<PREFIX>_STRIPE_SECRET_KEY` wins. A live site needs
  `gen-migration.mjs --secrets` applied before the deploy.
- **Setup.** `config.checklist` (from `site/checklist.mjs`) renders the
  Setup place in `/admin/`: each item carries `actions` (buttons that jump to a
  tab, section, or field, open the live site, or an external URL), an
  optional `check` (ticks itself from the content, the media, or the host),
  and prose fallbacks. Ticks save at once through `PATCH /api/admin/content`
  (one or more `<section>.<field>` values, sanitized like a full publish).
  `config.themes` adds the Looks picker: swatch cards, a full-screen preview
  of the live site in that look, and one-tap publish of the pick.
- **Auth.** Magic link (20 min, single use, 5/hour/editor), 30-day HttpOnly
  cookie, same-origin check on writes, no editor enumeration. Owners manage
  editors; `<PREFIX>_OWNER_EMAILS` auto-provisions owners on first request.
  Supabase Auth is deliberately NOT used (no custom SMTP on the project).

## Booking calendar (`config.booking`, request mode)

Opt in from `site.config.mjs` with `booking: BOOKING` (`site/booking.mjs`).
The `#book` section then renders `B.bookingBlock({ content })`: the customer
picks a service, a day (month calendar from `GET /api/booking/days`, or the
native date input without JS), a time (the owner's windows, or 30 / 60 minute
steps), fills in name / phone / email / how to reach them, the pack's
`intake` fields, where (address + city when `location.address`), and notes,
then **Request**. Requests are never exclusive: any number of people may ask
for the same time and the site never shows other people's requests.

The owner's settings are an engine-owned content section **`calendar`**
(hours, days off, windows, notice, horizon, jobs per day, two customer-facing
lines, all with `_es` twins) so every site shares the same keys; defaults
come from `config.booking.defaults`. The **Bookings** tab in `/admin/`
(`/api/admin/bookings…`, `lib/booking-admin.mjs`) is the back office:
Requested inbox with overlap chips, Confirm / Confirm at another time /
Decline, Confirmed by day with Reschedule / Completed / No-show / Cancel /
Note / `.ics`, Past, Declined and cancelled, Add a booking by hand, Block a
day, a month strip, and **Add to my phone's calendar** (`/calendar.ics?t=`,
a per-site secret). The owner's notification email carries one-tap Confirm
/ Decline links (`/api/booking/act`, derived from the booking id, single
use, 7 days): the GET only shows a small "Confirm Ana?" page (mail scanners
open links), its button POSTs, and the result is worded by what happened to
the customer mail ("has been emailed" only on a real send, else a prefilled
`sms:` button). Status writes are conditional on the status read (two
actions at once: one wins, the other gets a 409 and sends no mail). Customers get: request received (with a manage link to cancel
or ask for another time), confirmed (with a `.ics` and the what-to-expect
copy), new time proposed, declined, cancelled, and a reminder 23 to 24 hours
before (`booking-reminders.mjs`, `@hourly`). Recipients:
`<PREFIX>_BOOKING_NOTIFY` → `<PREFIX>_FORM_NOTIFY` → `booking.notify` →
`<PREFIX>_OWNER_EMAILS`; the first source with a usable address wins, and
the Bookings tab shows the resolved list ("Requests are emailed to: ...").
The owner notice is sent first and alone, with two retries. Nothing goes to Telegram.

Data: `<prefix>_bookings` (`scripts/gen-migration.mjs` adds it when the
config has a request-mode calendar; `--bookings` prints only that table for
a site that was live before). One timezone per site (`booking.tz`), all
math in `lib/booking.mjs` with `Intl`, DST-tested for America/Chicago.
Guards: honeypot, same-origin, six requests per IP per hour, every value
clipped and checked against the pack's field list before it is stored.

## Guest review page (`config.reviews`)

Opt in from `site.config.mjs` with `reviews: REVIEWS` (`site/reviews.mjs`).
`GET /review` renders a PIN pad in the site's palette; the right code (said
out loud by the owner, `reviews.pin` or `<PREFIX>_REVIEW_PIN`) reveals the
places to leave a review and a writing helper. The customer types a few notes
about their own visit, picks a sound and a length, and Claude streams back a
draft built ONLY from those notes: nothing they did not say is added,
criticism is kept, and it answers in the language they wrote in. A random
style card per request (opening move + shape) keeps two customers with
similar notes from getting similar text. Tools on the draft: Another take,
Shorter, More casual, Fix my typos (also for text they wrote themselves),
Undo, Copy, then a "now paste it" bar with the links. Nothing is posted for
them and nobody is filtered by star rating (that would be review gating).

Pieces: `netlify/functions/review.mjs` (routes + Netlify per-IP `rateLimit`),
`lib/review-core.mjs` (PIN check, same-origin, validation, prompt, the
streamed `claude-opus-5` call through `@anthropic-ai/sdk`, NDJSON out),
`lib/review-page.mjs` (the themed shell), `public/review/review.css|js`.
The core, the CSS and the JS are **shared byte-for-byte with
longhornwinetours** (the reference instance, review.longhornwinetours.com)
and themed only through `--rv-*` tokens: fix them once, copy them across.
Links and chips never appear in the page source; they arrive from
`POST /api/review { action: 'unlock' }`.

Needs `ANTHROPIC_API_KEY` on the Netlify site: use a key in its own
Anthropic workspace with a monthly spend limit, which is the real ceiling
(the PIN is a courtesy gate, the rate limit is per IP). Without the key the
page and links work and the helper says it is not set up. This is the
engine's only dependency: `sync-engine.mjs` copies the engine's
`dependencies` into a client's `package.json` and runs `npm install`, and a
deploy needs `node_modules` present (`netlify deploy --build` does not
install). English UI for now; drafts follow the customer's language.

## Multi-page packs, publish dir, fallback (2026-09-22)

- `site/page.mjs` may export `ROUTES` (`['/', '/about', …]`, "/" implied),
  `NOINDEX` and `renderNotFound({ content, media, origin, url })`;
  `renderPage` gets `route`, may be async, and may return a `Response`.
  `render.mjs` serves `/` (custom path); `page.mjs` has no custom path and
  serves the other routes through rewrites (`gen-netlify-toml.mjs` writes
  them: a function with a custom path is not reachable at its default URL).
  Unknown paths → the pack's not-found page with a 404; `/index.html` → 301.
  All of it is `lib/render.mjs`. `sitemap.mjs` lists the routes and yields to
  a static `sitemap.xml` (`preferStatic`).
- `netlify: { publish, managed }` (default `public`, `true`): a pack in an
  older repo keeps its files under another dir and its own `netlify.toml`.
  `favicon` (default `/favicon.svg`). `render: { fallback: 'defaults' }`
  serves the default copy, uncached, when the database is unreachable
  (default `'503'`).
- `reviews.links` may be a function of the content document (owner-pasted
  links); `reviews.tokens` overrides `--rv-*`. `forms.<name>.subject(data)`.
- External clients (own repo): `clients/_external`, synced like any other.

## Local preview

```bash
npm test                          # engine tests, no DB
node scripts/render-static.mjs && python3 -m http.server 8787 -d dist-preview
```

## Deploy

Own Netlify site per client, **not git-linked**; deploy from the CLI from
inside the client dir with the **cryptokoh** token:

```bash
cd clients/<slug>
NETLIFY_AUTH_TOKEN=<cryptokoh token> netlify deploy --prod --build --site <site-id> --message "…"
```

`--skip-functions-cache` when anything under `netlify/` changed. Bump
`assetVersion` in `site.config.mjs` when CSS/JS change (site and admin
assets both carry it).

Env vars on the site: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `EMAIL_FROM`, `<PREFIX>_SESSION_SECRET`; optional
`<PREFIX>_SITE_NAME`, `<PREFIX>_OWNER_EMAILS`. Netlify injects
`NETLIFY_PURGE_API_TOKEN` + `SITE_ID`. `<PREFIX>` = slug in UPPER_SNAKE
(or `envPrefix` in config).

## Gotchas (learned on ZeroBlur, do not re-learn)

- Supabase signed-upload `data.url` must be **string-concatenated** onto
  `/storage/v1`; `new URL(path, base)` with a leading-slash path drops the
  prefix → 404 "requested path is invalid".
- Any element with its own `display:` rule ignores the `hidden` attribute;
  both stylesheets carry a global `[hidden]{display:none!important}`.
- The generic hero headline is word-split into spans, so grepping the literal
  sentence in the HTML fails by design.
- Functions are v2 (`export default (req, context)` + `config.path`); the
  admin router parses `/api/admin/<head>/<second>/<third>` by hand.
- New Netlify sites default `built_with_badge_enabled: true`; provision
  disables it. Verify the served HTML has no `/.netlify/scripts/hud`.
