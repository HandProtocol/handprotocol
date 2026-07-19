# WXL:FOOD Handoff

Last updated: 2026-07-18

This is the working orientation document for `wxl/`. Read it before changing the app. The root repository handoff covers HAND Protocol as a whole. This file focuses on WXL:FOOD, its current behavior, what is real, what is illustrative, and what should be built next.

Public-facing product behavior and safety boundaries are maintained in `docs/LIVING-DOCS.md`. Keep it current when a feature promise or workflow changes. It is intended to become the source for a future HTML documentation page.

## Orient in one paragraph

WXL:FOOD is a local food coordination app for Austin. It is intended to help neighbors, community groups, food sources, volunteers, and coordinators see available food, publish needs, offer help, nominate sources, and organize rescue and harvest activity. The current app is a Vite, React, and TypeScript prototype with a polished landing page and command-center interface. It uses the HAND Supabase project for authentication and a small set of persisted workflows. Much of the dashboard is still illustrative. The immediate product task is to turn the strongest prototype flows into honest, complete, persisted workflows without implying that placeholder data is live network activity.

## Product decisions made

- Authentication uses email and password. Passwordless magic-link login was removed.
- Account creation uses Supabase email signup, creates a session immediately, and does not require email confirmation.
- Password reset is required and implemented through a recovery email followed by a new-password screen.
- Anonymous access is browse-only.
- Anonymous visitors can view public requests and the prototype dashboard.
- Posting, replying, supporting, offering help, and nominating sources require an authenticated Supabase session.
- When an anonymous visitor attempts a write action, the app opens a clear account prompt with login and account-creation choices.
- Write access is determined from the actual Supabase session, not from the `mode` query parameter.
- Successful login redirects to `/app/`. It does not redirect back into anonymous mode.
- Public source information can be read without an account, but a source does not become verified through community nomination alone.
- The future source-intelligence agent must remain human-reviewed. See `docs/FOOD-SOURCE-AGENT.md`.

## Current stack

| Area | Implementation |
|---|---|
| Front end | React, TypeScript, Vite |
| Icons | `lucide-react` |
| Backend | HAND Supabase project |
| Browser client | `@supabase/supabase-js` |
| Database schema | `command` |
| Hosting | Netlify |
| Live domain | `https://wxl.handprotocol.org` |
| Build | `npm run build` |
| Main UI | `src/App.tsx` |
| Styles | `src/styles.css` |
| Data access | `src/lib/foodRepository.ts` |
| Database migrations | `../command/supabase/migrations/024_wxl_food.sql` through `036_wxl_coordinator_gates.sql` |
| Deployment notes | `DEPLOY.md` |

## Routes and entry states

| Route | Current behavior |
|---|---|
| `/` | WXL landing page |
| `/app/` | Command center; write access follows the active Supabase session |
| `/app/?mode=anonymous` | Explicit browse entry; a valid Supabase session still determines write access |
| `/app/?mode=login` | Email and password login |
| `/app/?mode=login&signup=1` | Account creation |
| `/app/?mode=reset` | Request a password-reset email |
| `/app/?mode=recovery` | Set a new password after following the recovery link |
| `/app/?mode=anonymous&intent=food` | Public food-finding entry; opens the Austin food map |
| `/app/?mode=anonymous&intent=request` | Public request entry; opens Community Requests |
| `/app/?intent=contribute` | Contributor entry; opens Volunteer Command and preserves session-based write access |

Routing is currently implemented with `window.location.pathname` and query parameters inside `App.tsx`. There is no router library.

The landing page is intentionally food-only and role-first. It presents `I need food` and `I am a Contributor` as the two primary paths. Sign-in and community requests remain available, but they do not compete with the initial decision. Intent parameters select the first workspace only. Authentication continues to come exclusively from the Supabase session.

The food intent opens an optional geolocation prompt before map exploration. Browser coordinates are used in memory to select the nearest verified listing and are not persisted or sent to Supabase. The choice is remembered only for the current browser tab through `sessionStorage`. Visitors can skip it and can reopen it from the map location control.

## What works now

### Coordination protocol foundation

- Migrations 024 and 025 have been restored from repository history, resolving the missing predecessors for public requests, the community map, alerts, and engagement records.
- Migrations 026 through 036 were applied to the production HAND Supabase project on 2026-07-18. Migration history is baselined from 001 through 036, and the duplicate public-visits migration was renumbered from 020 to 023.
- Migrations 032 through 036 define channel-independent participants, verification, consent, mandates, private locations, needs, supplies, match evidence, commitments, conversations, payments, donations, subsidies, potlucks, recognition, agent audits, coordinator gates, idempotent command receipts, and a transactional outbox.
- Canonical operational tables reject direct authenticated writes. Lifecycle and commitment changes use security-definer commands with ownership, eligibility, quantity, mandate, and idempotency checks.
- Exact locations are represented only as opaque ciphertext with separate, append-only precision-access evidence.
- The Coordination API, OR-Tools worker, payment worker, potluck worker, retention worker, web workspace, remote MCP, A2A, Stripe reconciliation, and Twilio Voice adapter are implemented but not activated in production.
- SMS is intentionally deferred to the next scope. See `docs/COORDINATION-PROTOCOL.md`.

### Landing and access

- The landing page is food-only and starts with two role paths: `I need food` and `I am a Contributor`.
- The food path opens public map browsing. The Contributor path opens Volunteer Command. Community requests and sign-in remain secondary routes.
- Food seekers receive an optional second-step location prompt. The browser asks for location access only after the visitor chooses `Use my location`.
- A successful location lookup selects the nearest bundled verified listing. Skipping opens the complete Austin map.
- Browser coordinates remain in memory for the nearest-listing calculation and are not persisted or sent to Supabase.
- The location choice lasts only for the current tab. The command-center location control can reopen the prompt.
- The SPA fallback works through Netlify and `public/_redirects`.

### Authentication

- Email and password login uses `signInWithPassword`.
- Account creation uses `signUp`.
- Successful account creation returns an authenticated session and redirects directly to `/app/`.
- Signup fields provide standard browser password-manager metadata. The browser decides whether to offer local password storage.
- Password-reset email uses `resetPasswordForEmail`.
- Recovery returns to `/app/?mode=recovery`.
- New password submission uses `updateUser`.
- Password confirmation is checked in the browser.
- The app subscribes to Supabase auth-state changes and uses the live session for write gating.
- Session restoration has an explicit loading state, preventing the app from briefly presenting an authenticated member as anonymous.
- The account control shows identity from Supabase user metadata or a readable email fallback.
- Authenticated members can sign out from the account menu and immediately return to browse-only access.
- Authentication errors and success notices are shown in the login card.

### Public request loading

- When Supabase environment variables are configured, public records from `command.food_requests` are loaded in reverse creation order.
- If no persisted records are returned, the prototype request set remains visible.
- Anonymous database access is limited by row-level security to public requests and approved public records.

### Community requests

- Authenticated members can submit a community request.
- Persisted requests write to `command.food_requests`.
- Authenticated members can submit a message attached to a persisted request.
- Persisted messages write to `command.food_request_messages`.
- Selecting a persisted request loads its saved messages and structured offers in chronological order.
- Members can offer food, transportation, storage, or volunteer time with quantity, availability, transport, and contact-preference fields.
- Request owners can accept or decline proposed offers. Offer acceptance moves an open request to `in_progress`.
- Offer authors can withdraw their own proposed offers.
- Request owners can start coordination, fulfill, close, or reopen their requests through owner-checked database functions.
- Reply, supporter, and offer totals are maintained by database triggers and reloaded from database records.
- Request status changes are written to an immutable history table.
- Persisted request activity is clearly separated from illustrative fallback conversations.
- The interface warns that request replies and offer details are public and prohibits sensitive contact or household information.
- Anonymous visitors who try to create or reply receive the account prompt.

### Rescue operations

- The rescue board loads privacy-safe operational records through a dedicated database function. It does not substitute sample rescues when the database is empty or unavailable.
- Authenticated members can submit a source, receiving group, food category, quantity, packaging, allergen, date-mark, handling, window, storage, vehicle, accessibility, and location record for coordinator review.
- Public discovery contains only a neighborhood summary. Exact pickup instructions and other handling details are restricted to the creator, assigned Contributor, and administrators.
- Administrators can approve or reject a submission only with a review note. Approval also requires an explicit partner-eligibility and handling-plan confirmation.
- Claims are atomic, expire after at most two hours or at the pickup deadline, and can be released with an audit note.
- Assigned Contributors record pickup and delivery checkpoints. The creator or an administrator records receiving acceptance.
- Checkpoints require packaging, label, temperature-control, contamination, observed-quantity, and note evidence. Chilled food above 41 degrees Fahrenheit and hot food below 135 degrees Fahrenheit enter incident hold.
- Administrators can resolve an incident hold as rejected or cancelled with a required disposition note.
- Status changes, claim releases, checkpoints, and incident resolution are preserved in event history.
- The workflow requires live role-boundary testing and operational approval before production use. Its deployed schema is not authorization for real food movement.

### Contributor readiness and Volunteer Command

- Authenticated members can submit a private Contributor readiness file with contact, emergency contact, availability, service area, vehicle, capacity, lifting limit, temperature-control equipment, accessibility needs, and agreement acceptance.
- Self-service changes return an approved file to `submitted`, clear earlier approval evidence, and pause claiming until a coordinator reviews the new capabilities.
- Administrators have a coordinator-only review queue containing the private evidence needed for approval.
- Approval requires current training, at least one run class, a decision note, and matching equipment for chilled, frozen, or hot handling.
- Training and optional credential expiry dates are persisted. Rescue claiming rejects expired approval evidence.
- Migration 029 replaces the rescue claim function. Only an approved Contributor with the matching run class and equipment can claim. Administrators do not bypass this operational requirement.
- The Volunteer Command no longer displays a fake participant count or placeholder board.

### Harvest runs and private dispatch

- Harvest Runs is a working top-level workspace. The Overview route cards remain explicitly labeled sample patterns and link to this real board.
- Administrators can create future multi-stop plans with public area, capacity, maximum item weight, temperature classes, allowed vehicles, public summary, private dispatch notes, and accessibility limits.
- Stops are ordered and can represent a rescue pickup, rescue delivery, or staging hub. Rescue-linked stop windows must fit both the run window and the reviewed rescue window.
- Exact stop instructions and route order are restricted to the assigned Contributor and administrators.
- Assignment requires an approved Contributor whose training and credential remain valid through the run, matching run classes, vehicle, exact capacity unit and amount, lifting limit, and temperature-control equipment.
- Coordinators must explicitly confirm schedule and service area. The database prevents a rescue from belonging to two active runs.
- Assignment atomically reserves every linked open rescue for the Contributor. Administrators do not bypass operational eligibility.
- Start check-in opens 30 minutes before the run and revalidates approval, training, credentials, run classes, vehicle, capacity, and lifting limit.
- Stop outcomes are ordered, require observed quantity and evidence notes, and depend on rescue pickup or delivery safety checkpoints where linked.
- A stop incident holds both the run and linked rescue. Administrator disposition can document cancellation or mark the incident stop skipped before resuming the run.
- Runs complete only when every stop has a final completed or skipped outcome. Immutable events preserve creation, stop addition, assignment, start, outcomes, incidents, cancellation, and completion.

### Accepted-delivery inventory

- Inventory is an active coordinator-only workspace rather than an inactive navigation item.
- A lot can be created only from a rescue in `accepted` status with a passing acceptance checkpoint and a positive observed quantity. The receiving form cannot override that quantity.
- Each accepted rescue can create at most one inventory lot.
- Lots preserve rescue source, description, category, allergens, date mark, unit, acceptance time, storage location, use-by deadline, and storage plan.
- Temperature-controlled lots carry server-validated minimum or maximum storage limits. Condition checks compare measured temperature against the lot-specific range.
- Current, reserved, and available quantities remain distinct. Allocation locks the lot row so simultaneous reservations cannot exceed available quantity.
- Reservations name organizations or Reciprocate groups and keep handoff instructions private. Household names and sensitive household information are prohibited in the interface.
- Fulfillment reduces physical stock and reserved stock in one transaction. Cancellation releases only the reservation and preserves any safety hold.
- Failed packaging, contamination, storage-control, or temperature checks hold the entire lot. Hold release requires a newer passing check plus a coordinator disposition note.
- Discards can use only unreserved on-hand quantity and require a reason.
- An immutable ledger records receipt, reservation, release, distribution, discard, condition hold, and hold release with balances after every event.

### Source nominations

- Authenticated members can nominate a food source.
- Nominations write to `command.food_source_nominations` with status `nominated`.
- Anonymous visitors who try to nominate a source receive the account prompt.
- Only verified nominations are publicly readable under the current row-level security policy.

### Austin food-node map and community signals

- The Overview now opens on a schematic Austin food-node map before any sample metrics or activity cards.
- The initial map set includes public-directory listings from the City of Austin and Central Texas Food Bank. Selecting a node shows its public address, known hours or access notes, a source link, and directions when the location is directory-listed.
- South Oak Baptist food pantry is shown as a community report pending confirmation. The reported access is Thursdays from 9 to 11 AM, one form, and no ID requested. Its exact public location is intentionally not inferred.
- A volunteer start node connects to three anonymous household clusters. These route lines communicate the delivery workflow without exposing private home locations.
- Authenticated members can add a public food spot with produce and availability details. New spots are labeled as community pins until reviewed.
- Authenticated members can publish a six-hour `FOOD IS HERE!` alert. Active alerts are public, appear in the top-right alert center, and arrive in other open sessions through Supabase Realtime.
- Alert creation invokes `netlify/functions/food-alert.mjs`, which validates the Supabase session and sends a best-effort Resend operations email using HAND's existing environment-variable pattern.
- Alert writes are limited to five per account per 15 minutes. Private home addresses and household details are explicitly prohibited in the interface.

### Feedback, experiments, and testing

- The sidebar feedback flow posts to HAND's shared feedback endpoint, so notes continue into Command Center, Telegram, and Resend. Failed notes queue locally and retry on focus or reconnection.
- The command CTA runs a stable two-variant test, `map_first` or `rescue_first`, stored in local storage.
- Click progress persists locally for every visitor. Authenticated interaction events batch to `command.food_engagement_events` every ten interactions.
- Admins can query `command.food_engagement_leaderboard`; invoker row-level security keeps it internal.
- Vitest covers landing links, anonymous write gates, feedback, the mobile navigation rail, and mocked database contracts. Run `npm test`.
- `.github/workflows/wxl-ci.yml` runs tests and the production build for WXL pull requests, relevant pushes to `main`, and manual dispatches.

### Mobile navigation

- Mobile uses the full viewport width and opens the labeled navigation as a drawer from the top menu button.
- The drawer closes from its close button, the shaded page area, or after choosing a destination.
- Desktop navigation can also collapse and remembers its state locally.

### Navigation and identity handoff, 2026-07-16

This pass reworked the WXL navigation and wordmark together. The goal was to make the X visibly carry the meaning of "with xtra love," give the command interface a stronger sense of place, and connect WXL to the HAND Protocol visual family without turning the product UI into a copy of the campaign site.

#### Visual source and adaptation

The sidebar now adapts elements from the mobile menu on the HAND Protocol landing page in `../web/index.html` and `../web/foundation-campaign/style.css`:

- The traced network-hand illustration is reproduced as inline SVG in WXL so it inherits local colors, scales cleanly, and does not add an asset request.
- Teal hand lines, amber nodes, a softer coral outline, and restrained radial color fields echo the HAND menu artwork.
- The small illuminated brand dot comes from the HAND navigation wordmark treatment.
- The HAND menu's layered depth and motion inform the sidebar atmosphere. WXL keeps a solid product surface because the sidebar remains visible for long working sessions.
- Motion is slow and low-amplitude. The global reduced-motion rule collapses these animations for people who request it.

The source paths are intentionally local to WXL. Future changes to the HAND landing-page SVG will not automatically change the app. If the shared hand artwork evolves, compare both implementations deliberately before syncing them.

#### X identity

The X is now the signature WXL element:

- The landing-page X uses coral, sits slightly larger than the W and L, and carries an intersection ring plus a small heart.
- The command-center sidebar starts with a circular X mark rather than a generic W tile.
- The X inside `WXL:FOOD` uses the same coral accent.
- The small landing-header wordmark also accents the X.

Keep the X treatment consistent anywhere a new WXL wordmark appears. Coral identifies the X. Amber is reserved for its smaller love or network signals. Do not return to an all-one-color `WXL` wordmark unless the context is strictly monochrome.

#### Desktop navigation behavior

- The expanded sidebar is 264px wide and groups destinations under `Coordinate` and `Plan + measure`.
- Active destinations use a complete pale-green surface and full border. There is no colored side stripe.
- Each destination has an icon container, label, and optional count.
- The collapse control sits inside the sidebar header instead of floating over the content boundary.
- Collapsed state is 76px wide, keeps destination icons accessible, exposes labels through native button titles, and remains stored in `localStorage` under `wxl:sidebar-collapsed`.
- Decorative hand artwork is hidden in collapsed state so the icon rail stays legible.

#### Mobile navigation behavior

- The old permanent 56px rail was removed. At 360px and similar widths, the application now receives the full viewport.
- The top-left menu button opens a drawer up to 300px wide, with a 40px edge allowance.
- The drawer contains the same labels, status, feedback, interaction count, and account entry as desktop.
- The drawer closes through the labeled close button, the shaded page scrim, or a destination selection.
- The sidebar toggle used for desktop collapse is hidden on mobile.
- The traced hand becomes slightly more visible in the mobile drawer, matching the source HAND menu more closely.

#### Directory breadcrumb contract

The top bar is a location breadcrumb, not a product slogan. Its desktop form is:

`Directory / WXL:FOOD / Current page`

The final segment updates from the active `View` state and currently supports:

- Overview
- Rescue operations
- Volunteer command
- Community requests
- Partner network

The labels are centralized in `viewLabels` near the top of `src/App.tsx`. Add new destinations there when extending the `View` union. On small screens, the leading `Directory /` segment is hidden to preserve room for alerts and the primary action, while `WXL:FOOD / Current page` remains visible when space allows.

#### Implementation map

| Concern | Location |
|---|---|
| Sidebar structure, dynamic breadcrumb, and view labels | `src/App.tsx` |
| Inline traced-hand component | `SidebarHand` in `src/App.tsx` |
| Sidebar, hand artwork, X treatment, and responsive drawer | `src/styles.css` |
| Mobile drawer interaction test | `src/App.test.tsx` |
| Public mobile behavior | `docs/LIVING-DOCS.md` |

#### Accessibility and interaction notes

- The decorative hand has `aria-hidden="true"`, and its SVG cannot receive focus.
- The current destination exposes `aria-current="page"`.
- Icon-only controls retain explicit accessible labels.
- The landing-page visual letters are hidden from assistive technology, while the heading itself carries `aria-label="WXL"`.
- The mobile scrim is an actual button labeled `Close navigation`, so keyboard and assistive-technology users can dismiss the drawer.
- The drawer test changes `window.innerWidth` to 390px and opens navigation through the top-bar button.
- The full WXL:FOOD sidebar title is a labeled button that returns to Overview and closes the mobile drawer.

#### Verification and follow-up

The current interface was checked at 1440 by 1000 and 390 by 844. `npm test` passes all 16 tests, and `npm run build` completes successfully.

Recommended follow-up:

1. Add Escape-key handling and return focus to the mobile menu button after the drawer closes.
2. Add a focus trap while the mobile drawer is open.
3. Replace native `title` tooltips in collapsed desktop mode with accessible styled tooltips only if the added complexity is justified.
4. Revisit breadcrumb truncation when additional views are added.
5. Keep the hand illustration decorative. It should never compete with destination labels or become a required cue for navigation.

### Database and security baseline

Migrations `024_wxl_food.sql` through `036_wxl_coordinator_gates.sql` define:

- `command.food_partners`
- `command.food_source_nominations`
- `command.food_requests`
- `command.food_request_messages`
- `command.food_request_supporters`
- `command.food_request_offers`
- `command.food_request_status_history`
- `command.food_rescues`
- `command.food_rescue_checkpoints`
- `command.food_rescue_events`
- `command.food_contributors`
- `command.food_contributor_review_events`
- `command.food_harvest_runs`
- `command.food_harvest_run_stops`
- `command.food_harvest_run_events`
- `command.food_inventory_lots`
- `command.food_inventory_allocations`
- `command.food_inventory_condition_checks`
- `command.food_inventory_ledger`
- `command.food_spots`
- `command.food_alerts`
- `command.food_engagement_events`
- indexes for status, neighborhood, request messages, and review queues
- row-level security for public reads, authenticated inserts, and administrative management
- owner-checked database functions for offer decisions, withdrawals, and request status changes
- database triggers that maintain request activity counts and status history

The browser receives only the Supabase anonymous key. Never add a service-role key to WXL.

## What is still illustrative or incomplete

This section is load-bearing. The interface currently looks more functional than the underlying product.

### Dashboard data that is hard-coded

- Map coordinates and status colors. Initial directory-listed names, addresses, and center contact details are source-backed, while South Oak Baptist remains a community report.
- Volunteer-node routes and anonymous household clusters
- Sample rescue patterns on the Overview only
- Needs signals
- Network metrics
- Weekly chart and impact values
- Harvest-run summaries
- Initial community requests used as fallback content
- Fallback request conversation messages
- Verified-source count
- Profile role and group membership
- Dates and update times

The map labels itself as illustrative, but the rest of the dashboard needs equally clear prototype or empty-state treatment until it is connected to real data.

### Controls that still produce only a notification or placeholder

- `Build a basket`
- Impact report
- Search
- Impact reports navigation
- Help link
- Profile and settings control

### Views that are placeholders

There are no remaining top-level placeholder views. Impact Reports still needs a dedicated view.

The app should not claim these boards are ready until they contain functional workflows.

### Persistence gaps

- Migration `027_wxl_request_coordination.sql` is deployed. Structured offers, owner decisions, status history, and transactional counts still require live multi-account verification.
- Migration `028_wxl_rescue_operations.sql` is deployed. Rescue submission, review, claiming, private instructions, safety checkpoints, and event history still require supervised operational verification.
- Sample fallback request messages, offers, and support remain explicitly non-persistent.
- Request owners can change status but cannot yet edit the request title, group, details, priority, or visibility from the interface.
- Migrations `029_wxl_contributor_readiness.sql` through `031_wxl_inventory.sql` are deployed. Contributor approval, private routing, and inventory custody still require supervised multi-role, concurrency, expiry, privacy, and reconciliation verification.
- Harvest-run assignment enforces capacity, lifting, vehicle, run class, equipment, and validity dates. Service-area and schedule fit require an explicit coordinator confirmation because those fields remain human-readable rather than normalized availability calendars.
- Rescue notifications, overdue escalation, access-history auditing, retention, partial acceptance, and reassignment after incident review remain incomplete.
- Auditable impact reporting has no front-end repository. Food alerts now have a focused notification repository and interface.
- Source nominations are not loaded into a coordinator review queue in WXL.
- There is no profile setup or editable account settings flow.

## Important auth and database risks to verify

1. Confirm that Supabase Email authentication is enabled, password login is allowed, and **Confirm email** is turned off.
2. Add the production and local callback URLs to the Supabase redirect allowlist:
   - `https://wxl.handprotocol.org/app/?mode=recovery`
   - `http://localhost:5173/app/?mode=recovery`
   Set the Supabase Site URL to `https://wxl.handprotocol.org`; leaving the default `http://localhost:3000` causes password-recovery links to open localhost when the callback is rejected or omitted.
3. Test immediate signup login, browser password-save behavior, login, logout, reset request, recovery, and expired recovery links on the live domain.
4. Migrations 026 through 036 are applied. Complete the remaining live multi-role, retry, concurrency, and operational verification before broad access.
5. Confirm that the `command` schema is exposed through the Supabase API.
6. Confirm the policy decision that request messages and structured offers are public when the parent request is public. The interface discloses this, but moderation and takedown controls are still required.
7. Add abuse controls before broad access: rate limits, duplicate prevention, moderation status, report and takedown paths, and safe handling of contact details.
8. Do not expose household-level location or sensitive need data on the public map.

## Recommended next work

### P0: Make the existing promise honest and reliable

1. Smoke-test the complete live authentication lifecycle.
2. Complete live multi-role, retry, concurrency, and privacy verification for migrations 026 through 036.
3. Label all hard-coded metrics and activity as sample data, or replace them with honest empty states.
4. Add normalized Contributor availability calendars, time-off, and service-area matching to supplement coordinator confirmation.
5. Remove or disable controls that do not have a real next screen or action.
6. Add clear success, failure, retry, and offline states to every database mutation.

### P1: Complete the community coordination loop

1. Add editing for request title, group, detail, priority, and public visibility under owner-checked policies.
2. Add moderation, reporting, and takedown paths for public requests, messages, and offers.
3. Add rescue notifications, overdue escalation, incident reporting, and privacy-safe access history.
4. Add a coordinator review queue for source nominations.
5. Add pagination or incremental loading for requests, messages, and offers.
6. Add private, consent-based contact handoff after an offer is accepted. Do not expose account email on the public board.

### P2: Build the operational boards

1. Complete the rescue board with approved-partner records, reassignment, partial acceptance, and retention controls.
2. Extend Volunteer Command with training sessions, agreement versions, document evidence, availability calendars, and assignment history.
3. Extend harvest runs with notifications, overdue escalation, acknowledgement, reassignment, and offline-safe stop recording.
4. Extend inventory with expiry automation, recall and quarantine workflows, stock transfer, cycle counts, and approved storage-location records.
5. Notification center based on meaningful events, not decorative alerts.
6. Impact reporting based only on completed and auditable activity.

### P3: Improve robustness and maintainability

1. Break `App.tsx` into route, auth, layout, board, form, and data components.
2. Introduce a small routing layer so auth callbacks and browser navigation are explicit.
3. Centralize authentication in an `AuthProvider` or equivalent session hook.
4. Use a server-state library or a small consistent query layer for loading, cache invalidation, retries, and optimistic updates.
5. Add schema-derived TypeScript types from Supabase.
6. Add form validation with accessible field-level messages.
7. Add unit tests for repositories and auth decisions.
8. Add integration tests for signup, login, reset, anonymous gates, request creation, replies, and source nominations.
9. Add end-to-end tests against a local or test Supabase project.
10. Add error monitoring and privacy-conscious product analytics.

### P4: Improve usability and accessibility

1. Add a persistent anonymous-state banner that explains what can be browsed and what requires an account.
2. Preserve the intended destination through login so a person returns to the action they attempted.
3. Make the profile and settings control real, including sign out.
4. Add keyboard focus trapping and Escape handling to dialogs.
5. Audit focus visibility, touch targets, labels, announcements, contrast, and reduced motion.
6. Replace ambiguous icon-only controls with labels or accessible names.
7. Add empty, loading, no-results, stale-data, and connection-loss states.
8. Test at 360px width and with keyboard-only and screen-reader navigation.
9. Add plain-language privacy guidance near requests, messages, locations, and contact fields.
10. Let community partners correct or remove their information through a documented process.

### Later: Source intelligence

Do not start the source-intelligence agent until the battle-test gate in `docs/FOOD-SOURCE-AGENT.md` is met. The first useful agent should collect evidence and create a human review queue. It should not begin as a chatbot, publish verification automatically, promise food, or dispatch people.

## Suggested next milestone

The next milestone should be one complete coordination loop:

1. A member signs up and gets a valid profile.
2. The member posts a real rescue or community need.
3. Another member finds it and submits a structured offer.
4. The coordinating group accepts the offer.
5. The activity moves through `open`, `in progress`, and `fulfilled` states.
6. Messages and status history remain attached to the record.
7. Anonymous visitors can see only the public and privacy-safe parts.
8. The completed activity contributes to impact totals through auditable database records.

The request and offer portions exist in migration 027. The reviewed rescue, claim, delivery-checkpoint, acceptance, and incident-hold portions exist in migration 028. Production deployment, live multi-account verification, Contributor eligibility, private contact handoff, notifications, retention controls, and auditable impact remain before this milestone is complete.

## Local development

```bash
npm install
npm run dev
```

Vite normally serves the app at `http://localhost:5173`.

Create a local `.env` from `.env.example` and set:

```text
VITE_SUPABASE_URL=https://<HAND project ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<HAND anon key>
```

Production build:

```bash
npm run build
```

The build and all 38 automated tests were passing on 2026-07-17 after the inventory changes.

## Deployment

- Netlify site: `wxl-food`
- Site id: `56ee91bf-bf15-472d-8c1c-d6c30af05d6c`
- Base directory: `wxl`
- Build command: `npm run build`
- Publish directory: `dist`
- Production domain: `https://wxl.handprotocol.org`
- SPA fallback: `netlify.toml` and `public/_redirects`

See `DEPLOY.md` for the concise deployment guide.

## Smoke-test checklist

Before calling the current auth and community flow production-ready, verify:

- Both landing role paths open their intended workspace.
- The food intent opens the optional location prompt.
- Allowing location selects a nearby bundled listing on localhost and the production HTTPS origin.
- Denying, timing out, or skipping location keeps the complete Austin map usable.
- Reopening the location prompt from the command-center control works.
- Anonymous food browsing opens the command center.
- Public request loading works without a session.
- Anonymous write attempts open the account prompt.
- Account creation works with a new address.
- Signup opens `/app/` with an active session and no email-confirmation step.
- The browser can offer to save new signup credentials according to its local password-manager settings.
- Email and password login reaches `/app/` with write access.
- Refreshing `/app/` restores the session.
- Password-reset email arrives.
- Recovery link opens the new-password screen.
- New password works for the next login.
- Invalid and expired links show a useful recovery path.
- New request persists and remains after refresh.
- New request message persists and loads after refresh.
- Structured offer persists and loads after refresh.
- Only the request owner or an administrator can accept or decline an offer.
- Only the offer author can withdraw a proposed offer.
- Accepting an offer moves an open request into progress and records status history.
- Reply, supporter, and offer counts match their database records after refresh.
- Source nomination persists with `nominated` status.
- Row-level security blocks anonymous inserts.
- Sign out removes write access and returns the member to public browsing.
- Mobile layout works at 360px.
- Dialog focus and screen-reader labels pass an accessibility check.

## Files changed in the latest auth and access pass

- `src/App.tsx`
  - Replaced OTP magic-link login with email and password login.
  - Added account creation.
  - Added password-reset request and recovery screens.
  - Added Supabase session tracking.
  - Fixed successful login to redirect to authenticated `/app/`.
  - Added account prompts for anonymous write attempts.
  - Gated community requests, messages, support, offers, rescues, and source nominations using session state.
- `src/styles.css`
  - Added spacing and secondary auth-action styles for password, reset, and account-switch controls.

## Account readiness pass, 2026-07-17

- Session restoration now exposes a visible loading state before write access is decided.
- The account control uses the current Supabase member identity instead of fixed profile text.
- Request creation and reply attribution use that member identity.
- The account menu provides a working sign-out action.
- `026_wxl_profile_readiness.sql` backfills missing `command.profiles` rows for older auth accounts.
- `docs/DELIVERY-READINESS.md` defines operational safety gates, required evidence, release stages, and the next product milestones.
- `npm test` passes 18 tests and `npm run build` completes successfully.

## Request coordination pass, 2026-07-17

- Persisted request messages now load from Supabase when a request is selected.
- Structured food, transportation, storage, and volunteer offers persist to `command.food_request_offers`.
- Request owners can accept or decline offers, and offer authors can withdraw proposed offers.
- Request owners can move requests through open, in progress, fulfilled, and closed states.
- Database triggers maintain reply, supporter, and offer totals and preserve immutable status history.
- Public privacy guidance now appears beside request creation, replies, and offers.
- Sample fallback activity remains labeled and cannot be mutated.
- Migration `027_wxl_request_coordination.sql` contains the schema, row-level security, database functions, triggers, grants, and backfills.
- `npm test` passes 23 tests and `npm run build` completes successfully.

## Rescue operations pass, 2026-07-17

- Replaced the rescue placeholder with a privacy-safe operational board and a complete submission form.
- Added coordinator review, explicit safety confirmation, atomic claim and release, private assigned-run details, and pickup, delivery, and acceptance checkpoints.
- Failed packaging, label, temperature-control, contamination, or temperature checks place a rescue on incident hold. Administrators can close the hold with an audited rejection or cancellation.
- Relabeled Overview rescue content as sample patterns and routed its action into the real rescue workspace.
- Migration `028_wxl_rescue_operations.sql` contains the schema, row-level security, privacy-safe and restricted functions, grants, validation, and event history.
- Migration 028 is applied to production. Contributor eligibility and a supervised operating rehearsal remain required before food moves.
- `npm test` passes 29 tests and `npm run build` completes successfully.

## Contributor readiness pass, 2026-07-17

- Replaced the Volunteer Command placeholder with private readiness application and coordinator review workflows.
- Added agreement acceptance, emergency contact, availability, service area, vehicle, capacity, lifting limit, accessibility needs, temperature-control capabilities, training dates, credential expiry, approval classes, and review notes.
- Migration `029_wxl_contributor_readiness.sql` keeps these records private, preserves review history, and replaces rescue claiming with server-side operational eligibility checks.
- Updating an approved readiness file requires another review. Expired training or credentials stop new claims automatically.
- Open rescues link directly to Volunteer Command so claim requirements are discoverable.
- Migration 029 is applied to production. Live multi-account authorization and expiry tests remain required.
- `npm test` passes 32 tests and `npm run build` completes successfully.

## Harvest run pass, 2026-07-17

- Activated Harvest Runs navigation and replaced the inactive route-board control with private dispatch operations.
- Added reviewed multi-stop plans, rescue-linked pickup and delivery stops, staging hubs, exact capability assignment, private instructions, start revalidation, ordered stop evidence, cancellation, incident holds, and completion.
- Migration `030_wxl_harvest_runs.sql` defines private run, stop, and event records plus restricted state-transition functions and row-level security.
- Assignment reserves linked rescues atomically and prevents duplicate active-run use. Linked safety checkpoints remain the source of truth for pickup and delivery handling.
- Overview route content is labeled as sample patterns and opens the real Harvest Runs workspace.
- Migration 030 is applied to production. Live database concurrency, expiry, privacy, incident, and multi-account tests remain required.
- `npm test` passes 35 tests and `npm run build` completes successfully.

## Inventory custody pass, 2026-07-17

- Activated Inventory navigation and added a coordinator-only custody workspace.
- Added accepted-rescue receiving, immutable provenance, lot-specific temperature bounds, storage checks, reservations, private handoffs, fulfillment, cancellation, holds, rechecks, disposition, and discard evidence.
- Migration `031_wxl_inventory.sql` defines lots, allocations, condition checks, and an immutable quantity ledger with restricted transactional functions and row-level security.
- Physical, reserved, and available quantities remain separate. Database row locks prevent over-allocation and every mutation records resulting balances.
- Failed storage checks hold the lot. Cancelling a reservation cannot release the hold, and hold release requires a newer passing condition check.
- Migration 031 is applied to production. Live concurrency, expiry, privacy, and reconciliation tests remain required.
- `npm test` passes 38 tests and `npm run build` completes successfully.

## Food-first onboarding and geolocation pass, 2026-07-18

Implementation commit: `d9335850c` (`feat(wxl): add food-first onboarding and location step`).

- Replaced the broad WXL splash and access modal with a focused `/W XTRA ♥` food entry.
- Made `I need food` and `I am a Contributor` the two primary choices. The first opens Overview; the second opens Volunteer Command.
- Added `intent=food`, `intent=request`, and `intent=contribute` initial-workspace routing. Intent never changes session-based write access.
- Added optional geolocation after the food choice. Permission is requested only from the explicit `Use my location` button.
- Calculates the nearest bundled verified public listing in browser memory, selects it on the schematic map, and reminds the visitor to confirm hours before traveling.
- Added a skip path, permission-denial and failure messages, a loading state, and a reusable command-center location control.
- Records the completed or skipped choice only in `sessionStorage` for the current tab. Coordinates are not stored in local storage, Supabase, account metadata, or engagement events.
- Updated `docs/LIVING-DOCS.md`, page metadata, responsive styles, and interaction coverage.
- `npm test` passes 42 tests and `npm run build` completes successfully. The existing Vite chunk-size warning remains non-blocking.

Known geolocation limitation:

- Nearest-listing comparison currently covers only bundled public-directory locations with local coordinates. Supabase community pins do not yet carry reviewed coordinates and are not candidates. Do not silently geocode private or unreviewed addresses. A future location expansion should add coordinator-reviewed coordinates to the public food-spot data model before including those records.

## Working conventions

- Read the repository root `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, and `HANDOFF.md` before strategic or visual work.
- Do not use em dashes.
- Do not use side-stripe accent borders, gradient text, decorative glassmorphism, or repeated SaaS metric templates.
- Use HAND vocabulary where relevant: Reciprocates, Reciprocate groups, and Contributors.
- Be precise about whether data is live, persisted, sample, inferred, or awaiting verification.
- Protect household privacy and never imply food availability without current confirmation.
- Keep the browser limited to the Supabase anonymous key.

## Handoff rule

Update this file whenever a workflow becomes real, a route changes, a database migration lands, or a known risk is resolved. Move completed items out of the gap sections, record the test that proved them, and keep the next milestone narrow enough to finish.
