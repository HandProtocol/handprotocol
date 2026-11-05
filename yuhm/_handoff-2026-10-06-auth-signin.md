# yuhm handoff: sign-in fix, Resend auth email, calmer sign-in design (2026-10-06)

Status: **done and live.** Commit `47edb4ab6` on `agent/yuhm-network`, pushed, deployed to https://yuhm.handprotocol.org. Three small follow-ups wait on koH (bottom of this file).

## What koH reported

Login and signup were failing on yuhm: "We could not finish creating your account. Please try again or contact yuhm." The night before it said "email rate limit exceeded". koH asked whether to switch to magic links.

## Cause

Not the app code. Two settings on the shared HAND Supabase project (`vconmgerblqbworcqkvr`):

1. **Confirm email was on** (`mailer_autoconfirm = false`). yuhm's one-step Continue (`src/lib/auth.ts`, `continueWithEmail`) assumes it is off: it signs up, expects a session, and otherwise signs in with the same password. With confirmation on, the account was created unconfirmed and the sign-in was refused with `email_not_confirmed`, which `getAuthErrorMessage` shows as "We could not finish creating your account".
2. **No custom SMTP.** Supabase's built-in mailer allows 2 auth emails per hour for the whole project (their docs: "2 emails per hour with the built-in email provider", "not meant for production use"). Every failed signup sent a confirmation email, so two attempts used the hour.

Nobody knows when Confirm email was turned on. The last account created without a confirmation email is from 2026-05-22; the first with one is 2026-07-23.

## What was changed on Supabase (live, no migration)

All through the management API (`PATCH /v1/projects/<ref>/config/auth`; access method in the memory note `hand-supabase-mgmt-api-access`).

| Setting | Before | Now |
|---|---|---|
| `mailer_autoconfirm` | false | **true** (dashboard: Confirm email OFF) |
| `smtp_host` / `smtp_port` / `smtp_user` | none | `smtp.resend.com` / `465` / `resend` |
| `smtp_pass` | none | send-only Resend key named **`supabase-auth-smtp`**, limited to `handprotocol.org` |
| `smtp_admin_email` / `smtp_sender_name` | none | `hand@handprotocol.org` / `Yuhm Network` (koH's choice, set later the same day) |
| `rate_limit_email_sent` | 2 per hour | 30 per hour (adjustable now) |

Also: two stuck unconfirmed accounts were confirmed by hand (`update auth.users set email_confirmed_at = now()`), so the passwords those people typed now work. One account with a mistyped `gmai.com` address was left unconfirmed.

Command Center shares these auth users. Its `handle_new_user()` trigger starts every signup as `pending`, so turning confirmation off grants nobody access there. Its auth emails now carry the sender name `Yuhm Network` and the yuhm-branded templates below.

## Branded auth emails (same day, after koH received the first reset email)

koH asked for the sender to read "Yuhm Network" and for a proper email with a footer "from yuhm network by HAND". Five templates were restyled and applied to Supabase: password reset, confirm email, sign-in link, email change, invite. Each has the yuhm wordmark, one heading, one sentence, one green button, a one-line Spanish version, a "didn't ask for this?" line, and the footer "yuhm network by HAND" with links. Sources live in `docs/auth-email/` (`<name>.html`, `subjects.json`); they are applied by hand, see `DEPLOY.md`. Only the reset email is sent today. The notification and verification-code templates are still Supabase's stock ones and are not in use. A test reset email was accepted through the new template; how it renders in Gmail and Apple Mail was not checked by me.

## Sign-in design pass (commit `47edb4ab6`)

koH: the login "feels a little overwhelming". Both sign-in surfaces were cut down.

- **Sign-in page** (`src/LoginScreen.tsx`): one-line heading ("Welcome to yuhm." / "Qué bueno verte."), one line of copy, no eyebrow on the main screen. "Browse as a guest" and "Just want email updates?" are two quiet links on one row (`.login-alt`, `.login-alt-link`); the outlined guest button now shows only on the reset and updates screens.
- **Guest sheet** (`src/SimpleExperience.tsx`): the second explanatory paragraph is gone; one small note sits under the password field.
- **Shared form** (`src/AuthForm.tsx`, `EmailContinueForm`): two new optional props. `passwordAside` renders beside the Password label (forgot-password goes there); `note` renders one quiet line under the password field. The password input is now linked to its label by `useId`, not nested in it. Label text is unchanged, so `getByLabelText('Email address' | 'Password')` still works.
- **Strings** (`src/i18n.tsx`, EN + ES): `login.title`, `login.continueCopy`, `login.signupCopy`, `login.updatesSwitch`, `simple.sheet.authCopy` shortened. `login.enterNetwork` is no longer used.
- **Styles**: one block at the end of the login section of `src/styles.css`, headed "Calmer sign-in".
- **Docs**: `DEPLOY.md` now records the Resend SMTP setup and the failure it prevents.

## Verification

- Signup and login against the live project by API: session returned both times.
- Three password-reset emails in a row through Supabase to a Resend test inbox: all accepted (the old cap stopped at two).
- `tsc --noEmit` clean. 130 of 130 tests pass on a clean export of the commit.
- Deployed from that clean export (CLI deploy, cryptokoh token, per `DEPLOY.md`). Live bundle carries the new heading and the Supabase ref; security headers present; `wxl` host still redirects.
- On the live site at phone width, a throwaway `@handprotocol.org` account was created through the real form: no error, session stored, landed on `/app/?intent=food`. All test accounts were deleted.
- Not checked: a reset email arriving in a real inbox (delivery and spam placement).

## Things that will trip you up

- **Seven tests in `src/App.test.tsx` fail when `yuhm/.env.local` exists.** They assert the "needs the yuhm database" gates, which only show when no database is configured. Move `.env.local` aside to run the suite, and put it back before building: a build without it ships a bundle with no database connection.
- **`netlify deploy` now runs the build itself** in the folder it is called from, so `.env.local` must be present there.
- **Deploy from a clean export, not this checkout.** The working tree holds unfinished pickup-runs work (`src/App.tsx`, `src/runs/`). `git archive <commit> yuhm | tar -x -C <scratch>` plus a copy of `.env.local` worked.
- **Do not start a dev server and stop it with `pkill -f` from the same shell line pattern**: the pattern matches the calling shell too.
- **When reading Netlify env vars, select the one key by exact name.** A filter on `RESEND`/`EMAIL` printed two other secrets into a session transcript (see follow-ups).

## Decisions made with koH

- Email and password stays. Magic links were considered and set aside; with Resend in place they are now possible if koH asks again.
- Auth email goes through Resend. Self-hosting mail on the VPS was discussed and not pursued (deliverability and upkeep).

## Waiting on koH

1. **Rotate two Resend secrets** that were printed into a local session transcript on 2026-10-06: `RESEND_FULL_ACCESS_API_KEY` and `RESEND_WEBHOOK_SECRET` (both live in the `handprotocol` Netlify site's env vars). Rotate in Resend, then update Netlify.
2. **Try one real "Forgot password?"** on the live site with a personal inbox, to confirm the email arrives and is not in spam.
3. **Command Center auth emails** now arrive as "Yuhm Network" with yuhm branding, because the project has one sender and one template set. Fine while Command Center sends none; revisit if it starts to.

Not started, only noted: the stray `gmai.com` account could be deleted; `login.enterNetwork` could be removed from the string catalog.
