---
name: hand-reciprocates
description: "HAND Reciprocates workflow. Use when working on Reciprocates, Reciprocate groups, Sovereign Reciprocates, group-scoped Command Center access, intake, applications, grants tagged by group, group-owned AI systems, or copy that describes the people and organizations HAND serves."
---

# HAND Reciprocates

Use this for work centered on Reciprocates and Reciprocate groups. Precision matters because the terms encode HAND's posture.

## Read First

From repo root:

1. `AGENTS.md`
2. `PRODUCT.md`
3. `AI-RECIPROCATES.md` when the task involves Sovereign Reciprocates or AI systems.
4. `AI-EVAL-FRAMEWORK.md` when the task involves AI evaluation, sovereignty, or agent quality.
5. `command/HANDOFF.md` when working inside Command Center.

## Vocabulary

- Use `Reciprocates` for people HAND serves.
- Use `Reciprocate groups` for collectives, practices, crews, or small organizations.
- Use `Contributors` for people giving or exchanging skill into the pool.
- Use `Sovereign Reciprocates` only for the AI workstream.
- Avoid `clients`, `beneficiaries`, `recipients`, `users`, and passive "grantees" for HAND's own served population.

## Command Center State

There is not yet a dedicated `command.reciprocate_groups` table. Current authoritative fields:

- `command.grants.reciprocate_group`
- `command.profiles.reciprocate_group`
- `command.invites.reciprocate_group`
- `command.access_applications.reciprocate_group`

The `/reciprocates` route rolls these up. If adding durable group notes, stages, needs, or project ownership, propose or add a dedicated migration rather than overloading unrelated fields.

## Product Direction

- Reciprocates must be first-class in Command Center, not just a grant tag.
- Projects should include Reciprocate work, not only local-business outreach.
- Group-owned artifacts matter. For AI work, ownership, portability, self-hostability, and consent are core requirements.
- Be explicit about what exists now versus what is planned.

## Sovereign Reciprocates Guardrails

When touching AI workstream materials:

- The system belongs to the Reciprocate or Reciprocate group.
- Open source by default unless there is a safety or privacy reason.
- Portable and self-hostable are product requirements, not decorative claims.
- Do not describe AI as the center of HAND. It is one tool inside long-term accompaniment.
- Do not name specific model vendors in public or operator-facing copy unless the task is engineering-only and vendor identity is necessary.

## Verify

For Command Center Reciprocate work:

```bash
cd command && npm run build
```

For vocabulary checks:

```bash
rg -n 'client|clients|beneficiar|recipient|recipients|users|stakeholders' .
LC_ALL=C rg -n $'\xE2\x80\x94' .
```

Inspect results manually. Some legacy or third-party references may be legitimate, but HAND-owned current copy should follow the vocabulary rules.
