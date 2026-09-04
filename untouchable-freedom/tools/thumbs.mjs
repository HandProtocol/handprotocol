// Usage: node thumbs.mjs <slug>[=<url>] ...   → writes styles/_shots/<slug>.webp (desktop) + <slug>-m.webp (mobile)
import { chromium } from '/home/koh/.claude/skills/gstack/node_modules/playwright/index.mjs'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const ROOT = '/home/koh/Documents/handprotocol/web/project/untouchable-freedom'
const OUT = `${ROOT}/_shots`
mkdirSync(OUT, { recursive: true })
const HIDE = '.design-switcher,.thh-pill,.floating-nav,.mobile-booking-cta,[data-studio-root],.studio-fab{display:none!important}'
const items = process.argv.slice(2).map(a => { const i = a.indexOf('='); const slug = i < 0 ? a : a.slice(0, i); const url = i < 0 ? undefined : a.slice(i + 1); return { slug, url: url || `file://${ROOT}/${slug}/index.html` } })
const browser = await chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
async function snap(url, viewport, png) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'load' })
  await page.addStyleTag({ content: HIDE })
  await page.waitForTimeout(2600) // let load animations settle
  await page.screenshot({ path: png })
  await ctx.close()
}
for (const { slug, url } of items) {
  const d = `/tmp/ufc-${slug}-d.png`, m = `/tmp/ufc-${slug}-m.png`
  await snap(url, { width: 1440, height: 900 }, d)
  await snap(url, { width: 390, height: 844 }, m)
  execFileSync('python3', ['-c', `
from PIL import Image
d=Image.open('${d}').convert('RGB'); d=d.resize((960,600), Image.LANCZOS); d.save('${OUT}/${slug}.webp', quality=82, method=6)
m=Image.open('${m}').convert('RGB'); m=m.resize((300,649), Image.LANCZOS); m.save('${OUT}/${slug}-m.webp', quality=80, method=6)
`])
  console.log('ok', slug)
}
await browser.close()
