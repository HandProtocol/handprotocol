// A small Markdown converter for the HAND docs site. It covers what the dossiers use:
// headings, paragraphs, blockquotes, nested lists, tables, fenced code, rules, and inline
// code, bold, italic and links. Raw HTML in the source is escaped, never passed through.

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export const slugify = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section'

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/
const SAFE_URL = /^(https?:|mailto:|#|\/|\.\.?\/|[\w.-]+\.(html|md|json|jpg|svg)\b)/i

function inline(text, options) {
  const held = []
  const hold = (html) => `\u0000${held.push(html) - 1}\u0000`
  let out = String(text).replace(/`([^`]+)`/g, (_, code) => {
    const target = options.linkFor ? options.linkFor(code.trim()) : null
    const html = `<code>${escapeHtml(code)}</code>`
    return hold(target ? `<a class="doclink" href="${target}">${html}</a>` : html)
  })
  out = escapeHtml(out)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
    if (!SAFE_URL.test(url)) return match
    const target = options.linkFor && /\.md(#.*)?$/.test(url) ? options.linkFor(url.replace(/#.*$/, '')) : null
    const href = target || url
    const external = /^https?:/.test(href)
    return hold(`<a href="${href}"${external ? ' rel="noopener noreferrer"' : ''}>${label}</a>`)
  })
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
  out = out.replace(/(^|[\s(])_([^_\s][^_]*)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
  // Restore held fragments; a held link label may itself contain held code.
  for (let pass = 0; pass < 3; pass += 1) out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => held[Number(i)])
  return out
}

function splitRow(line) {
  const cells = []
  let current = ''
  let inCode = false
  const body = line.trim().replace(/^\|/, '').replace(/\|\s*$/, '')
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]
    if (ch === '`') inCode = !inCode
    if (ch === '\\' && body[i + 1] === '|') { current += '|'; i += 1; continue }
    if (ch === '|' && !inCode) { cells.push(current.trim()); current = ''; continue }
    current += ch
  }
  cells.push(current.trim())
  return cells
}

function renderList(lines, start, options) {
  const first = lines[start].match(LIST_ITEM)
  const baseIndent = first[1].length
  const ordered = /\d/.test(first[2])
  const items = []
  let i = start
  while (i < lines.length) {
    const match = lines[i].match(LIST_ITEM)
    if (match && match[1].length === baseIndent) {
      items.push({ text: match[3], children: '' })
      i += 1
      continue
    }
    if (match && match[1].length > baseIndent && items.length) {
      const nested = renderList(lines, i, options)
      items[items.length - 1].children += nested.html
      i = nested.next
      continue
    }
    const indented = /^\s+\S/.test(lines[i]) && lines[i].search(/\S/) > baseIndent
    if (indented && items.length) { items[items.length - 1].text += ` ${lines[i].trim()}`; i += 1; continue }
    if (lines[i].trim() === '' && i + 1 < lines.length) {
      const after = lines[i + 1].match(LIST_ITEM)
      if (after && after[1].length >= baseIndent) { i += 1; continue }
    }
    break
  }
  const tag = ordered ? 'ol' : 'ul'
  const body = items.map((item) => {
    const task = item.text.match(/^\[( |x|X)\]\s+(.*)$/)
    const text = task ? `<span class="task task--${task[1] === ' ' ? 'open' : 'done'}" aria-hidden="true"></span>${inline(task[2], options)}` : inline(item.text, options)
    return `<li>${text}${item.children}</li>`
  }).join('')
  return { html: `<${tag}>${body}</${tag}>`, next: i }
}

const startsBlock = (line, next) => /^(#{1,6}\s|```|>|\s*([-*+]|\d+[.)])\s+)/.test(line) || /^(-{3,}|\*{3,})\s*$/.test(line) || (line.trim().startsWith('|') && next !== undefined && TABLE_RULE.test(next))

export function renderMarkdown(source, options = {}) {
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n')
  const shift = options.headingShift || 0
  const html = []
  const headings = []
  const sections = []
  const usedIds = new Map()
  let title = ''
  let section = { id: '', heading: '', text: '' }
  const note = (text) => { section.text += ` ${text}` }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') { i += 1; continue }

    const fence = line.match(/^```(\w*)/)
    if (fence) {
      const code = []
      i += 1
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i += 1 }
      i += 1
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
      note(code.join(' '))
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*$/)
    if (heading) {
      const level = Math.min(6, heading[1].length + shift)
      const text = heading[2]
      const plain = text.replace(/[`*_]/g, '')
      const base = slugify(plain)
      const count = usedIds.get(base) || 0
      usedIds.set(base, count + 1)
      const id = count ? `${base}-${count + 1}` : base
      if (level === 1 && !title) title = plain
      headings.push({ level, id, text: plain })
      if (level <= 3) {
        if (section.heading || section.text.trim()) sections.push(section)
        section = { id, heading: plain, text: '' }
      } else note(plain)
      html.push(`<h${level} id="${id}">${inline(text, options)}</h${level}>`)
      i += 1
      continue
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { html.push('<hr>'); i += 1; continue }

    if (line.startsWith('>')) {
      const quote = []
      while (i < lines.length && lines[i].startsWith('>')) { quote.push(lines[i].replace(/^>\s?/, '')); i += 1 }
      const inner = renderMarkdown(quote.join('\n'), { ...options, headingShift: shift })
      html.push(`<blockquote>${inner.html}</blockquote>`)
      note(quote.join(' '))
      continue
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && TABLE_RULE.test(lines[i + 1])) {
      const head = splitRow(line)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(splitRow(lines[i])); i += 1 }
      const th = head.map((cell) => `<th>${inline(cell, options)}</th>`).join('')
      const body = rows.map((row) => `<tr>${head.map((_, c) => `<td>${inline(row[c] || '', options)}</td>`).join('')}</tr>`).join('')
      html.push(`<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`)
      note([head, ...rows].map((row) => row.join(' ')).join(' '))
      continue
    }

    if (LIST_ITEM.test(line)) {
      const startAt = i
      const list = renderList(lines, i, options)
      html.push(list.html)
      note(lines.slice(startAt, list.next).join(' '))
      i = list.next
      continue
    }

    const paragraph = [line]
    i += 1
    while (i < lines.length && lines[i].trim() !== '' && !startsBlock(lines[i], lines[i + 1])) { paragraph.push(lines[i]); i += 1 }
    html.push(`<p>${inline(paragraph.join(' '), options)}</p>`)
    note(paragraph.join(' '))
  }
  if (section.heading || section.text.trim()) sections.push(section)
  const cleaned = sections.map((s) => ({ ...s, text: s.text.replace(/[`*|]/g, ' ') }))
  return { html: html.join('\n'), title, headings, sections: cleaned }
}
