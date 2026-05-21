# HAND Protocol Handoff

**For the person picking this up cold (or for future-self after time away).**
*Last updated: 2026-05-15 · Pre-incorporation*

---

## Orient in one paragraph

HAND Protocol Foundation is preparing to file as a 501(c)(3) in Austin, Texas, to operate a long-term, relational accompaniment model for three communities of regenerative impact work: healers and practitioners, impact entrepreneurs, and grassroots organizations. The repository contains the public website, the governance package, the AI workstream proposal, and the working documents that explain the work in plain English. The site is live at [handprotocol.org](https://handprotocol.org), auto-deployed from `main` to Netlify. The filing raise is open with a $222,222 first goal.

## What just shipped (recent past, in order)

1. **Governance package and `/governance/` route.** Articles, Bylaws, 8 policies (including the data-sovereignty-and-AI policy), compliance calendar, board prospect brief, grants kit. See `governance/` for sources and `web/governance/` for the public page.
2. **Sovereign Reciprocates, the AI workstream.** Custom open-source agent systems built per Reciprocate or Reciprocate group, owned by the group. Eight sovereignty principles, a six-dimension evaluation framework, and a draft McGovern LOI. Public page at `/sovereign-reciprocates/`. Source docs: `AI-RECIPROCATES.md`, `AI-EVAL-FRAMEWORK.md`, `funding/mcgovern-letter.md`.
3. **Angel-number tier ladder.** Foundation tiers $22,777 / $77,444 / $222,222 (heritage 777 thread). Sovereign Reciprocates tiers $11,113 / $99,777 / $333,223 (anchored angels with asymmetric tails). Contributor pledge ladder $222 → $7,777+. Single source of truth: see "Active funding ladder" below.
4. **Audience and origin reframing.** Audience phrase is "three communities of regenerative impact work." Origin narrative is regenerative impact, not healing-aligned. AI is positioned as one tool inside the larger mission, not the centerpiece.
5. **Brand voice sweep.** Zero em dashes across the project. See `AGENTS.md`.
6. **Custom domain live on Netlify.** [handprotocol.org](https://handprotocol.org), auto-deploy on `main`. Resend mailing list integration in production. See `DEPLOY.md` for infrastructure.

## Active surfaces

| Path | What it is | Status |
|---|---|---|
| `web/foundation-campaign/` | Primary public site. 501(c)(3) filing campaign, $222,222 first goal. | Live |
| `web/discovery/` | Three long-form discovery docs: vision, models, landscape. | Live |
| `web/sovereign-reciprocates/` | AI workstream public page. Reuses discovery design system. | Live |
| `web/governance/` | Governance hub. Reuses discovery design system + own style.css. | Live |
| `web/donate-crypto/` | Dedicated crypto-donation page. Crypto demoted from main campaign. | Live |
| `web/legacy/` | Archive of HAND's earlier landing-page and crowdfunding designs. Intentionally preserved with original $600 / $12K / $56K tiers as historical record. Do not update. | Live |
| `web/landingpage/` | Pre-pivot Next.js Web3 starter homepage. | Preserved, not deployed |
| `sweetspot/` | SweetSpot dApp + Solidity contracts + subgraph indexer. | Preserved, not deployed |

## Workstreams in motion

- **Foundation filing raise.** Primary public ask. $222,222 first goal, $77,444 operating minimum, $22,777 filing floor. Campaign at `/foundation-campaign/`. See `PRODUCT.md` for strategic context.
- **Sovereign Reciprocates (AI).** Three-phase build: $11,113 POC, $99,777 pilot, $333,223 production. Open source by default; per-group ownership; eight sovereignty principles. McGovern LOI drafted. See `AI-RECIPROCATES.md` and `AI-EVAL-FRAMEWORK.md`.
- **Governance.** Pre-incorporation publication of bylaws, policies, and grants kit. Board prospect brief in `governance/board/`. Compliance calendar in `governance/COMPLIANCE-CALENDAR.md`.
- **Mailing list.** Resend Audiences integration via Netlify Function (`netlify/functions/subscribe.js`). Live on `/foundation-campaign/#stay-close`. Audience UUID env var pending. See TODO.
- **Discovery iteration.** Living documents. Open-question pattern is being normalized. See TODO.

## Active funding ladder

**Foundation campaign** (heritage 777 thread):
- $22,777, filing floor (angel double-anchor + heritage-777 tail)
- $77,444, operating minimum (heritage 77 + foundation/stability 444)
- $222,222, first goal (pure angel destination)

**Sovereign Reciprocates** (anchored angels with asymmetric tails — parallel AI-funder asks):
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

## Open items worth knowing

These are the load-bearing ones. Full list in `TODO.md`.

- **Rotate the Resend API key.** Current key was sent through chat and is in conversation logs. Working in production but needs rotation.
- **Create the Resend audience and set `RESEND_AUDIENCE_ID`** in Netlify production env vars before subscribe form is fully functional.
- **Smoke-test the live subscribe flow** after rotation and audience set.
- **Submit `sitemap.xml` to Google Search Console** once domain is fully canonical.
- **Set up `hand@handprotocol.org` email forwarding** (ImprovMX or similar).
- **Discovery iteration pass:** audit each doc for v0.1-sounding language; normalize the "Open question" pattern.

## Conventions to honor

These are not aesthetic preferences. Each one is load-bearing.

1. **No em dashes.** Anywhere. Use commas, parentheses, or restructure the sentence. Brand voice sweep landed in commit cf7594b.
2. **"Reciprocates" (capitalized) for the served population.** Never "clients," "beneficiaries," or "users." See `AGENTS.md` for full vocabulary.
3. **Prove, do not promise.** Specific dollar amounts, named peer organizations, real worked examples. Aspirational rhetoric is rejected. See `PRODUCT.md`.
4. **Honest about unknowns.** Every long-form doc has an open-questions or honest-unknowns section. Funders trust orgs that name their gaps before being asked.
5. **Walk alongside, on the page too.** Long-form reading is the primary medium. Cross-link generously. Information architecture reflects the accompaniment model.
6. **Plain English first.** A donor or a healer should understand any sentence without a glossary. Technical detail is annotated inline with tooltips or links.
7. **One family across surfaces.** Foundation, discovery, sovereign-reciprocates, and governance share design tokens, typography, and motion via `web/discovery/style.css`. Per-page overrides live in their own folder if needed.

## Repo, deploy, contact

- **Repo:** [github.com/HandProtocol/handprotocol](https://github.com/HandProtocol/handprotocol)
- **Live site:** [handprotocol.org](https://handprotocol.org). Auto-deploys from `main` via Netlify. CLI is linked locally to the Netlify project.
- **Contact:** hand@handprotocol.org · Discord: discord.handprotocol.org · X: @hand_protocol
- **Memory:** Future Claude sessions in this repo carry forward project memory in `~/.claude/projects/-home-koh-Documents-handprotocol/memory/`. Naming decisions and tier ladder are preserved there.

---

*Living document. If anything in here is wrong or stale, edit it directly. The handoff is only useful if it stays accurate.*
