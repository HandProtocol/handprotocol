# Untouchable Freedom — design portfolio brief

Website remake for Hannah's shop, **Untouchable Freedom Collective**
(https://untouchable-freedom-collective.myshopify.com/). The store sells one
thing: *Untouchable Freedom*, a 181-page guided journal, $27.00. Hannah will
pick a direction from a gallery of finished one-page sites; each style is a
complete, standalone page built from the same copy and the same images.

Everything below is the source of truth. If something is not in this file,
do not put it on the page.

## Where things go

```
web/project/untouchable-freedom/
  assets/               shared images (do not add or edit)
  _portfolio.js/.css    shared "← All styles · ♡ Pick this" pill (do not edit)
  <slug>/index.html     your page (required)
  <slug>/style.css      your styles (required)
  <slug>/script.js      your behaviour (optional; keep small)
```

Asset paths from your page are `../assets/<file>`. Public URL will be
`https://handprotocol.org/project/untouchable-freedom/<slug>/`.

## Hard requirements (validated)

1. `<html lang="en" data-style="<slug>">`.
2. `<meta name="robots" content="noindex">` in the head. This is a client preview.
3. `<title>Untouchable Freedom — <Style name></title>` (the gallery pill reads the name after the dash; this is the only allowed dash of that kind on the page).
4. Last thing in `<body>`: `<script src="../_portfolio.js" defer></script>`.
5. Fonts: Google Fonts only, at most two families, `display=swap`, preconnect both hosts. No other external resource of any kind: no CDNs, no frameworks, no icon fonts, no remote images.
6. Every image comes from `../assets/`. Use `loading="lazy"` on everything below the hero, `decoding="async"`, real `alt` text, and `width`/`height` attributes.
7. Responsive from 360px to 1600px. Zero horizontal overflow at 390 and 1440. Tap targets at least 44px on phone.
8. `prefers-reduced-motion: reduce` must stop every animation and transition that moves things. Keep opacity-only fades if you want.
9. No console errors. No `alert`, no external fetch, no localStorage except the pill's own.
10. Budget: index.html + style.css + script.js together under 60 KB.
11. **Zero em dashes** (the character —) anywhere in your HTML, CSS, or JS except the `<title>` rule above. Use commas, periods, or colons. Hannah's copy already has none.
12. Semantic HTML: one `h1`, real `section`s with headings, `nav` with `aria-label`, skip link to `#main`, visible focus styles.
13. Nothing invented. No testimonials, reviews, star ratings, author bio or author name, "as seen in", press quotes, shipping or delivery promises, discount codes, countdown timers, social handles, phone numbers, email addresses, or physical addresses. If you want a section that needs any of those, do not build it.

## The page must contain (order is yours)

- **Header / nav**: brand "Untouchable Freedom Collective", links to the on-page sections, and one link out to the store's Contact page (see Links).
- **Hero**: the h1 "Untouchable Freedom" and the hero sentence. One primary action that goes to the journal ("View The Journal" or your own wording of it) and, if you like, a secondary "Add to cart, $27.00".
- **The journal (product)**: the cover image, the name "Untouchable Freedom", the price "$27.00", an **Add to cart** action (see Links) and the full product description block.
- **What's inside**: the six bullets, "181 pages", "12 chapters".
- **The journey**: the four stages and the closing section, from the journal's own table of contents (below). This is the strongest content the store does not currently show. Make it a real moment.
- **The mirror**: the "not just a journal. It is a mirror." block.
- **A space for honesty**: the five-line block.
- **Inside pages**: at least two of the four interior page images, presented as pages of a book (not as raw screenshots).
- **Join**: the newsletter block with the real Shopify form (see Links).
- **Footer**: "© 2026 Untouchable Freedom Collective", links to Terms of service, Privacy policy, Refund policy (see Links), and a small "Design preview by HAND Protocol" line linking to https://handprotocol.org/.

## Verbatim copy (do not rewrite; you may split lines and choose emphasis)

Announcement bar: `A journey inward.`

Brand: `Untouchable Freedom Collective`

Page title / SEO: `Untouchable Freedom | A Guided Journal for Self-Discovery`
Meta description: `Untouchable Freedom is a guided journal for reflection, identity, healing, and transformation. Confront, release, and rewrite the story you carry.`

Hero h1: `Untouchable Freedom`
Hero sentence: `Untouchable Freedom is a guided journey through reflection, identity, and emergence.`
Hero button: `View The Journal`

Cover tagline (printed on the cover): `For Self Healing and Transformation`

Quote band: `You do not return as who you were.`

The mirror block (eyebrow on the store is "Our shop"):
```
Untouchable Freedom is not just a journal.
It is a mirror.
Inside are poems, reflection pages, declarations, and identity work designed to pull truth to the surface.
Each chapter invites you to confront, release, and rewrite the story you carry.
```

A space for honesty block:
```
This is a space for honesty.
A space for grief.
A space for rebirth.
You don't read it once.
You return to it as you change.
```

Product name: `Untouchable Freedom`
Price: `$27.00`
Product description:
```
A 181-page guided journal for transformation, reflection, and becoming.

Inside you'll find:
• 12 transformational chapters
• Reflection exercises
• Identity work prompts
• Poems and declarations
• Guided journaling pages
• Space to release old stories and rewrite new ones

This is not a workbook.
It is a mirror.

Designed to be revisited throughout different seasons of life, revealing something new each time you return.
```

Newsletter:
```
Join to discover more of you.
Receive reflections, journal prompts, and quiet reminders for becoming who you are meant to be.
[Email]  Sign up
```

Footer: `© 2026 Untouchable Freedom Collective` · `Terms and Policies` · `Privacy policy` · `Refund policy`

### The journey (from the journal's table of contents)

Use these exact titles. Roman numerals are part of the design of the book.

```
Stage I. The Fall
  I. Shattered
  II. Escape
  III. Pain
  IV. Gone

Stage II. The Returning
  V. Isolation
  VI. I Tried It All
  VII. I Love You
  VIII. Unnamed

Stage III. The Rising
  IX. The Loss of a Protector
  X. Perfection
  XI. Release

Stage IV. The Freedom
  XII. Alone

Closing Section
  Reflection Pages
  Page of Emergence
  Closing Declaration
```

Sample prompt from the journal (the only prompt you may quote):
`Shattered Seal` · `What do I need to tell my past self and my future self now?`

Chapter opener shown in the pages: `Chapter I` · `Shattered`

## Images (`../assets/`)

| File | Size | What | Use |
|---|---|---|---|
| `cover.webp` | 1000×1294 | The journal cover: black marble, gold veins, white script | Product, hero |
| `cover-sm.webp` | 480×621 | Same, small | Thumbnails, cards |
| `page-contents-1.webp` | 900×1077 | Table of contents, stages I and II | Inside pages |
| `page-contents-2.webp` | 900×1058 | Table of contents, stages III, IV, closing | Inside pages |
| `page-poem.webp` | 900×1158 | Chapter opener "Chapter I · Shattered" | Inside pages |
| `page-reflection.webp` | 900×1166 | Reflection page "Shattered Seal" with the prompt and lines | Inside pages |
| `sea-stacks.webp` | 2000×1333 | Sea stacks in a grey ocean (the store's current hero) | Backgrounds |
| `rock-water.webp` | 2000×1333 | A dark rock in moving water | Backgrounds |
| `pebbles.webp` | 2000×1333 | Pebbles suspended over water | Backgrounds |

The three landscape photos are the Shopify theme's stock images, not Hannah's.
Use them freely for the preview, but the cover and page images are the real
brand: build the identity from those. The cover's palette is charcoal
(#2a2a2a to #515151), near-black, thin gold veins (#c9a45c-ish), white script.

## Links (the only external links allowed)

- View the journal: `https://untouchable-freedom-collective.myshopify.com/products/untouchable-freedom`
- Add to cart (goes straight to the cart with the journal in it): `https://untouchable-freedom-collective.myshopify.com/cart/add?id=45694516822177&quantity=1`
- Contact: `https://untouchable-freedom-collective.myshopify.com/pages/contact`
- Terms: `https://untouchable-freedom-collective.myshopify.com/policies/terms-of-service`
- Privacy: `https://untouchable-freedom-collective.myshopify.com/policies/privacy-policy`
- Refunds: `https://untouchable-freedom-collective.myshopify.com/policies/refund-policy`
- HAND Protocol: `https://handprotocol.org/`

Newsletter form (real; signups land in Hannah's Shopify customer list). Use exactly this shape, style it however you like:

```html
<form action="https://untouchable-freedom-collective.myshopify.com/contact#contact_form" method="post" accept-charset="UTF-8">
  <input type="hidden" name="form_type" value="customer">
  <input type="hidden" name="utf8" value="✓">
  <input type="hidden" name="contact[tags]" value="newsletter">
  <label for="join-email">Email</label>
  <input id="join-email" type="email" name="contact[email]" required autocomplete="email" placeholder="Email address">
  <button type="submit">Sign up</button>
</form>
```

External links open in the same tab except the Contact and policy links, which may use `target="_blank" rel="noopener"`.

## Craft bar

This is a portfolio piece Hannah will judge in ten seconds and then live with for a minute. Each style is an opinionated world, not a template with a palette swap.

- One idea, fully committed. The style's name is the idea. Every section should feel like it belongs to that world.
- A hero that is a moment: the first screen should be worth a screenshot.
- Typography does the heavy lifting: a real scale (at least four distinct sizes), tight display leading, generous body leading, measured line lengths (55 to 70 characters).
- The four stages deserve a design, not a list. Think about how "The Fall → The Returning → The Rising → The Freedom" can be felt.
- The product block must actually sell: cover large, price clear, one obvious button.
- Motion is seasoning: entrance reveals on scroll, one signature effect at most, all under 600ms, all off under reduced motion.
- Phone first in your head: most of Hannah's visitors will be on a phone from a social link.
- Contrast: body text at 4.5:1 minimum, no light grey on white.

## Style assignments

| Slug | Name | Idea | Fonts | Palette anchors |
|---|---|---|---|---|
| `marble` | Marble | The cover, expanded into a room: black marble, thin gold veins, white script, candlelit. Gold vein lines drawn as SVG paths that trace themselves as you scroll. The cover floats with a soft light behind it. Quiet, luxurious, intimate. | Pinyon Script (display, echoing the cover script) + Cormorant Garamond | #121212, #2a2a2a, #c9a45c gold, #f2ede4 ivory |
| `shore` | Shore | The current store, done properly: ivory, slate, sea. Sea-stacks hero with a soft fade to page, big editorial serif, a real grid, a product card with depth, the quote band over the rock-in-water photo. Calm and confident. | Newsreader + Inter | #f6f4ef ivory, #1f2428 slate, #6b7a86 sea-grey, #c9a227 the store's mustard as a single accent |
| `mirror` | Mirror | "It is a mirror." Museum-white, black type, enormous. The cover shown with its own reflection beneath it (flipped, masked, faded). Thin rules, extreme whitespace, hairline grid. The four stages as a single vertical line you descend. | Cormorant Garamond (light) + Inter Tight | #fafafa, #111, #8a8a8a, one hairline #dcdcdc |
| `ember` | Ember | Warmth after the fall: blush, terracotta, cream, a soft glow behind the cover. Rounded cards, the four stages as a horizontal "seasons" strip, the pebbles photo given a warm duotone with CSS blend modes. Soft, feminine, hopeful. | Fraunces (soft optical, wide) + Nunito Sans | #fbf1ea cream, #e8b4a2 blush, #b5573a terracotta, #3a2a26 deep brown, #e7c77f gold |
| `passage` | Passage | The journey is the page: four full-height chapters that move from deep charcoal (The Fall) through slate (The Returning) and dawn (The Rising) into light (The Freedom) as you scroll, background colour changing with scroll position. A fixed chapter rail (I · II · III · IV) tracks where you are. Cinematic. | Playfair Display + Manrope | #0f0f10, #2b2f36, #b98c5a dawn, #f4efe6 light |
| `paper` | Paper | The journal itself: cream stock, faint ruled lines, ink-blue headings, handwritten accents for prompts. Interior pages shown as sheets stacked with a slight rotation. The sample prompt written out in the hand font above a real textarea the visitor can type into ("for you only, nothing is saved", and truly do not save it). Tactile, intimate. | Libre Baskerville + Caveat | #f5efe3 cream, #1d2a44 ink, #7c6f5c pencil, #b23a3a one red |
| `static` | Static | Loud and young: black, white, and the store's acid yellow. Stacked condensed type "UNTOUCHABLE / FREEDOM" filling the screen, film grain overlay, a marquee of the twelve chapter titles, hard-edged buttons, offset borders. Poster energy for a social-first audience. | Bebas Neue + Space Grotesk | #0a0a0a, #ffffff, #e8d21c yellow, #ff5c1a one hot accent |

## Before you finish

Run through this list yourself:

- [ ] All 13 hard requirements above.
- [ ] Every required section present, copy verbatim.
- [ ] The four stages and closing section, exact titles.
- [ ] Add to cart link is the `cart/add` URL; View the journal is the product URL.
- [ ] Newsletter form posts to the Shopify contact endpoint with the hidden fields.
- [ ] `grep -c "—"` on your three files returns 0 lines outside the title.
- [ ] Open at 390 and 1440 in your head: nothing overflows, nothing is smaller than 14px body.
