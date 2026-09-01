# Three Hands Healing — copy deck & gap sheet

Built page: `web/threehandshealing/index.html` (single page, anchor nav: Support · Practices · About · Book).
Maria's four blocks (Hero/Intro, How We Work Together, About teaser, Validation) are slotted below.
Anything marked **NEED (Maria)** only she can supply. Anything marked **DRAFT (us)** we write from her material and she approves.

---

## 0. One structural decision before anything else

The page is built around **three need-based paths** (Release / Restore / Reconnect) and **three bookable services** (EFT · Energy healing · Supportive conversation).

Maria's "How We Work Together" describes **two pillars, six modalities**:

| Pillar | Modalities |
|---|---|
| Physical & Systemic | targeted bodywork · Candace Silvers Energy Healing · Qi Gong |
| Mind, Behavioral & Emotional | EFT / Tapping · Systemic Family Constellations · intuitive emotional release |
| (thread through both) | empathic / intuitive / channeling-guided partnership |

**Recommended mapping (keeps the visitor-facing UX, honors her structure):**

- **Release** → EFT/Tapping, Family Constellations, emotional release
- **Restore** → bodywork, Candace Silvers Energy Healing, Qi Gong
- **Reconnect** → intuitive guidance / supportive conversation

**NEED (Maria):** what is actually *bookable*? One "session" where she blends modalities, or separate offerings (e.g. "EFT session", "Energy healing", "Family Constellations")? This decides the booking buttons and the nav.

---

## 1. Meta / SEO — DRAFT (us)

- `<title>` — currently "Three Hands Healing | Begin where you are"
- meta description — currently generic
- **NEED (Maria):** city / service area, and whether sessions are online, in person, or both (SEO + description).

## 2. Hero — HAVE (Option 1), needs trimming

Current: eyebrow "A space to arrive" · H1 "Support for a happier, healthier life." · lede "You can begin exactly where you are." · caption "Body · Emotion · Energy"

Option 1 (~80 words) is too long for a hero. Split it:

- **H1 candidate:** "Feel good in your body, at peace in your mind, aligned in your life." *(distilled from Option 1)*
- **Lede:** "Wherever you are right now is the perfect place to start."
- **Intro paragraph (directly under hero):** the rest of Option 1 ("My mission is simple…").
- CTA: "Book a Session" — fine.

## 3. Validation block — HAVE (as written) ✔

"You Don't Have to Navigate This Alone" — sits directly under the hero/intro. Ships as-is.

## 4. Support paths (three cards) — DRAFT (us)

Each card = title + 3 short lines + link. Rewrite the three lines per the mapping in §0.

## 5. How We Work Together — HAVE (Option 2), light edit

Sits after the paths. Two edits to discuss with Maria:

- "address bodily pain, structural issues, and **systemic illness**" → soften toward *support* language ("support for those living with chronic pain, tension, or illness"). Keeps it consistent with the footer disclaimer and Texas scope-of-practice.
- **"targeted bodywork"** — in Texas, hands-on soft-tissue work is licensed massage therapy (TDLR). If she holds a license, list it under Training and keep the word. If not, name what it actually is (energy-based touch, guided movement, etc.).

## 6. Practice sections (EFT · Energy · Connection) — DRAFT (us) + NEED (Maria)

Currently only three generic sections. Need a **1–2 sentence blurb per modality** (six total). We draft; she corrects:

- Bodywork — **NEED (Maria):** what kind, exactly?
- Candace Silvers Energy Healing — **NEED (Maria):** confirm the name/spelling of the lineage; one line on what it is; is she trained/certified in it?
- Qi Gong — **NEED (Maria):** taught to clients, or used within sessions?
- EFT / Tapping — have enough. **NEED (Maria):** review the tapping-point diagram (placement is flagged for practitioner review).
- Systemic Family Constellations — **NEED (Maria):** offered 1:1, in groups, or both?
- Intuitive emotional release — **NEED (Maria):** one sentence in her words.

## 7. Session steps ("What a session can feel like") — HAVE ✔

Option 2's opening paragraph ("True, lasting healing begins with absolute safety…") drops in as the intro to Arrive → Experience → Integrate.

## 8. About / Practitioner — HAVE (Option 3) + NEED (Maria)

Page currently has literal placeholders:

| Field | Status |
|---|---|
| `[Practitioner name]` | **NEED:** full name as she wants it shown |
| First-person philosophy (blockquote) | HAVE — Option 3 |
| Training | **NEED:** certifications per modality (EFT, Constellations facilitator training, Candace Silvers, Qi Gong, massage/bodywork license) |
| Experience | **NEED:** years, or one concrete sentence of the personal journey Option 3 alludes to ("I know what it feels like to seek answers" — *for what?* one honest line carries the whole section) |
| Scope | **NEED:** what she does *not* do (diagnose, treat, replace medical/mental-health care) — we can draft, she must sign off |
| FAQ (3–5) | **NEED answers:** What happens in a first session? Do I need to believe in this for it to work? Is this therapy? Online vs in person? Cancellation/rescheduling? |

Note: Option 1 and Option 3 both open "I'm Maria." On a single page, one self-intro is enough — Option 1 leads, Option 3 opens with the second sentence.

## 9. Testimonials — NEED (Maria)

Section currently holds design-preview placeholder text that must not ship. Either 2–3 real, permissioned quotes (first name or initials + how long a client) or we drop the section for launch.

## 10. Booking — NEED (Maria)

Placeholders: "60 minute session" · "Online or in person" · "Calendar connection will be added before launch."

- Session types & lengths
- Prices (or "reach out" if she prefers not to list)
- Format: online / in person / both; **location** if in person
- Booking mechanism: calendar tool (Calendly, Acuity, Square…), email, or phone?
- What happens after booking (confirmation, intake form, what to bring/wear)
- Cancellation / rescheduling policy — **NEED**, one line

## 11. Contact — NEED (Maria)

Nothing on the page yet: email · phone · Instagram/socials · city.

## 12. Footer — HAVE (draft), needs sign-off

Disclaimer already written ("…not a substitute for medical, mental-health, or emergency care…"). Maria approves; add contact line + city.

## 13. Media — NEED (Maria)

Photos are watermarked Aneta Hayne proofs. Need licensed finals + which portrait she prefers. Alt text uses her name once we have it.

---

## Copy notes on the four blocks (small edits, not rewrites)

1. **Two "I'm Maria" openings** — use one (see §8).
2. **"systemic illness" / "structural issues"** — support language, not treatment language (§5).
3. **"channeling gifts"** — her call. Some visitors lean in, some bounce. Recommend it lives in About (Option 3), not the hero.
4. **Repeated phrases across the blocks** — "meet you where you are", "root cause(s)", "living proof", "reclaim/restore" each appear 2–3×. Fine spread across a multi-page site; noticeable stacked on one page. We'll dedupe when slotting.
5. **Word count** — the four blocks total ~430 words of warm, similar-register prose. The page needs *contrast*: short factual lines (Training, prices, FAQ answers) are what make the warm copy land as trustworthy rather than vague.

---

## Questions for Maria — one reply covers everything

1. Full name to display, and confirm the business name "Three Hands Healing".
2. What is bookable? (one blended session, or named offerings) — lengths, prices, online/in-person, city.
3. How should people book? (calendar tool / email / phone) + cancellation policy in one line.
4. Contact: email, phone, Instagram.
5. Training & certifications, per modality. Do you hold a Texas massage therapy license?
6. Confirm "Candace Silvers Energy Healing" — correct name? trained in it?
7. One honest sentence about your own journey (what were you seeking answers for?).
8. Answers to 3–5 FAQs (list in §8).
9. Any real testimonials we may use, with permission?
10. Review the EFT tapping-point diagram once slotted.
11. Licensed final photos + preferred portrait.
