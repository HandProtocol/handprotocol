# Review tools for the design-style portfolio

All Playwright scripts drive gstack's install with Chromium's sandbox off
(this machine blocks the sandbox — see memory `machine-headless-chromium-sandbox`).
Run from Claude with `dangerouslyDisableSandbox: true`, or from a normal shell.

```
node tools/validate.mjs [slug…]     # static checks vs design-portfolio-brief.md (SVG path data is ignored by the phone-number check)
node tools/shot.mjs <slug> [outdir] # desktop + mobile PNGs, console errors, overflow → /tmp/thh-shots
node tools/thumbs.mjs <slug…>       # regenerates web/threehandshealing/styles/_shots/<slug>.webp + -m.webp
# originals: node tools/thumbs.mjs "gateway=file:///…/web/threehandshealing/index.html?design=gateway"
node tools/gallery-e2e.mjs [url]    # gallery smoke test: card counts, Bedazzled filter, viewer, pick → tray, broken thumbs
python3 tools/register-bedazzled.py <build-results.json>   # one-off: inserted the ten bedazzled cards into gallery.js (already run)
```

## Claude workflow scripts (`tools/workflows/`)

Not node tools — pass them to Claude Code's `Workflow` tool via `scriptPath`.

- `bedazzled-build.js` — the full build → independent review → fix → re-review
  pipeline that produced the ten bedazzled styles (2026-09-02→03). Reads the
  brief, `design-portfolio-brief-bedazzled.md`, and a per-style card. Its
  `args.cards` were `[{slug,name}…]` and it expects the cards at
  `<scratch>/cards/<slug>.json`; today the cards live in
  `threehandshealing/bedazzled-cards/`. Only re-run it to build *new* styles.
- `bedazzled-review.js` — the resume point: review → fix → re-review over
  already-built pages. `args: { scratch, slugs }` (omit `slugs` for all ten).
