# Handoff — Three Hands Healing (Maria) · 2026-09-01

Client website for Maria's healing practice (EFT/Tapping, Candace Silvers
Energy Healing, bodywork, Qi Gong, Systemic Family Constellations, intuitive
emotional release). **Status: design preview LIVE on handprotocol.org; copy
phase in progress — blocked on Maria's answers to a 16-question info sheet.**

## Orient in one paragraph

A three-direction design preview was built 2026-08-11 and is live at
https://handprotocol.org/threehandshealing/ (single page, anchor nav, on-page
design switcher: Gateway / Meadow / Forest). On 2026-08-16 Maria sent four
copy blocks (hero/intro, "How we work together", About teaser, validation
paragraph). This session mapped that copy against the built page, found it
covers the narrative half of the site but none of the factual/trust half, and
produced (a) an internal copy deck and (b) a Maria-facing fillable info sheet
published as a private artifact. Nothing on the live page has changed yet.

## Where things are

| What | Path / URL | State |
|---|---|---|
| Design-preview site | `web/threehandshealing/` (index.html, style.css, script.js, assets/, vendor/) | On `main` (commit `d27db55cd`), auto-deployed, live |
| Live URL | https://handprotocol.org/threehandshealing/ | 200 · in `web/sitemap.xml` (prio 0.8) · **no noindex** |
| Routing | `netlify.toml` L125, `web/_redirects` L14, `vercel.json` L12 — all just `/threehandshealing` → `/threehandshealing/` 301 | committed |
| Maria's copy (verbatim) | `threehandshealing/copy-from-maria-2026-08-16.md` | untracked (this session) |
| Internal copy deck / gap map | `threehandshealing/copy-deck.md` | untracked (this session) |
| Maria-facing info sheet (source) | `threehandshealing/maria-info-sheet.html` (fonts inlined, ~170 KB) | untracked (this session) |
| Info sheet — published artifact | https://claude.ai/code/artifact/0db9eac8-2b14-477a-9845-8032a0377b95 | private; koH shares with Maria |
| Media notes | `web/threehandshealing/assets/README.md` | photos = **watermarked Aneta Hayne proofs**, not licensed finals |

`threehandshealing/` (repo root) is the project workspace: docs, copy, client
comms. `web/threehandshealing/` is the deployed surface. Keep that split.

## What the built page has vs. what copy exists

Built page sections (in order): header/nav · hero (EFT video loop) · "What do
you need today?" three paths (Release=EFT / Restore=Energy / Reconnect=
Supportive conversation) · EFT section + tapping diagram · session steps
(Arrive/Experience/Integrate) · practitioner/About · energy healing · connection
· testimonials · booking panel · breath pause · footer.

Maria's four blocks cover: hero/intro (Option 1, needs splitting — 80 words is
too long for a hero), validation (ships as-is), "How we work together" (Option
2 → practices + session-steps intro), About blockquote (Option 3).

Still literal placeholders on the live page: `[Practitioner name]`, Training,
Experience, Scope, FAQ, testimonials filler text, booking ("60 minute session
· Online or in person · Calendar connection will be added before launch"),
contact (none anywhere), meta/SEO, EFT diagram point placement
("needs practitioner review" in the figcaption). Full map: `copy-deck.md`.

## Decisions taken this session (reversible, pending Maria)

1. **Keep three visitor-facing paths, remap to Maria's two pillars.**
   Release → EFT, Family Constellations, emotional release · Restore →
   bodywork, Candace Silvers Energy Healing, Qi Gong · Reconnect → intuitive
   guidance / supportive conversation. What is *bookable* is her call (Q6).
2. **Three copy edits proposed to Maria, not applied:** single "I'm Maria"
   opening (Option 1 leads, Option 3 starts at sentence two); "address bodily
   pain, structural issues, and systemic illness" → support-language ("support
   for people living with pain, tension, or illness") to stay consistent with
   the footer disclaimer and Texas scope; "channeling gifts" lives in About,
   not the hero. Sheet Q14–16.
3. **Texas bodywork/licensing question asked directly** (Q4) — in TX,
   hands-on soft-tissue work is licensed massage therapy (TDLR). Wording of
   "bodywork" on the site depends on her answer.
4. Info sheet signs off "Prepared by koH for Maria" and carries **no reply
   address** — koH to add one (or just tell Maria where to send answers).

## Design studio on the preview (added 2026-08-23, uncommitted)

`web/threehandshealing/studio.css` + `studio.js` (plus two tagged lines in
index.html) add preview-only client-decision tooling on top of the design
switcher. **Delete all three at launch** — the base site never references them.

- **✦ Studio button** in the switcher pill opens a card: three **type packs**
  (Editorial = current DM faces · Ember = Fraunces/Outfit · Quiet = Cormorant
  Garamond/Nunito Sans; fonts lazy-load on first pick) and four **energy-flare
  toggles** (Aura veil, Light motes, Cursor glow, Golden thread), each a
  `html[data-flare~=…]` layer, all frozen by the existing reduced-motion rule.
- **Copy-suggestion mode**: every heading/paragraph becomes contenteditable
  (leaf-most only, `data-copy-key` per element); was→now diffs collect in a
  bottom tray, autosaved to `localStorage["thh-copy-edits-v1"]`. **Send to
  koH** POSTs to `/.netlify/functions/feedback` (source "Three Hands Healing
  preview") → `command.feedback_pins` (Postgres) + Telegram 🎯 Inspector +
  /pins kanban. Messages chunk under the fn's 2000-char cap; clipboard
  fallback via "Copy as text".
- Every send includes the **picks line** (design · type · flare), and the card
  has **Send my picks** on its own — this is how Maria answers the
  design-direction question the info sheet never asked (step 3 below).
- **Copy preview link** puts a URL with `?design=&type=&flare=` on the
  clipboard, so koH can text Maria one exact combination.
- Verified headless (desktop 1440 + mobile 390): card, tray with 2 edits,
  Forest+Quiet+thread/aura combo. Pre-existing quirk noticed, not fixed:
  `style.css` line 8 `.path>*{position:relative}` overrides the path-card
  number's absolute positioning, so "01/02/03" sit inline above the h3.

## Design-style portfolio (added 2026-09-01, uncommitted)

Maria asked (via koH) to see many more directions before choosing. Built as a
gallery of **17 styles** — the 3 originals + **14 new standalone one-page
sites** — at `web/threehandshealing/styles/`. Will be live at
https://handprotocol.org/threehandshealing/styles/ once `web/` is committed to
`main` (noindex meta + `X-Robots-Tag` header; not in the sitemap).

| Path | What |
|---|---|
| `styles/index.html` + `gallery.css` + `gallery.js` | The gallery: cards with desktop + phone thumbnails, filters (Stunning 7 · Wild 7 · Originals 3), "Surprise me", a lightbox viewer with Desktop/Phone toggle + ‹ › keys, ♡ picks, and a bottom tray that **sends picks to koH** through `/.netlify/functions/feedback` (source "Three Hands Healing styles" → `command.feedback_pins` + Telegram 🎯 Inspector). Deep links: `styles/#cathedral`. |
| `styles/<slug>/index.html` (+ `style.css`, `script.js`) | One finished site per style. Same copy (Maria's four blocks + the drafted modality lines), same proofs, different world. Every page carries `../_portfolio.js`, which injects the "← All styles · ♡ Pick this" pill (hidden inside the gallery iframe). Picks live in `localStorage["thh-style-picks"]`, shared by gallery + pill. |
| `styles/_shots/<slug>.webp`, `<slug>-m.webp` | Card thumbnails (960×600 desktop, 300×649 phone). Regenerate with `tools/thumbs.mjs` after any style edit. |
| `threehandshealing/design-portfolio-brief.md` | The brief every builder worked from: hard requirements, verbatim copy, photo table, craft bar. **Edit this, not the pages, if the copy rules change.** |
| `threehandshealing/tools/` | `validate.mjs` (static checks vs the brief: ids, noindex, pill include, verbatim copy, ≤5 photos, no invented contact/prices), `shot.mjs <slug>` (desktop + mobile PNGs, console errors, overflow), `thumbs.mjs <slug…>` (gallery webp thumbnails). All drive Playwright from gstack's install with `--no-sandbox`; Bash calls need `dangerouslyDisableSandbox: true` (see memory `machine-headless-chromium-sandbox`). |

The 14 — **stunning:** Linen (Cormorant/Karla, moss thread) · Cathedral (Bodoni/Jost, arch masks on soot + gold) · Bloom (Fraunces soft/Nunito, self-drawing florals) · Terra (Fraunces 900/Work Sans, rising sun on a horizon rule) · Meridian (IBM Plex, EFT point diagram on a 12-col grid) · Halo (Sora/Manrope, rotating aura behind the portrait) · Ink (Noto Serif Display/Zen Kaku, brush ensō + duotone) — **wild:** Prism (Unbounded/Space Grotesk, cursor-reactive aura) · Stellar (Marcellus/Inter, family constellation + moon-phase steps) · Pulse (Archivo Black/Space Mono, playable tap-along panel) · Tide (Newsreader/Albert Sans, 4-4-6 breathing waves) · Retro (Shrikhand/Josefin, sun rays + arches) · Zine (Anton/Caveat/Special Elite, taped polaroids) · Monolith (Bricolage Grotesque/Inter Tight, scroll-snapped film chapters with the EFT video).

Copy decisions baked into all 14 (reversible in the brief): H1 = "Feel good in your body, at peace in your mind, aligned in your life."; pillar 1 uses the support-language edit ("Support for people living with pain, tension, or illness…"); "channeling" is not on the pages; six one-line modality blurbs are **our drafts** (Maria to correct); no testimonials, prices, contact, or credentials anywhere; Book is a placeholder CTA with "Booking and contact details will be added at launch".

Also in this pass: `web/threehandshealing/index.html` switcher gained a "+ 14 more styles" link (styled in `studio.css`, preview-only); `netlify.toml` / `web/_redirects` / `vercel.json` got the `/threehandshealing/styles` trailing-slash rule; `netlify.toml` got the `X-Robots-Tag: noindex` header for `styles/*`. The shared `_portfolio.js` had one bug (stylesheet path) fixed mid-build.

**To ship:** commit `web/threehandshealing/` (incl. `styles/`), the three routing files, and `threehandshealing/` docs on `main` → auto-deploy; verify https://handprotocol.org/threehandshealing/styles/ returns 200 with the noindex header. Then text Maria the gallery link. When she sends picks, they arrive on the /pins kanban tagged 🧭 picks · 🎨 style.

**Next after picks:** fold the chosen direction(s) into the real build (the copy-slotting steps below still apply), delete the other 13 + the gallery, and drop `_portfolio.js` from the survivor.

## Blocked on Maria — the 16 questions (sheet Q-numbers)

You (1–5): display name · business name/tagline · training & certs by
practice · TX massage license? · one honest sentence about her own journey.
Sessions (6–9): what's bookable + lengths + prices · online/in-person/city ·
how to book + what happens after + cancellation line · contact details.
Practices (10a–f): one line each on the six modalities (incl. "is Candace
Silvers Energy Healing the correct lineage name?").
FAQ (11) · testimonials with permission (12) · licensed photos + preferred
portrait + EFT diagram check (13) · the three confirmations (14–16).

The sheet autosaves answers in `localStorage["thh-info-sheet-v1"]` on her
device; "Copy my answers" assembles one numbered plain-text message.

## Next steps, in order, once answers arrive

1. Slot the four blocks + answers into `web/threehandshealing/index.html`
   (replace every `data-owner-field`, `[bracketed]` text, and the
   testimonials/booking placeholder strings; `script.js` L214–239 hold the
   booking/breath status strings).
2. Rewrite the three path cards + six modality blurbs (draft, send back for OK).
3. Maria picks a design direction (Gateway / Meadow / Forest) — **not on the
   info sheet**; ask her directly, then delete the `.design-switcher` and the
   two unused `data-design-*` image variants.
4. Swap watermarked proofs for licensed finals; alt text with her name.
5. Booking: wire the real mechanism (calendar link / Square / email) into
   `[data-booking-demo]`; drop the "1 of 3" stepper if it's just a link.
6. Meta title/description; contact block in footer; disclaimer sign-off.
7. Production path (assumed, confirm with koH): graduate to
   `clients/three-hands-healing/` on its own Netlify site + domain, per the
   Cafe Nena'i / Ed's / Emilia pattern — DNS zone first so nameserver
   propagation overlaps the build. Until then it stays a HAND-hosted preview.

## Open flags (not fixed — decide, then act)

- **Indexing:** the preview is in `web/sitemap.xml` at priority 0.8 with no
  `noindex`, while showing watermarked photographer proofs and placeholder
  copy. Recommend `X-Robots-Tag: noindex` (netlify.toml headers) or a meta
  robots tag + remove from sitemap until launch. Photographer licensing is
  the sharper concern.
- **Design direction** not asked on the sheet (see step 3).
- **Bilingual EN/ES** not asked. Demo/client sites normally auto-detect
  Spanish (see memory `hand-biz-bilingual-i18n`); unknown whether Maria's
  clientele needs it.
- **No `biz/` lead file** exists for Three Hands Healing — this client did not
  come through the scraper pipeline; if it should show on the Develop board,
  register it.

## Repo hygiene

- Everything new this session lives in `threehandshealing/` and is
  **untracked**. Current checkout branch is `agent/cafe-nenai-rebuild`
  (unrelated). Commit `threehandshealing/` as its own docs commit — do not
  fold it into the Cafe Nena'i branch. `wxl/_handoff-2026-08-11` already
  warns that threehandshealing files belong to a separate workstream.
- Another Claude session may share this checkout — stage by path.
- The info-sheet artifact redeploys from the same file path in the
  originating conversation; from any other session pass the artifact URL as
  `url` or you'll fork a second artifact.

## Session log

- 2026-08-11 — design preview built + shipped (`d27db55cd`), 3 directions,
  EFT hero video, Aneta Hayne proofs, all owner fields placeholdered.
- 2026-08-16 — Maria's four copy blocks received. Copy audit against the
  built page → `copy-deck.md`. Verbatim copy saved to
  `copy-from-maria-2026-08-16.md`.
- 2026-08-16/17 — Maria-facing info sheet written, set in the site's own
  faces (DM Sans / DM Serif Display inlined as data URIs, site palette, light
  + dark, print), verified in headless Chrome at 900px/390px, published as a
  private artifact (v1-sixteen-questions).
- 2026-09-01 — Design-style portfolio: 14 new standalone styles + gallery at `web/threehandshealing/styles/` (14 parallel builders from `design-portfolio-brief.md`, each screenshot-verified; all pass `tools/validate.mjs`), picks→feedback fn, routing + noindex header, switcher bridge link. Uncommitted.
- 2026-08-23 — Design studio built on the preview (studio.css/studio.js,
  uncommitted): type packs, energy-flare toggles, copy-suggestion mode wired
  to command.feedback_pins via the existing feedback fn, shareable
  picks-encoded URLs. Verified headless desktop + mobile. Not yet deployed —
  needs a main-branch commit of web/threehandshealing/ only.
