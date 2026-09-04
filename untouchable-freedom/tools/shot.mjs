// Usage: node shot.mjs <slug|path-to-index.html> [outdir]
// Screenshots a style page at desktop (1440x900 viewport + full page) and mobile (390x844 viewport).
import { chromium } from '/home/koh/.claude/skills/gstack/node_modules/playwright/index.mjs'
import { resolve, basename, dirname } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
const arg = process.argv[2]
if (!arg) { console.error('need slug or path'); process.exit(1) }
const root = '/home/koh/Documents/handprotocol/web/project/untouchable-freedom'
const file = arg.endsWith('.html') ? resolve(arg) : `${root}/${arg}/index.html`
const slug = arg.endsWith('.html') ? basename(dirname(file)) : arg
const out = process.argv[3] || '/tmp/claude-1000/-home-koh-Documents-handprotocol/57280e43-17d9-42f9-9726-fd95cd391ae1/scratchpad/ufc/shots'
if (!existsSync(file)) { console.error('missing', file); process.exit(1) }
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const errors = []
async function shoot(name, viewport, fullPage) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push(`[${name}] pageerror: ${e.message}`))
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`) })
  await page.goto('file://' + file, { waitUntil: 'load' })
  await page.waitForTimeout(1800)
  // scroll through so lazy images + scroll-triggered reveals fire
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += viewport.height * 0.8) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(120) }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(600)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (overflow > 2) errors.push(`[${name}] horizontal overflow: ${overflow}px`)
  await page.screenshot({ path: `${out}/${slug}-${name}.png`, fullPage })
  await ctx.close()
  return h
}
const hd = await shoot('desktop', { width: 1440, height: 900 }, false)
await shoot('desktop-full', { width: 1440, height: 900 }, true)
const hm = await shoot('mobile', { width: 390, height: 844 }, false)
await shoot('mobile-full', { width: 390, height: 844 }, true)
await browser.close()
console.log(JSON.stringify({ slug, file, desktopHeight: hd, mobileHeight: hm, out, errors }, null, 2))
