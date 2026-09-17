# Handoff: Unfuckable With (Courtney) · 2026-09-16

New client. Courtney sells one offer, **The Energetic Reset** (mini-course,
$167 USD), under the brand **Unfuckable With**. The real site will live on
**Kajabi**. Right now the job is only to agree a design direction.

**Status (2026-09-16, late): the four design directions are LIVE at
https://handprotocol.org/project/unfuckable-with/ (short link
https://handprotocol.org/unfuckable-with), noindex. Landed on `main` as
`dbcbd3a42` (branch commit `2ad07c73a` on `agent/yuhm-network`), Netlify deploy
ready, every page, asset, redirect and header verified, and the live gallery
viewer driven in a browser with no console or CSP errors. Waiting on
(1) Courtney's image, which did not come through with the brief, so the live
pages show a stand-in stock portrait, and (2) her pick.**

## Start here (cold session)

1. Open `web/project/unfuckable-with/index.html` in a browser. That is the
   pick-one gallery (same pattern as Untouchable Freedom / Three Hands Healing).
2. Every design shows a **stand-in stock portrait**. Courtney's own image was
   meant to be attached to the brief and never arrived. Swap it first (below).
3. Nothing here is a production site. It is a preview for choosing a direction.

## Brief, as given by koH

- Name: "Unfuckable With". Hosting: Kajabi, later.
- Palette strictly **light gold, black, rose pink, white**. Nothing else.
- Include Courtney's image.
- Her current site is very basic, so: direct, not too many sections.
- At least three designs. Copy supplied in full (one offer page).

## The four directions (each color leads one)

| Slug | Leads | Idea | Fonts |
|---|---|---|---|
| `noir` | black | Lacquer black, light-gold didone. Portrait inside a three-layer "shield" of breathing gold rings with an orbiting ring of the course's verbs. Closing offer on a rose panel. | Bodoni Moda + Hanken Grotesk |
| `rose` | rose pink | Whole page is pink. Poster-weight condensed headline, black censor bars, a spinning asterisk in "sh*t", a scrolling tape of outcomes, outcomes stacked as strips, giant $167. | Archivo (one family, width + weight axes) |
| `halo` | white | The feeling after the reset. Warm white, engraved roman type, gold hairlines, oval portrait in a soft rose + gold aura, lessons on one gold thread. | Marcellus + Jost |
| `gilt` | light gold | Art-deco symmetry. Ruled frame, sunburst behind an arched portrait, rose wax-seal, outcomes on a rose band, final offer in a black dome. | Gloock + Figtree |

All four share the same five beats: hero (title, subhead, price, button,
image) → the problem → what you will experience (10) → what you will learn (7)
→ who it is for + buy. Footer is one line.

## Where things are

| What | Path |
|---|---|
| Gallery (pick page) | `web/project/unfuckable-with/index.html` + `gallery.css` + `gallery.js` |
| Design pages | `web/project/unfuckable-with/<slug>/index.html` + `style.css`, each standalone |
| Shared pick pill | `web/project/unfuckable-with/_portfolio.js` + `_portfolio.css` (preview only, delete at launch) |
| **The one shared image** | `web/project/unfuckable-with/assets/feature.jpg` (1000×1250, 4:5) |
| Gallery thumbnails | `web/project/unfuckable-with/_shots/<slug>.webp` and `<slug>-m.webp` |
| Screenshot tool | `unfuckable-with/tools/shot.mjs` |

Picks are stored in `localStorage["uw-style-picks"]` and sent through the
site's existing `/.netlify/functions/feedback` with source
"Unfuckable With styles" (tags 🧭 picks · 🎨 style). That only works once the
folder is deployed on handprotocol.org; opened from disk, sending falls back to
copying the picks to the clipboard.

## Swapping in Courtney's image

1. Save her image over `web/project/unfuckable-with/assets/feature.jpg`.
   A portrait crop near 4:5 and at least 1000px wide is ideal. All four designs
   read that one file.
2. Check each design. If her face is cropped, nudge `object-position` on the
   image rule in that design's `style.css` (`.shield__photo`, `.snap__photo img`,
   `.halo img`, `.arch__photo img`).
3. **If the image is a logo or graphic rather than a photo**, remove the
   filters: Noir renders it grayscale, Rosé renders it as a black-on-pink
   duotone (`mix-blend-mode: multiply`), Gilt warms it slightly. Halo shows it
   untouched. The circular / oval / arched crops also assume a photo.
4. Regenerate thumbnails (needs the harness sandbox off for Chromium):

   ```bash
   S=/tmp/uw-thumbs
   for s in noir rose halo gilt; do HIDE_PILL=1 node unfuckable-with/tools/shot.mjs $s $S; done
   cd web/project/unfuckable-with/_shots
   for s in noir rose halo gilt; do
     ffmpeg -y -i $S/$s-desktop.png -vf scale=960:600 -c:v libwebp -quality 84 $s.webp
     ffmpeg -y -i $S/$s-mobile.png  -vf scale=300:649 -c:v libwebp -quality 84 $s-m.webp
   done
   ```
5. Remove the "The photo is a stand-in" line from the gallery's how-to list.
6. Restore the image alt text in all four `index.html` files to
   `alt="Courtney, founder of Unfuckable With"` (it currently says stand-in,
   because claiming a stock model is Courtney on a public page would be false).

The stand-in is Unsplash photo `1671741192004-fa887bd2e62d` (free licence).
It must not ship anywhere public as if it were Courtney.

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
- Words that are mine, not hers: the button labels ("Enroll now",
  "Get The Energetic Reset", "Enroll · $167"), the eyebrow "The mini-course",
  the copyright line, and the orbit words in Noir (PROTECT, CLEAR, CUT CORDS,
  RECOVER, RECHARGE, SHIELD), which paraphrase her seven lessons.

Left exactly as she wrote them, worth a gentle mention before launch:

- "Palo-santo, sage, and breathwork **is** not enough" (three things, so "are").
- "everyday" used three times where "every day" is meant.
- "Palo-santo" is usually written "palo santo".

## Not done yet

- **Buy button.** The final button in every design is `href="#checkout"` with a
  `data-checkout` attribute. Point it at her Kajabi offer checkout URL.
- **Deployed as a preview only.** Routing lives in `netlify.toml` (two
  redirects + an `X-Robots-Tag: noindex, nofollow` header for
  `/project/unfuckable-with/*`) and `web/_redirects`. To change anything live:
  commit by path on the branch, cherry-pick onto a fresh `origin/main` worktree,
  push `HEAD:main` over HTTPS as cryptokoh, then confirm the deploy is `ready`
  through `netlify api listSiteDeploys` (site `0d46269a-789a-4e42-a00e-7f30e79c5869`).
  This handoff's status block was updated after that push, so the copy on `main`
  still says "not deployed" until the next change lands.
- **Sending picks is untested live.** The feedback function accepts any source
  label and the same flow works for Untouchable Freedom, but no real test pick
  was sent (it would ping koH's Telegram). Picks arrive as `command.feedback_pins`
  rows, source "Unfuckable With styles"; check /pins on the Command Center.
- **Her current site** was not found by search, so nothing was scraped from it.
  Ask koH for the URL if it matters (logo, socials, existing checkout link).
- **No socials, no testimonials, no bio** in any design, because none were
  supplied. A short "about Courtney" beat and two or three testimonials would
  be the first things to add to a $167 sales page.

## Moving the chosen design to Kajabi

Each design is one HTML file and one CSS file. No JavaScript is required: the
only script tag is the preview pill, which gets deleted. Motion is CSS only,
scroll reveals are progressive (`animation-timeline: view()`), and everything
honours reduced motion. Fonts are Google Fonts. That makes it portable into a
Kajabi landing page as custom code blocks (section HTML + the stylesheet in the
page's custom CSS / header code), or as the basis for a custom Kajabi theme.
Kajabi's own checkout stays the checkout.

## Verified on 2026-09-16

Headless Chromium at 1440×900, 820×1180 and 390×844, first screen and full
page, all four designs plus the gallery: no console errors, no horizontal
overflow. Gallery flow driven end to end (open a design, switch to phone view,
pick, tray shows the pick, the pick carries to the pill on the standalone
page). Not checked: Safari, Firefox, a real phone, Lighthouse, and sending
picks to the live feedback function.
