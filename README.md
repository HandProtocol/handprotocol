# HAND Protocol

> Regenerative infrastructure for those who heal, build, and serve.

**HAND Protocol** (Holistic Approach to Nurture and Develop) is a nonprofit foundation incorporating as a 501(c)(3) in Austin, Texas in 2026. We provide long-term branding, marketing, web/dev, and one-on-one development support for **Reciprocates**, healers, impact entrepreneurs, and grassroots community organizations doing work that matters. We don't build and bounce.

This monorepo holds the public web presence (foundation campaign + discovery research + legacy archive) and earlier Web3 tooling preserved as source history.

## Surfaces

| Path | What it is | Status |
|---|---|---|
| [`web/foundation-campaign/`](web/foundation-campaign/) | Primary public site. 501(c)(3) filing campaign, $77,777 first goal. | Live in source |
| [`web/discovery/`](web/discovery/) | Three long-form discovery docs: vision of the resource pool, research on existing skill-exchange models, national landscape map. | Live in source |
| [`web/sovereign-reciprocates/`](web/sovereign-reciprocates/) | Sovereign Reciprocates: HAND's AI workstream as a public page. Reuses the discovery design system. | Live in source |
| [`web/governance/`](web/governance/) | Governance package: Articles, Bylaws, all policies, board governance, theory of change, strategic plan, Form 1023 narrative. | Live in source |
| [`web/legacy/`](web/legacy/) | Archive of HAND's earlier landing-page and crowdfunding designs. | Live in source |
| [`web/landingpage/`](web/landingpage/) | Pre-pivot Next.js Web3 starter homepage. | Preserved, not deployed |
| [`sweetspot/`](sweetspot/) | SweetSpot dApp + Solidity contracts + subgraph indexer. | Preserved, not deployed |
| [`projects/spin/`](projects/spin/) | Vite + React + TS sub-project. | Standalone |

## Documents

- **[`PRODUCT.md`](PRODUCT.md):** strategic context: users, mission, brand personality, anti-references, design principles.
- **[`DESIGN.md`](DESIGN.md):** visual system: colors, typography, components, spacing, motion.
- **[`AGENTS.md`](AGENTS.md):** guide for AI coding agents working in this repo.
- **[`AI-RECIPROCATES.md`](AI-RECIPROCATES.md):** Sovereign Reciprocates: HAND's AI workstream. Custom open-source agent systems per Reciprocate group, owned by the group, with the eight sovereignty principles that govern the design.
- **[`AI-EVAL-FRAMEWORK.md`](AI-EVAL-FRAMEWORK.md):** how we measure whether the agent systems are earning their place and remaining sovereign. Six dimensions, three decision gates, public quarterly reporting.
- **[`funding/mcgovern-letter.md`](funding/mcgovern-letter.md):** draft LOI to the Patrick J. McGovern Foundation for the AI workstream ($111,111 over 18 months).
- **[`governance/`](governance/):** full governance package (36 documents). Articles, Bylaws, all policies, board governance, theory of change, strategic plan, grant-readiness, Form 1023 narrative. Each at `Draft v0.1`, pending counsel review and board adoption.
- **[`funding/grant-readiness-research.md`](funding/grant-readiness-research.md):** 5,300-word research report on Texas 501(c)(3) incorporation, IRS requirements, fiscal sponsorship, board governance, succession, multi-state solicitation, AI-specific governance. Underpins the governance documents.

## Local development

The three active web surfaces are plain static HTML/CSS/JS. No build step.

```bash
cd web && python3 -m http.server 8000
```

Then open:
- http://localhost:8000/foundation-campaign/ (campaign)
- http://localhost:8000/discovery/ (discovery hub)
- http://localhost:8000/legacy/ (archive)

The Next.js landingpage and Vite spin project have their own build flows; see their `package.json` for scripts.

## Contributing

HAND Protocol welcomes contributors. If you'd like to donate skills, partner as a Reciprocate, or support the filing raise, reach out:

- **Email:** hand@handprotocol.org
- **Discord:** [discord.handprotocol.org](https://discord.handprotocol.org)
- **X / Twitter:** [@hand_protocol](https://x.com/hand_protocol)

For technical contributions to the website, read [`AGENTS.md`](AGENTS.md) for working conventions (no em dashes, no side-stripe borders, accessibility requirements, brand vocabulary including the term **Reciprocates**).

## License

The code in this repository is released under the [MIT License](LICENSE). Content (documentation, copy, research notes in `web/discovery/`) is released under [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The HAND Protocol name and logo are reserved.

## Status

Pre-incorporation. The foundation campaign is currently raising toward a $77,777 first goal ($22,222 operating minimum) to file for tax-exempt 501(c)(3) status and launch the pilot cohort. Watch the [foundation campaign](web/foundation-campaign/) for the current status, or [reach out](#contributing) to support.

---

Based in Austin, Texas. Operating since 2025.
