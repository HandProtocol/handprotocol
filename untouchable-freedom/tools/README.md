# Review tools for the Untouchable Freedom design portfolio

Both drive Playwright from gstack's install with Chromium's sandbox off (this
machine blocks the sandbox). From Claude, run with `dangerouslyDisableSandbox: true`.

```
node tools/shot.mjs <slug>          # desktop + mobile PNGs, console errors, overflow → scratchpad/ufc/shots
node tools/thumbs.mjs <slug…>       # regenerates web/project/untouchable-freedom/_shots/<slug>.webp + -m.webp
node tools/validate.mjs [slug…]     # static checks against design-portfolio-brief.md
```
