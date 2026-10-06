# Session handoff: yuhm THE MISSION (demo + plan + design pass)

Session: 2026-09-19 into 2026-09-20. Branch `agent/yuhm-network`. Written so the next session can start cold after `/clear`.

## Status in one paragraph

koH asked to gamify yuhm's first-visit sign-in and add an opt-in gamified layer called **THE MISSION** (missions tied to the route a person picks, delivery-app style offers, Duolingo-style engagement, email and WhatsApp notifications, an agent people can talk to). This session produced a clickable demo, a build plan, and a second design pass on the demo after koH asked for it to look less like a standard AI-generated page. **Nothing in the app changed: no `src/` edits, no migration, no deploy, no commits.** koH called the first version "really good"; the redesign was delivered and has had no feedback yet. The next real step is koH settling nine open decisions; then phase 1.

## What exists

| Thing | Where |
| --- | --- |
| Demo (private artifact, version 2) | https://claude.ai/artifact/FwbwZigM85r1ECY2D2PB4Q |
| Demo source | `yuhm/prototypes/the-mission/` : `index.html` (masthead, stage, the whole plan as HTML), `mission.css`, `mission.js`, `preview.mjs` |
| Build plan | `plans/004-yuhm-the-mission.md` (ground rules, vocabulary, first-visit flow, SQL sketch for ten tables, functions, notification pipeline and caps, WhatsApp helper, phases, nine decisions, risks) |
| Pointer in the living handoff | top section of `yuhm/HANDOFF.md` |
| Memory | `hand-yuhm-the-mission.md` (indexed in `MEMORY.md`) |

All of it is untracked or uncommitted. `prototypes/` sits outside the Vite build and outside the Netlify publish dir, so a yuhm deploy does not ship it.

## The proposal, in the choices that must stay consistent

- Finding food never shows any game UI. `PRODUCT.md` already lists delivery-app urgency as an anti-reference. Plan 004 says a test should enforce this.
- Opt-in is separate from the account. Pause and leave are one tap each.
- Email + password and the one-step `EmailContinueForm` are untouched. The order changes: route pick, then a two-minute "first bite" (which doubles as the capabilities profile), then the form framed as "save your seeds".
- Vocabulary: routes (the same six as `WorldRole`), bites / runs / shifts / pair-ups, seeds, weekly rhythm with automatic rest weeks (not a daily streak), stamps, circle goal (no individual leaderboard).
- Reuse over new tables: seeds in `food_reputation_ledger`, notifications through `food_outbox` and `food_contact_channels`, the WhatsApp thread in `food_conversations` / `food_messages`, the helper bounded by `food_agent_mandates`, rescues keep `claim_food_rescue()` and friends. Ten new tables total.
- Bites are generated from real gaps in the public directory, which is what solves the cold start.
- WhatsApp facts, checked 2026-09-19, re-check at setup: the official Groups API caps a group at 8 including the business number, needs an Official Business Account badge, and has no buttons; marketing templates to US numbers have been paused since April 2025; a US utility template is about $0.006; replies inside 24 hours are free. Hence: a one-to-one helper on the Cloud API with utility templates only, a human-run announcement group per circle, nudges and check-ins by email or in-app only. Meta business verification is the slow part.

## The design pass (artifact version 2)

koH's ask: "polish the design a little better, use some nicer components, make it look a little less like the standard claude designs." Done with `/impeccable polish` (plus its `bolder` and `brand` references).

What made version 1 read as generic: cream ground with a terracotta headline word, small uppercase mono labels, pill chips, every block in the same thin rounded card, three identical stat tiles, a side-stripe callout.

What version 2 does:

- **Page:** masthead and phone stage share one drenched garden-green field (`--field: #173f31`) with a dot grid; "THE MISSION" at poster scale in oat and corn; a tilted scalloped patch "Demo + plan / Not built yet"; the screen selector is a rail of numbered stops in three labeled groups (First visit, The loop, Staying in touch) on a shared five-column grid; ground rules on a cacao band, plan on oat, the nine decisions close the page on a full corn band; ledger-ruled tables; phase timeline with colored numerals; callouts are filled blocks (the side stripe is banned by impeccable).
- **Phone components:** device frame with status bar, notch, home indicator; produce-colored sticker route tiles (`LOOK` map in `mission.js`: tomato, leaf, corn, aubergine, pea, carrot) whose color follows the person through later screens via `--rc` / `--rt` set on `#phone`; `patch()` generates embroidered stamps in SVG (scalloped path, stitched ring, text on two arcs); the offer is a perforated ticket (two half-width radial-gradient masks, `--stub` height); the weekly rhythm is a punch card (`.passport`, level `ring()`, seven punches, goal pips); "I'm free now" is a pressable bar with a radar pulse; check tiles instead of native checkboxes; calendar chips on slots; seed count-up and a handwritten taped note on the Done screen; WhatsApp typing dots and message bar.
- **Type:** Baloo 2 display, DM Sans body, **Barlow Condensed for small labels in place of DM Mono** (a proposal; the footer says so; one token, `--label`, to swap back), Caveat only for the thank-you note.
- Motion eases out with no bounce and turns off under `prefers-reduced-motion`.

## Verified and not verified

Verified with `preview.mjs` (headless Chromium, 1400 wide and 400 wide): no console errors, no horizontal overflow at phone width, all twelve screens render, the full accept → checklist → done path works, WhatsApp replies resolve (English and the Spanish pause), all six route tiles fit one screen.

Not verified: dark mode (tokens are coded, never looked at); the three mermaid diagrams (they render only on the published page, not locally); a real phone; Safari and Firefox (the ticket uses CSS masks); the artifact page as koH sees it after publish.

## Open items

1. **Nine decisions for koH** (end of plan 004 and the corn band on the page), each with a recommendation: the words; whether the Eat route gets missions; weekly vs daily; leaderboard; whether seeds ever convert (run past `/hand-tax` first); WhatsApp scope; "Take part" on the second landing door; who creates missions at launch; the helper's name. **Do not start phase 1 until these are settled.**
2. **Offered, not built: make the decisions answerable on the page.** koH asked how artifacts save answers. The explanation given: a published page is static unless it declares a capability. For this, declare `capabilities: {db: {}}`; in the page `const db = await claude.use("db")` (it resolves later and may be `null`, so render first and light up); write one doc per decision (for example `decisions/3` → `{choice: 'agree'|'change', note}`); show a "6 of 9 settled" tally; read the answers back from a session with the `ArtifactData` tool (load it with ToolSearch). Saving to the db does not wake a session: koH says "read my decisions", or sends an artifact comment to Claude. Load the `artifact-capabilities` skill and read its `db.d.ts` before writing the code. The last message asked koH whether to build this; no answer yet.
3. Start Meta business verification early if WhatsApp stays in scope (needs entity documents; the 501(c)(3) filing is in progress).

## Addendum, later on 2026-09-20: gatherings added (artifact version 3)

A later session planned koord-coordinated gatherings (`plans/005-yuhm-gatherings-koord.md`) and added a fourth screen group, "Gatherings beta", to this demo. New files: `gather.js`, `gather.css`. `mission.js` gained an extension hook (`window.YUHM_DEMO_EXT`; `SCREENS` and `GROUPS` are now built from `CORE_SCREENS` / `CORE_GROUPS` plus extensions). **The republish `files` map below now needs four entries:** `mission.css`, `mission.js`, `gather.css`, `gather.js`. The publish guard also wants each already-published file read by `path` first. Details in the top section of `yuhm/HANDOFF.md`.

## How to resume

- Preview locally: `node yuhm/prototypes/the-mission/preview.mjs <out-dir>` with the Bash sandbox disabled. `index.html` has no doctype or body on purpose: the artifact host wraps it, and `preview.mjs` builds the same wrapper.
- Republish to the **same link** from a new session: `Artifact` publish with `url: https://claude.ai/artifact/FwbwZigM85r1ECY2D2PB4Q`, `file_path` = the `index.html`, `root` = the folder, `files: {"mission.css": "mission.css", "mission.js": "mission.js"}`. Read the artifact first (a new session must, or the publish is refused). Omit `icon` and `capabilities` to keep what it has.
- Artifact rules that bit or nearly bit: external scripts and styles only from the allowlisted CDNs and Google Fonts; one invalid family name in a Google Fonts URL fails the whole stylesheet; keep a 16px side gutter (here it is the three-column grid on `.field` and `.plan > section`).

## Gotchas in the demo code

- `render()` replaces the phone's innerHTML on every action. Timers scheduled by an action must not be cleared by `render()` (that was a real bug: WhatsApp replies and the free-now search never resolved). Only the hold countdown (`holdTimer`) is per-render; `later()` callbacks settle state and repaint only if their screen is still showing.
- The enter animation is keyed on `#phone[data-enter="1"]`, set only when the screen changes, so in-screen taps do not replay it. `bite-done` sets `lastScreen = null` on purpose so the stamp animates.
- Jumping to a screen at or after "Save your spot" auto-completes the first bite so the board never shows 0 seeds; reaching Done awards the mission once (`missionDone`).
- Any test script must re-query the check tiles after each tap (the list goes stale).
- `.rail-row li.seen` must not outrank `[aria-current]` (selector order bug, fixed with `:not([aria-current])`).

## Environment notes

- Memory (`machine-ecc-disabled`) says the ECC plugin was switched off machine-wide on 2026-09-19. Its GateGuard "present these facts" write gate was still firing in this session to the very end, so expect it to be gone only in sessions started after the switch; if it still fires, state callers, no-duplicate, data files, and the verbatim instruction, then retry the same write.
- Another Claude session may be working in this checkout: stage by path, never `git add -A`.
- yuhm deploys are manual CLI and nothing here needs one.
- koH's standing preferences that applied: momentum over questions, no multi-agent Workflow runs, no specific AI model names in public copy (the helper is "the yuhm helper").

## Paste this to start the next session

> Read `yuhm/_handoff-2026-09-20-the-mission.md` and `plans/004-yuhm-the-mission.md`. We have a demo and plan for yuhm's opt-in THE MISSION layer; nothing is built. [Then one of: "Here are my answers to the nine decisions: …" / "Make the nine decisions answerable on the artifact page with the db capability" / "More design changes to the demo: …" / "Start phase 1."]
