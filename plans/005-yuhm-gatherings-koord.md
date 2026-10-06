# Plan 005: yuhm gatherings (beta), coordinated by koord

Status: PROPOSED (nothing built in the app; demo screens exist; decision 1 settled)
Date: 2026-09-20
Demo: the "Gatherings beta" group (five screens) in https://claude.ai/artifact/FwbwZigM85r1ECY2D2PB4Q, version 3. Source: `yuhm/prototypes/the-mission/gather.js` and `gather.css`, loaded through a small extension hook in `mission.js`.
Scope: `yuhm/` app, one new migration in `command/supabase/migrations/`, new Netlify functions in `yuhm/netlify/functions/`, a host adapter that lets yuhm use `koord/` as a library
Companion: plan 004 (THE MISSION). The two share one notification pipeline and the mission templates. Neither blocks the other.

## Why

koH, 2026-09-20: plan the booking system (`book/`, renamed `koord/` the same day) into the yuhm work. koord will coordinate every HAND feature in time, but the first thing to present is a beta for **gatherings and classes**. The first worked case is a **food prep gathering**:

- Each attendee says exactly what they want to prepare.
- That generates their order as an itemized list.
- They choose how the food arrives: bring their own, source it from the network and have someone pick it up, or pay for groceries that one or several people go and buy with the money from each person's order.
- When they arrive, their items are there to pick.

## What already exists (reuse, do not rebuild)

| Piece | Where | State |
| --- | --- | --- |
| Gathering spine: `food_venues` (a private home needs a host and a verification), `food_events` (capacity, `dietary_profile`, `address_release_at`, status ladder), `food_event_items`, `food_event_invites`, `food_event_rsvps` (waitlist, guest count, dietary and access needs), `food_event_assignments` (food, setup, cleanup, transport, venue_support) | migration 033 | Applied. Only the undeployed coordination API consumes it. Plan 003 phase 1 item 4 already said "Gather becomes real" on these tables. |
| `plan_food_potluck()`, `release_food_event_location()` | migration 034 | Applied. |
| Lane gate: `food_lane_readiness`, lane `potluck` | 033, 036 | Applied. A beta needs a `go` at `supervised_pilot` with a coordinator, an incident contact, a rollback trigger, and a volume ceiling. |
| "Source it from our app": inventory lots and allocations (031), harvest runs (030), rescues (028), drop-offs (040) | first-generation, browser to RPC | Live. |
| `food_payment_orders` and Stripe tables | 033, 035 | Shaped for the marketplace lane: needs a `commitment_id` and carries a HAND fee (5 percent, capped at $3). Not a fit for pooled groceries as it stands, and plan 003 lists a reconciliation defect to fix before Stripe goes live. |
| Notification queue, consent, quiet hours: `food_outbox`, `food_contact_channels` | 032 | Applied. Plan 004 builds the `mission-notify` function on them. |
| koord: plan and RSVP, time poll, reminders, notices, groups, invite codes, delivery policy, ladder, quiet hours, event aggregation | `koord/src` | Pure tested modules. No storage, no channel plugin, no API, nothing deployed, nothing committed. |

What is missing for food prep: recipes, per-attendee orders with a source per line, shop runs with a consolidated list, receipts and settle-up, bins and pick lists.

## The food prep gathering, end to end

Four named deadlines drive everything: **cutoff** (default 48 hours before start), **shop window** (ends at most 90 minutes before start when the list has chilled or frozen lines), **start**, and **settle by** (default 3 days after).

1. **Create.** An organizer sets the type (`prep`), venue, capacity, and either a time or a koord time poll (three proposed times, approval voting, a deadline). They attach a **menu** of recipe kits, or leave the menu open. They set the cutoff, the stores, and how many covered spots exist.
2. **Join and order.** An attendee answers yes, picks dishes and servings. The app scales each recipe and writes **order lines**. Every line has a **source**: `bring`, `network`, `buy`, or `pantry`. The attendee sets a default and can override any line (bring my own rice, network tomatoes, buy chicken). Each `buy` line carries a substitution choice: fine, ask me, or skip it.
3. **Cutoff.** Orders lock. The app turns `network` lines into allocations against real lots plus pickup runs, groups `buy` lines into **shop runs** by store, assigns each order a **bin number**, and computes each person's share.
4. **Pay.** Each buyer sees "your share": estimate plus a buffer. They pay the gathering's **money holder** (the organizer unless they name someone else) however the two of them agree: cash, Venmo, Cash App, Zelle. The money holder keeps a **paid checklist** and ticks each person by hand. The app moves no money and checks no payment (decision 1, settled 2026-09-20). Only ticked orders, covered orders, and orders the organizer chooses to keep go onto the shop list.
5. **Shop.** One or several shoppers claim runs. A shopper sees one consolidated list in store-section order ("yellow onions: 12, bins 2, 4, 4, 7"), a per-line ceiling, and marks each line bought, substituted, or unavailable with the real price. They photograph the receipt.
6. **Sort.** At the venue a sort sheet reads item by item: which bins, how much each. Bins are numbers, not names.
7. **Arrive.** The attendee's screen says "You are bin 4" and lists their items to check off. A missing line says why (unavailable, skipped by your choice, substituted with what).
8. **Settle.** Real prices replace estimates. Each person sees a balance, owed or refunded. Shares must sum to the receipt total to the cent; the rounding remainder goes to the pot. The money holder hands back or collects the difference in person and ticks a second box, **settled**, by hand.
9. **After.** Leftovers go to a drop-off or an inventory lot, scraps to compost returns (037), recognition to the ledger (`event_hosted`, `event_supported`, `delivery_completed`). Real line prices update the catalog's estimates, so the next gathering's shares are closer.

A **class** is the same model with a teacher, one fixed kit for everyone, and an optional fee. A **potluck** is the same model with no orders and the existing `food_event_items` sign-up. So the type list is `prep`, `class`, `potluck`, `work_party`.

## Choices that carry the most weight

1. **The source is per line, not per person.** Most people will mix all three.
2. **Recipe kits first, free text second.** A kit is a recipe whose ingredients point at a small item catalog, written in units a store sells (1 lb, 2 each, one 15 oz can). That is what makes twelve people's lists add up into one. Free-text lines are allowed but only merge on an exact match. Later the yuhm helper can draft a kit from "chicken tinga for six"; the person always confirms the draft before it becomes an order, and allergens come from the confirmed lines, never from the draft.
3. **Discrete items and pantry items are different things.** Two pounds of chicken thighs belong to a bin. Half a cup of cumin does not: three people need it and the shopper buys one jar. Pantry lines are pooled, bought once or supplied by the host kitchen, and split evenly across the people who use them. Package rounding follows one rule: you pay for what was bought for you (need 1.5 lb, sold as 2 lb, you get and pay for 2 lb).
4. **The cutoff is the commitment.** Before it, cancel freely. After it, your `buy` lines have been or will be bought, so you still owe them. You can name someone to collect your bin, or release it to the shared table. At the pay-by time the money holder sees who is still unticked and, for each, taps "shop anyway" (they vouch for it) or lets the order drop off the shop list, so a shopper never fronts money for a stranger.
5. **Dignity.** A person choosing "cover me this time" is visible to the organizer only. Covered spots are funded by a pot: the organizer, the circle, or other attendees rounding up. Nothing on any shared screen shows who paid what. Bins by number also keep names off the sort table.
6. **Food safety is in the model.** Catalog items carry `temperature_class` (the same values as `food_supplies`). A run with chilled or frozen lines gets a cooler step and a short window. The gathering page shows the allergen set computed from the locked orders ("this kitchen will handle peanuts, shellfish"). A private home keeps 033's rules: verified venue, address released on a timer to confirmed people only.
7. **Ground rule 1 from plan 004 holds.** A gathering may appear on the food map as a plain listing ("community cook, Saturday, covered spots"). No seeds, no prompts, no account wall to read it.

## Where koord fits

koord is the engine; yuhm is its first host with real storage.

| Need | koord module | yuhm side |
| --- | --- | --- |
| Pick the date | `coordination/poll.mjs` | poll rows on the event |
| RSVP rules, share link, invite codes | `coordination/plan.mjs`, `codes.mjs` | `food_event_rsvps`, `food_event_invites` |
| A circle that gathers regularly | `coordination/group.mjs` | later |
| Reminders and deadline notices (cutoff tonight, your share, shopping done, your bin, balance) | `coordination/reminders.mjs`, `notices.mjs` | one outbox row per notice |
| Quiet hours, caps, consent, dedup, channel order | `delivery/policy.mjs`, `ladder.mjs`, `quiet-hours.mjs` | `food_contact_channels`, `food_notification_prefs`, `food_notification_log` (plan 004) |
| Outside classes and events people can go to together | `events/` (Luma, Resident Advisor, a pasted link) | phase G4 |

This leans on koord's first open decision (where the layer runs). Recommended answer for yuhm: **koord runs as a library inside the host.** yuhm's Netlify functions import the pure modules; yuhm's tables are the store; yuhm's existing Resend wiring becomes koord's first real channel behind `defineChannel()`. A central service stays possible later because the modules do not know where they run. That also gives koord's missing contact model a concrete first shape: `food_participants` plus `food_contact_channels`.

Record 0004 stays intact. A notice carries a type and a key, not order contents. Nothing about a gathering is mirrored into a HAND-run channel. Ruling 4 (money runs through the owner's own accounts, HAND does not hold it) drives decision 1.

## Where THE MISSION fits

A gathering creates work, and that work is missions. `food_missions.source_type` already has `event`; add `shop_run`. New templates: `gathering-shop` (run, move), `gathering-pickup` (run, move), `gathering-sort` (shift, share), `gathering-setup` and `gathering-cleanup` (shift), `gathering-host` (shift, organize), `teach-a-class` (shift, make).

- Attending a gathering never enrolls anyone. The separate yes stands.
- Anyone attending can claim a role from the gathering page. Enrolled people also see it on their board and earn seeds. Same function underneath, so two people cannot both take the last shop run.
- Shoppers are thanked in seeds only in the beta. Paying shoppers raises worker classification questions; run that past `/hand-tax` before adding a tip line.

## Data model (sketch, schema `command`, follow 041's hardening conventions)

Alter what exists:

- `food_events`: add `kind` (`prep`, `class`, `potluck`, `work_party`), `order_cutoff_at`, `pay_by_at`, `settle_by_at`, `menu_open boolean`, `covered_spots`, `share_code`, `money_holder_participant_id` (defaults to the organizer).
- `food_event_assignments.assignment_type`: add `shopping`, `sorting`, `teaching`.

New tables:

```sql
create table command.food_catalog_items (      -- what makes lists add up
  id uuid primary key default gen_random_uuid(),
  name_en text not null, name_es text not null,
  section text not null,                       -- produce, meat, dairy, dry, spice, frozen, other
  unit text not null check (unit in ('each','bunch','can','lb','oz','g','kg','cup','tbsp','tsp','floz','ml','l')),
  item_class text not null check (item_class in ('discrete','pantry')),
  temperature_class text not null check (temperature_class in ('not_controlled','chilled','frozen','hot')),
  allergens text[] not null default '{}',
  est_price_cents integer, last_price_cents integer, last_price_at timestamptz
);

create table command.food_recipes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, title_en text not null, title_es text not null,
  yields_servings integer not null check (yields_servings > 0),
  est_minutes integer, equipment text[] not null default '{}',
  steps jsonb not null default '[]', dietary_tags text[] not null default '{}',
  created_by uuid references command.profiles(id), status text not null default 'draft'
);

create table command.food_recipe_ingredients (
  recipe_id uuid not null references command.food_recipes(id) on delete cascade,
  item_id uuid references command.food_catalog_items(id),
  free_text text,                              -- when no catalog item fits
  quantity numeric not null check (quantity > 0), unit text not null,
  optional boolean not null default false,
  check (item_id is not null or free_text is not null)
);

create table command.food_event_menu (
  event_id uuid not null references command.food_events(id) on delete cascade,
  recipe_id uuid not null references command.food_recipes(id),
  primary key (event_id, recipe_id)
);

create table command.food_prep_orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references command.food_events(id) on delete restrict,
  participant_id uuid not null references command.food_participants(id) on delete restrict,
  state text not null default 'draft' check (state in ('draft','locked','ready','picked','settled','released','cancelled')),
  default_source text not null default 'buy' check (default_source in ('bring','network','buy')),
  bin_number smallint,
  est_share_cents integer not null default 0, actual_share_cents integer,
  unique (event_id, participant_id), unique (event_id, bin_number)
);

create table command.food_prep_order_private (  -- the order's owner, the organizer, and the money holder only, via functions
  order_id uuid primary key references command.food_prep_orders(id) on delete cascade,
  cover_request text check (cover_request in ('none','part','full')),
  cover_cents integer not null default 0, pot_gift_cents integer not null default 0,
  -- the manual paid checklist: two ticks, each with who ticked and when
  paid_state text not null default 'unmarked' check (paid_state in ('unmarked','paid','covered','shop_anyway','dropped')),
  paid_marked_by uuid references command.food_participants(id), paid_marked_at timestamptz,
  paid_note text check (paid_note is null or char_length(paid_note) <= 200),   -- "cash", "venmo", free text
  settled boolean not null default false,
  settled_marked_by uuid references command.food_participants(id), settled_marked_at timestamptz
);

create table command.food_prep_order_dishes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references command.food_prep_orders(id) on delete cascade,
  recipe_id uuid references command.food_recipes(id), custom_title text,
  servings integer not null check (servings > 0)
);

create table command.food_prep_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references command.food_prep_orders(id) on delete cascade,
  dish_id uuid references command.food_prep_order_dishes(id) on delete set null,
  item_id uuid references command.food_catalog_items(id), free_text text,
  quantity numeric not null check (quantity > 0), unit text not null,
  source text not null check (source in ('bring','network','buy','pantry')),
  substitution text not null default 'ok' check (substitution in ('ok','ask','skip')),
  state text not null default 'needed' check (state in ('needed','allocated','bought','substituted','unavailable','staged','picked','dropped')),
  est_cents integer, ceiling_cents integer, actual_cents integer, substituted_with text,
  shop_run_id uuid, inventory_allocation_id uuid
);

create table command.food_shop_runs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references command.food_events(id) on delete restrict,
  store_label text not null,
  shopper_participant_id uuid references command.food_participants(id),
  state text not null default 'open' check (state in ('open','claimed','shopping','bought','delivered','settled','cancelled')),
  window_start timestamptz, window_end timestamptz,
  budget_cents integer not null default 0, receipt_total_cents integer, receipt_tax_cents integer,
  receipt_path text,                            -- private bucket; attendees see totals, not the image
  mission_id uuid
);
```

Nine new tables. There is no payments or settlements table in the first implementation: money is handled by hand and the app keeps two ticks per order (`paid_state`, `settled`) with who ticked and when. Every change to a tick also writes an append-only row to the event's audit trail (reuse the pattern of `food_rescue_events`), so a wrong tick can be seen and undone. Units convert only inside a dimension (weight to weight, volume to volume). Cups of flour to pounds is not attempted; kits are written in store units.

Functions (repo naming): `create_food_gathering`, `set_food_gathering_menu`, `upsert_food_prep_order`, `set_food_prep_line_source`, `lock_food_gathering_orders` (worker, at cutoff: allocations, runs, bins, shares, in one transaction), `claim_food_shop_run`, `get_food_shop_list` (consolidated, by section, with the bin split), `record_food_shop_line`, `attach_food_shop_receipt`, `get_food_sort_sheet`, `get_food_pick_list`, `record_food_pick`, `settle_food_gathering` (worker: real shares, asserts the sum equals the receipt), `get_food_paid_checklist`, `mark_food_prep_paid` (paid, covered, shop_anyway, dropped, or back to unmarked), `mark_food_prep_settled`, `release_food_bin`. RLS: a person reads their own order, lines, and tick state; the organizer reads all orders for their event; the checklist functions answer only to the organizer and the money holder; a shopper reads only the lines on their run, keyed by bin number, never by name, and never sees who paid.

Migration: take the number at build time (plan 004 notes 049 was next free on 2026-09-19 and the folder is shared). `NNN_yuhm_gatherings.sql`. Validate the chain in the podman Supabase image; migrate first, deploy second.

## Notifications (through koord's policy, into plan 004's pipeline)

| Message | Trigger | Channels |
| --- | --- | --- |
| You are in, here is how ordering works | RSVP yes | app + email with .ics |
| Cutoff tonight | 24 h before cutoff, order still draft | email |
| Orders locked: your share is $X | cutoff | app + email |
| A shop run needs someone | run unclaimed 36 h before start | organizer first, then enrolled movers |
| Shopping done: bin 4, two changes | run delivered | app + email |
| Address released | `address_release_at` | app + email, confirmed people only |
| Your balance | settle | app + email |

Add one category, `gathering`, to `food_notification_prefs` so people can mute it apart from missions. All caps and quiet hours from plan 004 apply. WhatsApp, if it lands (plan 004 phase 3), carries only the utility messages here.

## Phases

- **G0. Sign-off.** koH settles the decisions below (decision 1 is settled). The demo has five gathering screens: the gathering, build my order, the paid checklist with its settle tab, the shop run with the sort sheet, pick up my bin with the balance. Not in the demo: the organizer's create flow and the koord time poll.
- **G1. Beta, no money processing.** Public gathering page, RSVP, menu of kits, build my order with a source per line, cutoff lock, the money holder's paid checklist (ticked by hand, with covered, shop anyway, and drop), shop runs with the consolidated list and receipt, sort sheet, bins, pick list, balances with a hand-ticked settled box, email notices through koord. EN and ES. Seed data: about 60 catalog items and 8 kits written with koH or a cook. Done when twelve test orders lock into one list whose shares sum to a test receipt to the cent, and a phone walks shop to pick to balance.
- **G2. Network sourcing and missions.** `network` lines allocate against inventory lots and harvest stops; pickups and shop runs become missions with seeds (needs plan 004 phase 1 for the board, phase 2 for offers).
- **G3. Money on rails, classes with a fee, recurring gatherings.** Decision 1, option B. Covered spots from a subsidy campaign. Needs plan 003's Stripe reconciliation fix and a `/hand-tax` pass.
- **G4. Outside events and the helper.** koord's event aggregation in the gather tab; helper tools ("what is on my list", "add cilantro", "I am running late").

G1 does not wait on plan 004. Whichever ships first builds the shared outbox to notify function once.

## Decisions for koH (recommendation in brackets)

1. **How grocery money moves. SETTLED by koH, 2026-09-20: option A, done by hand.** koH: "yes direct settle works. for first implementation, we can have a check list of users who have paid where we do it manually." So the first implementation is a paid checklist the money holder ticks; no "sent" button, no payment handles stored, no processor. Options as they were put: (A) Settle directly: the app computes shares, people pay each other outside the app (Venmo, Cash App, Zelle, cash at the door), balances settle the same way. HAND touches no money. (B) Stripe Connect on the organizer's or host kitchen's own account, which matches record 0004 ruling 4. A neighbor doing one grocery run should not have to pass Stripe identity checks, so the connected account is the organizer, who pays or reimburses the shopper. (C) HAND collects and pays out. [A for the beta, B in G3, never C without counsel: holding other people's grocery money raises custody, licensing, and restricted-fund questions that `/hand-tax` and `/fiscal` have not looked at.]
2. **Where koord runs for yuhm.** [As a library inside yuhm; yuhm's tables are the store. Record it as a koord decision.]
3. **Buffer on estimates.** [15 percent, rounded up to the dollar, refunded at settle.]
4. **After the cutoff, no refund on bought lines.** [Yes, with name-a-collector and release-to-the-table.]
5. **Pantry items: host kitchen supplies them, or pooled and split?** [Organizer chooses per gathering; default pooled.]
6. **Sorting: at the venue by bin, or bagged per person in the store?** [At the venue. Consolidated shopping is far faster, and sorting is a good first role for someone new.]
7. **Free-text dishes in the beta?** [Allowed, but they do not merge and carry a note that the shopper may ask about them. Helper-drafted kits wait for G4.]
8. **Who can organize?** [Coordinators only during the supervised pilot, as the `potluck` lane gate already requires.]
9. **Does a gathering show on the public food map?** [Yes, as a plain listing, when it has covered spots or is free.]

## Risks

- **Estimates.** No grocery price feed is assumed; none was verified for this plan. Estimates start as organizer-entered numbers and learn from receipts. The buffer and the settle step exist because estimates will be wrong.
- **A shopper out of pocket.** Unpaid lines drop at pay-by; per-line ceilings cap overspend; the organizer sees an unclaimed run 36 hours out.
- **Cold chain and allergens** in a shared kitchen. Temperature class, the cooler step, the short window, and the computed allergen notice are part of G1, not polish.
- **Private homes.** Keep 033's venue verification and timed address release. Start the pilot in a public or partner kitchen.
- **Two RSVP models** (koord's plan attendees, yuhm's `food_event_rsvps`). yuhm's table is the store; koord's functions are the rules. An order needs an account; reading a gathering does not.
- **A hand-kept checklist can be wrong.** One money holder per gathering, every tick stamped with who and when, an audit row per change, and an undo. The attendee sees their own state ("marked paid" or "not marked yet"), so a missed tick gets noticed before the shop run, not at the door.
- **Scope.** Nine tables is a real build. G1 can ship without `network` sourcing and without classes; the order, the list, the bins, and the balance are the beta.
