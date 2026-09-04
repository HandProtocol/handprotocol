// Static checks against the brief's hard requirements. Usage: node validate.mjs [slug ...]
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
const ROOT = '/home/koh/Documents/handprotocol/web/threehandshealing/styles'
const slugs = process.argv.length > 2 ? process.argv.slice(2) : readdirSync(ROOT).filter(d => !d.startsWith('_') && existsSync(`${ROOT}/${d}/index.html`))
const REQUIRED_IDS = ['top', 'alone', 'practices', 'session', 'about', 'book']
const VERBATIM = [
  'Feel good in your body, at peace in your mind, aligned in your life',
  'Wherever you are right now is the perfect place to start',
  'True, lasting healing begins with absolute safety',
  'Every tool and modality I share in my practice comes from a place of deep personal experience',
  'complementary wellness support and is not a substitute for medical',
  'Candace Silvers Energy Healing', 'Systemic Family Constellations', 'Qi Gong', 'EFT',
]
for (const slug of slugs) {
  const dir = `${ROOT}/${slug}`
  const files = readdirSync(dir).filter(f => /\.(html|css|js)$/.test(f))
  const html = readFileSync(`${dir}/index.html`, 'utf8')
  const all = files.map(f => readFileSync(`${dir}/${f}`, 'utf8')).join('\n')
  const bytes = files.reduce((n, f) => n + statSync(`${dir}/${f}`).size, 0)
  const issues = []
  if (!new RegExp(`<html[^>]*data-style="${slug}"`).test(html)) issues.push('missing html[data-style]')
  if (!/<title>Three Hands Healing — /.test(html)) issues.push('title not "Three Hands Healing — <Name>"')
  if (!/<meta name="robots" content="noindex">/.test(html)) issues.push('missing noindex meta')
  if (!/<meta name="theme-color"/.test(html)) issues.push('missing theme-color')
  if (!/<script src="\.\.\/_portfolio\.js" defer><\/script>/.test(html)) issues.push('missing ../_portfolio.js include')
  for (const id of REQUIRED_IDS) if (!new RegExp(`id="${id}"`).test(html)) issues.push(`missing id="${id}"`)
  const norm = (t) => t.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/(&#8212;|&mdash;)/g, '—').replace(/[’‘]/g, "'").replace(/\s+/g, ' ')
  const text = norm(all)
  for (const v of VERBATIM) if (!text.includes(v)) issues.push(`copy missing: "${v.slice(0, 40)}…"`)
  const photos = new Set([...all.matchAll(/assets\/(image\d+\.jpeg)/g)].map(m => m[1]))
  if (photos.size > 5) issues.push(`photos: ${photos.size} (>5): ${[...photos].join(',')}`)
  if (/DM\+Serif\+Display|DM\+Sans/.test(html)) issues.push('uses baseline DM fonts')
  if (/testimonial/i.test(all)) issues.push('mentions testimonials')
  if (/\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/.test(all.replace(/\s(?:d|points|viewBox)="[^"]*"/g, ' ').replace(/\bpath\([^)]*\)/g, ''))) issues.push('phone-number-like string')  // ignore SVG path data
  if (/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(all.replace(/@keyframes|@media|@import|@font-face|@supports|@layer|@property|@container/g, ''))) issues.push('email-like string')
  if (/\$\s?\d/.test(all)) issues.push('price-like string')
  if (bytes > 75_000) issues.push(`size ${(bytes/1024).toFixed(0)} KB (>70 KB)`)
  const links = [...html.matchAll(/(?:src|href)="(\.\.\/\.\.\/[^"]+)"/g)].map(m => m[1])
  for (const l of links) { const p = `${dir}/${l.split('?')[0]}`; if (!existsSync(p)) issues.push(`broken asset ${l}`) }
  console.log(`${issues.length ? '✗' : '✓'} ${slug.padEnd(10)} ${(bytes/1024).toFixed(0).padStart(3)} KB · photos ${photos.size} · files ${files.join(',')}${issues.length ? '\n    - ' + issues.join('\n    - ') : ''}`)
}
