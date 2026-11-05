#!/usr/bin/env node
// Build the HAND docs site: static HTML that opens straight from disk.
//
//   node docs/tools/build.mjs
//
// Reads   docs/closed/*.md, docs/closed/{research,onboarding}/*.md, docs/certified/*.md,
//         and the wireframe data in docs/closed/wireframes/ (capture.mjs writes layout, svg, shots;
//         pages/*.json and routes.json are the written annotations).
// Writes  docs/closed/site/ (inside the self-ignoring closed folder, so it cannot be committed).
//
// No dependencies. Markdown is converted by the small converter in lib/markdown.mjs.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderMarkdown, escapeHtml, slugify } from './lib/markdown.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const CLOSED = path.join(ROOT, 'docs/closed')
const CERTIFIED = path.join(ROOT, 'docs/certified')
const WIRE = path.join(CLOSED, 'wireframes')
const OUT = path.join(CLOSED, 'site')
const SNIPPET_LENGTH = 1400

const GROUPS = [
  { title: 'Start here', test: (n) => ['00', '21', '40'].includes(n) },
  { title: 'The organization', test: (n) => n >= '01' && n <= '04' },
  { title: 'The main site', test: (n) => n >= '05' && n <= '09' },
  { title: 'What HAND has built', test: (n) => n >= '10' && n <= '20' },
  { title: 'Audits', test: (n) => n >= '30' && n <= '39' },
]

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null)
const listFiles = (dir, ext) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(ext)).sort() : [])

// ---------- collect the documents ----------

function loadDoc(file, kind, group) {
  const source = fs.readFileSync(file, 'utf8')
  const base = path.basename(file, '.md')
  const rendered = renderMarkdown(source)
  return {
    file, kind, group, base, source,
    out: `${kind === 'certified' ? 'c' : 'd'}-${slugify(base)}.html`,
    title: rendered.title || base,
    words: source.split(/\s+/).length,
    modified: fs.statSync(file).mtime,
  }
}

function collectDocs() {
  const numbered = listFiles(CLOSED, '.md').filter((f) => /^\d\d-/.test(f)).map((f) => {
    const n = f.slice(0, 2)
    const group = GROUPS.find((g) => g.test(n))
    return loadDoc(path.join(CLOSED, f), 'closed', group ? group.title : 'Other')
  })
  const extra = ['research', 'onboarding'].flatMap((dir) =>
    listFiles(path.join(CLOSED, dir), '.md').map((f) => loadDoc(path.join(CLOSED, dir, f), 'closed', 'Research and specs')))
  const handoff = fs.existsSync(path.join(CLOSED, 'HANDOFF.md')) ? [loadDoc(path.join(CLOSED, 'HANDOFF.md'), 'closed', 'Program')] : []
  const certified = listFiles(CERTIFIED, '.md').map((f) => loadDoc(path.join(CERTIFIED, f), 'certified', 'Certified set'))
  return [...numbered, ...extra, ...certified, ...handoff]
}

// ---------- wireframe data ----------

function collectPages() {
  const summary = readJson(path.join(WIRE, 'layout/_summary.json'))
  if (!summary) return { capturedFrom: 'not captured yet', pages: [] }
  const pages = summary.pages.map((page) => ({
    ...page,
    out: `w-${page.slug}.html`,
    annotation: readJson(path.join(WIRE, 'pages', `${page.slug}.json`)),
    layout: {
      desktop: readJson(path.join(WIRE, 'layout', `${page.slug}.desktop.json`)),
      phone: readJson(path.join(WIRE, 'layout', `${page.slug}.phone.json`)),
    },
  }))
  return { capturedFrom: summary.captured_from, pages }
}

// ---------- page shell ----------

function navHtml(docs, pages, current) {
  const order = [...GROUPS.map((g) => g.title), 'Wireframes', 'Research and specs', 'Certified set', 'Other', 'Program']
  const item = (href, label, badge = '') => `<li><a href="${href}"${href === current ? ' aria-current="page"' : ''}>${escapeHtml(label)}${badge}</a></li>`
  const groups = order.map((title) => {
    if (title === 'Wireframes') {
      const items = [item('wireframes.html', 'Main site wireframes'), ...pages.map((p) => item(p.out, p.path))]
      return `<section><h2>Wireframes</h2><ul>${items.join('')}</ul></section>`
    }
    const items = docs.filter((d) => d.group === title).map((d) => item(d.out, d.title.replace(/^(\d\d)\. /, '$1 ')))
    return items.length ? `<section><h2>${title}</h2><ul>${items.join('')}</ul></section>` : ''
  })
  return `<ul class="side__home">${item('index.html', 'Overview')}</ul>${groups.join('')}`
}

function shell({ title, kind, body, toc = '', nav, current }) {
  const badge = kind === 'certified'
    ? `<span class="badge badge--certified" title="Built only from facts that are already public. Not published until koH signs off.">Certified set</span>`
    : `<span class="badge badge--closed" title="Internal to HAND. The GitHub repo is public: this never leaves this machine.">Closed</span>`
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)} · HAND docs</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:ital,wght@1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">
</head>
<body class="kind-${kind}">
<a class="skip" href="#content">Skip to content</a>
<header class="bar">
  <button class="bar__menu" type="button" aria-expanded="false" aria-controls="side">Menu</button>
  <a class="bar__brand" href="index.html">HAND docs</a>
  ${badge}
  <form class="search" role="search" onsubmit="return false">
    <label class="sr-only" for="q">Search the docs</label>
    <input id="q" type="search" placeholder="Search every doc" autocomplete="off">
    <div class="search__results" id="results" hidden></div>
  </form>
</header>
<div class="layout">
  <nav class="side" id="side" aria-label="Documents">${nav.replaceAll(`href="${current}"`, `href="${current}" aria-current="page"`)}</nav>
  <main class="content" id="content">${body}</main>
  ${toc ? `<aside class="toc" aria-label="On this page"><h2>On this page</h2>${toc}</aside>` : ''}
</div>
<script src="assets/search-index.js"></script>
<script src="assets/site.js"></script>
</body>
</html>
`
}

const tocHtml = (headings) => {
  const items = headings.filter((h) => h.level === 2)
  return items.length > 1 ? `<ul>${items.map((h) => `<li><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`).join('')}</ul>` : ''
}

// ---------- document pages ----------

function docPage(doc, linkFor) {
  const rendered = renderMarkdown(doc.source, { linkFor })
  const meta = `<p class="meta">${doc.kind === 'certified' ? 'docs/certified' : 'docs/closed'}/${escapeHtml(path.relative(doc.kind === 'certified' ? CERTIFIED : CLOSED, doc.file))} · ${doc.words.toLocaleString('en-US')} words · file last changed ${doc.modified.toISOString().slice(0, 10)}</p>`
  return { body: `<article class="prose">${meta}${rendered.html}</article>`, toc: tocHtml(rendered.headings), sections: rendered.sections }
}

// ---------- wireframe pages ----------

function matchLayoutSection(annotation, layoutSections) {
  const id = String(annotation.id || '').replace(/^~/, '')
  const byId = layoutSections.find((s) => s.id && s.id === id)
  if (byId) return byId
  const selector = String(annotation.selector || '')
  const tag = selector.match(/^(nav|footer|header|main)\b/)
  return tag ? layoutSections.find((s) => s.tag === tag[1]) || null : null
}

function bandsHtml(layout, slug, viewport) {
  if (!layout) return `<p class="empty">Not captured for this viewport.</p>`
  const bands = layout.sections.map((s) => {
    const top = (s.box.y / layout.height) * 100
    const height = (Math.max(s.box.h, 24) / layout.height) * 100
    const label = s.heading || s.id || s.tag
    return `<a class="band${s.fixed ? ' band--fixed' : ''}" href="#s-${s.n}" style="top:${top.toFixed(3)}%;height:${height.toFixed(3)}%" data-band="${s.n}" title="${escapeHtml(label)}"><span class="band__n">${s.n}</span></a>`
  }).join('')
  return `<div class="frame frame--${viewport}"><img src="../wireframes/svg/${slug}.${viewport}.svg" alt="Wireframe of ${escapeHtml(layout.path)} at ${layout.width} pixels wide" width="${layout.width}" height="${layout.height}" loading="lazy">${bands}</div>`
}

const listHtml = (items, cls = '') => (items && items.length ? `<ul class="${cls}">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : '')

function annotationHtml(section, number) {
  const ctas = (section.ctas || []).map((c) => `<li><span class="cta cta--${escapeHtml(String(c.kind || 'inline').split(/[ ,]/)[0])}">${escapeHtml(c.label)}</span> <code>${escapeHtml(c.href)}</code></li>`).join('')
  const forms = (section.forms || []).map((f) => `<div class="formspec"><p><strong>Form</strong> <code>${escapeHtml(f.id || '')}</code> sends to <code>${escapeHtml(f.submits_to || '')}</code></p><div class="table-wrap"><table><thead><tr><th>Field</th><th>Label</th><th>Type</th><th>Required</th></tr></thead><tbody>${(f.fields || []).map((x) => `<tr><td><code>${escapeHtml(x.name)}</code></td><td>${escapeHtml(x.label)}</td><td>${escapeHtml(x.type)}</td><td>${x.required ? 'yes' : 'no'}</td></tr>`).join('')}</tbody></table></div>${f.states && f.states.length ? `<p class="small">States: ${escapeHtml(f.states.join(' · '))}</p>` : ''}</div>`).join('')
  return `<section class="ann" id="${number ? `s-${number}` : `s-${slugify(section.id || section.heading || 'x')}`}" data-ann="${number || ''}">
    <header class="ann__head"><span class="ann__n">${number || '·'}</span><div><p class="ann__kind">${escapeHtml(section.kind || '')}${section.eyebrow ? ` · ${escapeHtml(section.eyebrow)}` : ''}</p><h3>${escapeHtml(section.heading || section.id || '(no heading)')}</h3></div></header>
    ${section.what_it_says ? `<p>${escapeHtml(section.what_it_says)}</p>` : ''}
    ${section.job ? `<p class="ann__job"><strong>Its job:</strong> ${escapeHtml(section.job)}</p>` : ''}
    ${section.elements && section.elements.length ? `<details><summary>What is in it (${section.elements.length})</summary>${listHtml(section.elements)}</details>` : ''}
    ${ctas ? `<h4>Calls to action</h4><ul class="ctas">${ctas}</ul>` : ''}
    ${forms}
    ${section.facts && section.facts.length ? `<details><summary>Checkable facts stated here (${section.facts.length})</summary>${listHtml(section.facts)}</details>` : ''}
    ${section.notes ? `<p class="ann__notes"><strong>Notes:</strong> ${escapeHtml(section.notes)}</p>` : ''}
  </section>`
}

function layoutOnlyHtml(section) {
  const links = (section.links || []).slice(0, 12).map((l) => `<li>${escapeHtml(l.text)} <code>${escapeHtml(l.href)}</code></li>`).join('')
  return `<section class="ann" id="s-${section.n}" data-ann="${section.n}"><header class="ann__head"><span class="ann__n">${section.n}</span><div><p class="ann__kind">${escapeHtml(section.tag)}${section.eyebrow ? ` · ${escapeHtml(section.eyebrow)}` : ''}</p><h3>${escapeHtml(section.heading || section.id || section.tag)}</h3></div></header>${links ? `<h4>Links</h4><ul class="ctas">${links}</ul>` : ''}</section>`
}

function wireframePage(page) {
  const a = page.annotation
  const desktop = page.layout.desktop
  const sections = a
    ? a.sections.map((s) => { const m = desktop ? matchLayoutSection(s, desktop.sections) : null; return annotationHtml(s, m ? m.n : null) }).join('')
    : (desktop ? desktop.sections.map(layoutOnlyHtml).join('') : '')
  const facts = [
    ['Address', `<code>${escapeHtml(page.path)}</code>`],
    ['Source', a ? `<code>${escapeHtml(a.source_file)}</code>` : 'not annotated yet'],
    ['Status', a ? escapeHtml(a.status) : escapeHtml(page.group)],
    ['In sitemap', a ? (a.in_sitemap ? 'yes' : 'no') : 'unknown'],
    ['Robots', a ? escapeHtml(a.robots || 'none stated') : escapeHtml((desktop && desktop.robots) || 'none stated')],
    ['Gate', a && a.gate ? escapeHtml(typeof a.gate === 'string' ? a.gate : JSON.stringify(a.gate)) : 'none'],
    ['Audiences', a ? escapeHtml((a.audiences || []).join(', ')) : ''],
    ['Length', ['desktop', 'phone'].map((v) => page.views[v] ? `${v} ${page.views[v].height.toLocaleString('en-US')} px (${page.views[v].screens} screens)` : '').filter(Boolean).join(' · ')],
  ].filter(([, v]) => v)
  const issues = a && a.issues && a.issues.length
    ? `<h2 id="issues">Issues found on this page</h2><div class="table-wrap"><table><thead><tr><th>Severity</th><th>Issue</th><th>Evidence</th></tr></thead><tbody>${[...a.issues].sort((x, y) => 'hml'.indexOf(String(x.severity)[0]) - 'hml'.indexOf(String(y.severity)[0])).map((i) => `<tr><td><span class="sev sev--${escapeHtml(String(i.severity).split(/[ ,]/)[0])}">${escapeHtml(i.severity)}</span></td><td>${escapeHtml(i.issue)}</td><td>${escapeHtml(i.evidence || '')}</td></tr>`).join('')}</tbody></table></div>` : ''
  const scripts = a && a.scripts && a.scripts.length
    ? `<h2 id="scripts">Scripts</h2><div class="table-wrap"><table><thead><tr><th>File</th><th>What it does</th></tr></thead><tbody>${a.scripts.map((s) => `<tr><td><code>${escapeHtml(s.file)}</code></td><td>${escapeHtml(s.does)}</td></tr>`).join('')}</tbody></table></div>` : ''
  const body = `<article class="wire">
    <p class="meta">Wireframe · measured from the deployed commit</p>
    <h1>${escapeHtml(a ? a.title : page.title || page.path)}</h1>
    ${a && a.purpose ? `<p class="lede">${escapeHtml(a.purpose)}</p>` : ''}
    <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <div class="wire__grid">
      <div class="wire__frames">
        <div class="tabs" role="tablist" aria-label="Viewport">
          <button role="tab" aria-selected="true" data-view="desktop" type="button">Desktop 1440</button>
          <button role="tab" aria-selected="false" data-view="phone" type="button">Phone 390</button>
        </div>
        <div data-panel="desktop">${bandsHtml(page.layout.desktop, page.slug, 'desktop')}</div>
        <div data-panel="phone" hidden>${bandsHtml(page.layout.phone, page.slug, 'phone')}</div>
        <p class="small">Screenshots: <a href="../wireframes/shots/${page.slug}.desktop.jpg">desktop</a> · <a href="../wireframes/shots/${page.slug}.phone.jpg">phone</a>. Numbers are the page's sections, top to bottom.</p>
      </div>
      <div class="wire__notes"><h2 id="sections">Sections</h2>${sections}</div>
    </div>
    ${issues}${scripts}
  </article>`
  return { body, toc: '', sections: [{ id: '', heading: a ? a.title : page.path, text: a ? [a.purpose, ...a.sections.map((s) => `${s.heading} ${s.what_it_says || ''} ${(s.facts || []).join(' ')}`)].join(' ') : '' }] }
}

function routesHtml(routes) {
  if (!routes) return ''
  const cell = (v) => escapeHtml(Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v))
  const table = (head, rows) => `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
  return `<h2 id="gates">Gates</h2>
    ${table(['Paths', 'Edge function', 'How it checks', 'Env vars (names only)', 'When the env var is unset'], routes.gates.map((g) => [`<code>${cell(g.paths)}</code>`, cell(g.edge_function), cell(g.mechanism), `<code>${cell(g.env_vars)}</code>`, cell(g.behaviour_when_env_unset)]))}
    <h2 id="functions">Functions</h2>
    ${table(['Function', 'Methods', 'Purpose', 'Called from', 'Writes to', 'Notifies', 'Abuse protection'], routes.functions.map((f) => [`<code>${cell(f.name)}</code>`, cell(f.methods), cell(f.purpose), cell(f.called_from), cell(f.writes_to), cell(f.notifies), cell(f.spam_protection)]))}
    <h2 id="redirects">Redirects (${routes.redirects.length})</h2>
    <details><summary>Show every redirect</summary>${table(['From', 'To', 'Status', 'Defined in'], routes.redirects.map((r) => [`<code>${cell(r.from)}</code>`, `<code>${cell(r.to)}</code>`, cell(r.status), cell(r.defined_in)]))}</details>
    <h2 id="headers">Headers</h2>
    ${table(['For', 'Sets'], routes.headers.map((h) => [`<code>${cell(h.for)}</code>`, cell(h.sets)]))}`
}

function linkMapHtml(pages) {
  const internal = (href) => /^(\/|\.\.?\/|#)/.test(String(href))
  const rows = pages.filter((p) => p.annotation).map((p) => {
    const links = new Map()
    for (const s of p.annotation.sections) for (const c of s.ctas || []) {
      if (!internal(c.href) || String(c.href).startsWith('#')) continue
      links.set(c.href, [...(links.get(c.href) || []), c.label])
    }
    const out = [...links.entries()].map(([href, labels]) => `<li><code>${escapeHtml(href)}</code> <span class="small">${escapeHtml([...new Set(labels)].slice(0, 3).join(' · '))}</span></li>`).join('')
    return `<tr><td><a href="${p.out}">${escapeHtml(p.path)}</a></td><td>${out ? `<ul class="plainlist">${out}</ul>` : '<span class="small">no internal links out of its sections</span>'}</td></tr>`
  }).join('')
  return `<div class="table-wrap"><table><thead><tr><th>Page</th><th>Where its calls to action lead (inside the site)</th></tr></thead><tbody>${rows}</tbody></table></div>`
}

function wireframesHub(data, linkFor) {
  const journeysFile = path.join(WIRE, 'journeys.md')
  const journeys = fs.existsSync(journeysFile) ? renderMarkdown(fs.readFileSync(journeysFile, 'utf8'), { linkFor, headingShift: 1 }).html : ''
  const rows = data.pages.map((p) => {
    const a = p.annotation
    const high = a ? (a.issues || []).filter((i) => String(i.severity).startsWith('high')).length : 0
    return `<tr><td><a href="${p.out}">${escapeHtml(p.path)}</a></td><td>${escapeHtml(a ? a.status : p.group)}</td><td>${escapeHtml(a ? a.purpose : 'not annotated yet')}</td><td class="num">${p.views.desktop ? p.views.desktop.sections : ''}</td><td class="num">${p.views.desktop ? p.views.desktop.screens : ''}</td><td class="num">${p.views.phone ? p.views.phone.screens : ''}</td><td class="num">${a ? (a.issues || []).length : ''}${high ? ` <span class="sev sev--high">${high} high</span>` : ''}</td></tr>`
  }).join('')
  const body = `<article class="prose">
    <p class="meta">Wireframe doc · captured from ${escapeHtml(data.capturedFrom)}</p>
    <h1>Main site wireframes</h1>
    <p class="lede">Every page of handprotocol.org that a visitor can reach from the navigation, measured from the commit that is deployed, with what each section says, what it is for, where each button goes, and what is wrong with it.</p>
    <h2 id="pages">Pages</h2>
    <div class="table-wrap"><table><thead><tr><th>Page</th><th>Status</th><th>What it is for</th><th>Sections</th><th>Desktop screens</th><th>Phone screens</th><th>Issues</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small">A screen is 900 px on desktop and 844 px on a phone. Status words are defined in the overview.</p>
    ${journeys}
    <h2 id="link-map">Where the buttons lead</h2>
    ${linkMapHtml(data.pages)}
    ${routesHtml(readJson(path.join(WIRE, 'routes.json')))}
  </article>`
  return { body, sections: [{ id: '', heading: 'Main site wireframes', text: 'wireframes pages journeys gates functions redirects headers' }] }
}

// ---------- overview ----------

function overviewPage(docs, data, linkFor) {
  const indexDoc = docs.find((d) => d.base.startsWith('00-'))
  const intro = indexDoc ? renderMarkdown(indexDoc.source, { linkFor }).html : `<h1>HAND docs</h1><p class="lede">The internal record of everything HAND Protocol has built, what is public, and what is waiting on a decision.</p>`
  const rows = docs.filter((d) => d !== indexDoc).map((d) => `<tr><td><a href="${d.out}">${escapeHtml(d.title)}</a></td><td>${escapeHtml(d.group)}</td><td class="num">${d.words.toLocaleString('en-US')}</td><td>${d.modified.toISOString().slice(0, 10)}</td></tr>`).join('')
  const body = `<article class="prose">${intro}
    <h2 id="all-documents">All documents</h2>
    <div class="table-wrap"><table><thead><tr><th>Document</th><th>Group</th><th>Words</th><th>File changed</th></tr></thead><tbody>${rows}<tr><td><a href="wireframes.html">Main site wireframes</a></td><td>Wireframes</td><td class="num">${data.pages.length} pages</td><td></td></tr></tbody></table></div>
  </article>`
  return { body }
}

// ---------- write ----------

function build() {
  const docs = collectDocs()
  const data = collectPages()
  const byName = new Map(docs.flatMap((d) => [[path.basename(d.file), d.out], [d.base, d.out]]))
  const linkFor = (name) => byName.get(path.basename(String(name))) || null
  const nav = navHtml(docs, data.pages, '')
  const searchIndex = []
  const write = (file, html) => fs.writeFileSync(path.join(OUT, file), html)
  const addToIndex = (file, title, sections) => {
    for (const s of sections || []) searchIndex.push({ p: file, t: title, h: s.heading, a: s.id, x: s.text.replace(/\s+/g, ' ').slice(0, SNIPPET_LENGTH) })
  }

  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true })
  for (const f of listFiles(OUT, '.html')) fs.unlinkSync(path.join(OUT, f))

  for (const doc of docs) {
    if (doc.base.startsWith('00-')) continue
    const page = docPage(doc, linkFor)
    write(doc.out, shell({ title: doc.title, kind: doc.kind, body: page.body, toc: page.toc, nav, current: doc.out }))
    addToIndex(doc.out, doc.title, page.sections)
  }
  for (const page of data.pages) {
    const built = wireframePage(page)
    write(page.out, shell({ title: `Wireframe ${page.path}`, kind: 'closed', body: built.body, nav, current: page.out }))
    addToIndex(page.out, `Wireframe ${page.path}`, built.sections)
  }
  const hub = wireframesHub(data, linkFor)
  write('wireframes.html', shell({ title: 'Main site wireframes', kind: 'closed', body: hub.body, nav, current: 'wireframes.html' }))
  addToIndex('wireframes.html', 'Main site wireframes', hub.sections)
  write('index.html', shell({ title: 'Overview', kind: 'closed', body: overviewPage(docs, data, linkFor).body, nav, current: 'index.html' }))

  for (const asset of ['site.css', 'site.js']) fs.copyFileSync(path.join(HERE, 'site-assets', asset), path.join(OUT, 'assets', asset))
  fs.writeFileSync(path.join(OUT, 'assets/search-index.js'), `window.HAND_DOCS_INDEX = ${JSON.stringify(searchIndex)};\n`)

  console.log(`Built ${docs.length} documents and ${data.pages.length} wireframe pages into ${path.relative(ROOT, OUT)}/`)
  console.log(`Open ${path.join(OUT, 'index.html')}`)
}

build()
