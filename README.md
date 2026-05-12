# HAND Protocol

> Regenerative infrastructure for those who heal, build, and serve.

**HAND Protocol** (Holistic Approach to Nurture and Develop) is a nonprofit foundation incorporating as a 501(c)(3) in Austin, Texas in 2026. We provide long-term branding, marketing, web/dev, and one-on-one development support for **Companions** — healers, impact entrepreneurs, and grassroots community organizations doing work that matters. We don't build and bounce.

This monorepo holds the public web presence (foundation campaign + discovery research + legacy archive) and earlier Web3 tooling preserved as source history.

## Surfaces

| Path | What it is | Status |
|---|---|---|
| [`web/foundation-campaign/`](web/foundation-campaign/) | Primary public site. 501(c)(3) filing campaign, $55K minimum raise. | Live in source |
| [`web/discovery/`](web/discovery/) | Three long-form discovery docs: vision of the resource pool, research on existing skill-exchange models, national landscape map. | Live in source |
| [`web/legacy/`](web/legacy/) | Archive of HAND's earlier landing-page and crowdfunding designs. | Live in source |
| [`web/landingpage/`](web/landingpage/) | Pre-pivot Next.js Web3 starter homepage. | Preserved, not deployed |
| [`sweetspot/`](sweetspot/) | SweetSpot dApp + Solidity contracts + subgraph indexer. | Preserved, not deployed |
| [`projects/spin/`](projects/spin/) | Vite + React + TS sub-project. | Standalone |

## Documents

- **[`PRODUCT.md`](PRODUCT.md)** — strategic context: users, mission, brand personality, anti-references, design principles.
- **[`DESIGN.md`](DESIGN.md)** — visual system: colors, typography, components, spacing, motion.
- **[`AGENTS.md`](AGENTS.md)** — guide for AI coding agents working in this repo.

## Local development

The three active web surfaces are plain static HTML/CSS/JS. No build step.

```bash
cd web && python3 -m http.server 8000
```

Then open:
- http://localhost:8000/foundation-campaign/ — campaign
- http://localhost:8000/discovery/ — discovery hub
- http://localhost:8000/legacy/ — archive

The Next.js landingpage and Vite spin project have their own build flows; see their `package.json` for scripts.

## Contributing

HAND Protocol welcomes contributors. If you'd like to donate skills, partner as a Companion, or support the filing raise, reach out:

- **Email:** hand@handprotocol.org
- **Discord:** [discord.handprotocol.org](https://discord.handprotocol.org)
- **X / Twitter:** [@hand_protocol](https://x.com/hand_protocol)

For technical contributions to the website, read [`AGENTS.md`](AGENTS.md) for working conventions (no em dashes, no side-stripe borders, accessibility requirements, brand vocabulary including the term **Companions**).

## License

The code in this repository is released under the [MIT License](LICENSE). Content (documentation, copy, research notes in `web/discovery/`) is released under [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The HAND Protocol name and logo are reserved.

## Status

Pre-incorporation. The foundation campaign is currently raising the $55K minimum needed to file for tax-exempt 501(c)(3) status. Watch the [foundation campaign](web/foundation-campaign/) for the current status, or [reach out](#contributing) to support.

---

Based in Austin, Texas. Operating since 2025.
