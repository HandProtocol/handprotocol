// Page-level checks: may this page be indexed, and does it tell a searcher
// what it is (title, description, headings, language, real copy).
import { normalizeUrl } from '../util.mjs';
import { PLACEHOLDER_RE, UNFINISHED_RE, clip, excerpt, fail, info, warn } from './kit.mjs';

const LANG_RE = /^[a-z]{2,3}(-[A-Za-z]{4})?(-([A-Za-z]{2}|\d{3}))?$/;
const GENERIC_TITLES = /^(home|home page|homepage|untitled|index|welcome|new page|my site|website|document)$/i;

// /about, /about/, /about.html and /about/index.html are one page to a
// reader. Hosts like Netlify answer at several of them, so a crawl can meet
// the same page twice.
export function twinKey(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/index\.html?$/i, '/').replace(/\.html?$/i, '').replace(/\/+$/, '');
    return `${u.host}${path || '/'}${u.search}`;
  } catch {
    return url;
  }
}

function duplicates(pages, pick) {
  const groups = new Map();
  for (const a of pages) {
    if (!a.indexable) continue;
    const value = (pick(a) || '').trim().toLowerCase();
    if (!value) continue;
    if (!groups.has(value)) groups.set(value, new Map());
    const twins = groups.get(value);
    if (!twins.has(twinKey(a.url))) twins.set(twinKey(a.url), a.url);
  }
  // Two addresses of one page are reported once, by "url-twins".
  return [...groups].map(([value, twins]) => [value, [...twins.values()]]).filter(([, urls]) => urls.length > 1);
}

export const checks = [
  {
    id: 'noindex',
    category: 'indexability',
    title: 'pages meant for search are not marked noindex',
    gate: true,
    page({ crawl }, a) {
      if (!a.noindex) return [];
      const source = a.robots.header.has('noindex') ? `the X-Robots-Tag header ("${a.robots.rawHeader.join(', ')}")` : `a robots meta tag ("${a.robots.rawMeta.join(', ')}")`;
      if (a.url === crawl.start || a.page.inSitemap) return [fail(`the page is kept out of search by ${source}`, { fix: 'Remove the noindex when the page is ready to be found. If the site is on hold before launch, this is expected: lift it at launch.' })];
      return [info(`noindex via ${source}`, { fix: 'Fine if this page should stay out of search.' })];
    },
  },
  {
    id: 'snippet-limits',
    category: 'indexability',
    title: 'search engines may show a snippet',
    page(ctx, a) {
      const all = a.robots.all;
      const out = [];
      if (all.has('nosnippet') || all.has('max-snippet:0')) out.push(warn('nosnippet / max-snippet:0 hides the description in results and removes the page from AI answers', { fix: 'Remove the directive unless the owner asked for it.' }));
      if (all.has('noimageindex')) out.push(info('noimageindex keeps the photos out of image search', {}));
      if (all.has('index') && all.has('noindex')) out.push(warn('the page says both index and noindex; Google applies the most restrictive (noindex)', { fix: 'Keep one directive.' }));
      return out;
    },
  },
  {
    id: 'canonical-present',
    category: 'indexability',
    title: 'the page names its canonical URL',
    page(ctx, a) {
      return a.canonicals.length ? [] : [warn('no <link rel="canonical">', { fix: 'Add one with the absolute URL of this page, so tracking parameters and host variants consolidate to it.' })];
    },
  },
  {
    id: 'canonical-valid',
    category: 'indexability',
    title: 'the canonical tag is well formed',
    gate: true,
    page(ctx, a) {
      const out = [];
      const distinct = [...new Set(a.canonicals.map((c) => c.abs).filter(Boolean))];
      if (distinct.length > 1) out.push(fail(`${distinct.length} different canonical URLs on one page (${distinct.join(' and ')}): Google ignores all of them`, { fix: 'Keep exactly one.' }));
      if (a.canonicals.some((c) => !c.inHead)) out.push(fail('the canonical tag sits outside <head>, where search engines ignore it', { fix: 'Move it into <head>.' }));
      if (a.canonicals.some((c) => c.href != null && !c.abs)) out.push(fail(`the canonical URL is not valid: "${a.canonicals.find((c) => !c.abs).href}"`, { fix: 'Use the absolute URL of the page.' }));
      if (a.canonicals.some((c) => c.relative && c.abs)) out.push(warn(`the canonical is a relative URL ("${a.canonicals.find((c) => c.relative).href}")`, { fix: 'Use the absolute URL, starting with https://.' }));
      if (a.canonical && /^http:\/\//i.test(a.canonical) && /^https:\/\//i.test(a.url)) out.push(fail(`the canonical points at the http:// version (${a.canonical})`, { fix: 'Use https://.' }));
      return out;
    },
  },
  {
    id: 'canonical-target',
    category: 'indexability',
    title: 'the canonical points at this page (or a live one)',
    async page({ crawl, probe }, a) {
      if (!a.canonical || a.selfCanonical) return [];
      const sameHost = new URL(a.canonical).host === new URL(a.url).host;
      const stripped = normalizeUrl(a.url).split('?')[0];
      if (sameHost && normalizeUrl(a.canonical).replace(/\/$/, '') === stripped.replace(/\/$/, '')) return []; // only the query differs
      const target = await probe(a.canonical);
      if (target.status !== 200 || target.hops > 0) return [fail(`the canonical points at ${a.canonical}, which answers ${target.status || target.error}${target.hops ? ` after ${target.hops} redirect(s)` : ''}`, { fix: 'A canonical must name a page that answers 200 directly.' })];
      if (sameHost) return [info(`canonicalized to ${a.canonical}: this URL will not be indexed on its own`, { fix: 'Fine if the two pages are the same content.' })];
      return [(a.page.inSitemap || a.url === crawl.start ? warn : info)(`the canonical hands this page's ranking to another site: ${a.canonical}`, { fix: 'Right when this copy is the secondary one; wrong if this is the address people should find.', who: 'hand' })];
    },
  },
  {
    id: 'head-broken',
    category: 'indexability',
    title: 'nothing ends <head> early',
    gate: true,
    page(ctx, a) {
      const broken = a.doc.headBrokenBy;
      if (!broken) return [];
      const lost = [];
      if (a.canonicals.some((c) => !c.inHead)) lost.push('canonical');
      if (a.head.metas.some((m) => !m.inHead && (m.name === 'robots' || m.name === 'description'))) lost.push('robots/description meta');
      if (a.head.links.some((l) => !l.inHead && l.rel.includes('alternate') && l.hreflang)) lost.push('hreflang');
      return [(lost.length ? fail : warn)(`a <${broken.tag}> inside <head> (line ${a.doc.lineOf(broken.pos)}) ends the head early${lost.length ? `; these tags land in <body> and are ignored: ${lost.join(', ')}` : ''}`, { fix: `Move the <${broken.tag}> into <body> (an analytics <noscript><img> or an <iframe> pasted into the head is the usual cause).` })];
    },
  },
  {
    id: 'title-present',
    category: 'on-page',
    title: 'the page has a title',
    gate: true,
    page(ctx, a) {
      if (!a.title) return [fail(a.head.titles.length ? 'the <title> is empty or outside <head>' : 'no <title>', { fix: 'Give every page a unique title: what it offers, where, and the business name.' })];
      if (GENERIC_TITLES.test(a.title.trim())) return [fail(`the title is just "${a.title}"`, { fix: 'Say what the business does and where: "EFT Tapping and Energy Healing in Austin | Three Hands Healing".' })];
      return a.titles.length > 1 ? [warn(`${a.titles.length} <title> tags; search engines use the first`, { fix: 'Keep one.' })] : [];
    },
  },
  {
    id: 'title-length',
    category: 'on-page',
    title: 'the title fits in a search result',
    page(ctx, a) {
      if (!a.title) return [];
      const n = [...a.title].length;
      if (n < 15) return [warn(`the title is only ${n} characters ("${a.title}"): it says too little to rank or to earn the click`, { fix: 'Aim for 30 to 60 characters: service, place, name.' })];
      if (n > 70) return [warn(`the title is ${n} characters; results cut off near 60 ("${clip(a.title, 80)}")`, { fix: 'Lead with the service and the place; keep it near 60 characters.', engineFix: 'Engine sites: edit it in /admin/ → Search & sharing → Page title.' })];
      if (n > 60) return [info(`the title is ${n} characters and may be cut off in results ("${clip(a.title, 80)}")`, { fix: 'Trim toward 60 characters if the cut would hide something important.' })];
      return [];
    },
  },
  {
    id: 'title-brand',
    category: 'on-page',
    title: 'the title carries the business name',
    page({ facts }, a) {
      if (!a.title || !facts.name) return [];
      const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      return norm(a.title).includes(norm(facts.name)) ? [] : [info(`the title does not include "${facts.name}"`, { fix: 'People search for the business by name; end the title with it.' })];
    },
  },
  {
    id: 'url-twins',
    category: 'indexability',
    title: 'each page answers at one address',
    site({ pages }) {
      const byKey = new Map();
      for (const a of pages) {
        if (!a.indexable) continue;
        byKey.set(twinKey(a.url), [...(byKey.get(twinKey(a.url)) || []), a.url]);
      }
      const twins = [...byKey.values()].filter((urls) => urls.length > 1);
      if (!twins.length) return [];
      return [warn(`${twins.length} page(s) can be indexed at two addresses: ${twins.slice(0, 3).map((u) => u.join(' and ')).join('; ')}${twins.length > 3 ? ` (+${twins.length - 3} more)` : ''}`, { url: twins[0][0], fix: 'Give each page a canonical tag naming its one address, and link to that same form everywhere (the sitemap too). Netlify serves /page.html and /page alike, so the tag is what settles it.' })];
    },
  },
  {
    id: 'title-duplicate',
    category: 'on-page',
    title: 'titles are unique across pages',
    site({ pages }) {
      return duplicates(pages, (a) => a.title).map(([title, urls]) => warn(`${urls.length} pages share the title "${clip(title, 70)}": ${urls.slice(0, 4).join(', ')}`, { fix: 'Give each page its own title.' }));
    },
  },
  {
    id: 'description-present',
    category: 'on-page',
    title: 'the page has a meta description',
    page(ctx, a) {
      if (a.descriptions.length > 1) return [warn(`${a.descriptions.length} meta descriptions on one page`, { evidence: a.descriptions.map((d) => clip(d.content, 60)).join(' | '), fix: 'Keep one. (A pack that passes its own description through `extra` duplicates the engine tag.)' })];
      if (!a.description) return [warn(a.descriptions.length ? 'the meta description is empty' : 'no meta description', { fix: 'Write one or two sentences a searcher would want to click: who it is for, what they get, where.', engineFix: 'Engine sites: /admin/ → Search & sharing → Description.' })];
      return [];
    },
  },
  {
    id: 'description-length',
    category: 'on-page',
    title: 'the description fits in a search result',
    page(ctx, a) {
      if (!a.description) return [];
      const n = [...a.description].length;
      if (n < 50) return [warn(`the description is only ${n} characters`, { fix: 'Aim for 120 to 160 characters.' })];
      if (n > 200) return [warn(`the description is ${n} characters; results show about 160`, { evidence: clip(a.description, 180), fix: 'Put the important words in the first 150 characters.' })];
      if (n > 160) return [info(`the description is ${n} characters and may be cut off`, { fix: 'Fine if the first 150 characters stand on their own.' })];
      return [];
    },
  },
  {
    id: 'description-duplicate',
    category: 'on-page',
    title: 'descriptions are unique across pages',
    site({ pages }) {
      return duplicates(pages, (a) => a.description).map(([text, urls]) => warn(`${urls.length} pages share one description ("${clip(text, 60)}"): ${urls.slice(0, 4).join(', ')}`, { fix: 'Give each page its own.' }));
    },
  },
  {
    id: 'h1',
    category: 'on-page',
    title: 'the page has one main heading',
    page(ctx, a) {
      if (a.h1s.length === 0) return [warn('no <h1>', { fix: 'Give the page one <h1> that says what it is about.' })];
      const out = [];
      if (a.h1s.some((h) => !h.text)) out.push(warn('an <h1> is empty (an image without alt text, or an empty tag)', { fix: 'Put the heading text in it; a logo image needs alt text.' }));
      if (a.h1s.length > 1) out.push(info(`${a.h1s.length} <h1> headings: ${a.h1s.map((h) => `"${clip(h.text, 40)}"`).join(', ')}`, { fix: 'One <h1> per page keeps the topic clear; use <h2> for sections.' }));
      return out;
    },
  },
  {
    id: 'heading-order',
    category: 'on-page',
    title: 'headings step down one level at a time',
    page(ctx, a) {
      const jumps = [];
      let prev = 0;
      for (const h of a.headings) {
        if (prev && h.level > prev + 1) jumps.push(`h${prev} → h${h.level} ("${clip(h.text, 30)}")`);
        prev = h.level;
      }
      return jumps.length ? [info(`heading levels are skipped ${jumps.length} time(s): ${jumps.slice(0, 3).join('; ')}`, { fix: 'Use h2 under h1, h3 under h2. It helps screen readers and outlines the page for crawlers.' })] : [];
    },
  },
  {
    id: 'lang',
    category: 'on-page',
    title: 'the page declares its language',
    page(ctx, a) {
      if (!a.lang) return [warn('<html> has no lang attribute', { fix: 'Add lang="en" (or the page\'s language).' })];
      return LANG_RE.test(a.lang.trim()) ? [] : [warn(`lang="${a.lang}" is not a valid language tag`, { fix: 'Use a tag like "en", "en-US" or "es".' })];
    },
  },
  {
    id: 'charset',
    category: 'on-page',
    title: 'the character set is declared',
    page(ctx, a) {
      const header = /charset=/i.test(a.page.contentType || '');
      if (!a.head.charset && !header) return [warn('no charset declared (no <meta charset> and none in the Content-Type header)', { fix: 'Add <meta charset="utf-8"> as the first tag in <head>.' })];
      if (a.head.charset && a.head.charsetPos > 1024) return [info('<meta charset> appears after the first 1024 bytes', { fix: 'Make it the first tag in <head>.' })];
      return [];
    },
  },
  {
    id: 'viewport',
    category: 'mobile',
    title: 'the page is set up for phones',
    gate: true,
    page(ctx, a) {
      const v = a.head.meta('viewport')[0];
      if (!v) return [fail('no viewport meta tag: phones render the page as a shrunken desktop site', { fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' })];
      const content = (v.content || '').toLowerCase();
      const out = [];
      if (!/width\s*=\s*device-width/.test(content)) out.push(warn(`the viewport tag has no width=device-width ("${v.content}")`, { fix: 'Use width=device-width, initial-scale=1.' }));
      if (/user-scalable\s*=\s*(no|0)/.test(content) || /maximum-scale\s*=\s*1(\.0)?\b/.test(content)) out.push(warn('the viewport tag stops people from zooming', { fix: 'Remove user-scalable=no and maximum-scale=1.' }));
      return out;
    },
  },
  {
    id: 'content-thin',
    category: 'content',
    title: 'the page has enough to read',
    page({ crawl }, a) {
      if (!a.indexable) return [];
      const home = a.url === crawl.start;
      if (a.words < 100) return [warn(`only ${a.words} words of visible text${home ? ' on the home page' : ''}`, { fix: 'Say who it is for, what is offered, where, and how to start. 300 words of real detail outranks a slogan.', who: 'owner' })];
      if (home && a.words < 250) return [info(`${a.words} words on the home page`, { fix: 'More specific detail (services, area, what a first visit is like) gives search engines more to match.' })];
      return [];
    },
  },
  {
    id: 'placeholder-text',
    category: 'content',
    title: 'no placeholder copy is live',
    gate: true,
    page(ctx, a) {
      const hits = [];
      const scan = (label, text) => {
        const m = PLACEHOLDER_RE.exec(text || '');
        if (m) hits.push(`${label}: "${excerpt(text || '', m.index, { before: 30, after: 60 })}"`);
      };
      scan('title', a.title);
      scan('description', a.description);
      scan('page text', a.text);
      return hits.length ? [fail(`placeholder copy is on the page (${hits.length} place${hits.length > 1 ? 's' : ''})`, { evidence: hits.join(' · '), fix: 'Replace it with the real words, or remove the section until the owner supplies them.', who: 'owner' })] : [];
    },
  },
  {
    id: 'unfinished-copy',
    category: 'content',
    title: 'the copy does not say the page is unfinished',
    page(ctx, a) {
      const m = UNFINISHED_RE.exec(a.text || '');
      return m ? [warn(`the page tells visitors it is not finished: "${excerpt(a.text, m.index)}"`, { fix: 'Get the missing detail from the owner (booking link, phone, prices) and replace the line.', who: 'owner' })] : [];
    },
  },
];
