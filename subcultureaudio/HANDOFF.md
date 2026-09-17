# Handoff: (Sub)culture Audio · 2026-09-17

Austin boutique hi-fi sound system rental crew, running Hennessey Sound Design
cabinets. Current site: https://subculture.audio/ (five thin pages, monochrome,
Inter on a fisheye photo, contact form on web3forms, merch on Shopify).

koH's ask, verbatim: "scrape this site using our vercel web scrape plugin and
make them 3 new themes to select from ... and then public it to handprotocl
projects". So: a pick-one portfolio, same pattern as Unfuckable With and
Untouchable Freedom.

**Status: three themes built and verified locally; see "Publishing" for whether
it is live yet.** Nobody at (Sub)culture Audio has seen it. Who the contact is
there, and whether this is a Develop-pipeline lead, is not known to this doc:
ask koH.

## Start here (cold session)

1. Open `web/project/subculture-audio/index.html`. That is the pick-one gallery.
2. Each theme is one long page at `web/project/subculture-audio/<slug>/`.
3. Nothing here is a production site. It is a preview for choosing a direction.

## How it was scraped

Vercel's `agent-browser` 0.27.0 (run as `npx --no-install agent-browser`, with
`AGENT_BROWSER_ARGS=--no-sandbox` because Chromium's sandbox fails on this
box). `open` each of the six URLs, `get text body` for copy, `eval` for image
URLs, fonts and colours, `screenshot --full` for reference. Images were then
pulled with curl. Raw scrape lived in the session scratchpad and is gone; every
word and number that matters is in the three theme pages.

## The three directions

| Slug | Idea | Signature | Fonts |
|---|---|---|---|
| `blueprint` | The engineer's sheet. Prussian blue drawing paper, white linework, one redline colour. Their own wireframe of The Brick opens the page as an annotated elevation. | A log-scale frequency chart, 20 Hz to 20 kHz, plotting all three cabinets from their published -3dB specs. Photos print as cyanotypes and turn to colour on hover/focus. | Michroma (echoes the lettering on their schematic) + IBM Plex Sans / Mono |
| `heavyweight` | The fight poster. Haymaker, Battlehawk and Hammer are fight names and the spec sheets open with weight in lbs. Poster yellow, black wood type, one red. | A "tale of the tape": three cabinet cards side by side, weight huge, spec rows aligned across. Schematics inverted to black ink. One-ink photo prints, two pulled in red. | Big Shoulders Display + Alfa Slab One + Barlow / Barlow Condensed |
| `afterdark` | The night itself. Their event photography full-bleed and in full colour; palette sampled from it (laser cyan, stage magenta, haze violet). | The parentheses in the name ripple out from "Sub" like pressure waves: `((( Sub )))`. Cabinets stand backlit by their own stage light. Gallery is a sideways scroll-snap reel. Specs sit in a `<details>`, like their description/specs tabs. | Instrument Serif + Instrument Sans |

All three carry the same content in the same order, as one page with their
five menu labels as anchors: hero → about (who we are / what we offer) → the
system (three cabinets, full specs) → versatility (50 to 5,000) → gallery →
merch → contact form. Blueprint and Heavyweight also show the five named stack
configurations from their schematic.

## Where things are

| What | Path |
|---|---|
| Gallery (pick page) | `web/project/subculture-audio/index.html` + `gallery.css` + `gallery.js` |
| Theme pages | `web/project/subculture-audio/<slug>/index.html` + `style.css`, each standalone |
| Shared pick pill + preview-form handler | `web/project/subculture-audio/_portfolio.js` + `_portfolio.css` (preview only, delete at launch) |
| Assets | `web/project/subculture-audio/assets/` (4.2 MB) |
| Gallery thumbnails | `web/project/subculture-audio/_shots/<slug>.webp` and `<slug>-m.webp` |
| Screenshot tool | `subcultureaudio/tools/shot.mjs` |

Picks are stored in `localStorage["sca-style-picks"]` and sent through the
site's existing `/.netlify/functions/feedback` with source
"Subculture Audio styles" (tags 🧭 picks · 🎨 style). They land as
`command.feedback_pins` rows; check /pins on the Command Center. Opened from
disk, sending falls back to copying the picks to the clipboard.

## Assets, and what was done to them

All from subculture.audio. Photos are 21 of their 45 gallery images, resized to
1400-2000 px on the long edge as WebP q76. **Photographer watermarks are left
in place** (several read "Degen Exposures", one reads "(Sub)culture Audio");
`object-fit: cover` crops can push a corner watermark out of frame in a given
layout, which is a layout side effect, not removal. Afterdark credits
"Photo: Degen Exposures" under its hero because that frame's watermark is
cropped at most widths.

- `haymaker.webp`, `battlehawk.webp`, `hammer.webp`: their product renders,
  transparent background kept. They are very dark, so each theme gives them a
  light or lit backdrop (pale plate, cream sunburst, coloured glow + a
  `brightness()` lift in Afterdark).
- `mark.png`, `sca.png`, `wordmark.png`: their logos were white-on-black with no
  alpha. Rebuilt as white-on-transparent (luminance → alpha).
- `cfg-*.png`: five crops of their `Castle_Brick-1.png` schematic, one per named
  configuration (Haymaker, Hammer / Haymaker, Battlehawk / Haymaker, The Castle,
  The Brick), also white-on-transparent. Heavyweight inverts them to black with
  a CSS filter. The labels were cropped off and reset as live text.

To recut thumbnails after a design change (needs the harness sandbox off for
Chromium):

```bash
S=/tmp/sca-thumbs
for s in blueprint heavyweight afterdark; do HIDE_PILL=1 node subcultureaudio/tools/shot.mjs $s $S; done
cd web/project/subculture-audio/_shots
for s in blueprint heavyweight afterdark; do
  ffmpeg -y -i $S/$s-desktop.png -vf scale=960:600 -c:v libwebp -quality 84 $s.webp
  ffmpeg -y -i $S/$s-mobile.png  -vf scale=300:649 -c:v libwebp -quality 84 $s-m.webp
done
```

`shot.mjs` differs from the Unfuckable With copy in two ways: it waits for
`domcontentloaded` (waiting for `load` timed out here), and it scrolls the page
before full-page captures so `loading="lazy"` images are actually fetched.

## Copy: what is theirs and what is mine

Their words are used verbatim, including "aside: these things are powerful.
like POWERFUL. end aside." Spec values are theirs, reformatted only (units
spaced, "60hz-20khz" → "60 Hz – 20 kHz", "Qty" → "Quantity").

Words that are mine, not theirs:

- Buttons: "Start an inquiry", "See the system", "Shop t-shirts on Shopify".
  Their form button says "Send Inquiry" and all three themes keep that.
- Blueprint: "Three cabinets, one full range." and the two sentences under it;
  the chart's band names (sub bass / bass / mids / highs, the usual audio
  convention, boundaries at 60 Hz, 250 Hz, 4 kHz); the title-block labels
  (Speakers, Capacity, Service area, Crew) and "On site, setup to teardown",
  which paraphrases their Service line; "Front elevation"; the word
  "Configurations".
- Heavyweight: "tale of the tape", "Any room, any crowd", and the strip
  "Hennessey Sound Design speakers".
- Afterdark: nothing new. "Let's make your event unforgettable." is their line
  from the About page.
- Gallery page: all of it (it speaks to them, not to their customers).

Things on their current site worth a gentle mention:

- The footer says **© 2027**. The previews say © 2026.
- Footer reads "Austin. Texas." (full stop). Previews use a comma.
- Merch copy says the on-site store is coming; all three themes link to
  `https://subcultureaudio.myshopify.com/` as theirs does today.
- The Hammer's dimensions are listed D×W×H 32 × 48 × 24 in, but its render
  stands taller than it is wide. Either the render is the cabinet on end or the
  W and H are swapped. Dimensions are shown exactly as published; nobody should
  draw per-axis dimension lines on the render until they confirm.

## Not done yet

- **The contact form sends nothing.** `data-preview-form` forms are intercepted
  by `_portfolio.js` and show "Preview only: nothing was sent." Their live form
  posts to web3forms with their own access key, which was deliberately not
  copied. Wire it when a direction is chosen.
- **Sending picks is untested live.** Same flow as the other two portfolios, but
  no real test pick was fired (it pings koH's Telegram).
- **Five pages became one.** If they want separate pages back, every theme
  splits cleanly at its section boundaries.
- **No pricing, no testimonials, no client list, no FAQ**, because their site
  has none. A rental business would convert better with a "what a booking
  includes" beat and two or three named events. Ask them.
- **Photo permissions.** These are their own site's photos shown back to them
  on a noindex preview. Before any of this goes to a real production build,
  they should confirm they hold usage rights for the Degen Exposures frames.
- Not checked: Safari, Firefox, a real phone, Lighthouse.

## Verified on 2026-09-17

Headless Chromium, 1440×900, 820×1180 and 390×844, first screen and full page,
all three themes plus the gallery: no console errors, no page errors, no
horizontal overflow. Then driven end to end over a local static server: gallery
renders three cards, viewer opens with the right page, phone mode is 390 px,
arrow keys step themes, a pick shows in the tray and carries to the pill on the
standalone page, the preview form shows its notice in all three themes, every
`#anchor` resolves, every image loads, the specs disclosure opens. The global
CSP in `netlify.toml` was checked against the pages: no inline scripts or
handlers, fonts only from Google's two hosts, everything else same-origin.

## Publishing

Routing lives in `netlify.toml` (two redirects + an
`X-Robots-Tag: noindex, nofollow` header for `/project/subculture-audio/*`) and
`web/_redirects`. Short link: `/subculture-audio`.

To change anything live: commit by path on the working branch (another Claude
session shares this checkout, so never `git add -A`), cherry-pick onto a fresh
`origin/main` worktree, push `HEAD:main` over HTTPS as cryptokoh, then confirm
the deploy is `ready` through `netlify api listSiteDeploys`
(site `0d46269a-789a-4e42-a00e-7f30e79c5869`).
