# Handoff: Unfuckable With (Courtney) · updated 2026-09-17

**For the person picking this up cold, or for koH after time away.**

## Orient in one paragraph

Courtney is a new HAND Develop client. She sells one offer, **The Energetic
Reset** (a mini-course on protecting, clearing and recovering your energy,
$167 USD), under the brand **Unfuckable With**. Her real site will be built on
**Kajabi**. HAND's job so far was only to help her choose a design direction:
four complete takes on the one sales page, each led by one of her four brand
colors (black, rose pink, white, light gold), shown in a pick-one gallery.
The gallery is live, carries her own photo, and is waiting on her pick.

**Status: LIVE at https://handprotocol.org/project/unfuckable-with/
(short link https://handprotocol.org/unfuckable-with), noindex.
Waiting on (1) Courtney's pick and (2) her Kajabi checkout URL.**

## Start here (cold session)

1. Read this file. Then open the live gallery above, or
   `web/project/unfuckable-with/index.html` from disk (everything works from
   disk except sending picks, which falls back to the clipboard).
2. Check `/pins` on the Command Center for her picks: `command.feedback_pins`
   rows with source **"Unfuckable With styles"**, tags 🧭 picks · 🎨 style.
   koH also gets a Telegram ping when one arrives.
3. Do not delete any of the four designs until she has chosen. A mix is a
   normal outcome ("the attitude of Rosé with the calm of Halo").
4. Every change to the live preview goes through `main`; see "How to update
   the live preview" below. Never push the working branch as a whole, other
   sessions share this checkout.

## What shipped, in order

| Date | Branch commit | On `main` as | What |
|---|---|---|---|
| 2026-09-16 | `2ad07c73a` | `dbcbd3a42` | Gallery + four designs + thumbnails + routing (redirects, noindex header). Stand-in stock portrait. |
| 2026-09-16 | `4c3b4210d` | `e3a0f76a5` | Handoff rewritten for the live state. |
| 2026-09-17 | `672cf6175` | `9b7cd2b79` | Courtney's own Giza photo in all four designs, crops re-tuned, filters dropped, thumbnails regenerated, stand-in wording removed. |

All three were committed by path on `agent/yuhm-network` and cherry-picked onto
a fresh `origin/main` worktree. Netlify deploys for `dbcbd3a42` and `9b7cd2b79`
were watched to `ready` and the live pages verified afterwards (see "Verified").

## The brief, as koH gave it (2026-09-16)

- Name: "Unfuckable With". Hosting: Kajabi, later. Her current site is very
  basic, so: direct, not too many sections.
- Palette strictly **light gold, black, rose pink, white**. Nothing else.
- Include her image (it arrived a day after the brief, see "The image").
- At least three designs. The page copy was supplied in full (one offer page).
- koH's spelling of her name is "Courtney"; no last name was given. Do not
  guess one. Her current site URL was not given and search did not find it.

## The four directions (each color leads one)

| Slug | Leads | Idea | Fonts |
|---|---|---|---|
| `noir` | black | Lacquer black, light-gold didone. Her photo glows inside a three-layer "shield" of breathing gold rings with an orbiting ring of the course's verbs. Closing offer on a rose panel. | Bodoni Moda + Hanken Grotesk |
| `rose` | rose pink | Whole page is pink. Poster-weight condensed headline, black censor bars, a spinning asterisk in "sh*t", a scrolling tape of outcomes, outcomes stacked as strips, giant $167. The most direct one. | Archivo (one family, width + weight axes) |
| `halo` | white | The feeling after the reset. Warm white, engraved roman type, gold hairlines, her photo in an oval inside a soft rose + gold aura, lessons on one gold thread. | Marcellus + Jost |
| `gilt` | light gold | Art-deco symmetry. Ruled frame, her doorway photo under an arch with a sunburst behind it, a rose wax-seal, outcomes on a rose band, the final offer in a black dome. | Gloock + Figtree |

All four share the same five beats: hero (title, subhead, price, button,
photo) → the problem → what you will experience (10) → what you will learn (7)
→ who it is for + buy. Footer is one line. Each design is standalone: one
`index.html`, one `style.css`, no JavaScript except the preview pill.

## Where things are

| What | Path |
|---|---|
| Gallery (pick page) | `web/project/unfuckable-with/index.html` + `gallery.css` + `gallery.js` |
| Design pages | `web/project/unfuckable-with/<slug>/index.html` + `style.css` |
| Shared pick pill | `web/project/unfuckable-with/_portfolio.js` + `_portfolio.css` (preview only, delete at launch) |
| **The one shared image** | `web/project/unfuckable-with/assets/feature.jpg` (1000×1428, her Giza photo) |
| Gallery thumbnails | `web/project/unfuckable-with/_shots/<slug>.webp` and `<slug>-m.webp` |
| Routing | `netlify.toml` (two redirects + `X-Robots-Tag: noindex, nofollow` for `/project/unfuckable-with/*`) and `web/_redirects` |
| Screenshot tool | `unfuckable-with/tools/shot.mjs` (`node unfuckable-with/tools/shot.mjs <slug|index> [outdir]`, `HIDE_PILL=1` hides the pill) |
| This handoff | `unfuckable-with/HANDOFF.md` |
| Memory | `~/.claude/projects/-home-koh-Documents-handprotocol/memory/hand-client-unfuckable-with.md` |

Picks live in `localStorage["uw-style-picks"]` (shared between the gallery and
the pill on each design page) and are sent through the site's existing
`/.netlify/functions/feedback`, which accepts any free-form `source` label.

## The image

Courtney's photo arrived 2026-09-17, pasted in chat (1009×1440). It is a full
scene, not a headshot: she leans in a sandstone doorway at Giza, barefoot in a
pale robe, the Great Sphinx framed behind her, the sun directly overhead. Saved
at full aspect as `assets/feature.jpg`; every design reads that one file.

Because it is a scene, two things were changed from the first build:

- **Every crop zooms onto the doorway.** The original crops were tuned for a
  face and left her tiny. Each design now clips the photo in a wrapper
  (`.shield__photo`, `.snap__photo`, `.halo__photo`, `.arch__photo`) and scales
  the `img` inside it: `transform: scale(1.2 to 1.4)`, `transform-origin` near
  52% 52%, plus `object-position`. To re-frame, change those three values. Her
  feet sit at about 77% of the image height and the sun at about 21%; keep both.
- **No grayscale, no duotone.** Noir used to render the photo grayscale and
  Rosé as a black-on-pink duotone. Both threw away the golden light, which is
  her "light gold" already, so all four show the photo in color with a light
  contrast lift. The sandstone reads as part of the palette, not outside it.

The doorway-inside-a-frame echo is deliberate: a portal inside Noir's rings,
Halo's oval, Gilt's arch.

Two caveats. The alt text describes the scene and does **not** name her,
because nobody has confirmed the woman in the photo is Courtney; if koH
confirms it, "Courtney at Giza, ..." is the better alt. And the file is only
about 1000px wide and looks like a screenshot, so it is soft on large retina
screens; ask for the original before the Kajabi build.

To swap the image again: overwrite `assets/feature.jpg`, update `width` /
`height` on the four `img` tags if the aspect changes, re-check the crops, then
regenerate thumbnails (Chromium needs the harness sandbox off):

```bash
S=/tmp/uw-thumbs
for s in noir rose halo gilt; do HIDE_PILL=1 node unfuckable-with/tools/shot.mjs $s $S; done
cd web/project/unfuckable-with/_shots
for s in noir rose halo gilt; do
  ffmpeg -y -i $S/$s-desktop.png -vf scale=960:600 -c:v libwebp -quality 84 $s.webp
  ffmpeg -y -i $S/$s-mobile.png  -vf scale=300:649 -c:v libwebp -quality 84 $s-m.webp
done
```

## Copy: what was touched, and what to raise with her

Her words are used verbatim, with these mechanical edits only:

- "w/o" written out as "without"; list dashes removed; list items capitalised.
- In Noir, Rosé and Gilt the first sentence ("We live in a world that is
  over-stimulating.") is lifted out as the section heading, so the paragraph
  starts at "The reason you feel…". Halo keeps the paragraph whole.
- Section headlines are all her own phrases, lifted from the copy:
  "Palo-santo, sage, and breathwork is not enough." (Noir), "Energy must be
  moved with intention and specific techniques." (Rosé), "Protect, clear, and
  recover your energy." and "Feel recharged and revitalized everyday." (Halo),
  "The tools you can use for the rest of your life." (Gilt), and the seal /
  sticker line "just a few minutes a day".
- Words that are HAND's, not hers: the button labels ("Enroll now",
  "Get The Energetic Reset", "Enroll · $167"), the eyebrow "The mini-course",
  the copyright line, and the orbit words in Noir (PROTECT, CLEAR, CUT CORDS,
  RECOVER, RECHARGE, SHIELD), which paraphrase her seven lessons.

Left exactly as she wrote them, worth a gentle mention before launch:

- "Palo-santo, sage, and breathwork **is** not enough" (three things, so "are").
- "everyday" used three times where "every day" is meant.
- "Palo-santo" is usually written "palo santo".

## Open items

1. **Her pick.** Check `/pins`. If nothing arrives in a week, ask koH whether
   she has seen the link; the send button was never test-fired live (it would
   have pinged koH's Telegram), though the identical flow works for Untouchable
   Freedom.
2. **Buy buttons.** Every final button is `href="#checkout"` with a
   `data-checkout` attribute. Point them at her Kajabi offer checkout URL.
3. **Confirm the woman in the photo is Courtney**, then name her in the alt text.
4. **Ask for the original photo file** (the current one is ~1000px and soft).
5. **Missing beats for a $167 sales page:** no bio, no testimonials, no
   socials, because none were supplied. A short "about Courtney" section and
   two or three testimonials are the first things to add once a direction is
   chosen.
6. **Her current site URL** is unknown, so nothing was scraped from it (logo,
   socials, existing checkout link). Ask koH if it matters.
7. **Root `HANDOFF.md`** carries a "What just shipped" entry for this work, but
   like the neighbouring entries it is uncommitted in the shared checkout.

## How to update the live preview

The preview is served from `main` (Netlify site `handprotocol`, id
`0d46269a-789a-4e42-a00e-7f30e79c5869`, publish dir `web`, no build step).
Other Claude sessions work in this same checkout and branch, so:

1. Stage by explicit path only (`git add -- web/project/unfuckable-with unfuckable-with`), never `-A`.
2. Commit on the branch. Plain imperative message, no trailer (matches the log).
3. Fetch `main` over HTTPS as **cryptokoh** (SSH fails from Claude shells, and
   the active `gh` login is zantrra, which cannot push):
   `TOK=$(gh auth token -u cryptokoh)` then
   `git -c credential.helper= -c "credential.helper=!f(){ echo username=cryptokoh; echo password=$TOK; }; f" fetch https://github.com/HandProtocol/handprotocol.git main:refs/remotes/origin/main`.
4. `git worktree add --detach <scratch> origin/main`, `git cherry-pick <sha>`
   there (no `-q`, it silently skips), push `HEAD:main` with the same
   credential helper, re-fetch, assert `origin/main` equals your HEAD, then
   `git worktree remove` the scratch.
5. Watch the deploy: `netlify api listSiteDeploys --data '{"site_id":"0d46269a-789a-4e42-a00e-7f30e79c5869","per_page":3}'`
   until the row for your commit is `ready` (about a minute), then curl the
   live pages. A deploy in `error` state is a real failure here; read
   `error_message`.

## Moving the chosen design to Kajabi

Each design is one HTML file and one CSS file. No JavaScript is required: the
only script tag is the preview pill, which gets deleted. Motion is CSS only,
scroll reveals are progressive (`animation-timeline: view()`), and everything
honours reduced motion. Fonts are Google Fonts. That makes it portable into a
Kajabi landing page as custom code blocks (section HTML plus the stylesheet in
the page's custom CSS / header code), or as the basis for a custom Kajabi
theme. Kajabi's own checkout stays the checkout. Keep the palette strict; the
photo's sandstone counts as gold.

## Verified

- **2026-09-16, first push.** Headless Chromium at 1440×900, 820×1180,
  1024×768 and 390×844, first screen and full page, all four designs plus the
  gallery: no console errors, no horizontal overflow. Gallery flow driven end
  to end (open a design, switch to phone view, pick, tray shows the pick, the
  pick carries to the pill on the standalone page). After the deploy: every
  page and asset 200 with correct content types, both redirects 301 to the
  gallery, `X-Robots-Tag` present, live gallery viewer loads a design inside
  its iframe under the real CSP with no errors.
- **2026-09-17, photo push.** Same render pass on all four with her photo, no
  errors, no overflow. Live site re-checked: `feature.jpg` serves the new file
  (243,832 bytes), all four pages carry the new alt text and zoomed crops, no
  "stand-in" wording anywhere, browser pass on the live gallery and all four
  designs clean.
- **Not checked:** Safari, Firefox, a real phone, Lighthouse, and sending picks
  to the live feedback function.
