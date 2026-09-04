export const meta = {
  name: 'thh-bedazzled-build',
  description: 'Build ten bedazzled style pages for Three Hands Healing: build → independent screenshot review → fix → re-review',
  phases: [
    { title: 'Build', detail: 'one builder per style card, self-verified with validate.mjs + shot.mjs' },
    { title: 'Review', detail: 'independent reviewer re-shoots and reads all four PNGs' },
    { title: 'Fix', detail: 'fresh fixer addresses block/major issues, then re-review (max 2 rounds)' },
  ],
}

const cards = args.cards
const SCRATCH = args.scratch
const BRIEF = '/home/koh/Documents/handprotocol/threehandshealing/design-portfolio-brief.md'
const ADDENDUM = '/home/koh/Documents/handprotocol/threehandshealing/design-portfolio-brief-bedazzled.md'
const STYLES = '/home/koh/Documents/handprotocol/web/threehandshealing/styles'
const REF = `${STYLES}/cathedral/index.html`
const TOOLS = '/home/koh/Documents/handprotocol/threehandshealing/tools'

const COMMON = (card) => `
PROJECT: Three Hands Healing design portfolio — the "bedazzled" batch.
Read, in this order, with the Read tool:
1. ${BRIEF}  (the brief: copy, photos, brand mark, hard requirements)
2. ${ADDENDUM}  (this batch's craft bar, phrase bank, the LOCAL TOOL COMMANDS and reporting format)
3. ${REF}  (an existing finished style page — use it ONLY as a reference for the HTML skeleton: head meta, section order + ids, verbatim copy placement, the two pillars as <dl> lists, footer, the ../_portfolio.js include. Do not copy its design.)

4. ${SCRATCH}/cards/${card.slug}.json  (YOUR STYLE CARD — build exactly this world: fonts, palette, hero, signature, every ornament, motion, photos, and the risk mitigations)

Target directory: ${STYLES}/${card.slug}/  (index.html + style.css + script.js; nothing else)
Photos: ../../assets/imageN.jpeg  ·  video: ../../assets/hero-eft-*.webm/.mp4  ·  GSAP: ../../vendor/gsap.min.js + ScrollTrigger.min.js (optional)
Scratch dir for your screenshots: ${SCRATCH}/${card.slug}  (create it)

IMPORTANT tool note: Playwright needs Chromium's sandbox off on this machine. Every Bash call that runs validate.mjs or shot.mjs MUST pass dangerouslyDisableSandbox: true, e.g.
  node ${TOOLS}/validate.mjs ${card.slug}
  node ${TOOLS}/shot.mjs ${card.slug} ${SCRATCH}/${card.slug}
Then Read the four PNGs (…-desktop.png, …-desktop-full.png, …-mobile.png, …-mobile-full.png) and look at them critically.
`

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    slug: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    fonts: { type: 'string', description: 'display + body (+ utility), exact family names' },
    palette: { type: 'array', items: { type: 'string' }, description: '5 hex colors, the first is the page background' },
    signature: { type: 'string' },
    desc: { type: 'string', description: 'one-line gallery description, ≤110 chars, voice of the existing cards' },
    ornaments: { type: 'array', items: { type: 'object', properties: { phrase: { type: 'string' }, element: { type: 'string' } }, required: ['phrase', 'element'] } },
    validate: { type: 'string', description: 'the validate.mjs output line' },
    shotErrors: { type: 'array', items: { type: 'string' }, description: 'the errors array from the final shot.mjs JSON (must be empty)' },
    leftOut: { type: 'string' },
  },
  required: ['slug', 'files', 'fonts', 'palette', 'signature', 'desc', 'ornaments', 'validate', 'shotErrors', 'leftOut'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean', description: 'true only if there are no block or major issues' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['block', 'major', 'minor'] },
          where: { type: 'string', description: 'section / viewport / file:line' },
          what: { type: 'string' },
          fix: { type: 'string', description: 'concrete fix instruction' },
        },
        required: ['severity', 'where', 'what', 'fix'],
      },
    },
    ornamentCount: { type: 'integer', description: 'number of distinct copy-derived ornaments actually present in the HTML/CSS' },
    verdict: { type: 'string', description: '2-3 sentences: does this page look bedazzled, beautiful, finished, and safe for a tired visitor?' },
  },
  required: ['pass', 'issues', 'ornamentCount', 'verdict'],
}

const buildPrompt = (card) => `${COMMON(card)}
You are the BUILDER. Build this style as a finished, shippable, richly ornamented one-page site — the bedazzled bar in the addendum is your standard.
NOTE: a previous builder was interrupted mid-build. ${STYLES}/${card.slug}/ may already contain a partial index.html and/or style.css (or be empty). Read whatever is there first; keep what is good and finish it, or replace it if it is weak — the finished page is what matters, not the draft. Do not leave any file behind other than index.html, style.css, script.js.
Work through it in this order:
1. Read the four files (brief, addendum, reference page, your card). Sketch the type scale, palette variables, and the ornament inventory (every ornament on the card, each with an HTML comment naming its phrase; add more if the world calls for them).
2. Write index.html (all sections, verbatim copy, semantic markup, skip link, sticky/considered header with a mobile menu), style.css (the world — ornaments in CSS/SVG, motion with reduced-motion freeze, responsive from 390 to 1440), script.js (mobile menu + any orchestrated motion; keep it small and error-free).
3. Run validate.mjs, fix anything it flags. Run shot.mjs, Read all four PNGs, and critique yourself hard: hero stops the scroll? ornaments crisp and never over text? her head never cropped? mobile stacking clean? nothing spilling horizontally? bottom padding for the fixed pill? Fix. Re-shoot. Repeat until both viewports look finished and errors is [].
4. Report via the StructuredOutput tool (schema given). desc must read like the existing gallery card descriptions.
Constraints you must not break: no invented contact/prices/testimonials/credentials; ≤5 photos; code ≤70 KB; body text ≥16 px; AA contrast; no baseline DM fonts; no display face already used by the 17; ../_portfolio.js last before </body>; do not touch any file outside ${STYLES}/${card.slug}/; do not commit.`

const reviewPrompt = (card, round) => `${COMMON(card)}
You are an INDEPENDENT REVIEWER (${round === 0 ? 'first review' : `re-review after fix round ${round}`}). You did not build this page. Do NOT edit any file. Your job is to find what is wrong before the client sees it.
Steps:
1. Read the brief + addendum + card. Read ${STYLES}/${card.slug}/index.html, style.css, script.js in full.
2. Run validate.mjs for the slug (dangerouslyDisableSandbox: true). Any ✗ line is a block.
3. Run shot.mjs to ${SCRATCH}/${card.slug}-review${round} (dangerouslyDisableSandbox: true). Any entry in errors is a block. Read ALL FOUR PNGs and inspect them carefully, section by section, both viewports.
4. Check against the hard requirements (brief) and the bedazzled bar (addendum): section order + ids; verbatim copy present and unaltered; two pillars as a pair, six modalities unnumbered, three steps numbered; ornaments ≥5, each traceable to a copy phrase (count the "ornament:" HTML comments and confirm they exist in the render); ornaments never over text and never clipping; type pairing fresh; hero genuinely stops the scroll; readability (body ≥16 px, contrast); no cropped heads; mobile stacking; no overlapping absolute elements; last section leaves room for the fixed pill; reduced-motion rule present; no invented contact/prices/testimonials; ≤5 photos; ≤70 KB.
5. Is it actually BEDAZZLED and BEAUTIFUL — would a designer stop scrolling? If it reads as plain, restrained, or template-like, that is a major issue (say what ornaments/texture/moment it lacks, concretely).
Severity: block = violates a hard requirement or errors non-empty; major = visibly unfinished, unreadable, or not bedazzled; minor = polish. pass = no block and no major. Be specific — every issue needs a where and a concrete fix. Return via StructuredOutput.`

const fixPrompt = (card, review, round) => `${COMMON(card)}
You are the FIXER (round ${round}). An independent reviewer found the issues below in ${STYLES}/${card.slug}/. Fix every block and major issue; fix minors when cheap. Preserve the world and the ornaments — this is repair, not redesign, unless the reviewer says the page is not bedazzled enough, in which case add the concrete ornaments/moments they asked for. Then run validate.mjs and shot.mjs (dangerouslyDisableSandbox: true) to ${SCRATCH}/${card.slug}-fix${round}, Read the four PNGs, confirm each issue is gone, and report via StructuredOutput (same schema as the builder; ornaments = the full list now on the page; shotErrors must be []).

REVIEWER'S ISSUES:
${JSON.stringify(review.issues, null, 2)}
REVIEWER'S VERDICT: ${review.verdict}`

log(`building ${cards.length} styles: ${cards.map((c) => c.slug).join(', ')}`)

const results = await pipeline(
  cards,
  (card) => agent(buildPrompt(card), { label: `build:${card.slug}`, phase: 'Build', schema: BUILD_SCHEMA, effort: 'xhigh' }),
  async (build, card) => {
    if (!build) { log(`${card.slug}: builder returned nothing`); return null }
    const review = await agent(reviewPrompt(card, 0), { label: `review:${card.slug}`, phase: 'Review', schema: REVIEW_SCHEMA, effort: 'high' })
    return { build, review }
  },
  async (r, card) => {
    if (!r) return null
    let { build, review } = r
    let rounds = 0
    const bad = (rv) => !rv || !rv.pass || rv.issues.some((i) => i.severity !== 'minor')
    while (bad(review) && rounds < 2) {
      rounds++
      log(`${card.slug}: fix round ${rounds} (${review ? review.issues.filter((i) => i.severity !== 'minor').length : '?'} block/major)`)
      const fixed = await agent(fixPrompt(card, review || { issues: [], verdict: 'reviewer failed' }, rounds), { label: `fix${rounds}:${card.slug}`, phase: 'Fix', schema: BUILD_SCHEMA, effort: 'high' })
      if (fixed) build = fixed
      review = await agent(reviewPrompt(card, rounds), { label: `review${rounds}:${card.slug}`, phase: 'Fix', schema: REVIEW_SCHEMA, effort: 'high' })
    }
    log(`${card.slug}: ${review && review.pass ? 'PASS' : 'NOT PASSING'} after ${rounds} fix round(s)`)
    return { slug: card.slug, name: card.name, build, review, rounds }
  },
)

const done = results.filter(Boolean)
log(`${done.filter((r) => r.review && r.review.pass).length}/${cards.length} passing`)
return done
