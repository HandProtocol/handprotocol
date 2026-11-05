// Turns a crawled page into the answers the checks need: its title,
// description, canonical, robots directives (meta + header), whether a
// search engine may index it and why not, headings, images, links,
// structured data. Pure: no requests.
import { anchors, fragmentTargets, headInfo, headings, images, jsonLdBlocks, visibleText, wordCount } from './html.mjs';
import { validateBlocks } from './jsonld.mjs';
import { normalizeUrl, tryUrl } from './util.mjs';

const VALUE_DIRECTIVES = new Set(['max-snippet', 'max-image-preview', 'max-video-preview', 'unavailable_after']);

// "noindex, nofollow", "googlebot: noindex", "max-snippet:0" → the set of
// directives that apply to Google. A "bingbot: noindex" entry is ignored.
export function robotsDirectives(values) {
  const out = new Set();
  for (const value of values) {
    for (const raw of String(value || '').split(',')) {
      let token = raw.trim().toLowerCase();
      if (!token) continue;
      const scoped = /^([a-z0-9_-]+)\s*:\s*(.+)$/.exec(token);
      if (scoped && !VALUE_DIRECTIVES.has(scoped[1])) {
        if (!scoped[1].startsWith('googlebot')) continue;
        token = scoped[2].trim();
      }
      out.add(token.replace(/\s*:\s*/, ':'));
    }
  }
  if (out.has('none')) {
    out.add('noindex');
    out.add('nofollow');
  }
  return out;
}

const sameUrl = (a, b) => {
  const strip = (u) => (u || '').replace(/\/$/, '');
  return strip(normalizeUrl(a)) === strip(normalizeUrl(b));
};

export function analyzePage(page, crawl, facts = {}) {
  const a = { page, url: page.url, status: page.status, isHtml: page.isHtml };
  if (!page.doc) return a;
  const doc = page.doc;
  const head = headInfo(doc);
  a.doc = doc;
  a.head = head;
  a.base = tryUrl(head.base || '', page.url)?.href || page.url;
  a.titles = head.titles.filter((t) => t.inHead);
  a.title = a.titles.length ? a.titles[0].text : null;
  a.descriptions = head.meta('description');
  a.description = a.descriptions.length ? (a.descriptions[0].content || '').trim() : null;
  a.lang = head.lang;

  a.canonicals = head.rel('canonical').map((l) => ({ href: l.href, inHead: l.inHead, abs: l.href ? normalizeUrl(l.href, a.base) : null, relative: Boolean(l.href) && !/^https?:\/\//i.test(l.href) }));
  const headCanon = a.canonicals.filter((c) => c.inHead && c.abs);
  a.canonical = headCanon.length ? headCanon[0].abs : null;
  a.selfCanonical = a.canonical ? sameUrl(a.canonical, page.url) : null;

  const metaRobots = [...head.meta('robots'), ...head.meta('googlebot')].filter((m) => m.inHead).map((m) => m.content);
  const headerRobots = page.headers['x-robots-tag'] ? [page.headers['x-robots-tag']] : [];
  a.robots = {
    meta: robotsDirectives(metaRobots),
    header: robotsDirectives(headerRobots),
    rawMeta: metaRobots,
    rawHeader: headerRobots,
  };
  a.robots.all = new Set([...a.robots.meta, ...a.robots.header]);
  a.noindex = a.robots.all.has('noindex');
  a.allowed = crawl.allowed(page.url);

  a.whyNot = [];
  if (page.status !== 200) a.whyNot.push(`status ${page.status}`);
  if (a.noindex) a.whyNot.push(a.robots.header.has('noindex') ? 'X-Robots-Tag: noindex' : 'meta robots noindex');
  if (!a.allowed.allowed) a.whyNot.push(`robots.txt disallows it (${a.allowed.rule ? a.allowed.rule.pattern : 'rule'})`);
  if (a.canonical && !a.selfCanonical) a.whyNot.push(`canonical points to ${a.canonical}`);
  a.indexable = a.whyNot.length === 0;

  a.headings = headings(doc).filter((h) => !h.offPage);
  a.h1s = a.headings.filter((h) => h.level === 1);
  a.images = images(doc).filter((i) => !i.offPage);
  a.anchors = anchors(doc).filter((x) => !x.offPage);
  a.ids = fragmentTargets(doc);
  a.text = visibleText(doc);
  a.words = wordCount(a.text);
  a.blocks = jsonLdBlocks(doc);
  a.ld = validateBlocks(a.blocks, { pageUrl: page.url, facts });

  const tags = (prefix) => {
    const map = new Map();
    for (const m of head.metas) {
      const key = m.property && m.property.startsWith(prefix) ? m.property : m.name && m.name.startsWith(prefix) ? m.name : null;
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push((m.content || '').trim());
    }
    return map;
  };
  a.og = tags('og:');
  a.twitter = tags('twitter:');
  a.ogImage = a.og.get('og:image')?.[0] || null;
  a.ogImageAbs = a.ogImage ? tryUrl(a.ogImage, a.base)?.href || null : null;
  a.bilingualToggle = doc.all.some((el) => el.has('data-es'));
  return a;
}

// The image a browser will most likely paint first: the first on-page image
// that is not tiny by its attributes and not a logo in the header.
export function likelyLcpImage(a) {
  if (!a.images) return null;
  const flagged = a.images.find((i) => i.fetchpriority === 'high');
  if (flagged) return flagged;
  return (
    a.images.find((i) => {
      const w = Number(i.width);
      const h = Number(i.height);
      return i.src && !/\.svg(\?|$)/i.test(i.src) && !(w && w < 200) && !(h && h < 120);
    }) || null
  );
}
