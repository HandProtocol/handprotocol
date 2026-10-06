# Session handoff: yuhm gatherings beta, coordinated by koord (plan + demo screens)

Session: 2026-09-20, after the THE MISSION session. Branch `agent/yuhm-network`. Written so the next session can start cold after `/clear`. Read `_handoff-2026-09-20-the-mission.md` too if the work touches the demo's first twelve screens.

## Status in one paragraph

koH asked to plan the booking system (`handprotocol/book`, renamed `koord/` the same day) into the yuhm work, and to present a beta for **gatherings and classes**, starting with a **food prep gathering**: each attendee says what they want to prepare, the app writes their itemized order, each person chooses how the food arrives (bring their own, source it from the network with a pickup, or pay for groceries that one or several shoppers buy), and on arrival their items are there to pick. This session produced a build plan, five clickable demo screens, and a plain-language intro on the artifact page. koH settled one decision (how money moves). **Nothing in the app changed: no `src/` edits, no migration, no deploy, no commits. No koord code changed.**

## What exists

| Thing | Where |
| --- | --- |
| Build plan | `plans/005-yuhm-gatherings-koord.md` (what already exists, the nine-step flow, the choices that carry weight, where koord and THE MISSION fit, SQL sketch for nine new tables, functions, notifications, phases G0 to G4, nine decisions, risks) |
| Demo | https://claude.ai/artifact/FwbwZigM85r1ECY2D2PB4Q, **version 4**. The five gathering screens are the last rail group, "Gatherings beta". Version 3 added them; version 4 rewrote the intro. Shared as "anyone with the link". |
| Demo source | `yuhm/prototypes/the-mission/`: new `gather.js` and `gather.css`; small edits to `mission.js` (extension hook), `mission.css` (one scroll fix), `index.html` (intro, TOC entry, `#gather` section, script and stylesheet tags), `preview.mjs` (gathering walkthrough) |
| Companion line in plan 004 | header of `plans/004-yuhm-the-mission.md` |
| Pointer in the living handoff | top section of `yuhm/HANDOFF.md` |
| Pointer in koord | one sentence in the "Where the layer runs" row of `koord/HANDOFF.md`, Open decisions |
| Memory | `hand-yuhm-gatherings-plan.md` (indexed in `MEMORY.md`) |

All of it is untracked or uncommitted. `prototypes/` sits outside the Vite build and the Netlify publish dir.

## Decisions

**Settled by koH, 2026-09-20.** "yes direct settle works. for first implementation, we can have a check list of users who have paid where we do it manually." So:

- People pay each other outside the app (cash, Venmo, Cash App, Zelle). yuhm moves no money, stores no payment handles, checks no payment. HAND never holds the pot (koord record 0004, ruling 4).
- One **money holder** per gathering, the organizer unless they name someone. They tick a checklist by hand: `paid`, `covered`, `shop_anyway` (they vouch), or `dropped`. After the receipt, a second hand tick: `settled`.
- Every tick records who and when, writes an append-only audit row, and can be undone. The attendee sees "marked paid" or "not marked yet" on their own order.
- Only ticked, covered, and vouched orders reach the shop list, so a shopper never fronts money for a stranger.
- The plan has no payments or settlements table for this version (nine new tables, not ten). Stripe on the organizer's own account is phase G3 and needs a `/hand-tax` pass first.

**Still open (end of plan 005, each with a recommendation):** where koord runs for yuhm [as a library inside yuhm; yuhm's tables are the store]; buffer on estimates [15 percent, rounded up to the dollar]; no refund on bought lines after the cutoff [yes, with name-a-collector and release-to-the-table]; pantry supplied by the host kitchen or pooled [organizer chooses, default pooled]; sort at the venue by bin or bag per person in the store [at the venue]; free-text dishes in the beta [allowed, they do not merge]; who can organize [coordinators only during the supervised pilot]; gatherings on the public food map [yes, a plain listing, when free or with covered spots]. **Where koord runs unblocks storage, so it comes first. Do not start G1 before it is answered.**

## Findings that must not be rediscovered

- **Migration 033 already has the gathering spine**: `food_venues` (a private home needs a host and a verification), `food_events` (capacity, `dietary_profile`, `address_release_at`, status ladder), `food_event_items`, `food_event_invites`, `food_event_rsvps` (waitlist), `food_event_assignments`, and the `potluck` lane in `food_lane_readiness`. 034 has `plan_food_potluck()` and `release_food_event_location()`. Only the undeployed coordination API (`yuhm/services/coordination-api`) uses them. Plan 003 phase 1 item 4 already said "Gather becomes real" on these tables. Do not design a new events table.
- **`food_payment_orders` (033) does not fit pooled groceries.** It requires a `commitment_id` and carries a HAND fee (5 percent, capped at $3). Plan 003 also lists a Stripe reconciliation defect to fix before Stripe goes live.
- **"Source it from our app" is first-generation work that is live**: inventory lots and allocations (031), harvest runs (030), rescues (028), drop-offs (040).
- **koord holds no state.** Pure tested modules for delivery, coordination, and events; no storage, no channel plugin, no API. Cold start: `cd koord && node src/cli.mjs status`, then `node src/cli.mjs decision list`. Record 0004 is accepted and marked never re-propose. Records 0001 to 0003, 0007, 0008 are proposed and unreviewed.

## The design, in the choices that must stay consistent

- The **source is per line, not per person**: `bring`, `network`, `buy`, `pantry`.
- **Recipe kits on a small item catalog**, written in units a store sells. That is what lets twelve lists add up into one. Free-text lines only merge on an exact match. A helper-drafted kit (later) is always confirmed by the person, and allergens come from confirmed lines.
- **Discrete items belong to a bin; pantry items are pooled** (three people need cumin, the shopper buys one jar) and split evenly. Package rounding: you pay for what was bought for you.
- **The cutoff is the commitment** (default 48 hours before). Four deadlines: cutoff, shop window (ends at most 90 minutes before start when there are chilled lines), start, settle by.
- **Dignity**: "cover me this time" is visible to the organizer and the money holder only; bins are numbers so no names sit on the sort table; the shopper sees bins, never names, never who paid.
- **Shares must equal the receipt to the cent**; the rounding remainder goes to the pot.
- **Food safety is in the model**: `temperature_class` per item, a cooler step, a short window, an allergen notice computed from locked orders, 033's private-home rules.
- **THE MISSION's rules hold**: attending never enrolls anyone; every attendee can claim a role; seeds only for people who opted in; a gathering may show on the food map as a plain listing with no game UI.
- **koord is the engine, yuhm the first host**: time poll, RSVP rules, share codes, reminders, deadline notices, and the delivery policy (quiet hours, caps, consent) come from koord; notices become rows in `food_outbox`, the same pipeline plan 004 builds. A notice carries a type and a key, not order contents.
- A gathering creates missions: `source_type` `shop_run` plus templates `gathering-shop`, `gathering-pickup`, `gathering-sort`, `gathering-setup`, `gathering-cleanup`, `gathering-host`, `teach-a-class`. Shoppers are thanked in seeds only; paying them raises worker classification questions.

## The demo screens

1. **The gathering**: ticket header (when, neighborhood, orders lock, spots, covered spots, host), the menu of three kits, open roles anyone can claim.
2. **Build my order**: batch steppers per dish; lines generate and merge; Bring / Network / Buy on every line (Network disabled when nothing is listed nearby); one swap control; a till-slip share (groceries, pantry split, 15 percent buffer); private "Cover me this time"; lock, then a confirmation with the paid state.
3. **Paid checklist** (viewing as Rosa, the money holder): tally band, tick rows with bin chip and audit line, "Skip ahead to pay-by (demo)" reveals Shop anyway and Drop; second tab "After: settle" with balances and settled ticks.
4. **Shop run** (viewing as a shopper): consolidated list by store section with bins and a per-line ceiling, chilled banner, "Can't find the chipotles?" swap, receipt step; second tab is the sort sheet (item, then bin chips with quantities).
5. **Pick up my bin**: a corn hanging tag with the bin number, pick list with check tiles, network lines and bring lines in their own groups, the balance slip, leftovers and compost.

All names and prices are invented and the page says so.

## Verified and not verified

Verified with `preview.mjs` (headless Chromium, 1400 wide and 400 wide): no console errors; no horizontal overflow at phone width, including on a gathering screen; the whole path works (claim a role, join, add a dish, change a source, lock, tick paid, pay-by with shop anyway and drop, swap, tick all, receipt, sort sheet, pick, settle tab, settle tick); the settle tab's shares sum to its receipt total (a rendering check: both come from the same function, so it is not a test of the real invariant, which belongs to the build).

Not verified: dark mode; a real phone; Safari and Firefox (the slip's zigzag edge and the ticket use gradients and masks); the published page as koH sees it; the three mermaid diagrams (they render only on the published page). Not in the demo: the organizer's create flow and the koord time poll.

## How to resume

- Preview locally: `node yuhm/prototypes/the-mission/preview.mjs <out-dir>` with the Bash sandbox disabled. Screenshots `p13` to `p17b` and `p15b` are the gathering screens.
- Republish to the **same link**: `Artifact` publish with `url: https://claude.ai/artifact/FwbwZigM85r1ECY2D2PB4Q`, `file_path` = the `index.html`, `root` = the folder, `files: {"mission.css": "mission.css", "mission.js": "mission.js", "gather.css": "gather.css", "gather.js": "gather.js"}`. A new session must first read the artifact, **and the publish guard refuses until each already-published file has been read by `path`** (use `action: read` with `paths`), then diff them against the local copies before sending. A change to `index.html` alone can be published without `files`; the others are kept. Omit `icon` and `capabilities`.

## Gotchas in the demo code

- **Extension hook.** `gather.js` loads before `mission.js` and pushes one function onto `window.YUHM_DEMO_EXT`. `mission.js` calls it with `{ icon, shell, seedsTag, patch, state, render }` and merges the returned `{ group, screens, views, notes, actions, state }`. `SCREENS` and `GROUPS` are now derived from `CORE_SCREENS` and `CORE_GROUPS`. All gathering state lives in `state.g` and changes through `set()`, which replaces the object.
- **Action arguments.** The core dispatcher splits `data-act` on the first `:` only, so two-part arguments use a pipe: `gdish:beans|1`, `gsrc:lime|network`.
- **Rail width.** `.rail-row li` is 20 percent wide, so a group of five fits one row. A sixth screen wraps.
- **Scroll fix.** `.p-body > * { flex-shrink: 0 }` in `mission.css`. Without it, tall screens squash children that have `overflow: hidden` instead of scrolling, and clicks land on the wrong element.
- **Rotation.** The screen-enter animation ends on `transform: none`, which wipes a `transform: rotate()` on any direct child of `.p-body`. `.bin-tag` uses the `rotate` property instead. The core demo's thank-you note (`.thanks`) still has this bug.
- **Skipping ahead.** `ensureOnList()` and `ensureShopped()` carry the viewer through skipped steps when they jump straight to the shop or the bin screen, the same idea as the core demo auto-completing the first bite.
- The viewer's own order is named "Sam (you)" because the checklist is the money holder's screen.
- Preview labels must be unique substrings: "Pick up my bin" was chosen because "Arrive" is already a screen.

## Environment notes

- **GateGuard fired about twenty-five times this session, and the fix is to relaunch.** Memory (`machine-ecc-disabled`) explains it: ECC was switched off on 2026-09-19, but the disable only reaches `claude` processes started after it, and `/clear` does not reload plugins. This terminal's process predates the switch. **Quit and relaunch claude in this terminal** and GateGuard, the `ecc:*` agents, and the StrategicCompact notes go away. If you cannot relaunch: the first Bash call, the first edit of each existing file, and every new file are refused once; state the facts it asks for (callers or importers, affected functions, data files, the user's instruction verbatim), then retry the identical call. It re-arms after each new user message.
- **Memory index compacted.** A hook flagged `MEMORY.md` at 19.6KB against a 24.4KB read limit. It is now about 17KB: all 78 entries kept, hooks shortened, trimmed detail confirmed present in the topic files first (three phrases that were not stayed in the index).
- Another Claude session may share this checkout: stage by path, never `git add -A`.
- Headless Chromium needs the Bash sandbox disabled on this machine.
- koH's standing preferences that applied: momentum over questions, no multi-agent Workflow runs, no specific AI model names in public copy, buttons not prose for owner flows.

## Paste this to start the next session

> Read `yuhm/_handoff-2026-09-20-gatherings-koord.md` and `plans/005-yuhm-gatherings-koord.md`. We have a plan and five demo screens for yuhm's gatherings beta, coordinated by koord; money is direct settle with a hand-ticked paid checklist; nothing is built. [Then one of: "Here are my answers to the open decisions: …" / "Add the organizer's create flow and the time poll to the demo" / "Record koord-as-a-library as a koord decision and design the host adapter" / "More changes to the demo: …" / "Start G1."]
