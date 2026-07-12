---
name: hand-funding-grants
description: "HAND funding and grants workflow. Use when working on foundation filing raise copy, grant markdown, funder research, Command Center grant pipeline, governance grant materials, funding updates, fiscal sponsor materials, or grant assistant behavior."
---

# HAND Funding And Grants

Use this for funding strategy, grant files, funder research, grant UI, and governance funding materials.

## Read First

From repo root:

1. `HANDOFF.md`
2. `PRODUCT.md`
3. `AGENTS.md`
4. `command/HANDOFF.md` when changing Command Center grant UI or Supabase reads.
5. `command/PRODUCT.md` when changing operator workflows.

For a specific grant, read the relevant `funding/grants/<slug>.md` before editing UI or database mirrors.

## Canonical Model

- Grant markdown in `funding/grants/*.md` is canonical.
- `command.grants` mirrors operational fields for reads and kanban performance.
- If a grant field changes, update markdown first, then sync or update the read replica through established actions/scripts.
- Git is the audit log.

## Funding Ladder

Foundation campaign:

- `$22,777`, filing floor
- `$77,444`, operating minimum
- `$222,222`, first goal

Sovereign Reciprocates:

- `$11,113`, proof of concept
- `$99,777`, one-year pilot
- `$333,223`, production layer

Individual contributor pledge ladder:

- `$222`, `$333`, `$555`, `$999`, `$1,111`, `$3,333`, `$7,777+`

If changing any funding number, search broadly and update every active source of truth. Do not update `web/legacy/` historical numbers.

## Voice

- Prove, do not promise.
- Use specific dollar amounts, named peer organizations, real examples, and known unknowns.
- Avoid Bridgespan or McKinsey-style abstractions.
- Avoid AI tells: leverage, robust, delve, navigate complexities, game-changing, best-in-class.
- Do not use em dashes.
- Do not call HAND a grantmaker unless the context is explicitly future-state and precise.

## Command Center Grant Work

Core routes:

- `/grants`
- `/grants/[slug]`
- `/deadlines`
- `/funders`
- `/templates`

Core code:

- `command/src/lib/grants/`
- `command/src/components/kanban/`
- `command/src/components/grants/`
- `command/src/app/(dashboard)/grants/`
- `command/src/app/(dashboard)/deadlines/`

Use existing status values: `discovery`, `drafting`, `submitted`, `awarded`, `declined`, `withdrawn`, `closed`.

## Verify

For Command Center grant changes:

```bash
cd command && npm run build
```

For markdown and funding copy:

```bash
rg -n '\\$22K|\\$77K|\\$222K|beneficiar|recipient|client|stakeholder|leverage|robust|game-changing|best-in-class' funding governance web command
LC_ALL=C rg -n $'\xE2\x80\x94' funding governance web command
```

For grant ingestion changes, inspect `command/scripts/ingest-grants.ts` and run the established ingest only when the user expects local data mutation.
