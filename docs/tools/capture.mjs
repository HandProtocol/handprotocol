#!/usr/bin/env node
// Capture the rendered layout of HAND's public pages and turn it into wireframes.
//
// What it does, per page and per viewport (desktop 1440, phone 390):
//   1. serves the site exactly as committed on a git ref (default origin/main, which is what
//      Netlify deploys), so the result matches the live site and never touches production;
//   2. loads the page in headless Chromium, with every call to a Netlify function stubbed out
//      (no visit tracking, no form posts);
//   3. measures the real boxes: sections, headings, text, buttons, media, inputs, cards, tables;
//   4. writes layout JSON, a to-scale SVG wireframe, and a full-page screenshot.
//
// Usage:
//   node docs/tools/capture.mjs                    all pages, from origin/main
//   node docs/tools/capture.mjs --worktree         use the working tree instead of a git ref
//   node docs/tools/capture.mjs --ref some-branch
//   node docs/tools/capture.mjs --only home,fiscal
//
// Output: docs/closed/wireframes/{layout,svg,shots}/<slug>.<viewport>.{json,svg,jpg}
//
// Chromium on this machine needs the sandbox off (AppArmor blocks unprivileged user namespaces).
// Playwright is imported from PLAYWRIGHT_MODULE, or from the gstack install, or from "playwright".

import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const OUT = path.join(ROOT, 'docs/closed/wireframes')

export const PAGES = [
  { slug: 'home', path: '/', group: 'core' },
  { slug: 'reciprocates', path: '/reciprocates/', group: 'core' },
  { slug: 'discovery', path: '/discovery/', group: 'core' },
  { slug: 'discovery-vision', path: '/discovery/skill-exchange-vision.html', group: 'core' },
  { slug: 'discovery-models', path: '/discovery/skill-exchange-models.html', group: 'core' },
  { slug: 'discovery-landscape', path: '/discovery/impact-org-landscape.html', group: 'core' },
  { slug: 'sovereign-reciprocates', path: '/sovereign-reciprocates/', group: 'core' },
  { slug: 'governance', path: '/governance/', group: 'core' },
  { slug: 'fiscal', path: '/fiscal/', group: 'core' },
  { slug: 'donate-crypto', path: '/donate-crypto/', group: 'core' },
  { slug: 'audio', path: '/audio/', group: 'core' },
  { slug: 'legacy', path: '/legacy/', group: 'core' },
  { slug: 'learn', path: '/learn/', group: 'core' },
  { slug: 'not-found', path: '/404.html', group: 'core' },
  { slug: 'reciprocates-preview-onboarding', path: '/reciprocates/preview-onboarding.html', group: 'unlisted' },
]

const EXPORT_PATHS = [
  'web/assets', 'web/foundation-campaign', 'web/discovery', 'web/reciprocates',
  'web/sovereign-reciprocates', 'web/governance', 'web/fiscal', 'web/donate-crypto',
  'web/audio', 'web/legacy', 'web/learn', 'web/404.html', 'web/robots.txt', 'web/sitemap.xml',
]

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, scale: 0.5 },
  { name: 'phone', width: 390, height: 844, scale: 1 },
]

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const opt = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.md': 'text/markdown; charset=utf-8', '.glb': 'model/gltf-binary',
}

function exportSite() {
  if (flag('--worktree')) return { dir: path.join(ROOT, 'web'), ref: 'working tree', cleanup: () => {} }
  const ref = opt('--ref', 'origin/main')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hand-web-'))
  const present = EXPORT_PATHS.filter((p) => spawnSync('git', ['cat-file', '-e', `${ref}:${p}`], { cwd: ROOT }).status === 0)
  const tar = path.join(tmp, 'site.tar')
  execFileSync('git', ['archive', '-o', tar, ref, ...present], { cwd: ROOT })
  execFileSync('tar', ['-xf', tar, '-C', tmp])
  fs.unlinkSync(tar)
  const commit = execFileSync('git', ['rev-parse', '--short', ref], { cwd: ROOT }).toString().trim()
  return { dir: path.join(tmp, 'web'), ref: `${ref} @ ${commit}`, cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }) }
}

function serve(dir) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p.startsWith('/.netlify/functions/')) { res.writeHead(204).end(); return }
    if (p === '/') p = '/foundation-campaign/index.html' // same rewrite netlify.toml applies
    let file = path.join(dir, p)
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }).end(); return }
      file = path.join(file, 'index.html')
    }
    if (!fs.existsSync(file)) {
      const nf = path.join(dir, '404.html')
      res.writeHead(404, { 'Content-Type': MIME['.html'] }).end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

// Runs inside the page. Returns measured boxes in page coordinates.
function measure() {
  const round = Math.round
  const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
  const vw = window.innerWidth
  const shown = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p)
      if (cs.display === 'none' || cs.visibility === 'hidden') return false
    }
    const r = el.getBoundingClientRect()
    return r.width > 2 && r.height > 2
  }
  const box = (el) => {
    const r = el.getBoundingClientRect()
    return { x: round(r.left + window.scrollX), y: round(r.top + window.scrollY), w: round(r.width), h: round(r.height) }
  }
  const txt = (el, n = 110) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, n)
  const lum = (color) => {
    const m = color.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const [r, g, b, a = 1] = m[1].split(',').map((v) => parseFloat(v))
    if (a < 0.5) return null
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  }
  const bgLum = (el) => {
    for (let p = el; p; p = p.parentElement) {
      const l = lum(getComputedStyle(p).backgroundColor)
      if (l !== null) return l
    }
    return 1
  }
  // Light text means a dark surface. More reliable than background-color, which misses gradients.
  const onDark = (el) => {
    const l = lum(getComputedStyle(el).color)
    return l !== null && l > 0.62
  }
  const isFixed = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (getComputedStyle(p).position === 'fixed') return true
    }
    return false
  }
  // One [x, y, w, h] per rendered line of text inside el.
  const lineBoxes = (el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const lines = []
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2) continue
      const top = r.top + window.scrollY
      const left = r.left + window.scrollX
      let line = lines.find((l) => Math.abs(l.top - top) < Math.max(l.h, r.height) * 0.6)
      if (!line) lines.push({ top, left, right: left + r.width, h: r.height })
      else { line.left = Math.min(line.left, left); line.right = Math.max(line.right, left + r.width); line.h = Math.max(line.h, r.height) }
    }
    return lines.sort((a, b) => a.top - b.top).slice(0, 48).map((l) => [round(l.left), round(l.top), round(l.right - l.left), round(l.h)])
  }
  // The words of el grouped into the lines the browser actually broke them into.
  const textLines = (el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const lines = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const re = /\S+/g
      for (let m = re.exec(node.data); m; m = re.exec(node.data)) {
        const range = document.createRange()
        range.setStart(node, m.index)
        range.setEnd(node, m.index + m[0].length)
        const r = range.getBoundingClientRect()
        if (r.width < 1) continue
        const top = r.top + window.scrollY
        const left = r.left + window.scrollX
        let line = lines.find((l) => Math.abs(l.top - top) < r.height * 0.5)
        if (!line) { line = { top, left, right: left + r.width, h: r.height, words: [] }; lines.push(line) }
        line.left = Math.min(line.left, left)
        line.right = Math.max(line.right, left + r.width)
        line.words.push(m[0])
      }
    }
    return lines.sort((a, b) => a.top - b.top).slice(0, 8).map((l) => ({ x: round(l.left), y: round(l.top), w: round(l.right - l.left), h: round(l.h), text: l.words.join(' ').slice(0, 120) }))
  }
  const SECTIONISH = new Set(['SECTION', 'HEADER', 'FOOTER', 'NAV', 'ARTICLE', 'ASIDE', 'MAIN', 'DIV', 'FORM'])
  const blockKids = (el) => [...el.children].filter((c) => SECTIONISH.has(c.tagName) && shown(c) && c.getBoundingClientRect().height > 30 && !c.classList.contains('skip-link'))

  // Sections: start from body's children and open wrappers until we reach real sections.
  let level = blockKids(document.body)
  for (let depth = 0; depth < 4; depth++) {
    let changed = false
    const next = []
    for (const el of level) {
      const kids = blockKids(el)
      const real = kids.filter((k) => ['SECTION', 'HEADER', 'FOOTER', 'NAV', 'ARTICLE'].includes(k.tagName))
      const wrapper = el.tagName === 'MAIN' || ((el.tagName === 'DIV' || el.tagName === 'ARTICLE') && real.length >= 2)
      if (wrapper && kids.length) { next.push(...kids); changed = true } else next.push(el)
    }
    level = next
    if (!changed) break
  }
  const sectionEls = level.filter((el) => el.getBoundingClientRect().height > 30)
  const sections = sectionEls.map((el, i) => {
    const h = el.querySelector('h1, h2, h3')
    const eyebrow = el.querySelector('[class*="eyebrow"], [class*="label"], [class*="kicker"]')
    const cs = getComputedStyle(el)
    const probe = [...el.querySelectorAll('h1, h2, h3, p')].find(shown)
    return {
      n: i + 1,
      id: el.id || null,
      tag: el.tagName.toLowerCase(),
      cls: [...el.classList].slice(0, 4),
      box: box(el),
      heading: h ? txt(h, 140) : '',
      eyebrow: eyebrow && shown(eyebrow) ? txt(eyebrow, 60) : '',
      dark: probe ? onDark(probe) : bgLum(el) < 0.35,
      fixed: cs.position === 'fixed' || cs.position === 'sticky',
      links: [...el.querySelectorAll('a[href]')].filter(shown).slice(0, 60).map((a) => ({ text: txt(a, 70), href: a.getAttribute('href') })),
    }
  })

  const blocks = []
  const floating = []
  // Fixed widgets (a floating feedback button, a cookie bar) are not part of the page flow:
  // keep the top bar, list the rest separately.
  const push = (b, el) => {
    if (el && isFixed(el) && b.y > 150) { if (b.t === 'btn' || b.t === 'card') floating.push({ t: b.t, text: b.text || txt(el, 60), x: b.x, y: b.y, w: b.w, h: b.h }); return }
    if (blocks.length < 3200) blocks.push(b)
  }
  const BTN = 'button, input[type="submit"], [role="button"], a[class*="btn"], a[class*="button"], a[class*="cta"]'
  const isBtn = (el) => el.matches(BTN)

  document.querySelectorAll('[class*="card"], [class*="tier"], [class*="callout"], [class*="panel"], details, blockquote, fieldset').forEach((el) => {
    if (!shown(el) || isBtn(el)) return
    const b = box(el)
    if (b.w < 110 || b.h < 50 || (b.w > vw * 0.99 && b.h > 1400)) return
    const probe = [...el.querySelectorAll('h2, h3, h4, p, li')].find(shown)
    push({ t: 'card', ...b, dark: probe ? onDark(probe) : bgLum(el) < 0.35 }, el)
  })
  document.querySelectorAll('table').forEach((el) => {
    if (!shown(el)) return
    push({ t: 'table', ...box(el), rows: el.querySelectorAll('tr').length, cols: el.querySelector('tr') ? el.querySelector('tr').children.length : 0 }, el)
  })
  document.querySelectorAll('h1, h2, h3, h4').forEach((el) => {
    if (!shown(el)) return
    const cs = getComputedStyle(el)
    push({ t: 'h', level: +el.tagName[1], ...box(el), text: txt(el, 160), fs: parseFloat(cs.fontSize), ln: textLines(el), dark: onDark(el) }, el)
  })
  document.querySelectorAll('nav a[href], [class*="subnav"] a[href], [class*="crumb"] a[href]').forEach((el) => {
    if (!shown(el) || isBtn(el) || el.querySelector('img, svg')) return
    const t = txt(el, 40)
    if (!t) return
    push({ t: 'link', ...box(el), text: t, fs: parseFloat(getComputedStyle(el).fontSize), dark: onDark(el) }, el)
  })
  document.querySelectorAll('p, li, dt, dd, figcaption, summary, label, td, th').forEach((el) => {
    if (!shown(el) || el.closest(BTN)) return
    if (el.querySelector('p, li, ul, ol, h1, h2, h3, h4, table, input, textarea, select')) return
    if (el.closest('nav') && el.querySelector('a[href]')) return // drawn as nav links
    const t = txt(el, 60)
    if (!t) return
    const cs = getComputedStyle(el)
    push({ t: 'p', ...box(el), fs: parseFloat(cs.fontSize), ln: lineBoxes(el), dark: onDark(el) }, el)
  })
  document.querySelectorAll('img, picture, video, canvas, iframe, svg').forEach((el) => {
    if (!shown(el) || el.closest('button, a[class*="btn"]')) return
    // count a <picture> once (through its <img>) and skip svg fragments nested inside another svg
    if (el.tagName === 'PICTURE') return
    if (el.tagName.toLowerCase() === 'svg' && el.parentElement && el.parentElement.closest('svg')) return
    const b = box(el)
    if (b.w < 44 || b.h < 44) return
    push({ t: 'img', ...b, alt: el.getAttribute('alt') || el.getAttribute('aria-label') || el.tagName.toLowerCase() }, el)
  })
  document.querySelectorAll('input, textarea, select').forEach((el) => {
    if (!shown(el) || ['hidden', 'submit', 'button'].includes(el.type)) return
    const id = el.id
    const lab = id ? document.querySelector('label[for="' + CSS.escape(id) + '"]') : el.closest('label')
    push({ t: 'input', ...box(el), kind: el.tagName === 'INPUT' ? el.type : el.tagName.toLowerCase(), name: el.name || id || '', label: lab ? txt(lab, 60) : (el.placeholder || ''), required: !!el.required }, el)
  })
  document.querySelectorAll(BTN).forEach((el) => {
    if (!shown(el)) return
    const cs = getComputedStyle(el)
    const b = box(el)
    if (b.w < 24 || b.h < 16) return
    const bg = lum(cs.backgroundColor)
    push({ t: 'btn', ...b, text: txt(el, 60), label: el.getAttribute('aria-label') || '', href: el.getAttribute('href') || '', solid: bg !== null && bg < 0.8, fs: parseFloat(cs.fontSize) }, el)
  })

  const forms = [...document.querySelectorAll('form')].filter(shown).map((f) => ({
    id: f.id || '', action: f.getAttribute('action') || '', method: (f.getAttribute('method') || 'get').toLowerCase(), ...box(f),
    fields: [...f.querySelectorAll('input, textarea, select')].filter((el) => el.type !== 'hidden').map((el) => ({ name: el.name || el.id || '', type: el.tagName === 'INPUT' ? el.type : el.tagName.toLowerCase(), required: !!el.required })),
  }))

  return {
    title: document.title,
    description: (document.querySelector('meta[name="description"]') || {}).content || '',
    robots: (document.querySelector('meta[name="robots"]') || {}).content || '',
    lang: document.documentElement.lang || '',
    h1: [...document.querySelectorAll('h1')].filter(shown).map((h) => txt(h, 160)),
    width: vw, height: docH, sections, blocks, floating, forms,
  }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function wrap(text, widthPx, fontPx, maxLines) {
  const perLine = Math.max(4, Math.floor(widthPx / (fontPx * 0.54)))
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > perLine && cur) { lines.push(cur); cur = w } else cur = (cur + ' ' + w).trim()
    if (lines.length === maxLines) break
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  return lines
}

export function toSvg(layout) {
  const { width: W, height: H, sections, blocks } = layout
  const o = []
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, system-ui, sans-serif">`)
  o.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`)
  for (const s of sections) {
    if (s.fixed && s.box.y < 4 && s.box.h < 140) continue
    const fill = s.dark ? '#1f2530' : (s.n % 2 ? '#ffffff' : '#fafaf8')
    o.push(`<rect x="0" y="${s.box.y}" width="${W}" height="${s.box.h}" fill="${fill}"/>`)
  }
  const ink = (dark, a, b) => (dark ? b : a)
  for (const b of blocks.filter((x) => x.t === 'card')) {
    o.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="14" fill="${ink(b.dark, '#ffffff', '#262d3a')}" fill-opacity="0.55" stroke="${ink(b.dark, '#cfd4dc', '#4a5568')}" stroke-width="1.5"/>`)
  }
  for (const b of blocks.filter((x) => x.t === 'table')) {
    o.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="none" stroke="#b8bec9" stroke-width="1.5"/>`)
    const rows = Math.min(b.rows || 1, 40)
    for (let i = 1; i < rows; i++) o.push(`<line x1="${b.x}" x2="${b.x + b.w}" y1="${b.y + (b.h * i) / rows}" y2="${b.y + (b.h * i) / rows}" stroke="#d9dde4" stroke-width="1"/>`)
    const cols = Math.min(b.cols || 1, 10)
    for (let i = 1; i < cols; i++) o.push(`<line y1="${b.y}" y2="${b.y + b.h}" x1="${b.x + (b.w * i) / cols}" x2="${b.x + (b.w * i) / cols}" stroke="#d9dde4" stroke-width="1"/>`)
  }
  for (const b of blocks.filter((x) => x.t === 'img')) {
    o.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#eceef2" stroke="#b8bec9" stroke-width="1.5"/>`)
    o.push(`<path d="M${b.x} ${b.y}L${b.x + b.w} ${b.y + b.h}M${b.x + b.w} ${b.y}L${b.x} ${b.y + b.h}" stroke="#c9ced8" stroke-width="1"/>`)
  }
  for (const b of blocks.filter((x) => x.t === 'p')) {
    const barH = Math.max(3, b.fs * 0.42)
    for (const [x, y, w, h] of b.ln || []) {
      o.push(`<rect x="${x}" y="${(y + (h - barH) / 2).toFixed(1)}" width="${w}" height="${barH.toFixed(1)}" rx="${(barH / 2).toFixed(1)}" fill="${ink(b.dark, '#d3d8e0', '#4b5566')}"/>`)
    }
  }
  for (const b of blocks.filter((x) => x.t === 'h')) {
    const fill = ink(b.dark, '#1b2430', '#f3f4f6')
    const weight = b.level <= 2 ? 700 : 600
    if (b.ln && b.ln.length) {
      // real line breaks, stretched to the measured width so the wireframe keeps the page's rhythm
      for (const l of b.ln) o.push(`<text x="${l.x}" y="${(l.y + l.h * 0.5 + b.fs * 0.35).toFixed(1)}" font-size="${b.fs}" font-weight="${weight}" fill="${fill}" textLength="${l.w}" lengthAdjust="spacingAndGlyphs">${esc(l.text)}</text>`)
    } else {
      const maxLines = Math.max(1, Math.round(b.h / (b.fs * 1.15)))
      wrap(b.text, b.w, b.fs, maxLines).forEach((line, i) => {
        o.push(`<text x="${b.x}" y="${(b.y + b.fs * 0.92 + i * b.fs * 1.15).toFixed(1)}" font-size="${b.fs}" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`)
      })
    }
  }
  for (const b of blocks.filter((x) => x.t === 'link')) {
    o.push(`<text x="${b.x}" y="${(b.y + b.h * 0.5 + b.fs * 0.35).toFixed(1)}" font-size="${b.fs}" font-weight="500" fill="${ink(b.dark, '#3b4453', '#e5e7eb')}" textLength="${b.w}" lengthAdjust="spacingAndGlyphs">${esc(b.text)}</text>`)
  }
  for (const b of blocks.filter((x) => x.t === 'input')) {
    o.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="#ffffff" stroke="#7b8494" stroke-width="1.5"/>`)
    if (b.h >= 18 && b.w > 60) o.push(`<text x="${b.x + 10}" y="${b.y + Math.min(b.h / 2 + 5, 24)}" font-size="13" fill="#8a93a3">${esc((b.name || b.kind).slice(0, Math.floor(b.w / 8)))}</text>`)
  }
  for (const b of blocks.filter((x) => x.t === 'btn')) {
    const rx = Math.min(b.h / 2, 999)
    o.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${rx}" fill="${b.solid ? '#b45309' : '#ffffff'}" fill-opacity="${b.solid ? 1 : 0.9}" stroke="${b.solid ? '#92400e' : '#3b4453'}" stroke-width="1.5"/>`)
    const fsz = Math.min(b.fs || 14, b.h * 0.5)
    const label = b.text.slice(0, Math.max(2, Math.floor(b.w / (fsz * 0.56))))
    if (label && b.w >= 56) o.push(`<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + fsz * 0.35}" font-size="${fsz}" font-weight="600" text-anchor="middle" fill="${b.solid ? '#ffffff' : '#1b2430'}">${esc(label)}</text>`)
    else if (!label || b.w < 56) {
      // icon-only control (menu toggle, close, copy): three short strokes
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2, half = Math.min(b.w, b.h) * 0.22
      for (const dy of [-half * 0.7, 0, half * 0.7]) o.push(`<line x1="${cx - half}" x2="${cx + half}" y1="${cy + dy}" y2="${cy + dy}" stroke="${b.solid ? '#ffffff' : '#3b4453'}" stroke-width="1.5"/>`)
    }
  }
  for (const s of sections) {
    if (s.fixed && s.box.y < 4 && s.box.h < 140) continue
    o.push(`<line x1="0" x2="${W}" y1="${s.box.y}" y2="${s.box.y}" stroke="#d97706" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="8 7"/>`)
  }
  o.push('</svg>')
  return o.join('\n')
}

async function main() {
  const PW = process.env.PLAYWRIGHT_MODULE || '/home/koh/.claude/skills/gstack/node_modules/playwright/index.mjs'
  const { chromium } = await import(PW).catch(() => import('playwright'))
  const only = opt('--only', '').split(',').filter(Boolean)
  const pages = only.length ? PAGES.filter((p) => only.includes(p.slug)) : PAGES
  for (const d of ['layout', 'svg', 'shots']) fs.mkdirSync(path.join(OUT, d), { recursive: true })

  const site = exportSite()
  const server = await serve(site.dir)
  const base = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox'] })
  const summary = { captured_from: site.ref, pages: [] }
  try {
    for (const pg of pages) {
      const entry = { slug: pg.slug, path: pg.path, group: pg.group, views: {} }
      for (const vp of VIEWPORTS) {
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: 'reduce' })
        const page = await ctx.newPage()
        await page.route('**/.netlify/functions/**', (route) => route.fulfill({ status: 204, body: '' }))
        const resp = await page.goto(base + pg.path, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => null)
        await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;scroll-behavior:auto!important}.reveal{opacity:1!important;transform:none!important}' })
        await page.evaluate(async () => {
          const h = document.documentElement.scrollHeight
          for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)) }
          window.scrollTo(0, 0)
        })
        await page.waitForTimeout(250)
        const layout = await page.evaluate(measure)
        layout.slug = pg.slug
        layout.path = pg.path
        layout.viewport = vp.name
        layout.http_status = resp ? resp.status() : null
        fs.writeFileSync(path.join(OUT, 'layout', `${pg.slug}.${vp.name}.json`), JSON.stringify(layout))
        fs.writeFileSync(path.join(OUT, 'svg', `${pg.slug}.${vp.name}.svg`), toSvg(layout))
        await page.screenshot({ path: path.join(OUT, 'shots', `${pg.slug}.${vp.name}.jpg`), fullPage: true, type: 'jpeg', quality: 64 })
        entry.views[vp.name] = { width: layout.width, height: layout.height, sections: layout.sections.length, blocks: layout.blocks.length, screens: +(layout.height / vp.height).toFixed(1) }
        entry.title = layout.title
        await ctx.close()
        console.log(`${pg.slug.padEnd(34)} ${vp.name.padEnd(8)} ${String(layout.height).padStart(6)}px  ${layout.sections.length} sections  ${layout.blocks.length} blocks`)
      }
      summary.pages.push(entry)
    }
  } finally {
    await browser.close()
    server.close()
    site.cleanup()
  }
  const file = path.join(OUT, 'layout', '_summary.json')
  let prior = { pages: [] }
  if (only.length && fs.existsSync(file)) prior = JSON.parse(fs.readFileSync(file, 'utf8'))
  const merged = [...prior.pages.filter((p) => !summary.pages.find((q) => q.slug === p.slug)), ...summary.pages]
  merged.sort((a, b) => PAGES.findIndex((p) => p.slug === a.slug) - PAGES.findIndex((p) => p.slug === b.slug))
  fs.writeFileSync(file, JSON.stringify({ captured_from: summary.captured_from, pages: merged }, null, 2))
  console.log(`\nCaptured ${summary.pages.length} pages from ${site.ref} into ${path.relative(ROOT, OUT)}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err); process.exit(1) })
}
