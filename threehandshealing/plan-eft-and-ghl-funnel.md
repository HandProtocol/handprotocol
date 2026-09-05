# Plan — EFT "what to expect" page + GoHighLevel funnel · 2026-09-05

Status: **proposal, not built.** Cathedral became the main site on 2026-09-05
(`web/threehandshealing/index.html`). This doc is the next layer: a dedicated
EFT page and the booking/CRM funnel behind it. koH to confirm the shape, then
build.

## 0. Production domain — 3handshealing.com

koH confirmed 2026-09-05: **the production domain is `3handshealing.com`**
(numeral 3). The brand name still spells out **"Three Hands Healing"** — that
is what the wordmark says and what site copy should use; the numeral is the
domain only. This is the target for the graduation step in §8.

Parked facts, noted while checking the domain, **not driving this plan** (koH:
"don't worry about DNS or systeme.io"):

- The domain currently serves a **systeme.io "coming soon" squeeze page with an
  email opt-in on it**. The one thing that must survive the migration: **she has
  a list there — do not orphan it.** Export or forward before repointing.
- Registrar is Namecheap. The apex is CNAME'd, so there is no mailbox on the
  domain today. Whoever does the DNS cutover at launch should read this
  paragraph and nothing more.
- The logo on that page is the same mark as the brand kit, which confirms the
  vectors in `assets/brand/thh-*.svg`.

## 1. Recommendation in three lines

- **Static site stays the brand home** (our Cathedral design, our SEO, her
  domain `3handshealing.com`). **GoHighLevel (GHL) is the backend**: calendar,
  forms, CRM pipeline, email/SMS automations, review requests. We embed GHL
  widgets into our pages; we do not build the public pages in GHL's builder (we
  would lose the design, and the site already exists).
- **One new page, `/eft/`** ("EFT & Tapping — what to expect"),
  built in the Cathedral system, using the reserved photo
  `maria-eft-tapping.jpg`. It is both the SEO landing page for "EFT tapping
  Austin/Texas" and the funnel's front door.
- **Funnel = opt-in → nurture → book → remind → follow up → rebook**, all in
  GHL workflows. The site only needs two embeds: a form (opt-in) and a
  calendar (booking). The old preview's `script.js` already said "replace with
  the public GoHighLevel calendar before launch" — this was always the plan.

## 2. Wording flag: "EFT therapy"

Use **"EFT / Tapping sessions"** and **"EFT practitioner"** on the site, not
"EFT therapy" / "therapist", unless Maria holds a Texas mental-health license
(info-sheet Q3/Q4 still unanswered). In Texas, "therapy"/"psychotherapy"
language from an unlicensed provider is an exposure, and it also collides
with the footer disclaimer ("not a substitute for … mental-health care").
Internally (this doc, GHL pipeline names) "EFT therapy" is fine.

## 3. The EFT page — structure

URL `/threehandshealing/eft/` (later `threehandshealing.com/eft/`). Same
header/footer as the root; the root's Practices → "EFT / Tapping" line gets a
"What to expect →" link; the nav gets **EFT** between Practices and Sessions.

| # | Section | Content | Source |
|---|---|---|---|
| 1 | Hero | "Tapping: a simple way to let the body finish what the mind keeps holding." Eyebrow "EFT / Tapping". Photo `maria-eft-tapping.jpg` in the arch. CTA **Book a first session** + secondary **Try a 5-minute tap-along** (opt-in). | our draft |
| 2 | What EFT is | 2 short paragraphs: fingertip tapping on acupressure points while naming what you feel; used for stress, difficult emotions, old patterns. Support-language only; no clinical claims. | brief rule + Maria Q10 |
| 3 | What a first session looks like | Arrive / Experience / Integrate reused, but EFT-specific: intake conversation → rate the charge 0–10 → tap rounds together → re-rate → what to practice at home. Online or in person; "you keep your clothes on, you can stop at any time". | our draft, Maria confirms |
| 4 | The points | The tapping-point diagram (exists in `styles/original/`, marked "needs practitioner review") redrawn in the Cathedral gold hairline. Maria checks placement before launch. | Q13 |
| 5 | What people bring to EFT | 6–8 gentle bullets ("stress that lives in the body", "a pattern you keep repeating", "grief", "a hard conversation ahead"…). No diagnoses. | our draft |
| 6 | What EFT is not | One honest paragraph: complementary, not a replacement for medical or mental-health care; link to the disclaimer. Builds trust and covers scope. | footer disclaimer |
| 7 | FAQ | Session length, online vs in person, how many sessions, what to bring, cancellation. Every answer comes from the info sheet Q6–Q9, Q11. **Blocked on Maria.** | Q6–Q11 |
| 8 | Opt-in block | "A 5-minute tap-along for a stressful moment" — video or PDF, GHL form embed (first name + email; phone optional with SMS consent checkbox). | GHL form |
| 9 | Book | GHL calendar embed (replaces today's placeholder "Booking and contact details will be added at launch"). | GHL calendar |

Validation: extend `tools/validate.mjs` allowances for the EFT page (it is
allowed contact/booking embeds; the styles are not).

## 4. The funnel, stage by stage (GHL objects)

| Stage | Visitor sees | GHL does |
|---|---|---|
| Traffic | Instagram / Google Business Profile / word of mouth → `/eft/` | UTM capture on the form |
| Opt-in | 5-minute tap-along form | Contact created · tag `eft-lead` · pipeline **EFT** stage *New lead* · delivers the tap-along (email; SMS if consented) |
| Nurture | 5 emails over ~10 days: the tap-along · Maria's story (Option 3 copy) · "what a session looks like" · a client-style story (needs Q12 permission) · invite to book | Workflow with wait steps; stage *Nurturing*; stops the moment they book |
| Book | Calendar on `/eft/#book` and `/#book` | Appointment · stage *Booked* · confirmation email + SMS · 24 h + 2 h reminders · intake questions (minimal, see §6) |
| Show | Session | Maria marks attended → stage *Attended* |
| Follow up | Thank-you + home-practice note next day · review request (Google) after 3 days · rebook nudge after 10 days | Workflow · stage *Returning* or *Lapsed* after 45 days |
| Missed-call text-back | Calls Maria's number, no answer | GHL auto-texts "Hi, it's Maria — I'm in session, here's my calendar" (needs a GHL number) |

Pipelines: one **EFT** pipeline first. Energy healing / bodywork get their own
calendars later but can share the pipeline until volume justifies more.

## 5. Where pages live (three options, one recommended)

| Option | Public pages | Pros | Cons |
|---|---|---|---|
| **A · Recommended** | Static (ours) + GHL embeds | Design, speed, SEO, one codebase; GHL still owns all automation | Embeds load GHL scripts (CSP allowlist); two systems to keep in sync |
| B | Static brand site + GHL-built funnel pages on `go.threehandshealing.com` | GHL's A/B testing + funnel stats out of the box | Two visual systems; funnel pages will look like GHL templates unless heavily styled |
| C | Everything in GHL | Maria edits herself | Throws away Cathedral; weak SEO/perf; vendor lock-in |

If Maria wants to run paid ads with split tests later, add B for those
specific pages only.

## 6. Technical notes for the build

- **Embeds**: GHL form + calendar are `<iframe>`s plus a loader script from
  `link.msgsndr.com` / `api.leadconnectorhq.com` (exact hosts come from the
  embed code). `netlify.toml` sends a CSP header for this site — add those
  hosts to `frame-src`, `script-src`, `connect-src` for `/threehandshealing/*`
  only. Verify with `tools/shot.mjs` (console) and a live probe, as the
  bedazzled QA did.
- **Own the domain first**: `threehandshealing.com` (or whatever Maria owns)
  → Netlify DNS zone before launch, per the client-graduation pattern
  (DNS-zone-first so propagation overlaps the build). GHL gets `go.` or
  `book.` subdomains only if Option B is ever used.
- **Account ownership**: Maria signs up for GHL herself ($97/mo Starter is
  enough: 1 sub-account, calendars, forms, workflows, pipelines). HAND does
  not resell GHL seats — it keeps the Develop pillar clear of a recurring SaaS
  margin (see the tax memo on UBIT) and Maria owns her list. HAND gets a user
  seat to build.
- **SMS**: US SMS in GHL requires A2P 10DLC brand + campaign registration
  (days to weeks, needs her EIN/business info). Start this on day one or the
  reminders are email-only at launch.
- **Health data**: intake questions stay minimal (what brings you, anything
  I should know to keep you comfortable). GHL's HIPAA add-on is not needed
  for a complementary-wellness practice if we do not collect medical detail.
  Forms carry the disclaimer line.
- **Consent**: separate checkboxes for email and SMS; footer unsubscribe in
  every workflow email (GHL does this by default).
- **Analytics**: keep the site's own analytics; GHL reports on the pipeline.
  UTM fields on the form.

## 7. What we need from Maria before building

1. Confirm the wording: "EFT / Tapping sessions", not "therapy" (unless licensed — Q3/Q4).
2. FAQ facts: session length(s), price(s), online/in-person, city, cancellation (Q6–Q9).
3. ~~Her domain name~~ — **answered: `3handshealing.com`.** Need her registrar access, or her agreement to change nameservers, when we cut over.
4. GHL: does she already have an account? If not, is the Starter tier acceptable? Business phone number for the calendar + missed-call text-back. (She has an existing email list on another platform — plan to import it, not abandon it.)
5. Approve the tap-along lead magnet idea and record it (a 5-minute phone video is enough; we edit).
6. Check the tapping-point diagram.

## 8. Build order (once §7 is answered)

1. `/eft/` page in the Cathedral system, placeholders where Q6–Q9 are missing (≈1 session).
2. GHL: pipeline, EFT calendar, opt-in form, 5-email nurture, booking reminders, follow-up + review request (≈1 session; copy drafted here first for Maria's OK).
3. Embed form + calendar; CSP; live QA; swap the root's Book placeholder for the calendar.
4. `3handshealing.com` → Netlify DNS zone created first so propagation overlaps the build → graduate to `clients/three-hands-healing/` per the client pattern. Export her existing email list before repointing.
5. Later: energy-healing and bodywork pages on the same template; Spanish toggle if her clientele needs it.
