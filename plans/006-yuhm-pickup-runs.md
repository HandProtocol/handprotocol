# Plan 006 — yuhm: pickup runs (the run sheet)

Status: IN PROGRESS (database layer written and tested locally; client under construction; nothing applied to production or deployed)
Date: 2026-09-30
Scope: `yuhm/src/runs/`, one migration (`command/supabase/migrations/050_yuhm_food_runs.sql`), its acceptance test
Companions: plan 004 (THE MISSION: seeds, rhythm, stamps) and plan 005 (gatherings). This is the first built piece of plan 004's game layer.
Session handoff: `yuhm/_handoff-2026-09-30-pickup-runs.md`

## What koH asked for

A tool for someone picking food up from anywhere and sharing it out to several families. Test case: koH picks up at Oak Hill Baptist. It must split the haul into family portions, remind the runner who to contact and which portion goes where, keep a per-family checklist (what they never need, what they do not want, questions to ask), check things off, reward finishing even in a hard pickup window, apply "all of our gamified settings", include "an advanced control", and have the database and every screen "perfect".

## The flow

A run moves through four stages, then a finish screen.

1. **Ask.** Each family on the run gets one prefilled message in their language, by text, WhatsApp, call script, or email. One tap opens it and marks them asked. Their answer is one tap: yes, not this time, no answer. A checklist of ten questions fills in the family's profile as they answer.
2. **Pick up.** A countdown to the window, an "I'm here" button, a short checklist, and a count of what actually arrived.
3. **Split.** The tool suggests a fair split: every family that can take an item gets one before anyone gets two, the rest follows household size. It leaves out what a family is allergic to, does not eat, never needs, or cannot store. Each bag has a number.
4. **Deliver.** The route in order, one family at a time: on my way, delivered, or no one home. Cold food shows a timer.
5. **Finish.** Leftovers get one question, then the run closes and the thanks appear.

## Decisions made without koH (each is easy to change)

- "Apply all of our gamified settings" was read as: build on plan 004's recommended answers. Seeds, weekly rhythm, stamps, a circle goal in place of a leaderboard, seeds are never money, opting in is separate from the account. Plan 004 still lists its nine decisions as open.
- Seed values: ask 2 per family, checklist 3, pickup 10, delivered 5 per family, everyone who said yes got theirs 10, no waste 5, finish 10, each new stamp 5.
- Tough-window bonus: +5 each, capped at 20, for an early window (before 8 am), a late one (after 7 pm), a tight one (30 minutes or less), six or more families, cold food, and anything the runner flags (heat, rain, cold snap, long drive, heavy lifting, solo, short notice, no car).
- Families never see any game screen. Nothing from the tool appears in the food finder.
- A person can build a run on their phone before signing in, then save it by signing in (plan 004's "save your seeds" pattern).
- Practice runs (the Oak Hill sample) work end to end and count for nothing.
- "An advanced control" was read two ways and both are built: an Advanced tab for the runner (timing, sharing rules, message wording, manual overrides, data), and seed rules a coordinator can tune.

## Design brief (written by Claude, not yet confirmed by koH)

- **What it is.** A phone run sheet for one volunteer. The single most important thing on every screen is the next thing to do.
- **Scene.** A volunteer in a church parking lot at 7:40 on a bright Saturday, a box of produce in one hand and the phone in the other, glancing down between loads. So: light theme, strong ink on oat, large targets, one thumb.
- **Register.** A tool, wearing yuhm's brand theme (oat, cacao, garden green, Baloo 2, DM Sans), with tool discipline: predictable layout, fixed type scale, familiar controls.
- **Color.** Restrained on working screens. Each family carries a produce color as its sticker. Corn marks "now". The drenched green field from THE MISSION demo is kept for the two game moments: the finish screen and the top of Progress.
- **Anchors.** A paper run sheet on a clipboard (rows, check boxes, bag numbers). A deli ticket (the pickup header, the numbered bag tag). A punch card and passport stamps (rhythm and stamps).
- **Layout.** One column on a phone with a tab bar at the thumb. Family rows, not cards. The ticket and the bag tag are the only object shapes.
- **Interaction.** The button is the step, steps tick themselves, saves are instant, mistakes get an undo instead of a confirm dialog.
- **Not this.** Delivery-app urgency (red countdowns, guilt copy). Food-bank gray. A grid of identical cards.
- **Images.** No mock-ups were generated: the build environment has no image generation.

## Data model (migration 050)

Seven run tables, private to the runner: `food_run_households`, `food_runs`, `food_run_items`, `food_run_stops`, `food_run_portions`, `food_run_settings`, `food_run_events`. Four recognition tables: `food_mission_enrollments` and `food_mission_stamps` (plan 004's columns), `food_mission_pauses`, `food_run_rules`. Seeds go to the existing `food_reputation_ledger`.

One write path: `apply_food_run_changes(changes, return_board)`. Each change carries a client key (replays are skipped) and the phone's own timestamp. A refused change is reported and does not block the rest.

## Client architecture

- `model.ts` types and catalogs. `engine.ts` a pure reducer that mirrors the SQL changes. `scoring.ts` mirrors the seed and stamp rules. `portioning.ts` the split. `reminders.ts` the next-up list and the calendar file. `messages.ts` the prefilled messages. `store.ts` the offline queue. Then the screens.
- The phone keeps the server's last answer plus a queue of unsent changes, and shows the result of replaying one over the other. With no signal the queue waits.

## How it is verified

- `command/supabase/tests/food_runs_acceptance.sql`: the Oak Hill run end to end, privacy between runners, practice runs, refused changes, phone timestamps.
- `yuhm/src/runs/dbParity.test.ts`: sends the same changes to a real Postgres and to the phone's engine and compares the results row for row. It caught one real mismatch on its first run (the finish seeds left out stamp seeds).
- Unit tests beside each module, and a browser pass at phone and desktop widths.

## Open decisions for koH

1. The seed values and the tough-window list above.
2. Whether the landing page gets a door to the run sheet, or it stays reachable from Contribute and the member menu only.
3. Email reminders when the app is closed. Version one uses a calendar file with alarms, plus alerts while the app is open. Email needs a service key in the yuhm Netlify site and a scheduled function.
4. Whether a second person can help on a run (a co-runner). Version one is one runner per run.
