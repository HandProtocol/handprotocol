---
date: 2026-05-19
status: research-only
purpose: Decision-fuel for HAND Command Center v1 feature scope
time_box: 30 minutes
---

# Grant Management Platform Survey — for HAND Command Center

Solo-founder lens. Pre-501(c)(3). Current state: one markdown file per grant + rendered HTML view. Goal: identify the 8-12 features worth building first.

---

## 1. Sweetspot (sweetspot.so)

URL: https://www.sweetspot.so — confirmed live 2026.

- **Value prop:** AI workspace for government RFP/grant pursuit — discovery + pipeline + drafting in one secure surface, claims "6x more RFP value" without headcount growth.
- **Top features:** (1) Discovery across SAM.gov, USAspending, FPDS, DIBBS + 1,000 state/local sources; (2) Pipeline management discovery→award; (3) "Shred and draft" RFP-to-compliance-matrix engine; (4) Organization Library of institutional knowledge; (5) Enterprise security (CMMC L2, SOC 2 II, FedRAMP Mod Ready).
- **Workflow assumptions:** Seeker-side. Built for established gov-contracting firms with prior-performance history. Team-oriented, not solo.
- **AI:** Maps past proposals to new RFPs; natural-language Q&A on opportunity requirements / incumbents / win probability; auto-drafts sections in minutes.
- **Integrations:** SharePoint, Salesforce.
- **Pricing signal:** Not public — enterprise sales motion. Likely $$$ ($500-$2,000+/mo).
- **HAND borrow?** Borrow the "Org Library + map-to-RFP" idea. Skip the gov-RFP scaffolding — HAND lives in private foundations, not SAM.gov.

## 2. Instrumentl (instrumentl.com)

URL: https://www.instrumentl.com — confirmed live 2026.

- **Value prop:** "One platform to find, write, manage and collaborate on grants" — claims $1.1B+ managed.
- **Top features:** (1) Fit-scored discovery against 450K funders / 33K active RFPs; (2) Saved searches with weekly pipeline updates; (3) Calendar + auto-tasks from award letters; (4) Shared workspace with funder profiles, templates, history; (5) AI proposal drafting tuned to funder context + character limits.
- **Workflow assumptions:** Seeker-side. Scales from solo consultant to large nonprofit dev team.
- **AI:** Discovery matching using 10+ years of 990 data, hidden giving-pattern detection, drafting, budget extraction from award docs.
- **Integrations:** Accounting, calendar, CRM (vendors unnamed). GrantHub now lives in the Instrumentl family.
- **Pricing signal:** ~$299/mo per third-party comparison [unverified — site shows trial only].
- **HAND borrow?** Yes — fit-scoring + 990-driven funder intel is the gold standard. Worth modeling lightweight version.

## 3. Submittable (submittable.com)

URL: https://www.submittable.com — confirmed live 2026.

- **Value prop:** Grant + CSR lifecycle software for **grantmakers** running intake → review → decision → reporting at scale.
- **Top features:** (1) No-code form builder with eligibility checks; (2) Multi-stage review workflows; (3) Identity verification / fraud prevention; (4) Real-time budget tracking; (5) Impact reporting across programs.
- **Workflow assumptions:** Funder-side. Mid-to-large org. Built for teams.
- **AI:** Data verification automations ("verify mountains of data in minutes"). Light AI footprint compared to peers.
- **Integrations:** Not surfaced on homepage [unverified].
- **Pricing signal:** Enterprise — contact-sales.
- **HAND borrow?** Mostly skip. HAND is a seeker right now; only borrow the form/intake patterns when HAND begins making grants out of the pool.

## 4. Fluxx (fluxx.io)

URL: https://www.fluxx.io — confirmed live 2026.

- **Value prop:** Enterprise grants management for foundations (MacArthur, Ford, Knight) — data-driven grantmaking.
- **Top features:** (1) Grantee portal for collaborative intake; (2) Connected-data model linking grantee, grant, payment, report; (3) Grantelligence™ analytics with 7000+ visualizations; (4) Fluxx AI [unverified scope]; (5) Third-party integrations via configurable connectors.
- **Workflow assumptions:** Funder-side enterprise. Built for foundations doing $50M+/yr.
- **AI:** Fluxx AI mentioned but not detailed [unverified].
- **Integrations:** Generic third-party API connectivity.
- **Pricing signal:** Enterprise — six figures/yr typical for this tier.
- **HAND borrow?** Skip. Wrong scale, wrong side of the table.

## 5. Foundant GLM (foundant.com)

URL: https://www.foundant.com — confirmed live 2026.

- **Value prop:** All-in-one grantmaking platform for community / family / education / health foundations.
- **Top features:** (1) Unlimited users (applicants, reviewers, staff, board) — no per-seat fees; (2) User-configurable forms and workflows; (3) Historical funding + impact insights; (4) CommunitySuite tie-in for orgs that do more than grants; (5) "Product Feedback Loop" — clients influence roadmap.
- **Workflow assumptions:** Funder-side, mid-market foundations.
- **AI:** None highlighted [unverified].
- **Integrations:** CommunitySuite is the primary hook.
- **Pricing signal:** Mid-market — likely $5K-$30K/yr [unverified].
- **HAND borrow?** Borrow the "unlimited users" philosophy when HAND starts onboarding grant admins.

## 6. GrantHub / Foundant for Grantseekers (grantseekers.foundant.com)

URL: https://grantseekers.foundant.com — confirmed live 2026, now under Instrumentl family.

- **Value prop:** Lightweight "after you find the grant" tracker — pipeline, deadlines, documents, reports.
- **Top features:** (1) Pipeline view (amount, deadline, contact, requirements); (2) Calendar + automated email reminders for tasks; (3) Document vault (990s, 501c3 letter, budgets, boilerplate); (4) Reporting on grant portfolio; (5) Search across 28M historical grants.
- **Workflow assumptions:** Seeker-side, small-team nonprofits.
- **AI:** Minimal — more "organized spreadsheet" than AI tool.
- **Integrations:** Light. Email + calendar reminders.
- **Pricing signal:** ~$1,200/yr historical [unverified].
- **HAND borrow?** Yes — this is the closest analog to HAND's current markdown setup. Mirror the pipeline-view + doc-vault pattern.

## 7. Survey Tier (one-liner each)

- **OpenWater (openwater.com):** Funder-side reviewer-centric platform — strong custom review forms, mobile reviewer access, also runs awards/abstracts/scholarship programs.
- **Cybergrants / Bonterra Impact (impact.cybergrants.com):** Corporate CSR + grants, auto tax-ID verification, watch-list screening, AP-system integration. Built for Fortune 500 CSR teams.
- **Apricot (bonterratech.com/product/apricot):** Case management for human-services nonprofits — not really a grants tool; tracks beneficiaries.
- **Network for Good (networkforgood.org):** AI-coached fundraising for tiny nonprofits — donor-facing, not grant-facing.
- **Common Grant Application:** Regional standardized form initiative — relevant as inspiration for HAND publishing its own application template.

## 8. AI-Native Entrants (2025-2026 cohort)

- **Grant Assistant by FreeWill (grantassistant.ai):** Trained on 7,000+ winning proposals; semantic discovery + drafting that preserves org voice. Custom pricing.
- **Grantable (grantable.co):** "Persistent AI coworker" — GrantGraph™ over 130K funders / 11M data points, RFP compliance checklist extraction, content library auto-recall. Free → $50/mo → $150/mo (nonprofit discount halves it). **Closest fit to what HAND wants.**
- **Grantboost (grantboost.io):** Single-purpose AI drafter, $19.99/mo. No discovery, no pipeline.
- **Granted AI (grantedai.com):** Discovery + apply across "every grant in existence" [unverified scope].
- **BoardOnTrack:** Board governance tool — adjacent, not a grants tool. Mention only because question listed it.

---

## CONSOLIDATED FEATURE LIST (by lifecycle stage)

Legend: **[TS]** table-stakes · **[D]** competitive differentiator · **[A]** aspirational

### Discovery
- Funder database search w/ keyword + sector filters **[TS]**
- 990 / historical-giving pattern analysis **[D]**
- Fit-score against org mission + program areas **[D]**
- Eligibility pre-vetting (geography, org type, budget size) **[TS]**
- Saved searches with periodic digest emails **[TS]**
- Hidden-giving / unsolicited-funder detection **[A]**
- Deadline radar across saved opportunities **[TS]**

### Drafting
- Section-by-section AI drafting tuned to funder context **[D]**
- Org-voice preservation via persistent context **[D]**
- Reusable content library / boilerplate auto-recall **[TS]**
- Character/word-limit awareness baked into drafts **[TS]**
- Version control + collaborative editing **[TS]**
- RFP compliance checklist extraction **[D]**
- Inline AI edit + rewrite without leaving doc **[D]**
- Budget builder + auto-extraction from award docs **[A]**

### Review & Approval
- Internal review rounds w/ comments **[TS]**
- Approval checklists **[TS]**
- Conflict-of-interest flagging **[A]** *(not worth building for solo team)*
- Multi-reviewer scoring rubrics **[A]** *(not worth building for solo team)*
- Board sign-off workflow **[A]** *(not worth building for solo team)*

### Submission
- Attachment vault (990, 501c3, budgets, boilerplate, founder bio) **[TS]**
- E-sign integration **[A]**
- Direct submission portal integration **[A]** *(rarely works — most funders use custom portals)*
- Submission confirmation log **[TS]**

### Post-Submission
- Status tracking (submitted → under review → decision) **[TS]**
- Funder-communication log (emails, calls, notes) **[TS]**
- Follow-up scheduler with reminders **[TS]**
- Decision capture w/ reason codes **[D]**

### Award Management
- Kickoff checklist on award **[TS]**
- Reporting cadence calendar **[TS]**
- Deliverable tracker **[TS]**
- Renewal-awareness pings **[D]**
- Payment / disbursement ledger **[A]** *(only matters once HAND has 5+ active awards)*

### Knowledge Capture
- Win/loss retrospectives **[D]**
- Searchable past-proposal library **[TS]**
- Funder relationship history / touchpoint log **[D]**
- Reason-for-rejection tagging that feeds future fit-scoring **[D]**

### Reporting & Analytics
- Pipeline value (submitted $ + expected-value $) **[TS]**
- Win rate by funder / sector / size **[D]**
- Cycle time (research → submit → decision) **[D]**
- Funder concentration risk **[A]**
- ROI per hour spent **[A]**

---

## Features that look great but are NOT worth building for HAND (solo, pre-501c3)

- Multi-reviewer scoring rubrics + COI workflows — heavy review-board machinery
- E-sign + submission-portal direct integrations — fragile, every funder different
- Enterprise SSO, SOC 2-grade audit logging, role matrices
- Disbursement ledger, AP integration, fraud screening
- Beneficiary case-management (that's Apricot territory, not HAND's)
- A 130K-funder database — HAND should curate ~50-150 high-fit funders, not crawl the universe

---

## Recommended Feature Set for HAND Command Center v1 (8-12 features)

Anchored on: solo operator, pre-501c3, markdown-native today, audience = future grant admins joining the pool.

1. **Grant pipeline view** — list of all grants with status (researching / drafting / submitted / decided / awarded / closed), amount, deadline, fit-score. Renders from existing markdown frontmatter. **[TS]**
2. **Curated funder library** — ~50-150 hand-picked funders with mission alignment notes, prior touchpoints, frontmatter-driven. Not a 130K crawl. **[TS]**
3. **Fit-score field per funder** — simple 1-5 with reasoning captured in markdown body; sortable in pipeline view. **[D]**
4. **Deadline radar** — calendar surface with 30/14/7/1-day pings; sourced from frontmatter `deadline:` fields. **[TS]**
5. **Boilerplate library** — versioned snippets (mission, team bios, 501c3 status, budget summary, theory of change) that drafts can pull from. **[TS]**
6. **Drafting assistant w/ HAND voice baked in** — Claude/agent that drafts sections grounded in `framing/` + `updates/` + boilerplate. Org-voice is the differentiator. **[D]**
7. **RFP checklist extractor** — paste a funder's guidelines, get a structured requirements checklist into the grant's markdown file. **[D]**
8. **Submission log + status tracker** — append-only log per grant: submitted-on, follow-up-on, decision-on, decision-reason. **[TS]**
9. **Win/loss retrospective template** — auto-prompted on `decided` status flip; captures lessons → feeds future fit-scoring. **[D]**
10. **Funder-touchpoint log** — every email/call/intro captured against the funder record, not the grant record (relationships outlive single applications). **[D]**
11. **Renewal/recurring-deadline awareness** — calendar surface for annual cycles even when no application is open yet. **[D]**
12. **Pipeline analytics** — submitted-$, expected-value (amount × fit-score), win rate, cycle time. Single dashboard tile. **[D]**

**Deliberately deferred:** multi-reviewer workflows, e-sign, portal integrations, disbursement ledger, COI tooling, enterprise SSO. Add when there are 3+ admins or 10+ active awards.

**The wedge insight:** HAND already has markdown-as-source-of-truth. Don't replace that — build a renderer + agent layer on top. Every feature above is "frontmatter + agent + view," not "database + form + workflow engine." That's the differentiator vs. every platform surveyed.

---

## Sources

- [Sweetspot — sweetspot.so](https://www.sweetspot.so)
- [Instrumentl — instrumentl.com](https://www.instrumentl.com)
- [Submittable — submittable.com](https://www.submittable.com)
- [Fluxx — fluxx.io](https://www.fluxx.io)
- [Foundant — foundant.com](https://www.foundant.com)
- [GrantHub — grantseekers.foundant.com](https://grantseekers.foundant.com)
- [Grant Assistant — grantassistant.ai](https://www.grantassistant.ai)
- [Grantable — grantable.co](https://grantable.co)
- [OpenWater — openwater.com](https://openwater.com/grant-management-software/)
- [Cybergrants — impact.cybergrants.com](https://impact.cybergrants.com/solutions/grants-management-grantmaking/)
- [Network for Good — networkforgood.org](https://www.networkforgood.org/)
- [Granted AI — grantedai.com](https://grantedai.com/)
- [Grantboost — grantboost.io](https://www.grantboost.io/)
