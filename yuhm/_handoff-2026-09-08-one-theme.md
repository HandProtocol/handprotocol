# Handoff — yuhm: one theme from landing to task, Sign in at the top of every surface

Date: 2026-09-08 (same day as, and directly after, the onboarding funnel pass in `_handoff-2026-09-08-onboarding-funnel.md`)
Branch: `agent/yuhm-network` · Worktree: `handprotocol/yuhm`

Mission, in koH's words: "look at our current ux with desktop, its kind of confusing as it shows a different style theme before you actually login, the theme before is okay but its kind of confusing with the flow of signing in as you have to go all the way down. lets make sure to streamline our design."

## STATUS: DONE, COMMITTED, PUSHED, DEPLOYED

| Item | State |
|---|---|
| Commit | `d6ed1dccf` on `agent/yuhm-network` (19 files, +350 / -41). `main` untouched; yuhm deploys from the CLI, never from `main`. |
| Push | Pushed over HTTPS as cryptokoh to `HEAD:agent/yuhm-network`; `git ls-remote` confirms the remote head is `d6ed1dccf`. Note: pushing to the explicit URL does not update the local `origin/agent/yuhm-network` tracking ref, so `git status -sb` may still say "ahead". Trust `git ls-remote https://github.com/HandProtocol/handprotocol.git agent/yuhm-network`. |
| Deploy | Netlify production deploy `6aa0879864ea332f04fdb3f2` on site `56ee91bf-bf15-472d-8c1c-d6c30af05d6c`, live at https://yuhm.handprotocol.org. |
| Live check | Served CSS contains `.yuhm-lockup`; served JS contains the one-door prompt copy and `mode=login&return=`; Supabase project ref `vconmgerblqbworcqkvr` is baked in. Live screenshots of `/app/?mode=login` (1440×900) and `/app/?mode=anonymous&intent=food` (1366×768) match the local build. |
| Tests | 130 passing across 16 files (was 126). Run with `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vitest run`. |
| Checks | `npx tsc --noEmit` clean · `npm run build` clean (the 985 kB main-chunk advisory is pre-existing and non-blocking) · `git diff --check` clean. |

## The problem, as observed on desktop before the pass

Headless-Chromium screenshots at 1440×900 and 1366×768 confirmed koH's report exactly:

| Surface | Before | After |
|---|---|---|
| Landing `/` | Warm yuhm brand theme (oat ground, cacao ink, Baloo 2, coral scribble). Two hero doors: Find food near me / Sign in. **Fine, unchanged.** | Unchanged apart from the shared lockup component. |
| Living world `/app/` (default app, also where the landing banner goes) | Warm theme, so it matched the landing. But the topbar had only Pulse and "Your presence" (a sample-world profile). The only **Sign in** link was in "More ways to take part" at the bottom of the docked panel, measured at ~2110px from the top of the panel's scroll. | Green **Sign in** pill in the topbar for guests; initials pill with a small menu (Find food · Command center · Sign out) for members. Bottom link kept, now also return-aware. |
| Sign in `/app/?mode=login` | Different theme entirely: sage `#eef3ec` page, Space Grotesk headline, DM Mono "yuhm /THE OM IN YUM ♥" wordmark, 11–12px labels and buttons. Felt like leaving the product. | Same brand theme as the landing: oat ground with the landing's radial glow, the shared bowl+wordmark lockup, Baloo 2 title, 15px inputs, green Continue with the hero-CTA offset shadow, outlined "Browse as a guest". Fits a 640px-tall viewport. |
| Food finder `/app/?mode=anonymous&intent=food` (where "Find food near me" and a successful sign-in land) | White/sage product theme, Space Grotesk, a black "WX" avatar (WXL-era initials) that opened a settings menu with no visible sign-in. Location dialog on top in the sage theme. | Oat/cacao theme, shared lockup, green **Sign in** pill for guests (return-aware), member initials menu with Sign out. Filters, cards, tabs, action heroes, forms, sheet, and the location dialog re-skinned. |
| Guest sign-in sheet (Contribute → Set up Contributor profile, etc.) | White card, Space Grotesk. | Oat card, Baloo heading, same green Continue as the sign-in page. |
| Coordinator dashboard `/app/?mode=advanced` | Dark-green sidebar tool theme. | **Deliberately unchanged** (tool surface). Guest sidebar card now shows a user icon instead of "WX" and links to sign-in with a return path. |
| Phone food map (MapLab command-bar shell, ≤759px at `intent=food`) | White shell, own look. | **Not re-skinned.** Only its account link now carries a return path. |

## What changed, file by file

### New
- `src/YuhmBrand.tsx` — the one brand lockup: `BowlMark` + rounded "yuhm" wordmark + tagline (default "regenerative food network · Austin"), `aria-label="yuhm home"`, links to `/`. Class `yuhm-lockup` plus any `className` passed in. Used by the landing nav (with `className="landing-brand"` so the landing's scoped rules still win there), the sign-in card, and the finder header.

### Components
- `src/LandingPage.tsx` — nav brand replaced by `<YuhmBrand className="landing-brand" />`. No visual change on the landing.
- `src/LoginScreen.tsx` — `.login-wordmark` replaced by `<YuhmBrand />`. No logic change.
- `src/SimpleExperience.tsx` —
  - `herePath` = current `path` + `?params` from `useRoute()`; every header sign-in link is `signInHref(herePath)` so the person returns to the same screen.
  - Header: `<YuhmBrand />`; guests (`authReady && !member`) get `<AppLink className="simple-signin">Sign in</AppLink>`; members get the initials button + menu (display name, "Signed in as {email}", Send feedback, Turn on advanced workspace, **Sign out**). The guest account menu and the "WX" fallback are gone; guests reach the advanced workspace from the footer link, as before.
  - `signOut()` calls `foodDb?.auth.signOut()`; `AuthProvider`'s `onAuthStateChange` clears `member`.
- `src/world/WorldExperience.tsx` — `useAuth()` added. Topbar: guest `Sign in` pill → `signInHref('/app/?mode=world')`; member pill (`world-avatar` initials + display name) toggles `#world-account-menu` (Find food → `/app/?mode=anonymous&intent=food`, Command center → `/app/?mode=advanced`, Sign out → `foodDb?.auth.signOut()`).
- `src/world/panels.tsx` — the "More ways" Sign in link is now `signInHref('/app/?mode=world')`.
- `src/world/worldStrings.ts` — new keys (EN + ES): `world.topbar.signIn`, `world.topbar.account`, `world.topbar.signedIn` (`{name}`), `world.topbar.finder`, `world.topbar.commandCenter`, `world.topbar.signOut`.
- `src/prompts.tsx` — `AuthPrompt` reads `useRoute()` and builds `herePath`; actions are now one door "Sign in or create an account" (`signInHref(herePath)`) plus "Email me yuhm updates". The separate "Log in" and "Create an account" links were removed because the one-step form already does both. Copy explains it brings you back here.
- `src/DashboardApp.tsx` — guest sidebar card ("Browsing openly · Sign in to coordinate") links to `signInHref(window.location.pathname + window.location.search)`; avatar is a `CircleUserRound` icon instead of "WX".
- `src/map-lab/MapLab.tsx` — the account link (`map-lab-account`) uses `signInHref(...)` with the current location.

### Logic and strings
- `src/lib/auth.ts` — `getMemberIdentity` initials fallback `'WX'` → `'Y'` (practically unreachable; display name always falls back to "yuhm member"). `signInHref` and `resolveReturnPath` unchanged and now used everywhere.
- `src/i18n.tsx` — `common.signOut` (EN "Sign out" / ES "Cerrar sesión"); `login.continueCopy` shortened to two lines (EN "Your email and a password. New here? That creates your account. Already a member? It signs you in." / ES equivalent).

### Styles
- `src/styles.css` lines 1579–1708, block titled **"One yuhm from landing to task (2026-09-08)"**. Override-only, appended at the end so equal-specificity rules win; layout rules earlier in the file are untouched. Sub-sections:
  - `.yuhm-lockup` base rules (unscoped; the landing's `.food-entry-page .landing-brand …` rules are more specific and keep the landing as it was).
  - Sign in: `.login-page` (oat + radial glow), `.login-card` (450px, 26px radius, `#e8dcc0` border), `.login-card h1` Baloo 31px, 15px inputs with `#52734d` focus ring, `.login-submit` / `.login-anonymous` as hero-CTA twins (green filled / green outlined, offset shadows), `.login-switch`, error/success chips. Reduced-motion guard.
  - Finder shell: `.simple-app` token redefinition (`--simple-ink #3b2a22`, `--simple-muted #7d6b57`, `--simple-green #2d6b50`, `--simple-green-dark #1f4a37`, `--simple-warm #fff3dc`, new `--simple-line #ecdfc4`, `--simple-paper #fffdf6`; background `#fbf6ea`), translucent oat sticky header, `.simple-signin` pill, member `.simple-account` + menu + `.simple-signout`, tabs, eyebrows, Baloo on every heading selector that used Space Grotesk, search, filters, finder frame borders, result cards, action heroes (`.contribute-hero`, `.gather-hero`, `.request-hero`), action switch, form cards, `.simple-primary`, footer.
  - Guest sheet: `.simple-sheet*` and `.sheet-auth*`.
  - Location dialog, scoped as `.simple-app .access-card …` so the dashboard's own `AuthPrompt` (same `.access-card` class) keeps the tool theme.
  - `@media (max-width: 480px)`: hide the lockup tagline in the finder header and the sign-in card; tighter `.simple-signin`.
- `src/world/world.css` lines 491–519: `.world-signin`, `.world-account`, `.world-avatar`, `.world-account-menu`; phone rules keep the Sign in label and member initials visible while the other topbar pills stay icon-only (`.world-top-button span { display: none }` from the existing ≤759px block), tighten topbar gaps, and hide `.world-brand-copy` under 480px so four controls fit on one line (the circle name repeats as the panel heading directly below).

### Tests
- `src/AuthFunnel.test.tsx` — `resetHarness()` extracted (also clears the `signOut` mock); new `describe('sign in is one tap from the top of every pre-login surface')` with four tests: world topbar + panel links carry `return=%2Fapp%2F%3Fmode%3Dworld`; finder header pill carries the current path; a member sees the account menu (initial "N" for neighbor@…) and Sign out calls `auth.signOut` once; the dashboard prompt's single door carries `return=…mode%3Dadvanced%26workspace%3Dcommunity` and there is no separate "Create an account" link.
- `src/App.test.tsx` — "keeps advanced coordination behind an explicit display setting" now asserts the guest header shows Sign in and no account menu, and reaches the advanced workspace via the footer "Advanced workspace" link (still sets `yuhm:experience-mode`). "links anonymous visitors from the profile card to sign in" expects `/app/?mode=login&return=%2Fapp%2F%3Fmode%3Dadvanced`.

### Docs
- `HANDOFF.md` — new top section "One theme from landing to task, 2026-09-08" (links here); `Last updated` bumped; routes table rows for `mode=login` and `signup=1` rewritten; the "Successful login redirects to `/app/`" product decision corrected to the `return=` behaviour.
- `DESIGN.md` — brand-vs-product paragraph updated; Baloo 2 added to Typography as the brand display face.
- `_handoff-2026-09-08-onboarding-funnel.md` — short "same-day follow-up" stub pointing here.

## Design decisions to keep consistent

- **Two themes, one rule.** Brand theme for every surface a member or guest meets on the way to a task: landing, world, sign-in, finder, sheets, dialogs inside the finder. Product/tool theme only for the coordinator dashboard (`mode=advanced` / `workspace=`). New public or member-facing surfaces should use the brand tokens below.
- **Brand tokens** (mirror `.world-app` custom properties in `world.css` and the landing v2 block): oat ground `#fbf6ea`, paper `#fffdf6`, warm `#fff3dc`, line `#e8dcc0` / `#ecdfc4`, cacao heading `#46312a`, ink `#3b2a22`, muted `#7d6b57`, eyebrow `#8a6d3b`, garden green `#52734d` (chips/selected), action green `#2d6b50` with `#1f4a37` offset shadow (`box-shadow: 0 4px 0 #1f4a37`), coral error `#a63c1e` on `#fbe6df`. Display: Baloo 2 700–800, near-zero tracking. Body: DM Sans. Eyebrows: DM Mono uppercase. Radii 16–26px.
- **Sign in is a first-class control in the top bar of every pre-login surface**, always built with `signInHref(<current in-app path>)` so the person returns exactly where they were. Build the path from `useRoute()` where available (`SimpleExperience`, `AuthPrompt`), or `window.location` where the component already uses it (`DashboardApp`, `MapLab`). `resolveReturnPath` only accepts `/app/...`, so foreign URLs fall back to the finder.
- **Guests never see an account menu**, only Sign in. Members see initials + menu; Sign out lives in that menu (finder and world). The dashboard already had its own sign-out.
- **One door.** With the one-step `EmailContinueForm`, never present separate "Log in" and "Create an account" choices again (`AuthPrompt` was the last place).
- **Email + password stays** (product decision; no magic links). `signup=1` only changes autocomplete and the button label.

## Verification performed

- Headless Chromium (Playwright from `/home/koh/.claude/skills/gstack/node_modules/playwright/index.mjs`, `chromiumSandbox: false`, `--no-sandbox`, Bash with `dangerouslyDisableSandbox`) against `npx vite preview --port 4173` serving `dist`:
  - 1440×900: landing, sign-in, world after intro (topbar and panel bottom), finder with location dialog dismissed, Contribute tab, guest sheet (I can deliver → Set up Contributor profile), dashboard.
  - 1366×768 and 1280×640: landing above the fold, sign-in card (scrollHeight 651 at 640px tall; "Browse as a guest" visible).
  - 430×932 and 390×844: world topbar on one line with Sign in labelled; sign-in card; phone finder (MapLab shell, unchanged).
- Live host after deploy: served asset names, CSS/JS content checks, and two live screenshots (see Status).
- Test suite, tsc, build, `git diff --check`.

Screenshot scripts used this session live only in the session scratchpad (not in the repo). To reproduce: build, run `npx vite preview --port 4173 --strictPort`, then a small Playwright script with `chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox'] })`, `newContext({ viewport })`, `page.goto(url, { waitUntil: 'networkidle' })`, `page.screenshot(...)`. For the world after the intro, click the "Skip to the map" button or seed `localStorage['yuhm:world-intro'] = '{"role":"eat"}'`. For the finder without the location dialog, seed `sessionStorage['yuhm:location-choice'] = 'complete'`.

## NOT verified (be honest about these first)

1. **Member-state visuals were only exercised in jsdom tests, not screenshotted.** The finder header initials button + menu (with Sign out) and the world topbar initials pill + menu render correctly in tests, but nobody has looked at them in a browser with a real session. First thing after koH signs in on the live site: check both menus at desktop and phone widths.
2. **Live Supabase auth is still unexercised** (carried from the funnel handoff): sign in with a saved account, then create a brand-new account through the same Continue button. The logic assumes `invalid_credentials` for an unknown email and `user_already_exists` on a duplicate signup, with **Confirm email OFF** in the Supabase project.
3. Dashboard guest sidebar card (icon avatar) sits below the fold at 1440×900 and was not screenshotted; the `.avatar` class is `display: grid; place-items: center`, so the icon should centre.
4. New Spanish strings (`world.topbar.*`, `common.signOut`, shortened `login.continueCopy`) were written by me, not reviewed by a Spanish speaker.
5. Reset / recovery / updates screens on the sign-in card share the restyled `.login-card` rules but were not screenshotted this pass.

## Open follow-ups (koH may want next; none started)

1. **Phone food map on-theme.** `MapLab` (`src/map-lab/`, own CSS chunk) is the shell phones get at `intent=food`. It still has its white look; re-skin it with the brand tokens if koH wants the phone path to match desktop.
2. **Geolocation dialog non-blocking.** `intent=food` still opens the location consent modal before the map (now on-theme). Highest-leverage funnel item left: show the Austin map immediately and offer "Near me" as a button.
3. **Vestigial `yuhm:experience-mode` writes** (`enableAdvancedMode` in `SimpleExperience`, flags in MapLab/DashboardApp) can be retired; routing no longer reads them (see HANDOFF "Living-map world experience").
4. **World member menu destinations** are a judgement call (Find food, Command center, Sign out). If a member-shaped default for the world emerges, revisit.
5. Optional cleanup: the old sage `.login-*`, `.simple-*` base rules earlier in `styles.css` are now overridden rather than replaced. Folding the override block into the base rules would shrink the CSS but is a larger, riskier diff; only do it with screenshots at the same five viewports.

## Ground rules / gotchas

- **Shared checkout.** Another Claude session mutates the same repo (root docs, `command/`, `clients/`, `threehandshealing/`, untracked 78 MB `yuhm/tsetup.7.1.3.tar.xz`). Stage by explicit path only. Never commit the tarball.
- **Tests vs build env.** A populated `.env.local` flips `foodDbConfigured` and breaks App.test gates → always `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vitest run`. The build NEEDS `.env.local` (config is baked at build time) → `grep -o vconmgerblqbworcqkvr dist/assets/index-*.js` before any deploy.
- **Deploy** (manual CLI, cryptokoh token; CLI login is zantrra):
  ```
  NETLIFY_AUTH_TOKEN=$(python3 -c "import json; cfg=json.load(open('$HOME/.config/netlify/config.json')); print([u['auth']['token'] for uid,u in cfg['users'].items() if uid.startswith('65ff678f')][0])") netlify deploy --prod --site 56ee91bf-bf15-472d-8c1c-d6c30af05d6c --dir dist --message "..."
  ```
  Headers/redirects ship from `public/_headers` + `public/_redirects`.
- **Push** (SSH fails; clear the global gh helper or it hands git the zantrra account and 403s):
  ```
  git -c credential.helper= -c credential.helper='!f() { echo username=cryptokoh; echo password=$(gh auth token -u cryptokoh); }; f' push https://github.com/HandProtocol/handprotocol.git HEAD:agent/yuhm-network
  ```
  This leaves `origin/agent/yuhm-network` stale locally; verify with `git ls-remote` rather than `git status -sb`.
- **CSS override pattern.** The codebase evolves themes by appending override blocks (landing v2, this pass). Equal-specificity rules win by order, so keep new overrides at the end of the file and match the selector shape of the rule you are overriding. Scope shared dialog classes (`.access-card`) under the surface (`.simple-app …`) so the dashboard is not dragged along.
- **World topbar on phones.** The existing `.world-top-button span { display: none }` rule under 759px hides every pill label; any new topbar control needs an explicit exception if its label must stay visible (see `.world-signin` rules).
- **Visual QA.** gstack `/browse` daemon is broken on this machine; drive Playwright directly as described above. Use `devices['iPhone 13']` when you need `pointer: coarse`.
- **Vocabulary and voice.** Reciprocates / Contributors. Never name specific AI models in public copy. No ultracode / Workflow runs (koH, 2026-09-04).

## Suggested next-session start

Read this file, then `HANDOFF.md` top two sections. Then:
1. If koH has signed in on the live site: screenshot the finder header and world topbar in the member state (desktop + 390px), fix anything off, and mark item 1 under "NOT verified" as done.
2. If live auth misbehaves: start in `src/lib/auth.ts` `continueWithEmail` and check the Supabase project's auth settings (Confirm email must be OFF).
3. Otherwise pick one follow-up: the phone MapLab re-skin (design continuity) or the non-blocking geolocation dialog (funnel), and do it as its own bounded pass with the same five-viewport screenshot check.
