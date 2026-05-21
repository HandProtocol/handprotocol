# HAND Funding Tier Update — 3x Scaling Proposal

**Date:** 2026-05-19
**Author:** koH (founder)
**Rationale:** Scale all angel-number tiers by ~3x to reflect the actual operational cost of running HAND through filing, the first Sovereign Reciprocate pilot, and the production AI layer. Absolute ceiling: $333,333.

All amounts remain angel numbers (repeated digits: $NNN / $N,NNN / $NN,NNN / $NNN,NNN).

## Foundation campaign (501(c)(3) filing raise)

Three-tier ladder. Entry covers filing + minimal first-year operations; mid is operating minimum at small-team capacity; top is the first goal that funds a year of programming plus reserves.

| Tier role | Old | New | Notes |
|---|---|---|---|
| Filing floor / entry | $7,777 | **$22,222** | 7,777 × 3 = 23,331 → snap to 22,222 |
| Operating minimum / mid | $22,222 | **$66,666** | 22,222 × 3 = 66,666 (clean angel) |
| First goal / top | $77,777 | **$222,222** | 77,777 × 3 = 233,331 → snap to 222,222 (under $333,333 cap) |

## Sovereign Reciprocates (AI workstream)

Three-tier ladder. Entry is POC for one Reciprocate group; mid is a one-year pilot with a dedicated AI funder; top is the production layer (the McGovern target).

| Tier role | Old | New | Notes |
|---|---|---|---|
| POC / entry | $5,555 | **$11,111** | 5,555 × 3 = 16,665 → snap to 11,111 (avoids collision with new Foundation entry $22,222) |
| One-year pilot / mid | $33,333 | **$99,999** | 33,333 × 3 = 99,999 (clean angel) |
| Production layer / top | $111,111 | **$333,333** | 111,111 × 3 = 333,333 — matches the absolute ceiling |

## Contributor ladder (individual pledges)

Open-ended, entry through patron. Each rung scaled ~3x independently and snapped to nearest angel. Featured rung stays mid-ladder.

| Old rung | New rung | Notes |
|---|---|---|
| $77 | **$222** | 77 × 3 = 231 → snap to 222 |
| $111 | **$333** | 111 × 3 = 333 (clean) |
| $222 | **$555** | 222 × 3 = 666 → 555 (closest standard angel) |
| $333 | **$999** | 333 × 3 = 999 (clean) |
| $555 (featured) | **$1,111** (featured) | 555 × 3 = 1,665 → snap to 1,111; featured tier moves up one rung |
| $1,111 | **$3,333** | 1,111 × 3 = 3,333 (clean angel) |
| $2,222+ | **$6,666+** | 2,222 × 3 = 6,666 (clean angel) |

Full new contributor ladder: $222, $333, $555, $999, $1,111 (featured), $3,333, $6,666+

## Budget line items (derived from tier scaling)

These appear in `web/foundation-campaign/index.html`, `web/landingpage/app/raise/page.tsx`, and `mcgovern-letter.md`. They scale 3x consistently with the tier ladder.

| Old | New |
|---|---|
| $1,111 | **$3,333** |
| $2,222 | **$6,666** |
| $5,555 (POC tier; also budget line) | **$11,111** |
| $7,777 (filing line; also tier entry) | **$22,222** |
| $22,222 (operating min; also budget line) | **$66,666** |
| $33,333 (program lead line; also AI pilot tier) | **$99,999** |
| $77,777 (first goal; also budget context) | **$222,222** |
| $111,111 (McGovern ask) | **$333,333** |

## Collision check

No collisions between Foundation and Sovereign top-three ladders. Foundation entry ($22,222) is distinct from Sovereign entry ($11,111). All six primary tier amounts unique.

The contributor ladder's new top ($6,666+) sits cleanly below the Sovereign entry ($11,111), preserving the ladder shape from small individual gifts up through major-gift territory.

## Short-form references

| Old | New |
|---|---|
| $22K (operating min, short form) | **$66K** |
| $77K (used colloquially for first goal) | **$222K** |

---

## Verification report

**Verification pass run:** 2026-05-19

### Totals
- **Files edited:** 32
- **Files created (new):** 2 (`tier-update-proposal.md`, `tier-update-occurrences.txt`)
- **Total tier-amount substitutions:** ~110 individual replacements across all files

### Files changed (by area)

**Repo root + AI-RECIPROCATES + AGENTS** (5 files):
`README.md`, `PRODUCT.md`, `AGENTS.md`, `AI-RECIPROCATES.md`, `HANDOFF.md`

**Funding docs** (3 files):
`funding/grant-readiness-research.md`, `funding/mcgovern-letter.md`, plus the three internal-tier mentions in `funding/grants/trinity-builders.md`, `funding/grants/cloudflare-startups.md`, `funding/grants/hcb-fiscal-sponsorship.md`

**Focus prompts** (3 files):
`funding/updates/triptych-ep2-how.focus.txt`, `funding/updates/triptych-ep3-what.focus.txt`, `funding/updates/update-2026-05-18.focus.txt`

**Governance** (7 files):
`governance/board/director-prospect-brief.md`, `governance/form-1023/narrative-draft.md`, `governance/grants/budget-template.md`, `governance/grants/funder-pipeline.md`, `governance/grants/organizational-boilerplate.md`, `governance/policies/gift-acceptance.md`, `governance/programs/strategic-plan-2026-2028.md`

**Web surfaces** (7 files):
`web/3d-test/index.html`, `web/assets/og-card.html`, `web/discovery/impact-org-landscape.html`, `web/discovery/index.html`, `web/discovery/skill-exchange-vision.html`, `web/foundation-campaign/index.html`, `web/sovereign-reciprocates/index.html`, `web/landingpage/app/raise/page.tsx`

**Memory + skills (outside repo)** (4 files):
`/home/koh/.claude/projects/-home-koh-Documents-handprotocol/memory/hand-protocol-angel-number-tiers.md`, `/home/koh/.claude/projects/-home-koh-Documents-handprotocol/memory/MEMORY.md`, `/home/koh/.claude/skills/grants/references/hand-context.md`, `/home/koh/.claude/skills/hand-updates-notebooklm/SKILL.md`

### Deliberate non-edits

- **`web/legacy/`** — intentionally preserves the original $600/$12K/$56K crowdfunding tiers as historical record (per the memory rule). Not touched.
- **`web/discovery/skill-exchange-vision.html`** "$8K of work" worked example — Marcus value-of-services illustration, not a tier amount, preserved per memory rule.
- **`funding/grants/_low-hanging-survey.md`, `funding/grants/_template.md`, `funding/grants/netlify-oss-plan.md`, `funding/grants/vercel-oss-program.md`, `funding/grants/aspiration-fiscal-sponsorship.md`** — quote external funder award amounts (Cloudflare credits, Vercel credits, Netlify OSS plan value, etc.). Not edited; those are the funders' numbers, not HAND's.
- **`governance/grants/budget-template.md` Year 1 totals (lines 99, 110, 111) and Reserves contribution line (109)** — these are *derived* budget calculations (Total revenue / Total expenses / Net / 10% reserves), not tier values. They reflected the old tier amounts and will be inconsistent with the new revenue projections in the table. A `TODO (2026-05-19)` note was inserted in-line; koH should recompute these against the new tier ladders.
- **Year 2 and Year 3 budget rows in `budget-template.md`** — these are forward projections that don't directly reflect the tier-ladder amounts (they assume mix of foundation grants and individual giving at larger scale). Left intact.
- **`funding/mcgovern-letter.md` "Production & open-source release" allocation ($222,223)** — this is the derived remainder after POC ($11,111) + Pilot ($99,999) is subtracted from the new $333,333 ask. It is intentionally a 6-digit non-angel number; the user may want to round this differently or restructure the phase allocations. Flagged here as a soft TODO but not marked in the file itself.

### Open questions / soft TODOs

- The contributor ladder retained 7 rungs (`$222, $333, $555, $999, $1,111, $3,333, $6,666+`). The mid-rung $999 isn't strictly an "angel number" by the strictest definition (three repeated nines, three digits — `$999`). It is included for ladder-continuity; flag if the user prefers to skip a rung to avoid `$999`.
- The foundation-campaign budget breakdowns (`web/foundation-campaign/index.html`, `web/landingpage/app/raise/page.tsx`) were rescaled with the tier amounts so line items sum exactly to the new tier. Individual line items are not all angel numbers (e.g., `$1,875`, `$24,446`, `$11,113`) since the math has to close. If the user wants every line item to be an angel number, the tier amounts or the breakdown structure need to change.
- The Marcus `$8K` worked example is preserved unchanged. If the broader campaign context implies Marcus should now receive ~$24K of value, that's a content decision separate from this find-and-replace.
