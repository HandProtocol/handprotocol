# Review tools for the design-style portfolio

All three drive Playwright from gstack's install with Chromium's sandbox off
(this machine blocks the sandbox — see memory `machine-headless-chromium-sandbox`).
Run from Claude with `dangerouslyDisableSandbox: true`, or from a normal shell.

```
node tools/validate.mjs [slug…]     # static checks vs design-portfolio-brief.md
node tools/shot.mjs <slug> [outdir] # desktop + mobile PNGs, console errors, overflow → /tmp/thh-shots
node tools/thumbs.mjs <slug…>       # regenerates web/threehandshealing/styles/_shots/<slug>.webp + -m.webp
# originals: node tools/thumbs.mjs "gateway=file:///…/web/threehandshealing/index.html?design=gateway"
```
