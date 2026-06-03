# Compliance Calendar

> Everything HAND Protocol Foundation has to file, file by, or have on hand to stay in good standing.

**Status:** Draft v0.1 · May 2026 · Living document · Pre-incorporation

This calendar assumes HAND incorporates in Texas in 2026 and files Form 1023 within the 27-month retroactive window. Adjust the year offsets once incorporation date is locked.

## Once at incorporation (T0)

| Item | Filed with | Fee | Deadline |
|---|---|---|---|
| Certificate of Formation (Form 202) | Texas Secretary of State | $25 | T0 |
| Initial organizational meeting (adopt bylaws, elect officers, approve banking) | Internal | $0 | Within 30 days of T0 |
| EIN (Form SS-4) | IRS | $0 | After T0; needed to open bank account |
| Bank account opened | Bank | $0 | After EIN |
| Registered agent consent (Form 401-A on file) | Texas Secretary of State | $0 | At T0 |
| D&O and general liability insurance bound | Broker | Quote | Before first program activity |

## Within 27 months of T0 (federal exemption window)

| Item | Filed with | Fee | Deadline |
|---|---|---|---|
| Form 1023 (full long form) | IRS via Pay.gov | $600 | Within 27 months of end of T0 month, for retroactive exempt status |
| Texas franchise tax exemption (Form AP-204) | Texas Comptroller | $0 | After IRS Determination Letter arrives |
| Local property tax exemption application, if any owned property | County appraisal district | $0 | If applicable |

## Every year

| Item | Filed with | Due | Notes |
|---|---|---|---|
| Form 990 / 990-EZ / 990-N | IRS | 15th day of 5th month after fiscal year end (May 15 if calendar year) | 990-N if gross receipts ≤$50K; 990-EZ if <$200K and assets <$500K; full 990 otherwise. Three-strike rule: three consecutive years not filed = automatic revocation |
| Annual board meeting (minimum) | Internal | At least one per year per bylaws | Texas requires nothing specific; HAND bylaws require quarterly meetings minimum |
| Conflict of Interest annual disclosure | Each director, officer, key staff | At first board meeting of fiscal year | See [`board/annual-disclosure-form.md`](board/annual-disclosure-form.md) |
| Executive compensation review (rebuttable-presumption procedure) | Board comp committee | Before any change to ED comp; at minimum annually | Treas. Reg. §53.4958-6 |
| Texas Comptroller annual sales tax exemption verification | Texas Comptroller | If they ask | Reactive only |
| Insurance renewal | Broker | Anniversary of binding | D&O, general liability, cyber if applicable |
| Strategic plan annual review | Board | Q4 | See [`programs/strategic-plan-2026-2028.md`](programs/strategic-plan-2026-2028.md) |
| **Annual Flywheel Health Check (public)** | Public | End of Q4 | Required by Bylaws §11.5. Reports three-flow volumes (Donate, Exchange, Receive), cross-participation rate, alumni return rate, and recommended program adjustments |
| Sovereign Reciprocates Annual Accountability Report (public) | Public | Anniversary of first deployment | Required by [`policies/data-sovereignty-and-ai.md`](policies/data-sovereignty-and-ai.md) and Bylaws §12.5; only applies once first AI deployment is live |

## Every four years (Texas-specific)

| Item | Filed with | Fee | Trigger |
|---|---|---|---|
| Texas Periodic Report (Form 802) | Texas Secretary of State | $5 | **On SOS request only.** Not proactive. Failure to file within 30 days of notice can cause forfeiture of corporate rights |

## When triggered

| Trigger | Action | Reference |
|---|---|---|
| Non-cash contributions exceed $25,000/year | File Form 990 Schedule M | IRS Schedule M instructions |
| Individual non-cash gift >$5,000 | Donor must obtain qualified appraisal; HAND signs Form 8283 Part IV | IRS Form 8283 instructions |
| Cumulative donations >$25K/year or >100 donations/year from a single state outside TX | Consider charitable solicitation registration in that state | Charleston Principles |
| Hiring first paid staff | Texas Workforce Commission registration (TWC); workers' comp decision; new-hire reporting | TWC |
| Hiring an Executive Director | Run rebuttable-presumption procedure (comp comm, comparability data, contemporaneous minutes) | [`policies/executive-compensation.md`](policies/executive-compensation.md) |
| Any deployed AI system | Publish Model Card; complete Algorithmic Impact Assessment; obtain Reciprocate-group consent | [`policies/data-sovereignty-and-ai.md`](policies/data-sovereignty-and-ai.md) |
| Director removal | Notice to director, 2/3 vote of remaining directors, documented minutes | [`board/succession-and-replacement.md`](board/succession-and-replacement.md) |
| ED departure | Trigger emergency or planned succession protocol within 48 hours | [`board/emergency-succession-plan.md`](board/emergency-succession-plan.md) |
| Annual receipts cross $500K | Engage CPA for **financial review** (not full audit); some funders may require | [`policies/financial-management.md`](policies/financial-management.md) |
| Annual receipts cross $1M | Engage CPA for **full audit**; required by some institutional funders | [`policies/financial-management.md`](policies/financial-management.md) |
| Gross income from any unrelated business (e.g., the Develop biz-outreach pillar) reaches **$1,000/year** | File **Form 990-T** and pay 21% on net UBTI, in addition to the 990. Threshold is on **gross**, not net | `/hand-tax` Mode A · IRS Pub 598 |
| Anticipated UBIT for the year **≥ $500** | Make **quarterly estimated tax** payments | `/hand-tax` Mode A · IRS Pub 598 |
| HAND **sells** taxable services it produces (web design = a taxable Texas "data processing service") | Apply for a **Texas Sales-and-Use-Tax permit**; collect and remit sales tax from clients. The 501(c)(3) exemption covers HAND's **purchases**, not its **sales** | `/hand-tax` Mode G · 34 TAC §3.330 |

> **Develop biz-outreach pillar — tax gate.** The tax positions for selling services (UBIT/990-T, Texas sales tax, worker classification, business-client invoicing, barter) are owned by the `/hand-tax` skill; cited brief at `~/.claude/skills/hand-tax/references/hand-tax-research.md`. **Two gates before the first Develop invoice:** (1) UBIT / entity-structure decision with counsel, (2) Texas sales-tax collection set up.

## What HAND does **not** owe

These are commonly assumed obligations that do not in fact apply to HAND:

- **Texas charitable solicitation registration.** Texas does not require general charitable solicitation registration. The three Texas solicitation statutes (LETSA, PSSA, VSA) apply only to organizations soliciting for law enforcement, public safety personnel, or veterans. None apply to HAND.
- **Form 990-PF.** Only required if HAND were classified as a private foundation. HAND will request public-charity classification under IRC §509(a)(1) and §170(b)(1)(A)(vi); private-foundation default applies only if the public support test fails.
- **Multi-state charitable solicitation, by default.** Required only when triggered by repeated/ongoing donations from a state, an active campaign targeting that state, or a paid solicitor presence. HAND's posture today is national web presence with passive donation; reassess in year two.

## Public support test

The public support test is not a single filing, it is a rolling calculation. HAND must monitor it continuously and design fundraising accordingly.

- **Window:** 5-year rolling, starting year 6 of public-charity life.
- **Threshold:** ≥33⅓% of total support from public sources.
- **Per-donor cap:** Each individual donor's contributions are counted toward the public side only up to 2% of total support over the 5-year window. Anything over the 2% is counted in the denominator but not the numerator.
- **Practical guardrail:** If any single donor exceeds **~2% of expected 5-year revenue**, the development team should consult before accepting an unrestricted gift of that size. Restructure as multi-year, designate, or solicit matching gifts to dilute the concentration.

## Renewal calendar template

```
JANUARY    fiscal year close; tax prep handoff to CPA
FEBRUARY   board meeting #1; adopt budget; refresh COI disclosures
MARCH      quarterly check-in with fiscal sponsor (if any)
APRIL      board meeting #2; Q1 financials
MAY        Form 990 filed (calendar-year filers); strategic-plan mid-year review
JUNE       sovereignty drill on a Reciprocate-group adapter (revocation/portability test)
JULY       board meeting #3; Q2 financials; insurance renewal review window
AUGUST     funder pipeline review; LOI calendar plan for Q4 cycle
SEPTEMBER  Sovereign Reciprocates Annual Accountability Report (public release)
OCTOBER    board meeting #4; ED compensation review; Q3 financials
NOVEMBER   strategic-plan revision draft for next year; Flywheel Health Check drafted
DECEMBER   year-end giving push; board ratifies next-year budget and plan; Annual Flywheel Health Check published
```

This is a template, not a rule. Adjust to actual fiscal year and incorporation date once locked.

## Open questions

- **Fiscal year choice.** Calendar year (Jan–Dec) or Texas-typical Sept–Aug to align with grant cycles? Default to calendar year for simplicity unless funder pipeline argues otherwise.
- **First 990 form.** Depends on first-year receipts. Likely 990-EZ in year one given the filing-raise goal.
- **Sales tax exemption AP-205 vs AP-204.** AP-204 is the planned path (after IRS Determination); AP-205 could provide interim relief if program purchases are large enough to matter. Decide once first-year procurement is sketched.
- **Insurance carriers.** D&O quotes from Hartford, Philadelphia Insurance, Nonprofits Insurance Alliance (NIA) pending. NIA is the nonprofit-specialist incumbent.
- **Develop pillar entity structure.** Whether to house the biz-outreach service revenue in a **taxable subsidiary** (isolates UBIT, protects exemption, handles Texas sales-tax collection) vs. running it inside HAND. Decide with counsel **before the first invoice**. See `/hand-tax` Modes A–B and G + its cited brief.

---

*HAND Protocol Foundation · Pre-incorporation · Living document. Sources: see [`../funding/grant-readiness-research.md`](../funding/grant-readiness-research.md).*
