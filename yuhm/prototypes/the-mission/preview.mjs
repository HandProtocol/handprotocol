// Local preview and screenshots for the THE MISSION demo.
// The published artifact wraps index.html in a doctype/head/body; this builds the same wrapper,
// clicks through the flow in headless Chromium, and reports console errors and phone-width overflow.
//
// Usage: node preview.mjs <out-dir>
// On this machine Chromium needs --no-sandbox, and the Claude Code Bash sandbox must be disabled for the call.
import { chromium } from '/home/koh/.claude/skills/gstack/node_modules/playwright/index.mjs'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(process.argv[2] ?? join(here, '.preview'))
mkdirSync(out, { recursive: true })
for (const file of ['mission.css', 'mission.js', 'gather.css', 'gather.js']) copyFileSync(join(here, file), join(out, file))
const head = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
writeFileSync(join(out, 'index.html'), `${head}${readFileSync(join(here, 'index.html'), 'utf8')}</body></html>`)

const browser = await chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox'] })
const errors = []
const page = await browser.newPage({ viewport: { width: 1400, height: 920 } })
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
page.on('pageerror', (error) => errors.push(`PAGEERROR ${error.message}`))
await page.goto(`file://${out}/index.html`)
await page.waitForTimeout(1500)
await page.screenshot({ path: join(out, 'desktop-top.png') })

const device = page.locator('.device')
const go = async (label) => { await page.click(`#stepper button:has-text("${label}")`); await page.waitForTimeout(700) }
const unticked = '#phone .ck[aria-pressed="false"]'

await go('Pick a route'); await device.screenshot({ path: join(out, 'p02-route.png') })
await go('First bite'); await page.click('#phone [data-act="pick:3"]'); await page.click('#phone [data-act="bite-done"]')
await page.waitForTimeout(1300); await device.screenshot({ path: join(out, 'p03-bite-done.png') })
await go('Opt in'); await device.screenshot({ path: join(out, 'p05-optin.png') })
await go('Mission board'); await device.screenshot({ path: join(out, 'p06-board.png') })
await go('The offer'); await device.screenshot({ path: join(out, 'p07-offer.png') })
await page.click('#phone [data-act="accept"]'); await page.waitForTimeout(600)
await device.screenshot({ path: join(out, 'p08-active.png') })
for (let step = 0; step < 3; step += 1) {
  // The checklist re-renders after every tap, so always re-query instead of holding a list.
  while (await page.locator(unticked).count()) await page.locator(unticked).first().click()
  await page.click('#phone [data-act="step"]'); await page.waitForTimeout(400)
}
await page.waitForTimeout(1500); await device.screenshot({ path: join(out, 'p09-done.png') })
await go('Email'); await device.screenshot({ path: join(out, 'p10-email.png') })
await go('WhatsApp'); await page.click('#phone [data-act="say:accept"]'); await page.waitForTimeout(1500)
await page.click('#phone [data-act="say:pausa"]'); await page.waitForTimeout(1500)
await device.screenshot({ path: join(out, 'p11-whatsapp.png') })
await go('Controls'); await device.screenshot({ path: join(out, 'p12-controls.png') })

// Gatherings: order, lock, the money holder's checklist, the shop run, the bin, the settle tab.
const tap = async (act) => { await page.click(`#phone [data-act="${act}"]`); await page.waitForTimeout(150) }
const toBottom = () => page.evaluate(() => { const body = document.querySelector('#phone .p-body'); body.scrollTop = body.scrollHeight })
const cents = (text) => Math.round(Number(text.replace(/[^0-9.]/g, '')) * 100)
await go('The gathering'); await device.screenshot({ path: join(out, 'p13-gather.png') })
await tap('grole:sort'); await tap('gjoin')
await tap('gdish:beans|1'); await tap('gsrc:lime|network'); await device.screenshot({ path: join(out, 'p14-order.png') })
await toBottom(); await device.screenshot({ path: join(out, 'p14b-order-share.png') })
await tap('glock'); await page.waitForTimeout(800); await device.screenshot({ path: join(out, 'p14c-order-locked.png') })
await go('Paid checklist'); await tap('gpaid:4'); await tap('gpayby'); await tap('gkeep:6'); await tap('gdrop:7')
await device.screenshot({ path: join(out, 'p15-paid.png') })
await go('Shop run'); await tap('gswap'); await tap('gbuyall'); await device.screenshot({ path: join(out, 'p16-shop.png') })
await tap('greceipt'); await tap('gshoptab:sort'); await device.screenshot({ path: join(out, 'p16b-sort.png') })
await go('Pick up my bin'); await device.screenshot({ path: join(out, 'p17-pick.png') })
await toBottom(); await device.screenshot({ path: join(out, 'p17b-balance.png') })
await tap('gsettleview'); await tap('gsettle:4'); await device.screenshot({ path: join(out, 'p15b-settle.png') })
const receipt = cents(await page.locator('#phone .tally b').first().innerText())
const shares = (await page.locator('#phone .led > b').allInnerTexts()).reduce((sum, text) => sum + cents(text), 0)
const moneyCheck = receipt === shares ? `ok (${receipt} cents)` : `MISMATCH receipt ${receipt} vs shares ${shares}`

for (const id of ['rules', 'game', 'gather', 'phases', 'decisions']) {
  await page.evaluate((target) => document.getElementById(target).scrollIntoView(), id)
  await page.waitForTimeout(300); await page.screenshot({ path: join(out, `plan-${id}.png`) })
}

const mobile = await browser.newPage({ viewport: { width: 400, height: 900 } })
await mobile.goto(`file://${out}/index.html`); await mobile.waitForTimeout(1200)
await mobile.screenshot({ path: join(out, 'mobile-top.png') })
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
await mobile.click('#stepper button:has-text("Build my order")'); await mobile.waitForTimeout(600)
const gatherOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
await mobile.locator('.device').screenshot({ path: join(out, 'mobile-order.png') })
await browser.close()

process.stdout.write(`screenshots: ${out}\nmobile horizontal overflow px: ${overflow} (gathering screen: ${gatherOverflow})\nshares equal the receipt: ${moneyCheck}\nconsole errors: ${JSON.stringify(errors)}\n`)
