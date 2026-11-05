// One audit, start to finish: crawl → analyze → resources → (PageSpeed,
// browser lab) → checks → score. Returns a plain JSON-safe object; the
// reports and the history are built from it.
import { analyzePage } from './analyze.mjs';
import { checkResources, crawlSite } from './crawl.mjs';
import { iconLinks } from './checks/data.mjs';
import { runChecks } from './checks/index.mjs';
import { scoreAudit } from './score.mjs';
import { VERSION, normalizeUrl, nowIso, uniq } from './util.mjs';

function pageSummary(a) {
  const p = a.page;
  const base = { url: p.url, requested: p.requested, status: p.status, depth: p.depth, inSitemap: p.inSitemap, bytes: p.bytes, ms: p.ms, contentType: p.contentType };
  if (!a.doc) return base;
  return {
    ...base,
    title: a.title,
    description: a.description,
    canonical: a.canonical,
    indexable: a.indexable,
    whyNot: a.whyNot,
    h1: a.h1s.map((h) => h.text),
    words: a.words,
    lang: a.lang,
    ogImage: a.ogImageAbs,
    jsonLdTypes: uniq(a.ld.nodes.map((n) => [].concat(n.node['@type'] || []).join('+'))),
    images: a.images.length,
    links: p.links.length,
  };
}

function siteSummary(crawl, res) {
  return {
    start: crawl.start,
    origin: crawl.origin,
    host: crawl.host,
    scope: crawl.scope,
    local: crawl.local,
    robots: { url: crawl.robots.url, status: crawl.robots.status, sitemaps: crawl.robots.parsed.sitemaps, text: crawl.robots.text },
    sitemaps: crawl.sitemaps.map((s) => ({ url: s.url, status: s.status, kind: s.kind, urls: s.urls.length, problems: s.problems })),
    variants: crawl.variants.map((v) => ({ label: v.label, url: v.url, status: v.status, finalUrl: v.finalUrl, hops: v.hops, canonical: v.canonical })),
    notFound: { url: crawl.notFound.url, status: crawl.notFound.status },
    redirects: crawl.redirects.map((r) => ({ from: r.from, to: r.to, hops: r.chain.length, loop: r.loop })),
    pagesCrawled: crawl.pages.length,
    skippedForLimit: crawl.skippedForLimit,
    linksChecked: res.links.size,
    imagesMeasured: res.images.size,
    dropped: res.dropped,
  };
}

// target: { url, otherUrls?, rewrite?, label? }
// options: { maxPages, external, psi, lab, psiKey, only, skip, log }
export async function runAudit(target, facts = {}, options = {}) {
  const log = options.log || (() => {});
  const startedAt = nowIso();
  const crawl = await crawlSite(target.url, { maxPages: options.maxPages ?? 25, rewrite: target.rewrite || null, log });
  const analyses = crawl.pages.map((p) => analyzePage(p, crawl, facts));
  const pages = analyses.filter((a) => a.doc && a.status === 200 && !a.page.offScope);
  const byUrl = new Map();
  for (const a of analyses) {
    if (!a.doc) continue;
    byUrl.set(normalizeUrl(a.page.url), a);
    if (a.page.requested) byUrl.set(normalizeUrl(a.page.requested), a);
  }
  const home = byUrl.get(normalizeUrl(crawl.start));

  const extraImages = [`${crawl.origin}/favicon.ico`];
  for (const a of pages) {
    if (a.ogImageAbs) extraImages.push(a.ogImageAbs);
    for (const icon of iconLinks(a)) if (icon.abs) extraImages.push(icon.abs);
  }
  log('checking links and images');
  const res = await checkResources(crawl, { extraImages, external: options.external !== false, log });

  // Measurements that need the public internet or a browser. Never fatal.
  let psi = null;
  let lab = null;
  if (options.psi) {
    if (crawl.local) psi = { mobile: { error: 'PageSpeed cannot reach a local build' }, desktop: { error: 'PageSpeed cannot reach a local build' } };
    else {
      log('PageSpeed Insights');
      const { runPsi } = await import('./psi.mjs');
      psi = await runPsi(crawl.start, { key: options.psiKey });
    }
  }
  if (options.lab) {
    log('browser lab');
    const { runLab } = await import('./lab.mjs');
    lab = await runLab(target.rewrite ? crawl.io.toLocal(crawl.start) : crawl.start);
  }

  const probeCache = new Map();
  const ctx = {
    crawl,
    res,
    pages,
    byUrl,
    home,
    facts,
    target: { otherUrls: target.otherUrls || [] },
    psi,
    lab,
    probe(url) {
      if (!probeCache.has(url)) probeCache.set(url, crawl.io.probe(url));
      return probeCache.get(url);
    },
    async fetchPage(url) {
      const r = await crawl.io.follow(url);
      return { status: r.final.status, finalUrl: r.final.url, hops: r.hops, headers: r.final.headers, text: r.final.text };
    },
  };
  log('running checks');
  const { findings, passed, skipped } = await runChecks(ctx, { only: options.only, skip: options.skip });
  const order = { fail: 0, warn: 1, info: 2 };
  findings.sort((x, y) => order[x.severity] - order[y.severity] || Number(y.gate) - Number(x.gate) || x.category.localeCompare(y.category));
  const score = scoreAudit({ findings, passed, skipped });

  return {
    tool: 'hand-client-seo',
    version: VERSION,
    target: { url: crawl.start, label: target.label || null, local: crawl.local, otherUrls: target.otherUrls || [] },
    startedAt,
    finishedAt: nowIso(),
    options: { maxPages: options.maxPages ?? 25, external: options.external !== false, psi: Boolean(options.psi), lab: Boolean(options.lab) },
    facts,
    site: siteSummary(crawl, res),
    pages: analyses.map(pageSummary),
    findings,
    passed,
    skipped,
    score,
    psi,
    lab,
  };
}
