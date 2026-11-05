// The crawl behind an audit: robots.txt, sitemaps, the host variants
// (http, www/apex, /index.html), a 404 probe, then every page reachable from
// the start URL and the sitemap, bounded. A start URL inside a folder
// (handprotocol.org/threehandshealing/) scopes the crawl to that folder.
// Gathers facts only; the judging happens in checks/.
//
// Local builds: pass `rewrite: { from: 'https://example.com', to: 'http://127.0.0.1:4010' }`.
// Every URL in the result stays in its public form (what the canonical,
// sitemap and links say); only the wire request goes to the local server.
import { follow as rawFollow, probe as rawProbe, UA } from './net.mjs';
import { isAllowed, parseRobots } from './robots.mjs';
import { parseSitemap } from './sitemap.mjs';
import { anchors, headInfo, images, parseHtml } from './html.mjs';
import { imageSize, typeFromContentType } from './image.mjs';
import { bareHost, hostOf, mapLimit, normalizeUrl, tryUrl, uniq } from './util.mjs';

const ASSET_EXT = /\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|css|js|mjs|json|xml|txt|zip|mp4|webm|mov|mp3|wav|woff2?|ttf|ics|vcf|docx?|xlsx?|pptx?)$/i;
// Never crawled as pages: the owner editor and API of an engine site, and
// Netlify's own endpoints.
const PRIVATE_PATH = /^\/(admin|api|\.netlify)(\/|$)/;
// Hosts that answer bots with 4xx/999 whatever the URL; a non-200 there says
// nothing about the link.
const BOT_WALLS = /(^|\.)(facebook\.com|instagram\.com|linkedin\.com|x\.com|twitter\.com|tiktok\.com|yelp\.com|nextdoor\.com|pinterest\.com|g\.page|goo\.gl|maps\.app\.goo\.gl|threads\.net)$/i;

export function isBotWall(url) {
  return BOT_WALLS.test(hostOf(url).replace(/:\d+$/, ''));
}

function scopePrefix(pathname) {
  return pathname.endsWith('/') ? pathname : pathname.slice(0, pathname.lastIndexOf('/') + 1);
}

function wwwTwin(host) {
  const [name, port] = host.split(':');
  const labels = name.split('.');
  if (labels[0] === 'www') return [labels.slice(1).join('.'), port].filter(Boolean).join(':');
  // Only a bare registrable-looking domain has a www twin worth testing.
  if (labels.length === 2) return [`www.${name}`, port].filter(Boolean).join(':');
  return null;
}

// Requests with the public↔local mapping applied on the way out and back.
function makeIo({ rewrite, timeoutMs, ua }) {
  const from = rewrite ? rewrite.from.replace(/\/$/, '') : null;
  const to = rewrite ? rewrite.to.replace(/\/$/, '') : null;
  const swap = (url, a, b) => (a && typeof url === 'string' && (url === a || url.startsWith(`${a}/`) || url.startsWith(`${a}?`)) ? b + url.slice(a.length) : url);
  const toLocal = (url) => swap(url, from, to);
  const toPublic = (url) => swap(url, to, from);
  const base = { timeoutMs, ua };
  return {
    toLocal,
    toPublic,
    async follow(url, opts = {}) {
      const r = await rawFollow(toLocal(url), { ...base, ...opts });
      return {
        ...r,
        chain: r.chain.map((h) => ({ ...h, url: toPublic(h.url), location: toPublic(h.location) })),
        final: { ...r.final, url: toPublic(r.final.url) },
      };
    },
    async probe(url, opts = {}) {
      const r = await rawProbe(toLocal(url), { ...base, ...opts });
      return { ...r, url, finalUrl: toPublic(r.finalUrl) };
    },
  };
}

// → the facts object every check reads.
export async function crawlSite(startInput, { maxPages = 25, concurrency = 4, timeoutMs = 20000, ua = UA, rewrite = null, log = () => {} } = {}) {
  const startUrl = normalizeUrl(startInput);
  if (!startUrl) throw new Error(`not an http(s) URL: ${startInput}`);
  const start = new URL(startUrl);
  const origin = start.origin;
  const scope = scopePrefix(start.pathname);
  const local = Boolean(rewrite);
  const io = makeIo({ rewrite, timeoutMs, ua });
  const inScope = (url) => {
    const u = tryUrl(url);
    return Boolean(u) && bareHost(u.host) === bareHost(start.host) && u.pathname.startsWith(scope);
  };

  // robots.txt (always at the host root, whatever the scope).
  log('robots.txt');
  const robotsUrl = `${origin}/robots.txt`;
  const rr = await io.follow(robotsUrl);
  const robotsIsText = rr.final.status === 200 && rr.final.text != null && !/<(!doctype|html)[\s>]/i.test(rr.final.text.slice(0, 2000));
  const robots = {
    url: robotsUrl,
    status: rr.final.status,
    hops: rr.hops,
    contentType: rr.final.headers['content-type'] || '',
    text: robotsIsText ? rr.final.text : null,
    isHtml: rr.final.status === 200 && !robotsIsText,
    parsed: parseRobots(robotsIsText ? rr.final.text : ''),
    error: rr.final.error,
  };
  const allowed = (url, token = 'googlebot') => {
    const u = tryUrl(url);
    return u ? isAllowed(robots.parsed, token, u.pathname + u.search) : { allowed: true, rule: null };
  };

  // Sitemaps: the ones robots.txt names, else the conventional location.
  log('sitemaps');
  const named = robots.parsed.sitemaps.map((s) => normalizeUrl(s, robotsUrl)).filter(Boolean);
  const sitemapQueue = named.length ? [...named] : [`${origin}/sitemap.xml`];
  const sitemaps = [];
  const seenSitemaps = new Set();
  while (sitemapQueue.length && sitemaps.length < 12) {
    const url = sitemapQueue.shift();
    if (seenSitemaps.has(url)) continue;
    seenSitemaps.add(url);
    const r = await io.follow(url, { maxBytes: 52_000_000 });
    const entry = { url, status: r.final.status, hops: r.hops, contentType: r.final.headers['content-type'] || '', bytes: r.final.bytes, kind: 'unknown', urls: [], problems: [], error: r.final.error, namedInRobots: named.includes(url) };
    if (r.final.status === 200 && r.final.text != null) {
      const parsed = parseSitemap(r.final.text);
      entry.kind = parsed.kind;
      entry.urls = parsed.urls;
      entry.problems = parsed.problems;
      for (const child of parsed.children) sitemapQueue.push(child);
    } else if (r.final.status === 200) {
      entry.problems.push(`served as ${entry.contentType || 'an unknown type'}, not XML`);
    }
    sitemaps.push(entry);
  }
  const sitemapEntries = sitemaps.flatMap((s) => s.urls.map((u) => ({ ...u, sitemap: s.url })));
  const sitemapSet = new Set(sitemapEntries.map((u) => normalizeUrl(u.loc)).filter(Boolean));

  // Host variants and a URL that cannot exist.
  log('host variants + 404 probe');
  const variantList = [];
  if (!local) {
    if (start.protocol === 'https:') variantList.push({ label: 'http', url: `http://${start.host}${start.pathname}` });
    const twin = wwwTwin(start.host);
    if (twin) variantList.push({ label: twin.startsWith('www.') ? 'www' : 'apex', url: `${start.protocol}//${twin}${start.pathname}` });
  }
  variantList.push({ label: 'index.html', url: `${origin}${scope}index.html` });
  const variants = await mapLimit(variantList, concurrency, async (v) => {
    const r = await io.follow(v.url);
    const head = r.final.text ? headInfo(parseHtml(r.final.text)) : null;
    return {
      ...v,
      chain: r.chain,
      hops: r.hops,
      status: r.final.status,
      finalUrl: r.final.url,
      error: r.final.error,
      canonical: head ? head.rel('canonical').map((l) => l.href)[0] || null : null,
    };
  });
  const missingUrl = `${origin}${scope}hand-seo-missing-${Date.now().toString(36)}`;
  const nf = await io.follow(missingUrl);
  const notFound = { url: missingUrl, status: nf.final.status, finalUrl: nf.final.url, hops: nf.hops, bytes: nf.final.bytes, error: nf.final.error };

  // Pages: breadth-first from the start URL, then the sitemap's URLs.
  const pages = [];
  const redirects = []; // { from, to, chain } for requested URLs that moved
  const queued = new Map(); // normalized url → { depth, from:Set }
  const order = [];
  const enqueue = (url, depth, from) => {
    const key = normalizeUrl(url);
    if (!key || !inScope(key)) return;
    const u = new URL(key);
    if (ASSET_EXT.test(u.pathname) || PRIVATE_PATH.test(u.pathname)) return;
    const hit = queued.get(key);
    if (hit) {
      if (from) hit.from.add(from);
      return;
    }
    queued.set(key, { depth, from: new Set(from ? [from] : []) });
    order.push(key);
  };
  enqueue(startUrl, 0, null);
  for (const loc of sitemapSet) enqueue(loc, 1, 'sitemap');

  const byFinal = new Map();
  let cursor = 0;
  let skippedForLimit = 0;
  while (cursor < order.length) {
    const room = maxPages - pages.length;
    if (room <= 0) {
      skippedForLimit = order.length - cursor;
      break;
    }
    const batch = order.slice(cursor, cursor + Math.min(concurrency, room));
    cursor += batch.length;
    const fetched = await mapLimit(batch, concurrency, async (url) => {
      log(`page ${url}`);
      return { url, r: await io.follow(url) };
    });
    for (const { url, r } of fetched) {
      const meta = queued.get(url);
      const finalUrl = normalizeUrl(r.final.url) || url;
      if (r.hops > 0) redirects.push({ from: url, to: finalUrl, chain: r.chain, loop: r.loop, linkedFrom: [...meta.from] });
      if (byFinal.has(finalUrl)) {
        for (const f of meta.from) byFinal.get(finalUrl).from.add(f);
        continue;
      }
      const type = r.final.headers['content-type'] || '';
      const isHtml = /text\/html|application\/xhtml/i.test(type) && r.final.text != null;
      const page = {
        url: finalUrl,
        requested: url,
        chain: r.chain,
        status: r.final.status,
        headers: r.final.headers,
        contentType: type,
        html: isHtml ? r.final.text : null,
        bytes: r.final.bytes,
        ms: r.final.ms,
        truncated: r.final.truncated,
        error: r.final.error,
        depth: meta.depth,
        from: new Set(meta.from),
        inSitemap: sitemapSet.has(finalUrl) || sitemapSet.has(url),
        offScope: !inScope(finalUrl),
        isHtml,
        doc: isHtml ? parseHtml(r.final.text) : null,
        links: [],
      };
      byFinal.set(finalUrl, page);
      pages.push(page);
      if (!page.doc || page.status !== 200 || page.offScope) continue;
      const baseHref = headInfo(page.doc).base;
      const base = tryUrl(baseHref || '', finalUrl)?.href || finalUrl;
      for (const a of anchors(page.doc)) {
        if (a.offPage || !['relative', 'http', 'anchor'].includes(a.kind)) continue;
        const abs = tryUrl(a.href, base);
        if (!abs || !/^https?:$/.test(abs.protocol)) continue;
        const target = normalizeUrl(abs.href);
        const internal = bareHost(abs.host) === bareHost(start.host);
        page.links.push({ url: target, fragment: abs.hash ? decodeURIComponent(abs.hash.slice(1)) : '', internal, nofollow: a.rel.includes('nofollow'), kind: a.kind });
        if (internal && a.kind !== 'anchor') enqueue(target, meta.depth + 1, finalUrl);
      }
    }
  }

  return {
    start: startUrl,
    origin,
    host: start.host,
    scope,
    local,
    ua,
    io,
    robots,
    allowed,
    sitemaps,
    sitemapEntries,
    variants,
    notFound,
    pages,
    redirects,
    skippedForLimit,
    maxPages,
    inScope,
  };
}

// Second pass: does every link target answer, and what do the images weigh?
// → { links: Map(url → { status, finalUrl, hops, error, internal, botWall }),
//     images: Map(url → { status, bytes, type, width, height, error }) }
export async function checkResources(crawl, { concurrency = 4, maxExternal = 60, maxInternal = 200, maxImages = 60, extraImages = [], external = true, log = () => {} } = {}) {
  const { io } = crawl;
  const crawled = new Map(crawl.pages.map((p) => [p.url, p]));
  for (const p of crawl.pages) crawled.set(p.requested, p);
  const internal = new Set();
  const externalSet = new Set();
  for (const p of crawl.pages) {
    for (const l of p.links) {
      if (crawled.has(l.url)) continue;
      (l.internal ? internal : externalSet).add(l.url);
    }
  }
  for (const e of crawl.sitemapEntries) {
    const key = normalizeUrl(e.loc);
    if (key && !crawled.has(key)) internal.add(key);
  }
  const links = new Map();
  for (const p of crawl.pages) links.set(p.url, { status: p.status, finalUrl: p.url, hops: p.chain.length, error: p.error, internal: true, crawled: true });
  for (const r of crawl.redirects) links.set(r.from, { status: crawled.get(r.to)?.status ?? 0, finalUrl: r.to, hops: r.chain.length, internal: true, crawled: true, redirected: true });

  const todo = [
    ...[...internal].slice(0, maxInternal).map((url) => ({ url, internal: true })),
    ...(external ? [...externalSet].slice(0, maxExternal).map((url) => ({ url, internal: false })) : []),
  ];
  log(`checking ${todo.length} link targets`);
  await mapLimit(todo, concurrency, async ({ url, internal: isInternal }) => {
    const r = await io.probe(url);
    links.set(url, { status: r.status, finalUrl: r.finalUrl, hops: r.hops, error: r.error, internal: isInternal, botWall: !isInternal && isBotWall(url) });
  });

  const imageUrls = [];
  for (const p of crawl.pages) {
    if (!p.doc) continue;
    const base = tryUrl(headInfo(p.doc).base || '', p.url)?.href || p.url;
    for (const im of images(p.doc)) {
      if (im.offPage || !im.src || im.src.startsWith('data:')) continue;
      const abs = tryUrl(im.src, base);
      if (abs && /^https?:$/.test(abs.protocol)) imageUrls.push(abs.href);
    }
  }
  const allImages = uniq([...extraImages.filter(Boolean), ...imageUrls]);
  const imgList = allImages.slice(0, maxImages);
  log(`measuring ${imgList.length} images`);
  const imageMap = new Map();
  await mapLimit(imgList, concurrency, async (url) => {
    const r = await io.follow(url, { binary: true, maxBytes: 3_000_000 });
    const res = r.final;
    const size = res.buffer ? imageSize(res.buffer) : null;
    const declared = Number(res.headers['content-length']);
    imageMap.set(url, {
      status: res.status,
      finalUrl: res.url,
      hops: r.hops,
      contentType: res.headers['content-type'] || '',
      type: (size && size.type) || typeFromContentType(res.headers['content-type']),
      bytes: res.truncated ? (Number.isFinite(declared) && declared > 0 ? declared : null) : res.bytes,
      truncated: res.truncated,
      width: size ? size.width : null,
      height: size ? size.height : null,
      error: res.error,
    });
  });

  return {
    links,
    images: imageMap,
    dropped: {
      internal: Math.max(0, internal.size - maxInternal),
      external: external ? Math.max(0, externalSet.size - maxExternal) : externalSet.size,
      images: Math.max(0, allImages.length - maxImages),
    },
  };
}
