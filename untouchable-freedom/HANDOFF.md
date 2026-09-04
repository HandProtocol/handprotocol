# Handoff — Untouchable Freedom (Hannah) · 2026-09-02

Website remake for koH's niece Hannah. Her shop is a one-product Shopify
store, **Untouchable Freedom Collective**, selling *Untouchable Freedom*, a
181-page guided journal at $27.00:
https://untouchable-freedom-collective.myshopify.com/

**Status (2026-09-03): the 7-style design portfolio is LIVE at
https://handprotocol.org/project/untouchable-freedom/ (noindex, also reachable
at /untouchable-freedom). Landed on `main` as `887ee2756`, Netlify deploy
`6a9a1d0f` ready, every URL, redirect, header, thumbnail, and the live viewer
verified 2026-09-03. Waiting on Hannah's picks.**

## Start here (cold session)

1. Read this file, then `design-portfolio-brief.md` before touching any style page.
2. Hannah's picks arrive as `command.feedback_pins` rows tagged 🧭 picks · 🎨 style
   with source "Untouchable Freedom styles" (plus a Telegram 🎯 Inspector ping).
   Check /pins on the Command Center first.
3. Nothing here is a production site. It is a HAND-hosted preview, noindexed.
   Do not delete styles until Hannah has chosen.

## What the current store has (scraped 2026-09-02)

- Shopify theme "Horizon" (store copy named "Updated copy of Rebel"). Besley
  serif headings on white, system sans body, a mustard CTA (#c9a227-ish).
- One product: Untouchable Freedom, $27.00, variant id `45694516822177`,
  five product images (cover + four interior page screenshots).
- Pages: Home, Catalog, Contact (Shopify contact form). Policies: terms,
  privacy, refund. Newsletter block at the bottom.
- Three landscape photos (sea stacks, rock in water, floating pebbles) are the
  theme's stock images, not Hannah's.
- Social links in the footer still point at Shopify's own placeholder handles
  (instagram.com/shopify etc.), so the remakes carry **no social links**.
- The journal's printed table of contents (in the product photos) has a few
  typos worth telling Hannah about gently: "Protetor", "Rlease", "Closinng",
  and chapter VIII is numbered "VII". The remakes use the corrected spellings.

All verbatim copy, links, and the asset table are in `design-portfolio-brief.md`.

## Where things are

| What | Path / URL |
|---|---|
| Gallery (pick page) | `web/project/untouchable-freedom/index.html` + `gallery.css` + `gallery.js` → https://handprotocol.org/project/untouchable-freedom/ (also `/untouchable-freedom`) |
| 7 style pages | `web/project/untouchable-freedom/<slug>/` (index.html, style.css, script.js), each standalone |
| Shared pill | `web/project/untouchable-freedom/_portfolio.js` + `_portfolio.css` (adapted from Three Hands Healing; picks in `localStorage["ufc-style-picks"]`) |
| Assets | `web/project/untouchable-freedom/assets/` (cover, four pages, three landscapes, all webp) |
| Thumbnails | `web/project/untouchable-freedom/_shots/<slug>.webp` + `<slug>-m.webp`, regenerate with `tools/thumbs.mjs` |
| Brief | `untouchable-freedom/design-portfolio-brief.md` (source of truth for copy rules + hard requirements) |
| Tools | `untouchable-freedom/tools/` (`validate.mjs`, `shot.mjs`, `thumbs.mjs`, README) |
| Routing | `netlify.toml` (two redirects + `X-Robots-Tag: noindex` header for `/project/untouchable-freedom/*`), `web/_redirects` |

## The seven styles

| Slug | Tag | Idea | Fonts |
|---|---|---|---|
| marble | faithful | The cover as a room: black marble, self-drawing gold veins, script display | Pinyon Script + Cormorant Garamond |
| shore | faithful | The current store done properly: sea stacks, ivory/slate, editorial serif | Newsreader + Inter |
| mirror | calm | Museum white, huge type, the cover with its reflection, stages on one line | Cormorant Garamond + Inter Tight |
| ember | calm | Blush/terracotta/cream, glow behind the cover, stages as a seasons strip | Fraunces + Nunito Sans |
| paper | calm | The journal as a website: cream stock, ruled lines, hand-written prompts, a page you can type on | Libre Baskerville + Caveat |
| passage | bold | Four full-screen chapters, background moves from charcoal to light with scroll, chapter rail | Playfair Display + Manrope |
| static | bold | Black/white/acid yellow poster, film grain, chapter marquee, hard edges | Bebas Neue + Space Grotesk |

Every page: real Add to cart (Shopify `cart/add` URL with the variant id),
real newsletter form (posts to the Shopify contact endpoint with
`contact[tags]=newsletter`, so signups land in her customer list), policy
links to the store, no invented testimonials, bio, socials, or prices.

## What happens after Hannah picks

1. Confirm the pick (or the mix) with her; ask for her real social handles,
   any photos of her own to replace the stock landscapes, and whether she
   wants the site to stay on Shopify (theme customisation) or move to a
   static site that links to Shopify checkout (the pattern the previews use).
2. If static: graduate the chosen style to `clients/untouchable-freedom/` on its
   own Netlify site and domain, following the biz graduate-to-production
   pattern (DNS zone first).
3. If Shopify: the chosen style becomes a reference for a theme build; the
   copy and structure carry over one to one.
