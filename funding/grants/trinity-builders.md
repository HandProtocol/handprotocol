---
slug: trinity-builders
name: Arcee AI · Trinity Builders Program
funder: Arcee AI
funder_url: https://www.arcee.ai
program_url: https://www.arcee.ai/blog/introducing-the-trinity-builders-program
application_url: https://www.arcee.ai/blog/introducing-the-trinity-builders-program  # "Apply here" link in the post
status: drafting
award_type: API credits (Trinity-family models)
award_size: tiered — <50M / 50M–200M / 200M–500M / 500M–1B / >1B tokens (90-day validity)
deadline: rolling
match_required: none
reporting: feedback appreciated, not required
discovered_on: 2026-05-17
submitted_on:
decided_on:
contact: Anneketh Vij (program announcement author)
hand_lead: koH
fit_score: 5
---

# Arcee AI · Trinity Builders Program

## TL;DR

Arcee AI is offering free inference credits on the Trinity model family to
developers, researchers, and open-source builders. HAND's Sovereign Reciprocates
workstream is exactly the kind of project they describe: open-source agent
systems with extended multi-turn reasoning, built on Apache-2.0 weights, where
inference cost is the bottleneck between prototype and production. We'd request
the 200M–500M-token tier and use it to build three Sovereign Reciprocate agent
prototypes plus an eval harness, all open-sourced.

## The program

From the announcement (Anneketh Vij, 2026-04-14):

> A community credit grant for developers, researchers, and open source
> builders working with Trinity models. Apply for free inference access on
> the Arcee API.

Eligibility is intentionally broad. Arcee calls out four categories of
interest:

- Open source projects that extend the Trinity ecosystem or demonstrate novel agent architectures
- Research that pushes the boundaries of reasoning models, sparse MoE inference, or agentic workflows
- Prototypes and production applications where Trinity is the backbone and compute cost is the bottleneck
- Developer tooling that makes it easier for others to build on top of Trinity

**Award**: API credits, allocated based on project scope and available
capacity. Credits valid for 90 days. Non-transferable. Same OpenAI-compatible
API as commercial tiers; "no data processed through the program is ever
retained or used for model training."

**Review**: rolling, no fixed timeline. Partial awards explicit possibility.
Arcee reserves the right to decline, scope down, or discontinue.

## Fit assessment

**Score: 5/5.** Direct alignment on three axes:

1. **Open-source ethos.** Trinity is Apache 2.0. HAND's Sovereign Reciprocates
   commits to fully open-source agent systems, group-owned. Both treat
   "you own your model" as a principle, not a marketing line.
2. **Agentic reasoning is the target use case.** Trinity-Large-Thinking is
   "post-trained with extended chain-of-thought and agentic RL, purpose-built
   for the multi-step workflows developers were already running." Sovereign
   Reciprocate agents are exactly that: multi-turn intake, scheduling,
   ledger, bounty matchmaking.
3. **Compute cost is the bottleneck.** HAND is filing for 501(c)(3) status
   and operating on a $77,777 first goal. We have engineering capacity but
   not retail-inference budget for the eval and prototyping volume we want.

**No tension to flag.** No IP claims, no exclusivity, no naming requirements.
Reporting is optional. The only soft expectation is that we share feedback
or results — which we'd want to do anyway since it's part of how we publish.

## What we'd build with the credits

Three concrete deliverables, all open-sourced, all citing Arcee/Trinity.

### 1. Sovereign Reciprocate agent prototypes (×3)

Three pilot Reciprocate groups, a community-rooted small business, an impact-driven venture, and a grassroots
collective — each get a custom Trinity-Large-Thinking agent harness covering:

- Intake (multi-turn conversation with new participants)
- Scheduling and reminders
- Ledger entries (capturing time/skill exchanged)
- Bounty matchmaking (matching offers and needs)

Released as a reference template at `github.com/HandProtocol/sovereign-reciprocates`.
Estimated inference: ~150M tokens (3 agents × ~50M tokens for build + eval cycles).

### 2. Eval harness for sovereignty-aware agents

We're drafting an AI-EVAL framework (already at `AI-EVAL-FRAMEWORK.md` in the
repo) that measures more than capability: group-ownership signals, refusal
boundaries, transparency of reasoning, and resistance to extraction patterns.
Credits let us run the eval against Trinity-Large-Thinking as the reference
open-weights baseline, and publish results.

Estimated inference: ~100M tokens (eval runs + replay testing).

### 3. Mystic Hearts onboarding agent

Mystic Hearts is the first live Reciprocate-group product (Next.js + Supabase,
in active development at `/home/koh/Documents/mystichearts/`). Trinity drives
the practitioner-intake agent, which handles a multi-turn onboarding
conversation, populates the ledger, and flags reviewer cases. This is the
"production application where Trinity is the backbone" version of the request.

Estimated inference: ~100M tokens for build + early-user runs.

**Total ask: ~350M tokens, requesting the 200M–500M-token tier.**

We'll request the upper bracket and accept a partial award. If awarded only
the 50M–200M tier, we'd cut the eval harness scope and focus on the three
agent prototypes.

## Ask

**200M–500M tokens** (selecting the third bracket on the application form).

## Application answers — draft

> Form fields from the application:
> Name / Alias · Email · Link to GitHub/X/Website · Project Name ·
> What are you building? · How does it contribute to the community? ·
> Project Type · How will you use the model? · Requested token usage ·
> Estimated work start date · Estimated work end date ·
> Willing to share feedback or results?

### Name or Alias

Russell Herod (HAND Protocol Foundation) — also known online as koH.

### Email

cshearer210@gmail.com

### Link to GitHub/X/Website

- handprotocol.org
- github.com/HandProtocol/handprotocol
- @hand_protocol

### Project Name

Sovereign Reciprocates — Open-Source Agent Systems for Community Resource Pools

### What are you building?

    HAND Protocol is filing as a 501(c)(3) public charity in Austin, Texas. Our
    mission is a curated skill-and-resource pool for community-rooted small businesses, impact-driven
    entrepreneurs, and grassroots organizations.

    The Sovereign Reciprocates workstream gives each Reciprocate group its own
    custom, open-source agent system — group-owned, not platform-owned. The
    agent runs intake, scheduling, ledger entries, and bounty matchmaking for
    that community. We're publishing the agent code, the eval harness, and the
    deployment recipes so other communities can fork the pattern.

    We need Trinity-Large-Thinking for the multi-step agent loop: extended
    chain-of-thought, agentic RL post-training, and a permissive license that
    lets us redistribute the harness without strings.

### How does it contribute to the community?

    Three contributions, in order of generality:

    1. **A reference architecture** for "group-owned" agent systems that other
       nonprofits and mutual-aid networks can fork. Open-source, with full
       deployment recipes for Trinity-on-Arcee and self-hosted Trinity variants.
    2. **An eval harness for sovereignty-aware agents.** Most agent evals measure
       capability and speed. Ours adds group-ownership signals, refusal
       boundaries, transparency-of-reasoning checks, and resistance to
       extraction patterns. We'll publish aggregate results against
       Trinity-Large-Thinking as the open-weights baseline; individual
       practitioner sessions stay private unless that practitioner opts in.
    3. **Direct service** to three pilot communities in Austin (local small businesses,
       impact-driven business, grassroots collective) via Mystic Hearts and
       two adjacent prototypes. These are real users, not synthetic load.

### Project Type

Open source project (with a production application — Mystic Hearts — as the
first concrete instance).

### How will you use the model?

Trinity-Large-Thinking will drive three agent loops in production-style
testing:

- **Intake agent:** 6–10 turns, ~6K context, structured output to a Supabase
  ledger schema. Tool calls to the database and to a scheduling helper.
- **Bounty matchmaker:** Long-context (~24K) reasoning over an offers/needs
  inventory, producing ranked candidate matches with rationale.
- **Onboarding flow (Mystic Hearts):** Conversational onboarding for healers
  joining the network, with verification prompts and ledger initialization.

Plus eval runs across the harness described above (replay tests, refusal
audits, group-ownership probes).

### Requested token usage

200M – 500M tokens.

Breakdown: ~150M for three agent prototypes (build + eval), ~100M for the
eval harness, ~100M for Mystic Hearts onboarding pilot — totaling ~350M with
headroom for iteration. We'll accept a partial allocation gracefully.

### Estimated work start date

2026-05-26 (week after expected approval, assuming rolling review of ~5–7 days).

### Estimated work end date

2026-08-24 (~13 weeks, fits inside the 90-day credit validity window).

### Are you willing to share feedback or results?

Yes — and this is genuinely useful for us, not just compliance. We'll publish:

- The eval harness itself and aggregate results against Trinity-Large-Thinking.
- A retrospective on how the model performed in production-style multi-turn
  workflows with real community users — reported in aggregate, with
  individual practitioner conversations kept private unless that practitioner
  opts in to share their session. Healers and grassroots organizers come
  to HAND because we don't treat them as data; we want to keep that promise.
- Specific notes on agentic-RL behavior in our use case (long-tool-call
  chains, refusal boundaries, hallucination rate in ledger-entry tasks) —
  drawn from the eval harness, not from named user sessions.

We're already publishing everything else openly (governance docs,
discovery research, finances) — sharing aggregate model feedback is consistent
with that posture, with the consent layer that comes from working alongside
people in vulnerable trades.

## Decision criteria for us

- **Awarded full bracket (200M–500M):** Proceed with all three deliverables.
- **Awarded 50M–200M:** Drop the eval-harness publication, deliver three
  agent prototypes only.
- **Awarded <50M:** Build one prototype (Mystic Hearts onboarding), publish
  a more limited writeup. Still meaningful, still worth doing.
- **Declined:** Self-host quantized Trinity variants on local hardware (the
  announcement explicitly endorses this path) and proceed at a slower
  cadence.

## Timeline

- 2026-05-17 — Discovered (Arcee blog post, surfaced by user)
- 2026-05-17 — Fit assessment complete, decision to pursue
- 2026-05-?? — Draft complete (TBD — pending review)
- 2026-05-?? — Submitted
- 2026-05-?? — Decision received (rolling, ~5–10 days typical)

## Follow-up

To be filled in after decision.
