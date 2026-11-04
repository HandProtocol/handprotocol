# Mystic Hearts site: handoff

*2026-11-04. Read this, then `CLAUDE.md` (Current state), before touching the site.*

**State in one line:** the site works on https://mysticheartshealing.com, booking is at
https://book.mysticheartshealing.com/, the collective's admin is at
https://admin.mysticheartshealing.com, mail is live, and the next piece of work is the funnel in
`FUNNEL.md` (design only, nothing built). Deadline koH set: the whole system working by 2026-11-11.

## The addresses (2026-11-04, koordi record 0083)

- **Booking:** https://book.mysticheartshealing.com/ is the hosted page at the root, with
  `/privacy`, `/terms` and `/assistant` beside it. Old links (`/book/mystichearts`, and
  koordi.handprotocol.org/book/mystichearts) forward there with a 301. Its logo goes back to
  https://mysticheartshealing.com (`--home`).
- **Admin:** https://admin.mysticheartshealing.com opens the console (its root and `/admin` go to
  `/console`). It serves only the console and nothing of the customers' side.
  book.mysticheartshealing.com/admin forwards to it. The nav is the short booking set
  (`--pages booking`): Requests, Messages, Gatherings, Hours, Add a booking, Team, Notifications.
  - Infra: A record `admin` → 15.204.242.96 in the Netlify zone, nginx site
    `/etc/nginx/sites-available/koordi-admin-mystichearts` (pattern in koordi
    `deploy/nginx-koordi-admin-mystichearts.conf`), its own Let's Encrypt certificate.
- **Team:** the owner is **mysticheartshealing@gmail.com** (request emails on). Owners and admins
  add people on the Team page by name and email, turn request emails on or off, and remove
  anyone but the owner. Five seats; when full the page shows "Ask for more seats", which mails
  handprotocol@gmail.com (once a day). Raise it on the box:
  `docker exec koordi node src/cli.mjs tenant page --tenant mystichearts --seats 7`.
  - **handprotocol@gmail.com** is on the team as "HAND support": it can sign in, it takes no
    seat, and its request emails are off (record 0004).
  - hand@handprotocol.org (the placeholder owner) was removed.
- **Say hello** now posts to koordi's `POST /v1/notes` with the publishable key. The note lands in
  the admin under Messages and is mailed to everyone on the team with request emails on (Reply-To
  is the sender). If koordi refuses or is unreachable the form falls back to HAND's feedback
  function as before.
- The page's contact email is mysticheartshealing@gmail.com (it was koH's personal address).
- `public/_headers` sets nosniff, SAMEORIGIN framing and a strict referrer policy on every path.
- Published 2026-11-04. koordi side: `80088a2` and `40fe0ae` on koordi main, deployed; HQ 53 pass.
- **Not sent on purpose:** no real note or visit request was sent, so the collective's inbox got
  nothing from the checks. Send one of each yourself to see the mail arrive.

## Where it lives now

- **Live at https://mysticheartshealing.com** since 2026-11-01. `www` and plain http redirect to
  it, and https://mhh.handprotocol.org serves the same site as an alias.
- **Hosting:** its own Netlify project, `mysticheartshealing` (account cryptokoh, site id
  `42024948-6847-476f-9878-ef1dd6601261`). It is not part of the handprotocol.org site and does
  not deploy from git.
- **DNS** is Netlify DNS: zone `6ae7a47204d00ea8f7726dbe`, nameservers `dns1-4.p05.nsone.net`,
  switched at Namecheap by koH. Let's Encrypt covers the apex and `*.mysticheartshealing.com`.
- **Publish:** `./scripts/publish-mhh.sh "what changed"`. It builds at the root path with
  `.env.production` and the site address https://mysticheartshealing.com. It refuses an export
  that points at a local koordi, copies `out/` outside the repo and runs
  `netlify deploy --prod --no-build --site <id>` from there.
  - Never deploy from inside the repo. There the CLI reads the hand repo's `netlify.toml`,
    rebuilds handprotocol.org and bundles HAND's functions into this site.
  - Use the cryptokoh token. The CLI's active user on this machine is a client's account.
- The gated demo at handprotocol.org/mystichearts/demo still exists (`./scripts/publish-demo.sh`)
  and can retire.

## Mail (live since 2026-11-01 evening)

- **Resend:** mysticheartshealing.com is verified in **HAND's** Resend account, with click and
  open tracking off. Its records are in the Netlify zone: `resend._domainkey`, `send` (MX and SPF),
  `rsend` (CNAME) and `_dmarc` (p=none).
- **koordi is in production mode.** It sends every booking and sign-in mail from
  `"Mystic Hearts Healing Collective" <hello@mysticheartshealing.com>`, through a send-only key restricted to this
  domain. Replies go to the tenant's public email, mysticheartshealing@gmail.com since 2026-11-04. The bounce
  webhook is live. The first real mail, an owner sign-in link, was delivered.
- **Gatherings:** the What's on board is live, since migration 0035 was applied in the same deploy.
- **Inbox:** the collective's inbox will be Google Workspace. Until it exists, the domain's MX
  records still point at Namecheap's forwarding, which probably stopped working at the nameserver
  switch. Nothing reaches hello@mysticheartshealing.com yet.
  - When Workspace is set up, replace the five `eforward` MX records with Google's
    (`smtp.google.com`, priority 1).
  - Add Workspace's verification TXT record.
  - Change the SPF record to `v=spf1 include:_spf.google.com ~all`. Resend's SPF lives on `send.`
    and is unaffected.
  - Then point koordi at the new inbox:
    `koordi tenant page --tenant mystichearts --email hello@mysticheartshealing.com`
    (the public email, used as Reply-To; today it is mysticheartshealing@gmail.com).
- **Mystic Hearts' own Resend account** (koH's plan) needs koordi to learn a per-tenant sender and
  key first. Today koordi has one sender for every business. When it lands:
  - move the domain to the new account (DKIM changes);
  - swap the key on the box.
- **Display name:** mail shows the tenant's name, renamed on 2026-11-01 (koH) to "Mystic Hearts
  Healing Collective". koordi has no rename command, so it was a one-row update of `koordi.tenants`.

## What changed for the move

- **koordi key.** A new publishable key for the `mystichearts` tenant (label "mhh +
  mysticheartshealing.com").
  - It accepts https://mhh.handprotocol.org, https://mysticheartshealing.com,
    https://www.mysticheartshealing.com, https://handprotocol.org and
    https://mystichearts.handprotocol.org.
  - It is in `.env.production` (public by design). On the box it is `MH_PK2` in
    `/opt/koordi/mh-keys.env` (root only).
  - The first key (`MH_PK`) still works for the handprotocol.org origins. Revoke it once
    nothing uses it.
  - Checked live: koordi answers this key from the mhh origin and refuses it from any
    other origin.
- **Say hello** now posts to `NEXT_PUBLIC_HELLO_URL`, which is HAND's feedback function at
  handprotocol.org. Its CORS is open, so the form works from any domain. In dev the variable
  is unset and the form falls back to a mailto.
- **Page details.** `metadataBase`, the canonical link and Open Graph tags come from
  `NEXT_PUBLIC_SITE_URL` (default https://mysticheartshealing.com). The poster image is the
  share image.
- **New static files.** `public/robots.txt` (allow all) and `public/_headers` (a week of
  caching for `/assets`, immutable caching for `/_next/static`).

## Still open (unchanged by the move)

- **Owner sign-in.** The owner signs in at https://admin.mysticheartshealing.com with
  mysticheartshealing@gmail.com and sets the visit hours. They are weekdays 09:00 to 17:00 until
  changed.
- **Not built yet:** the newsletter (record 0040 C1 and C2), gathering calendar invites (M3)
  and the subscribable calendar (M5). Full scope:
  `../koordi/docs/plans/2026-11-01-mystic-hearts-mail.md`.
- **Commits.**
  - `4758d4661` (the move to its own domain) is pushed on `agent/yuhm-network`.
  - `afe3e1ca8` (the What's on breathing calendar, by another session) is committed and already
    published to the live site, but **not pushed**: the branch is one ahead of origin.
  - koordi side: `82eea6c` and `d841390` are pushed on koordi main. koordi's own `HANDOFF.md` has an
    uncommitted "PRODUCTION MODE IS ON" paragraph mixed in with another session's edits.
  - Untracked on purpose: the three source clips, the four jpegs, and `design/`.
- **Known red test in koordi:** `tests/console.test.mjs` "a customer's change request is accepted
  or declined by a button" fails since the calendar reached November (date-dependent, not caused
  by this work).

## Next: the funnel

koH (2026-11-01): any of the four chapters should lead people to the calendar, then suggest coming
out to the land and signing up, in as few steps as possible. The design flow is in `FUNNEL.md`
(and as a page koH can open). Revised the same night after koH's note: one book of five pages
that closes in a circle, slips for the actions, chapter cards at every finish, and a leaf page
turn (working sketch in the artifact), and a refined calendar (six changes, mostly koordi options).
Nothing is built; eight decisions wait on koH there.
