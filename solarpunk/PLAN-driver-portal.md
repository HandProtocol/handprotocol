# Plan: SPS driver portal

Drafted 2026-10-06 from koH's ask (message cut off at "some people will be…", so the second half is still to come). Nothing here is built.

## Goal

sps.handprotocol.org becomes the one place a volunteer driver needs during the summit: sign up, see their own shifts with everything they need, and get told when things change. The transport team assigns runs and sees coverage at a glance. What works gets carried into koord as reusable pieces.

## Who uses it

| Person | Comes for | Must never see |
|---|---|---|
| New driver | Sign up in under a minute, on a phone, in a parking lot | Other drivers' phone numbers, passenger details before assignment |
| Returning driver | "What's my next shift, when do I leave, who do I pick up" | Runs that aren't theirs in detail |
| Transport team (koH + partner) | Coverage, assign, change times, reach a driver | — |
| Angel / SPS production | Is every artist covered? | Driver personal details |

## Front door

One screen, three doors, no login:

1. **I'm driving** → enter your name (remembered on this device) → *My shifts*
2. **New driver** → name, phone (team-only), seats, availability (today's sign-up, shortened)
3. **Transport team** → the code → dashboard

The access code moves from "whole site" to "team door only" so drivers never need it. Drivers are identified by name + device token as now; a magic link by SMS or email can replace the device token later (koord already has an email channel).

## My shifts (the core screen)

Per assigned run, one card, in order:

- **Leave camp / be at AUS by** time, computed from pickup time and the 40-minute drive, with a "ready by" 15 minutes earlier. This is the big number on the card.
- Date, pickup time, route, rider count, bags/gear note.
- **Meet point**: for AUS, the arrivals curb + terminal; for camp, the named spot (to confirm with Angel). For the downtown run, the cross-street.
- **Passenger first name + flight number** shown only once the run is assigned to this driver, and only on this driver's screen. Phone number only if koH decides drivers should call directly (open question 3).
- Status chip: assigned / confirmed / changed since you last looked / done.
- One-tap: "I'm on my way", "Picked up", "Dropped off", "Problem" → team gets a message (email now; Telegram topic via the HandAI notifier is the natural next step).
- Who to call: the team cell(s).

Below the cards: "Other runs that still need a driver" with a one-tap Can drive.

## Week diagram

A horizontal timeline, one row per day, each run a bar from busy-start to busy-end, colored green (to camp) / amber (leaving camp), grey when covered, outlined when assigned to you. Tap a bar to open the run. Same component serves the team dashboard with driver names on the bars. Build it as plain SVG from the slots data; no chart library.

## Team dashboard

- Coverage grid: runs × status, with gaps first.
- Assign: pick from drivers who said yes/maybe, see their seats and other shifts that day (conflict check on busy windows).
- Edit a run's time (flight firmed up) → every assigned driver gets an email/SMS with the new "leave by".
- Export: CSV of assignments for Angel.
- Driver list with phones (team-only).

## Notifications

- Email already works (Resend). Add: assignment, time change, day-before reminder, 90-minutes-before reminder.
- SMS is the right channel for drivers on the road; koord's research (`2026-09-30-messaging-channels-and-consent.md`) covers Twilio-style sending and consent. Decide whether SPS is the first real use.

## Data model (small)

`runs` (what slots.mjs holds today, plus `meetPoint`, `passengerFirstName`, `flight`, `status`, `assignedTo`), `drivers` (name, phone, seats, note, token hash), `availability` (driver × run → yes/maybe), `events` (on-my-way / picked-up / problem, with timestamps). Keep Blobs for this event; mirror the shapes on koord's `bookings` / `slots` / `notices` so a port is a rename, not a rewrite.

## Build order

1. Front door + My shifts (reads existing data, adds `assignedTo` to runs) — the part drivers feel.
2. Team dashboard: assign + edit times, with the emails.
3. Week diagram (shared component).
4. Status taps + reminders.
5. koord contribution: extract the busy-window math, the device-token identity, the three-way availability widget, and the "leave by" rule.

## Open questions for koH

1. Who are the drivers: a few friends, or a public volunteer call? Decides whether sign-up needs a phone number and whether a code stays on the sign-up door.
2. Should drivers see passenger first names and flight numbers for their own runs? (Needed to meet someone at arrivals; the alternative is the team texting it.)
3. Should drivers get passenger phone numbers, or route everything through the team?
4. Where exactly do drivers meet at AUS and at camp? (Ask Angel.)
5. Is a gas/mileage reimbursement or a thank-you part of this? If yes, the portal should log miles per run.
6. Telegram notifications: use the HandAI bot's Develop-style topic for this, or keep email/SMS only?
7. What did the cut-off sentence say: "some people will be…"?
