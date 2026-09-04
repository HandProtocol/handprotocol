// Usage: node validate.mjs [slug…]  — static checks against design-portfolio-brief.md
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
const ROOT = '/home/koh/Documents/handprotocol/web/project/untouchable-freedom'
const slugs = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(ROOT).filter(d => !d.startsWith('_') && d !== 'assets' && existsSync(`${ROOT}/${d}/index.html`))
const VERBATIM = [
  'A journey inward.', 'Untouchable Freedom Collective',
  'Untouchable Freedom is a guided journey through reflection, identity, and emergence.',
  'You do not return as who you were.', 'It is a mirror.',
  'Inside are poems, reflection pages, declarations, and identity work designed to pull truth to the surface.',
  'Each chapter invites you to confront, release, and rewrite the story you carry.',
  'This is a space for honesty.', 'A space for grief.', 'A space for rebirth.',
  'You return to it as you change.', '$27.00',
  'A 181-page guided journal for transformation, reflection, and becoming.',
  '12 transformational chapters', 'Reflection exercises', 'Identity work prompts', 'Poems and declarations',
  'Guided journaling pages', 'Space to release old stories and rewrite new ones', 'This is not a workbook.',
  'Designed to be revisited throughout different seasons of life, revealing something new each time you return.',
  'Join to discover more of you.',
  'Receive reflections, journal prompts, and quiet reminders for becoming who you are meant to be.',
  '2026 Untouchable Freedom Collective',
  'The Fall', 'The Returning', 'The Rising', 'The Freedom',
  'Shattered', 'Escape', 'Pain', 'Gone', 'Isolation', 'I Tried It All', 'I Love You', 'Unnamed',
  'The Loss of a Protector', 'Perfection', 'Release', 'Alone',
  'Reflection Pages', 'Page of Emergence', 'Closing Declaration',
]
const LINKS = [
  'https://untouchable-freedom-collective.myshopify.com/products/untouchable-freedom',
  'https://untouchable-freedom-collective.myshopify.com/cart/add?id=45694516822177&amp;quantity=1',
  'https://untouchable-freedom-collective.myshopify.com/pages/contact',
  'https://untouchable-freedom-collective.myshopify.com/policies/terms-of-service',
  'https://untouchable-freedom-collective.myshopify.com/policies/privacy-policy',
  'https://untouchable-freedom-collective.myshopify.com/policies/refund-policy',
  'https://handprotocol.org/',
  'action="https://untouchable-freedom-collective.myshopify.com/contact#contact_form"',
  'name="form_type" value="customer"', 'name="contact[tags]" value="newsletter"', 'name="contact[email]"',
]
const INVENTED = [/testimonial/i, /\breviews?\b/i, /★|⭐/, /as seen in/i, /free shipping/i, /discount/i, /promo code/i, /\(\d{3}\)\s?\d{3}/, /\b\d{3}-\d{3}-\d{4}\b/, /@[a-z0-9_]{3,}/i, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, /instagram|tiktok|facebook|youtube|threads\.net/i]
const norm = s => s.replace(/&#8217;|&rsquo;|’/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ')
let failed = 0
for (const slug of slugs) {
  const dir = `${ROOT}/${slug}`
  const html = readFileSync(`${dir}/index.html`, 'utf8')
  const css = existsSync(`${dir}/style.css`) ? readFileSync(`${dir}/style.css`, 'utf8') : ''
  const js = existsSync(`${dir}/script.js`) ? readFileSync(`${dir}/script.js`, 'utf8') : ''
  const all = html + css + js
  const problems = []
  const text = norm(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '))
  if (!new RegExp(`<html[^>]*data-style="${slug}"`).test(html)) problems.push('missing data-style')
  if (!/<meta name="robots" content="noindex">/.test(html)) problems.push('missing noindex')
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || ''
  if (!/^Untouchable Freedom — [A-Z][a-z]+$/.test(title)) problems.push(`title "${title}"`)
  if (!/<script src="\.\.\/_portfolio\.js" defer><\/script>\s*<\/body>/.test(html)) problems.push('portfolio script not last in body')
  const fams = [...html.matchAll(/family=([^&"]+)/g)].map(m => m[1])
  if (fams.length > 2) problems.push(`fonts: ${fams.length} families`)
  const ext = [...all.matchAll(/https?:\/\/[^\s"')]+/g)].map(m => m[0]).filter(u => !/^https?:\/\/(fonts\.g(oogleapis|static)\.com|untouchable-freedom-collective\.myshopify\.com|handprotocol\.org|www\.w3\.org)/.test(u))
  if (ext.length) problems.push(`external: ${[...new Set(ext)].slice(0, 4).join(' ')}`)
  const imgs = [...html.matchAll(/<img[^>]+>/g)].map(m => m[0])
  for (const tag of imgs) {
    const src = (tag.match(/src="([^"]+)"/) || [])[1] || ''
    if (!src.startsWith('../assets/')) problems.push(`img src ${src}`)
    else if (!existsSync(`${ROOT}/assets/${src.slice(10)}`)) problems.push(`img missing ${src}`)
    if (!/alt="/.test(tag)) problems.push(`img no alt: ${src}`)
    if (!/width="/.test(tag) || !/height="/.test(tag)) problems.push(`img no size: ${src}`)
  }
  const pageImgs = imgs.filter(t => /page-(contents-[12]|poem|reflection)\.webp/.test(t)).length
  if (pageImgs < 2) problems.push(`only ${pageImgs} interior page images`)
  for (const v of VERBATIM) if (!text.includes(norm(v))) problems.push(`copy missing: "${v}"`)
  for (const l of LINKS) if (!html.includes(l) && !html.includes(l.replace('&amp;', '&'))) problems.push(`link missing: ${l}`)
  for (const re of INVENTED) { const m = text.match(re); if (m) problems.push(`invented? "${m[0]}"`) }
  const dashes = (all.match(/—/g) || []).length
  if (dashes !== 1) problems.push(`em dashes: ${dashes} (expected 1, the title)`)
  const size = [ `${dir}/index.html`, `${dir}/style.css`, `${dir}/script.js` ].filter(existsSync).reduce((n, f) => n + statSync(f).size, 0)
  if (size > 60 * 1024) problems.push(`size ${(size / 1024).toFixed(1)} KB`)
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) problems.push('h1 count')
  if (!/href="#main"/.test(html) || !/id="main"/.test(html)) problems.push('skip link / #main')
  if (/localStorage|sessionStorage|fetch\(|XMLHttpRequest|alert\(/.test(js)) problems.push('script uses storage/fetch/alert')
  console.log(`${problems.length ? '✗' : '✓'} ${slug}  ${(size / 1024).toFixed(1)} KB${problems.length ? '\n   - ' + problems.join('\n   - ') : ''}`)
  if (problems.length) failed++
}
process.exit(failed ? 1 : 0)
