# WXL:FOOD Handoff

Last updated: 2026-07-16

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
| Database migrations | `../command/supabase/migrations/024_wxl_food.sql`, `025_wxl_community_map_alerts.sql` |
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

Routing is currently implemented with `window.location.pathname` and query parameters inside `App.tsx`. There is no router library.

## What works now

### Landing and access

- The landing page presents WXL and opens an access choice.
- People can choose login or anonymous browsing.
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
- Anonymous visitors who try to create or reply receive the account prompt.

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
- Rescue opportunities
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

Migration `024_wxl_food.sql` defines:

- `command.food_partners`
- `command.food_source_nominations`
- `command.food_requests`
- `command.food_request_messages`
- `command.food_request_supporters`
- `command.food_spots`
- `command.food_alerts`
- `command.food_engagement_events`
- indexes for status, neighborhood, request messages, and review queues
- row-level security for public reads, authenticated inserts, and administrative management

The browser receives only the Supabase anonymous key. Never add a service-role key to WXL.

## What is still illustrative or incomplete

This section is load-bearing. The interface currently looks more functional than the underlying product.

### Dashboard data that is hard-coded

- Map coordinates and status colors. Initial directory-listed names, addresses, and center contact details are source-backed, while South Oak Baptist remains a community report.
- Volunteer-node routes and anonymous household clusters
- Rescue opportunities
- Needs signals
- Network metrics
- Weekly chart and impact values
- Harvest-run summaries
- Initial community requests used as fallback content
- Request conversation messages
- Verified-source count
- Profile name, avatar, and role
- Dates and update times

The map labels itself as illustrative, but the rest of the dashboard needs equally clear prototype or empty-state treatment until it is connected to real data.

### Controls that still produce only a notification or placeholder

- `Post a rescue`, after authentication
- `Build a basket`
- Harvest-run board
- Rescue cards and coordination queue
- Impact report
- Support request, after authentication
- Offer food or help, after authentication
- Request actions button
- Search
- Alert center
- Harvest runs navigation
- Inventory navigation
- Impact reports navigation
- Help link
- Profile and settings control

### Views that are placeholders

- Rescue opportunities view
- Volunteer command view

The app should not claim these boards are ready until they contain functional workflows.

### Persistence gaps

- Request messages are inserted but not loaded from the database.
- The response count is incremented only in local React state. It is not updated transactionally in the database.
- Supporting a persisted request inserts into `food_request_supporters`; sample fallback requests remain explicitly non-persistent.
- Offering food or help has no data model or persisted workflow.
- Rescue opportunities have no dedicated repository functions or confirmed data model.
- Harvest runs, inventory, and impact reporting have no front-end repositories. Food alerts now have a focused notification repository and interface.
- Source nominations are not loaded into a coordinator review queue in WXL.
- Request status transitions are administrative in the migration but have no WXL interface.
- There is no sign-out action.
- There is no profile setup or account settings flow.

## Important auth and database risks to verify

1. Confirm that Supabase Email authentication is enabled, password login is allowed, and **Confirm email** is turned off.
2. Add the production and local callback URLs to the Supabase redirect allowlist:
   - `https://wxl.handprotocol.org/app/?mode=recovery`
   - `http://localhost:5173/app/?mode=recovery`
   Set the Supabase Site URL to `https://wxl.handprotocol.org`; leaving the default `http://localhost:3000` causes password-recovery links to open localhost when the callback is rejected or omitted.
3. Test immediate signup login, browser password-save behavior, login, logout, reset request, recovery, and expired recovery links on the live domain.
4. Confirm that every new auth account receives a matching `command.profiles` row. The food tables reference `command.profiles(id)`, while inserts use `auth.user.id`. Without a profile-creation trigger, valid authenticated inserts can fail with a foreign-key error.
5. Confirm that the `command` schema is exposed through the Supabase API.
6. Review whether public request messages should be readable by anyone. The current policy allows public reading when the parent request is public.
7. Add abuse controls before broad access: rate limits, duplicate prevention, moderation status, report and takedown paths, and safe handling of contact details.
8. Do not expose household-level location or sensitive need data on the public map.

## Recommended next work

### P0: Make the existing promise honest and reliable

1. Smoke-test the complete live authentication lifecycle.
2. Add sign out, current-member identity, and a loading state while the Supabase session is being restored.
3. Verify or add automatic `command.profiles` creation for new accounts.
4. Replace fixed profile text such as `Koh's network` and `You` with the authenticated profile.
5. Label all hard-coded metrics and activity as sample data, or replace them with honest empty states.
6. Turn `Post a rescue` into a real form and persisted workflow. Decide first whether a rescue is a category of request or a separate entity with source, quantity, pickup window, storage needs, food-safety notes, and status.
7. Remove or disable controls that do not have a real next screen or action.
8. Add clear success, failure, retry, and offline states to every database mutation.

### P1: Complete the community coordination loop

1. Load request messages for the selected request.
2. Add real request support through `food_request_supporters`.
3. Add an offer model that captures what is offered, quantity, availability, transport, and contact preference.
4. Add request ownership and allow the coordinating group to edit, close, fulfill, or reopen its own requests under reviewed policies.
5. Add rescue claiming and release so two groups do not act on the same food without knowing.
6. Add a coordinator review queue for source nominations.
7. Replace local counters with database-derived or transactionally maintained counts.
8. Add pagination or incremental loading for requests and messages.

### P2: Build the operational boards

1. Rescue board with source, food type, quantity, pickup deadline, location precision, storage constraints, and claim status.
2. Volunteer board with skills, availability, vehicle capacity, accessibility needs, and assignment state.
3. Harvest-run planning with stops, time windows, driver, capacity, route status, and completion notes.
4. Inventory records with freshness, quantity, unit, storage condition, source, and expiration.
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

This milestone is more valuable than adding more dashboard sections because it proves the core coordination model end to end.

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

The build was passing on 2026-07-16 after the auth and anonymous-access changes.

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

- Landing access modal opens and closes with mouse and keyboard.
- Anonymous browse opens the command center.
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
- New request message persists and can be loaded after refresh once message loading is implemented.
- Source nomination persists with `nominated` status.
- Row-level security blocks anonymous inserts.
- Sign out removes write access once sign out is implemented.
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
