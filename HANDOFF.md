# HAND Protocol Handoff

**For the person picking this up cold (or for future-self after time away).**
*Last updated: 2026-10-23 · Pre-incorporation*

---

## Orient in one paragraph

HAND Protocol Foundation is preparing to file as a 501(c)(3) in Austin, Texas, to operate a long-term, relational accompaniment model for impact entrepreneurs, community-rooted small businesses, and grassroots organizations. The repository contains the public website, the governance package, the AI workstream proposal, and the working documents that explain the work in plain English. The site is live at [handprotocol.org](https://handprotocol.org), auto-deployed from `main` to Netlify. The filing raise is open with a $222,222 first goal. Alongside the foundation work, HAND runs a Develop practice (owner-editable websites for small businesses and practitioners, each on the owner's own domain), community tools (yuhm for food, WaterDrop for paddling, a driver sign-up for SolarPunk Summit), and koordi, the booking and coordination service those tools are moving onto.

## What just shipped (recent past, in order)

1. **Governance package and `/governance/` route.** Articles, Bylaws, 8 policies (including the data-sovereignty-and-AI policy), compliance calendar, board prospect brief, grants kit. See `governance/` for sources and `web/governance/` for the public page.
2. **Sovereign Reciprocates, the AI workstream.** Custom open-source agent systems built per Reciprocate or Reciprocate group, owned by the group. Eight sovereignty principles, a six-dimension evaluation framework, and a draft McGovern LOI. Public page at `/sovereign-reciprocates/`. Source docs: `AI-RECIPROCATES.md`, `AI-EVAL-FRAMEWORK.md`, `funding/mcgovern-letter.md`.
3. **Angel-number tier ladder.** Foundation tiers $22,777 / $77,444 / $222,222 (heritage 777 thread). Sovereign Reciprocates tiers $11,113 / $99,777 / $333,223 (anchored angels with asymmetric tails). Contributor pledge ladder $222 → $7,777+. Single source of truth: see "Active funding ladder" below.
4. **Audience and origin reframing.** The audience is impact entrepreneurs, community-rooted small businesses, and grassroots organizations. Origin narrative is regenerative impact and durable local enterprise. AI is positioned as one tool inside the larger mission, not the centerpiece.
5. **Brand voice sweep.** Zero em dashes across the project. See `AGENTS.md`.
6. **Custom domain live on Netlify.** [handprotocol.org](https://handprotocol.org), auto-deploy on `main`. Resend mailing list integration in production. See `DEPLOY.md` for infrastructure.
7. **WXL:FOOD (now yuhm) simple and advanced modes.** The public WXL experience defaults to four clean paths: Find food, Contribute, Gather, and Requests. Coordinator dashboards are now an explicit Advanced workspace setting with a clear return to simple mode. See `wxl/docs/LIVING-DOCS.md`.
8. **WXL (now yuhm) shared dialog motion.** Centered dialogs now use a shared 250 ms entry and exit treatment, delayed React unmounting, and a 150 ms opacity-only reduced-motion path. The implementation and tests shipped in commit `5fa66ebfb`. See `wxl/HANDOFF.md` for the focused desktop-app continuation.
9. **PrecisionFix client site (Develop pillar), 2026-09-15.** A factory-certified Mercedes-Benz mobile mechanic in Austin, rebuilt on the owner-editable client engine (`clients/_template` + the `hand-client-site` skill). Five owner-switchable themes, English and Spanish on every line, a Netlify booking form that emails him through Resend, and a phone-first Setup checklist inside `/admin/` (he has Claude Code on his phone and no computer). LIVE at https://precisionfix-austin.netlify.app, code mirrored to the private repo `HandProtocol/precisionfix-site` and git-linked, though pushes do not deploy yet (Free plan cannot build private org repos; see open items). The engine gained `select` fields, the Setup tab, form emails, runtime theme override, and `/sitemap.xml`; Legacy Care and Three Hands Healing were synced. Nothing committed in this repo. Read `clients/precisionfix/HANDOFF.md` first.
10. **Setup tab rework + client-skill Phase 3b + booking-calendar plan, 2026-09-16.** The owner editor's Setup tab is now buttons, not prose: every step jumps to the right field, section, tab, or page; items tick themselves where the site can tell; ticks save on the spot (new `PATCH /api/admin/content`); the first item is a Looks picker that previews the real site in each theme inside the editor and publishes the pick in one tap. The template ships a universal `site/checklist.mjs`, the scaffold takes `--domain= --old-site= --code-access`, and the skill documents it as Phase 3b. Synced and redeployed on PrecisionFix, Legacy Care, Three Hands Healing. Calendar for mechanics on the go and healers is planned, not built: `.claude/skills/hand-client-site/reference/booking-calendar-plan.md`. Later that day: the Setup tab's test-booking button was fixed (site actions now open the live site, not `/admin/#hash`; PrecisionFix redeployed, standalone commit `0ae6429`), Cal.com self-hosting was researched and rejected, and koH decided the calendar's shape (see open items). Nothing committed in this repo.
11. **Courtney site (Develop pillar, project `unfuckwithable`), 2026-09-16 to 17.** A new client, Courtney (the brand is her name; the project was first called Unfuckable With), sells two courses: The Energetic Reset ($167 mini-course, copy in hand) and Becoming Unfuckwithable (main course, copy and price to come); the real site will be built on Kajabi. Day one: four design directions in a pick-one gallery. Day two: she picked Halo (white), so the gallery was archived under `directions/` and a four-page site was built on it (cover, about, one sales page per course) with her words on the mini-course page and dotted-rose placeholder copy everywhere else. The project folder and URL were renamed from unfuckable-with to unfuckwithable (old links redirect). LIVE (noindex) at https://handprotocol.org/project/unfuckwithable/ (short https://handprotocol.org/unfuckwithable). Waiting on her copy, the main-course price and both Kajabi checkout URLs. Read `unfuckwithable/HANDOFF.md` first.
12. **Long Horn Wine Tours on the engine + multi-page engine, 2026-09-22.** koH's own client site
   (`~/Documents/lhwt`, own repo, Netlify account `zantrra`) now runs on the owner-editable engine as
   the first **external** client (`clients/_external`): eight server-rendered routes, 205 editable
   fields, every photo slot in Media, a Setup tab made of its open owner items, the guest review
   page at review.longhornwinetours.com with owner-pasted links. To get there the engine gained
   multi-page packs (`ROUTES`, path-less `page.mjs` + rewrites, `lib/render.mjs`, 404/301 handling,
   `render.fallback`), a configurable publish dir + pack-owned toml, `favicon`, `preferStatic` on
   the sitemap, review links as a function of content, form subject hooks, and a sync that maps
   `public/` to the client's publish dir. Migration 049 applied. LIVE 22 Sep, published once through
   the editor. Existing clients are NOT synced yet (they drift by the 21 Sep review feature + today's
   changes: run `sync-engine.mjs --check`). Nothing committed in this repo.
13. **yuhm, renamed from WXL:FOOD (2026-08-24), and the one-step sign-in (2026-09-08).** The food app lives at [yuhm.handprotocol.org](https://yuhm.handprotocol.org) (the old wxl address redirects), with a playful brand that now carries from the landing page through sign-in to the task. Sign-in is one email-and-password Continue form; guests can browse first and sign in only when they need to. yuhm deploys by hand from the CLI, not from `main`. See `yuhm/HANDOFF.md`.
14. **Booking calendar for client sites, 2026-09-16 to 17.** Request-mode booking is live on PrecisionFix: customers pick a service, a day and a time window; the owner confirms in a Bookings tab or from one-tap email links; customers get confirmation emails, a calendar file and reminders. Phase 2 part 1 (a privacy fix plus the first slice) shipped 2026-09-17 with migration 048. Reschedule and busy-calendar import moved to koordi. Plan: `.claude/skills/hand-client-site/reference/booking-calendar-plan.md`.
15. **Practitioner safety plan, 2026-09-16 (plan only).** How a healer can screen a first-time client before meeting them alone: traceability, a hello call, a safety contact with a check-out alarm, rules that apply to every new client equally. Nothing built. See `.claude/skills/hand-client-site/reference/booking-screening-plan.md`.
16. **(Sub)culture Audio portfolio, 2026-09-17.** Three themes for an Austin sound-system rental crew, built from their own copy, specs and photos, at [/project/subculture-audio/](https://handprotocol.org/project/subculture-audio/) (noindex). Workspace `subcultureaudio/`.
17. **Kohsi, the coordination service, 2026-09-19 onward.** Started as `book`, renamed `koord`, `koordi`, Akosi, then **Kohsi** (2026-11-06, kohsi.net). It is the booking and delivery layer (channels, consent, reminders, later push) that client sites and HAND communities will share. Private repo `HandProtocol/kohsi`, nested at `kohsi/` (`koordi`, `koord` are symlinks to it). Running on HAND's VPS at kohsi.net (koordi.handprotocol.org still answers), in production since 2026-11-01. Cold start: `cd kohsi && node src/cli.mjs status`.
18. **yuhm THE MISSION and gatherings, plans and demo, 2026-09-19 to 20.** An opt-in game layer for people who want to help (routes, small tasks, seeds, weekly rhythm, a circle goal, no leaderboard; food seekers never see game UI) and a gatherings beta that starts with a food prep gathering. Money for gatherings settles directly between people, ticked off by hand; HAND holds no money. Plans `plans/004-yuhm-the-mission.md` and `plans/005-yuhm-gatherings-koord.md`. Nothing built; decisions wait on koH.
19. **Docs program, SEO tool, OmniOne scan, 2026-09-30 to 10-01.** A review of everything HAND has published, kept as internal docs under `docs/closed/` (ignored by git, because this repo is public), with page wireframes and a capture tool at `docs/tools/`. A client SEO tool, `.claude/skills/hand-client-seo/` (86 checks, a stage menu from basic setup to Search Console); Three Hands Healing scored 96 (A). A full scan of omnione.world for a planned redesign, in `omnione/` (redesign not started).
20. **yuhm pickup runs, 2026-09-30 to 10-06 (built, not live).** A run sheet for someone who picks food up and shares it out to several families: portions per family, who to contact, a per-family checklist, check-offs and seeds. Walked end to end in a browser on the `agent/yuhm-network` branch. Migration 050 is not applied and nothing is deployed. Plan `plans/006`; resume from `yuhm/_handoff-2026-09-30-pickup-runs.md`.
21. **Three Hands Healing on its own domain, 2026-10-06.** Maria's practice site is live at [3handshealing.com](https://3handshealing.com) on the owner-editable engine, with practice pages for body, mind and pets and Calendly booking. Her Google Workspace mail survived the nameserver move (records restored the same day). Read `clients/three-hands-healing/HANDOFF.md` first.
22. **yuhm sign-in fixed and auth email moved to Resend, 2026-10-06.** Sign-up had broken because email confirmation was switched on in the shared Supabase project; it is off again. Auth emails (password resets) now send through Resend as Yuhm Network with branded templates, instead of Supabase's two-per-hour mailer.
23. **Mystic Hearts site in the repo, 2026-10-06.** The site source now lives at `mystichearts/`; the public landing is two slides (the future village, "Coming fall 2027" with a way to get in touch) and the fuller demo sits behind the gate.
24. **SolarPunk Summit driver sign-up, 2026-10-06.** [sps.handprotocol.org](https://sps.handprotocol.org): volunteer drivers mark which airport runs they can drive; the transport team gets an email on every change. Behind an access code, no passenger details on the page. Source `solarpunk/`; a driver portal is planned in `solarpunk/PLAN-driver-portal.md`.
25. **FlowB switched off, 2026-10-13.** Its Fly app is scaled to zero; koordi takes over its people-coordination and event features. Do not restart it to check something.
26. **PrecisionFix on the owner's own accounts, 2026-10-14 to 23.** The site moved to the owner's own Netlify account and domain, [precisionfixmobile.com](https://precisionfixmobile.com), and now deploys itself on every push to the public repo `HandProtocol/precisionfix-mobile`. Deposit wording stays hidden until a Stripe key exists. 2026-10-15: the owner's admin became one portal (Home first, a small menu, a phone dock) with a Payments screen where the owner pastes a Stripe key and the site sets up the rest (engine change, migration 054). 2026-10-23: mail sends from the shop's own domain to the shop's inbox; customers can ask questions before booking through an account and a conversation thread (migration 056); editors can add a password next to the email link (engine change, migration 055). Read `clients/precisionfix/HANDOFF.md` first.
27. **Legacy Care: babysitting and childcare, 2026-10-23.** The in-home care site at [legacycare.llc](https://legacycare.llc) (owner-editable since 2026-09-11) now offers babysitting and childcare, with rates and design from the owner's flyer, in English and Spanish.
28. **Abuse limits on the public forms, 2026-10-23.** After an automated probe sent dozens of notes through the feedback form in half an hour (each one an email), the site's functions got durable limits: per-visitor and site-wide caps on feedback, a daily cap on feedback emails, and a site-wide daily email cap that protects the shared Resend quota. Migration 057 is applied; the code waits for its push to `main`. Details in `DEPLOY.md` under "Function limits".

## Active surfaces

| Path | What it is | Status |
|---|---|---|
| `web/foundation-campaign/` | Primary public site. 501(c)(3) filing campaign, $222,222 first goal. | Live |
| `web/discovery/` | Three long-form discovery docs: vision, models, landscape. | Live |
| `web/sovereign-reciprocates/` | AI workstream public page. Reuses discovery design system. | Live |
| `web/governance/` | Governance hub. Reuses discovery design system + own style.css. | Live |
| `web/donate-crypto/` | Dedicated crypto-donation page. Crypto demoted from main campaign. | Live |
| `web/learn/` | HAND Learn: a nine-module "build your first app with Claude Code" course with accounts, progress and a coach dashboard. Unlinked from the public nav. | Live |
| `web/project/<slug>/` | Client design previews and pick-one style galleries (Courtney, Untouchable Freedom, (Sub)culture Audio, Legacy Care's first page). All noindex. | Live |
| `yuhm/` | yuhm, Austin food coordination app, at yuhm.handprotocol.org. Manual CLI deploy. | Live |
| `waterdrop/` | WaterDrop, Central Texas paddling app, at waterdrop.handprotocol.org. Deploys from `main`. | Live |
| `projects/waterfall/` | HAND as a 3D waterfall, at waterfall.handprotocol.org. Manual CLI deploy. | Live |
| `solarpunk/` | SolarPunk Summit driver sign-up, at sps.handprotocol.org. Manual CLI deploy. | Live |
| `mystichearts/` | Mystic Hearts website source; built output served under `web/mystichearts/`. | Live (landing), demo gated |
| `clients/<slug>/` | Owner-editable client sites, each on its own Netlify site (table below). | Live |
| `kohsi/` | Kohsi, the booking and coordination service (ex koordi). Private repo, nested here and ignored. | Production on the VPS (kohsi.net) |
| `web/legacy/` | Archive of HAND's earlier landing-page and crowdfunding designs. Intentionally preserved with original $600 / $12K / $56K tiers as historical record. Do not update. | Live |
| `web/landingpage/` | Pre-pivot Next.js Web3 starter homepage. | Preserved, not deployed |
| `sweetspot/` | SweetSpot dApp + Solidity contracts + subgraph indexer. | Preserved, not deployed |

**Client sites on the owner-editable engine** (`clients/_template` + the `hand-client-site` skill):

| Site | Address | Notes |
|---|---|---|
| Three Hands Healing | [3handshealing.com](https://3handshealing.com) | Healing practice. Calendly booking. |
| Legacy Care LLC | [legacycare.llc](https://legacycare.llc) | In-home senior care, babysitting and childcare. |
| PrecisionFix | [precisionfixmobile.com](https://precisionfixmobile.com) | Mobile Mercedes mechanic. On the owner's own Netlify; booking calendar, questions, payments screen. Deploys from its own public repo. |
| ZeroBlur | zeroblur.netlify.app | The hand-built original the engine came from. No custom domain yet. |
| Long Horn Wine Tours | longhornwinetours.com | koH's own business; own repo outside this one. |

## Workstreams in motion

- **Foundation filing raise.** Primary public ask. $222,222 first goal, $77,444 operating minimum, $22,777 filing floor. Campaign at `/foundation-campaign/`. See `PRODUCT.md` for strategic context.
- **Sovereign Reciprocates (AI).** Three-phase build: $11,113 POC, $99,777 pilot, $333,223 production. Open source by default; per-group ownership; eight sovereignty principles. McGovern LOI drafted. See `AI-RECIPROCATES.md` and `AI-EVAL-FRAMEWORK.md`.
- **Governance.** Pre-incorporation publication of bylaws, policies, and grants kit. Board prospect brief in `governance/board/`. Compliance calendar in `governance/COMPLIANCE-CALENDAR.md`.
- **Mailing list.** Resend Audiences integration via Netlify Function (`netlify/functions/subscribe.js`). Live on `/foundation-campaign/#stay-close`. Audience UUID env var pending. See TODO.
- **GoFundMe channel.** Documentation-only so far, at `docs/closed/funding/gofundme-setup.md` (kept out of git). Covers why GoFundMe (parallel individual-giving channel, not a replacement for the filing raise), the pre-501(c)(3) non-deductibility constraint and required disclosure, GoFundMe's actual mechanics (fees, payout timing, identity verification), a setup checklist, and open questions (fiscal sponsor as charity-of-record, goal framing, personal-account commingling). Nothing published yet.
- **Discovery iteration.** Living documents. Open-question pattern is being normalized. See TODO.
- **yuhm.** Live food finder plus coordinator tools. In motion: the pickup-run tool (built on `agent/yuhm-network`, migration 050 not applied, not deployed), THE MISSION game layer and the gatherings beta (plans 004 and 005, waiting on koH's decisions). See `yuhm/HANDOFF.md`.
- **Kohsi (ex koordi).** Booking and coordination service on the VPS, in production since 2026-11-01. Its handoff is `kohsi/HANDOFF.md`.
- **Docs program.** Internal review of everything HAND has published, a FAQ fact base, wireframes, and an onboarding funnel. Lives in `docs/closed/` (never committed). Resume from `docs/closed/HANDOFF.md`.
- **Owner-editable client sites (Develop pillar).** Five live instances on the shared engine (table above). Per-client state lives in `clients/<slug>/HANDOFF.md`; engine fixes go through `clients/_template` + `sync-engine.mjs`, never inside a client. The engine now has a Home-first admin portal, a Setup tab of buttons, a booking calendar, an owner-connected Stripe screen, and optional password sign-in. Engine changes that add database columns need their migration applied on each live site before the sync. None of `clients/` is committed in this repo.

## Active funding ladder

**Foundation campaign** (heritage 777 thread):
- $22,777, filing floor (angel double-anchor + heritage-777 tail)
- $77,444, operating minimum (heritage 77 + foundation/stability 444)
- $222,222, first goal (pure angel destination)

**Sovereign Reciprocates** (anchored angels with asymmetric tails, the parallel AI-funder asks):
- $11,113, POC (folded into the $222,222 filing-raise goal)
- $99,777, one-year pilot (anchor + heritage-777 tail)
- $333,223, production layer (the McGovern target; the 223 tail refuses to round)

**Individual contributor pledge ladder:**
- $222, $333, $555, $999, $1,111 (featured), $3,333, $7,777+

If you change any of these, update: `web/foundation-campaign/index.html`, `web/landingpage/app/raise/page.tsx`, `web/discovery/index.html`, `web/discovery/impact-org-landscape.html`, `web/discovery/skill-exchange-vision.html`, `web/assets/og-card.html`, `PRODUCT.md`, `AGENTS.md`, `README.md`, `AI-RECIPROCATES.md`. The legacy archive intentionally keeps its original numbers.

## Where to find things

- **Brand voice, vocabulary, anti-references, working conventions:** `AGENTS.md`. Read this first if you have not. Critical: zero em dashes, "Reciprocates" / "Reciprocate groups" / "Contributors" as defined terms, "Sovereign Reciprocates" for the AI workstream.
- **Strategic context (users, mission, success criteria):** `PRODUCT.md`.
- **Visual system (colors, typography, components, motion):** `DESIGN.md`.
- **Deployment, env vars, Netlify, Resend setup:** `DEPLOY.md`.
- **Running task list (Now / Soon / Later / Done):** `TODO.md`. Authoritative for what to work on next.
- **Discovery research (40+ peer orgs, 6 skill-exchange categories, gap analysis):** `web/discovery/`.
- **Governance package (bylaws, policies, grants kit):** `governance/`.
- **AI workstream:** `AI-RECIPROCATES.md` (one-pager), `AI-EVAL-FRAMEWORK.md` (six-dimension eval), `funding/mcgovern-letter.md` (LOI).
- **yuhm (ex WXL):** `yuhm/HANDOFF.md`, then the dated `yuhm/_handoff-*.md` for the thread you are resuming; living docs at `yuhm/docs/LIVING-DOCS.md`; plans `plans/004` to `006`.
- **Kohsi:** `kohsi/HANDOFF.md`, or `cd kohsi && node src/cli.mjs status`.
- **Smaller live tools:** `solarpunk/HANDOFF.md` (driver sign-up), `mystichearts/` (site source), `projects/waterfall/README.md`, `waterdrop/`.
- **Client SEO:** `.claude/skills/hand-client-seo/HANDOFF.md`.
- **Internal docs (not in git):** `docs/closed/`. This repo is public, so internal state, people's contact details and anything sensitive go there, never in a tracked file.
- **Client-site engine (owner-editable sites):** `clients/_template/HANDOFF.md` (the engine's own handoff: what shipped 2026-09-16, live state per client, how to verify the Setup tab, uncommitted state, open decisions), `clients/_template/README.md` (architecture), `.claude/skills/hand-client-site/SKILL.md` (phases, scripts, opt-in engine features, instances table), `clients/<slug>/HANDOFF.md` per client. PrecisionFix is the reference for the booking calendar, the admin portal, payments, customer questions and password sign-in.

## Open items worth knowing

These are the load-bearing ones. Full list in `TODO.md`.

- **Rotate the Resend API key.** Current key was sent through chat and is in conversation logs. Working in production but needs rotation.
- **Create the Resend audience and set `RESEND_AUDIENCE_ID`** in Netlify production env vars before subscribe form is fully functional.
- **Smoke-test the live subscribe flow** after rotation and audience set.
- **Submit `sitemap.xml` to Google Search Console** once domain is fully canonical.
- **Set up `hand@handprotocol.org` email forwarding** (ImprovMX or similar).
- **Discovery iteration pass:** audit each doc for v0.1-sounding language; normalize the "Open question" pattern.
- **Ship the form abuse limits.** Migration 057 is applied; push the function changes and the widget to `main`. Then decide whether to lower Supabase's auth email limit (30 per hour today), which shares the same Resend daily quota.
- **Internal findings from the docs program** wait on koH; see `docs/closed/HANDOFF.md`.
- **yuhm pickup runs:** screen tests and entry links, then koH's go before applying migration 050 and deploying.
- **Booking calendar part 2** (customer reschedule, busy-calendar import) moved to koordi; the engine takes fixes only.
- **PrecisionFix follow-through:** the owner connects Stripe on the Payments screen (no real payment has run yet); reply-by-email for customer questions waits on Resend receiving for the shop's domain; delete the old interim site once koH says; lift the booking email polish into `clients/_template`. Ship by pushing its mirror repo; recipe in `clients/precisionfix/HANDOFF.md`.
- **Courtney (project `unfuckwithable`):** four-page site live on the Halo direction (cover, about, The Energetic Reset, Becoming Unfuckwithable), placeholder copy underlined in rose (`class="todo"`), buy buttons still `#checkout`; waiting on her copy for the about and main-course pages, the main-course price and both Kajabi checkout URLs; notes page for her at `/project/unfuckwithable/for-courtney/`; next task is the Kajabi upload prep (plan written 2026-09-18, not started). Details in `unfuckwithable/HANDOFF.md`.

## Conventions to honor

These are not aesthetic preferences. Each one is load-bearing.

1. **No em dashes.** Anywhere. Use commas, parentheses, or restructure the sentence. Brand voice sweep landed in commit cf7594b.
2. **"Reciprocates" (capitalized) for the served population.** Never "clients," "beneficiaries," or "users." See `AGENTS.md` for full vocabulary.
3. **Prove, do not promise.** Specific dollar amounts, named peer organizations, real worked examples. Aspirational rhetoric is rejected. See `PRODUCT.md`.
4. **Honest about unknowns.** Every long-form doc has an open-questions or honest-unknowns section. Funders trust orgs that name their gaps before being asked.
5. **Walk alongside, on the page too.** Long-form reading is the primary medium. Cross-link generously. Information architecture reflects the accompaniment model.
6. **Plain English first.** A donor or small-business owner should understand any sentence without a glossary. Technical detail is annotated inline with tooltips or links.
7. **One family across surfaces.** Foundation, discovery, sovereign-reciprocates, and governance share design tokens, typography, and motion via `web/discovery/style.css`. Per-page overrides live in their own folder if needed.

## Repo, deploy, contact

- **Repo:** [github.com/HandProtocol/handprotocol](https://github.com/HandProtocol/handprotocol)
- **Live site:** [handprotocol.org](https://handprotocol.org). Auto-deploys from `main` via Netlify. CLI is linked locally to the Netlify project.
- **Contact:** hand@handprotocol.org · Discord: discord.handprotocol.org · X: @hand_protocol
- **Memory:** Future Claude sessions in this repo carry forward project memory in `~/.claude/projects/-home-koh-Documents-handprotocol/memory/`. Naming decisions and tier ladder are preserved there.

---

*Living document. If anything in here is wrong or stale, edit it directly. The handoff is only useful if it stays accurate.*
