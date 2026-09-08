# Handoff — yuhm onboarding funnel (sign in or browse, then do the task)

Date: 2026-09-08
Mission: koH asked to cut yuhm's onboarding from "choose a path → find out more → log in → redo the action" to the fastest path: sign in immediately or browse as a guest, then do the task.

## STATUS: DONE, COMMITTED, DEPLOYED

- Commit `6e1b31b8a` on `agent/yuhm-network`, pushed to origin (branch in sync). `main` untouched — yuhm deploys from the CLI, not from main.
- Live at https://yuhm.handprotocol.org (Netlify deploy `6aa0756141ee9a9995e19c1c`). Verified on the live host: new hero/login copy in the served JS, the 16px touch-field rule in the served CSS, the Supabase project ref in the bundle, CSP + HSTS headers, wxl → yuhm 301.
- Tests 108 → 126 (`VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vitest run`), `tsc --noEmit` clean, `npm run build` clean.
- Full technical write-up: the "Onboarding funnel pass, 2026-09-08" section at the top of `HANDOFF.md`. Do not redo it.

## What shipped (one line each)

- Landing hero = two doors above the fold: **Find food near me** (guest, `/app/?mode=anonymous&intent=food`) and **Sign in** (`/app/?mode=login`). Path cards stay as optional deep links; "Enter the living map" left the hero (world still at bare `/app/` + the banner).
- One sign-in step: `src/AuthForm.tsx` (`EmailContinueForm`) = email + password + Continue. `continueWithEmail` (`src/lib/auth.ts`) signs in, else creates the account with the same credentials; `user_already_exists` → "already has a yuhm account". No log-in/sign-up toggle. Email+password stays (passwordless removed earlier as a product decision — see HANDOFF "Product decisions made").
- `return=` carries a full `/app/...` path (`resolveReturnPath`); legacy intent names still map; foreign URLs fall back to `/app/?intent=food`. `mode=reset` opens the reset screen directly.
- `SimpleExperience`: members skip the interstitial sheet (straight to the destination); guests get the Continue form inline in the sheet and land on the destination.
- World intro: one screen (role chips + inline first-invitation preview + Step in / Skip). Privacy and reveal steps removed with their strings.
- Phone fixes (Brave/iOS): auth inputs are uncontrolled (`FormData` at submit, `readField`) so password-manager autofill enables Continue; global rule at the end of `styles.css` keeps every text field/select/textarea at 16px under `(pointer: coarse), (max-width: 759px)` so iOS does not zoom on focus and carry the zoom into the next screen.

## NOT yet verified (first thing next session, or koH on the phone)

1. Live Supabase behaviour of the one-button auth: sign in with a saved account, then create a brand-new account through the same Continue button. The logic assumes `invalid_credentials` for an unknown email and `user_already_exists` on a duplicate signup, with **Confirm email OFF**. Only exercised against a mocked client so far.
2. On a phone: autofilled fields → Continue tappable; Sign in → Browse as a guest → map at normal size (the zoom bug).

## Open follow-ups (koH may want next; none started)

- Make the geolocation consent dialog at `intent=food` non-blocking (show the Austin map, offer "Near me" as a button) — it is the last modal between "Find food near me" and the map.
- Pass `return=` from the dashboard `AuthPrompt` (`src/prompts.tsx`), MapLab account link, and the world "More ways" Sign in link (`signInHref` helper exists in `src/lib/auth.ts`).
- World: location control on the map if wanted (removed from the intro; `onDone(role, null)` for now).
- HANDOFF.md "Current stack" still says "Successful login redirects to `/app/`" and lists `signup=1` as "Account creation" — both are now nuances of the one-step form; tidy when next editing that section.

## Ground rules / gotchas

- Another Claude session shares this checkout (unrelated modified files at repo root, `command/`, `clients/`, `threehandshealing/`, untracked `yuhm/tsetup.7.1.3.tar.xz` 78 MB). Stage by explicit path only. Never commit the tarball.
- Tests: a populated `.env.local` flips `foodDbConfigured` and breaks App.test gates — always run with `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vitest run`. The build, however, NEEDS `.env.local` (Supabase config is baked at build time; verify `grep -o vconmgerblqbworcqkvr dist/assets/index-*.js` before any deploy).
- Deploy = manual CLI with the **cryptokoh** Netlify token (CLI login is zantrra): `NETLIFY_AUTH_TOKEN=$(python3 -c "import json; cfg=json.load(open('$HOME/.config/netlify/config.json')); print([u['auth']['token'] for uid,u in cfg['users'].items() if uid.startswith('65ff678f')][0])") netlify deploy --prod --site 56ee91bf-bf15-472d-8c1c-d6c30af05d6c --dir dist --message "..."`. Headers/redirects ship from `public/_headers` + `public/_redirects`.
- Git push: SSH fails; push over HTTPS as cryptokoh and CLEAR the global gh helper first or it hands git the zantrra account (403): `git -c credential.helper= -c credential.helper='!f() { echo username=cryptokoh; echo password=$(gh auth token -u cryptokoh); }; f' push https://github.com/HandProtocol/handprotocol.git HEAD:agent/yuhm-network`.
- Visual QA: gstack `/browse` daemon is broken here; drive Playwright from `/home/koh/.claude/skills/gstack/node_modules/playwright/index.mjs` with `chromiumSandbox: false, args: ['--no-sandbox']`, Bash with `dangerouslyDisableSandbox: true`, serving `dist` via `npx vite preview --port 4173`. Use `devices['iPhone 13']` to get `pointer: coarse`.
- Vocabulary: Reciprocates / Contributors. Never name specific AI models in public copy. No ultracode / Workflow runs (koH, 2026-09-04).

## Suggested next-session start

Read this file, then `HANDOFF.md` top section. If koH reports the phone test passed, pick one follow-up above (the geolocation dialog is the highest-leverage funnel item left). If the live auth misbehaves, start in `src/lib/auth.ts` `continueWithEmail` and check the Supabase project's auth settings (Confirm email must be OFF; see HANDOFF "Important auth and database risks to verify").

---

## Same-day follow-up: one theme from landing to task (koH's desktop review)

koH: "it shows a different style theme before you actually login ... confusing with the flow of signing in as you have to go all the way down. lets make sure to streamline our design." Done in the same session; details in `HANDOFF.md` "One theme from landing to task, 2026-09-08".

- `src/YuhmBrand.tsx` shared lockup; brand-theme override block at the end of `src/styles.css`; world topbar account control in `src/world/WorldExperience.tsx` + `world.css`.
- Sign in is now at the top of the world, the finder, and the dashboard prompt/sidebar, always with `return=` back to the same screen. Members get Sign out in the finder menu and the world menu.
- Tests 130 (was 126). Build clean. Screens checked at 1440×900, 1280×640, 430×932, 390×844.
- The coordinator dashboard keeps its tool theme on purpose; the phone MapLab shell was not re-skinned (candidate for a later pass if koH wants the phone map on-theme too).
