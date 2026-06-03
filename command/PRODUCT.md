# HAND Command Center

## Register
**product** — this is operator-side software. App UI, admin dashboard, internal tool. Design serves the work, the work is not the design.

## What it is
The internal command bridge for HAND Protocol's grant program. Today, koH solo. Tomorrow, three grant admins. Eventually, a real desk with a fiscal sponsor liaison, a board grant chair, and a future ED. The HUD-dark counterpart to the public, warm-editorial foundation site.

The full v0.2 PRD lives at `funding/grants/_command-center-prd.md` (8,200 words). It carries the full feature catalog, the Supabase schema, the build phases, and the open questions.

## Users

### Primary: Russell Herod, aka koH, founder of HAND Protocol
- Operates the command center alone in v1 (currently)
- Daily driver use: morning sweep of deadlines, drafting application answers, logging touchpoints, tracking decisions
- Late-night use: writing fit assessments after a discovery surfaces a new program
- Pre-board-meeting use: exporting pipeline analytics for quarterly reports
- Will keep at three concurrent grants under active drafting, ten in the broader pipeline. Not a high-volume operator.

### Secondary V1.5: Future board grant chair, ED, fiscal sponsor liaison
- One to three admins joining as HAND formalizes through 2026
- Lighter usage: review draft answers, comment on fit assessments, approve scope before submission
- Contributor role, not admin role

### Tertiary V2: Reciprocate-group leads
- Mystic Hearts lead, Mesquitos lead (Q4 2026)
- View only the grants tagged to their group
- Cannot edit anything, can receive notifications

## Brand
HAND Protocol Foundation. 501(c)(3) in formation in Austin, Texas. Pool-of-resources skill-exchange model expanding beyond crypto-native populations. Mission terms are load-bearing: Reciprocates (the people HAND serves), Contributors (skill donors), Sovereign Reciprocates (the AI workstream), Reciprocate group (a small collective).

The command center is HAND's invisible-backend stance in physical form. Like the Mystic Hearts framing doc says about that product, the command center is the basic infrastructure underneath, in service to the work the operator does. The interface is quiet. The work is loud.

## Tone

### Operator-facing UI copy
- Warm-editorial even on a dark surface
- Errors do not yell. Empty states are helpful, never cute.
- Status verbs in present tense: "Drafting Trinity Builders" not "Trinity Builders is being drafted."
- No em dashes. Use commas, periods, parentheses.
- No AI tells: no furthermore, leverage, robust, ecosystem, delve into, navigate complexities, game-changing, best-in-class.
- No specific AI model names in operator-facing copy. "The drafting assistant" or "the assistant" only. Vendor identity stays in env vars and engineering logs.
- Mission terms exact: Reciprocates, Contributors, Sovereign Reciprocates, 501(c)(3) in formation.
- Dollar amounts with commas: `$22,777` not `$22K`.
- JetBrains Mono for any string that looks like a database value (status keys, slugs, IDs, timestamps). Inter for prose.

### System-generated text from the assistant
- Same voice rules
- Plus: never reveal which provider answered, the cost dashboard surfaces a single monthly total only

## Anti-references

What the command center is NOT and must never feel like:

- **Salesforce / HubSpot / Pipedrive aesthetic.** Generic SaaS CRM dashboards with white sidebars and pastel charts. Cliché.
- **A Notion clone.** Not a flexible-block editor. The command center is opinionated about how grants are tracked, the workflow shows in the interface.
- **A funder-side platform** like Submittable or Fluxx. We are grant seekers, not grantmakers. Different posture, different chrome.
- **A "10x productivity" startup tool.** No hype copy, no "supercharge your workflow," no "AI-powered" anywhere in operator copy.
- **A wellness app.** Not soft, not rounded-everywhere, not pastel. This is an operator's bridge.
- **A dark-mode-because-it's-cool tool.** The HUD-dark is purposeful (late-night drafting, ambient mode as a wall display, signal to the operator that this is the chair where the work happens). It's not "dark theme on a generic SaaS layout."

## Strategic principles

1. **Markdown is canonical.** Every grant lives in `funding/grants/<slug>.md` with frontmatter plus prose body. Supabase mirrors operational fields for fast reads, but the markdown wins on conflict. Git is the audit log.

2. **Sovereignty by default.** The operator can leave the tool tomorrow and the work walks out as a git repo. The AI router is provider-swappable. Nothing is locked.

3. **Operator-first, not pipeline-first.** The dashboard shows what the operator needs to do today, not a graphical representation of the funnel.

4. **Two rooms, one building.** The public-facing surfaces (foundation campaign, discovery, governance, the password-gated tracker) are warm-editorial, white surfaces. The command center is HUD-dark. Both share an amber accent and an Inter / JetBrains Mono typeface family.

5. **The H-A-N-D acronym is the spine.** Holistic, Approach, Nurture, Develop. The dashboard navigation literally reads `Holistic · Approach · Nurture · Develop`. Each pillar contains a cluster of features per the PRD.

6. **Curated, not crawled.** HAND chooses 50 to 150 high-fit funders by hand. We do not chase a 130,000-funder database. Quality over quantity is the posture.

7. **Voice-checked everywhere.** A linter catches em dashes, AI tells, outdated tier numbers, and specific model names in any operator-facing surface, including the assistant's outputs.

## Surface inventory

What ships in v1:
- `/` — cold-boot loader (3D hand cycling H-A-N-D over concentric rings, transitions to dashboard)
- `/dashboard` — at-a-glance HUD with the four H-A-N-D pillar tiles
- `/grants` — pipeline kanban, six columns by status
- `/grants/[slug]` — grant detail with editable frontmatter form, section-tabbed draft editor, activity timeline
- `/grants/new` — new-grant scaffold from `_template.md`
- `/auth/login` — sign-in
- `/settings` — Phase 4+, currently stubbed

Coming in Phase 2 through 4:
- Universal search (cmd+K)
- Quick-capture inbox
- Boilerplate library
- Drafting assistant surface
- RFP checklist extractor
- Funder library
- Touchpoint log
- Win/loss retrospective
- Deadline radar
- Pipeline analytics

## Physical scene

A solo operator at 10pm Central, in Austin, in a dim home office. Two-monitor setup. The command center is on the left monitor, the actual application form is open in a browser on the right. They are copy-pasting from the section editor to the funder's portal, one question at a time. They have been at this for 45 minutes. The amber accent on the active row is the only point of color they have looked at all night.

The HUD-dark theme exists because of this scene. The corner brackets, the JetBrains Mono eyebrow labels, the soft amber glow on the active card — all of it answers "where am I in this six-grant pipeline?" without making the operator squint or scroll. The motion (anime.js-driven) acknowledges actions without celebrating them. A pulse on save. A burst on award. Nothing more.

## Reading order for collaborators

1. This PRODUCT.md
2. `funding/grants/_command-center-prd.md` (the full PRD, v0.2)
3. `~/.claude/skills/grants/references/hand-context.md` (the canonical HAND context, shared with `/hand-updates-notebooklm`)
4. `funding/framing/ai-stance.md` and `funding/framing/mystic-hearts.md` (founder-approved framing rules)
5. `DESIGN.md` in this directory (the visual system specific to the command center)
6. `funding/grants/_infra-inventory.md` (which existing local code informs reuse decisions)
