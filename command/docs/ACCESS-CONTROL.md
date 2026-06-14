# Command Center — Access Control, Invites & Applications

The design spec for who can do what in the HAND Command Center, how people get
in, and how access is handed off. Source of truth for the role model; the code
that enforces it lives in `supabase/migrations/022_pillar_roles.sql` (DB/RLS) and
`src/lib/supabase/profile.ts` (app guards).

## Identity

Supabase Auth (`auth.users`) is the identity layer. `command.profiles` extends
each auth user with a **role**, an access **status**, and an optional
`reciprocate_group` scope. A profile is created automatically on first
sign-up (the `handle_new_user` trigger) at `role = viewer, status = pending`.

## Roles (pillar model)

| Role | Grants / Funders | Develop / Biz | Feedback / Pins | Users + Invites | Settings |
|------|------------------|---------------|-----------------|-----------------|----------|
| **admin** | manage | manage | manage | manage | manage |
| **funding_lead** | manage | read | read + triage | — | — |
| **develop_rep** | read | manage | read | — | — |
| **contributor** | read + comment | read + comment | read + comment | — | — |
| **viewer** | read (scoped) | read (scoped) | — | — | — |

`reciprocate_group` scopes a viewer (and group-scoped reads) to a single
community (e.g. `mystic-hearts`); `NULL` = unscoped.

## Status (the access gate)

| status | meaning |
|--------|---------|
| `active` | normal access at the row's role |
| `pending` | signed up but not approved/invited — **no access anywhere** |
| `suspended` | access revoked, account retained |

`command.current_role()` returns the role **only when `status = 'active'`**,
otherwise `'pending'` (which matches no grant policy). That single gate makes
every existing RLS policy deny pending/suspended users without per-policy
changes. `can()` in `profile.ts` mirrors it for the app layer.

## Capabilities

The app gates on a capability vocabulary (`profile.ts`), not raw role checks, so
nav, page guards, and server actions stay consistent:

`users.manage`, `settings.manage`, `grants.manage|read`, `funders.manage|read`,
`boilerplate.manage`, `develop.manage|read`, `feedback.triage|read`, `comment`.

`admin` holds `*`. Use `requireCapability(cap)` / `requireRole(...)` at the top
of every **server action** — service-role writes bypass RLS, so this is the real
write gate. RLS is defense-in-depth for the logged-in read path.

## Hand-off model

```
                    ┌─────────────── admin reviews ───────────────┐
   Apply form  →  access_applications (pending) ──approve──► issue invite ─┐
   (public)        │  reject                                                │
                   ▼                                                        ▼
                 Telegram ping to team                         invite link / email
                                                                            │
   Direct invite (admin in /settings) ─────────────────────────────────────┤
                                                                            ▼
                                              redeemer signs up ──► profile
                                              role = invite.role, status = active
```

- **Invites pre-assign** `role` (+ optional `reciprocate_group`) and expiry. The
  redeemer lands `active` at that role. One-time use (`used_at`/`used_by`).
- **Promote / demote / suspend** = an admin-only `UPDATE` on `command.profiles`
  (`role` and/or `status`). `users.manage` capability.
- **Revoke** = set `status = 'suspended'` (keeps history) or delete the profile.
- Un-invited sign-ups sit at `pending` and see only a "request pending" state.

## Invite flow (link + optional email)

1. Admin (`/settings` → Invites) creates an invite: role, optional group,
   optional email, expiry (default 14d). A random `code` is generated.
2. The system returns a **link** (`/auth/invite/<code>`) to copy/send, and — if
   "email the invitee" is checked and email is configured — sends it via the
   shared Resend helper.
3. Redeem: the invite page captures the code, the user signs in/up via Supabase
   Auth, and a redemption step sets `profiles.role = invite.role`,
   `status = 'active'`, `reciprocate_group = invite.reciprocate_group`, and marks
   the invite `used_at/used_by`. Expired or used codes are refused.

## Apply flow ("Apply for Command Center")

1. Public form on the command landing page: name, email, organization,
   desired role, message. Honeypot + service-role insert into
   `command.access_applications` (status `pending`). Telegram ping to the team;
   optional Resend ack later.
2. Admin reviews in `/settings`. **Approve** → issue an invite at the chosen
   role (overridable), stamp `invite_code` back on the application, send the
   invite. **Reject** → mark rejected.
3. Applicant redeems the invite → becomes an active user. No profile exists
   until redemption.

## Email channel

Telegram-first; email flips on when the Resend sending domain verifies. Shared
helper `netlify/functions/_email.js` (env-gated, no-op without
`RESEND_API_KEY` + `EMAIL_FROM`). Used by feedback notifications, invite emails,
and apply acks. Env: `RESEND_API_KEY`, `EMAIL_FROM` (`team@handprotocol.org`),
`EMAIL_TO_OPS`. DNS/domain-verification status tracked in `resend-dns-setup.md`.

## Known gaps / follow-ups

- **`profile.ts` PK fix** (done in 019 era): queried `user_id`; the PK is `id`.
- **`develop_rep` "manage own"** is not yet enforceable — `biz_leads` has no uuid
  owner (`hand_lead` is free text). Reps currently share the full pipeline. Add
  `biz_leads.owner_id → profiles.id` to scope per-rep.
- **Server-action guards**: wire `requireCapability()` into existing grants /
  develop / boilerplate actions (they predate the capability layer).
- **`inbox_items`** RLS needs a `funding_lead` policy (deferred from 019).
- **First admin** is promoted manually in SQL (`update command.profiles set
  role='admin', status='active' where email='cshearer210@gmail.com'`).
- **Schema application**: live Supabase must have migrations ≥014 applied for
  any of this to exist; confirm before relying on it (main carries 3, the dev
  branch carries 20).
