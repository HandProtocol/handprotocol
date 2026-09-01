# Three Hands Healing — design portfolio brief (shared by every style builder)

Read all of this before writing a line of code. Every style page is judged
against it. The client is Maria, a healing practitioner in Texas; the visitor
is someone in pain, tired, or stuck, who needs to feel *safe* within five
seconds and *able to take one small step* (book) within a minute.

## What you are building

One standalone one-page site at
`web/threehandshealing/styles/<slug>/index.html` (+ optional sibling
`style.css` / `script.js` — no build step, no frameworks, no bundlers).
It is one of 14 style explorations shown side by side in a portfolio gallery
so Maria can pick a direction. Each page must look like a **finished,
shippable site in that style**, not a mood board. Same copy, same photos,
completely different world.

The existing preview (three directions: Gateway / Meadow / Forest) lives at
`web/threehandshealing/index.html` — glance at it for the baseline and the
brand mark, then leave it alone. Your page must **not** look like it.

## Hard requirements (a page failing any of these is rejected)

1. Paths: photos `../../assets/imageN.jpeg`, hero video
   `../../assets/hero-eft-desktop.webm` + `.mp4` (poster
   `../../assets/hero-eft-poster.jpg`), mobile video
   `../../assets/hero-eft-mobile.webm/.mp4`. GSAP + ScrollTrigger are at
   `../../vendor/gsap.min.js` and `../../vendor/ScrollTrigger.min.js` if
   you want them (optional; vanilla CSS/JS is fine).
2. Google Fonts via `<link>` are allowed (`fonts.googleapis.com`). Pick
   faces for *this* style; do not use DM Sans / DM Serif Display (that is
   the baseline) unless the style card says so.
3. `<html lang="en" data-style="<slug>">`, `<title>Three Hands Healing — <Style
   name></title>`, `<meta name="robots" content="noindex">`, a
   `<meta name="theme-color">` matching your palette, a viewport meta.
4. Last thing before `</body>`:
   `<script src="../_portfolio.js" defer></script>` — this injects the
   gallery's "← All styles · ♡ Pick this" pill. Do not style or reference it.
5. Sections, in this order (anchor ids in brackets; the nav links to them):
   header/nav · hero [#top] · validation [#alone] · how we work together, the
   two pillars + six modalities [#practices] · what a session feels like, three
   steps [#session] · about Maria [#about] · book [#book] · footer.
   You may add a small pause/breath moment, a quote, or a signature
   interaction; you may not drop a section.
6. Copy: use the copy below **verbatim where marked verbatim**. No invented
   testimonials, reviews, prices, addresses, phone numbers, emails, or
   credentials — ever. Booking is a CTA to `#book` with the placeholder
   lines given below.
7. Responsive 390 px → 1440 px with no horizontal overflow; keyboard focus
   visible; `prefers-reduced-motion: reduce` freezes all motion; images
   `loading="lazy"` except the hero; body text ≥ 16 px; contrast readable
   (AA on body text).
8. Load budget: at most 5 photos on the page, video only if the style calls
   for it. HTML+CSS+JS under ~70 KB total (fonts and media excluded).
9. Self-verify before you report: run the screenshot script (below) at both
   sizes, look at the PNGs, fix what is wrong, run again. Report only after
   the desktop and mobile shots both look finished and `errors` is empty.

## Screenshot script (run it — the harness sandbox blocks Chromium unless the
Bash call sets `dangerouslyDisableSandbox: true`)

```
cd /tmp/claude-1000/-home-koh-Documents-handprotocol-threehandshealing/12c197f4-3bb3-41b7-a8af-515684f1e7c4/scratchpad && node shot.mjs <slug>
```

It writes `shots/<slug>-desktop.png` (1440×900 first viewport),
`<slug>-desktop-full.png` (whole page), `<slug>-mobile.png` (390×844) and
`<slug>-mobile-full.png`, and prints JSON with any page/console errors and
horizontal overflow. Read the PNGs with the Read tool.

## The photos (watermarked photographer proofs — that is expected)

All of Maria, shot outdoors in Central Texas by Aneta Hayne. Portrait = tall.

| File | Size | Content | Good for |
|---|---|---|---|
| image1.jpeg | 652×982 portrait | Maria standing in an open red wooden door inside a stone archway, hand on the door, warm smile, grey layered outfit | hero/about — "gateway", thresholds |
| image2.jpeg | 642×970 portrait | Under a wide stone arch, meadow behind, Maria reaching one open hand toward the camera, smiling | connection, invitation, "reach out" |
| image3.jpeg | 646×968 portrait | Full-length, leaning against the stone archway, red door open behind, relaxed | about |
| image4.jpeg | 1200×794 landscape | Soft-focus, Maria small at left of a stone garden wall, palm behind; subject far left | wide backgrounds only; weakest |
| image5.jpeg | 1210×814 landscape | Close at the arch door, hand on the door edge, black top, pool blue behind | headers, cropped wide |
| image6.jpeg | 654×968 portrait | Dry meadow, black tank top, demonstrating EFT tapping on the side of her hand | EFT section, the tapping diagram |
| image7.jpeg | 1196×798 landscape | Meadow, blue floral kimono + rust hat, arms flung wide, joyful | hero for expansive/joyful styles |
| image8.jpeg | 1218×808 landscape | Same outfit, eyes closed, both hands on her heart, head tilted up | energy healing, stillness, breath |
| image9.jpeg | 1218×808 landscape | Kimono, standing beside green shrubs, calm direct look | about, "forest", nature |
| image10.jpeg | 640×964 portrait | Kimono, looking up and away, bright greenery | stars/sky/wonder, looking forward |
| image11.jpeg | 1212×810 landscape | Close warm smile, kimono, meadow, looking into the lens | trust, about, warm hero |
| hero-eft-poster.jpg / hero-eft-desktop.webm,.mp4 | 16:9 | Stock-style video: two women seated in a calm room, one tapping her collarbone (EFT) — NOT Maria | cinematic heroes only |

Her hair is copper-red and curly; the kimono is indigo blue with white
florals; the arch is pale limestone. These colors are real and you may build
a palette around them.

## Brand basics

- Name: **Three Hands Healing**. Practitioner: **Maria** (first name only).
- Brand mark (inline SVG, use or reinterpret in your style):
  ```
  <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6c8 0 14 5 14 12 0 8-7 10-14 24C17 28 10 26 10 18 10 11 16 6 24 6Z"/><path d="M11 31c4-7 11-7 15-4 4 4 2 10-9 13-6 1-10-4-6-9Z"/><path d="M37 31c-4-7-11-7-15-4-4 4-2 10 9 13 6 1 10-4 6-9Z"/></svg>
  ```
  (three leaf/hand shapes meeting; stroke-based, `fill:none;stroke:currentColor`).
- Six modalities, two pillars:
  - **Body & physical energy:** targeted bodywork · Candace Silvers Energy Healing · Qi Gong
  - **Mind, behavior & emotion:** EFT / Tapping · Systemic Family Constellations · intuitive emotional release
- Sessions: online or in person (Texas). Nothing else is confirmed.

## Copy (Maria's own words; keep her voice)

**Nav:** Practices · Sessions · About · **Book a session** (CTA)

**Hero** — H1 (verbatim): *Feel good in your body, at peace in your mind,
aligned in your life.*
Lede (verbatim): *Wherever you are right now is the perfect place to start.*
Eyebrow/caption (optional, pick one): "Three Hands Healing · Texas" ·
"EFT · Energy healing · Bodywork · Qi Gong · Family Constellations" ·
"Body · Mind · Spirit".
CTA: **Book a session** → `#book`; secondary: **How we work together** → `#practices`.

**Intro** (verbatim, may sit in the hero or directly after it):
> Welcome—I'm Maria. I am here to help you feel good in your body, at peace
> in your mind, and aligned in your life, relationships, and career. My
> mission is simple: to share the powerful, transformative tools that changed
> my own life so you can move beyond pain, step past invisible blocks, and
> fully reclaim your life's vitality. You don't have to navigate this
> alone—wherever you are right now is the perfect place to start.

**Validation [#alone]** — heading (verbatim): *You don't have to navigate
this alone.* Body (verbatim):
> It is so hard to blossom into who you are meant to be when you are
> navigating illness, destructive behavioral patterns, or invisible blocks. I
> have been there—and I am living proof that we can grow through our deepest
> challenges to find ourselves again in greater joy, strength, and purpose.
>
> Healing is a journey, and it is my absolute honor to walk alongside you,
> however that looks for you.

**How we work together [#practices]** — heading (verbatim): *How we work
together.* Intro (verbatim):
> True, lasting healing begins with absolute safety. First and foremost, I
> meet you right where you are with nonjudgmental presence, compassion, and
> deep listening. Together, we look at what is holding you back today—and
> where you want to expand in the future. From there, we weave together a
> tailored combination of root-cause modalities.

Pillar 1 — **For the body & physical energy** (edited for scope; use this
wording): *Support for people living with pain, tension, or illness, through
targeted bodywork, Candace Silvers Energy Healing, and supportive Qi Gong
practices.*
Pillar 2 — **For the mind, behavior & emotions** (verbatim): *Because the
mind touches every area of our health, relationships, and purpose, we work
with Emotional Freedom Technique (EFT/Tapping), Systemic Family
Constellations, and intuitive emotional release exercises.*
Closing line (verbatim): *Guided by empathic and intuitive gifts, I offer a
grounded partnership to help you clear the root causes of suffering and step
into lasting wholeness.*

Six modality blurbs (drafts, one line each — use as written):
- **EFT / Tapping** — Gentle fingertip tapping on acupressure points while
  giving voice to what you are feeling. Simple to learn, surprisingly
  powerful.
- **Candace Silvers Energy Healing** — A quiet, hands-on energy practice for
  rest, grounding, and integration. Nothing to perform, nothing to prove.
- **Bodywork** — Attentive, targeted work with the body to ease tension and
  bring back ease of movement.
- **Qi Gong** — Slow, supportive movement and breath practices you can take
  home with you.
- **Systemic Family Constellations** — A way of seeing the hidden loyalties
  and patterns we inherit, so what has been carried can finally be set down.
- **Intuitive emotional release** — Guided exercises for letting what has
  been held move through and out, at your own pace.

**What a session feels like [#session]** — heading: *What a session feels
like.* Three steps (this IS a sequence, so numbering is honest):
1. **Arrive** — Talk about what is happening and what support you are
   looking for.
2. **Experience** — Explore a practice together at a comfortable pace.
3. **Integrate** — Talk about what came up and what might be useful
   afterward.
Optional line under the heading: *Sessions are offered online and in person.*

**About Maria [#about]** — eyebrow "Meet Maria"; heading (choose): *Every
tool I share, I have needed myself.* / *A guide, not a pedestal.* Body
(verbatim):
> Every tool and modality I share in my practice comes from a place of deep
> personal experience. I know what it feels like to seek answers, which is
> why I've devoted my life to mastering the practices that continuously
> restore health, peace, and joy in my own body, relationships, and career.
>
> My practice is a space of true partnership. Guided by empathic intuition
> and powerful energy and behavioral modalities, I am here to hold a safe
> container where your pain is met with understanding, and your potential is
> given room to bloom.

**Book [#book]** — heading (choose): *When you are ready, the next step is
simple.* / *Begin where you are.* Body: *Choose a practice, find a time, and
we will take it from there. No account needed.* Then three lines of small
print, exactly: *Online or in person · Sessions in Texas* / *Booking and
contact details will be added at launch* — and the CTA **Book a session**
(it may be a non-functional button/anchor in this preview; do not fake a
form submission).

**Footer** — brand + one line "Support for a happier, healthier life." +
disclaimer (verbatim): *Three Hands Healing offers complementary wellness
support and is not a substitute for medical, mental-health, or emergency
care. If you need urgent help, contact local emergency services or a
qualified health professional.* + "© 2026 Three Hands Healing".

**Testimonials:** do not include a testimonials section. If your style
wants a quote moment, use one of Maria's lines above as a pull quote.

## Craft bar

- The hero is the thesis: open with the most characteristic thing in this
  style's world. Not "big headline + gradient + stats".
- Typography carries the personality: a characterful display face used with
  restraint, a complementary body face, a utility face if the style needs
  it. Set a real type scale. Make the type treatment memorable.
- One **signature element** — the thing the page is remembered by — executed
  superbly. Everything around it quiet and disciplined. Cut one accessory
  before you finish.
- Structure encodes meaning: the three session steps are a sequence (number
  them); the six modalities are not (do not number them); the two pillars
  are a pair (treat them as a pair).
- Motion serves the style: an orchestrated load or scroll moment beats
  scattered effects. Nothing loops that would tire a tired visitor. Respect
  reduced motion.
- Every section must be finished: spacing, alignment, hover/focus states,
  mobile stacking. Check the mobile full-page shot for orphaned words,
  cramped headings, images that crop her head off, overlapping absolute
  elements.
- Do NOT default to: warm cream + serif + terracotta accent (unless your
  card says so), near-black + acid green, or broadsheet hairline grids.
  Your card names the world; build that world.
- Self-critique with the screenshots. If the first viewport would not stop
  a designer scrolling Awwwards, it is not done.

## Reporting

When done, reply with: the slug, the files written, the fonts used, the
palette (hex), the signature element in one sentence, the screenshot JSON
(errors must be empty), and anything you consciously left out. Keep it under
200 words. Do not commit anything.
