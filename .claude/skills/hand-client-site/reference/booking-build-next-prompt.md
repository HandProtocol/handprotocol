# Next prompt: build the booking calendar (phase 1)

Written 2026-09-16 so the next session can start cold. The full build spec
lives in `clients/_template/HANDOFF.md` ("Next session: build the booking
calendar"); the decisions and the design in `booking-calendar-plan.md`.

Paste this:

> Build phase 1 of the booking calendar (`request` mode) on the client-site
> engine with PrecisionFix as the pilot. Read first, in order:
> `clients/_template/HANDOFF.md` (section "Next session: build the booking
> calendar"), `.claude/skills/hand-client-site/reference/booking-calendar-plan.md`
> (Decisions + spec), `.claude/skills/hand-client-site/SKILL.md`,
> `clients/precisionfix/HANDOFF.md`. Then work the six slices in the handoff
> in order, tests green after each, no Workflow or ultracode runs. Decisions
> already made: no Telegram, overlapping requests allowed, owner confirms into
> a Confirmed section, feature-rich Bookings tab. Stop at a clean slice
> boundary with an updated handoff if context gets long. Do not commit; deploy
> PrecisionFix by CLI once slice 6 is verified live.
