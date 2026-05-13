# Letter of Inquiry: Sovereign Companions

**To:** Patrick J. McGovern Foundation · AI for Social Good
**From:** HAND Protocol Foundation · Austin, Texas
**Date:** May 2026
**Ask:** $111,111 over 18 months
**Contact:** hand@handprotocol.org

---

## In one paragraph

HAND Protocol Foundation is preparing to file as a 501(c)(3) in Austin, Texas, to operate a long-term, relational accompaniment model for solo healers, post-accelerator impact founders, and small grassroots collectives. We are writing because our hardest unsolved problem — *accompaniment does not parallelize the way project-based pro bono does* — is precisely the kind of structural bottleneck a small, **sovereign, open-source, Companion-group-owned agent system** can address. We propose to build and openly evaluate exactly that infrastructure, with the source code, methodology, and evaluation framework published openly and with each Companion group fully owning their own system. We are asking for **$111,111 over 18 months**.

## What sovereign means here

The design is open by default and Companion-owned by design. Eight commitments govern the work:

1. **Open base model.** Llama 3.1 8B or Mistral 7B. No proprietary API dependency for the core inference loop.
2. **Companion-group-owned adapters.** Each LoRA adapter belongs to the group it was trained for. On departure or HAND closure, the adapter weights, training data, eval logs, and a portable inference recipe are handed over.
3. **Revocable training consent** with a ≤ 30-day retrain-or-destroy SLA.
4. **No cross-Companion-group data aggregation.** No platform model. Patterns learned with one group stay with that group's adapter.
5. **Self-hostable end-to-end.** Inference, training, eval, tool integrations all runnable on commodity hardware that a Companion group could maintain themselves.
6. **Full audit trail, inspectable by the group.** Every model call, retrieval, tool invocation, reviewer disposition is logged and accessible.
7. **Open methodology, open code, open eval, open quarterly reports.** Released CC BY-SA (docs) and MIT (code).
8. **Adapter weights: not published by default.** Each Companion group makes the call for their own adapter; HAND will not pressure that decision.

These principles are operationalized as tested metrics in the accompanying evaluation framework (`AI-EVAL-FRAMEWORK.md`), with a dedicated **Sovereignty** dimension that includes portability checks, revocation drills, audit-trail accessibility tests, and a Gate-3 HAND-closure simulation.

## Who we are

HAND Protocol began in August 2024 as Web3 fundraising infrastructure for regenerative impact work. Over the next year we learned that the people we were trying to support — bodyworkers, harm-reduction organizers, food-sovereignty collectives, post-accelerator impact founders — were not crypto-native, and that crypto was the wrong starting tool. In early 2026 we pivoted: HAND is now a curated resource pool serving three audiences (healers, impact entrepreneurs, grassroots organizations), with long-term web/brand/operational accompaniment as the core promise. We are filing for 501(c)(3) status in 2026 and have published three discovery documents (vision, models, landscape) at handprotocol.org/discovery as the evidence base for the work.

The pivot demonstrates a posture: we retire tools that do not serve the people we work with. The same posture governs our approach to AI.

## The gap we address

Our landscape analysis mapped 40+ organizations in the U.S. capacity-building ecosystem. The pattern is clear: Taproot scaled skills-based volunteering, Catchafire made it free, Bridgespan brought strategy rigor, and a new generation of trust-based funders (Kataly, Solidaire, Borealis, Headwaters, NDN) built participatory grantmaking infrastructure for movements. None of them built a long-term, relational, cross-audience operational partner for the layer below the radar: the solo healer running an LLC, the impact entrepreneur surviving the post-accelerator valley of death, the 3-person harm-reduction collective whose federal funding just disappeared. These groups share a common need (durable web, brand, operational infrastructure) and a common experience (pro-bono partners who hand off a deliverable and leave).

Three structural reasons keep this gap open. The economics don't parallelize the way project-bounded pro bono does. Cross-audience focus is unfashionable to program officers. The pre-501(c)(3) layer is structurally invisible to most philanthropy. We can address the second and third with positioning and patient relationship-building. **The first is what we are writing to you about.**

## The proposal

We propose to build, for each Companion group HAND accompanies, a **custom sovereign agent system**: a small fine-tuned model on an open base, a per-group LoRA adapter trained on the group's own work and voice, retrieval over the group's own library, tool access scoped to the group's workflows (grant tracking, scheduling, fiscal-sponsorship paperwork, donor stewardship), persistent memory, and a human-review gate before any external output ships. Alongside, a single cohort-wide coordination agent supports HAND's program lead with matching, pattern surfacing, and check-in preparation — without reading individual group data.

The agent system is the **durable artifact** of HAND's accompaniment. If a group graduates, they leave with it. If HAND closes, they keep it. The "we don't build and bounce" promise becomes technically enforceable: the infrastructure that holds their three-year arc is theirs, not ours.

This directly attacks the parallelization bottleneck and operationalizes a sovereignty posture rare in the AI-for-nonprofits space. We are not building a centralized platform that extracts data from grassroots organizations to train a vendor model. We are building portable, open, group-owned systems with the sovereignty rights baked in.

## Why now

Three trends from our landscape research converge here:

1. **Trust-based philanthropy has moved from awareness campaign to mainstream practice.** MacKenzie Scott deployed $2B+ in unrestricted grants in 2024. The donor universe most aligned with HAND's accompaniment posture is expanding.
2. **The mutual-aid funding-replacement moment is acute in 2026.** Harm-reduction Companion groups losing federal support need every parallelization tool we can responsibly give them — and the sovereignty posture matters most for organizations whose data has historically been weaponized against them.
3. **AI-for-social-good funding has matured faster than aligned grantee profiles.** McGovern, Mozilla, and Google.org have built grant programs for tech-enabled nonprofit infrastructure. The HAND-shaped grantee — a small relational nonprofit with a published gap analysis, an open-source default, and an explicit Companion-sovereignty design — is rarer than the funding.

## Theory of change

If the sovereign agent systems work as designed, we will observe four measurable shifts inside an 18-month pilot:

- **Companion-group side**: time-to-first-draft on grant applications and fiscal-sponsorship paperwork drops by ≥ 50%; felt-continuity and felt-presence both rise into the 4–5 range on a 5-point Likert scale. Each group can produce a documented "self-host" recipe and exercise their own system if needed.
- **Staff side**: matching time between intake and Contributor pairing drops by ≥ 40%; the program lead sustains a cohort of 5–7 groups instead of 2–3 at the same staffing level.
- **Sovereignty side**: 100% of adapters have ownership records; portability check passes quarterly; a tested revocation SLA of ≤ 30 days; a successful HAND-closure simulation at Gate 3 demonstrating that the Companion groups can continue independently.
- **Field side**: HAND publishes the evaluation framework, the adapter-training methodology, the agent scaffolding code, and the quarterly reports as open source. Adjacent accompaniment organizations (CompassPoint cohorts, Headwaters Giving Project alumni, fiscal-sponsorship hosts) can adopt and adapt without rebuilding from scratch.

Full metrics, six evaluation dimensions, three decision gates, and the participatory review panel structure are detailed in `AI-EVAL-FRAMEWORK.md`.

## What the $111,111 funds

| Phase | Months | Allocation | What it produces |
|---|---|---|---|
| **POC** | 1–3 | $5,555 | Open-base model + RAG over discovery docs + one Companion-group pilot, scaffolded as the prototype agent system. Closed-source APIs used for prototyping only. | Evaluation report; Gate 1 decision. |
| **Pilot** | 4–15 | $33,333 | Open-base fine-tune, three sovereign Companion-group agent systems with per-group adapters, self-hosted inference, quarterly participatory eval including sovereignty drills. | Three working sovereign systems, signed ownership records, eval framework v1.0, case studies. |
| **Production & open-source release** | 16–18 | $72,223 | Per-group adapter productionization, the HAND coordination agent, full open-source release of methodology, eval framework, and agent scaffolding. Closure-simulation drill. Methodology paper. | A forkable stack adjacent orgs can adopt; transition to operating-budget sustainability. |

The $5,555 POC tier is also folded into HAND's existing $77,777 filing-raise goal as a backup ignition path; the McGovern grant accelerates and de-risks the full arc.

## What we are not asking you to fund

To make this defensible:

- We are **not** asking McGovern to fund HAND's underlying 501(c)(3) operations. Those costs are addressed by the foundation campaign and aligned trust-based funders (Kataly, Hemera transition, Headwaters peer model).
- We are **not** building a customer-facing chatbot or a commercial product. Each agent system serves one Companion group inside a curated, low-volume, high-trust relational context.
- We are **not** building a centralized "AI platform for nonprofits." The architecture is explicitly per-group and self-hostable. No vendor lock-in is the design.
- We are **not** publishing Companion-group-derived training data, ever. Adapter weights publication is the Companion group's decision, not HAND's.

## Why HAND specifically

We are a small organization with a published gap analysis, a track record of being honest about what we don't know (every discovery doc has an open-questions section), and a brand voice that explicitly refuses both crypto-utopian and AI-utopian framings. The pivot away from crypto-first positioning in early 2026 demonstrated that we will retire tools that don't serve the people we work with. The sovereignty design above is the same posture applied to AI: useful, evaluated, retired if it doesn't earn its place, and owned by the people whose work it serves.

## Closing

We would welcome a conversation about whether this work fits the McGovern Foundation's current priorities and what additional materials would be useful for a full application. The discovery documents at handprotocol.org/discovery are the most complete public record of our thinking. The Sovereign Companions one-pager and evaluation framework are available on request and in our public repository.

Thank you for your time.

— HAND Protocol Foundation
hand@handprotocol.org · handprotocol.org · Austin, Texas

---

*Letter draft v0.2, May 2026. Living document; final version will be tailored to the foundation's current LOI guidelines at submission time.*
