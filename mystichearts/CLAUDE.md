# Mystic Hearts — project context

**For the next Claude session opening this folder cold.**
*Created: 2026-05-17 · Updated: 2026-10-06 (see Current state)*

---

## Current state (2026-10-06): read this first

The sections below are the May discovery notes. Since then:

- **This folder is the Mystic Hearts website**: Next 16 static export, one page in `components/mystic-hearts-page.tsx`, styles in `app/globals.css`. It moved into the hand repo on 2026-10-06 from the old sibling folder `~/Documents/mystichearts/`.
- **The page is two full-screen slides**: the hero ("A future village, grounded in the work already beginning.") and "Coming fall 2027." with a short paragraph and a get-in-touch email button. The older offerings, build timeline and gallery sections were removed; they survive in the old sibling folder.
- **Run locally:** `npx next dev -p 3070`.
- **Publish:** build with the demo base path, then copy the output over the password-gated demo:
  ```bash
  NEXT_PUBLIC_BASE_PATH=/mystichearts/demo npx next build
  rsync -a --delete out/ ../web/mystichearts/demo/
  ```
  The public site deploys `web/` from `main`. The gate is `netlify/edge-functions/mystichearts-demo-auth.js`.
- **The repo is public.** Everything committed here is world-readable.
- **Voice:** follow `funding/framing/mystic-hearts.md`. Lead with the land, the events and the people. Never call Mystic Hearts a platform or an app in anything public.

---

## What this is

Mystic Hearts is **one of HAND Protocol's Reciprocate groups**, targeting a **2026 launch**. This folder is the working space for the Mystic Hearts product surface specifically — not the HAND parent site.

If you don't know what HAND is, read `/home/koh/Documents/handprotocol/HANDOFF.md` and `/home/koh/Documents/handprotocol/AGENTS.md` first. HAND is the 501(c)(3) parent; Mystic Hearts is one collective HAND accompanies. Defined-term recap:

- **Reciprocates** — people/organizations HAND serves (capitalized as a defined role)
- **Reciprocate groups** — collectives of Reciprocates (Mystic Hearts is one)
- **Contributors** — skilled people who give time into the resource pool
- **Sovereign Reciprocates** — HAND's AI workstream (custom open-source agent systems built per Reciprocate group, owned by the group)

Mystic Hearts likely sits in the healers/practitioners thread of HAND's three communities of regenerative impact work.

## What Mystic Hearts is delivering (as currently scoped)

**Primary feature:**
- Skill-exchange volunteerism — the core mechanic, mirrors HAND's pool-of-resources model at the group scale

**Utility:**
- Anonymous feedback — secondary surface, supports the primary

**Main public-facing deliverables:**
- Event listing
- Practitioner listing

**Explicitly out of scope for the initial launch (parked for later):**
- 3D web design
- Drone / territory experiential web
- Prototype tours

These experiential pieces are on the roadmap but **not** part of the 2026 minimum deliverable. Do not start designing them yet.

## Where this work is in the process

**Discovery phase.** The web look and feel has not been chosen. Do not jump to UI design, component libraries, color systems, or layouts. The next several sessions should be:

1. Surfacing assumptions about the Mystic Hearts audience and what they actually need
2. Naming open questions about how skill-exchange volunteerism works for this group specifically (vs. HAND's general model)
3. Defining what an "event" and a "practitioner listing" mean for Mystic Hearts (taxonomy, fields, moderation, who can post)
4. Mapping anonymous feedback — what gets fed back to whom, with what protections
5. Mapping the relationship to HAND's main site (subroute? subdomain? co-branded?)

When in doubt, **ask the user a clarifying question** before generating artifacts.

## How Mystic Hearts relates to HAND infrastructure

- **Design system / brand voice** — inherit from HAND. `/home/koh/Documents/handprotocol/DESIGN.md` and `/home/koh/Documents/handprotocol/AGENTS.md` are authoritative.
- **Vocabulary rules** — same as HAND (zero em dashes; Reciprocates / Contributors / Sovereign Reciprocates as defined terms).
- **Deployment** — HAND parent deploys to handprotocol.org via Netlify on `main`. Mystic Hearts will deploy separately to `mystichearts.handprotocol.org` (subdomain DNS under HAND, app is its own build / repo).
- **AI** — if Mystic Hearts gets a Sovereign Reciprocate agent system, that's a separate workstream under HAND's AI track. Out of scope until the main product is scoped.

## Working conventions

- **This folder is the Mystic Hearts project home.** Its own future git repo, its own deploy. Sibling to `handprotocol/`, not nested.
- **Living docs**, not finished docs. Use the "Open question" pattern that HAND discovery uses (see `/home/koh/Documents/handprotocol/web/discovery/`).
- **Cite sources** when bringing in outside research (peer projects, practitioner platforms, volunteer-matching tools).

## What to do first when picking this up

**DO THIS FIRST, BEFORE ANY OTHER WORK:** Take the content in the Discovery log below — particularly the locked-in scope decisions from 2026-05-17 — and produce a structured **product brief**. The brief should include:

1. **User journeys per role** — Member, Practitioner, Admin: what does each one's day-in-the-life look like? Discovery → first action → recurring action → edge cases.
2. **Data model sketch** — entities (User, Practitioner, Event, Booking, Review, Bounty, CreditTransaction, etc.), key fields, relationships. Enough to validate the scope coheres, not enough to be a finished schema.
3. **Build phasing** — what genuinely has to ship for "v1 launch 2026" vs. what can be Phase 2 even though it's been scoped in. The current scope is 3–6 months; phasing may compress that.
4. **Open mechanism items still to resolve** — specialist rate table, vetting process, modalities list, event payment model, booking calendar specifics (TZ, cancellation, duration), bounty completion verification rules.
5. **Architectural open questions** — multi-tenant vs separate-Supabase per Reciprocate group, cross-Reciprocate credit ledger location (HAND-level or Mystic Hearts-level), auth provider.

Save the brief to this folder as `BRIEF.md`. Do **not** start writing application code, choosing UI libraries, or generating design files until the brief is reviewed and signed off by koH. The point of the brief is to make the ambition legible before any code gets written, because v1 grew significantly during the 2026-05-17 discovery session and the founder explicitly wants a structured product brief before architecture begins.

After the brief: confirm with koH which open items to resolve next, then update CLAUDE.md's Discovery log with new decisions as they're made.

---

## Discovery log

Capture short notes here as the discovery conversation moves. Don't rewrite history; append.

**2026-05-17**
- Mystic Hearts is **the first Reciprocate group actually receiving HAND's accompaniment** — the hands-on business-side help advertised on `/reciprocates/` (branding, web presence, LLC formation, long-arc support). So this product surface doubles as a case study of what HAND does *for* Reciprocate groups.
- **Anonymous feedback = practitioner reviews**, simple v1. Serves everyone (community quality signal). Not "feedback to HAND" or "feedback to a specific practitioner" — public-facing reviews of practitioners.
- Bias toward **keeping the first application simple**. Don't pull experiential / 3D / drone work into v1.
- **Two distinct flows, separated:**
  - *Public-facing (Mystic Hearts website):* practitioner listings (defined-list of modalities), event feed (practitioner-hosted + group gatherings, one filterable list), practitioner reviews.
  - *Operational (HAND working with Mystic Hearts):* volunteers from Mystic Hearts log hours → time-credit ledger. This is the skill-exchange-volunteerism mechanism, run by HAND as part of accompaniment. May or may not need a public web surface in v1 — open question.
- **Modalities list TBD** — needs to come from Mystic Hearts itself; don't invent one.
- **Time-credit ledger is public** (anonymized): transparency surface showing total hours given / credits in circulation. v1 web feature, not just internal.
- **Credits are cross-Reciprocate** (HAND-wide pool, not Mystic Hearts only). Mystic Hearts is the proving ground for HAND's pool-of-resources model going live. **Implication:** the credit system is HAND-level infrastructure, not Mystic-Hearts-local. Design must accommodate other Reciprocate groups even though Mystic Hearts is the only one at launch.
- **Reviews are verified-attendee only** — requires user accounts + event attendance tracking + review-eligibility gating. Not a static site anymore; needs backend + auth.
- **Surface:** subdomain `mystichearts.handprotocol.org` to start; own domain when "the rest comes together" (later milestone, not v1).

### Scope decision 2026-05-17
v1 is **accepted as full scope** — not a static site, a real app build. v1 includes:
- User accounts + auth
- Practitioner listing (defined modalities, list TBD from Mystic Hearts)
- Event feed (practitioner-hosted + group gatherings, one filterable list)
- Event attendance tracking (link accounts to attended events)
- Practitioner reviews (verified attendees only, anonymous in display, public-facing)
- Public anonymized time-credit ledger (total hours given, credits in circulation)
- Volunteer hour logging → credit issuance (HAND ops admin tool feeds the ledger)
- **Credit redemption mechanics:**
  - Full credits → Mystic Hearts practitioner sessions (1:1)
  - Partial credits → discounts on group events
- **Cross-Reciprocate credit pool:** designed-in, dark-launched. Data model accommodates other Reciprocate groups. Actual cross-group redemption activates when HAND onboards a 2nd group (future, not v1).
- Surface: `mystichearts.handprotocol.org` subdomain; own domain later.

This shape implies a backend, a database, auth, an admin surface (for HAND ops + practitioners), and a member surface. Significantly larger than the original "event + practitioner listing" framing.

### Architecture decisions 2026-05-17
- **Stack:** Next.js + **new dedicated Supabase project** (do NOT reuse the btcminer Supabase). Isolated data for Mystic Hearts; matches the "designed to accommodate other Reciprocate groups" architecture later (each group could be its own Supabase, or the schema extends to multi-tenant — open question).
- **User roles confirmed:** Member, Practitioner, Admin (combined HAND-ops + Mystic-Hearts-curator into one role; splittable later).
- **Public/unauthenticated browsing:** not explicitly selected — needs confirmation. Most likely yes for practitioner + event + ledger discovery surfaces, but worth confirming.
- **Event payments:** open question, design to accommodate (Stripe + credits + free-with-credit-tip all plausible).
- **Modalities:** deferred until practitioner schema is being built.

### Attendance verification + review eligibility (locked in 2026-05-17)
Practitioner has an internal (logged-in) page per event with:
- A **QR code** to display/share at the event
- A **shareable link** with the code in the URL slug (taps directly into a pre-filled review form)
- The raw **code** for verbal sharing

Attendees gain review eligibility via any of:
1. Scan QR → land on review form, code pre-filled
2. Click shared link → review form, code pre-filled
3. Type code manually into review form (fallback)

Practitioner has the ability to **close the review window** after N days (per-event configurable). Prevents stale reviews and gives practitioners agency over their feedback timeline.

### Public vs auth surfaces (locked in 2026-05-17)
- **Public (unauthenticated):** practitioner listings, event feed
- **Member-only (logged in):** credit ledger, RSVP, review submission, credit balance, credit spending, bounty claiming
- **Practitioner-only:** own listing edit, per-event attendance dashboard (QR/link/code), feedback-window toggle, availability calendar, bookings inbox
- **Admin-only:** everything + volunteer-hour logging + credit issuance + practitioner invitations + specialist vetting + bounty creation/verification + moderation

### Credit economy (locked in 2026-05-17)
**Two-tier issuance:**
- **Tier 1 (general):** 1 hour of Mystic Hearts volunteer labor = 1 credit. Event setup, helping out, general support.
- **Tier 2 (vetted specialist):** Members vetted as specialists (legal, dev, design, etc.) who contribute specialized work outside general parameters earn credits at a higher rate. Rate determined per task by admin judgment (or rate table TBD).

**Implication:** system needs a "specialist" designation on member profiles, a vetting workflow (admin-driven, process TBD), and the ability to mark a task/bounty as "general" or "specialist" with a credit value.

**Redemption (v1):**
- Full credits → Mystic Hearts practitioner sessions (1:1)
- Partial credits → discounts on group events
- Cross-Reciprocate redemption: data model accommodates, dark-launched

### Bounty board (locked in 2026-05-17)
Volunteer tasks live on a bounty board, not ad-hoc admin logging.
- Admin posts needs with credit values
- Members browse open bounties
- Member claims a bounty (locks it for them)
- Member completes, submits
- Admin verifies completion → issues credits
- States: open, claimed, in-progress, completed, expired

### Practitioner onboarding (locked in 2026-05-17)
**Admin-curated invite-only.** No public application form in v1. Admin invites practitioners directly. Highest-trust path; reflects Mystic Hearts as a curated collective, not a marketplace.

### Booking system (locked in 2026-05-17)
**Real-time calendar:** practitioner sets availability, member picks slot, session is created in the system. Open sub-questions:
- Single time zone or multi? (likely single if MH is location-based)
- Cancellation policy + window
- Session duration (per-listing? per-slot?)
- Calendar export (Google Cal, iCal) — nice to have
- Notifications (email at minimum, SMS optional)

### v1 deliverable summary (as scoped 2026-05-17)
1. Next.js app on dedicated Supabase, deployed to `mystichearts.handprotocol.org`
2. Auth (member / practitioner / admin roles)
3. Public practitioner directory (admin-curated, defined-modality)
4. Public event feed (practitioner-hosted + group gatherings, one filterable list)
5. Member-only credit ledger (anonymized public totals + private personal balance)
6. Practitioner profile pages with reviews
7. Real-time practitioner booking calendar
8. Event attendance verification (QR / shareable link / manual code)
9. Verified-attendee anonymous practitioner reviews with practitioner-controlled time windows
10. Bounty board (admin posts, members claim, admin verifies, credits issued)
11. Two-tier credit system (general 1:1 + vetted-specialist rates)
12. Credit redemption flows: practitioner sessions + event discounts
13. Cross-Reciprocate-credit data model (dark-launched for future activation)

### Reality check 2026-05-17
What started as "event + practitioner listing, simple" is now a full-stack product with substantial mechanism: auth, scheduling, time-banking economy, vetting, bounty marketplace, attendance verification, reviews, and cross-Reciprocate infrastructure. This is **a 3-6 month focused build**, not a weekend. Worth a structured product brief before architecture / design begins. Open mechanism items still to resolve: specialist rate table, vetting process, modalities list, event payment model, booking calendar specifics, bounty completion verification rules.

---

**Founder:** koH (cshearer210@gmail.com)
**HAND parent repo:** `/home/koh/Documents/handprotocol/`
**This folder:** `/home/koh/Documents/mystichearts/` (sibling to HAND, its own project)
