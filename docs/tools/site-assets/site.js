// HAND docs site: search, the phone menu, viewport tabs, and wireframe band highlighting.
(() => {
  'use strict'

  const MAX_RESULTS = 30
  const SNIPPET_RADIUS = 90
  const index = window.HAND_DOCS_INDEX || []
  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // ---------- search ----------

  const input = document.getElementById('q')
  const results = document.getElementById('results')

  function snippet(text, words) {
    const lower = text.toLowerCase()
    const at = Math.max(0, Math.min(...words.map((w) => { const i = lower.indexOf(w); return i < 0 ? Infinity : i })))
    const start = Number.isFinite(at) ? Math.max(0, at - SNIPPET_RADIUS) : 0
    const cut = text.slice(start, start + SNIPPET_RADIUS * 2.4)
    const marked = words.reduce((html, w) => html.replace(new RegExp(`(${escapeRegex(escapeHtml(w))})`, 'gi'), '<mark>$1</mark>'), escapeHtml(cut))
    return `${start > 0 ? '… ' : ''}${marked} …`
  }

  function search(query) {
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1)
    if (!words.length) return []
    return index
      .map((entry) => {
        const heading = `${entry.t} ${entry.h}`.toLowerCase()
        const body = entry.x.toLowerCase()
        if (!words.every((w) => heading.includes(w) || body.includes(w))) return null
        const score = words.reduce((sum, w) => sum + (heading.includes(w) ? 5 : 0) + (body.includes(w) ? 1 : 0), 0)
        return { entry, score }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map(({ entry }) => ({ entry, words }))
  }

  function showResults() {
    const found = search(input.value)
    if (!input.value.trim()) { results.hidden = true; return }
    results.hidden = false
    results.innerHTML = found.length
      ? found.map(({ entry, words }) => `<a href="${entry.p}${entry.a ? `#${entry.a}` : ''}"><span class="r-doc">${escapeHtml(entry.t)}</span><br><span class="r-head">${escapeHtml(entry.h || entry.t)}</span><br><span class="r-snip">${snippet(entry.x, words)}</span></a>`).join('')
      : '<p class="r-none">Nothing matches. Try fewer or different words.</p>'
  }

  if (input && results) {
    input.addEventListener('input', showResults)
    input.addEventListener('focus', showResults)
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { results.hidden = true; input.blur() }
      if (event.key === 'ArrowDown') { const first = results.querySelector('a'); if (first) { event.preventDefault(); first.focus() } }
    })
    results.addEventListener('keydown', (event) => {
      const links = [...results.querySelectorAll('a')]
      const at = links.indexOf(document.activeElement)
      if (event.key === 'ArrowDown' && links[at + 1]) { event.preventDefault(); links[at + 1].focus() }
      if (event.key === 'ArrowUp') { event.preventDefault(); (links[at - 1] || input).focus() }
      if (event.key === 'Escape') { results.hidden = true; input.focus() }
    })
    document.addEventListener('click', (event) => { if (!event.target.closest('.search')) results.hidden = true })
    document.addEventListener('keydown', (event) => {
      if (event.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) { event.preventDefault(); input.focus() }
    })
  }

  // ---------- phone menu ----------

  const menu = document.querySelector('.bar__menu')
  const side = document.getElementById('side')
  if (menu && side) {
    menu.addEventListener('click', () => {
      const open = side.classList.toggle('is-open')
      menu.setAttribute('aria-expanded', String(open))
    })
  }
  const current = side && side.querySelector('[aria-current="page"]')
  if (current) current.scrollIntoView({ block: 'center' })

  // ---------- wireframe pages ----------

  document.querySelectorAll('.tabs [role="tab"]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tabs [role="tab"]').forEach((other) => other.setAttribute('aria-selected', String(other === tab)))
      document.querySelectorAll('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== tab.dataset.view })
    })
  })

  const mark = (n, on) => {
    document.querySelectorAll(`[data-band="${n}"], [data-ann="${n}"]`).forEach((el) => el.classList.toggle('is-on', on))
  }
  document.querySelectorAll('[data-band]').forEach((band) => {
    band.addEventListener('mouseenter', () => mark(band.dataset.band, true))
    band.addEventListener('mouseleave', () => mark(band.dataset.band, false))
  })
  document.querySelectorAll('[data-ann]').forEach((ann) => {
    if (!ann.dataset.ann) return
    ann.addEventListener('mouseenter', () => mark(ann.dataset.ann, true))
    ann.addEventListener('mouseleave', () => mark(ann.dataset.ann, false))
  })
})()
