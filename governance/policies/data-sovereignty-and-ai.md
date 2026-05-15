# Data Sovereignty and AI Policy

> Operationalizes the eight Sovereign Reciprocates sovereignty principles into binding policy. Establishes Model Card templates, consent frameworks, Algorithmic Impact Assessments, and the Annual AI Accountability Report.

**Status:** Draft v0.1 · May 2026 · Pre-adoption · Pending Sovereign Reciprocates Oversight Committee review

---

## Section 1. Purpose

This Policy governs HAND Protocol Foundation's design, deployment, evaluation, and stewardship of artificial intelligence systems, especially the Sovereign Reciprocates program. It exists to:

a. Translate the eight sovereignty principles from [`../../AI-RECIPROCATES.md`](../../AI-RECIPROCATES.md) into binding organizational commitments.

b. Comply with emerging responsible-AI funder expectations (McGovern Foundation, Mozilla, Ford, Omidyar, Google.org).

c. Adopt the CARE Principles for Indigenous Data Governance (Collective Benefit, Authority to Control, Responsibility, Ethics) as a baseline for community-data work.

d. Establish the artifacts (Model Cards, Algorithmic Impact Assessments, consent forms, accountability reports) that funders and Reciprocate groups can inspect.

e. Provide content guardrails for AI output, complementing the Community Standards Policy.

## Section 2. Scope

This Policy applies to:

a. The Sovereign Reciprocates program: per-Reciprocate-group agent systems and the HAND coordination agent.

b. Any other AI system the Corporation deploys, develops, evaluates, or relies upon materially for operations.

c. Vendor AI systems used by Corporation staff for Corporation work (e.g., Claude or GPT for drafting, transcription, summarization).

d. Training data, fine-tuned weights, evaluation logs, and inference artifacts produced under any of the above.

## Section 3. The eight sovereignty principles, as binding commitments

The Corporation commits, as binding policy:

### Principle 1. Open base model

a. The Sovereign Reciprocates inference stack runs on an **open base model** (Llama 3.1 8B, Mistral 7B, or successor open-weights model selected by the Oversight Committee).

b. Proprietary APIs (Claude, GPT, Gemini) may be used for prototyping, evaluation comparison, or burst capacity, but never as the only path between a Reciprocate group and their agent.

c. The Oversight Committee documents the base model and version for each deployment.

### Principle 2. Reciprocate-group-owned adapter

a. Each per-group LoRA adapter is the property of the Reciprocate or Reciprocate group whose work and voice trained it.

b. Ownership is recorded at training time in a signed ownership document referencing the training data sources and the consent under which they were used.

c. The Corporation holds the adapter in trust during the engagement.

d. On departure, graduation, dissolution, or written request, the Corporation transfers to the Reciprocate group: the adapter weights, the training data (as the group can receive it), the evaluation logs, and a portable inference recipe sufficient to run the adapter on commodity hardware.

### Principle 3. Revocable training consent

a. Every datum used for training is tagged with its source and the consent under which it was contributed.

b. A Reciprocate group may revoke training consent at any time.

c. Upon revocation, the Corporation **within 30 days**:
- Identifies all affected adapters and training runs.
- Either retrains the adapter without the revoked data, OR destroys the adapter.
- Documents the action in the adapter's audit trail.
- Notifies the Reciprocate group of completion.

d. The 30-day SLA is a target, not a ceiling. If circumstances require more time, the Corporation negotiates an extension with the Reciprocate group in writing.

### Principle 4. No cross-Reciprocate-group data extraction

a. Training data, embeddings, fine-tuning gradients, and other derivatives produced from one Reciprocate group's work are not used for another Reciprocate group's adapter, model, or analysis.

b. A "platform model" trained across all Reciprocate groups is prohibited.

c. Cross-Reciprocate-group analysis at a pattern or methodology level (e.g., "we learned that organizations of this shape benefit from this kind of accompaniment") is permitted **only with each contributing group's explicit, scoped, opt-in consent**, and only at a level of de-identification that prevents inference of source.

d. The HAND coordination agent, which serves HAND staff, runs on a separate model that has access to staff-side data (intake forms, cohort patterns, Contributor capacity) but not to individual Reciprocate-group session data.

### Principle 5. Self-hostable end-to-end

a. The Sovereign Reciprocates stack (inference, training, evaluation harness, tool integrations) is documented sufficiently that a Reciprocate group with a sufficient laptop or a low-cost VPS could run it themselves.

b. Self-hosting documentation is maintained alongside the code.

c. Annual **self-hosting drill**: at least once per year, a Reciprocate group exercises self-hosting (with HAND support) to validate the recipe.

### Principle 6. Full audit trail, inspectable by the group

a. Every model call (prompt, completion), retrieval operation, tool invocation, and reviewer disposition is logged.

b. Logs are accessible to the Reciprocate group at any time, in a structured format.

c. Logs are retained for 5 years.

d. Log integrity is protected against tampering (append-only storage or equivalent).

e. The Corporation does not delete logs even on Reciprocate-group request; the Reciprocate group's privacy is protected through access controls, not deletion. Exception: when the underlying training data is revoked under Principle 3, the corresponding training log entries are removed in sync.

### Principle 7. Open methodology, open code, open eval, open quarterly reports

a. The agent scaffolding code, training methodology, and evaluation harness are released open-source: **MIT** for code, **CC BY-SA 4.0** for documentation.

b. Quarterly reports on the Sovereign Reciprocates program are published publicly.

c. The evaluation framework ([`../../AI-EVAL-FRAMEWORK.md`](../../AI-EVAL-FRAMEWORK.md)) is published and updated.

d. Aggregate, de-identified outcomes are published.

e. Methodology papers are submitted to relevant open-access venues.

### Principle 8. Adapter weights: case-by-case publication

a. **Adapter weights are not published by default.** Adapter weights can leak training patterns even without raw data, and the privacy risk is real.

b. Each Reciprocate group decides if their adapter is published. The Corporation supports the group's decision in either direction and does not pressure.

c. If published, the publication is accompanied by a Model Card (Section 5) and a clear consent record.

d. Even when not published, the adapter remains the Reciprocate group's property and is portable on request (Principle 2).

## Section 4. Reciprocate-Group Consent Framework

Before training begins for any Reciprocate or Reciprocate group, the Corporation obtains a signed **Reciprocate Consent Framework** document covering:

a. **Identity of the Reciprocate or Reciprocate group**, including authorized signatories.

b. **Scope of training data**: what types of data the group is contributing (documents, transcripts, etc.), what time periods, what redaction or anonymization applies.

c. **Purpose of the adapter**: what it will help the Reciprocate group do.

d. **Revocation right**: that consent is revocable at any time, with a 30-day retrain-or-destroy SLA.

e. **Audit access**: that the Reciprocate group has full access to its own audit logs.

f. **Ownership**: that the adapter, training data, logs, and inference recipe are the Reciprocate group's property.

g. **Cross-group prohibition**: that nothing from this group's training data will be used to train another group's adapter.

h. **Self-host option**: that the group may, at any time, take the system off HAND infrastructure.

i. **Publication preference**: whether the group consents to publication of the adapter weights (default: no).

j. **External use**: how (and whether) HAND may discuss the engagement publicly. Default: not without specific case-by-case consent.

k. **Term**: typically aligned with the program engagement, with auto-revocation on graduation.

l. **Exit and graduation**: what happens at the end of the relationship.

A copy is retained permanently per Document Retention. The Reciprocate group keeps the original.

## Section 5. Model Card template

Every deployed Sovereign Reciprocates agent has a published Model Card following the structure of Mitchell et al. (2018), adapted for HAND:

```
MODEL CARD, [Reciprocate group identifier or "Group N" if anonymized]

Model Details
- Base model: [Llama 3.1 8B / Mistral 7B / other]
- Adapter type: LoRA / QLoRA
- Adapter rank: [r value]
- Training date: [YYYY-MM-DD]
- Adapter version: [v0.x]
- Model card version: [v0.x]
- Owners: [Reciprocate group name]; held in trust by HAND Protocol Foundation

Intended Use
- Primary intended uses: [domain-specific scaffolding tasks]
- Primary intended users: [Reciprocate group staff and HAND program lead]
- Out-of-scope: [Clinical advice, legal advice, financial advice, high-stakes
  external decisions without human authorship.]

Factors
- Relevant factors: [Language used, geographic/cultural context, domain]
- Evaluation factors: [As above, plus performance across these factors]

Metrics
- Model performance measures: [Domain-specific quality, helpfulness, factuality]
- Decision thresholds: [Confidence levels, source-citation completeness]
- Variation approaches: [How metrics vary across factors]

Training Data
- Datasets: [Reciprocate-group-provided documents, redaction status]
- Motivation: [What the data is intended to teach the model]
- Preprocessing: [Tokenization, filtering, redaction]
- Consent: [Reference to Reciprocate Consent Framework]

Evaluation Data
- Datasets: [Held-out subset; synthetic eval set]
- Motivation: [As above]
- Preprocessing: [As above]

Quantitative Analyses
- Unitary results: [Aggregate metrics]
- Intersectional results: [Across relevant subgroups]

Ethical Considerations
- Sensitive use: [What kinds of inputs trigger heightened human review]
- Mitigations: [Human-review gate; content guardrails; consent revocation]

Caveats and Recommendations
- Known limitations: [E.g., hallucination on dates and numbers; domain drift over time]
- Recommendations: [Source verification on factual claims; quarterly re-evaluation]

Audit Trail
- Log access: [How the Reciprocate group accesses logs]
- Log retention: [5 years]
- Algorithmic Impact Assessment: [Link]

Sovereignty Status
- Ownership signed: [Date]
- Consent on file: [Date]
- Last sovereignty drill: [Date]
- Last revocation drill: [Date]
- Self-host recipe published: [Y/N, date]
- Adapter weights publication consent: [Y/N]
```

Model Cards are public unless the Reciprocate group requests anonymization (using "Group N" identifiers).

## Section 6. Algorithmic Impact Assessment

Before each Sovereign Reciprocates deployment to a new context (a new Reciprocate group, a new use case for an existing group, or a material model change), the Sovereign Reciprocates Oversight Committee completes an Algorithmic Impact Assessment:

```
ALGORITHMIC IMPACT ASSESSMENT, [Deployment identifier]

1. Description
- What system is being deployed
- Who is the operator (HAND, Reciprocate group, both)
- What population does it affect

2. Purpose
- What problem does it solve
- What outcomes are intended
- What are the success metrics

3. Stakeholders
- Reciprocate group (primary)
- HAND program lead (operational)
- External recipients of agent output
- Third parties named in training data

4. Potential Harms
- What could go wrong
- Who could be harmed and how
- Severity assessment (low/moderate/severe)
- Likelihood assessment (rare/occasional/frequent)

5. Mitigations
- Human-review gate
- Content guardrails
- Source citation requirements
- Domain restrictions
- Consent revocation
- Other

6. Monitoring
- What metrics are tracked
- What triggers a re-evaluation
- Who is responsible for monitoring

7. Review Schedule
- Quarterly review by Sovereign Reciprocates Oversight Committee
- Reciprocate-group review at agreed cadence
- Annual public Algorithmic Impact Assessment update

8. Decision
- Approve for deployment / Approve with conditions / Decline
- Decision date
- Approving body
- Next review date
```

Each AIA is retained permanently and is publicly available unless the Reciprocate group requests redaction or anonymization.

## Section 7. Human-review gate

a. No external output from a Sovereign Reciprocates agent is published or transmitted to a third party without explicit human review and approval.

b. Internal use within the Reciprocate group (drafting, brainstorming, retrieval) does not require review under this Section, though the Reciprocate group may set its own internal review rules.

c. The review gate is enforced at the agent scaffolding layer, not just by social convention.

d. Reviewer dispositions (approve, edit, reject, redirect) are logged.

e. The Reciprocate group designates who can review and approve external outputs on their behalf.

## Section 8. Content guardrails

Agent output is subject to the same content prohibitions as Section 4 of the Community Standards Policy. Additionally:

a. **No clinical advice.** Agent output does not provide medical diagnoses, treatment recommendations, or other content that would constitute the practice of medicine.

b. **No legal advice.** Agent output does not provide legal advice or content that would constitute the practice of law.

c. **No financial advice.** Agent output does not provide investment recommendations, tax advice, or other content that would require professional licensure.

d. **Source-grounded factual claims.** Output containing specific factual claims (dates, numbers, names, statistics, citations) is grounded in retrieved sources, and the source is referenced. Where source is unavailable, the claim is flagged as unverified.

e. **No outputs that target individuals.** Output identifying specific individuals for criticism, pressure, or harassment is prohibited.

## Section 9. Sovereignty drills

a. **Portability drill.** Annually, a Reciprocate group's adapter is run on independent infrastructure (or simulated) to verify portability. Result documented in the Annual Accountability Report.

b. **Revocation drill.** Annually, a Reciprocate group exercises consent revocation on a test subset of training data, validating the 30-day SLA. Result documented.

c. **Closure simulation.** At Gate 3 in the evaluation framework (or by year three at the latest), the Corporation simulates its own dissolution and verifies that all Reciprocate groups can continue their systems independently.

d. **Drill calendar** maintained by the Sovereign Reciprocates Oversight Committee.

## Section 10. Vendor AI use by HAND staff

Separately from the Sovereign Reciprocates program, HAND staff may use vendor AI tools (Claude, GPT, Gemini, Copilot, etc.) for staff work. The following apply:

a. **No Reciprocate-group identifiable data** is sent to vendor AI tools without that group's explicit, scoped consent.

b. **No donor-identifiable data** is sent to vendor AI tools beyond what is necessary for the immediate task and within the vendor's contractual data-handling commitments.

c. **No staff personal data** (HR matters, health information, personnel records) is sent to vendor AI tools.

d. **Vendor data-handling.** Staff configure tools to disable training-on-customer-data where the vendor offers that option.

e. **Disclosure of AI involvement** when staff use AI tools for work that represents HAND externally and the AI contribution is material.

## Section 11. Annual AI Accountability Report

Annually, no later than the anniversary of the first Sovereign Reciprocates deployment, the Corporation publishes an **Annual AI Accountability Report** containing:

a. Deployments active during the year (count, anonymized).

b. Significant events: any incidents, near-misses, complaints, or material model changes.

c. Sovereignty drill outcomes (portability, revocation, closure simulation).

d. Aggregate evaluation metrics (per the evaluation framework).

e. Changes to this Policy made during the year.

f. Plans for the year ahead.

The report is public and is shared with funders, peer organizations, and (for record) with the Sovereign Reciprocates Oversight Committee.

## Section 12. Sovereign Reciprocates Oversight Committee

a. **Composition.** At least one director, one Reciprocate-group representative, one Contributor representative, and one independent technical or ethics expert.

b. **Cadence.** Quarterly meetings minimum.

c. **Authority.** Approves new deployments, reviews AIAs, reviews Model Cards, approves Policy amendments, signs off on the Annual Accountability Report.

d. **Recusal.** Any member with a financial interest in a specific deployment recuses.

e. **Reporting.** Reports to the full Board at each Board meeting.

## Section 13. Compliance with law

a. **Algorithmic Accountability Act** and similar federal legislation: HAND will adopt requirements as they become law.

b. **Sectoral laws** (HIPAA for health information, FERPA for educational records): HAND does not currently handle protected health or educational data; if a Reciprocate group's work involves such data, sector-specific compliance is addressed in the Reciprocate Consent Framework.

c. **State AI laws** (California's transparency requirements, Texas Responsible AI Governance Act, others as enacted): HAND adopts as applicable.

d. **EU AI Act** (entry into force 2024-2026): HAND adopts applicable provisions, especially for any deployments serving EU-resident Reciprocates.

## Section 14. Open questions

- **Base model choice.** Llama 3.1 8B vs Mistral 7B vs new open-weights releases. Decision deferred to Oversight Committee at deployment time.
- **Inference infrastructure.** Self-hosted on Corporation hardware, cloud GPU on a privacy-respecting provider, or hybrid. Likely hybrid early on (cloud GPU for training, self-hosted CPU/quantized inference for serving).
- **Audit log access UI.** Logs are stored in structured form; the access UI for Reciprocate groups needs to be designed. Plain JSON download is the floor; a small inspection web app is the aspiration.
- **Cross-group consent UI.** When a Reciprocate group does consent to pattern-level sharing, the consent record needs to be clear and revocable. Process drafted; UI deferred.
- **Adapter weights publication.** Even with the case-by-case approach, the field is moving fast. Watch model-stealing and memorization research; tighten if evidence suggests current practice is insufficient.
- **Auditor / red-team capacity.** External audit or red-team review at Gate 3 transition is on the wish list; defer until funding supports.

---

*References: AI-RECIPROCATES.md (eight sovereignty principles); AI-EVAL-FRAMEWORK.md (evaluation dimensions and decision gates); Mitchell et al. (2018) Model Cards for Model Reporting; Gebru et al. (2018) Datasheets for Datasets; Carroll et al. (2020) CARE Principles for Indigenous Data Governance, Data Science Journal; Patrick J. McGovern Foundation Data Practice Accelerator; Mozilla Trustworthy AI guidelines; AlgorithmWatch Algorithmic Impact Assessment framework.*
