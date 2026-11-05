# Booking platform: self-host Cal.com, or build our own? (research, 2026-09-16)

*Answers the question koH asked on 2026-09-16: "should we self-host cal.com and
let customers use it, since it is very feature rich, or have our own?"
Companion to `booking-calendar-plan.md`, which is the build plan.*

## The short answer

**Build our own (the plan already written), keep `external` mode for owners who
bring their own scheduler, and do not self-host Cal.com.** The Cal.com that was
worth self-hosting no longer exists as open source: on 15 April 2026 Cal.com
took its production code private and left behind **cal.diy**, an MIT fork the
Cal.com team itself labels "strictly recommended for personal, non-production
use," with Teams, Organizations, Workflows, Routing Forms, SSO, and Insights
removed. What we would be hosting for clients is a frozen community edition
of a personal-use scheduler, missing exactly the multi-business features an
agency needs, with a two-service Next.js + Postgres footprint, no Spanish
guarantee on the booking page, and a data model ("book time with a person")
that fits neither a mobile mechanic nor a healing collective as well as the
thin engine module in the plan.

## What changed at Cal.com (verified against primary sources)

- `https://cal.com/docs/self-hosting/license-key` now **301-redirects to
  cal.diy** (fetched 2026-09-16).
- The GitHub repository at `calcom/cal.com` now serves the cal.diy README:
  "Cal.diy is fully open source, licensed under the MIT License. Unlike
  Cal.com's 'Open Core' model, Cal.diy has no commercial/enterprise code,"
  and it is "intended for personal, non-production use" with a pointer to
  Cal.com for commercial needs.
- cal.diy's own docs list what is gone versus Cal.com: teams and team event
  types, organizations and managed event types, workflows and routing forms,
  SAML SSO and SCIM, video recordings and insights, admin panel and workspace
  platform. "Cal.diy is community maintained"; Cal.com, Inc. keeps the
  trademark.
- Secondary write-ups (Pinggy, Use Apify, OSSAlt) date the switch to
  15 April 2026: the LICENSE file was replaced in a commit titled
  "feat: Cal.diy - community-driven MIT-licensed fork," the repo was renamed,
  and the production codebase moved to a private repository.

Pre-April guides still describe the old AGPLv3 open-core self-host with an
enterprise license key and a 30-seat minimum; treat anything dated before
April 2026 as history.

## Hosted Cal.com, if we wanted it anyway

From `cal.com/pricing` (2026-09-16): Free (1 user, unlimited event types,
Cal.com branding stays), Teams $12 per user per month billed yearly (removes
branding, routing forms, analytics), Organizations $28 per user per month
(sub-teams, company subdomain, SSO), Enterprise custom. The developer
"Platform" tier (Atoms + API v2, the thing you would use to embed a
white-label booking flow into our client sites) is reported by third parties
at $299 a month plus per-booking overage above an included quota; the
platform pricing page did not expose those numbers to a fetch, so confirm
before quoting. Either way the money runs through HAND, which is the
resell-seats posture the tax notes already ruled out for Three Hands Healing
and GoHighLevel. The one clean use: an owner opens their **own** free Cal.com
account and pastes the link into `booking_url`. That is `external` mode and
it works today.

## The alternatives that are actually open source in 2026

| Tool | License | Stack / deploy | Fit for our two owner types |
|---|---|---|---|
| **cal.diy** | MIT | Next.js + Postgres, build from source or community image, 2 GB RAM min | Single-user scheduler; no teams/orgs, labeled non-production; a copy per client or one shared install with every owner as a "user" on the same instance (no tenant boundary). |
| **Tymeslot** | AGPLv3 | Elixir/Phoenix, one container with bundled Postgres (`luka1thb/tymeslot`), weekly releases (v1.15.x, Aug 2026) | The best "Cal.com replacement" today: event types with durations and buffers, named schedules, Google/Outlook/iCloud/CalDAV sync, inline/popup embeds with domain-locked tokens, REST API, webhooks, Stripe Connect, email reminders with `.ics`, in-person meeting type, two themes with white-label. **Single organization per deployment; no Spanish** (EN, DE, UK, FR, IT, CS). Same code as their paid cloud. |
| **Easy!Appointments** | GPLv3 | PHP 8.2 + MySQL, Docker for dev, v1.6.0 (May 2026) | The only one whose model is *services × providers × working plans* (a clinic or a salon), with Google Calendar sync, email, REST API, many languages including Spanish. Dated PHP UI, single business per install, premium add-ons behind easyappointments.org/premium. |
| Thunderbird Appointment | MPL-2.0 | Python + Vue | CalDAV-first personal scheduling, early. |
| Rallly / Crab Fit | AGPL / GPL | Node | Group polls and heat maps, not appointments. |

None of these is multi-tenant. Hosting "one scheduler for every HAND client"
means one instance per client (a container and a Postgres per mechanic) or a
shared instance where every owner is a user with no isolation, on our OVH
box, under our upgrade cadence. Neither is the buttery owner experience the
Setup tab is built around: the owner would sign in somewhere else, on a
different domain, in English, with a different look, and HAND would run a
second admin for them.

## Why the plan's own module still wins

- **Two owner shapes, one thin module.** `request` mode (windows, confirm or
  suggest, `.ics`) and `instant` mode (slots, holds, address release) are a
  few hundred lines on the engine we already run; every hosted scheduler
  models "a meeting with a person," which is wrong for a mechanic whose job
  length is unknown until diagnosed and awkward for a land-based practice
  that releases the address on confirmation.
- **Bilingual, themed, inside `/admin/`.** The booking section, emails, and
  the Bookings tab inherit the site's theme, the EN/ES twin fields, and the
  passwordless owner login. No iframe, no CSP allow-list, no second account.
- **Owner-owned data.** Bookings land in the client's own prefixed tables in
  the shared Supabase project, which the Supabase checklist item already
  promises to hand over. Their scheduler is not a third party they can lose.
- **No fees that scale with bookings.** Resend and Netlify functions are
  already paid for; Cal.com Platform is $299 a month before a single client,
  Netlify Forms is $19 a month after 100 submissions.
- **Reuse across Reciprocates.** Build once, every client site gets it as
  config (`config.booking.mode`).

What we give up: two-way Google Calendar OAuth on day one (the plan uses a
private ICS feed in and `.ics` attachments plus a subscribable feed out),
video-call integrations (not needed for a mechanic or a healer), SMS until
the owner's own 10DLC registration.

## Where a hosted scheduler still belongs

`external` mode stays first-class and gets the embed block from phase 0 of
the plan. Use it when the owner already lives in Square Appointments, Booksy,
GoHighLevel (Three Hands Healing's plan; her account, her money), or opens
their own free Cal.com. HAND never holds the account or resells the seat.

## Decision for koH

Recommend: **no to self-hosting Cal.com or cal.diy; yes to phase 1 of the
plan (`request` mode on PrecisionFix).** If a healer client wants exact-slot
booking before `instant` mode exists, point them at their own free Cal.com
or Square account and paste the link. Revisit Tymeslot only if it adds
Spanish and per-tenant organizations.

## Sources (fetched 2026-09-16)

- https://cal.com/docs/self-hosting/license-key (redirects to https://cal.diy/)
- https://github.com/calcom/cal.com (now the cal.diy README, MIT)
- https://cal.diy/ (missing features, "personal, non-production use")
- https://cal.com/pricing
- https://pinggy.io/blog/self_hosted_calendly_alternatives/
- https://use-apify.com/blog/calendly-alternatives-2026
- https://ossalt.com/guides/self-hosting-guide-calcom-2026
- https://zeeg.me/en/blog/post/cal-com-pricing and https://costbench.com/software/scheduling/cal-com/ (Platform pricing, secondary)
- https://github.com/Tymeslot/tymeslot and https://tymeslot.app/features/self-hosting
- https://github.com/alextselegidis/easyappointments
