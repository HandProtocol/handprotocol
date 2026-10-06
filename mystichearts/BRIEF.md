# Mystic Hearts — Product Brief

**Status:** Draft for koH review. Not signed off.
**Created:** 2026-05-17
**Source of scope:** `CLAUDE.md` Discovery log, 2026-05-17 session.

This brief makes the v1 ambition legible before architecture or design begins. It is the gate the Discovery log calls for. Nothing here is final; sections marked **Open** are decisions the founder still needs to make.

---

## 1. User journeys per role

Three roles in v1: Member, Practitioner, Admin. Admin is HAND ops plus Mystic Hearts curator combined (splittable later).

### 1.1 Member

**Discovery (unauthenticated):**
- Lands on `mystichearts.handprotocol.org`.
- Browses public practitioner directory, filterable by modality.
- Browses public event feed (practitioner-hosted plus group gatherings, one list, filterable).
- Sees the public anonymized credit ledger: total hours given, credits in circulation.

**First action (sign up):**
- Creates an account to RSVP for an event, book a session, or claim a bounty.
- Auth required for any action that touches credits, attendance, or reviews.

**Recurring actions:**
- **Attend events.** RSVPs to an event. At the event, gets the attendance code from the practitioner via QR scan, shareable link, or verbal code. Code unlocks review eligibility for that event's practitioner.
- **Leave reviews.** Within the practitioner's open feedback window, submits an anonymous review. After window closes, locked out.
- **Earn credits.** Browses bounty board. Claims an open bounty (locks it). Completes the task. Submits evidence. Admin verifies. Credits land in member balance.
- **Spend credits.** Books a Mystic Hearts practitioner session (full credits, 1:1 redemption). Or applies partial credits as a discount on a group event.
- **Track balance.** Views private credit balance and personal transaction history.

**Specialist path (subset of members):**
- Some members are vetted as specialists (legal, dev, design, etc.).
- Unlocks higher-rate bounties.
- Vetting process: **Open.** Admin-driven for now.

**Edge cases:**
- Missed event = no attendance code = no review eligibility.
- Review window closed by practitioner before member submits = locked out.
- Claimed bounty not completed by member = **Open** (does it auto-release back to open after N days? Admin-released?).
- Member cancels a booked practitioner session = **Open** (credit refund? Time-window-based penalty?).

### 1.2 Practitioner

**Discovery:**
- Receives email invite from Admin (invite-only, no public application form in v1).
- Clicks invite link, completes account setup.

**Onboarding:**
- Fills profile: bio, photo, modality tags (from defined list), location/region.
- Sets recurring availability on booking calendar.
- Sets default session duration and any per-session pricing model (credits-only vs. cash vs. either). **Open.**

**Recurring actions:**
- **Post events.** Creates event listing: date/time, capacity, location (in-person or virtual), price model. System generates an attendance code, QR, and shareable link tied to the event.
- **Run events.** Displays QR / shares link / says code at event so attendees check in. Sees live attendance count.
- **Manage feedback window.** Toggles review window open/closed per event. Sets default window length.
- **Manage bookings.** Sees inbox of incoming 1:1 session requests. Accepts/declines. Conducts session.
- **Read reviews.** Views own reviews. Reviews display anonymously to practitioner as well (no de-anonymization route).

**Edge cases:**
- Invite link expires unused = Admin re-issues.
- Member books a slot, then practitioner needs to cancel = **Open** (notification + credit refund logic).
- Double-booking risk on real-time calendar = system must prevent.
- Practitioner offboarded by Admin = listing hides, existing bookings = **Open** (honor or refund?).

### 1.3 Admin (HAND ops + Mystic Hearts curator)

**Recurring actions:**
- **Invite practitioners.** Sends invite by email. Tracks invite status.
- **Vet specialists.** Reviews specialist applications/nominations. Marks members as vetted specialists. Process and criteria: **Open.**
- **Post bounties.** Creates bounty: title, description, tier (general 1 hr = 1 credit, or specialist at higher rate), credit value, expiration.
- **Verify bounty completions.** Reviews member-submitted evidence. Approves (issues credits) or rejects.
- **Log volunteer hours directly.** For Tier 1 general labor that did not flow through the bounty board (drop-in event help, etc.), Admin can log hours and issue credits manually.
- **Manage modality list.** Adds/edits the canonical modality taxonomy (initial list pending from Mystic Hearts).
- **Moderate reviews.** Acts on flagged reviews. Flagging mechanism: **Open.**
- **View ledger health.** Total credits issued, total in circulation, redemption rate, by-practitioner activity.

**Edge cases:**
- Disputed bounty completion = **Open** (no formal appeals process designed yet).
- Disputed review = moderation queue + admin discretion.
- Specialist rate dispute = **Open** (rate table vs. per-task discretion still undecided).

---

## 2. Data model sketch

Not a schema. Just the entity shape needed to validate that v1 scope coheres.

**Core entities:**

- **User** — id, email, name, role (member|practitioner|admin), created_at, is_specialist (bool), specialist_areas (string[], nullable).
- **ReciprocateGroup** — id, name, slug. Mystic Hearts is row 1. Exists in v1 to dark-launch cross-group infrastructure.
- **PractitionerProfile** — user_id, bio, photo_url, location, modality_ids (many), default_session_duration_min, pricing_model, group_id (FK ReciprocateGroup), accepting_bookings (bool).
- **Modality** — id, name, group_id (scoped to a Reciprocate group; allows other groups to have their own taxonomies later).
- **Event** — id, host_user_id (practitioner or admin), group_id, type (practitioner_hosted|group_gathering), title, description, starts_at, ends_at, capacity, location, price_model (free|credits|cash|mixed), price_amount, credit_discount_max, attendance_code, qr_url, created_at.
- **EventRSVP** — event_id, user_id, status (rsvp'd|attended|no_show), created_at.
- **EventAttendance** — event_id, user_id, verified_at, verification_method (qr|link|manual_code). Separate from RSVP because attendance is the trigger for review eligibility.
- **Review** — id, event_id, practitioner_user_id, member_user_id (stored, never displayed), rating, body, submitted_at, is_visible. Anonymity enforced at the view layer.
- **PractitionerAvailability** — practitioner_user_id, recurring_rule (RRULE-style) or one-off slot, duration_min, timezone.
- **Booking** — id, practitioner_user_id, member_user_id, starts_at, ends_at, status (requested|accepted|declined|completed|cancelled), payment_method (credits|cash|mixed), credit_amount, cash_amount.
- **Bounty** — id, created_by_admin_id, group_id, title, description, tier (general|specialist), credit_value, expires_at, status (open|claimed|in_progress|submitted|completed|expired).
- **BountyClaim** — bounty_id, claimed_by_user_id, claimed_at, submitted_at, submission_evidence, verified_by_admin_id, verified_at.
- **CreditTransaction** — id, user_id, group_id, amount (signed: positive = issued, negative = spent), source_type (bounty|specialist_task|admin_manual|practitioner_session|event_discount|refund), source_id, created_at. **The ledger is this table.**
- **PractitionerInvite** — id, email, token, invited_by_admin_id, status (sent|accepted|expired), created_at.

**Public ledger view:** aggregation over CreditTransaction (sum of positive transactions = total hours/credits given; sum of all = credits in circulation). Anonymized.

**Cross-Reciprocate readiness:** the `group_id` foreign key on PractitionerProfile, Event, Modality, Bounty, and CreditTransaction is what dark-launches the multi-group future. v1 only contains the Mystic Hearts group. When HAND onboards a 2nd group, the schema does not change; redemption rules across groups become a policy decision.

---

## 3. Build phasing

The Discovery log scopes 13 v1 deliverables at "3 to 6 months focused build." Phasing below proposes what genuinely must ship for **launch 2026** vs. what can fast-follow without breaking the launch story.

### Phase 1 (true v1, ship-blocker for launch)

1. Next.js app on dedicated Supabase, deployed to `mystichearts.handprotocol.org`.
2. Auth with three roles.
3. Public practitioner directory (admin-curated, defined-modality).
4. Public event feed (filterable).
5. Practitioner invite + onboarding flow.
6. Practitioner profile pages with reviews displayed.
7. Real-time practitioner booking calendar.
8. Event creation by practitioners with QR / shareable link / manual code generation.
9. Member RSVP + attendance verification (all three paths: QR, link, code).
10. Verified-attendee anonymous reviews with practitioner-controlled feedback windows.
11. Bounty board (admin posts general-tier, members claim, admin verifies, credits issued).
12. Credit ledger: private member balance + public anonymized totals.
13. Credit redemption flow #1: full credits to book practitioner sessions.

### Phase 1.5 (target launch window if possible, drop without blocking)

- Credit redemption flow #2: partial credits as event discounts.
- Specialist designation on profiles (admin-marked, no public application flow yet).
- Specialist-tier bounties (Admin marks bounty as specialist tier, sets custom credit value per task).
- Admin manual hour-logging (bypass bounty board for ad-hoc Tier 1 labor).
- Email notifications (booking confirmations, review-window-open, bounty-verified).

### Phase 2 (post-launch, on the roadmap)

- Specialist vetting workflow (formal application form, review process).
- Specialist rate table (vs. per-task discretion).
- Stripe integration for cash-payment events.
- Calendar exports (iCal/Google).
- SMS notifications.
- Practitioner cancellation policy enforced in code (rather than policy-only).
- Review flagging UI for members; admin moderation queue.

### Phase 3+ (parked, not on the v1 roadmap)

- Cross-Reciprocate credit redemption activation (waits on HAND onboarding a 2nd Reciprocate group).
- Experiential/3D/drone work (explicitly out of scope per CLAUDE.md).
- Mobile app (web-first).
- Own domain migration off `mystichearts.handprotocol.org`.

**Phasing reality check:** Phase 1 alone is closer to the 6-month end of the 3-to-6-month range. If launch date is fixed, Phase 1.5 items should be evaluated for Phase 2 demotion before architecture starts.

---

## 4. Open mechanism items

Decisions blocking design/architecture. Listed in roughly the order they should be resolved.

1. **Modality list.** Pending from Mystic Hearts. Without this, practitioner profiles cannot be designed. **Owner: Mystic Hearts collective.**
2. **Specialist rate table vs. per-task admin discretion.** Affects bounty creation UI and member trust in the system. Recommend per-task discretion in Phase 1, formal rate table in Phase 2 after observing what's actually offered.
3. **Specialist vetting process.** Who nominates, who decides, what evidence is required, how often is vetting reviewed. Phase 1 can be Admin-marks-manually without a formal flow; Phase 2 needs a real process.
4. **Event payment model.** Options: credits-only, cash-only via Stripe, mixed, or free-with-credit-tip. Affects Phase 1 booking + checkout scope. Recommend credits-only and free events for Phase 1; Stripe in Phase 2.
5. **Booking calendar specifics:**
   - Single time zone (Mystic Hearts is location-bound?) or multi-TZ?
   - Cancellation window (e.g., 24 hr no-penalty, then forfeit?).
   - Session duration: per-listing fixed, or member-selectable from practitioner's offered durations?
   - No-show policy for credit-funded bookings.
6. **Bounty completion verification.** What evidence is acceptable (photo, text writeup, screenshot, vouching by another member)? Admin-only verification, or peer-vouching layer? Per-bounty configurable?
7. **Review window defaults.** Default open duration after event (7 days? 30 days?). Practitioner override allowed in both directions or only to shorten?
8. **Review moderation.** Member-flagging UI in Phase 1 or Phase 2? Auto-hide on N flags or admin-review-first?
9. **Anonymous review treatment.** member_user_id is stored for audit/abuse prevention. Confirm: is the practitioner allowed to see *any* member identifier (even a hash)? Or fully anonymous to the practitioner too?
10. **Bounty claim timeout.** If claimed but not submitted within N days, auto-release back to open?
11. **Member cancellation of practitioner booking.** Refund window, partial refund tier, no-refund window.

---

## 5. Architectural open questions

Decisions that need a recommendation before code starts.

1. **Multi-tenant Supabase vs. one Supabase per Reciprocate group.**
   - Current Discovery log says "new dedicated Supabase project" for Mystic Hearts.
   - Cross-Reciprocate credit pool implies *either* a shared higher-level credit service, *or* cross-project syncing.
   - **Recommendation to validate:** Single Supabase per Reciprocate group for app data (practitioners, events, bookings, reviews, bounties). Credit ledger as HAND-level shared infrastructure (separate Supabase or a thin service) that all groups write to. This preserves group data isolation while making the cross-group credit pool genuinely cross-group.
   - **Alternative:** Single multi-tenant Supabase for everything, RLS-scoped by group_id. Simpler operationally, weaker isolation, harder for a Reciprocate group to leave with their data.
2. **Where the credit ledger lives.** Falls out of #1. If HAND-level: needs an API surface and auth federation. If MH-local: must be migrated when the 2nd group ships, and the data model on `group_id` is the migration path.
3. **Auth provider.** Supabase Auth (native, lowest friction with the stack), Clerk, NextAuth. Recommend Supabase Auth for Phase 1.
4. **File storage.** Practitioner photos, event images, bounty submission evidence. Supabase Storage is the default; confirm.
5. **Email service.** Transactional email for invites, booking confirmations, review-window notifications, bounty status. Resend or Postmark. Recommend Resend.
6. **QR + shareable link generation.** Server-side at event creation time; QR rendered as PNG/SVG stored in Supabase Storage; link is `mystichearts.handprotocol.org/check-in/{code}`.
7. **Real-time booking conflict prevention.** Database-level constraint (preferred: a slot is owned by one Booking row, unique constraint on practitioner + start_time) plus optimistic UI. Supabase Realtime channels only needed if a "calendar updates live for everyone watching" feature is desired (probably not Phase 1).
8. **Anonymity enforcement of reviews.** Application-layer (always join through a view that omits member_user_id) is acceptable; RLS-layer (forbid SELECT of member_user_id to anyone except admin) is stronger. Recommend RLS-layer.
9. **Admin tooling surface.** Custom admin UI in the Next.js app, or Supabase Studio with policies as the v1 admin tool? Custom UI is more work; Supabase Studio is unfit for non-technical admins. Recommend a minimal custom Admin section in the same app, gated by role.
10. **Sovereign Reciprocate agent system.** Out of scope for this brief per CLAUDE.md. Flagged here only so it is not forgotten when v1 is shipping.

---

## 6. What is *not* in this brief

- Visual design, color, typography, layout, component library choices.
- Copywriting, brand voice (inherited from HAND per CLAUDE.md).
- Sovereign Reciprocate AI workstream.
- 3D / drone / experiential surfaces.
- Specific Sprint plan or week-by-week timeline.

These come after this brief is signed off and the open items above are resolved.

---

## 7. Recommended next step

koH reviews this brief and chooses which open items to resolve first. Suggested order:

1. Confirm Phase 1 / Phase 1.5 / Phase 2 split or push items down.
2. Resolve the multi-tenant vs. per-group Supabase question (Architectural #1), because everything else builds on top of that.
3. Pull the modality list from Mystic Hearts so practitioner profile design can begin.
4. Decide event payment model for Phase 1.
5. Decide booking calendar specifics.

Once those five are answered, the next artifact is a thin technical architecture doc plus the data model formalized into a Supabase schema. Design (visual, UX) can run in parallel with the architecture doc once Phase 1 scope is locked.
