// Site-level checks: can a crawler get in, does the site say where its pages
// are, and is there exactly one address for every page.
import { CRAWLERS, hasGroupFor, isAllowed } from '../robots.mjs';
import { headInfo, parseHtml } from '../html.mjs';
import { robotsDirectives } from '../analyze.mjs';
import { bareHost, hostOf, normalizeUrl, tryUrl } from '../util.mjs';
import { fail, info, warn } from './kit.mjs';

const first = (list, n = 5) => list.slice(0, n).join(', ') + (list.length > n ? ` (+${list.length - n} more)` : '');

export const checks = [
  {
    id: 'robots-txt-reachable',
    category: 'crawlability',
    title: 'robots.txt answers',
    site({ crawl }) {
      const r = crawl.robots;
      if (r.status === 200 && !r.isHtml) return [];
      if (r.status === 200) return [warn('/robots.txt answers with an HTML page instead of a robots file', { fix: 'Serve a plain-text robots.txt, or a real 404.' })];
      if (r.status === 404 || r.status === 410) return [warn('there is no robots.txt', { fix: 'Add one that allows crawling and names the sitemap: "User-agent: *", "Allow: /", "Sitemap: <origin>/sitemap.xml".' })];
      if (r.status === 0 || r.status >= 500 || r.status === 429) return [fail(`robots.txt answers ${r.status || r.error}. Google treats an unreachable robots.txt as "do not crawl this site"`, { fix: 'Make /robots.txt answer 200 (or 404) reliably.' })];
      return [warn(`robots.txt answers ${r.status}`, { fix: 'It should answer 200 with plain text.' })];
    },
  },
  {
    id: 'robots-txt-valid',
    category: 'crawlability',
    title: 'robots.txt parses cleanly',
    site({ crawl }) {
      const p = crawl.robots.parsed.problems;
      return p.length ? [warn(`robots.txt has ${p.length} line(s) crawlers will ignore`, { evidence: p.slice(0, 6).map((x) => `line ${x.line}: ${x.message}`).join('; '), fix: 'Keep to User-agent, Allow, Disallow and Sitemap lines.' })] : [];
    },
  },
  {
    id: 'robots-txt-blocks-site',
    category: 'crawlability',
    title: 'robots.txt lets search engines in',
    gate: true,
    site({ crawl }) {
      const out = [];
      for (const token of ['googlebot', 'bingbot']) {
        const verdict = crawl.allowed(crawl.start, token);
        if (!verdict.allowed) out.push(fail(`robots.txt blocks ${token} from ${new URL(crawl.start).pathname} (rule "${verdict.rule.allow ? 'Allow' : 'Disallow'}: ${verdict.rule.pattern}", line ${verdict.rule.line})`, { fix: 'Remove the Disallow rule. To keep a page out of search use a robots meta tag, not robots.txt.' }));
      }
      return out;
    },
  },
  {
    id: 'robots-txt-blocks-pages',
    category: 'crawlability',
    title: 'no real page is blocked by robots.txt',
    site({ crawl, pages }) {
      const blocked = pages.filter((a) => a.url !== crawl.start && a.allowed && !a.allowed.allowed).map((a) => a.url);
      return blocked.length ? [warn(`robots.txt blocks ${blocked.length} page(s) that the site links to: ${first(blocked)}`, { fix: 'Unblock them, or stop linking to them. A blocked page can still show in results as a bare URL.' })] : [];
    },
  },
  {
    id: 'robots-txt-blocks-assets',
    category: 'crawlability',
    title: 'CSS and JavaScript are crawlable',
    site({ crawl, pages }) {
      const blocked = new Set();
      for (const a of pages) {
        if (!a.head) continue;
        const urls = [...a.head.rel('stylesheet').map((l) => l.href), ...a.head.scripts.map((s) => s.src)].filter(Boolean);
        for (const u of urls) {
          const abs = tryUrl(u, a.base);
          if (abs && bareHost(abs.host) === bareHost(crawl.host) && !isAllowed(crawl.robots.parsed, 'googlebot', abs.pathname + abs.search).allowed) blocked.add(abs.pathname);
        }
      }
      return blocked.size ? [warn(`robots.txt blocks ${blocked.size} stylesheet/script file(s) Google needs to render the page: ${first([...blocked])}`, { fix: 'Allow them. Google renders pages like a browser and judges mobile layout from the result.' })] : [];
    },
  },
  {
    id: 'robots-txt-sitemap-line',
    category: 'crawlability',
    title: 'robots.txt names the sitemap',
    site({ crawl }) {
      const r = crawl.robots;
      if (r.status !== 200 || r.isHtml) return [];
      if (r.parsed.sitemaps.length === 0) {
        return [(crawl.scope === '/' ? warn : info)('robots.txt has no "Sitemap:" line', { fix: `Add "Sitemap: ${crawl.origin}/sitemap.xml". It is how Bing and other crawlers find the sitemap without a webmaster account.`, engineFix: 'Engine sites: delete public/robots.txt so the engine serves /robots.txt itself, with the Sitemap line on the right host.' })];
      }
      const out = [];
      for (const s of r.parsed.sitemaps) {
        if (!/^https?:\/\//i.test(s)) out.push(warn(`robots.txt Sitemap line is not a full URL: "${s}"`, { fix: 'Use the absolute URL, with https://.' }));
        else if (bareHost(hostOf(s)) !== bareHost(crawl.host)) out.push(warn(`robots.txt names a sitemap on another host: ${s}`, { fix: `Point it at ${crawl.origin}/sitemap.xml.`, who: crawl.local ? 'hand' : 'cutover' }));
      }
      return out;
    },
  },
  {
    id: 'ai-crawlers',
    category: 'crawlability',
    title: 'AI search crawlers are not shut out by accident',
    site({ crawl }) {
      const path = new URL(crawl.start).pathname;
      const blocked = CRAWLERS.filter((c) => !isAllowed(crawl.robots.parsed, c.token, path).allowed);
      const search = blocked.filter((c) => c.kind !== 'ai-training' && c.token !== 'googlebot' && c.token !== 'bingbot');
      const training = blocked.filter((c) => c.kind === 'ai-training');
      const out = [];
      if (search.length) out.push(warn(`robots.txt blocks ${search.map((c) => c.label).join(', ')}: the business cannot be cited in those answers`, { fix: 'Allow the search crawlers unless the owner has asked to stay out of them.' }));
      if (training.length) out.push(info(`robots.txt opts out of AI training crawlers (${training.map((c) => c.label).join(', ')}). That is a choice, not a fault; it does not affect Google or Bing search`, {}));
      const explicit = CRAWLERS.filter((c) => c.kind !== 'search' && hasGroupFor(crawl.robots.parsed, c.token)).length;
      if (!blocked.length && !explicit) out.push(info('no AI-crawler rules in robots.txt: every crawler is allowed by the default group', {}));
      return out;
    },
  },
  {
    id: 'sitemap-exists',
    category: 'crawlability',
    title: 'a sitemap exists',
    site({ crawl }) {
      const ok = crawl.sitemaps.some((s) => s.status === 200 && s.kind !== 'unknown');
      if (ok) return [];
      const tried = crawl.sitemaps.map((s) => `${s.url} → ${s.status || s.error}`).join('; ');
      return [warn(`no sitemap found (${tried})`, { fix: 'Publish /sitemap.xml listing every page that should be in search, then name it in robots.txt and submit it in Search Console.' })];
    },
  },
  {
    id: 'sitemap-valid',
    category: 'crawlability',
    title: 'the sitemap is valid',
    site({ crawl }) {
      const out = [];
      for (const s of crawl.sitemaps) {
        if (s.status !== 200) {
          if (s.namedInRobots) out.push(fail(`robots.txt names ${s.url} but it answers ${s.status || s.error}`, { fix: 'Fix the URL in robots.txt or publish the sitemap there.' }));
          continue;
        }
        for (const p of s.problems) out.push((/HTML page|no <urlset>|empty file|lists no URLs/.test(p) ? fail : warn)(`${s.url}: ${p}`, { fix: 'Regenerate the sitemap; it must be XML in the sitemaps.org format.' }));
        if (!/xml/i.test(s.contentType)) out.push(warn(`${s.url} is served as "${s.contentType || 'no content type'}"`, { fix: 'Serve it as application/xml.' }));
      }
      return out;
    },
  },
  {
    id: 'sitemap-urls',
    category: 'crawlability',
    title: 'every sitemap URL is a live, indexable, canonical page',
    gate: true,
    site({ crawl, res, byUrl }) {
      const out = [];
      const entries = crawl.sitemapEntries.filter((e) => crawl.scope === '/' || crawl.inScope(e.loc));
      const wrongHost = entries.filter((e) => bareHost(hostOf(e.loc)) !== bareHost(crawl.host)).map((e) => e.loc);
      if (wrongHost.length) out.push(fail(`the sitemap lists ${wrongHost.length} URL(s) on another host: ${first(wrongHost, 3)}`, { fix: `Every <loc> must be on ${crawl.host}.`, who: 'cutover' }));
      const dead = [];
      const moved = [];
      const hidden = [];
      const noncanon = [];
      for (const e of entries) {
        const key = normalizeUrl(e.loc);
        if (!key || bareHost(hostOf(key)) !== bareHost(crawl.host)) continue;
        const link = res.links.get(key);
        if (link && (link.status === 0 || link.status >= 400)) dead.push(`${e.loc} → ${link.status || link.error}`);
        else if (link && (link.redirected || (link.hops > 0 && normalizeUrl(link.finalUrl) !== key))) moved.push(`${e.loc} → ${link.finalUrl}`);
        const a = byUrl.get(key);
        if (a && a.noindex) hidden.push(e.loc);
        else if (a && a.canonical && a.selfCanonical === false) noncanon.push(`${e.loc} (canonical ${a.canonical})`);
      }
      if (dead.length) out.push(fail(`the sitemap lists ${dead.length} URL(s) that do not answer 200: ${first(dead, 3)}`, { fix: 'Remove them from the sitemap or restore the pages.' }));
      if (moved.length) out.push(warn(`the sitemap lists ${moved.length} URL(s) that redirect: ${first(moved, 3)}`, { fix: 'List the final URL only.' }));
      if (hidden.length) out.push(fail(`the sitemap lists ${hidden.length} page(s) marked noindex: ${first(hidden, 3)}`, { fix: 'A page is either in the sitemap or noindex, never both.' }));
      if (noncanon.length) out.push(warn(`the sitemap lists ${noncanon.length} page(s) whose canonical points elsewhere: ${first(noncanon, 3)}`, { fix: 'List only canonical URLs.' }));
      return out;
    },
  },
  {
    id: 'sitemap-coverage',
    category: 'crawlability',
    title: 'the sitemap lists every indexable page',
    site({ crawl, pages }) {
      if (!crawl.sitemaps.some((s) => s.status === 200 && s.urls.length)) return [];
      const missing = pages.filter((a) => a.indexable && !a.page.inSitemap).map((a) => a.url);
      return missing.length ? [warn(`${missing.length} indexable page(s) are not in the sitemap: ${first(missing)}`, { fix: 'Add them, or mark them noindex if they should stay out of search.' })] : [];
    },
  },
  {
    id: 'sitemap-lastmod',
    category: 'crawlability',
    title: 'sitemap dates are present and plausible',
    site({ crawl }) {
      const entries = crawl.sitemapEntries;
      if (!entries.length) return [];
      const out = [];
      const future = entries.filter((e) => e.lastmod && Date.parse(e.lastmod) > Date.now() + 36 * 3600 * 1000).map((e) => `${e.loc} (${e.lastmod})`);
      if (future.length) out.push(warn(`sitemap lastmod is in the future for ${first(future, 3)}`, { fix: 'lastmod must be the real last change; Google ignores dates it cannot trust.' }));
      if (entries.every((e) => !e.lastmod)) out.push(info('the sitemap has no <lastmod> dates. Google uses lastmod when it is accurate; changefreq and priority are ignored', { fix: 'Emit the real last-edit date per URL.' }));
      return out;
    },
  },
  {
    id: 'https-redirect',
    category: 'security',
    title: 'http:// sends visitors to https://',
    gate: true,
    site({ crawl }) {
      if (crawl.local) return { skip: 'local build' };
      if (new URL(crawl.start).protocol !== 'https:') return [fail('the site is served over plain http://', { fix: 'Serve it over HTTPS; Netlify provisions the certificate once the domain points at the site.' })];
      const v = crawl.variants.find((x) => x.label === 'http');
      if (!v || v.status === 0) return [];
      const final = tryUrl(v.finalUrl);
      if (!final || final.protocol !== 'https:') return [fail(`http://${crawl.host}/ answers ${v.status} without redirecting to https`, { fix: 'Force HTTPS (on Netlify it is on by default once the certificate exists).' })];
      const out = [];
      const firstHop = v.chain[0];
      if (firstHop && ![301, 308].includes(firstHop.status)) out.push(warn(`http:// redirects with a ${firstHop.status}; a permanent 301 passes signals more reliably`, { fix: 'Use a 301.' }));
      if (v.hops > 2) out.push(info(`http:// reaches the page after ${v.hops} hops: ${v.chain.map((h) => h.status).join(' → ')}`, { fix: 'Aim for one hop.' }));
      return out;
    },
  },
  {
    id: 'host-twin',
    category: 'indexability',
    title: 'www and the bare domain lead to one site',
    site({ crawl }) {
      if (crawl.local) return { skip: 'local build' };
      const v = crawl.variants.find((x) => x.label === 'www' || x.label === 'apex');
      if (!v) return { skip: 'not a registrable domain (a subdomain has no www twin)' };
      const twinHost = hostOf(v.url);
      if (v.status === 0) return [warn(`${twinHost} does not answer (${v.error || 'no response'}): anyone typing that address gets an error`, { fix: `Add ${twinHost} as a domain alias so it redirects to ${crawl.host}.`, who: 'cutover' })];
      const finalHost = hostOf(v.finalUrl);
      if (finalHost === crawl.host) {
        const hop = v.chain[0];
        return hop && ![301, 308].includes(hop.status) ? [warn(`${twinHost} redirects with a ${hop.status}, not a 301`, { fix: 'Use a permanent redirect.' })] : [];
      }
      if (v.status === 200) {
        const canonHost = v.canonical ? hostOf(normalizeUrl(v.canonical, v.finalUrl) || '') : '';
        if (canonHost === crawl.host) return [warn(`${twinHost} serves the site itself (200) and relies on the canonical tag to point at ${crawl.host}`, { fix: 'Redirect it with a 301; a redirect is a stronger signal than a canonical.', who: 'cutover' })];
        return [fail(`${twinHost} and ${crawl.host} both serve the site: search engines see two copies`, { fix: `301 ${twinHost} to ${crawl.host}.`, who: 'cutover' })];
      }
      return [warn(`${twinHost} answers ${v.status}`, { fix: `It should 301 to ${crawl.host}.`, who: 'cutover' })];
    },
  },
  {
    id: 'index-html-duplicate',
    category: 'indexability',
    title: '/index.html is not a second copy of the home page',
    site({ crawl }) {
      const v = crawl.variants.find((x) => x.label === 'index.html');
      if (!v || v.status !== 200 || !/index\.html$/.test(new URL(v.finalUrl).pathname)) return [];
      const canon = v.canonical ? normalizeUrl(v.canonical, v.finalUrl) : null;
      if (canon && !/index\.html$/.test(new URL(canon).pathname)) return [info(`${v.url} answers 200 (the canonical tag points at ${canon})`, { fix: '301 it to the folder URL so there is one address.', engineFix: 'Engine sites: the current engine already redirects /index.html; run sync-engine for this client.' })];
      return [warn(`${v.url} answers 200 as a duplicate of the home page`, { fix: '301 /index.html to /.', engineFix: 'Engine sites: the current engine already does this; run sync-engine for this client.' })];
    },
  },
  {
    id: 'not-found-status',
    category: 'crawlability',
    title: 'a missing page answers 404',
    gate: true,
    site({ crawl }) {
      const n = crawl.notFound;
      if (n.status === 404 || n.status === 410) return [];
      if (n.status === 200) return [fail(`a URL that cannot exist answers 200${n.hops ? ` after redirecting to ${n.finalUrl}` : ''} (a "soft 404"): Google will index error pages or distrust the site's 404s`, { fix: 'Return a real 404 status for unknown paths.' })];
      if (n.status === 0) return [warn(`the 404 probe got no answer (${n.error})`, {})];
      return [warn(`a missing page answers ${n.status} instead of 404`, { fix: 'Return 404 for unknown paths.' })];
    },
  },
  {
    id: 'page-status',
    category: 'crawlability',
    title: 'every linked page answers 200',
    gate: true,
    site({ crawl }) {
      const bad = crawl.pages.filter((p) => p.status === 0 || p.status >= 400);
      return bad.map((p) => fail(`${p.url} answers ${p.status || p.error}`, { url: p.url, evidence: `linked from: ${[...p.from].slice(0, 3).join(', ') || 'start URL'}`, fix: 'Restore the page or remove the links to it.' }));
    },
  },
  {
    id: 'redirect-internal',
    category: 'links',
    title: 'internal links point at final URLs',
    site({ crawl }) {
      const out = [];
      for (const r of crawl.redirects) {
        const linked = r.linkedFrom.filter((f) => f !== 'sitemap');
        if (r.loop) out.push(fail(`redirect loop starting at ${r.from}`, { url: r.from, fix: 'Break the loop.' }));
        else if (r.chain.length > 1) out.push(warn(`${r.from} takes ${r.chain.length} redirects to reach ${r.to}`, { url: r.from, fix: 'Redirect straight to the final URL.' }));
        if (linked.length && !r.loop) out.push(warn(`the site links to ${r.from}, which redirects to ${r.to}`, { url: r.from, evidence: `linked from: ${linked.slice(0, 3).join(', ')}`, fix: 'Link to the final URL.' }));
      }
      return out;
    },
  },
  {
    id: 'orphan-pages',
    category: 'links',
    title: 'every sitemap page is linked from the site',
    site({ crawl, pages }) {
      const orphans = pages.filter((a) => a.url !== crawl.start && [...a.page.from].every((f) => f === 'sitemap')).map((a) => a.url);
      return orphans.length ? [warn(`${orphans.length} page(s) are in the sitemap but nothing on the site links to them: ${first(orphans)}`, { fix: 'Link to each from the navigation, the footer, or a related page.' })] : [];
    },
  },
  {
    id: 'crawl-depth',
    category: 'links',
    title: 'pages are within three clicks of the home page',
    site({ pages }) {
      const deep = pages.filter((a) => a.page.depth > 3).map((a) => a.url);
      return deep.length ? [info(`${deep.length} page(s) sit more than three clicks from the start: ${first(deep)}`, { fix: 'Link to important pages from the home page or the navigation.' })] : [];
    },
  },
  {
    id: 'duplicate-hosts',
    category: 'indexability',
    title: 'no second indexable copy of the site on another address',
    gate: true,
    async site({ crawl, target, fetchPage }) {
      const others = (target.otherUrls || []).filter(Boolean);
      if (crawl.local) return { skip: 'local build' };
      if (!others.length) return { skip: 'no other addresses known for this site (pass --also=<url> to test one)' };
      const out = [];
      for (const other of others) {
        const r = await fetchPage(other);
        const label = other.replace(/^https?:\/\//, '');
        if (r.status === 0) continue;
        const finalHost = hostOf(r.finalUrl);
        if (bareHost(finalHost) === bareHost(crawl.host) && r.hops > 0) continue; // redirects to this site: good
        if (r.status !== 200 || !r.text) continue;
        const head = headInfo(parseHtml(r.text));
        const directives = robotsDirectives([...head.meta('robots').map((m) => m.content), r.headers['x-robots-tag'] || '']);
        if (directives.has('noindex')) continue;
        const canon = head.rel('canonical').filter((l) => l.inHead && l.href).map((l) => normalizeUrl(l.href, r.finalUrl))[0] || null;
        const pointsHere = canon && bareHost(hostOf(canon)) === bareHost(crawl.host);
        const cutover = /\.netlify\.app$/i.test(hostOf(other));
        if (pointsHere) out.push(info(`${label} is a second copy that points its canonical at this site`, { fix: 'Good for now; a 301 is the stronger signal once the copy is no longer needed.' }));
        else out.push(fail(`${label} is a second, indexable copy of this site (${canon ? `canonical: ${canon}` : 'no canonical'})`, { url: other, fix: cutover ? `301 ${hostOf(other)} to ${crawl.host} (a forced host redirect in netlify.toml).` : `Point its canonical at ${crawl.start}, or 301 it here.`, who: 'hand' }));
      }
      return out;
    },
  },
];
