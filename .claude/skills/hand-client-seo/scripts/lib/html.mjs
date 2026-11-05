// A small, forgiving HTML reader: enough of a tree to answer an SEO audit's
// questions (what sits in <head>, the heading outline, images, links,
// JSON-LD, visible text). It is not a spec parser. It never throws, and
// markup it does not understand becomes text. No dependencies.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style']);
const ESCAPABLE_TEXT = new Set(['title', 'textarea']);
// What a browser lets stay inside <head>. Anything else ends the head, and
// every tag after it (a canonical, a robots meta) lands in <body>, where
// search engines ignore it.
const HEAD_OK = new Set(['html', 'head', 'title', 'meta', 'link', 'script', 'style', 'base', 'noscript', 'template']);
const NOT_VISIBLE = new Set(['script', 'style', 'noscript', 'template', 'head', 'title', 'desc']);
// Skipped when reading an element's own text: an inline SVG's <title>/<desc>
// name the graphic, they are not copy.
const TEXT_SKIP = new Set(['script', 'style', 'template', 'title', 'desc']);
// An open tag in the key closes an open element in the value (omitted end tags).
const P_CLOSERS = new Set(['address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);
const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'td', 'th', 'tr', 'ul']);
const SIBLING_CLOSERS = { li: ['li'], dt: ['dt', 'dd'], dd: ['dt', 'dd'], tr: ['tr', 'td', 'th'], td: ['td', 'th'], th: ['td', 'th'], option: ['option'] };

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', trade: '™',
  mdash: '—', ndash: '–', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', sbquo: '‚', bdquo: '„',
  middot: '·', bull: '•', laquo: '«', raquo: '»', lsaquo: '‹', rsaquo: '›', deg: '°', times: '×', divide: '÷',
  plusmn: '±', frac12: '½', frac14: '¼', frac34: '¾', sect: '§', para: '¶', dagger: '†', euro: '€', pound: '£',
  cent: '¢', yen: '¥', iexcl: '¡', iquest: '¿', rarr: '→', larr: '←', uarr: '↑', darr: '↓', harr: '↔',
  hearts: '♥', check: '✓', star: '☆', starf: '★', shy: '­', ensp: ' ', emsp: ' ', thinsp: ' ',
  zwj: '‍', zwnj: '‌', minus: '−', prime: '′', Prime: '″', infin: '∞', ne: '≠', le: '≤', ge: '≥',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü', ccedil: 'ç',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü', Ccedil: 'Ç',
  agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù', acirc: 'â', ecirc: 'ê', icirc: 'î',
  ocirc: 'ô', ucirc: 'û', auml: 'ä', euml: 'ë', iuml: 'ï', ouml: 'ö', szlig: 'ß', oslash: 'ø', aring: 'å',
};

export function decodeEntities(value) {
  const s = String(value ?? '');
  if (s.indexOf('&') === -1) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return Object.prototype.hasOwnProperty.call(NAMED, body) ? NAMED[body] : match;
  });
}

const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();

export class El {
  constructor(tag, attrs, pos, parent) {
    this.tag = tag;
    this.attrs = attrs;
    this.pos = pos;
    this.parent = parent;
    this.children = [];
    this.inHead = false;
  }

  has(name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name);
  }

  attr(name) {
    return this.has(name) ? this.attrs[name] : null;
  }

  closest(...tags) {
    for (let n = this.parent; n; n = n.parent) if (tags.includes(n.tag)) return n;
    return null;
  }

  // True when the element or an ancestor carries the `hidden` attribute or
  // sits in a <template>/<noscript>: present in the source, not on the page.
  get offPage() {
    for (let n = this; n; n = n.parent) {
      if (n.tag === 'template' || n.tag === 'noscript' || n.fromHeadNoscript) return true;
      if (n.has && n.has('hidden')) return true;
    }
    return false;
  }

  // Descendant text, entities decoded, whitespace collapsed. Scripts and
  // styles never count as text.
  text() {
    const parts = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (!(child instanceof El)) parts.push(child.raw ? '' : decodeEntities(child.value));
        else if (child.tag === 'br') parts.push(' ');
        else if (!TEXT_SKIP.has(child.tag)) {
          // A line break or a block boundary separates words even when the
          // source has no space ("Dealer quality.<br>Without the bill.").
          const block = BLOCK.has(child.tag);
          if (block) parts.push(' ');
          walk(child);
          if (block) parts.push(' ');
        }
      }
    };
    walk(this);
    return squash(parts.join(''));
  }

  descendants(tag) {
    const out = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (!(child instanceof El)) continue;
        if (!tag || child.tag === tag) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
}

function readAttrs(html, start, end) {
  // html[start..end) is everything between the tag name and the closing '>'.
  const attrs = {};
  let i = start;
  let selfClose = false;
  while (i < end) {
    while (i < end && /\s/.test(html[i])) i++;
    if (i >= end) break;
    if (html[i] === '/') {
      selfClose = true;
      i++;
      continue;
    }
    selfClose = false;
    let j = i;
    while (j < end && !/[\s=/]/.test(html[j])) j++;
    // "=" at name position (broken markup): take one char so we always advance.
    if (j === i) j = i + 1;
    const name = html.slice(i, j).toLowerCase();
    i = j;
    while (i < end && /\s/.test(html[i])) i++;
    let value = '';
    if (html[i] === '=') {
      i++;
      while (i < end && /\s/.test(html[i])) i++;
      const quote = html[i];
      if (quote === '"' || quote === "'") {
        const close = html.indexOf(quote, i + 1);
        const stop = close === -1 || close > end ? end : close;
        value = html.slice(i + 1, stop);
        i = stop + 1;
      } else {
        let k = i;
        while (k < end && !/\s/.test(html[k])) k++;
        value = html.slice(i, k);
        i = k;
      }
    }
    if (name && !Object.prototype.hasOwnProperty.call(attrs, name)) attrs[name] = decodeEntities(value);
  }
  return { attrs, selfClose };
}

// Finds the '>' that ends a tag starting at `from`, skipping quoted values.
function tagEnd(html, from) {
  let quote = null;
  for (let i = from; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      // A quote only opens a value right after "=" (so it's="x" is safe).
      let k = i - 1;
      while (k > from && /\s/.test(html[k])) k--;
      if (html[k] === '=') quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return -1;
}

export class Doc {
  constructor(html) {
    this.html = html;
    this.root = new El('#root', {}, 0, null);
    this.all = [];
    this.comments = [];
    this.doctype = null;
    this.hasHeadTag = false;
    this.hasBodyTag = false;
    // { tag, pos }: the first element that does not belong in <head> but
    // appeared there, ending it early.
    this.headBrokenBy = null;
  }

  find(test) {
    return typeof test === 'function' ? this.all.filter(test) : this.all.filter((el) => el.tag === test);
  }

  first(test) {
    return typeof test === 'function' ? this.all.find(test) || null : this.all.find((el) => el.tag === test) || null;
  }

  lineOf(pos) {
    let line = 1;
    for (let i = 0; i < pos && i < this.html.length; i++) if (this.html.charCodeAt(i) === 10) line++;
    return line;
  }
}

export function parseHtml(source) {
  const html = String(source ?? '');
  const doc = new Doc(html);
  const stack = [doc.root];
  const n = html.length;
  let i = 0;
  let headOpen = false; // an explicit <head> is on the stack
  let headOver = false; // the head has ended (explicitly or by a body-only tag)

  const top = () => stack[stack.length - 1];
  const addText = (value, pos, raw = false) => {
    if (value) top().children.push({ value, pos, raw });
  };
  const popTo = (index) => {
    while (stack.length > index) {
      const gone = stack.pop();
      if (gone.tag === 'head') {
        headOpen = false;
        headOver = true;
      }
    }
  };
  const inForeign = () => stack.some((s) => s.tag === 'svg' || s.tag === 'math');

  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      addText(html.slice(i), i);
      break;
    }
    if (lt > i) addText(html.slice(i, lt), i);

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      doc.comments.push({ text: html.slice(lt + 4, end === -1 ? n : end), pos: lt });
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (html[lt + 1] === '!' || html[lt + 1] === '?') {
      const end = html.indexOf('>', lt);
      const chunk = html.slice(lt, end === -1 ? n : end + 1);
      if (/^<!doctype/i.test(chunk)) doc.doctype = chunk;
      i = end === -1 ? n : end + 1;
      continue;
    }

    if (html[lt + 1] === '/') {
      const m = /^<\/([a-zA-Z][^\s>/]*)/.exec(html.slice(lt, lt + 64));
      const end = html.indexOf('>', lt);
      if (!m || end === -1) {
        addText('<', lt);
        i = lt + 1;
        continue;
      }
      const tag = m[1].toLowerCase();
      let index = -1;
      for (let s = stack.length - 1; s > 0; s--) {
        if (stack[s].tag === tag) {
          index = s;
          break;
        }
      }
      if (index > 0) popTo(index);
      i = end + 1;
      continue;
    }

    const m = /^<([a-zA-Z][^\s>/]*)/.exec(html.slice(lt, lt + 64));
    if (!m) {
      addText('<', lt);
      i = lt + 1;
      continue;
    }
    const tag = m[1].toLowerCase();
    const nameEnd = lt + m[0].length;
    const gt = tagEnd(html, nameEnd);
    if (gt === -1) {
      addText(html.slice(lt), lt);
      break;
    }
    const { attrs, selfClose } = readAttrs(html, nameEnd, gt);

    // Implied end tags. A body tag inside a <noscript> in the head ends the
    // head for a parser without scripting, but a browser with scripting on
    // never shows it: remember where it came from so it stays off the page.
    let fromHeadNoscript = false;
    if (headOpen && !HEAD_OK.has(tag)) {
      fromHeadNoscript = stack.some((s) => s.tag === 'noscript');
      if (tag !== 'body' && !doc.headBrokenBy) doc.headBrokenBy = { tag, pos: lt };
      popTo(stack.findIndex((s) => s.tag === 'head'));
    }
    if (top().tag === 'p' && P_CLOSERS.has(tag)) stack.pop();
    const siblings = SIBLING_CLOSERS[tag];
    if (siblings && siblings.includes(top().tag)) stack.pop();

    const node = new El(tag, attrs, lt, top());
    if (fromHeadNoscript) node.fromHeadNoscript = true;
    if (tag === 'head') {
      doc.hasHeadTag = true;
      headOpen = !headOver;
    }
    if (tag === 'body') {
      doc.hasBodyTag = true;
      headOver = true;
    }
    if (!doc.hasHeadTag && !HEAD_OK.has(tag)) headOver = true;
    node.inHead = tag === 'head' || tag === 'html' ? false : doc.hasHeadTag ? stack.some((s) => s.tag === 'head') : !headOver;
    top().children.push(node);
    doc.all.push(node);
    i = gt + 1;

    if (RAW_TEXT.has(tag) || ESCAPABLE_TEXT.has(tag)) {
      const closeRe = new RegExp(`</${tag}\\s*>`, 'i');
      const rest = html.slice(i);
      const cm = closeRe.exec(rest);
      const body = cm ? rest.slice(0, cm.index) : rest;
      if (body) node.children.push({ value: body, pos: i, raw: RAW_TEXT.has(tag) });
      i = cm ? i + cm.index + cm[0].length : n;
      continue;
    }
    // "/>" only closes an element in SVG/MathML; in HTML it is ignored.
    if (VOID.has(tag) || (selfClose && (inForeign() || tag === 'svg' || tag === 'math'))) continue;
    stack.push(node);
  }
  return doc;
}

// Raw text of a <script>/<style> element (never entity-decoded).
export function rawText(el) {
  return el.children.map((ch) => (ch instanceof El ? '' : ch.value)).join('');
}

const lower = (v) => (v == null ? null : String(v).trim().toLowerCase());

// Everything an audit asks of the <head>, as plain lists. Tags that ended up
// outside the head are kept and marked inHead: false so a check can say so.
export function headInfo(doc) {
  const htmlEl = doc.first('html');
  const titles = doc
    .find('title')
    .filter((t) => !t.closest('svg'))
    .map((t) => ({ text: t.text(), inHead: t.inHead, pos: t.pos }));
  const metas = doc.find('meta').map((m) => ({
    name: lower(m.attrs.name),
    property: lower(m.attrs.property),
    httpEquiv: lower(m.attrs['http-equiv']),
    charset: m.attrs.charset ?? null,
    content: m.attrs.content ?? null,
    inHead: m.inHead,
    pos: m.pos,
  }));
  const links = doc
    .find('link')
    .filter((l) => !l.closest('svg'))
    .map((l) => ({
      rel: String(l.attrs.rel || '').toLowerCase().split(/\s+/).filter(Boolean),
      href: l.attrs.href ?? null,
      hreflang: l.attrs.hreflang ?? null,
      sizes: l.attrs.sizes ?? null,
      type: l.attrs.type ?? null,
      as: l.attrs.as ?? null,
      media: l.attrs.media ?? null,
      inHead: l.inHead,
      pos: l.pos,
    }));
  const scripts = doc
    .find('script')
    .filter((s) => !s.closest('svg'))
    .map((s) => ({
      src: s.attrs.src ?? null,
      type: lower(s.attrs.type) || '',
      async: s.has('async'),
      defer: s.has('defer'),
      inHead: s.inHead,
      bytes: s.attrs.src ? 0 : Buffer.byteLength(rawText(s)),
      pos: s.pos,
    }));
  const base = doc.first('base');
  const meta = (name) => metas.filter((x) => x.name === name);
  const prop = (property) => metas.filter((x) => x.property === property || x.name === property);
  return {
    lang: htmlEl ? htmlEl.attrs.lang ?? null : null,
    hasHtmlTag: Boolean(htmlEl),
    titles,
    metas,
    links,
    scripts,
    base: base ? base.attrs.href ?? null : null,
    meta,
    prop,
    rel: (token) => links.filter((l) => l.rel.includes(token)),
    charset: metas.find((x) => x.charset)?.charset || (metas.find((x) => x.httpEquiv === 'content-type')?.content || '').match(/charset=([\w-]+)/i)?.[1] || null,
    charsetPos: metas.find((x) => x.charset || x.httpEquiv === 'content-type')?.pos ?? null,
  };
}

export function headings(doc) {
  return doc
    .find((el) => /^h[1-6]$/.test(el.tag))
    .map((el) => ({ level: Number(el.tag[1]), text: el.text(), pos: el.pos, offPage: el.offPage }));
}

export function images(doc) {
  return doc
    .find('img')
    .map((el) => ({
      src: el.attrs.src ?? null,
      srcset: el.attrs.srcset ?? null,
      sizes: el.attrs.sizes ?? null,
      alt: el.has('alt') ? el.attrs.alt : null,
      width: el.attrs.width ?? null,
      height: el.attrs.height ?? null,
      loading: lower(el.attrs.loading),
      fetchpriority: lower(el.attrs.fetchpriority),
      decorative: el.attrs.role === 'presentation' || el.attrs.role === 'none' || el.attrs['aria-hidden'] === 'true',
      inPicture: Boolean(el.parent && el.parent.tag === 'picture'),
      inLink: Boolean(el.closest('a')),
      offPage: el.offPage,
      pos: el.pos,
    }));
}

function hrefKind(href) {
  if (href == null) return 'none';
  const h = href.trim();
  if (h === '') return 'empty';
  if (h === '#') return 'hash-only';
  if (h[0] === '#') return 'anchor';
  if (/^javascript:/i.test(h)) return 'javascript';
  if (/^tel:/i.test(h)) return 'tel';
  if (/^mailto:/i.test(h)) return 'mailto';
  if (/^sms:/i.test(h)) return 'sms';
  if (/^https?:/i.test(h) || h.startsWith('//')) return 'http';
  if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return 'other';
  return 'relative';
}

export function anchors(doc) {
  return doc
    .find('a')
    .filter((el) => !el.closest('svg') || el.has('href'))
    .map((el) => {
      const imgs = el.descendants('img');
      const svgTitle = el.descendants('title').map((t) => t.text()).filter(Boolean)[0] || '';
      return {
        href: el.attrs.href ?? null,
        kind: hrefKind(el.attrs.href ?? null),
        rel: String(el.attrs.rel || '').toLowerCase().split(/\s+/).filter(Boolean),
        target: lower(el.attrs.target),
        text: el.text(),
        imgAlt: squash(imgs.map((im) => im.attrs.alt || '').join(' ')),
        ariaLabel: squash(el.attrs['aria-label'] || ''),
        titleAttr: squash(el.attrs.title || ''),
        svgTitle,
        hasImg: imgs.length > 0,
        offPage: el.offPage,
        pos: el.pos,
      };
    });
}

// The name a screen reader or a crawler would use for a link (aria-label
// overrides the content, as in the accessible-name rules).
export function anchorName(a) {
  return a.ariaLabel || a.text || a.imgAlt || a.svgTitle || a.titleAttr || '';
}

export function jsonLdBlocks(doc) {
  return doc
    .find('script')
    .filter((s) => lower(s.attrs.type) === 'application/ld+json')
    .map((s) => {
      const raw = rawText(s).trim();
      const block = { raw, data: null, error: null, inHead: s.inHead, pos: s.pos };
      if (!raw) {
        block.error = 'empty block';
        return block;
      }
      try {
        block.data = JSON.parse(raw);
      } catch (err) {
        block.error = err.message;
      }
      return block;
    });
}

// Text a visitor can read: body copy outside scripts, styles, templates and
// anything carrying `hidden`.
export function visibleText(doc) {
  const start = doc.first('body') || doc.root;
  const parts = [];
  const walk = (node) => {
    for (const child of node.children) {
      if (!(child instanceof El)) {
        if (!child.raw) parts.push(decodeEntities(child.value));
        continue;
      }
      if (NOT_VISIBLE.has(child.tag) || child.has('hidden')) continue;
      walk(child);
      parts.push(' ');
    }
  };
  walk(start);
  return squash(parts.join(''));
}

export function wordCount(text) {
  const m = String(text || '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return m ? m.length : 0;
}

// ids and named anchors a "#fragment" link can land on.
export function fragmentTargets(doc) {
  const ids = new Set();
  for (const el of doc.all) {
    if (el.attrs.id) ids.add(el.attrs.id);
    if (el.tag === 'a' && el.attrs.name) ids.add(el.attrs.name);
  }
  return ids;
}
