# Handoff: client-site engine + skill · 2026-10-15 (admin portal + owner-connected Stripe added)

**For whoever picks up the owner-editable client sites next (engine, skill,
and the booking-calendar plan).** Per-client state lives in each
`clients/<slug>/HANDOFF.md`; this file is the engine's own handoff. The
scaffold never copies it into a client (`HANDOFF.md` is in its skip list).


## 2026-10-15: the admin is one portal, and owners connect their own Stripe (template + PrecisionFix; LIVE on PrecisionFix the same day, migration 054 applied, commit `bc9581e`)

koH's goal: "a much cleaner path for clients with booking to manage their booking system, including being able to add a stripe key with instructions in our setup, the admin portal should have a better flow, right now it just shows the themes at the first, but should be a portal into their whole admin with a small menu allowing them to find everything extremely conveniently on mobile".

**Built (engine, in `clients/_template`; copied file by file into `clients/precisionfix`, see below):**

- **Portal** (`lib/admin-page.mjs`, `public/admin/admin.js|css`): the tab bar is gone. Sign-in lands on **Home**: a bookings card (waiting count, next confirmed job, Answer / Add a booking / Hours), a setup card (n of N, next step, Continue), a payments card, a site card, then a tile for every place. **One list of places**, `destinations()`, feeds the menu (rail ≥900px, bottom sheet below, with Find), the Home tiles, and the phone dock (Home · Bookings-or-Setup · Edit · Photos · Menu). Routes `#home #bookings #content #content/<section> #media #look #payments #setup #editors #history` go through `history.pushState`, so the back gesture works. Below 1200px, Words and info shows a section list, then one section at a time. Find ranks name matches first and focuses the field. New **Look** screen (the Looks picker on its own page). The Setup tab no longer opens first; the old "Setup jumps to the front" ordering code is deleted. `bookings/summary` returns `next` + `tz` (edited in both copies of `lib/booking-admin.mjs`).
- **Payments** (`config.payments`, `normalizePayments()`, `PAYMENTS`): `lib/secrets.mjs` (AES-256-GCM, HKDF of `<PREFIX>_SESSION_SECRET` or the service-role key, salt = slug), `lib/payments.mjs` (`GET/DELETE /api/admin/payments`, `POST …/connect`, `POST …/refresh`; `classifyKey()`, `webhookUrl()`), `lib/stripe.mjs` moved into the engine from PrecisionFix with `loadStripeKeys()` / `setStoredStripeKeys()` / `stripeKeySource()` / `stripeRequest()`. Entry points await `loadStripeKeys()`: `lib/render.mjs`, `booking.mjs`, `booking-reminders.mjs`, `admin.mjs`. `tables.secrets` exists only with `config.payments`, so a stray `{secrets}` query throws. `gen-migration.mjs` grows `secretsTableSql()` and `--secrets`. Checklist: tab targets `home | look | payments`, check kind `stripe`. Template pack: commented `payments` in `site.config.mjs`, `HAS_PAYMENTS` + a `payments` item in `site/checklist.mjs`.
- **Tests:** `tests/payments.test.mjs` (10; the 3 flow tests skip without `config.payments`); `booking-admin` / `booking-api` tests updated for the new markup, summary, and the loader's read. Template **147 pass, 12 skipped, 0 fail**; PrecisionFix **160 pass, 0 fail** (its date-bound "Thursday" deposit test, failing before this session, now matches any weekday).
- **Walked in headless Chromium** against a local harness (real `renderAdminPage()` + admin.js/css, fake `/api/*`; rebuild it from `renderAdminPage()` the way the 2026-09-16 Bookings harness was): 38 checks at 390 / 1024 / 1280. Results: Home first, dock 5 buttons, sheet opens, Find "phone" lists Phone number first and focuses it, back gesture, Hours card lands on `#content/calendar`, Connect Stripe nudge in Bookings, `pk_` refused in words, rk_live connects, field cleared, still-checking warning + Check again, Setup Stripe item ticks itself, Look screen, an editor gets no "Who can edit" and `#editors` falls back to Home. No overflow at any width. Zero console errors except the 400 the `pk_` refusal returns by design. Not exercised: a real Stripe account, a real database, a deployed site.

**PrecisionFix copy:** identical engine files copied in (`admin-page`, `admin.js|css`, `checklist`, `html`, `stripe`, `secrets`, `payments`, `admin.mjs`, `payments` + `checklist` tests). Its drifted files edited by hand: `config.mjs` (`normalizePayments`, `PAYMENTS`, `favicon`, `tables.secrets`), `render.mjs`, `booking.mjs`, `booking-reminders.mjs`, `gen-migration.mjs`, `booking-admin.mjs`. **The rest of the drift is unchanged** (deposit / car / pricing still live only in PrecisionFix; `sync-engine.mjs --all` would still clobber them). Do the engine lift before any blanket sync.

**Ship (koH's go needed; production DB + Alex's live site):** apply `command/supabase/migrations/054_precisionfix_secrets.sql` through the management API and record it. Then rsync `clients/precisionfix` → `~/Documents/precisionfix-site`, commit, and push `HEAD:main` as cryptokoh; it auto-deploys on Alex's Netlify. The code tolerates a missing table (the loader logs and acts "not connected"), but migrate first anyway. Then sign in, open Payments, and connect an `rk_test_` key from a Stripe sandbox. Book a test, confirm it, pay with 4242, and check the deposit chip turns paid. Disconnect, and check the endpoint is gone in Stripe.

**Open:**

- PrecisionFix's `productionUrl` still says precisionfix-austin.netlify.app. The webhook uses the owner's origin, so this does not matter here, but canonical / sitemap / email links may.
- Spanish strings for the portal and Payments: none yet, the admin is English-only as before.
- Legacy Care and Three Hands Healing were NOT synced (no booking, unrelated local edits in Legacy Care's git status).
- koordi note for the cutover: `koordi/docs/research/2026-10-15-engine-admin-portal-and-stripe-connect.md`.

## 2026-09-21: guest review page added to the engine (template only, no client synced)

New opt-in feature `config.reviews` (README: "Guest review page"): `/review` behind a PIN pad,
review links, and a Claude writing helper. Built first for Long Horn Wine Tours
(`~/Documents/lhwt`, HANDOFF there, 21 Sep section); `lib/review-core.mjs`,
`public/review/review.css` and `review.js` are the same files in both places.

- New engine files: `netlify/functions/review.mjs`, `lib/review-core.mjs`, `lib/review-page.mjs`,
  `public/review/*`, `tests/review.test.mjs` (all in `ENGINE_FILES`); `lib/config.mjs` gained
  `normalizeReviews()` + `REVIEWS`; pack file `site/reviews.mjs`; commented opt-in in `site.config.mjs`.
- First engine dependency: `@anthropic-ai/sdk` (`package.json`). `sync-engine.mjs` now carries
  engine `dependencies` into each client and runs `npm install`; `--check` reports dependency drift.
- State: template tests 111 (106 pass, 5 skipped as before, 0 fail). `sync-engine.mjs --check`
  shows legacy-care-llc, precisionfix and three-hands-healing behind by exactly these files.
  **Nothing was synced or deployed.** Syncing is safe for a client that does not opt in (the
  function answers 404), but its next deploy needs `node_modules`, which the sync installs.
- Not verified: a call to the real model (no Anthropic key on the build machine). Everything else
  ran end to end against a mock of Anthropic's streaming endpoint, in headless mobile Chrome.
- To switch a client on: fill `site/reviews.mjs` with the owner's REAL links, import + set
  `reviews: REVIEWS`, set `ANTHROPIC_API_KEY` on its Netlify site, bump `assetVersion`, deploy.
- Later, if wanted: Spanish UI strings (drafts already follow the customer's language), a
  Reviews item in the Setup checklist, a printable QR code in `/admin/`.

## Orient in one paragraph

`clients/_template` is the engine every owner-editable client site runs on
(Netlify Functions v2, passwordless `/admin/`, Supabase tables per client).
Three sites are on it and live: PrecisionFix, Legacy Care LLC, Three Hands
Healing (ZeroBlur is the pre-template original). On 2026-09-16 the Setup tab
was rebuilt so the owner never types a URL or hunts for a section: every
step is a button, steps tick themselves where the site can tell, ticks save
on the spot, and a Looks picker previews the real site in each theme and
publishes the pick in one tap. The `hand-client-site` skill now documents
this as Phase 3b and the template ships a universal checklist. The same
night the **booking calendar** (phase 1, `request` mode) was built on the
engine and went live on PrecisionFix: service → day → time → details on the
site, requests the owner confirms from a Bookings tab or a one-tap email
link, emails with `.ics`, reminders, a phone calendar feed. Nothing in this
repo is committed; koH commits when he asks.

## Phase 2, the PrecisionFix slice: part 1 LIVE on PrecisionFix 2026-09-17, part 2 still to build

koH's decisions: build the **PrecisionFix slice** of phase 2 first (what
improves the live `request` calendar; `instant` mode waits for a pilot) and
**fix the privacy leak first**. On 2026-09-17 he said "show me the changes or
just push them": items 1 to 5 below went **live on PrecisionFix**
(`assetVersion` `20260917a`, deploy `6aac3af92e2dc1f6115115f8`; the deploy it
replaced, for a rollback: `6aab30174ca4af1b8e337215`). Migration **048 applied
and recorded** the same day, *before* the deploy. Nothing is committed. Legacy
Care and Three Hands Healing carry the same engine but were not redeployed (no
calendar there, nothing visible changes).

**THE RULE THAT SHIP FOLLOWED, and the next one must: migrate first, deploy
second.** `lib/booking-db.mjs` names `reminder_soon_sent_at` in its `SELECT`
list; PostgREST rejects an unknown column, so code-before-migration fails
*every* bookings query on the live site (Bookings tab, manage pages, the
feed). The same will be true of the reschedule columns. How it was done
safely, repeatable: (1) `netlify deploy` **without** `--prod` for a draft URL
(scheduled functions do not run on drafts); (2) apply the migration through
the management API, `notify pgrst, 'reload schema'`; (3) hit the **draft's**
`/booking/manage?t=<43 A's>`: 404 means the new `SELECT` ran against the
migrated database, 500 means stop; (4) `--prod`; (5) repeat the same probes on
production plus `/api/booking/act` (303 `link-used`) and `/api/content`
(`viewer: public`).

Done so far:

1. **Text / Call radios misaligned on phones** (koH's report, all themes, not
   only redline). `.field input{width:100%;padding…}` in the pack's `site.css`
   also matched the radios inside `.field--choice`, stretching them to 87px
   and 91px. Fixed in `.choice input` (PrecisionFix + template `site.css`;
   `site.css` is pack-owned, not an engine file). Verified 5 themes × 320 /
   390 / 1440. PrecisionFix `assetVersion` → `20260916d`.
2. **`.ics` semicolons were never escaped.** `'\;'` in a JS string is `;`, so
   `icsText()` was a no-op for them; two tests had the mirror-image regex
   mistake (`/\;/` matches a bare `;`) and asserted the bug. Low severity.
3. **Privacy: `GET /api/content` is public and returned the whole `calendar`
   section**, including the day-off note labelled "only you see it". Verified
   on the live site (0 rows exposed at the time). Now: schema fields and list
   columns may carry `private: true`; `lib/sanitize.mjs publicContent()` strips
   them; `functions/content.mjs` serves the stored document to a valid session
   (`viewer: 'editor'`) and the stripped one to everyone else (`viewer:
   'public'`). **Never give an editor the stripped copy**: `admin.js` rebuilds
   `calendar.blackouts` from its `/api/content` fetch and PATCHes the whole
   list, so a stripped copy erases every note on the next Block a day. For the
   same reason a failed editor lookup is deliberately *not* caught.
   **`private` guards `/api/content` ONLY.** `render.mjs` hands the full stored
   document to `renderPage()`, and that HTML is CDN-cached: a template that
   reads a private field publishes it. A sentinel test pins this.
4. **2-hour reminder.** `functions/booking-reminders.mjs` now runs two kinds
   (`REMINDERS`): `day` (23 to 24 h out, `reminder_sent_at`) and `soon` (2 to 3
   h out, `reminder_soon_sent_at`). `soon` is silent before 7 AM and from 9 PM
   site time (a Morning window *starts* at 8:00; nobody wants mail at 5:30), so
   a booking starting 8:00 to 9:59 AM gets only the day-before one, by design.
   Its copy says "today", never "in 2 hours": a window booking may be hours
   into its window. Owner setting `calendar.reminders` = `both` (default) |
   `day` | `none`.

5. **Moving a booking never re-armed its reminder** (phase 1 bug, found while
   adding the second marker). `transition(…, 'reschedule')` changed `starts_at`
   but left `reminder_sent_at` set, so a job moved from tomorrow to next week
   *after* the day-before email went out got no reminder for the new date. It
   now nulls both markers. Any future action that changes `starts_at` (the
   customer reschedule below) must do the same.

Test counts at this point: template 101 pass + 5 skipped, PrecisionFix 107,
Legacy Care 100 (+5 skipped), Three Hands Healing 101 (+5 skipped); engine
drift-free. Sync only after a green template run: `sync-engine --all --test`
stops at the first failing client and leaves the rest unsynced.

Security review of item 3 (ecc:security-reviewer, 2026-09-16): no path to the
editor document without a valid session, no cache replay (`json()` is
`no-store`), no sequence where the admin saves a stripped copy (content loads
only after the editor is confirmed; an expired session 401s before any write).
Open, pre-existing, NOT fixed this session:

- LOW: **Block a day overwrites from stale state.** `admin.js` PATCHes the
  whole `blackouts` list from `state.published`, fetched once at boot; a second
  editor or tab adding a day off in between gets silently reverted. Re-fetch
  before submitting, or add an append endpoint.
- LOW: **session secret falls back to `"::<slug>"`** when both
  `<PREFIX>_SESSION_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are unset
  (`lib/session.mjs secret()`). Needs a leaked editor UUID too, and implies a
  non-functional deployment, but it should throw rather than derive a guessable
  secret. Tests call `signSession()` without env, so change it with care.
- INFO: `/api/content` returns the schema (labels, which fields are private)
  to everyone. Metadata only.

Still to build in the slice: **busy-feed import** and a **true customer
reschedule** (today "Ask for another time" cancels and sends them back to
`#book`). Busy-feed design constraints from the review: the owner's calendar
`.ics` address is a bearer secret, so it goes in a **dedicated private table**,
never the content document (served whole to every editor, kept in 30
revisions as plain jsonb, and cached in the admin's `localStorage` draft);
the server-side fetch allows `https` only, resolves DNS itself and rejects
private / loopback / link-local / multicast ranges on **every redirect hop**
(v4 and v6, cap 3 hops), caps size and time, and never logs the URL (hostname
only; keep it out of `err.message`, which `handleError()` passes through on
non-5xx).

Preview gotcha that cost a false verification: `npm run preview` rewrites only
`dist-preview/index.html`. The per-theme folders (`dist-preview/<theme>/`) are
rendered only by `node scripts/render-static.mjs --theme=<id>` and go stale
silently; on 2026-09-16 `redline/` still held the pre-calendar form. Re-render
every theme before trusting a themed preview.

## What shipped on 2026-09-16 (night): booking calendar, phase 1 (`request` mode)

Built on the engine, PrecisionFix as the pilot, **deployed by CLI and
verified live** (`assetVersion` `20260916c`). Tests: template 86 pass (5
HTTP-level tests skip on sites without a calendar), PrecisionFix 92, Legacy
Care 85, Three Hands Healing 86; all three clients synced. koH's decisions
held: no Telegram, requests are never exclusive, the owner confirms into a
Confirmed section, the Bookings tab is a real back office.

**Opt in:** `booking: BOOKING` in `site.config.mjs` from `site/booking.mjs`
(`mode: 'request'`, `tz`, `services(content)`, `intake[]`, `location`,
`notes`, `contact`, `notify`, `defaults`). `lib/config.mjs normalizeBooking()`
validates it; `BOOKING` is the request-mode calendar or null; `external`
mode passes through untouched (`booking_url` keeps working).

**Where things differ from the plan, on purpose:**

- The owner's settings are an **engine-owned content section `calendar`**
  (`lib/booking.mjs bookingSection()`, appended in `lib/site.mjs` before
  `setup`), not a pack schema section, so every site shares the same keys:
  `hours` (rows day / from / to, dropdowns in 30-minute steps), `blackouts`
  (`date` with `ui: 'date'` + note), `mode` (`windows | 60 | 30`), `windows`
  (label, label_es, from, to), `lead`, `horizon`, `max_per_day` (a warning
  chip, never a block), `confirm_within(_es)`, `expect(_es)`. Defaults =
  engine defaults overlaid with `config.booking.defaults`; PrecisionFix keeps
  its own `booking` section for the copy around the form.
- **Tokens are derived, not random:** `lib/booking-token.mjs` HMACs the
  booking id with the session secret (`manage`), id + created_at (`act`,
  single use: the hash is cleared on first use, 7-day expiry), and the slug
  (`feed`). Every customer email can carry the same working manage link and
  the database holds only hashes.
- Admin routes live in **`lib/booking-admin.mjs`** and are reached through
  `admin.mjs` (`/api/admin/bookings…`), not a separate function, so the
  session, same-origin and role checks are the same code.
- Phone required, email optional (a mechanic texts); no `held` status, no
  `<prefix>_busy`, no `resource_key` in phase 1.

**Engine files (all in `ENGINE_FILES`):** `lib/booking.mjs` (settings
section, `settingsFrom()`, Intl timezone math with DST tests,
`openDays()` / `offeredTimes()` / `findSlot()`, overlap, day counts, display
strings, `.ics` writer), `lib/booking-form.mjs` (`bookingBlock()` = the
`#book` form, and `buildBookingRow()` = request validation, both take a
`booking` fixture in tests), `lib/booking-db.mjs`, `lib/booking-email.mjs`
(owner new / owner cancelled / received / confirmed + `.ics` / proposed /
declined / cancelled / reminder, EN/ES), `lib/booking-page.mjs` (the
customer's manage page), `lib/booking-admin.mjs` (state machine
`transition()` + `applyAction()`, routes), `lib/booking-act.mjs` (email
one-tap), `lib/booking-token.mjs`, `functions/booking.mjs` (public API +
`/booking/manage` + `/calendar.ics`), `functions/booking-reminders.mjs`
(`@hourly`, 23 to 24 h before, marks `reminder_sent_at`),
`public/booking/booking.js` + `booking.css` (the widget: month calendar,
time pills, JSON submit, bilingual through `<html lang>`; without JS the
native date input + time dropdown post to the same endpoint), Bookings tab
in `lib/admin-page.mjs` / `admin.js` / `admin.css`, `lib/checklist.mjs`
(`booking` check kind, `bookings` tab action), `lib/sanitize.mjs
applyPaths()` now replaces a list from an array (Block a day),
`lib/email.mjs sendEmail()` + `emailShell()` shared with forms,
`scripts/gen-migration.mjs` (bookings table when `BOOKING`; `--bookings`
emits the add-on file for a live site). Migration
`command/supabase/migrations/047_precisionfix_bookings.sql` applied and
recorded 2026-09-16.

**Verified live on PrecisionFix (2026-09-17 00:10 UTC):** a request through
the real widget at 390 wide (12 open days, three windows, thank-you with the
summary and the manage link, zero console errors); both emails accepted by
Resend (owner to hand@handprotocol.org with Confirm / Decline / Open in the
editor, customer got-your-request with the manage link); signed in with a
minted token: Bookings tab first with badge 1, the card with car / where /
notes / tel / sms / mailto, **Confirm** moved it to Confirmed and emailed
the customer with the `.ics`, `.ics` download served, feed link present,
Setup shows 14 items and **Set my hours** lands on the hours list with its
first dropdown focused; a second request declined through a **derived
one-tap link** (303 to `/admin/?toast=declined&booking=…#bookings`, hash
cleared, second use → `link-used`); the manage page showed the request then
Confirmed. Both test rows were deleted afterwards; the table is empty and
the content row is untouched.

## Next session: what is left around the calendar

1. **PrecisionFix mirror repo is stale.** `clients/precisionfix/` changed
   (pack + engine) but `~/Documents/precisionfix-site` was not rsynced or
   committed (koH said do not commit). Recipe in
   `clients/precisionfix/HANDOFF.md`; do it before Alex starts editing from
   his phone.
2. **Owner notifications** still go to `PRECISIONFIX_FORM_NOTIFY` =
   hand@handprotocol.org (the booking code reads `PRECISIONFIX_BOOKING_NOTIFY`
   first, then that). Switch to Alex when koH says so.
3. **Send Alex the message** in his handoff; his first sign-in lands on
   Setup with the three new items (hours, test booking, phone calendar).
4. **Phase 2 candidates** (from the plan): `instant` mode for healers
   (exact slots from durations + buffers, auto-confirm, address on
   confirmation), busy-feed import from the owner's own calendar, 2-hour
   reminder, a week grid in the Bookings tab, a dedicated hours field type,
   SMS after 10DLC, deposits on the owner's Stripe.
5. **Polish seen while building:** the desktop Bookings list was checked on
   fixture data only (the live pass ran at phone width); Legacy Care and
   Three Hands Healing carry the new engine but were not redeployed (no
   calendar there, nothing visible changes).

## What shipped on 2026-09-16 (evening): site actions open the site

koH reported that the Setup tab's **Send yourself a test booking** button
opened another admin page. Cause: a `site` action with target `#book` was
handled by `window.open('#book')`, which the browser resolves against
`/admin/`, so a new tab opened `/admin/#book`. Fix (engine, synced to all
three clients, 51/52/50/51 tests pass): `lib/checklist.mjs` makes every
`site` target root-relative (`#book` → `/#book`) and renders `site` actions
as real links (`<a href="/#book" target="_blank" rel="noopener">`, no JS),
and `admin.js` resolves any remaining `site` button against
`location.origin + '/'`. PrecisionFix redeployed by CLI (`assetVersion`
`20260916b`) and verified signed in with Playwright at 390 wide: the button
is a link to `/#book`, clicking it opened the live site's booking section,
zero console errors. Legacy Care and Three Hands Healing received the sync
but were not redeployed (no checklist there, nothing visible changes).

Also written: `reference/booking-platform-research.md`, the answer to
"self-host Cal.com or build our own?" (Cal.com went closed source on
15 April 2026; cal.diy is MIT but personal-use only and lacks teams/orgs;
Tymeslot and Easy!Appointments are single-tenant; recommendation: build the
plan's own module, keep `external` mode). Linked from the plan and the skill.

## What shipped on 2026-09-16

**Engine (`clients/_template`, synced to all three clients with
`sync-engine.mjs --all --test`):**

- `netlify/functions/lib/checklist.mjs`: items accept `actions`
  (`tab | section | field | site | url | looks`), `check`
  (`field | value | media | host`), `embed: 'looks'`; validation per kind
  (bad tabs, paths, `javascript:` URLs dropped); `looksHtml()` renders the
  swatch cards; `checklistHtml(source, themes)` renders buttons, check
  attributes, the embedded grid, and a "Done automatically" label.
- `netlify/functions/lib/config.mjs`: `normalizeThemes()` → `config.themes`
  (`{ field: 'site.theme', options: [{ id, label, blurb, swatch, fontDisplay }] }`,
  swatch falls back to the site palette; `null` when absent).
- `netlify/functions/lib/sanitize.mjs`: `applyPaths(sections, base, set)`
  sets `'<section>.<field>'` values on a copy of the document, refuses
  unknown paths and lists (400).
- `netlify/functions/admin.mjs`: `PATCH /api/admin/content { set }` →
  stored doc (or defaults) + `applyPaths` → the normal `publishContent`
  (sanitize, store, revision, purge). Editor + same-origin checks as PUT.
- `netlify/functions/lib/admin-page.mjs`: new Setup intro copy; when
  `config.themes` exists, a `<template id="looks-tpl">` and the full-screen
  preview overlay (`#preview`, iframe + bar: ‹ name › · Use this look ·
  Close) are rendered after the app root.
- `public/admin/admin.js`: `renderSetup()` evaluates checks client-side,
  ticks call `patchContent()` at once, done tasks collapse (`is-open`
  toggles on the head), the Setup tab moves first while work is left and
  the first sign-in per session lands on it; `runAction()` handles the
  button kinds (section/field scroll + `is-flash` highlight + focus);
  Looks: `openPreview()` / `stepPreview()` / `useLook()` (patches the theme
  field and ticks the task with `embed="looks"`), `looksPicker()` clones the
  template into the Content tab for a `select` field with `ui: 'looks'`;
  `fieldEl` output carries `data-path="<section>.<field>"`.
- `public/admin/admin.css`: `.task__actions`, `.task.is-auto`, collapsed
  done tasks, `.is-flash`, `.looks` / `.look` cards on `--look-*` variables,
  `.preview` overlay, phone tweaks.
- Tests: `tests/checklist.test.mjs` (actions, checks, embeds, looks grid),
  `tests/sanitize.test.mjs` (`applyPaths`), `tests/config.test.mjs`
  (`normalizeThemes`), `tests/admin.test.mjs` (template + overlay only with
  themes). Template: 51 pass. Clients: PrecisionFix 52, Legacy Care 50,
  Three Hands Healing 51.

**Template site pack:** `site/checklist.mjs` (universal items; consts
`SITE`, `DOMAIN`, `OLD_SITE`, `CODE_ACCESS`, `HAS_LOOKS`), imported by
`site.config.mjs` as `checklist: CHECKLIST` with a commented `themes`
example; `HANDOFF.template.md` and `README.md` mention the Setup tab.

**Skill (`.claude/skills/hand-client-site/`):** `SKILL.md` gained **Phase 3b,
Setup tab** (rules: the button is the step, let it tick itself, one verb per
line, a done line on every item, phone-first, never make the owner type a
URL; how the Looks picker is wired), updated engine-features bullets, the
PrecisionFix instances row, and a "Planned: booking calendar" section.
`scripts/scaffold.mjs` stamps `SITE` and takes `--domain=`, `--old-site=`,
`--code-access`. `reference/brief-template.md` (+3 questions),
`reference/verify-checklist.md` (+Setup and Looks checks),
`reference/booking-calendar-plan.md` (new). Root `TODO.md` has the Soon line.

**PrecisionFix pack:** `site/themes.mjs` `themePickerOptions()`;
`site.config.mjs` `themes`, `assetVersion: '20260916a'`; `site/schema.mjs`
theme field `ui: 'looks'` and help without `?theme=`; `site/checklist.mjs`
rewritten around buttons (12 items; `copy` checks `contact.email`,
`search_console` checks `seo.google_verification`, `domain` checks the
host). Mirrored to the private repo `HandProtocol/precisionfix-site`
(commit `190e156`); read `clients/precisionfix/HANDOFF.md` for the rest.

## Live state

| Site | URL | Asset version | Deployed | Setup tab |
|---|---|---|---|---|
| PrecisionFix | precisionfix-austin.netlify.app | `20260917a` | 2026-09-17 by CLI (git pushes do not build: Free plan + private org repo) | 14 items, Looks picker, **booking calendar live**, no-photo hero, phase 2 part 1 (migration 048); verified live, not signed in this time |
| Legacy Care LLC | legacy-care-llc.netlify.app | `20260916a` | 2026-09-16 by CLI | none yet (no `site/checklist.mjs`) |
| Three Hands Healing | three-hands-healing.netlify.app | `20260916a` | 2026-09-16 by CLI | none yet |
| ZeroBlur | zeroblur.netlify.app | n/a | untouched | not on the template |

Deploy recipe (all three): `cd clients/<slug> && NETLIFY_AUTH_TOKEN=<cryptokoh token from ~/.config/netlify/config.json, user id starting 65ff678f> netlify deploy --prod --build --skip-functions-cache --site <netlifySiteId>`.
Bump `assetVersion` first whenever `public/admin/*` or `public/assets/*`
changed (Legacy Care's config is JSON-quoted: `"assetVersion": "…"`, so a
`sed` written for single quotes misses it).

## How the Setup tab was verified (repeatable)

1. Mint a login token for the HAND inbox: generate 32 random bytes as
   base64url, insert its sha256 hex into `command.<prefix>_login_tokens`
   (`editor_id` of hand@handprotocol.org, `expires_at = now() + 20 min`)
   through the Supabase management API (token in the GNOME keyring, see the
   `hand-supabase-mgmt-api-access` memory). Single use.
2. Playwright from `~/.claude/skills/gstack/node_modules/playwright` with
   `--no-sandbox`, open `/admin/?t=<token>`, wait for `#shell:not([hidden])`.
3. Checks that passed on PrecisionFix: active tab `setup`, tab order
   `setup,content,media,editors,history`, progress "n of 12 done · next: …",
   no horizontal overflow at 390 and 1440, Preview sets the iframe to
   `/?theme=<id>` and the frame's `data-theme` matches, Use this look flips
   `data-theme` on `/` within a second with the save bar hidden and the
   theme task ticked, a manual tick survives a reload without Publish,
   "Check the phone number" lands on Content with `contact.phone` focused,
   the Content tab shows the five-card picker, zero console errors.
4. Gotchas for the script: click `.task__check` (the label), not the hidden
   `<input>`, or the drawn box intercepts the click; a done task is
   collapsed, so expand it (`.task__head`) before touching its Looks grid;
   preview a look that is not live (`.look:not(.is-live)`), the live look's
   Use button is hidden and the overlay button is disabled by design; wait
   for the overlay with `state: 'hidden'`, not visibility.
5. Leave the site as the owner should find it: the verification switched
   looks and back and unticked the theme task; `/api/content` shows
   `source: db`, theme `redline`, every `setup.*` false.

## Gotchas learned

- Playwright full-page captures of `/admin/` draw the sticky top bar at the
  scroll position, mid-page. Not a layout bug; capture the viewport or crop.
- The Looks picker cards use each theme's display font through `--look-font`;
  the fonts load because the admin page already links the site's Google CSS.
  A theme whose fonts are not in the admin's `fonts.googleCss` shows a
  fallback face on its card only.
- `config.themes.field` must be `'<section>.<field>'` of a `select` in the
  schema; `applyPaths` refuses anything else, so a typo shows up as a 400 in
  the editor, not a silent no-op.
- Netlify Free cannot git-deploy private repos owned by a GitHub org
  (`deploy_private_corp_repos` off for cryptokoh): the link looks healthy,
  the link-time build passes, every push fails "Unsupported repository
  type." Deploy by CLI or move the repo (memory
  `hand-netlify-free-private-org-repos`).

## Uncommitted state (koH commits when he asks)

Everything above is uncommitted in the monorepo. A commit for this
workstream would take: `clients/_template/` (all new), `clients/precisionfix/`
(all new), `clients/three-hands-healing/` (new), `clients/legacy-care-llc/`
(modified engine files + new `checklist.mjs`, `forms.mjs`, `sitemap.mjs`,
`submission-created.mjs`, the `booking*` modules and their tests),
`clients/zeroblur/` (new, older work), `command/supabase/migrations/043…047_*.sql`
(all applied),
`.claude/skills/hand-client-site/` (new), `HANDOFF.md`, `TODO.md`. Other
untracked paths in `git status` belong to other workstreams (waterfall,
calls, onboarding wireframe, plans); leave them out of a client-site commit.

## Open decisions and next steps

1. **Booking calendar**: phase 1 built and live on PrecisionFix (see the top
   section). Still assumed: one timezone per site, Three Hands Healing on
   GHL until `instant` mode exists. Phase 2 candidates listed above.
2. **Give Legacy Care and Three Hands Healing a Setup tab**: copy
   `clients/_template/site/checklist.mjs` into each pack, set the consts
   (`HAS_LOOKS: false`, THH owner has a computer so add `desktop[]` steps
   where they differ), import it in `site.config.mjs`, bump `assetVersion`,
   redeploy.
3. **PrecisionFix**: send Alex the owner message in his HANDOFF; still owed
   by him: domain name, GitHub username, theme pick, Supabase sign-up
   email; switch `PRECISIONFIX_FORM_NOTIFY` to him when koH says so; fix the
   deploy link (public repo, or private under cryptokoh's personal account,
   or a paid plan) before telling him merges go live.
4. **Polish candidates, not started**: swipe between looks in the preview
   overlay; a dedicated hours field type for the calendar section (today:
   dropdown rows).

## Where to find things

- Engine architecture: `clients/_template/README.md`. Item and action kinds:
  the header of `netlify/functions/lib/checklist.mjs`.
- Skill phases, scripts, instances: `.claude/skills/hand-client-site/SKILL.md`.
- Per-client state: `clients/<slug>/HANDOFF.md` (PrecisionFix is the
  reference for themes, the booking form, and the Setup tab).
- Memory notes for future sessions: `hand-client-site-template`,
  `hand-client-precisionfix`, `feedback-owner-ux-buttons-not-prose`,
  `hand-booking-calendar-plan`, `hand-netlify-free-private-org-repos`.

## 2026-10-13: fixes-only booking session (engine + PrecisionFix live)

Nine review findings fixed in the engine with tests first (template: 140 pass, 9 skipped) and carried into PrecisionFix (125 pass, deployed `6ace81c5088367cc2266663c`). Report: `koordi/docs/reports/2026-10-13-engine-fixes.md`. Three Hands Healing, Legacy Care, and lhwt are now behind by these files too; nothing synced there. Left for a later session (need a migration): per-editor feed tokens (finding 13), stored manage tokens (14), the data-model limits (17). The engine stays fixes-only; customer reschedule and the busy feed are built once in koordi.
