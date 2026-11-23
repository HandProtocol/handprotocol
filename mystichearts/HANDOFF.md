# Mystic Hearts site: handoff

*2026-11-04. Read this, then `CLAUDE.md` (Current state), before touching the site.*

**State in one line:** the site works on https://mysticheartshealing.com, booking is at
https://book.mysticheartshealing.com/, the collective's admin is at
https://admin.mysticheartshealing.com, mail is live, and the next piece of work is the complete
booking and the funnel: plan `../kohsi/docs/plans/2026-11-05-mystic-hearts-complete-booking.md`
(2026-11-05, slices A to F, nothing built), design in `FUNNEL.md` revision 5. Deadline koH set:
the whole system working by 2026-11-11.

## 2026-11-17: almanac reading + page turns (LIVE, published 2026-11-17, deploy 6afcb028, uncommitted)

- Words no longer slip past the frame: the leaves sit in a window inside the inner rule
  (`.al-leaves { inset: var(--f2) }`); the paper caps are gone.
- Scroll cues: the words fade where a page goes on, a "Read on" catchword sits at the foot while
  there is more, and a gilt bead between the two rules shows how far down you are. Native
  scrollbars are hidden. `useScrollCues` in `components/sheet.tsx` marks `data-cue-*` on the leaf.
- One book: `components/almanac-sheet.tsx` replaces the two sheets (StorySheet + ContactModal). The
  order is I to IV, then the calendar, then Say hello (folios i to xii). `ChapterLeaf` and `DoorLeaf`
  are the leaf contents only.
- Page turns: on a wide screen the right page lifts over the spine and the next left page lands,
  and back mirrors it. On a phone the page swings away from its left edge. Ways to turn:
  - the curled bottom corners;
  - "Turn the page" at the foot;
  - a sideways swipe on a phone;
  - the arrow keys (not while typing or inside a Kohsi widget).

  With reduced motion it is a fade. The leaving leaf is kept by `usePresence` (no remount).
- Ink reveal (B3's, ported; `components/almanac/ink.ts`, CSS "Laying a leaf down in ink").
  Each leaf lays itself down as it opens or lands after a turn:
  - running heads and kickers are stamped;
  - the headline is written left to right;
  - the wheel, the compass and the seasons are drawn stroke by stroke;
  - the illuminated M is gilded with one sheen;
  - the words ink in.

  Parts below the fold ink in as they are scrolled to. It only adds classes, a delay and
  `pathLength` (no React text is touched) and is safe under React's double effects. Reduced
  motion shows everything at once.
- Not checked: the calendar's raised day card against a running Kohsi. The leaf only takes a
  layer during a turn, so the card should still rise over the frame.

## 2026-11-17: the admin wears Mystic Hearts (LIVE)

koH: "our admin backend is horrendous ... we want mystic hearts to be themed and stylized close to
the website." Kohsi `7634822`, deployed 2026-11-17: on a business's own admin address the console
wears its theme through `kohsi/src/web/console-theme.mjs` (plum night, double gold frame like the
almanac leaves, Cormorant headings under a "Mystic Hearts Healing Collective" running head, nav as
one framed band with the current page lit raspberry, gold buttons, narrow sign-in leaf). Booking-
only consoles no longer show the mechanic's Job card (car, VIN, parts) on a booking. Three Hands
Healing's admin got the same treatment in its own teal theme. The colours come from the tenant
theme (`kohsi tenant theme`), so a theme change shows on both booking and admin. Still mechanic
wording: the Requests list says "That day: 1 job".

## 2026-11-17: NEXT SESSION = healers offering board (starter notes, nothing built)

**Changed later the same day (koH):** no public board. The board is the collective's own, inside
the console at admin.mysticheartshealing.com: slices B1, B2 and B6 of the plan. B3, B4 and B5
(the public leaf, `/v1/board`, the counting) are dropped, so nothing below about a public leaf,
sitemap or structured data applies now. **Maria (maria@3handshealing.com) is on the team as
admin** since 2026-11-17, with request emails on.

**Plan written 2026-11-17:** `../kohsi/docs/plans/2026-11-17-collective-offerings-board.md`. It
covers invites by email, member onboarding and self-editing, the board leaf "V. The healers",
Insights and GA4, the monthly admin check, the member "is your card right?" mail and the link
watch. Slices B0 to B6, nothing built, six open questions with defaults.

koH: the next session builds **an offering board of the healers on the land, and partners**.
Facts to start from:

- **Three Hands Healing is a DBA of Mystic Hearts Healing Collective** (koH, 2026-11-17). Maria is
  the first healer card. Her practice:
  - site https://3handshealing.com
  - booking https://book.3handshealing.com (Kohsi tenant `threehandshealing`), one link per session
    with `?service=<key>`
  - 11 sessions with words in EN/ES, in `kohsi/deploy/tenants/threehandshealing.json`
  - state in `clients/3handshealing/HANDOFF.md`
- **The card links back to 3handshealing.com.** Mystic Hearts gets `Organization` structured data
  naming Three Hands Healing as a sub-organization, plus a sitemap and an llms.txt (the site has none
  of the three today). See `clients/3handshealing/SEO-PLAN.md` Phase 4.
- **The model already sketched in `BRIEF.md`:** a public practitioner directory filterable by modality
  (1.0), the Practitioner role (1.2), and Admin invites (1.3). The board is likely v1 of that
  directory, with no accounts yet.
- **Existing copy to fit:** "a diverse community of healers", the Healing House ("Private sessions,
  bodywork, and small group offerings"), and "Gatherings and offerings" in `components/copy.ts`.
  Booking for the collective is book.mysticheartshealing.com (its own Kohsi tenant).
- **Rules:**
  - Lead with the land and gatherings, never platform-speak (`/mystichearts` skill).
  - Never "massage".
  - Name only healers and partners koH or Maria confirm. Mesquitos is never named.
  - Publishing goes through `scripts/publish-mhh.sh`.
- **Open for koH at the start:**
  - which healers and partners are in, and what each card shows (photo, modalities, one line, link,
    book button);
  - who edits the board: a file, the /todo-style sign-in, or Kohsi;
  - whether partners sit on the same board or in their own row.

## 2026-11-15: the sheet is now the almanac (B3, nav style 1), LIVE

- koH asked for the popup in the almanac style, "number one" = nav style 1 of
  `design/sheet-styles/b3-almanac-nav.html` (ribbon bookmarks + a foot band of doors), with the
  calendar and the booking funnel in the same style. Published 2026-11-15.
- Every sheet (the four chapters and the three doors) is a framed leaf of paper: two pages on a
  wide screen, one scrolling page on a phone (each part's `order` sets the phone sequence). Our
  vision is the purple vellum leaf. Below the leaf: the four chapters as ribbons (the open one in
  raspberry) and the doors Calendar / Visit the land / Say hello (Visit is the stamped door; the
  open door gets a gold foot rule). Close sits on the leaf's top-right corner.
- Code: `components/sheet.tsx` (Sheet + Leaf), `components/site-nav.tsx` (ribbons and doors),
  `components/almanac/ornaments.tsx` (the drawn symbols, ids `al-*`), `components/almanac/almanac.css`
  (all of it scoped to `.al-veil`; the old `.modal` rules in globals.css are now unused).
  `app/layout.tsx` loads Alegreya Sans SC as `--font-sc`.
- The Kohsi calendar and booking sit on paper through the `--kohsi-*` tokens in almanac.css; the
  calendar's raised day is a paper card (`DAY_OVERLAY_CSS` in `components/kohsi-calendar.tsx`),
  absolute over the calendar itself (`.kc`), never fixed to the book: the recto's scroll-cue mask clips every descendant, fixed ones too, and hid the card's left half (fixed 2026-11-22).
- Left out on purpose: B3's site-plan plate on The land (a public plan of the property could
  locate it; the address is only given with a visit). The land's left page shows the compass rose
  instead. Add the plate only if koH says the plan may be public. Also not ported: the 3D page
  turn and the ink-laying reveal (leaves fade in).
- Tested in Playwright at 1440x900 and 390x844 against the real Kohsi (the build served under
  the live origin), then on the live site: every chapter, calendar (35 days), a day card, the
  visit funnel's first step, Say hello. No console errors, no sideways scroll. No booking or
  note was submitted.

## 2026-11-15: team to-do list at /todo

- https://mysticheartshealing.com/todo/ is a private team list (noindex, robots-disallowed). Sign in by
  an emailed one-time link (20 min); session cookie 30 days. Who may sign in = env `MH_TODO_PEOPLE` on
  the mysticheartshealing Netlify project (`Maria:maria@3handshealing.com,koH:cryptokoh@gmail.com`);
  to add someone, add `Name:email` there and republish. Removing someone signs them out.
- Backend: `netlify/functions/todo.mjs` (zero dependencies, `/api/todo/*`), now shipped by
  `publish-mhh.sh` (`--functions`). Data: HAND Supabase, `command.mh_todo_tasks` +
  `command.mh_todo_login_tokens`, migration `command/supabase/migrations/063_mh_todo.sql` (applied,
  recorded as 063; 062 was already taken by claude_hours_usage). Page: `app/todo/page.tsx`,
  `components/todo/`.
- Sign-in mail comes from `Mystic Hearts Team List <hello@mysticheartshealing.com>`. The site's
  `RESEND_API_KEY` is the same mysticheartshealing.com key Kohsi sends with (`RESEND_API_KEY` in
  `/opt/kohsi/.env` on kohlabs-ovh). If that key is rotated, update both.
- Seeded with 25 starter tasks in five areas: outreach from the list, social media cleanup, social
  outreach, newsletter, organization.

## 2026-11-10: Fairy Ball page, waiver, calendar popup

- `/fairy-ball/`: the event page for The 1111 Immaculate Fairy Ball (Nov 11). Ticket button goes to
  Partiful (`NEXT_PUBLIC_FAIRY_BALL_PARTIFUL_URL` in `.env.production`); poster at
  `public/assets/images/fairy-ball-poster.jpg` (a drawn card stands in until it exists). Gatherings
  named in `components/events.ts` open their page from the calendar and Happening soon.
- `/waiver/`: frames the collective's GoHighLevel waiver (`NEXT_PUBLIC_WAIVER_EMBED_URL`). koH chose
  the embed for now (2026-11-10). The Kohsi-backed waiver is parked: texts in `waivers/forms.mjs`
  (six documents, Texas express-negligence and conspicuousness rules, not lawyer-reviewed), the
  site flow in `components/waiver/waiver-page.tsx`, the API on Kohsi branch `feat/waivers`
  (`b5a8a90`, migration 0061, which clashes with the Arva session's unpushed 0061 to 0068).
- Calendar: `components/kohsi-calendar.tsx` adds a stylesheet to Kohsi's element: compact month,
  and a chosen day rises as a padded card over the whole sheet. Belongs in Kohsi as an option.
- Production Kohsi has no Fairy Ball listed yet (needs the real start and end time).

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
  - **handprotocol@gmail.com** and **cryptokoh@gmail.com** are on the team as "HAND support":
    they can sign in, take no seat, and their request emails are off (record 0004). A platform
    admin is not let into a business's console by that alone: sign-in links go only to team
    members, so each HAND address must be on the team (added 2026-11-04 by a one-off script).
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
- The handprotocol.org copies (`/mystichearts/demo/`, `/mystichearts/wireframe/`) were retired on
  2026-11-06 and now 301 to mysticheartshealing.com; `scripts/publish-demo.sh` is gone.

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
  `../kohsi/docs/plans/2026-11-01-mystic-hearts-mail.md`.
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

## Next: the complete booking and the funnel (2026-11-05)

**RESUME HERE.** Read `../kohsi/docs/plans/2026-11-05-mystic-hearts-complete-booking.md`: slice A
(the tenant profile with services `visit`, `host`, `stay` and their questions) first, then B to E in
Akosi with reviewers, then S1 here (`components/book.tsx` replaces `story-sheet.tsx` and
`contact-modal.tsx`), then F. The two inventories behind it are in `../kohsi/docs/reports/`
(`2026-11-05-booking-inventory-akosi.md`, `-engine.md`). The shared Akosi slices (mail that prepares, one-tap owner, request card, the nudge ladder) are sequenced in `../kohsi/docs/plans/2026-11-05-booking-experience-spec.md`. Earlier design notes follow.


koH (2026-11-01): any of the four chapters should lead people to the calendar, then suggest coming
out to the land and signing up, in as few steps as possible. The design flow is in `FUNNEL.md`
(and as a page koH can open). Revised the same night after koH's note: one book of five pages
that closes in a circle, slips for the actions, chapter cards at every finish, and a leaf page
turn (working sketch in the artifact), and a refined calendar (six changes, mostly koordi options).
Nothing is built; eight decisions wait on koH there.

## Checkpoint 2026-11-23 (forms + booking session)
- LIVE from this working tree (uncommitted on main, snapshot on branch `wip/mystichearts-live-2026-11-23`): almanac sheet, Say hello honest limit/refusal messages + HAND fallback only when Kohsi is unreachable (`contact-modal.tsx`), `data-email` on Kohsi elements, calendar day card absolute (not fixed). Kohsi side: notes cap 20/person/day (eb1793b), limit notices name the email (260bc5e), change/cancel in place (2d0f70d), all deployed.
- 3handshealing.com: Book opens the booking in an in-page sheet, asks before leaving a booking under way; LIVE, branch `feat/thh-booking-sheet` (59fad80a7), not merged (conflicts expected with the uncommitted threehandshealing→3handshealing rename).
- Waiting on koH: decline test visit request bkg_01M82G9HYHZDMV5RX0VNFX1EP0 (Nov 30)?; merge both branches when the rename lands.
