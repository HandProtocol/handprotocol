# Session handoff: yuhm pickup runs (run sheet), living docs, explainer videos

Written 2026-10-01, at koH's request, so the work can continue after `/clear`. Branch `agent/yuhm-network`. Model in use: Fable 5.1.

## Update, later on 2026-10-01: read this first, it supersedes the lists below

The session stopped here when the account's usage limit was reached a second time.

**Now done and tested (198 tests pass, 1 skipped; `npx tsc --noEmit` clean):**

- All logic under `yuhm/src/runs/`: `messages.ts`, `portioning.ts`, `reminders.ts`, `repository.ts`, `store.ts` (offline queue), `snapshot.ts` (guest run sheet to changes), `sample.ts` (the Oak Hill practice run), each with tests. `testing/fakeServer.ts` is the test stand-in for the database.
- Every screen is **written and compiles**: `RunsApp.tsx` (shell, tabs, notices), `RunsHome.tsx`, `RunWizard.tsx`, `RunDetails.tsx`, `RunView.tsx`, `NextUp.tsx`, `stages/AskStage.tsx`, `PickupStage.tsx`, `SplitStage.tsx`, `DeliverStage.tsx`, `FinishView.tsx`, `FamilySheet.tsx` (profile and the ten-question checklist), `FamiliesTab.tsx`, `ProgressTab.tsx`, `AdvancedTab.tsx`, `AdvancedRun.tsx`, `AdvancedRules.tsx`, plus `ui.tsx`, `contact.tsx`, `context.tsx`, `helpers.ts`, `runs.css`.
- The route is wired: `/app/?mode=run` in `src/App.tsx`.

**Not done. The screens have never been opened in a browser.** Treat the look and the flows as unverified.

1. Browser pass first. Start the dev server with the Supabase env blank (`VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port 5199 --strictPort --host 127.0.0.1`), which gives guest mode with no calls to production. Drive Playwright with `--no-sandbox` (memory `machine-headless-chromium-sandbox`) at 390 wide and 1280 wide. Walk: welcome, "Try a practice run", Ask (contact button, answers, the checklist sheet), Pick up, Split, Deliver, Finish, then Families, Seeds, Advanced, and plan a real run. Fix what it shows.
2. Screen tests (none exist yet), including one proving `intent=food` shows nothing from the run sheet or the game, and one in Spanish.
3. Entry points: a link from the Contribute tab's delivery side in `SimpleExperience.tsx`, the world member menu, and a `workspace=runs` item in the coordinator dashboard (`sampleData.ts` `View`, `DashboardApp.tsx`).
4. Optional: PostgREST in front of the local container to prove the real API path.
5. The living docs page with wireframes, then the explainer videos.
6. Update `docs/LIVING-DOCS.md`, `command/supabase/migrations/README.md`, memory. Then tell koH and ask before applying 050 or deploying.

Notes: `runStrings.ts` is about 1,500 lines. Sheets close with `history.back()` when this session opened them (`helpers.ts` `openSheet` / `closeSheet`). The `Sheet` is a custom dialog with a focus trap, not a native `<dialog>`. Do not stop the dev server with `pkill -f` from the same shell command that names it: the pattern matches the shell itself.

## What koH asked for, in order

1. **A pickup-run tool** (set with `/goal`, so a stop hook holds the session until it is done). An organizer for someone picking food up from anywhere and sharing it out to several families. Test case: koH picks up at Oak Hill Baptist. It must split the haul into family portions, remind the runner who to contact and which portion goes where, keep a per-family checklist (what they never need, what they do not want, questions to ask them), check things off, give points even for a hard pickup window, apply "all of our gamified settings", include "an advanced control", and have the database and every screen "perfect".
2. **A full living docs page** of all our systems, with wireframes of all of it. Read as all of yuhm. koH has not confirmed that scope.
3. **Explainer videos** made with "a ffmpeg claude tool". Read as the HyperFrames video skills. Start at `/hyperframes-read-first`. Not yet checked.

## Status in one paragraph

The database layer is finished and tested. The app's logic layer is about two thirds written and what exists is tested, including a test that proves the phone and the database compute the same result for the whole Oak Hill run. **No screen exists yet**, the tool is not reachable from the app, and the docs page and videos are not started. Nothing is applied to production, nothing is deployed, nothing is committed.

## What exists

| Thing | Where | State |
| --- | --- | --- |
| Migration | `command/supabase/migrations/050_yuhm_food_runs.sql` | Done. Applies after 001 to 049 on the local Supabase Postgres image, and re-applies cleanly. **Not applied to production.** |
| Database test | `command/supabase/tests/food_runs_acceptance.sql` | Passes. Its checks were confirmed live by changing expected numbers and watching it fail. |
| Local database script | `command/supabase/tests/rebuild-local-db.sh` | Builds container `yuhm-runs-pg` (port 127.0.0.1:54329) with every migration. The container was left running. |
| Plan and design brief | `plans/006-yuhm-pickup-runs.md` | Written. The design brief in it is Claude's, not confirmed by koH. |
| Types and catalogs | `yuhm/src/runs/model.ts` | Done. Includes the `Op` / `Change` types that mirror the SQL changes. |
| Time helpers | `yuhm/src/runs/time.ts` | Done. No tests of its own. |
| Seeds and stamps | `yuhm/src/runs/scoring.ts` | Done, tested. |
| Change engine | `yuhm/src/runs/engine.ts` | Done, tested (14 tests in `engine.test.ts`). |
| Phone-vs-database test | `yuhm/src/runs/dbParity.test.ts` | Passes against the local container. Skipped unless `YUHM_RUNS_DB` is set. |
| Test fixture | `yuhm/src/runs/testing/oakHill.ts` | The Oak Hill run as a list of changes, shared by the tests. |
| The split | `yuhm/src/runs/portioning.ts` | Written, type-checks, **no tests yet**. |
| Next-up list and calendar file | `yuhm/src/runs/reminders.ts` | Written, type-checks, **no tests yet**. |
| All copy, English and Spanish | `yuhm/src/runs/runStrings.ts` | Written for the planned screens. Expect to add keys while building. |

Last check before this handoff: `npx tsc --noEmit` clean; full yuhm suite 144 passed, 1 skipped (the parity test, which then passed on its own with the database named).

## Still to build, in order

1. `messages.ts`: prefilled messages in the family's language and the links that open them (see "Messages" below). Tests.
2. Tests for `portioning.ts` and `reminders.ts`.
3. `repository.ts`: calls to the database functions, with an injectable client so tests can fake it.
4. `store.ts`: the offline queue (see "Store" below). Tests.
5. `sample.ts`: the Oak Hill practice run as changes (`is_practice: true` on the run and its five sample families, no phone numbers).
6. Screens and `runs.css` (see "Screens" below). Route `/app/?mode=run` in `src/App.tsx`. A link from the Contribute tab and the member menus. A `workspace=runs` board in the coordinator dashboard.
7. Screen tests, including one that proves the food finder (`intent=food`) shows nothing from the run tool or the game.
8. Browser pass with headless Chromium at phone and desktop widths (memory `machine-headless-chromium-sandbox`: drive Playwright directly with `--no-sandbox`). Fix what it shows.
9. Optional but valuable: put PostgREST in front of the local container and run the real client against it, to prove the real API path.
10. The living docs page with wireframes of every yuhm system. Source text: `yuhm/docs/LIVING-DOCS.md` (its front matter says `canonical_path: /docs/`).
11. The explainer videos.
12. Update `yuhm/HANDOFF.md`, `yuhm/docs/LIVING-DOCS.md`, `command/supabase/migrations/README.md`, and memory. Then tell koH what is ready and ask before applying 050 to production or deploying.

## What migration 050 does

- **Run tables**, private to the runner who owns them (no anonymous read, no coordinator read): `food_run_households`, `food_runs`, `food_run_items`, `food_run_stops`, `food_run_portions`, `food_run_settings`, `food_run_events` (receipts plus activity log; ids only, never a name or a number).
- **Game tables**: `food_mission_enrollments` and `food_mission_stamps` (plan 004's columns), `food_mission_pauses`, `food_run_rules` (one row of seed values a coordinator can tune). Seeds go to the existing `food_reputation_ledger`, only for people who opted in.
- **One write path**: `apply_food_run_changes(p_changes jsonb, p_return_board boolean)`. Each change has a client `key` (replays are skipped), an `op`, and the phone's own `at` timestamp (kept when it is at most 90 days old and not in the future). Each change runs in its own savepoint. Refused ones come back in `failed` with the reason and do not block the rest. `outputs` holds the answer of `run.complete`. With `p_return_board` the fresh board comes back in the same call.
- **The changes**: `household.save`, `household.forget`, `run.save`, `run.status`, `run.check`, `run.leftovers`, `run.complete`, `run.delete`, `item.save`, `item.delete`, `stop.save`, `stop.order`, `stop.contact`, `stop.delivery`, `stop.intake`, `stop.delete`, `portion.set`, `portion.replace`, `settings.save`.
- **Reads**: `get_food_run_board()` (everything the app needs in one call), `get_food_run(id)` (one run plus its activity log), `get_food_run_circle_week()` (anonymous weekly totals).
- **Game functions**: `enroll_food_mission(goal)`, `set_food_mission_status('paused'|'active'|'left', until)`, `set_food_mission_goal(goal)`, `get_food_mission_progress()`.
- **Coordinators** (profile role `admin`): `set_food_run_rules(jsonb)`, `get_food_run_network(weeks)`. **Worker**: `prune_food_run_events()`.
- **Rules worth knowing**: a finished or cancelled run is read-only until reopened; a family marked "only for this run" is deleted when the run completes; practice runs and practice families never mix with real ones and never count; the weekly rhythm is read from the ledger, so deleting a run never erases it; finish seeds and the tough-window bonus need at least one family fed.
- **The numbers the tests pin**: the Oak Hill run earns 91 seeds, 126 with its seven first stamps (first run, full circle, zero waste, early bird, tight window, bilingual, cold keeper).

## Decisions made without koH (say so when reporting)

- "Apply all of our gamified settings" was taken as permission to build on plan 004's **recommended** answers: seeds, weekly rhythm, stamps, a circle goal in place of a leaderboard, seeds are never money, opting in is separate from the account. Plan 004 still lists its nine decisions as open.
- Seed values: ask 2 per family, checklist 3, pickup 10, delivered 5 per family, everyone who said yes got theirs 10, no waste 5, finish 10, each new stamp 5. Tough-window bonus 5 each, capped at 20.
- "An advanced control" was read two ways, and both are planned: an Advanced tab for the runner, and seed rules a coordinator can tune.
- A guest can build a run on their phone before signing in, then save it by signing in.
- Email reminders are left for later. Version one reminds through a calendar file with alarms and through alerts while the app is open. The yuhm Netlify functions have no service key today.
- The design skill (`/impeccable craft`) wants koH to confirm a design brief and wants image mock-ups. koH said to keep going without pausing, so the brief in `plans/006` is self-authored and unconfirmed, and no mock-ups were made (this environment cannot generate images).

## Design decisions already made for the client

**Store.** Two modes. Signed in: the phone keeps `base` (the server's last board) and `pending` (unsent changes), and shows `replay(base, pending)`. A tap applies through the engine at once, joins the queue, and a flush sends up to 100 changes with `p_return_board = true`; the answer replaces `base`, acknowledged changes leave the queue, `failed` ones are dropped with a visible notice. With no signal the queue waits and retries on reconnect and on focus. Cache key per user in localStorage. Guest: the same engine applied straight to a state saved under a guest key, no queue. On sign-in, offer to bring the guest data in by turning the guest state into changes (a `snapshotToOps` function: families, runs, items, stops, then the check-offs with their recorded times as `at`). On sign-out, clear the cache unless unsent changes remain.

**Finishing a run.** `run.complete` is just another change. The engine returns a projected result at once (`projected: true`); the server's answer replaces it when the flush returns. In guest mode the finish screen says what the run would plant and offers sign-in.

**Messages.** Six templates (ask, confirm, on my way, delivered, the questions, missed you), each in English and Spanish, with `{name}`, `{me}`, `{source}`, `{day}`, `{time}`, `{items}`. Links: `sms:<number>?&body=`, `https://wa.me/<digits>?text=`, `tel:`, `mailto:`. One message per family, never a group message (it would expose numbers). Practice families have no number, so the screen shows the message instead of sending it. Tapping a contact button marks the family asked, with an undo.

**Screens.** Route `/app/?mode=run`, with `tab=families|progress|advanced`, `run=<id>`, `stage=ask|pickup|split|deliver`, `family=<id>`, `new=1`, so the back button works. A tab bar at the thumb on phones. A run shows a ticket header (place, window countdown, status), a four-step rail, one "Next up" card whose button does the step, then the stage's list.

- Ask: a row per family with a produce-colored sticker, what they skip, a contact button, then one-tap answers. A sheet holds the ten-question checklist; each answer saves on tap and updates the family's profile.
- Pick up: "I am here", a short checklist, a stepper per item for what actually arrived, quick-add tiles for common items.
- Split: "Suggest a split", then one numbered bag per family with steppers. Items left out show why. Problems (an allergy conflict, more given out than there is, leftovers) sit at the top.
- Deliver: the route in order with move earlier and later buttons, "On my way" (opens the message), "Delivered", "No one home", a cold-food timer, then one leftovers question and "Finish run".
- Finish: the drenched green field from THE MISSION demo, stamps, the seed count and where it came from.
- Families tab, Seeds tab (punch card, stamps, circle goal, pause and leave, or the opt-in card), Advanced tab (timing, sharing rules, message wording, manual overrides and a portions grid, activity log, export and erase, seed rules).

**Look.** yuhm's brand theme (oat `#fbf6ea`, cacao ink `#3b2a22`, garden green `#2d6b50`, Baloo 2 for display, DM Sans for body, DM Mono for small labels) with THE MISSION demo's components (`yuhm/prototypes/the-mission/mission.css` and `mission.js` hold the sticker, ticket, punch card, patch SVG and bag tag). Rows, not cards. Fixed type scale. No em dashes in copy. Every text field at least 16px. Buttons at least 44px. Honor `prefers-reduced-motion`.

## Things found along the way

- **Baseline tests need the Supabase env blank**: `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vitest run`. With `yuhm/.env.local` loaded, 7 tests in `src/App.test.tsx` fail. That was already true before this session, and CI has no env.
- The parity test caught a real mismatch on its first run: the database's finish answer left out the seeds from stamps. Fixed in the migration.
- Ledger rows written in one transaction share `created_at`, so a run's stored `awards` list is in key order, not plan order. Compare it as a set and sort it for display.
- SQL `btrim` strips spaces only; the engine mirrors that (`stripSpaces`). Tag lists are sorted with `collate "C"` so both sides agree on order.
- Two other podman containers were running (`fable-dbcore-pg`, `fable-dbyuhm-a-pg`). They are not from this work. Leave them alone.
- Production's `schema_migrations` shows 043 to 049 and 041 but no row for 042. Not investigated.
- The Write tool refuses a file that a script changed until it is read again.
- `yuhm/src/runs/runStrings.ts` is about 1,500 lines. It is a catalog, so that is acceptable, but it could be split into one file per language.

## Rules that still hold

- Do not apply 050 to production or deploy without telling koH first. Take the migration number again at apply time (client sites share the folder; 050 was free on 2026-09-30).
- yuhm deploys are manual (memory `hand-yuhm-deploy`). Production SQL goes through the management API (memory `hand-supabase-mgmt-api-access`). Migrate first, deploy second.
- Another session may share this checkout: stage by path, never `git add -A`.
- No multi-agent Workflow runs (memory `feedback-no-ultracode-workflows`). No specific AI model names in public copy. Momentum over questions.
- Family details are private to the runner. Families never see game screens. Nothing from the tool appears in the food finder.

## How to resume

```bash
cd /home/koh/Documents/handprotocol/yuhm
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vitest run            # 144 pass, 1 skipped
npx tsc --noEmit                                                      # clean
../command/supabase/tests/rebuild-local-db.sh                         # only if the container is gone
podman exec -i yuhm-runs-pg psql -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -q < ../command/supabase/tests/food_runs_acceptance.sql
YUHM_RUNS_DB=yuhm-runs-pg VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vitest run src/runs/dbParity.test.ts
```

Any change to the migration means: rebuild the container, re-run the acceptance test, re-run the parity test.

## Paste this to start the next session

> Read `yuhm/_handoff-2026-09-30-pickup-runs.md` (the update section at the top first) and `plans/006-yuhm-pickup-runs.md`. yuhm's pickup-run tool is written end to end and passes 198 tests, but its screens have never been opened in a browser. Start the dev server with the Supabase env blank, walk the practice run in headless Chromium at phone and desktop widths, and fix what you see. Then add the screen tests and the entry links, build the living docs page with wireframes of every yuhm system, and make the explainer videos. Keep going without stopping to ask. Do not apply 050 to production or deploy without telling me first.
