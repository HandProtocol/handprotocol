// Local gallery e2e: card count, bedazzled filter, viewer opens a new style, pick → tray. Usage: node gallery-e2e.mjs [file-or-url]
import { chromium } from '/home/koh/.claude/skills/gstack/node_modules/playwright/index.mjs'
const url = process.argv[2] || 'file:///home/koh/Documents/handprotocol/web/threehandshealing/styles/index.html'
const browser = await chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('requestfailed', (r) => errors.push('reqfail: ' + r.url()))
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(800)
const out = {}
out.cards = await page.locator('[data-card]').count()
out.counts = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-count]')].map((e) => [e.dataset.count, e.textContent])))
await page.click('[data-filter="bedazzled"]')
out.bedazzledVisible = await page.locator('[data-card]:not(.is-hidden)').count()
out.bedazzledSlugs = await page.evaluate(() => [...document.querySelectorAll('[data-card]:not(.is-hidden)')].map((e) => e.dataset.card))
// missing thumbnails?
out.brokenThumbs = await page.evaluate(() => [...document.querySelectorAll('.card__shot, .card__phone img')].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')))
await page.click('[data-filter="all"]')
// open viewer on the first bedazzled style
const first = out.bedazzledSlugs[0]
await page.click(`[data-card="${first}"] [data-open]`)
await page.waitForTimeout(1500)
out.viewerHidden = await page.locator('[data-viewer]').isHidden()
out.viewerName = await page.locator('[data-viewer-name]').textContent()
out.viewerTag = await page.locator('[data-viewer-tag]').textContent()
out.frameSrc = await page.locator('[data-viewer-frame]').getAttribute('src')
const frame = page.frameLocator('[data-viewer-frame]')
out.frameH1 = (await frame.locator('h1').first().textContent()).replace(/\s+/g, ' ').trim()
out.pillHiddenInFrame = (await frame.locator('.thh-pill').count()) === 0
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(600)
out.nextName = await page.locator('[data-viewer-name]').textContent()
await page.click('[data-viewer-pick]')
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
out.trayVisible = await page.locator('[data-tray]').isVisible()
out.trayNames = await page.locator('[data-tray-names]').textContent()
out.picks = await page.evaluate(() => localStorage.getItem('thh-style-picks'))
await page.evaluate(() => localStorage.removeItem('thh-style-picks'))
out.hash = await page.evaluate(() => location.hash)
out.errors = errors
console.log(JSON.stringify(out, null, 2))
await browser.close()
