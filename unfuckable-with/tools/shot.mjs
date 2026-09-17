// Usage: node shot.mjs <slug|index> [outdir]
// Screenshots a style page (or the gallery with "index") at desktop 1440x900,
// tablet 820x1180 and phone 390x844: first screen plus the full page.
// Full-page shots use reduced motion so scroll-linked reveals sit at their end state.
import { chromium } from '/home/koh/.claude/skills/gstack/node_modules/playwright/index.mjs'
import { existsSync, mkdirSync } from 'node:fs'

const ROOT = '/home/koh/Documents/handprotocol/web/project/unfuckable-with'
const slug = process.argv[2]
if (!slug) { console.error('need a slug (noir, rose, halo, gilt) or "index"'); process.exit(1) }
const file = slug === 'index' ? `${ROOT}/index.html` : `${ROOT}/${slug}/index.html`
const out = process.argv[3] || '/tmp/uw-shots'
if (!existsSync(file)) { console.error('missing', file); process.exit(1) }
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox'] })
const errors = []

async function shoot(name, viewport, fullPage) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: fullPage ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`) })
  await page.goto('file://' + file, { waitUntil: 'load' })
  // HIDE_PILL=1 hides the floating portfolio pill (used when cutting gallery thumbnails)
  if (process.env.HIDE_PILL) await page.addStyleTag({ content: '.thh-pill{display:none!important}' })
  await page.waitForTimeout(2200)
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (overflow > 2) errors.push(`[${name}] horizontal overflow: ${overflow}px`)
  await page.screenshot({ path: `${out}/${slug}-${name}.png`, fullPage })
  await ctx.close()
  return height
}

const desktopHeight = await shoot('desktop', { width: 1440, height: 900 }, false)
await shoot('desktop-full', { width: 1440, height: 900 }, true)
await shoot('tablet', { width: 820, height: 1180 }, false)
const mobileHeight = await shoot('mobile', { width: 390, height: 844 }, false)
await shoot('mobile-full', { width: 390, height: 844 }, true)
await browser.close()
console.log(JSON.stringify({ slug, desktopHeight, mobileHeight, out, errors }, null, 2))
