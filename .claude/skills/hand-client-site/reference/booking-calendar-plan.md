# Booking calendar for client sites: the plan

*Written 2026-09-16 for the `hand-client-site` engine. Status: **phase 1
(`request` mode) built and live on PrecisionFix the same night**; what
shipped, and where it differs from this plan on purpose, is in
`clients/_template/HANDOFF.md` ("What shipped on 2026-09-16 (night)") and
the SKILL.md section "Booking calendar". Differences in short: the owner's
settings are an engine-owned `calendar` content section (not a pack
section); manage / act / feed tokens are derived from the booking id with
the session secret (hashes only in the database); admin routes live under
`/api/admin/bookings…` in `admin.mjs`; phone required, email optional; no
`held`, no `_busy`, no `resource_key` yet. Phases 2 and 3 below still hold.*

Two kinds of owners asked for a calendar: a **mechanic on the go** (PrecisionFix:
jobs of unknown length, travel between them, confirms by text) and **healers**
(Three Hands Healing and future Reciprocates: fixed-length sessions, a place or
a home visit, reminders, rebooking, sometimes several practitioners). One
engine module serves both through three modes a site picks in
`config.booking.mode`.

## Decisions (koH, 2026-09-16)

1. **No Telegram post per booking.** Customer data stays between the customer,
   the owner, and the site. Notifications are email only; SMS after the
   owner's own 10DLC registration. The `_telegram.js` idea is dropped for
   bookings.
2. **Requests are not exclusive.** Any number of customers may ask for the
   same day and the same time. The site never says "taken"; the owner
   decides. Confirming one request does not decline the others, but the
   owner sees the overlap on every card and on the day strip.
3. **The owner confirms; confirmed bookings get their own section.** The
   Bookings tab in `/admin/` is a real back office: Requested (inbox),
   Confirmed (upcoming, by day), Past, Declined and cancelled. Feature-rich
   is the brief: confirm as asked, confirm at another time, decline with a
   reason, reschedule, complete, no-show, notes, add by hand, block a day,
   one-tap confirm from the email, `.ics` for the customer, reminders.
4. **Build it, phase 1 next.** `request` mode on PrecisionFix as the pilot
   (its Netlify Form becomes the first persisted booking). Assumptions
   carried until koH says otherwise: one timezone per site
   (`America/Chicago`); Three Hands Healing stays on her GoHighLevel plan
   until `instant` mode exists. The build spec and the slice order are in
   `clients/_template/HANDOFF.md` ("Next session: build the booking
   calendar").

## What exists today (repo sweep, 2026-09-16)

- The engine's only booking primitive is the owner-editable `booking_url`
  (`lib/blocks.mjs primaryCta()`): paste a scheduling page and every Book
  button opens it. Every site has a `#book` anchor.
- PrecisionFix has a request form (Netlify Forms, coarse morning / afternoon
  windows, `submission-created.mjs` → Resend to the owner + a customer
  confirmation). No availability, no double-booking guard, no persistence
  beyond Netlify's dashboard and the email. Free tier caps at 100 submissions
  a month.
- Three Hands Healing has an unbuilt plan to use GoHighLevel for calendar,
  CRM, and SMS (`threehandshealing/plan-eft-and-ghl-funnel.md`): Maria owns
  the account, HAND never resells seats (tax posture), embeds are iframes that
  need a CSP allow-list, SMS needs A2P 10DLC registration.
- No calendar, ICS, or availability code anywhere in the monorepo. yuhm's
  `food_events` (`address_release_at`, RSVP with waitlist) and harvest runs
  are the nearest data-model relatives; the reusable notifier is
  `lib/forms.mjs` + `lib/email.mjs` (Resend) and the root
  `netlify/functions/_telegram.js`. There is no SMS sender.

## Three modes, one Book section

**`external`** (works now, gets an embed block). The owner pastes a scheduling
URL. New: `config.booking.embed = { src, provider }` renders a themed iframe
in the `#book` section and generates the CSP `frame-src` / `script-src`
allow-list into `netlify.toml`, so GoHighLevel, Square Appointments, Cal.com,
or Calendly are config, not hand edits. This is Three Hands Healing's path
while GHL is her plan, and the escape hatch for any owner who already lives
in Booksy, Square, or GHL.

**`request`** (the mechanic). The customer picks a service, a day, and a
window (morning / afternoon / evening, or 30 or 60 minute steps if the owner
wants) from the owner's hours. Requests are never exclusive: several people
may ask for the same day and time, and the site never shows anyone else's
requests. The booking is stored as `requested`. The owner gets an email with
one-tap signed links **Confirm**, **Decline**, and **Open in the editor**,
and the Bookings tab shows the request with an overlap chip ("2 others asked
for Tue afternoon", "Confirmed: Maria 2:00 pm"). On confirm the customer gets the confirmation with a
`.ics` attachment; on suggest the customer gets the new window with the same
links. Fits jobs whose length is unknown until diagnosed and travel between
jobs. PrecisionFix is the pilot: its Netlify Form becomes a persisted,
confirmable booking and the submissions cap goes away.

**`instant`** (healers). Exact slots from session types with durations and
buffers, auto-confirmed. The address is released only on confirmation (the
`address_release_at` idea from `food_events`, for land-based practices).
Minimal intake, no health details in the form (keeps the site out of HIPAA
territory). Cancellation policy text, self-serve cancel and reschedule links,
a rebook link in the follow-up email.

## Data

Per client, prefixed like the existing tables and generated by
`scripts/gen-migration.mjs` when `config.booking` exists:

- `<prefix>_bookings`: `id`, `status` (`requested | held | confirmed |
  declined | cancelled | completed | no_show`), `service_key`, `resource_key`
  (nullable from day one, for multi-practitioner collectives), `starts_at`,
  `ends_at` (timestamptz), `tz`, customer `name / phone / email / lang`,
  location `kind` (`at_customer | at_owner | remote`) + `address` + `city`,
  `intake` jsonb, deposit fields (`provider`, `intent_id`, `amount_cents`,
  `deposit_status`), hashed `manage_token` (customer) and `confirm_token`
  (owner), `reminders` jsonb log, `created_at`, `confirmed_at`, `source`.
- `<prefix>_busy`: blocks imported from the owner's own calendar (`starts_at`,
  `ends_at`, `uid`, `fetched_at`).

Services, weekly hours, blackout dates, lead time, horizon, per-zone travel
buffer (mechanic), and max jobs per day live in the content document as a
schema-driven `booking` section the owner edits in `/admin/`: a `list` of
hour rows in v1 (`day`, `from`, `to`); a dedicated hours field type is polish.

## Slot engine

`GET /api/booking/slots?service=<key>&from=<date>&to=<date>` = weekly hours
minus blackouts minus stored bookings (held + confirmed) minus imported busy
blocks, stepped by 15 or 30 minutes (window-aligned for `request` mode),
honoring duration + buffer + lead time + horizon + max per day. One timezone
per site (`America/Chicago`), computed server-side with `Intl`, no date
library. `POST /api/booking` creates the row (`held` for `instant`, ten-minute
hold while the customer finishes; `requested` for `request`), sends the
emails, returns the manage link.

## Do not double-book me, without OAuth

In: the owner pastes their Google or Apple calendar's private ICS address into
`/admin/` (Booking section); a scheduled Netlify function polls it every 15
minutes into `<prefix>_busy`. Out: every confirmation email carries a `.ics`
attachment (Resend supports attachments), and `/calendar.ics?token=<hash>` is
a subscribable feed of confirmed bookings the owner adds to the phone's
calendar app (iOS refreshes subscribed calendars on its own schedule; the
`.ics` attachment is the instant path). Google Calendar OAuth two-way sync is a
later phase.

## Notifications

Resend through the existing `lib/forms.mjs` shape: owner notification with
Reply-To the customer, customer emails (request received, confirmed with
`.ics`, new time proposed, declined, cancelled), themed like the sign-in
email. No Telegram (decision 1 above). Reminders at 24 h by email from a
scheduled function (2 h is polish). SMS only after the owner's own A2P 10DLC registration
(days to weeks, needs their EIN), so it is phase 3; until then the owner texts
by hand, which the mechanic does anyway.

## Admin

A **Bookings** tab in `/admin/` (engine, appears when `config.booking`
exists), first in the bar while requests are waiting, with a count badge:

- **Requested**: newest first. Card = who, service, asked-for day and time,
  car and where (from the intake), notes, `tel:` / `sms:` / `mailto:` links,
  age ("2 h ago"), overlap chip. Buttons: **Confirm** · **Confirm at another
  time** (day + time picker, customer is emailed the new time) · **Decline**
  (optional reason, templated EN/ES).
- **Confirmed**: upcoming, grouped by day, today first. Buttons:
  **Reschedule** · **Completed** · **No-show** · **Cancel** · **Note**;
  `.ics` download.
- **Past** (completed / no-show, last 30 days) and **Declined and
  cancelled**, both collapsed.
- **Add a booking** by hand (walk-in, phone call): lands in Confirmed.
- **Block a day** / block hours: writes the blackout into the content doc
  through `PATCH /api/admin/content`, no Publish.
- A month strip at the top with per-day counts (requested / confirmed) for
  navigation. Week grid is polish.

The Setup tab gains items: set your hours (field action to the booking
section), send yourself a test booking (ticks itself once a booking with an
owner email exists), add the calendar to your phone (feed link).

## Payments

Phase 3, the owner's own Stripe account (HAND stays out of the money flow): a
deposit link in the confirmation for `request` mode, Stripe Checkout at
booking time for `instant`; a webhook marks the deposit paid; refunds happen
in the owner's Stripe dashboard.

## Phasing

0. **Now:** `booking_url` stays; add the embed block + CSP as config. Three
   Hands Healing proceeds on GHL.
1. **`request` mode on PrecisionFix:** bookings table, windows from
   availability, one-tap confirm / suggest, `.ics` attachment, Bookings tab,
   calendar feed. Replaces the Netlify Form.
2. **`instant` mode:** busy-feed import, reminders, cancel / reschedule links,
   for healers who do not want a $97 a month platform.
3. **Deposits** (owner's Stripe), **SMS** after 10DLC, **multi-practitioner**
   (`resource_key`).

Healers also need to vet a new client before confirming: see
`booking-screening-plan.md` (proposal 2026-09-16). It changes who gets
`instant`: returning and trusted clients only; new clients go through the
owner.

## Why not a hosted scheduler for everyone

The self-host-Cal.com question was researched on 2026-09-16 (Cal.com went
closed source in April 2026; cal.diy is personal-use only; Tymeslot and
Easy!Appointments are single-tenant): see `booking-platform-research.md`.

Monthly fees or data lock-in, not bilingual or themed, and HAND's model builds
once and reuses across Reciprocates. `external` stays first-class for owners
who already live in Booksy, GHL, or Square.

## Decisions: resolved and open

Resolved 2026-09-16 (see "Decisions" at the top): no Telegram; overlapping
requests allowed; owner confirms into a Confirmed section; build phase 1.

Still open, carried as assumptions until koH says otherwise:

1. PrecisionFix is the phase-1 pilot (assumed yes).
2. One fixed timezone per site, `America/Chicago` (assumed yes).
3. Three Hands Healing: GHL as planned until `instant` mode (assumed yes).
