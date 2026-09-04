# Bedazzled batch — addendum to `design-portfolio-brief.md`

Read `design-portfolio-brief.md` first; every hard requirement there still
applies (paths, meta tags, section order + ids, verbatim copy, no invented
contact/prices/testimonials, responsive 390→1440, reduced motion, ≤5 photos,
≤70 KB code, `../_portfolio.js` last). This file changes only the **craft
bar** for the ten styles in the second batch, built 2026-09-02.

## Why this batch exists

Maria has seventeen styles to look at. The first fourteen were built to a
"one signature element, everything else quiet" bar. She asked for ten more
that are **creative, bedazzled, and beautiful — with extra CSS elements
based on the copy.** So this batch sits at the opposite pole: **ornate**.

## The bedazzled bar (replaces "Craft bar" in the brief for these ten)

1. **Ornament is the point.** Rich, layered, jewel-like, generous. A visitor
   should feel the page was *made for her by hand*. Restraint is not the
   goal here; finish is. Every ornament must still be crisp at 390 px and
   never sit on top of text.
2. **Every ornament comes from the copy.** Each decorative element is a
   literal visualization of a phrase in Maria's words (see the phrase bank
   below), built in CSS / inline SVG — no raster art, no icon fonts, no
   emoji. Your style card lists at least five; build all of them, and add
   more if the world wants them. Put a one-line HTML comment above each
   ornament naming its phrase (`<!-- ornament: "weave together" — woven ribbon border -->`)
   so a reviewer can trace it.
3. **Readable first.** Body text ≥ 16 px, AA contrast on all copy, headings
   never over busy texture without a plate/scrim. Ornaments are `aria-hidden`
   and `pointer-events:none` unless they are interactive on purpose.
4. **Motion is orchestrated, not scattered.** One arrival moment, one or two
   scroll moments, small hover delights. Anything that loops must be slow
   (≥ 6 s) and low-contrast — a tired visitor must never feel chased.
   `prefers-reduced-motion: reduce` freezes everything to its finished state.
5. **The type pairing is fresh.** Do not use any display face already in the
   gallery (Bodoni Moda, Fraunces, Cormorant Garamond, IBM Plex, Sora, Noto
   Serif Display, Unbounded, Marcellus, Archivo Black, Newsreader, Shrikhand,
   Anton, Caveat, Special Elite, Bricolage Grotesque, DM Serif Display / DM
   Sans). Use the faces on your card.
6. **Structure still encodes meaning:** the three session steps are a
   numbered sequence; the six modalities are unnumbered and the two pillars
   are a pair. Ornament may decorate that structure; it may not blur it.
7. **Finish every section.** Check the full-page shots at both sizes for
   orphaned words, cramped headings, images cropping her head, overlapping
   absolute elements, ornaments spilling past the viewport (horizontal
   overflow is a hard fail), and the fixed portfolio pill covering a CTA
   on mobile (leave ≥ 72 px of bottom padding on the last section).

## Phrase bank (Maria's copy — ornaments must trace to one of these)

"Feel good in your body / at peace in your mind / aligned in your life" ·
"wherever you are right now is the perfect place to start" · "blossom into
who you are meant to be" · "invisible blocks" · "living proof" · "grow
through our deepest challenges" · "joy, strength, and purpose" · "healing is
a journey" · "walk alongside you" · "absolute safety" · "meet you right
where you are" · "deep listening" · "what is holding you back" · "where you
want to expand" · "weave together a tailored combination" · "root-cause
modalities" · "body & physical energy" · "mind, behavior & emotions" ·
"empathic and intuitive gifts" · "grounded partnership" · "clear the root
causes of suffering" · "lasting wholeness" · "Arrive / Experience /
Integrate" · "every tool I share, I have needed myself" · "a guide, not a
pedestal" · "a safe container" · "your potential is given room to bloom" ·
"when you are ready, the next step is simple" · "begin where you are" ·
"three hands" (the brand) · "tapping on acupressure points" · "set down what
has been carried" · "let what has been held move through and out" · "online
or in person · Texas".

## Local tools (run these; they are the review harness)

The screenshot path in the brief is stale. Use the repo tools instead. Both
drive Playwright with Chromium's sandbox off — **every Bash call that runs
them must set `dangerouslyDisableSandbox: true`** or Chromium will not
launch.

```
# static checks vs the brief (ids, meta, verbatim copy, fonts, ≤5 photos, size, no contact/prices)
node /home/koh/Documents/handprotocol/threehandshealing/tools/validate.mjs <slug>

# desktop 1440×900 (viewport + full page) and mobile 390×844 (viewport + full page)
# → <outdir>/<slug>-desktop.png, -desktop-full.png, -mobile.png, -mobile-full.png
# prints JSON; `errors` must be [] (page errors, console errors, horizontal overflow)
node /home/koh/Documents/handprotocol/threehandshealing/tools/shot.mjs <slug> <outdir>
```

Use your own `<outdir>` under the session scratchpad so parallel builders do
not overwrite each other. Look at all four PNGs with the Read tool before
you report. Fix, re-shoot, look again. A page is done when both viewports
look finished, `validate.mjs` prints ✓, and `errors` is `[]`.

## Reporting (structured — the workflow reads it)

Slug · files written · fonts · palette (5 hex) · the signature element in one
sentence · a one-line gallery description in the voice of the existing cards
in `styles/gallery.js` (≤ 110 characters, e.g. "Candlelit stone: near-black,
gold hairlines, and every photo inside an arch like the real one.") · the
list of ornaments actually built, each with its phrase · the final
screenshot JSON · anything consciously left out. Do not commit anything.
