# Plan 004 — yuhm: THE MISSION (opt-in gamified missions, notifications, WhatsApp helper)

Status: PROPOSED (demo built, nothing in the app changed)
Date: 2026-09-19
Scope: `yuhm/` app, one new migration in `command/supabase/migrations/`, new Netlify functions in `yuhm/netlify/functions/`
Demo: https://claude.ai/artifact/FwbwZigM85r1ECY2D2PB4Q (private to koH; source in `yuhm/prototypes/the-mission/`, outside the Vite build and the publish dir)
Companion: plan 005 (`005-yuhm-gatherings-koord.md`), gatherings and classes coordinated by koord. It shares this plan's notification pipeline, adds a `gathering` notification category, a `shop_run` mission source type, and seven gathering mission templates. Neither plan blocks the other.

## Why

koH asked (2026-09-19) to gamify the first-visit sign-in and give people an opt-in to a gamified side of the network, "THE MISSION": tasks tied to the route they chose, offered DoorDash-style, with Duolingo-style engagement, plus a plan for the database, notifications, and a WhatsApp chat with an agent.

Two facts about the current product shape the design:

- `PRODUCT.md` lists delivery-app urgency as an anti-reference and says playfulness must never undercut dignity for someone arriving hungry. So the plan takes the mechanics (offer, accept, steps, done, weekly rhythm) and leaves the manipulation (red countdowns, guilt messages, acceptance-rate penalties, daily-streak anxiety).
- The September funnel pass cut sign-up to one step and recorded email + password as the mechanism. This plan keeps both. It changes the order (route and a first mission come before the form), not the form.

## Ground rules (tests should enforce 1 and 4)

1. Finding food is never a game. `intent=food`, the map, and FOOD IS HERE alerts show no seeds, no prompts, no account wall.
2. A separate yes. An account does not enroll anyone. Pause and leave are one tap each.
3. Mechanics, not manipulation.
4. An honest board. Only real missions; samples labeled; a quiet zone says it is quiet.
5. Private by default. Neighborhood-level until acceptance; no public ranking of people; shared goals belong to the circle.

## Vocabulary (add to the world glossary if approved)

- **Route**: eat, grow, make, move, share, organize. Same ids as `WorldRole` in `src/world/`.
- **Mission sizes**: bite (2 to 3 min, in-app, generated from data gaps), run (pickup and drop), shift (scheduled block), pair-up (done with a named neighbor; also the training path).
- **Seeds**: recognition points. No cash value, never required, never deducted. Stored as `recognition_points` in `command.food_reputation_ledger`.
- **Rhythm**: consecutive weeks (Mon to Sun, America/Chicago) with at least one completed mission. Goal of 1, 2, or 3 a week fills the ring but never breaks the rhythm. One rest week banked per four active weeks (max two), spent automatically. Pause freezes it.
- **Levels**: Seed 0, Sprout 50, Vine 150, Bloom 400, Harvest 900, Perennial 2000. Levels are thanks; safety gates stay on `food_participants.trust_tier`.
- **Stamps**: firsts and milestones. **Circle goal**: one shared weekly target per circle, in place of a leaderboard.

## First-visit flow

| Screen | Change | Data |
| --- | --- | --- |
| Landing | Second door reads "Take part" on a first visit (`yuhm:first-visit`), href `/app/?mode=join`; "Sign in" becomes a text link. `src/LandingPage.tsx`. | none |
| Pick a route | New `src/mission/JoinFlow.tsx`; reuse role ids and icons from `src/world/views.tsx`. | `localStorage yuhm:mission-draft` |
| First bite | One route-shaped question whose answer becomes `capabilities`. `src/mission/bites.ts`, EN + ES. +10 seeds. | draft |
| Save your spot | Existing `EmailContinueForm` with an optional header slot; `return=/app/?mode=join&step=optin`. | auth user, `command.profiles`, `ensure_food_participant()`, then claim the draft |
| Opt in | New `src/mission/OptIn.tsx`: rhythm goal, channels, four promises, full-size "Not now". Calls `enroll_food_mission()`. | enrollment, prefs, channel consent |
| Mission board | New `src/mission/MissionBoard.tsx`; `App.tsx` routes enrolled members to `mode=mission` by default. World, finder, dashboard one tap away. | reads |

Existing members: one quiet card ("THE MISSION. See what it is.") in the world profile panel and the finder member menu. Nothing else announces it.

All new strings go through `src/i18n.tsx` in EN and ES. Every new surface wears the brand theme (oat, cacao, green CTA with the offset shadow, Baloo 2), honors `prefers-reduced-motion`, and keeps text fields at 16px on touch.

## Data model

Already applied and reused as is: `food_participants` + `ensure_food_participant()`, `food_reputation_ledger` (seeds), `food_outbox` + `lease_food_outbox()` / `complete_food_outbox()` (notification queue), `food_contact_channels` (consent, language, quiet hours, encrypted address), `food_conversations` + `food_messages` (WhatsApp thread), `food_agent_mandates` + `food_agent_actions` (helper bounds and audit), and the rescue functions `claim_food_rescue()`, `record_food_rescue_checkpoint()`, `release_food_rescue()`, `get_food_rescue_private()`.

The 032 to 036 tables are applied but only the undeployed coordination API consumes them. Phase 1 reaches them through new security-definer functions from the browser, the same way the first-generation workflows do. No dependency on the Docker services.

### New tables (all in schema `command`)

```sql
-- Sketch, not final DDL. Follow 041's hardening conventions (revoke from public, RLS on, security-definer RPCs).
create table command.food_mission_enrollments (
  participant_id uuid primary key references command.food_participants(id) on delete cascade,
  status text not null default 'active' check (status in ('active','paused','left')),
  routes text[] not null check (routes <@ array['eat','grow','make','move','share','organize']::text[]),
  rhythm_goal smallint not null default 2 check (rhythm_goal between 1 and 3),
  zone text,                         -- neighborhood label, never an address
  capabilities jsonb not null default '{}',
  available_until timestamptz,       -- "I'm free now"
  paused_until timestamptz,
  consent_version text not null,
  enrolled_at timestamptz not null default now(),
  left_at timestamptz
);

create table command.food_mission_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  route text not null,
  size text not null check (size in ('bite','run','shift','pair')),
  title_en text not null, title_es text not null,
  steps jsonb not null,              -- [{key, title_en, title_es, evidence: 'none'|'checklist'|'count'|'photo', items: []}]
  base_seeds integer not null check (base_seeds >= 0),
  est_minutes integer not null,
  min_trust_tier smallint not null default 0,
  requires jsonb not null default '{}',
  cooldown interval,
  ledger_event_type text not null,   -- one of the ledger's event types
  active boolean not null default true
);

create table command.food_missions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references command.food_mission_templates(id),
  source_type text not null check (source_type in ('rescue','harvest_stop','dropoff','request','event','compost','location_check','manual')),
  source_id uuid,
  zone text not null,
  window_start timestamptz, window_end timestamptz,
  urgency text not null default 'scheduled' check (urgency in ('now','today','scheduled')),
  slots_total integer not null default 1 check (slots_total > 0),
  slots_filled integer not null default 0 check (slots_filled >= 0 and slots_filled <= slots_total),
  state text not null default 'open' check (state in ('draft','open','filled','in_progress','completed','cancelled','expired')),
  public_summary jsonb not null,
  created_by uuid references command.profiles(id),
  created_at timestamptz not null default now()
);

create table command.food_mission_private (   -- no direct select; via get_food_mission_private()
  mission_id uuid primary key references command.food_missions(id) on delete cascade,
  address text, contact text, notes text
);

create table command.food_mission_offers (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references command.food_missions(id) on delete cascade,
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  channel text not null, offered_at timestamptz not null default now(), expires_at timestamptz not null,
  state text not null default 'offered' check (state in ('offered','seen','accepted','passed','expired')),
  pass_reason text,
  unique (mission_id, participant_id)
);

create table command.food_mission_assignments (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references command.food_missions(id) on delete restrict,
  participant_id uuid not null references command.food_participants(id) on delete restrict,
  state text not null default 'accepted' check (state in ('accepted','under_way','completed','released','no_show')),
  accepted_at timestamptz not null default now(), completed_at timestamptz,
  release_reason text, seeds_awarded integer not null default 0,
  unique (mission_id, participant_id)
);

create table command.food_mission_checkpoints (   -- append-only
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references command.food_mission_assignments(id) on delete restrict,
  step_key text not null, evidence jsonb not null default '{}',
  created_at timestamptz not null default now(),
  idempotency_key text not null unique
);

create table command.food_mission_progress (      -- rebuildable cache; the ledger is the truth
  participant_id uuid primary key references command.food_participants(id) on delete cascade,
  seeds_total integer not null default 0, level text not null default 'seed',
  rhythm_weeks integer not null default 0, longest_rhythm integer not null default 0,
  rest_weeks smallint not null default 0, last_active_week date, missions_completed integer not null default 0
);

create table command.food_mission_stamps (
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  stamp_slug text not null, awarded_at timestamptz not null default now(), evidence_id uuid,
  primary key (participant_id, stamp_slug)
);

create table command.food_notification_prefs (
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  category text not null check (category in ('offer','reminder','receipt','digest','nudge','check_in','circle')),
  channel text not null check (channel in ('in_app','email','whatsapp','push')),
  enabled boolean not null default true,
  primary key (participant_id, category, channel)
);

create table command.food_notification_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  participant_id uuid not null references command.food_participants(id) on delete cascade,
  category text not null, channel text not null,
  mission_id uuid, outbox_id bigint, provider_message_id text,
  state text not null check (state in ('queued','sent','delivered','failed','suppressed')),
  suppressed_reason text check (suppressed_reason in ('quiet_hours','cap','paused','no_consent'))
);
```

### Alterations (check constraints)

- `food_contact_channels.channel_type`: add `whatsapp`, `push`.
- `food_conversations.active_channel`, `food_messages.channel`: add `whatsapp`.
- `food_reputation_ledger.event_type`: add `mission_bonus` (stamps, rhythm milestones). Mission completions map to existing types (`delivery_completed`, `food_contributed`, `waste_prevented`, `volunteer_hours`, `event_supported`, `training_completed`) with `evidence_type = 'mission_assignment'`.

### Functions (repo naming: verb_food_noun)

Members: `enroll_food_mission`, `update_food_mission_enrollment` (goal, routes, pause, available_until), `leave_food_mission`, `list_food_missions` (board payload: held offer, bites, week slots, circle goal, progress), `accept_food_mission`, `pass_food_mission`, `get_food_mission_private`, `record_food_mission_checkpoint`, `release_food_mission`, `get_food_mission_progress`, `set_food_notification_prefs`.

Workers only (guard with `is_food_worker_caller()`): `dispatch_food_missions`, `expire_food_mission_offers`, `roll_food_mission_week` (Sunday night rollover, rest weeks), `generate_food_bites`.

Rules:

- `accept_food_mission` takes `select ... for update` on the mission row, checks `slots_filled < slots_total` and the offer's expiry, inserts the assignment, bumps the slot count, and for `source_type = 'rescue'` calls `claim_food_rescue()`. One transaction.
- Completion is one transaction: assignment completed, ledger row with an idempotency key, progress cache, stamps, outbox row for the receipt.
- RLS: people read only their own enrollment, offers, assignments, checkpoints, progress, prefs, log. Open missions expose `public_summary` only. No client writes to tables. Coordinators (`role = 'admin'`) manage templates and missions.
- Fairness: bites cap at five a day; an hours change needs two independent confirmations and a 14-day cooldown per location; run seeds land on the receiving side's confirmation or coordinator review.
- Leaving hard-deletes the WhatsApp row in `food_contact_channels`; the account, ledger, and history stay.

### Migration notes

Next free number is 049 as of 2026-09-19, but `koord/` and the client sites share the folder: take the number at build time. Name it `NNN_yuhm_missions.sql` (applied `wxl` filenames stay as they are). Validate the full chain in the podman Supabase image, then apply through the management API. Migrate first, deploy second.

## Notifications

One pipeline: mission event → `food_outbox` row → `mission-notify` Netlify scheduled function (every 5 min, leases rows) → checks prefs, consent, quiet hours, caps → channel adapters → `food_notification_log` (sends and suppressions).

| Message | Trigger | Channels | Cap |
| --- | --- | --- | --- |
| Offer | dispatcher match | WhatsApp first for now/today, email for scheduled | 3 a day, never in quiet hours |
| Reminder | 24 h and 2 h before | person's channel + .ics | 2 per mission |
| Receipt | completion | app + email | 1 per mission |
| Sunday digest | Sun 5 pm | email | 1 a week |
| Mid-week nudge | Wed, goal unmet, not paused | app + email only | 1 a week |
| Check-in | three quiet weeks | email | once; no answer = auto-pause |
| Circle milestone | goal met | app + digest | 1 a week |

- Channels: in-app always; email through Resend (already wired); WhatsApp opt-in; web push later (iOS needs Add to Home Screen); SMS not planned (cost plus 10DLC registration).
- Quiet hours default 9 pm to 8 am America/Chicago; per-channel override already exists on `food_contact_channels`.
- One-tap email links are signed (HMAC) and expiring, the same pattern as the client-site booking engine. They call the same functions as the app, so two Accepts cannot both win the last slot.
- Tone rule for every message: never mention losing a rhythm. Fewer messages when someone drifts, then silence.

## WhatsApp helper

Checked against public sources on 2026-09-19; confirm again at setup:

- Official Cloud API, one-to-one threads. Messages yuhm starts must be pre-approved templates; replies inside 24 h of the person's last message are free-form and free. US utility templates run about $0.006 each. Per-message pricing since July 2025.
- Meta has paused **marketing** templates to US numbers since April 2025. So nudges and check-ins never go over WhatsApp; only utility messages about missions the person opted into.
- **Groups**: the official Groups API caps a group at 8 members including the business number, requires an Official Business Account (verified badge), and does not support buttons. Unofficial phone-emulating libraries break WhatsApp's terms and get numbers banned. Decision proposed: the helper lives in one-to-one threads; each circle gets a human-run announcement group, and the dashboard drafts the weekly update for a coordinator to post. Small run crews (7 or fewer) could get official groups later if HAND earns the badge.

Architecture: `whatsapp-webhook` Netlify function verifies Meta's signature, stores the inbound row in `food_messages`, matches the phone fingerprint to a participant, returns 200 within seconds, and triggers a background function that runs the helper (tool-calling loop) and replies. Same repo, no new servers. It can move next to HandAI on OVH when plan 003 phase 3 lands.

Helper tools (each is one of the member functions, run under that person's `food_agent_mandates` grant): list missions and offers, accept, pass, release, record a checkpoint, report rhythm and seeds, pause or resume, change the goal, stop WhatsApp, find food near a neighborhood from the public directory, hand off to a coordinator (`food_conversations.status = 'waiting'`).

Hard limits: acts only for the number it is talking to; never shares another person's name, number, or address; no address before acceptance; always says it is automated and offers a person; on safety, illness, allergy, conflict, or urgent need it gives the food map link first and flags a coordinator; STOP, ALTO, PAUSE, PAUSA are handled as plain keywords without the model; no specific model names in public copy; every action logged in `food_agent_actions`.

Long pole: Meta business verification needs legal-entity documents (Texas Certificate of Formation plus EIN should do) and can take days to weeks. Also needed: a number that has never been on WhatsApp, display-name review for "yuhm", and five utility templates in EN and ES (offer, reminder, receipt, released, opt-in confirmation).

## Phases

0. **Sign-off** on the demo and the decisions below. Start Meta verification in parallel.
1. **Join flow, opt-in, bites, progress.** In-app only. Migration for enrollments, templates, missions, assignments, checkpoints, progress, stamps. `generate_food_bites` from directory gaps. No dispatcher. Done when a new visitor goes landing → first bite → account → opt-in → second bite → sees their rhythm, in EN and ES, and a test proves the guest food finder shows no mission UI.
2. **Runs, shifts, offers, email.** Offers table, dispatcher as a scheduled function, adapters for rescues, harvest runs, and drop-offs, a "Make this a mission" button on the coordinator boards, one-tap links, reminders with .ics, Sunday digest, check-in. Done when a coordinator posts a rescue, a matched neighbor accepts from an email, completes it on a phone, and ledger, rhythm, and receipt agree.
3. **WhatsApp helper, one-to-one.** Webhook, templates, tools, keyword shortcuts, a handoff inbox in the dashboard. Done when accept, pass, pause, and "talk to a person" work in EN and ES from a real phone and every action shows in `food_agent_actions`.
4. **Circles, pair-ups, web push, smarter matching.** Circle goals from real totals; the OR-Tools worker takes over multi-stop runs.

Metrics: opt-in rate among new accounts; first-bite completion before sign-up; sign-up conversion against today's funnel; missions per week; offer acceptance rate; time to fill a rescue; four-week rhythm retention; pause and leave rates; unsubscribes and complaints; share of completions that began from a notification. Counter-metric: guest use of the food finder must not drop.

## Open decisions (recommendation in brackets)

1. The words seeds, rhythm, bites, stamps. [Keep; add to the world glossary.]
2. Does the Eat route get missions? [Yes, bites only, offered only after a successful food search.]
3. Weekly rhythm or daily streak? [Weekly.]
4. An individual leaderboard? [No. Circle goals only; the opt-in drop-off board from 040 stays.]
5. Do seeds ever convert into anything? [Not in version 1. Value to volunteers raises tax and fairness questions; run it past /hand-tax first.]
6. WhatsApp scope. [One-to-one helper plus human-run announcement groups; start Meta verification now.]
7. "Take part" on the second landing door for first-time visitors. [Yes, with Sign in as a text link.]
8. Who creates missions at launch? [Bites generate themselves; runs and shifts come from coordinators through one button on the existing boards.]
9. The helper's name and voice. ["The yuhm helper", plainspoken, bilingual, always clear that it is automated.]

## Risks

- **Cold start.** A board with no missions kills the loop. Bites from the real directory guarantee useful work on day one; do not launch phase 1 without them.
- **Dignity.** Any mission surface leaking into the food finder breaks rule 1. Keep the test.
- **Notification fatigue.** Caps and the go-quiet rule are part of the product, not polish. Ship them with the first email.
- **WhatsApp verification** can stall on entity paperwork while the 501(c)(3) filing is in progress. Email carries phase 2 on its own, so WhatsApp never blocks launch.
- **Gaming the bites.** Two-confirmation rule, cooldowns, daily cap.
