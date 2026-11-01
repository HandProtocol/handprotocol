# Mystic Hearts site: handoff

*2026-11-01 (evening). Read this, then `CLAUDE.md` (Current state), before touching the site.*

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
  domain. Replies go to the tenant's public email, hand@handprotocol.org for now. The bounce
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
    `koordi tenant page --tenant mystichearts --email hello@mysticheartshealing.com`.
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
  `NEXT_PUBLIC_SITE_URL` (default https://mhh.handprotocol.org). The poster image is the
  share image.
- **New static files.** `public/robots.txt` (allow all) and `public/_headers` (a week of
  caching for `/assets`, immutable caching for `/_next/static`).

## Still open (unchanged by the move)

- **Owner sign-in.** The owner signs in at https://koordi.handprotocol.org/console with
  hand@handprotocol.org and sets the visit hours. They are weekdays 09:00 to 17:00 until
  changed.
- **Not built yet:** the newsletter (record 0040 C1 and C2), gathering calendar invites (M3)
  and the subscribable calendar (M5). Full scope:
  `../koordi/docs/plans/2026-11-01-mystic-hearts-mail.md`.
- **Commits.** On the hand side, nothing from 2026-11-01 is committed: `.env.production`,
  `CLAUDE.md`, `app/layout.tsx`, `components/contact-modal.tsx`, `public/_headers`,
  `public/robots.txt`, `scripts/publish-mhh.sh` and this file. The koordi side is committed and
  pushed (`82eea6c`, `d841390`).
