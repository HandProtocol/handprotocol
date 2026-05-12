# Product

## Register

brand

## Users

Three audiences read this site simultaneously, by design.

**1. Donors and funders.** Individual supporters, foundations (especially Texas community foundations: Austin Community Foundation, St. David's Foundation, Hogg Foundation), trust-based philanthropy funders, and impact-aligned funders. Context: evaluating whether to support HAND's 501(c)(3) filing raise ($77,777 minimum). Reading on desktop or phone, often skimming. They want answers to: is this real? Who benefits? Where's the gap? How is HAND different from Taproot or Catchafire?

**2. Prospective Companions.** Healers and practitioners, impact entrepreneurs, and grassroots community organizations (harm reduction, mutual aid, food access, land stewardship). Context: discovering whether HAND can help them. Reading on phones in spare moments, often. Most are not crypto-native. They want answers to: what can I ask for? What's the commitment? Will you actually stay?

**3. Prospective Contributors.** Skilled professionals (web/dev, design, brand, marketing, legal, accounting) and tradespeople (roofers, electricians, bodyworkers, reiki practitioners) who might donate or exchange their time. Context: deciding whether to join the resource pool. They want answers to: how does this work? Will I be matched well? Is my time wasted?

**Job to be done:** convince a stranger in 18 minutes of reading or less that HAND has done real work, has a defensible thesis, knows the existing landscape, and is worth either funding, joining as a Companion, or contributing skills to.

## Product Purpose

HAND Protocol (Holistic Approach to Nurture and Develop) is a regenerative-infrastructure nonprofit foundation, based in Austin, Texas, incorporating as a 501(c)(3) in 2026. Its core promise: long-term branding, marketing, web/dev, and one-on-one development support for Companions (healers, impact entrepreneurs, grassroots community organizations), without abandoning anyone after the first delivery.

The public web presence (foundation campaign, discovery docs, legacy archive) exists to:

- Fund the $77,777 minimum filing raise
- Signal credibility to funders with cited research instead of vibes
- Attract the first pilot cohort of Companions and Contributors
- Establish HAND's distinctive position in a maturing capacity-building ecosystem (between Catchafire-style marketplaces and trust-based grantmakers like Kataly or Solidaire)
- Preserve the project's evolution honestly, including the pivot away from crypto-first framing

**Success looks like:** $77,777 raised → 501(c)(3) filed within 12 months. Three pilot Companions onboarded during incorporation. Ten Contributors and five Companions active in the first quarter post-filing. Discovery docs cited by funders as evidence of seriousness. The term "Companions" adopted by participants.

## Brand Personality

Three words: **earnest, evidence-based, relational**.

**Voice characteristics:**

- Plain English over institutional speak. "We don't build and bounce" not "we ensure post-engagement continuity."
- Honest about unknowns. Every long-form doc has an open-questions section that names what HAND hasn't figured out yet (tax mechanics for the exchange layer, scope-creep prevention, who pays for HAND itself).
- Specific over abstract. Names actual people in the worked examples (Marcus the roofer, Anya the reiki practitioner, Río Verde Collective), actual peer organizations (Catchafire, Taproot, Bridgespan, Solidaire, Kataly, Hemera, NDN Collective), actual dollar amounts and dates.
- Skeptical of itself. The discovery docs include skepticism checks ("Is HAND reinventing Taproot? No, but be precise about why"). Bridgespan-style aspirational rhetoric is rejected.
- Relational and warm, but not soft. "We walk alongside Companions" coexists with "the unit economics of a team that walks with a healer for three years need to be defensible."
- Crypto-adjacent without being crypto-first. Web3 work is acknowledged as one of several tools, never as the identity. The crypto layer is opt-in for Contributors and Companions, never required.

**Emotional goals:**

- A funder should feel: this is real, this person has done the work, they understand the landscape, they see the gap, they're not faking it.
- A Companion should feel: they actually see me, they're not going to disappear, this isn't transactional.
- A Contributor should feel: this is curated, my time will land well, this is more than a marketplace.

## Anti-references

Things HAND explicitly should NOT look or sound like.

- **Aspirational nonprofit cliché.** Stock photos of diverse hands holding plants, "Together we are stronger" headlines, gradient sunrise backgrounds. Most healing-justice nonprofit landing pages.
- **Web3 / crypto-bro aesthetic.** Dark backgrounds with neon accents, mascot characters, "DeFi for Good" framing, token-gating language. The earlier HandProtocol landing page that now lives in `/legacy/` had elements of this and was retired for it.
- **SaaS hero-metric template.** "5x faster / 99% uptime / 50K users / $1M raised" four-up big-number grids. Caught and removed in the impeccable audit; replaced with key-value definition lists for factual data.
- **Bridgespan / McKinsey institutional language.** "We partner with stakeholders to drive transformative outcomes." HAND actively rejects this voice.
- **Build-and-bounce agency portfolio look.** Case-study slabs with hero photography. HAND emphasizes ongoing accompaniment, not deliverables.
- **Side-stripe accent borders, glassmorphism-as-decoration, identical card-grid monoculture, em dashes as default punctuation.** All flagged in the impeccable audit and removed.

## Design Principles

1. **Prove, don't promise.** Specific dollar amounts, named peer organizations, real worked examples (Marcus, Anya, Río Verde) over aspirational claims. The discovery research docs lead with cited sources.
2. **Plain English first.** A donor or a healer should understand any sentence without a glossary. Technical detail (IRS 501(c)(3) doctrine, quadratic-funding mechanism) is annotated inline with tooltips or links, not assumed.
3. **Walk alongside, on the page too.** Long-form reading is the primary medium. Cross-linked docs, persistent sub-nav, prev/next pagers; the information architecture itself reflects the accompaniment model.
4. **Honest about unknowns.** Every long-form doc has an open-questions or honest-unknowns section. Funders trust organizations that name their gaps before being asked.
5. **One family across surfaces.** Foundation campaign, discovery docs, and legacy archive share design tokens, typography, and motion. The legacy page is intentionally quieter and serif-italic to feel archival without breaking the family.

## Accessibility & Inclusion

**WCAG AA minimum** on all body text and interactive elements (4.5:1 contrast). Verified during the audit pass: muted and faint text colors were darkened to clear AA on both white and warm backgrounds.

**Keyboard accessibility.** Skip-link as the first focusable element on every page. Visible focus states on all interactive elements. Semantic HTML (`article`, `nav`, `main`, `header`, `footer`). All buttons, links, and tab controls reachable by keyboard.

**Screen reader friendly.** aria-labels on icon-only buttons (copy-address, breadcrumb, skip-link). qf-link tooltips marked `role="tooltip"`. Breadcrumb navs labeled. Section headings preserved.

**Motion respectful.** Scroll-reveal animations are short and gentle (opacity 0→1 with 16px translateY, ~600ms). No parallax, bounce, or elastic curves. A future polish pass should add `@media (prefers-reduced-motion: reduce)` overrides.

**Mobile-first responsive.** Every component has a mobile breakpoint. Sticky chrome on discovery docs collapses from two stacked bars (112px) to one (44px) under 640px. Touch targets are ≥44px on interactive elements.

**Reading-time first.** Long-form documents include reading-time estimates so visitors can budget their attention. The discovery hub offers three reading routes by reader role (funder, Contributor, Companion) so each audience can choose the shortest path to what matters to them.

**Known user constraints baked into design decisions:**

- Many prospective Companions read on phones in spare moments. Layouts must be readable at 360px wide with one thumb.
- Many Companions and Contributors are not crypto-native. The site cannot assume Web3 wallets, deep technical literacy, or desktop browsing.
- Funders read fast and skim. Hero, lede, and section labels carry most of the weight; section subtitles do the rest.
- Accessibility is mission-aligned, not just compliance. Healers and grassroots organizations serve disability communities; HAND's tooling should reflect that respect.
