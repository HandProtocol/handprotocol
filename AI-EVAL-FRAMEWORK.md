# Sovereign Reciprocate Evaluation Framework

**How HAND will know whether the Reciprocate-group agent systems are earning their place, and remaining sovereign.**
*Draft v0.2 · May 2026 · Reciprocate to [AI-RECIPROCATES.md](AI-RECIPROCATES.md)*

---

## Purpose

The HAND sovereign Reciprocate agent systems exist to address one structural bottleneck named in the discovery landscape doc: *long-term accompaniment doesn't parallelize the way project-based pro bono does.* This framework is how we measure whether the systems actually do that, without quietly substituting for the relational work they were built to extend, and without compromising the Reciprocate-group sovereignty the design depends on.

The framework is designed to be **published openly** once stable. Adjacent accompaniment organizations should be able to adopt and adapt it without rebuilding from scratch.

## What we are evaluating

Six dimensions. None can be optimized at the expense of another.

| Dimension | The question it answers |
|---|---|
| **System quality** | Does the agent system (model, retrieval, tool use, memory) produce coherent, accurate, on-voice work? |
| **Reciprocate value** | Does the system make a Reciprocate group's work materially easier and HAND feel more present, not less? |
| **Staff value** | Does the coordination agent expand what a program lead can hold without burning them out? |
| **Harm avoidance** | Are wrong, harmful, or off-brand outputs caught before they reach a Reciprocate group or a funder? |
| **Governance** | Is the work accountable to the Reciprocates and Contributors whose work shapes it? |
| **Sovereignty** | Does each Reciprocate group actually own, control, and remain able to leave with their system? |

## Metrics, per dimension

### 1. System quality (technical)

- **Hallucination rate on factual claims**: % of outputs that introduce a verifiable factual error when the source data does not support it. Target: ≤ 2% on grant-context outputs, ≤ 5% on general drafting. Measured by reviewer spot-check on a 50-output rolling sample per month.
- **Retrieval precision**: % of RAG-retrieved passages relevant to the prompt. Target: ≥ 85%. Measured automatically against a labeled gold set.
- **Voice / register coherence**: Likert 1–5 from HAND staff blind-rating outputs against unedited samples from the same Reciprocate group. Target: median ≥ 4 by month 9 of the pilot.
- **Refusal calibration**: % false refusals and % false engages. Target: each ≤ 5%.
- **Tool-call accuracy** *(agent-specific)*: % of tool invocations that pass parameter validation and return the expected shape of result. Target: ≥ 95%.
- **Memory coherence over multi-turn** *(agent-specific)*: rate of context errors where the agent contradicts or forgets relevant prior-session information. Target: ≤ 3% on a curated long-session test suite.
- **Scheduled-task reliability** *(agent-specific)*: % of scheduled actions (reminders, follow-up drafts, calendar events) that execute correctly and on time. Target: ≥ 98%.
- **Failure-mode recovery** *(agent-specific)*: agent's behavior when a tool fails, memory is missing, or input is malformed. Tested via injected-failure suite at every gate. Target: graceful degradation, no runaway loops, ≤ 1 retry per failure class.

### 2. Reciprocate value (relational)

- **Time-to-first-draft** on Reciprocate-side artifacts (grant LOIs, fiscal-sponsorship intake, brand-voice copy). Baseline measured pre-agent; target: ≥ 50% reduction by month 12.
- **"Felt continuity" rating**, quarterly Reciprocate-group survey: *"HAND feels like it remembers us between our check-ins."* 5-point Likert. Target: median 4+ by month 9.
- **"Felt presence" rating**, same survey: *"When the agent helps draft something for us, it feels more like HAND showed up, not less."* 5-point Likert. Target: median 4+ by month 9. **A drop below 3 on this metric triggers a pause and review, regardless of other metrics.**
- **Reciprocate-initiated revisions**, % of agent-drafted artifacts the group materially edits before use. Tracked as a signal, not optimized. Both very high and very low values warrant investigation.

### 3. Staff value (operational)

- **Matching time** from Reciprocate-group intake to Contributor pairing. Baseline measured pre-agent; target: ≥ 40% reduction by month 12.
- **Cohort capacity**, Reciprocate groups a single part-time program lead can hold at the agreed quality bar. Baseline 2–3 pre-agent; target: 5–7 by month 15.
- **Pattern surfacing**, count of cross-cohort patterns flagged by the coordination agent that were validated and acted on by HAND staff per month. Tracked as a leading indicator of staff value.
- **Program-lead time-on-relational-work**, % of working hours the program lead spends in direct Reciprocate-group contact vs. coordination overhead. Target: shift from baseline toward more direct contact.

### 4. Harm avoidance

- **Pre-delivery review coverage**, % of agent outputs intended for Reciprocate-group, funder, or external consumption that passed through human review before delivery. Target: **100%** for the duration of the pilot. Non-negotiable.
- **Caught-in-review incidents**, outputs that were materially wrong, harmful, off-voice, or inappropriately confident, caught before delivery. Tracked openly; the rate is expected to decline over time, but the *absolute presence of human review* does not.
- **Post-delivery incidents**, anything that reached a Reciprocate group or funder and required correction or apology. Target: zero. Every incident triggers a full root-cause review and is logged in the public quarterly report.
- **Edge-case log**, running record of prompts, tool sequences, and contexts where the agent behaves unexpectedly. Reviewed at every quarterly panel.
- **Tool-action audit**, every external tool call (sending an email draft, creating a calendar event, writing to a document) requires explicit human approval until the agent has demonstrated ≥ 100 consecutive correct invocations of that tool class on the test suite.

### 5. Governance

- **Participatory review panel composition**, minimum two Reciprocates (or representatives of Reciprocate groups) and two Contributors rotating through quarterly review, in addition to HAND staff. Compensated for their time.
- **Decision-gate vote outcomes**, at each gate (POC → Pilot → Production), the panel formally approves, requests changes, or pauses the work. Outcomes published.
- **Public report cadence**, quarterly public summary of metrics, incidents, decisions, and what changed. Published on handprotocol.org.

### 6. Sovereignty *(new)*

- **Adapter ownership record**, % of trained adapters with a documented, signed ownership record naming the Reciprocate or Reciprocate group. Target: **100%.** Audited at every gate.
- **Portability check**, at each quarterly panel, one randomly selected Reciprocate-group's full handoff package (adapter weights, training data, eval logs, audit trail, self-host recipe) is generated and verified. Target: complete package generatable in ≤ 72 hours through the documented process.
- **Revocation SLA**, time from a documented revocation request to verified retrain-without-or-destroy completion. Target: ≤ 30 days. Drilled at least once per year via a simulated revocation.
- **Cross-group contamination check**, monthly automated verification that no training data tagged to group A appears in group B's adapter unless group A has documented opt-in consent. Target: zero unauthorized cross-contamination.
- **Audit-trail accessibility**, quarterly test that a Reciprocate group can pull their own complete log (model calls, retrievals, tool invocations, reviewer dispositions) on demand. Target: pull request fulfilled in ≤ 24 hours.
- **Self-host readiness**, documented self-host recipe, tested on commodity hardware (specified spec) before each gate. Target: a technically literate volunteer can stand the system up from the recipe in ≤ 1 working day.
- **Closure-simulation drill**, at Gate 3, run a HAND-closure tabletop with one Reciprocate group: can their system continue operating within 30 days using only the handoff package and self-host recipe, with no HAND infrastructure? Target: yes, with documented gaps logged.
- **Adapter weight publication consent**, for any adapter weight publication, a documented Reciprocate-group consent record exists. Default for all adapters: not published.

## Cadence

| When | What |
|---|---|
| **Continuous** | Automated logging of every agent call (prompt, retrieval, tool invocation, output, reviewer disposition). |
| **Weekly** | Internal staff review: 50-output sample, hallucination + voice check, tool-call audit, edge-case log update. |
| **Monthly** | Reciprocate-group-facing summary email: what the agent helped with this month, what it got wrong, what changed. Plus the cross-group contamination check. |
| **Quarterly** | Participatory review panel convenes. All six dimensions reviewed. Portability check on one random group. Decision-gate vote if applicable. Public report published. |
| **Annually** | Full retrospective + methodology revision + open-source release update + revocation SLA drill. |

## Decision gates

Three explicit gates. At each, the participatory review panel reviews metrics across all six dimensions and votes to *advance*, *iterate*, or *pause*. A *pause* outcome means the work stops until the named concern is addressed.

### Gate 1: POC → Pilot (end of month 3)

**Advance criteria**:
- System-quality: hallucination rate ≤ 5% on the test set; tool-call accuracy ≥ 90% on the limited POC tool set.
- Reciprocate-value: the POC Reciprocate group rates the experience 4+ on both felt-continuity and felt-presence.
- Harm-avoidance: no post-delivery incidents.
- Sovereignty: adapter ownership record signed; portability check passes; audit trail accessible to the Reciprocate group.

### Gate 2: Pilot → Production (end of month 12)

**Advance criteria**:
- All four Reciprocate-value metric targets met or trending firmly toward them.
- Cohort capacity demonstrated at 4+ Reciprocate groups with the same program lead.
- Zero post-delivery harm incidents in the prior 6 months, *or* a documented incident-response that the panel accepts.
- Sovereignty: 100% adapter ownership records, ≥ 2 successful quarterly portability checks, successful revocation drill, zero unauthorized cross-group contamination.
- Open-source draft of the eval framework published for community comment.

### Gate 3: Production → Sustainability (end of month 18)

**Advance criteria**:
- Unit economics of the agent infrastructure (training + inference + AI lead time) defensible inside HAND's operating budget without the McGovern grant.
- Adapter methodology published with at least one adjacent organization having reviewed it.
- Reciprocate-group-reported value sustained at month-12 levels through the production transition.
- Sovereignty: successful closure-simulation drill with the volunteer Reciprocate group, with all gaps documented and addressed before sign-off.
- Decision on weight-publication norms made jointly with the participatory panel; default-no remains the default unless a Reciprocate group has affirmatively chosen otherwise for their adapter.

## Roles

- **AI Lead (part-time)**, owns model and agent training, deployment, evaluation infrastructure, and reports to the program lead. Funded inside the Sovereign Reciprocates tier budget.
- **Program Lead**, owns the human review pipeline, the Reciprocate-group relationships, and the call on whether to ship any given output. Has veto on any agent deployment or tool enablement.
- **Participatory Review Panel**, minimum 2 Reciprocates (or Reciprocate-group representatives) + 2 Contributors + 1 HAND staff member, rotating quarterly, compensated.
- **External Reviewer (annual)**, an independent AI-safety practitioner reviews the framework, the sovereignty drills, and a sample of outputs annually. Their findings are published.

## What we are deliberately deferring

These questions are real and we will address them on a published timeline. They are not in scope for the first 18 months.

- **Cross-Reciprocate-group knowledge transfer.** Whether and how patterns learned working with one group are made available to another group's agent. Defaulting to *off* during the pilot. Opt-in only, and only by mutual consent if it ever happens.
- **Multi-tenant deployment for adjacent organizations.** Adoption by other capacity-building orgs is a year-three question, not a pilot-phase question. The methodology release is the on-ramp.
- **Base-model weight publication.** HAND uses open-base models (Llama / Mistral) and does not fine-tune the base. The adapter weights are the artifact whose publication is governed by the Sovereignty dimension above.
- **Federation across Reciprocate groups.** Whether multiple groups could share certain agent infrastructure (a common harm-reduction knowledge layer, for instance) is a year-three question. Sovereignty defaults remain *separate* until that work is done.

## Public release

The framework document, the eval harness code, the adapter-training methodology, the agent scaffolding code, and the quarterly reports are released under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (documents) and MIT (code), matching HAND Protocol's existing repository licensing. The intent is for organizations doing adjacent accompaniment work, fiscal sponsors, capacity-building intermediaries, peer accompaniment cohorts, to fork and adapt without re-litigating the structural design.

Adapter weights are governed by the Sovereignty dimension and are not published by default. The base models used (Llama, Mistral) are already open under their own licenses.

---

*HAND Protocol Foundation · Pre-incorporation · Comments to hand@handprotocol.org*
