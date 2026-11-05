# Practitioner safety: vetting a new client before a booking is confirmed

*Written 2026-09-16 for the `hand-client-site` booking engine; revised the
same day after koH's correction: **this is about the practitioner's physical
safety, not about filtering junk requests.** Status: **proposal, nothing
built.** Builds on `booking-calendar-plan.md` (phase 1 `request` mode is live
on PrecisionFix). First site: Three Hands Healing (Maria), then any healer or
Reciprocate practitioner on the engine.*

## The threat, stated plainly

A healer is alone, in a private room or a home, often hands-on, with someone
she met through a web form. The people to plan for:

- someone who books in order to assault, rob, or sexually coerce her;
- someone fixated on her (repeat bookings, boundary creep, turning up
  uninvited once they know the address);
- someone volatile or in crisis who becomes dangerous in the room;
- someone she declined who wants to retaliate.

Junk and throwaway requests are a side problem; the same measures handle them.

**What practitioners told koH (2026-09-16).** What makes them feel unsafe is
(1) **unknown men**, (2) **having no history on the person**, and (3) **being
alone on the property with nobody else there.** The plan answers each one
directly: (2) is "Giving a stranger a history" below, (3) is "Never alone
with a first-timer," and (1) is handled by applying every step to **every new
client**, which covers unknown men without a men-only rule (see "Fairness").

**What a form can and cannot do.** No questionnaire detects ill will, and the
plan must not pretend to. What lone-worker safety practice actually relies on
is three things, and the plan is built on them:

1. **Traceability deters.** A person planning harm avoids being identifiable.
   Every step that ties the booking to a real phone, a real name, a card, and
   a second person who knows about the session raises the cost and turns most
   of them away before Maria ever sees the request.
2. **Her own judgment, before she is alone with them.** Ten minutes of voice
   or video is a better detector than any field. The system's job is to make
   that contact normal and easy, and to make declining cost her nothing.
3. **Someone always knows.** Who she is with, where, and when she should be
   done, with an alarm if she does not check out.

The customer-side constraint stands: a genuine client is often tender or
nervous, and must feel cared for, not suspected. The word "screening" never
appears on their side. Almost everything below is either invisible to them
or something every clinic and studio already asks.

## Layer 0: rules the calendar enforces (zero customer friction)

The customer simply sees fewer options; nothing reads as a barrier.

- **The owner confirms every new client by hand** (`request` mode, shipped).
- **First-visit hours.** New clients are only offered the hours the owner
  marks as safe for strangers (daytime, when someone else is in the building
  or nearby). Returning clients see the full calendar.
- **No home visits for new clients.** A service can be marked "returning
  clients only." The practitioner walking into a stranger's home is the
  highest-risk case and the simplest to remove.
- **First session online, as an option** the customer can pick instead of a
  hello call (see layer 3).
- **The address is released only on confirmation**, in the confirmation email
  and the `.ics`. The site and the "request received" email give the area
  only. Setup checklist item: "Is your home or studio address public
  anywhere?" (Google Business Profile in service-area mode, old listings).
- **Neutral, reason-free declines and a silent do-not-book list** (see
  "Owner's side"), so a decline gives nobody something to argue with or a
  moment to fixate on.

## Layer 1: identity the customer proves (light friction, all familiar)

- **Verified mobile number.** A texted code at the details step. The number
  is also checked for line type: internet (VoIP) and burner-style numbers get
  an amber chip. A real mobile number is the most useful single fact to hold
  about a stranger. Needs an SMS sender (see "Open decisions").
- **Verified email.** A "Yes, this is me" button inside the "request
  received" email they were getting anyway. The owner is notified only after
  it is tapped; one nudge at 2 hours, quiet expiry at 48.
- **Full legal name**, asked as "Your full name, as on your ID."
- **Emergency contact** (name + phone) for in-person sessions. Every studio
  asks this, so it reads as care, and it means a second real person is
  attached to the booking.

## Layer 2: "A little about you" (about 40 seconds, first visit only)

A fifth step after service, day, time, details. Wording proposal (Maria
approves the final text, ES alongside):

1. *What are you hoping for from this session?* Short textarea. Hint: "A
   sentence is plenty. No medical details needed."
2. *How did you find Maria?* Chips: A friend or client · Instagram · Google ·
   An event · Other. "A friend" opens "Who can we thank?" A named referral
   from an existing client is the strongest trust signal she has, and she can
   check it.
3. *Have you had a session like this before?* Chips: Yes · No · Not sure.
4. *Our shared agreements*, one checkbox under four plain lines:
   "Sessions are professional, therapeutic, and non-sexual." · "I will arrive
   sober and say so if anything feels uncomfortable." · "Maria may end a
   session that does not feel safe." · **"For everyone's safety, a trusted
   contact of Maria's knows the time, place, and guest of every first
   visit."** Versioned; version + timestamp stored with the booking.

That last line is honest disclosure and, on its own, one of the strongest
deterrents in the plan: it tells a person with bad intent that someone else
already knows their name.

Intro line above the step: "Maria reads every new request herself. This helps
her prepare for you. Returning clients skip this."

## Layer 3: meet before you are alone (the gut-check)

For a first **in-person** session the customer picks one, presented as a
choice, not a gate:

- **A 10 minute hello call** (video preferred), "Maria likes to say hello
  before a first session"; or
- **make the first session an online one.**

Discovery calls are already normal in this field and tend to help bookings
for high-trust services. On the owner's card for the call there is a short
**Trust your gut** list: asks whether she works alone or who else is there ·
pushes for late hours or a home visit · refuses video · vague or shifting
about why they are coming · sexual or testing language · anger at the
process. Under it: "You never need a reason to decline."

## Layer 4: stronger anchors, used where risk is highest

- **Refundable deposit on a card** (the owner's own Stripe) for a first
  in-person session. People expect deposits; a card in a real name is a hard
  identity anchor, and it moves up from "phase 3, someday" to the `careful`
  tier's default. **A card can be someone else's** (koH's point), so: collect
  cardholder name + billing ZIP, run the bank's address / security-code checks
  and 3D Secure where the card supports it, and compare the cardholder name
  to the booking name. A different name is not a decline; it shows the chip
  "Card is in a different name" and makes **Verify ID** the primary button,
  because an ID + selfie cannot be borrowed the way a card can. Honest
  ranking: a card is an anchor, ID + selfie is proof of who, and neither is
  proof of intent.
- **ID check, owner-triggered.** A **Verify ID** button sends a Stripe
  Identity link (document + selfie; Stripe holds the images, the site stores
  only verified / not verified and the name match). Not part of the default
  flow, because it is the one step that does feel heavy. Recommended as
  required only if the owner ever allows home visits for a new client.
- **Silent signals** as amber chips for the owner, never auto-declining:
  internet or burner number · throwaway email · prior decline or no-show on
  this phone or email · several requests from one device · late-night request
  for hands-on work · words worth a look in the notes (EN + ES) · name on the
  card or ID does not match the name given.

## Giving a stranger a history: record lookups (researched 2026-09-16)

koH asked whether systems exist that search someone's records from an email
or similar. They do, with two facts to keep in front of any presentation:

- **Records are keyed on legal name + date of birth, not email.** Email and
  phone only answer "who is this, really?" The chain is: phone or ID
  establishes the true name (and DOB), then the name is searched.
- **A clean result is not safety.** Most people who harm someone have no
  record, and common names produce false matches. Lookups add a layer; they
  never replace the hello call, the safety contact, or not being alone.

| Option | Needs | Tells her | Cost | Fit and catch |
|---|---|---|---|---|
| **Twilio Lookup: Identity Match + Line Type** | phone + the name they typed | whether that name really belongs to that phone (match score); mobile vs internet / prepaid line | about $0.10 + about $0.01 | Silent, automatic, zero customer friction, no carrier approval needed in the US. Identity only, no criminal history. |
| **Stripe Identity** | photo ID + selfie | verified legal name, DOB, face match | $1.50 each | Strongest proof of who. Visible friction, so owner-triggered. Yields the name + DOB every record search below needs. Stripe holds the images. |
| **Texas DPS sex offender registry + national NSOPW** | name (DOB or photo to tell people apart) | registry entries with photos | free | Public by state law. Owner runs it herself in about two minutes from a button on the card. Name collisions are common. |
| **Texas DPS conviction name search** | name + DOB | Texas convictions and deferred adjudications | about $3 a search | Public, Texas only, owner's own DPS account. |
| **Checkr Trust** (trust and safety API, non-FCRA instant checks) | name, DOB encouraged | criminal, sex offender, watchlist hits across 2,400+ sources | sales quote, contract | The closest thing to "an API that searches records." Built for platforms screening guests and passengers; HAND would be the platform customer across practitioner sites. Needs a sales call and a legal read of its use restrictions. |
| **FOREWARN** | phone number alone | identity, criminal history, address history | sold through associations; sales call | Built for exactly this problem: lone professionals meeting strangers (real estate agents, home healthcare). Not self-serve; ask whether wellness practitioners qualify. Only for people who contacted her first, which a booking is. |
| People-search sites (BeenVerified, TruthFinder, Spokeo) | email, phone, or name | scraped, aggregated records | $20 to $30 a month | **Do not use.** Their terms forbid use in a business transaction the consumer started, the FTC has fined this category, and accuracy is poor. |
| Full FCRA background check | name, DOB, SSN, signed consent | full regulated report | $30 and up | Legal but needs SSN, written consent, and adverse-action letters. Far too heavy for booking a session. |

**Recommended path:** Identity Match on every new client (silent); the two
free Texas / national registry searches as one owner button once a verified
name exists; Verify ID when the phone or card name does not match or there is
no referral; open sales conversations with **FOREWARN** and **Checkr Trust**
as the automated-history option for all HAND practitioners, since neither is
self-serve and both need a legal read.

**A person is the best history.** The industry's own standard practice is
**new clients by referral**: an existing client vouches, and her clients do
the vetting. The plan makes a named referral from a known client the fast
lane (no deposit, no ID), and everything above is what an unreferred
stranger goes through instead.

## Never alone with a first-timer

The third thing practitioners named, and the one no lookup fixes.

- **"Someone is here" hours.** First-visit slots exist only in blocks where a
  second person is on the property. The owner (or the second person) marks
  those blocks; new clients simply never see any other time.
- **A host from the HAND pool.** Being present on the land during first
  visits is a contribution like any other skill exchange: a community member
  signs up for host blocks, which opens first-visit slots. For land-based
  practices (Mystic Hearts) this is the natural fit.
- **Shared first-visit days.** Two practitioners schedule their first-timers
  on the same day at the same place.
- **Arrival protocol.** The confirmation says "our host will greet you at the
  gate"; the guest is met in the open, by two people, with a visible camera
  at the entrance. A person with bad intent learns at booking time that she
  will not be alone.
- **If nobody can be there:** the first session is online, or at a rented
  room in a shared wellness space, which also keeps the home address private
  until trust exists.

## Fairness: one rule for every new client

Austin's civil rights ordinance (City Code Title 5) bars discrimination in
public accommodations on the basis of sex, and a healing practice open to the
public likely counts. A men-only vetting rule is therefore a legal risk;
**the same steps for every new client are not**, and they cover the unknown
man completely. "New clients by referral" is fine when it applies to
everyone. TDLR's own guidance to Texas massage therapists supports the rest:
verify client information before the session, and she may stop or refuse a
session whenever she feels unsafe ("You have the right to be safe and feel
safe at your job"). Declines stay reason-free and are her private judgment.
Before launch: one lawyer's read on declining based on a record hit and on
the safety-contact disclosure.

## Session day: someone always knows

This is the part that still protects her when vetting got it wrong.

- **Safety contact.** The owner names one or two trusted people in `/admin/`
  (a button, a name, a phone, an email). For every first in-person session
  (owner may choose all in-person sessions) the contact automatically gets:
  guest's name and phone, service, place, start, and expected end.
- **Check in, check out.** At start time the owner gets a one-tap **I'm
  starting**; at the end, **I'm done and fine**. No check-out by 30 minutes
  past the end sends the safety contact an alert with the guest's details and
  the address, and repeats it. Needs a scheduled function every 5 to 10
  minutes (the hourly reminders job is too coarse).
- **Alerts by text, not just email.** An emergency email may sit unread;
  this is the strongest reason to get an SMS sender early.
- **Use the phone's own tools for the live part.** iPhone Check In (Messages)
  and Android Personal Safety already do live location, timers, and SOS well.
  The site does not rebuild them; the Setup checklist walks the owner through
  turning them on. What the site adds is the one thing those tools lack: the
  identity of the person she is with. It is not an emergency service, and the
  owner-facing copy says so: call 911 first.

## Records that hold up afterwards

- Every request keeps: verified phone and email, legal name, emergency
  contact, agreement version and time, network address and device string,
  timestamps, every message sent, call and check-in history.
- **Decline with a safety concern** (a second decline button): blocks the
  person, keeps the full record indefinitely, and skips the usual purge.
- **Incident report**: one button prints a single client's complete record,
  for police or a protective order.
- Ordinary declined, cancelled, and expired requests still have their
  free-text answers wiped after 30 days. The customer-facing privacy line
  covers the safety contact and the retention.

## Tiers, chosen per service

| Tier | For | What runs |
|---|---|---|
| `off` | sites like PrecisionFix | nothing |
| `light` | online sessions | verified email + phone, agreements |
| `standard` | in person at her space | layers 0 to 3, safety contact + check-out alarm |
| `careful` | hands-on bodywork, anything she marks | `standard` + refundable deposit; hello call is video |
| home visit | | returning clients only; if ever opened to a new client, `careful` + Verify ID |

**Vet once, then get out of the way.** A client with a completed session
(matched on verified phone or email) is `returning`: the extra step, the
call, and the deposit are skipped, and the owner can mark a client
**Trusted** by hand. When `instant` mode lands, returning and trusted clients
are the only ones who get it. Safety contact and check-out stay available
for any session she chooses.

## Owner's side (buttons, not prose)

The request card gains a **Safety strip**:
`✓ Mobile verified · ✓ Email verified · ✓ Agreements v1 · New client · Found via: a friend (Ana G.) · Deposit held`
then any amber chips, then her answers.

Buttons on a new-client request: **Offer a hello call** (primary for
in-person) · **Confirm** · **Confirm at another time** · **Ask a question** ·
**Verify ID** · **Decline** · **Decline, safety concern**.

- **Decline** sends one fixed, kind, reason-free message: "Maria is not able
  to take this booking. Wishing you well." Her reason stays in `owner_note`.
- **Do not book again**: that phone or email still sees the normal "request
  received" page; the request lands in a collapsed Blocked group, notifies
  nobody, and auto-declines with the neutral message after 24 hours. The
  person never learns they are blocked, which matters most for the
  retaliation and fixation cases.
- The one-tap **Confirm** link in her email appears only once the customer is
  verified, so she never confirms an unverified stranger from her phone.
- Owner emails carry the strip and chips, not the free-text answers.

## Later: a shared warning list across HAND practitioners

Fits the pool-of-resources model: when one practitioner declines with a
safety concern, others see "a practitioner on the network flagged this
number" on a matching request. Hashed phone and email only, no details, no
names, opt-in per site. Real defamation and privacy exposure, so it needs a
written policy and a legal read before any build.

## Data

- `<prefix>_bookings` gains `screen jsonb`: `{ tier, answers, agreements:
  { version, agreed_at }, phone_verified_at, phone_line_type,
  email_verified_at, emergency_contact, signals: [], hello_call:
  { offered_at, done_at }, id_check, checkin: { started_at, done_at,
  alerted_at }, safety_concern }` plus the deposit fields already in the
  calendar plan.
- New `<prefix>_booking_clients`: `id`, `email`, `phone_digits`, `trust`
  (`new | returning | trusted | blocked`), `safety_concern`, `note`,
  `first_seen`, `completed_count`, `updated_by`.
- Safety contacts live in the `calendar` content section (owner-edited).
- Generated by `scripts/gen-migration.mjs --bookings`; live sites take the
  next migration number.

## Engine changes

- `lib/config.mjs`: `booking.screening` (tier per service, first-visit hours,
  returning-only services, questions, agreements text + version),
  `normalizeScreening()`; new intake types `chips` and `agree`.
- `lib/booking-screen.mjs` (new, pure, tests first): `tierFor()`,
  `signalsFor()`, `trustFor()`, `firstVisitSlots()`, `overdueCheckouts()`.
- `lib/booking.mjs`: slot engine honors first-visit hours and
  returning-only services once the client is known (verified phone).
- `lib/booking-form.mjs` + `public/booking/booking.js`: phone code, step 05,
  hello call or online-first choice, skipping for returning clients.
- `lib/booking-verify.mjs` (new): phone code + line type (provider behind one
  interface), email verify token (same HMAC pattern as manage / act).
- `lib/booking-email.mjs`: verify button, nudge, hello call, ask a question,
  neutral decline, safety-contact notice, overdue alert. EN + ES.
- `lib/booking-admin.mjs`: `TRANSITIONS` gains `offer_call`, `ask`,
  `verify_id`, `decline_concern`, `check_in`, `check_out`; client trust
  routes; incident report.
- `functions/booking-safety.mjs` (new, scheduled every 5 to 10 min):
  check-in prompts, overdue alerts.
- `public/admin/admin.js`: Safety strip, buttons, Trust your gut list,
  Clients list, safety contacts, Setup items (agreements approved, safety
  contact added, phone safety tools on, address not public).

## Keeping it from scaring people off

- Everything in the default flow is something a clinic already asks: a texted
  code, full name, emergency contact, one agreements box, a hello call.
- The heavy step (ID) is never in the default flow.
- Most of the protection is invisible: first-visit hours, returning-only
  services, signals, the safety contact, check-out.
- First visit only; returning clients get the short form.
- **Measure it.** Step-reached counters (no personal data). Target: at least
  80 % of people who finish step 4 finish step 5; if lower, cut a question,
  never a safety rule.

## Slices

1. **Protection without new vendors:** tiers, first-visit hours,
   returning-only services, "A little about you" + agreements, email verify,
   hello call or online-first, Safety strip, both declines, blocklist,
   safety-contact notice, check-in / check-out with email alerts, record
   keeping + incident report.
   Plus "someone is here" hours and the registry-search button (both free).
2. **Phone:** texted code (Twilio Verify needs no 10DLC registration for
   verification messages, confirmed 2026-09-16), Identity Match + line-type
   chip, text alerts to the safety contact (alerts do need a registered or
   toll-free sender).
3. **Money and ID:** refundable deposit for `careful` with the cardholder
   name comparison, Verify ID button.
4. **Later:** remaining silent signals, instant mode for trusted clients,
   automated history through FOREWARN or Checkr Trust if the sales and legal
   conversations clear, host blocks from the HAND pool, shared warning list
   (after the legal read).

## The three bundles to present

- **A. Foundations (no new vendors, $0):** owner confirms, first-visit and
  "someone is here" hours, referral fast lane, agreements with the safety
  contact line, hello call or online first, safety contact + check-out alarm,
  free registry-search button, records.
- **B. Know who they are (about $0.15 per new client, $1.65 with an ID
  check):** texted code, Identity Match, deposit with name comparison, Verify
  ID on a mismatch or no referral.
- **C. Know their history (quote needed):** FOREWARN or Checkr Trust across
  all HAND practitioners; Texas DPS conviction search ($3) by hand meanwhile.

## Open decisions (koH)

1. **SMS moves up.** Texted codes and text alerts are core to safety, not
   polish. Options: Twilio Verify for the codes (said not to need the owner's
   own 10DLC registration; confirm before building) plus a toll-free number
   for alerts. OK to take on a per-site SMS cost?
2. **Hello call or online-first for every first in-person session**
   (recommended), or only for the `careful` tier?
3. **Deposit for first in-person `careful` sessions** (recommended). Needs
   Maria's Stripe sooner than planned.
4. **Safety contact disclosure** in the agreements (recommended: yes, as
   worded above). It shares the guest's name and phone with one trusted
   person, which bends the "customer data stays between customer, owner, and
   site" rule from the calendar plan on purpose.
5. **Home visits for new clients:** never (recommended), or allowed with
   Verify ID.
6. **Three Hands Healing moves onto this calendar** instead of the
   GoHighLevel calendar; does GHL stay for nurture and CRM?
7. **Agreements wording** needs Maria's approval and a Spanish version.
8. **Who can be "someone here"?** A named person per practitioner, host
   blocks from the HAND pool, or shared first-visit days; and where first
   sessions happen when nobody can be.
9. **Automated history:** OK to open sales conversations with FOREWARN and
   Checkr Trust on HAND's behalf?
10. **A lawyer's read** on declining after a record hit, the safety-contact
    disclosure, and the referral rule, before launch.

## Sources (2026-09-16)

- FOREWARN: https://www.forewarn.com/industries/ · https://www.forewarn.com/product/
- Twilio Lookup Identity Match: https://www.twilio.com/docs/lookup/v2-api/identity-match
- Twilio Verify and 10DLC: https://www.twilio.com/docs/messaging/compliance/a2p-10dlc
- Checkr Trust: https://docs.checkrtrust.com/ · https://www.checkrtrust.com/
- Stripe Identity checks: https://docs.stripe.com/identity/verification-checks?type=selfie
- Stripe card verification checks: https://docs.stripe.com/disputes/prevention/best-practices
- People-search limits: https://www.truthfinder.com/help/dos-and-donts/ ·
  https://www.ftc.gov/news-events/news/press-releases/2023/09/ftc-says-truthfinder-instant-checkmate-deceived-users-about-background-report-accuracy-violated-fcra ·
  https://www.ftc.gov/news-events/news/press-releases/2012/06/spokeo-pay-800000-settle-ftc-charges-company-allegedly-marketed-information-employers-recruiters
- Texas DPS registry and conviction search: https://www.dps.texas.gov/section/crime-records/texas-sex-offender-registration-program ·
  https://securesite.dps.texas.gov/dpswebsite/criminalhistory/
- Austin public accommodations: https://www.austintexas.gov/equity-inclusion/complaint-forms-general-inquiries
- TDLR to massage therapists: https://www.tdlr.texas.gov/news/2021/05/03/harassment-of-and-violence-toward-massage-therapists
- Industry practice (referral-only, phone screening): https://www.abmp.com/massage-and-bodywork-magazine/issues/marchapril-2022/mobile-massage-practice-safety-and-7-questions-ask-each-potential-client ·
  https://respectmassage.com/be-prepared/how-to-screen-massage-clients/
