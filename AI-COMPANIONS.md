# Sovereign Companions

**Custom agent systems for HAND's long-term accompaniment, owned by the Companions and Companion groups they serve.**
*Draft v0.2 · May 2026 · Living document · Pre-incorporation*

> **Live public page:** [handprotocol.org/sovereign-companions/](https://handprotocol.org/sovereign-companions/) (also `/sovereign`, `/ai`)
> **Source:** [`web/sovereign-companions/index.html`](web/sovereign-companions/index.html)

---

## The gap, in one paragraph

HAND's discovery work mapped the U.S. capacity-building ecosystem and found a specific shape of unmet need: a long-term, relational, infrastructure-building partner for the layer below the radar — solo healers, post-accelerator impact founders, 3-person harm-reduction collectives. Taproot, Catchafire, Bridgespan, and the new generation of trust-based funders all stop short of multi-year accompaniment with that population. Three structural reasons keep the gap unfilled: the economics don't parallelize, cross-audience focus is unfashionable to program officers, and the pre-501(c)(3) layer is invisible to most philanthropy. The first of those — accompaniment doesn't parallelize — is the problem this proposal addresses, and the longevity of HAND's accompaniment promise depends on solving it.

## The proposal

HAND will build a **sovereign custom agent system** for each Companion or Companion group it accompanies, plus one cohort-wide coordination agent for HAND staff. The fine-tuned model is one component of each system; the system as a whole is the durable artifact of HAND's relationship with that group.

- **Per-Companion-group agent system.** A custom agent with: a small fine-tuned model on an open base (Llama 3.1 8B or Mistral 7B), a per-group LoRA adapter trained on the group's own work and voice, retrieval over the group's own document library, tool access scoped to the group's workflows (grant tracking, scheduling, social posting drafts, fiscal-sponsorship paperwork, donor stewardship), memory that persists across months, and a human-review gate before any external output ships.
- **HAND coordination agent (cohort-wide).** A separate agent that runs on HAND's side only, supporting the program lead with intake-to-Contributor matching, cohort pattern surfacing, and check-in agenda drafting. Does **not** read individual Companion-group data without that group's explicit, scoped consent.

This directly attacks the hardest unsolved problem named in the landscape doc — *long-term accompaniment doesn't parallelize the way project-based pro bono does* — and operationalizes HAND's "we don't build and bounce" promise. The agent system is what stays. If HAND closes, the Companion group keeps it. That is the meaning of *sovereign*.

## Sovereignty principles

These are design constraints, not aesthetics. Each one is testable.

1. **Open base model.** Llama 3.1 8B or Mistral 7B. No proprietary API dependency for the core inference loop. Closed-source APIs (Claude, GPT) may be used for prototyping, burst capacity, or specialized sub-tasks — never as the only path between a Companion group and their own system.
2. **Companion-group-owned adapter.** Each LoRA adapter belongs to the Companion or Companion group it was trained for. On departure, HAND closure, or request, the adapter weights, training data, eval logs, and a portable inference recipe are handed over.
3. **Revocable training consent.** Every training datum is tagged with its source. A Companion group can revoke at any time, and the affected adapter is retrained without that data or destroyed on a documented SLA (target: ≤ 30 days).
4. **No cross-Companion-group data extraction.** HAND does not aggregate Companion-group data into a "platform model." Patterns learned working with one group stay with that group's adapter. Cross-pollination requires the contributing group's explicit, scoped, opt-in consent.
5. **Self-hostable end-to-end.** Inference, training, eval harness, and tool integrations all run on infrastructure HAND owns or that a Companion group could run themselves on commodity hardware (a sufficient laptop or a low-cost VPS).
6. **Full audit trail, inspectable by the group.** Every model call, retrieval, tool invocation, and reviewer disposition is logged. The Companion group can inspect their own logs at any time.
7. **Open methodology, open code, open eval, open quarterly reports.** Framework, adapter-training code, agent scaffolding, eval harness, and quarterly reports are released under CC BY-SA (docs) and MIT (code). The "stack you could fork" is itself a deliverable.
8. **Adapter weights: case-by-case publication.** Adapter weights can leak training patterns even without the raw data. They are **not** published by default. Each Companion group decides if their own adapter is published. HAND's default is no, and HAND will not pressure that decision either way.

## Why this is the longevity layer

HAND's accompaniment promise reads "we don't build and bounce." Operationally, that promise is hard. People move on, funders shift, programs evolve. The sovereign agent system is what makes the promise durable in spite of HAND's own discontinuities:

- **Persistent context.** The agent remembers the group's three-year arc across staff turnover, funder cycles, and the relational silences between check-ins.
- **Lower marginal cost of presence.** A program lead can hold 5–7 Companion groups instead of 2–3, because the agent does the connective-tissue work between human sessions.
- **Portable infrastructure.** If HAND closes, the agent system stays. The Companion group is not stranded with deliverables-and-no-partner the way Taproot and Catchafire engagements leave their participants.
- **An honest exit.** When a Companion group graduates, they leave with their agent. That is what graduation, not abandonment, looks like in technical terms.

## Why custom agents, not just a fine-tuned chat model

Each Companion group has a distinct operational shape: a harm-reduction collective tracks naloxone distribution and contact-tracing-style outreach; a healer practice tracks consent forms, session notes, and client follow-up; a food-sovereignty group tracks land-use cycles, volunteer schedules, and grant deliverables. A single chat model cannot serve these the way a small custom agent can — wired to the group's actual tools, with memory for their specific work, with reviewers who know the group's domain.

The fine-tune handles voice and domain fluency. The agent scaffolding handles workflow, tool use, scheduled tasks, and integrations. Together they are what makes the system *theirs*, not *ours*.

## Why a small open model + adapter, not a closed API

A proof of concept ships on Claude or GPT in weeks — and we will start there. But sustainable, on-brand, sovereign, and grant-fundable means owning the inference stack:

- **Base model.** Llama 3.1 8B or Mistral 7B. Open weights. Self-hostable.
- **Method.** LoRA / QLoRA adapters. A full HAND-tuned base trains for ~$200–$2,000 on rented A100s. Per-Companion-group adapters cost ~$10–$50 each.
- **Retrieval layer.** RAG over the group's own document library, plus the discovery docs and grant-landscape data when relevant.
- **Agent scaffolding.** Tool-use, memory, and scheduled tasks built on open-source frameworks. No vendor lock-in.
- **Evaluation.** A rotating Companion + Contributor review panel. Participatory — on-brand for HAND, and the kind of governance trust-based funders now expect (Georgetown UP, *Participatory Grantmaking in Philanthropy*, 2024).

All-in operating cost for a pilot cohort of three Companion groups: ~$5,555–$22,222/year, including inference, training runs, agent infrastructure, and a part-time AI lead. The proof-of-concept tier is folded into the existing filing-raise goal; the pilot and production tiers are dedicated AI-funder asks parallel to the foundation campaign.

## Why now, and why funders will say yes

Three trends from the landscape doc converge here:

1. **Trust-based philanthropy is mainstream.** Funders want to back relational, long-horizon work. Sovereign agent systems are the operational answer to "how do you scale relationships without breaking them."
2. **The mutual-aid funding-replacement moment.** Harm-reduction Companion groups losing federal support in 2026 need every parallelization tool they can responsibly use. Timely, not speculative.
3. **AI-for-social-good funding is large and underdeployed.** Patrick J. McGovern Foundation, Mozilla, Google.org, Anthropic and OpenAI nonprofit programs all explicitly fund this profile. The HAND-shaped grantee — a small relational nonprofit with a published gap analysis, an open-source posture, and an explicit Companion-sovereignty design — is rarer than the funding.

## Funding shortlist (priority order)

- **Patrick J. McGovern Foundation** — AI for Social Good grants. Direct mission fit. Pursue first.
- **Mozilla Foundation** — Trustworthy AI / Responsible Computing fellowships. Open-weights + Companion-sovereignty posture is exactly their brief.
- **Anthropic** (nonprofit credit program) + **OpenAI** (nonprofit credits) — API credits to fund the prototype and burst capacity while we run the sovereign open-base stack as the long-term home.
- **Google.org AI for Social Good** — historically funds capacity-building tooling for grassroots orgs.
- **Hugging Face community grants** — small dollar, large open-source legitimacy signal. Strong fit for the methodology release.
- **Kataly + Hemera** (from the landscape doc) — fund the underlying nonprofit while AI funders fund the tooling. Stacked, not competing.

## What the tiers fund

| Tier | Scope | Deliverable |
|------|-------|-------------|
| **$5,555** | 3-month proof of concept. Claude API + RAG over discovery docs + one Companion-group pilot, scaffolded as the prototype of the agent system. | Evaluation report, decision on full sovereign-stack build. |
| **$33,333** | One-year pilot. Open-base fine-tune, three Companion-group sovereign agent systems, self-hosted inference, quarterly participatory eval. | Three working systems, trained adapters handed to their groups, eval framework, case studies. |
| **$111,111** | Production layer. Per-group adapters, the HAND coordination agent, full open-source release of the methodology and eval framework, methodology paper. | A forkable stack other accompaniment orgs can adopt; transition to operating-budget sustainability. |

The $5,555 tier is folded into the existing $77,777 filing-raise goal and can ship immediately. The $33,333 and $111,111 tiers are dedicated AI-funder asks, parallel to the foundation campaign.

## Honest open questions

- **Hallucination in grant-writing and clinical-adjacent contexts.** A wrong fact inside a 501(c)(3) application or a harm-reduction outreach script is worse than no help. Human review is non-negotiable; the eval framework enforces it before any Companion-facing or external output ships.
- **Agent failure modes are not chat failure modes.** Tool-using agents fail differently from chat models — bad scheduled actions, stale memory, infinite loops, mis-scoped tool calls. The eval framework will need agent-specific test scenarios, not just text-quality metrics.
- **The replacement anxiety.** Companions and Contributors need to trust that the agent system augments HAND's relational posture and never substitutes for it. Earned through transparency, sovereignty, and the human-review gate — not promised.
- **Sustainability past the grant.** If an AI funder steps back in year three, the agent infrastructure becomes an operating-budget line. The unit economics have to be defensible before we commit to dependent infrastructure.
- **What happens at graduation.** When a Companion group's accompaniment with HAND ends, they leave with their agent system. The practical handoff — who hosts it, who maintains it, what HAND's ongoing support looks like — is a real design problem that the production phase will work out alongside the first cohort.

## Companion documents

- **[AI-EVAL-FRAMEWORK.md](AI-EVAL-FRAMEWORK.md)** — how we measure whether the agent systems are earning their place. Six dimensions including sovereignty, three decision gates, public quarterly reporting.
- **[funding/mcgovern-letter.md](funding/mcgovern-letter.md)** — draft letter of inquiry to the Patrick J. McGovern Foundation for the $111,111 production-layer ask.

---

*HAND Protocol Foundation · Pre-incorporation · Comments to hand@handprotocol.org*
