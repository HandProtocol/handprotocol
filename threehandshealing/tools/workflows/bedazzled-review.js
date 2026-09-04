// Claude Code Workflow script (not a node tool). Resume point for the bedazzled batch:
// independent review → fix → re-review (max 2 rounds) over already-built style pages.
// Launch from Claude with:
//   Workflow({ scriptPath: "<abs path to this file>",
//              args: { scratch: "<session scratchpad dir>", slugs: ["nouveau","vellum","enamel","curtain","meander","nightgarden"] } })
// Omit slugs to review all ten. Bash calls that run validate.mjs / shot.mjs need dangerouslyDisableSandbox: true.
export const meta = {
  name: 'thh-bedazzled-review',
  description: 'Independent screenshot review → fix → re-review of already-built bedazzled style pages for Three Hands Healing',
  phases: [
    { title: 'Review', detail: 'independent reviewer re-shoots and reads all four PNGs' },
    { title: 'Fix', detail: 'fresh fixer addresses block/major issues, then re-review (max 2 rounds)' },
  ],
}

const ALL = ['nouveau', 'talavera', 'vellum', 'enamel', 'curtain', 'loom', 'lenticular', 'meander', 'popup', 'nightgarden']
const slugs = (args && args.slugs && args.slugs.length) ? args.slugs : ALL
const SCRATCH = args.scratch
const WS = '/home/koh/Documents/handprotocol/threehandshealing'
const BRIEF = `${WS}/design-portfolio-brief.md`
const ADDENDUM = `${WS}/design-portfolio-brief-bedazzled.md`
const STYLES = '/home/koh/Documents/handprotocol/web/threehandshealing/styles'
const TOOLS = `${WS}/tools`

const COMMON = (slug) => `
PROJECT: Three Hands Healing design portfolio — the "bedazzled" batch (ten ornament-rich styles, already built).
Read, in this order, with the Read tool:
1. ${BRIEF}  (the brief: copy, photos, brand mark, hard requirements)
2. ${ADDENDUM}  (this batch's craft bar, phrase bank, the LOCAL TOOL COMMANDS)
3. ${WS}/bedazzled-cards/${slug}.json  (the style card this page was built from: fonts, palette, hero, signature, ornaments, motion, photos, risks)
4. ${STYLES}/${slug}/index.html, style.css, script.js  (the page as it stands)

Photos: ../../assets/imageN.jpeg  ·  video: ../../assets/hero-eft-*.webm/.mp4  ·  GSAP: ../../vendor/gsap.min.js + ScrollTrigger.min.js (optional)

IMPORTANT tool note: Playwright needs Chromium's sandbox off on this machine. Every Bash call that runs validate.mjs or shot.mjs MUST pass dangerouslyDisableSandbox: true, e.g.
  node ${TOOLS}/validate.mjs ${slug}
  node ${TOOLS}/shot.mjs ${slug} <outdir>
Then Read the four PNGs (…-desktop.png, …-desktop-full.png, …-mobile.png, …-mobile-full.png) and look at them critically.
`

const FIX_SCHEMA = {
  type: 'object',
  properties: {
    slug: { type: 'string' },
    changed: { type: 'array', items: { type: 'string' }, description: 'what was changed, one line each' },
    ornaments: { type: 'array', items: { type: 'object', properties: { phrase: { type: 'string' }, element: { type: 'string' } }, required: ['phrase', 'element'] } },
    validate: { type: 'string', description: 'the validate.mjs output line' },
    shotErrors: { type: 'array', items: { type: 'string' }, description: 'the errors array from the final shot.mjs JSON (must be empty)' },
    leftOut: { type: 'string' },
  },
  required: ['slug', 'changed', 'ornaments', 'validate', 'shotErrors', 'leftOut'],
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
    ornamentCount: { type: 'integer' },
    verdict: { type: 'string', description: '2-3 sentences: does this page look bedazzled, beautiful, finished, and safe for a tired visitor?' },
  },
  required: ['pass', 'issues', 'ornamentCount', 'verdict'],
}

const reviewPrompt = (slug, round) => `${COMMON(slug)}
You are an INDEPENDENT REVIEWER (${round === 0 ? 'first review' : `re-review after fix round ${round}`}). You did not build this page. Do NOT edit any file. Your job is to find what is wrong before the client sees it.
Steps:
1. Read the brief + addendum + card + the three page files in full.
2. Run validate.mjs for the slug (dangerouslyDisableSandbox: true). Any ✗ line is a block.
3. Run shot.mjs to ${SCRATCH}/${slug}-review${round} (dangerouslyDisableSandbox: true). Any entry in errors is a block. Read ALL FOUR PNGs and inspect them carefully, section by section, both viewports.
4. Check against the hard requirements (brief) and the bedazzled bar (addendum): section order + ids; verbatim copy present and unaltered; two pillars as a pair, six modalities unnumbered, three steps numbered; ornaments ≥5, each traceable to a copy phrase (count the "ornament:" HTML comments and confirm they exist in the render); ornaments never over text and never clipping; type pairing fresh; hero genuinely stops the scroll; readability (body ≥16 px, contrast); no cropped heads; mobile stacking; no overlapping absolute elements; last section leaves room for the fixed pill; reduced-motion rule present; no invented contact/prices/testimonials; ≤5 photos; ≤70 KB.
5. Is it actually BEDAZZLED and BEAUTIFUL — would a designer stop scrolling? If it reads as plain, restrained, or template-like, that is a major issue (say what ornaments/texture/moment it lacks, concretely).
Severity: block = violates a hard requirement or errors non-empty; major = visibly unfinished, unreadable, or not bedazzled; minor = polish. pass = no block and no major. Be specific — every issue needs a where and a concrete fix. Return via StructuredOutput.`

const fixPrompt = (slug, review, round) => `${COMMON(slug)}
You are the FIXER (round ${round}). An independent reviewer found the issues below in ${STYLES}/${slug}/. Fix every block and major issue; fix minors when cheap. Preserve the world and the ornaments — this is repair, not redesign, unless the reviewer says the page is not bedazzled enough, in which case add the concrete ornaments/moments they asked for. Then run validate.mjs and shot.mjs (dangerouslyDisableSandbox: true) to ${SCRATCH}/${slug}-fix${round}, Read the four PNGs, confirm each issue is gone, and report via StructuredOutput (shotErrors must be []). Do not touch any file outside ${STYLES}/${slug}/. Do not commit.

REVIEWER'S ISSUES:
${JSON.stringify(review.issues, null, 2)}
REVIEWER'S VERDICT: ${review.verdict}`

log(`reviewing ${slugs.length} styles: ${slugs.join(', ')}`)

const results = await pipeline(
  slugs,
  (slug) => agent(reviewPrompt(slug, 0), { label: `review:${slug}`, phase: 'Review', schema: REVIEW_SCHEMA, effort: 'high' }),
  async (review, slug) => {
    let rounds = 0
    let fix = null
    const bad = (rv) => !rv || !rv.pass || rv.issues.some((i) => i.severity !== 'minor')
    while (bad(review) && rounds < 2) {
      rounds++
      log(`${slug}: fix round ${rounds} (${review ? review.issues.filter((i) => i.severity !== 'minor').length : '?'} block/major)`)
      fix = await agent(fixPrompt(slug, review || { issues: [], verdict: 'reviewer failed' }, rounds), { label: `fix${rounds}:${slug}`, phase: 'Fix', schema: FIX_SCHEMA, effort: 'high' })
      review = await agent(reviewPrompt(slug, rounds), { label: `review${rounds}:${slug}`, phase: 'Fix', schema: REVIEW_SCHEMA, effort: 'high' })
    }
    log(`${slug}: ${review && review.pass ? 'PASS' : 'NOT PASSING'} after ${rounds} fix round(s)`)
    return { slug, review, lastFix: fix, rounds }
  },
)

const done = results.filter(Boolean)
log(`${done.filter((r) => r.review && r.review.pass).length}/${slugs.length} passing`)
return done
