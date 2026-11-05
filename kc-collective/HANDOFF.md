# KC Collective: site handoff

Client: Kimberly. Brand: KC Collective (formerly Kismet Collective XIII, renamed 2026-11-01), a sanctuary for women: social meetups, circles of reflection, workshops for mind and spirit, gatherings online and in person. Replaces a Squarespace trial site (icosahedron-grapefruit-mawn.squarespace.com, private) that Kimberly used as a mood board.

Built 2026-10-14 from the mood-board photos and Kimberly's base copy.

## Star guestbook (2026-10-30, built, not deployed)

The Nightbloom "add your star" sky is now a real guestbook: leave KC Collective a message and a star with your first name joins the shared sky. If you opt in, Claude designs the star from the message and screens the message. There's a second opt-in, "show my message on the sky", which needs admin approval. The admin gets an email with one-tap approve, hide and delete buttons; the visitor gets a keepsake email with a remove link. Code, privacy table, env vars and launch steps: `kc-collective/stars/README.md`. The Nightbloom island and CSS changed and `web/kc-collective/styles/nightbloom/app.js` was rebuilt. With no backend answering, the page shows "Soon you can leave KC Collective a message here" instead of the form. 2026-10-31: the table is live on the HAND Supabase project (`command.kc_stars`, migration 061), the functions are wired into handprotocol.org (`netlify/functions/kc-stars.mjs`, `kc-star-action.mjs`) and its env vars are set; not deployed until committed to main, and no `ANTHROPIC_API_KEY` yet (plain gold stars until then).

## Review notes (2026-10-14, second look)

Feedback: likes the thirteen cards (Oracle), especially that there are thirteen and that the rainbow is present without taking over; the star sky (Constellation, Nightbloom) is "getting closer"; wants flowers and stars combined; still prefers purple; the moon should be in; likes bright, shiny, sparkly, "maybe some more metallic colors".

Response: **Moonflower** (`web/kc-collective/styles/moonflower/`), named for the flower that opens at night. Purple-first night palette (`#160f2e` night, `#2b1a57` royal, `#7b4fd1` orchid), the Constellation sky as the hero with the moon beside the headline as a circle-cropped floral photograph inside a silver ring and a thin rotating holographic ring; Oracle's deck of thirteen as the second section, restyled: royal-purple backs with a silver XIII and a 1.5px iridescent edge (the rainbow stays on edges only), pearl fronts with champagne numerals; metallics as objects, never as running text (silver and champagne gradient chips for the four phases, silver timeline, gold dots, four-point sparkles that twinkle in the hero, quote and signup); lavender-pearl paper (`#efe9fb`) for offerings and journal so it stays grounded. Both islands (deck + sky) live in one `app.jsx`, each wrapped in its own function. Gradient text was deliberately avoided (repo convention); shine comes from rings, chips, edges and sparkles.

If Moonflower is the pick: `theme.bg #160f2e`, `theme.ink #f4f0fa`, `theme.accent #e4c67a`, fonts Cormorant Garamond + Manrope, with surface tokens for royal `#2b1a57` and pearl paper `#efe9fb`.

## Review notes (2026-10-14, first look)

Feedback: the darker palette wins (night sky, stars, "darker lunar energies"); the pastel palettes are also liked; Sticker is not; the target is "ethereal yet grounded, classy".

Response: **Nightbloom** (`web/kc-collective/styles/nightbloom/`), a synthesis rather than an eleventh exploration. Night indigo and plum with the pastels used as light (an aurora glow behind the hero and the signup, the florals and bubbles as photographs) rather than as paint; champagne gold `#d9c08a` for the few drawn lines; pale lilac paper `#f3eef8` for the reading sections (offerings, gatherings, journal) so the page stays grounded; Cormorant Garamond light and italic for the voice, Manrope for everything else. The hero is Constellation's add-your-star sky; Lunar's thirteen-phase strip divides hero from body; the four phases of the cycle (Inward, Movement, Creation, Play) carry the offerings with one pastel each. Sticker's card was removed from the picker; its files stay.

If Nightbloom is the one, the port into the client engine starts from it: `theme.bg #0e0b1d`, `theme.ink #f6f1f7`, `theme.accent #d9c08a`, fonts Cormorant Garamond + Manrope, with a second surface token for the lilac paper sections.

## Where things live

| What | Path | URL once deployed |
|---|---|---|
| The site (Original direction) | `web/kc-collective/index.html`, `style.css`, `script.js` | https://handprotocol.org/kc-collective/ |
| Nightbloom and Moonflower (refined) + nine explorations + picker | `web/kc-collective/styles/` | https://handprotocol.org/kc-collective/styles/ |
| React island sources + build script | `kc-collective/src/` | |
| Image slots and photo credits | `web/kc-collective/assets/README.md` | |
| Favicon placeholder | `web/kc-collective/assets/kc-icon.svg` | |
| Copy deck (all words, sourced) | `kc-collective/copy-deck.md` | |
| This file | `kc-collective/HANDOFF.md` | |

Routing: `/kc-collective` and `/kccollective` land on `/kc-collective/` (the old `/kismet` paths were never deployed, so they were dropped in the 2026-11-01 rename). Added to `netlify.toml`, `vercel.json` and `web/_redirects` together, per AGENTS.md. The whole `/kc-collective/*` tree sends `X-Robots-Tag: noindex` until Kimberly signs off (remove the header block in `netlify.toml` and `vercel.json` at launch). `/kc-collective/styles/*` is served with `max-age=0` like the Three Hands Healing portfolio so reviews always see the latest build.

Local dev: `cd web && python3 -m http.server 8000`, then `http://localhost:8000/kc-collective/` and `http://localhost:8000/kc-collective/styles/`.

## The directions

All of them use the same copy and the same photo slots, so Kimberly is choosing a room, not content. The first five are still pages. The second five each have one interactive island built with React; nothing on them needs a server.

| Direction | Path | Type | Palette | The one loud thing |
|---|---|---|---|---|
| Original (the copy) | `web/kc-collective/` | Comfortaa + Hanken Grotesk | white, black UI, violet footer `#7a3be6`, coral quote band `#f26b7b`, blush/aqua/butter/lavender washes | Iridescent floral hero with an animated conic shimmer and SVG bubbles; black boxed buttons with a hairline inset (from the Squarespace template) |
| Nocturne | `styles/nocturne/` | Cormorant Garamond + Manrope | night `#120b1f`, plum, aurora pink/mint/lilac, gold | A slowly drifting aurora glow behind the headline; gatherings strung along a line of light |
| Petal | `styles/petal/` | Fraunces + Nunito Sans | blush paper `#fbeff1`, rose `#b8375e`, ink | Arch-cropped photographs and an editorial events table |
| Sticker | `styles/sticker/` | Fredoka + Nunito | sky `#dff3ff`, bubblegum, lemon, mint, grape `#6d3df5` | Die-cut sticker photos with white borders, outlined puffy headline, a foil XIII badge, a marquee |
| Lunar | `styles/lunar/` | Marcellus + Lora | cream `#f7f1e8`, plum `#3b1f4a`, gold `#c9a24a` | A full-moon circular hero, a strip of thirteen moon phases, the four movements of the cycle in a ring |


### The interactive five (React islands)

| Direction | Path | Type | The island | Kept in the browser |
|---|---|---|---|---|
| Garden | `styles/garden/` | Shantell Sans + Karla | Tap the meadow to plant a procedurally drawn flower (petal count, colours, lean, sway all random); "Let the wind through" gusts them | the visitor's flowers |
| Oracle | `styles/oracle/` | Italiana + Jost | Thirteen cards fanned in an arc with pointer-tracked holographic foil; draw one and it flips (3D) to a line from the manifesto plus a next step; shuffle | nothing |
| Ripple | `styles/ripple/` | Young Serif + Work Sans | Tap the hero water: concentric ripples and a word from the manifesto float up. A gooey blob (SVG goo filter) breathes 4-4-6 or 5-5-8 with a Begin/Pause control | nothing |
| Scrapbook | `styles/scrapbook/` | Caveat + Special Elite + Libre Franklin | A corkboard of draggable polaroids, torn notes and peel-off stickers (pointer drag, arrow keys to nudge, shift for bigger steps); shuffle and tidy | the board layout |
| Constellation | `styles/constellation/` | Bodoni Moda + Figtree | Thirteen named stars joined by a dotted line over a dusk sky with pointer parallax; type a first name and a gold star joins the line | the visitor's stars |
| Nightbloom (refined) | `styles/nightbloom/` | Cormorant Garamond + Manrope | The same star sky as Constellation, over night indigo with a pastel aurora; see Review notes above | the visitor's stars |
| Moonflower (refined) | `styles/moonflower/` | Cormorant Garamond + Manrope | Star sky plus the deck of thirteen, floral moon, metallic chips and sparkles; see Review notes above | the visitor's stars |

"Kept in the browser" means `localStorage` on that device only; nothing is sent anywhere. The Netlify signup form is separate and unchanged.

CSS on these five is organised as `@layer` modules (tokens, base, type, then one layer per section, then motion) so a section's rules can be lifted into the client engine's `site.css` without untangling specificity. Techniques in play: `@property` for animatable custom properties, `conic-gradient` foil driven by `--mx/--my`, `transform-style: preserve-3d` flips, SVG `feGaussianBlur` + `feColorMatrix` goo, `mask-image` wave edges, `clip-path` torn paper and serrated seed packets, `mix-blend-mode: multiply` washi tape, scroll-driven `animation-timeline: view()` behind an `@supports` guard, and `prefers-reduced-motion` fallbacks on everything that moves.

### Building the islands

Sources are `kc-collective/src/<direction>/app.jsx` (plain React 19 with `React.createElement` via esbuild's JSX transform; no hooks beyond useState/useEffect/useRef/useMemo/useCallback). The repo's CSP only allows same-origin scripts, so React is vendored, not loaded from a CDN: `kc-collective/src/vendor/entry.js` bundles `react` + `react-dom/client` into `web/kc-collective/styles/vendor/react.js` (~190 KB, ~60 KB gzipped), exposing `window.React` and `window.ReactDOMClient`.

Rebuild after editing a source:

```bash
cd kc-collective/src
npm i -D esbuild react@19 react-dom@19   # once, anywhere on the path
./build.sh                                # writes vendor/react.js and each styles/<dir>/app.js
```

The built `app.js` files are committed, so nothing needs building just to deploy.

The picker at `styles/index.html` shows a thumbnail of each (`styles/_shots/*.webp`). Those thumbnails were rendered in a sandbox that could not reach Unsplash or Google Fonts, so they show the pastel fallback washes instead of photos and fallback faces instead of the web fonts. Regenerate them after the photos are local (any full-page screenshot at 1280 wide, cropped 4:3, 800x600 webp).

## Photos

Every image is a hot-linked Unsplash placeholder picked to match the mood board (flowers floating on water, iridescent bubbles, women laughing on a lawn, a "Today I am grateful" journal, candles with smoke, a burning rose, an aurora). Credits and the slot list are in `web/kc-collective/assets/README.md`. Each image frame has a pastel gradient behind it and `onerror` hides a failed image, so a dead link never leaves a hole.

Before launch: download the ones Kimberly keeps into `web/kc-collective/assets/` and point the `src` attributes at them. Better still, replace them with her own photography; the slot list says what each one is for. The site CSP (`img-src 'self' data: https:`) already allows both.

## The signup form

Every direction has the same form, `name="kc-join"`, with `data-netlify="true"` and a honeypot. Netlify detects it at deploy time, so submissions appear under Forms in the Netlify dashboard with no backend. Turn on email notifications there and give Kimberly access, or forward to her inbox. After submitting, the page reloads with `?joined=1` and `script.js` swaps in the thank-you line. If the site is ever hosted somewhere other than Netlify, the form needs a target (Formspree, the client engine's own handler, etc.).

## Open questions for Kimberly

1. Location. The Squarespace hero said "a community farm & garden in the heart of Brooklyn, just a few steps off Vanderbilt Avenue". That reads as template placeholder text, so the site currently says "online and in person, locations shared with your RSVP". Where does the collective actually gather?
2. Contact. No email or Instagram handle was given; "write to us" and "Instagram" currently point at the signup form. Need the real address and handle.
3. Event dates. Coffee Shop Social (Aug 2), Gratitude Workshop (Jul 24), Akashic Record Circle (Jun 22) come from the old site and were shown struck through there, so they are past. They are kept as the shape of the calendar; need the next real dates or confirmation these recur.
4. The quote. "The cycles of women's lives mirror the rhythm of the Earth, each season necessary, each phase sacred" is attributed to Clarissa Pinkola Estés on the old site. I could not verify the attribution; confirm the source or present it as the collective's own line.
5. XIII. The Lunar direction leans on "thirteen moons" and the favicon has thirteen points. If XIII means something else to Kimberly, that framing changes.
6. Journal. Three post titles exist (The Power of Community, Rewards of Authentic Living, All Trauma is Collective, all dated May 23 on the old site). The one-line excerpts on the site are mine; the posts themselves still need writing or importing from Squarespace.
7. Logo. KC Collective is set in type for now. Is there a mark?
8. Offerings copy. The four offering descriptions and the four "phases" in Lunar (Inward, Movement, Creation, Play) are drawn from her paragraph about social meetups, circles, workshops and gatherings; worth a read-through in her voice.

## Next step: make it owner-editable

Once Kimberly picks a direction, port it into the client engine with the `hand-client-site` skill (see `clients/_template/README.md`: hardcoded copy becomes `${e(c.section.field)}`, `<head>` becomes `B.headTags()`, images become `B.img()`). The static pages are already structured one section per editable block. Suggested schema:

| Section id | Fields |
|---|---|
| `hero` | eyebrow, title, lede, primary CTA label, secondary CTA label, hero image, overlapping tile image |
| `about` | heading, note, lead paragraph, 3 paragraphs |
| `quote` | quote, attribution, image, 3 paragraphs |
| `offerings` | heading, note, 4 x (title, description) |
| `gatherings` | heading, 3+ x (title, month, day, time, where, description, image, link) |
| `journal` | heading, 3+ x (title, excerpt, date, image, link) |
| `moments` | heading, gallery (media rows) |
| `join` | heading, blurb, success line |
| `visit` | paragraph, contact line, 3 links |
| `footer` | tagline, copyright |

Theme for `site.config.mjs` (Original): `bg #ffffff`, `ink #1c1c1c`, `accent #7a3be6`; fonts Comfortaa (display) and Hanken Grotesk (body).

## Conventions kept

Per AGENTS.md: no side-stripe borders, no gradient text, no glassmorphism cards, no hero-metric grids, no three-identical-card-grids in a row (offerings are a definition list, events are rows or a table, journal is a list in three of the five directions). Kimberly's own copy keeps its em dashes; everything written for the repo (this file, comments, code) avoids them.
