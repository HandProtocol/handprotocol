# yuhm source-intelligence agent boundary

Last updated: 2026-08-11

Status: boundary document. The source-intelligence agent described here does not exist yet. This page defines what it is allowed to become and the battle-test gate that must pass before any part of it activates. It is referenced by `../HANDOFF.md` and `LIVING-DOCS.md` as the standing rule.

## What the agent is for

Austin's food-source directory decays without constant attention: hours change, pantries pause, refrigerators move, phone numbers go stale. The source-intelligence agent exists to reduce that maintenance burden by collecting evidence about food sources — published hours, service changes, community reports, closure notices — and organizing it for human review.

The agent proposes. Deterministic checks and human coordinators decide. This is the same rule the coordination protocol applies everywhere else in yuhm.

## Human-review requirement

Every agent output that could change what the public sees goes through a human review queue. Without exception:

- The agent never publishes or edits a source record directly.
- The agent never marks a source verified. Verification stays a human decision recorded with evidence, exactly as `LIVING-DOCS.md` describes for community nominations.
- The agent never contacts a food source, partner, or community member on its own.
- The agent attaches its evidence (what it found, where, and when) to every proposal so the reviewer can check the claim without repeating the work.

## What the first useful agent does

1. Collects evidence about existing and nominated sources: published schedules, service announcements, community reports already inside yuhm.
2. Scores freshness and flags contradictions — for example, a source marked open whose published schedule says closed.
3. Files proposals into a human review queue with the evidence attached.
4. Records reviewer decisions so its precision can be measured over time.

## What the agent must not begin as

- Not a chatbot.
- Not an auto-publisher of verification or availability.
- Not a promiser of food to anyone.
- Not a dispatcher of people, vehicles, or deliveries.

These are permanent boundaries for the first generation, not temporary caution. Each can only be revisited through the delivery-readiness process in `DELIVERY-READINESS.md`, with its own evidence gate.

## Battle-test activation gate

Do not start the agent — including in shadow mode against production data — until all of the following are true:

1. **Review queue exists.** A coordinator-facing queue where proposals wait for approval or rejection, with the evidence visible, is built and exercised by a human workflow first.
2. **Ground truth baseline.** At least 25 sources have human-verified records (hours, status, contact) recorded within the previous 60 days, so agent proposals can be scored against known answers.
3. **Shadow-mode precision.** Over a trial window of at least 30 days, the agent's proposals are compared to reviewer decisions without any public effect. Gate: ≥90% of its "source changed" flags are confirmed correct by reviewers, and zero proposals attempt an action outside the boundaries above.
4. **Named owner.** A specific human owns the agent's output quality and holds the kill switch. The agent does not run while unowned.
5. **Rollback rehearsal.** Turning the agent off and reverting any reviewed-and-applied change has been rehearsed and documented.

If any gate later fails — precision drops, the owner steps away, the queue backs up beyond review capacity — the agent pauses until the gate passes again.

## Why this is strict

A wrong verified badge sends a hungry person to a closed door. The cost of a false positive here is measured in someone's evening, bus fare, and trust in the network. The agent earns autonomy only in areas where being wrong is cheap, and publishing to the public map is never that.
