# Command Center — First-Run Onboarding (per-role)

The orientation a new operator sees the first time they land *active*. Today the
entire onboarding is a one-shot toast ("Invite accepted — welcome") fired by
`?invited=1` on `/dashboard`. This spec replaces that with a **role-aware,
HUD-native first run** — one short, beautiful sequence that tells each persona
*who they are here, what they own, where to look, and the one thing to do next* —
then blooms into their home surface.

Design language: the HUD-dark system in `DESIGN.md` (amber accent, corner
brackets, concentric rings, JetBrains-Mono eyebrows) and the motion vocabulary
already built in `src/lib/motion/anime.ts` (`letterCycle`, `revealCascade`,
`bloom`, `burst`). The cold-boot North Star is `web/3d-test/loading.html`
("INITIALIZING SOVEREIGN RECIPROCATE") — onboarding personalizes that boot.

## Principles

1. **Role is the spine.** The five pillar roles (`profile.ts`) each get their own
   copy, pillar, map, and first action. No generic tour.
2. **Short.** Four beats, skippable, < 25s if read, one keypress to skip. It
   orients; it does not teach the whole app.
3. **Ends in motion, not a dead end.** The final beat is a single primary CTA —
   the operator's highest-value first action — that `bloom`s into that surface.
4. **Run once, replayable.** Gated by `localStorage` (`hand_cc_onboarded_v1`) so
   it never nags; re-runnable from Settings → "Replay orientation."
5. **Reduced-motion safe.** Inherits the motion lib's reduced path (color/opacity,
   no transforms/particles).

## Shared frame (every role)

```
  ┌ corner brackets · amber grid · concentric ring ┐
   INITIALIZING · <ROLE STAGE NAME>          ← letterCycle boot
   ───────────────────────────────────────
   beat 1  IDENTITY   you are <name>, <role>, <scope>
   beat 2  PILLAR     the one thing you own here
   beat 3  MAP        2–4 surfaces that matter to you (revealCascade tiles)
   beat 4  FIRST MOVE one primary CTA  →  bloom into that surface
  └ skip ▸ (Esc)                          build vX · operator HUD ┘
```

## Per-role journeys

Grounded in the capability map in `src/lib/supabase/profile.ts`.

### admin — "INITIALIZING · COMMANDER"
- **Identity:** You hold the whole board — every pillar, the team, the gate.
- **Pillar:** Keep the team moving. You approve who gets in and who can do what.
- **Map:** Review queue (pending applications) · Invites · Grants · Develop · Inspector.
- **First move:** _N pending applications_ → `/settings` (review queue).
  Fallback if queue empty: _Invite your first teammate_ → `/settings`.

### funding_lead — "INITIALIZING · FUNDING LEAD"
- **Identity:** You own money-in. Grants, funders, deadlines, the boilerplate
  library — and you triage the feedback the team pins.
- **Pillar:** Run the grants pipeline end to end; never miss a deadline.
- **Map:** Grants kanban · Deadlines radar · Funders library · Boilerplate.
- **First move:** _Open the grants pipeline_ → `/grants`.
  Fallback if pipeline empty: _Add your first grant_ → `/grants/new`.

### develop_rep — "INITIALIZING · DEVELOP REP"
- **Identity:** You run business outreach — local businesses get a free demo
  site and a pitch; 33% of what they give flows to the HAND pool.
- **Pillar:** Work the lead pipeline: lead → demo → pitch → touchpoint.
- **Map:** Develop pipeline · Pitch scripts · Grants (read, for context).
- **First move:** _Open your leads_ → `/develop`.
  Fallback if empty: _Add your first lead_ → `/develop/new`.

### contributor — "INITIALIZING · CONTRIBUTOR"
- **Identity:** You can see all the work and shape it — read everything, comment
  and suggest anywhere.
- **Pillar:** Be the extra set of eyes. Your comments move the work.
- **Map:** Grants · Funders · Develop (all read + comment).
- **First move:** _Browse the grants pipeline_ → `/grants` (leave a note).

### viewer — "INITIALIZING · <GROUP> VIEW"
- **Identity:** You see <reciprocate_group>'s slice of the work — scoped to your
  community, read-only. (Stage name uses the group; falls back to "FIELD VIEW".)
- **Pillar:** Stay in the loop on what touches your community.
- **Map:** Grants · Funders · Develop, scoped to <group>.
- **First move:** _See what's relevant_ → `/dashboard`.

## Mechanics

- **Trigger:** active profile + not-yet-onboarded. The `?invited=1` redemption
  redirect is the canonical first arrival; a never-seen active user also triggers.
- **Persistence:** `localStorage["hand_cc_onboarded_v1"] = ISO timestamp` on
  finish/skip. (Per-device by design — simple, no migration dependency. A
  `profiles.onboarded_at` column can supersede this later for cross-device.)
- **Mount:** a client overlay in the `(dashboard)` layout, which already resolves
  `role`. Renders nothing once onboarded. Replaces the bare invite toast as the
  welcome moment (the toast still covers the non-first-run `?invited=1` case).
- **Replay:** Settings → "Replay orientation" clears the flag and re-runs.

## Files

- `src/lib/onboarding/journeys.ts` — typed `CommandRole → Journey` config (copy,
  map tiles, first-action route + fallback).
- `src/components/onboarding/onboarding-flow.tsx` — the client overlay (HUD chrome
  + `letterCycle`/`revealCascade`/`bloom`/`burst`).
- `(dashboard)/layout.tsx` — mounts the flow with the resolved role.
