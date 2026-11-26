// Search behaviour of the engine: canonical + preview tags, structured data,
// verification fields, robots.txt, and the noindex / redirect rules in the
// render path. Config-agnostic: every assertion holds for any pack.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../netlify/functions/lib/blocks.mjs';
import { config, isProductionHost, isStrayHost, normalizeConfig, normalizeSeo, seedMedia } from '../netlify/functions/lib/config.mjs';
import { DEFAULT_CONTENT, SECTIONS, SEO_FIELDS, ROUTES, sanitize, withSeoFields } from '../netlify/functions/lib/site.mjs';
import { renderRoute } from '../netlify/functions/lib/render.mjs';
import robots, { config as robotsConfig, robotsTxt } from '../netlify/functions/robots.mjs';

const ok = async () => ({ content: sanitize(DEFAULT_CONTENT), media: seedMedia(), source: 'defaults', updated_at: null, site: {} });
const content = (seo = {}) => ({ brand: { name: 'Fixture Studio' }, contact: { phone: '(512) 555-0100', instagram: 'fixture' }, seo: { title: 'T', description: 'D', ...seo } });
const photo = { full: '/.netlify/images?url=%2Fimg%2Fphotos%2Fhero.jpg&w=2000', original: '/img/photos/hero.jpg', srcset: 'x 480w', alt: 'The studio' };

test('normalizeSeo: an absent block is all defaults; bad facts are refused', () => {
  assert.deepEqual(normalizeSeo(undefined), { type: '', areaServed: [], address: null, geo: null, hours: [], priceRange: '', sameAs: [], logo: '', locale: '', indexing: 'index', ogPosition: 'center' });
  const s = normalizeSeo({ type: 'HealthAndBeautyBusiness', areaServed: 'Texas', indexing: 'hold', ogPosition: 'top', sameAs: ['https://instagram.com/x'] });
  assert.deepEqual(s.areaServed, ['Texas']);
  assert.equal(s.indexing, 'hold');
  assert.throws(() => normalizeSeo({ sameAs: ['http://x.test'] }), /seo\.sameAs/);
  assert.throws(() => normalizeSeo({ type: 'local business' }), /seo\.type/);
  assert.throws(() => normalizeSeo({ geo: { latitude: 'x', longitude: 1 } }), /seo\.geo/);
  assert.throws(() => normalizeSeo({ locale: 'en-US' }), /seo\.locale/);
  const c = normalizeConfig({ slug: 'x-y', name: 'X', theme: { bg: '#000', ink: '#fff', accent: '#f00' }, netlify: { siteName: 'x-y' } });
  assert.equal(c.seo.indexing, 'index');
  assert.equal(c.netlify.siteName, 'x-y');
  assert.equal('siteName' in normalizeConfig({ slug: 'x-y', name: 'X', theme: { bg: '#000', ink: '#fff', accent: '#f00' } }).netlify, false);
});

test('production host: the configured host (www or not) is real; other netlify.app hosts are stray only once a domain is set', () => {
  assert.equal(isProductionHost('www.example.org', 'https://example.org'), true);
  assert.equal(isStrayHost('x.netlify.app', 'https://example.org'), true);
  assert.equal(isStrayHost('abc123--x.netlify.app', 'https://example.org'), true);
  assert.equal(isStrayHost('example.org', 'https://example.org'), false);
  // Before the domain move the netlify.app host IS production: nothing is stray.
  assert.equal(isStrayHost('x.netlify.app', 'https://x.netlify.app'), false);
  assert.equal(isStrayHost('abc123--x.netlify.app', 'https://x.netlify.app'), false);
});

test('headTags: canonical per path on the production address, full preview set, nothing duplicated from extra', () => {
  const html = B.headTags({ content: content(), featured: photo, origin: 'https://preview--x.netlify.app', path: '/about' });
  assert.ok(html.includes(`<link rel="canonical" href="${config.productionUrl}/about">`));
  assert.ok(html.includes(`property="og:url" content="${config.productionUrl}/about"`));
  for (const tag of ['og:site_name', 'og:image:width', 'og:image:height', 'og:image:alt']) assert.match(html, new RegExp(`property="${tag}"`));
  for (const tag of ['twitter:title', 'twitter:description', 'twitter:image']) assert.match(html, new RegExp(`name="${tag}"`));
  // The share image is a 1200x630 JPEG and keeps the source file name.
  assert.match(html, /og:image" content="[^"]*hero\.jpg[^"]*w=1200&amp;h=630&amp;fit=cover[^"]*fm=jpg/);
  const extra = '<meta property="og:site_name" content="Mine">\n<meta property="og:image:alt" content="Mine">';
  const twice = B.headTags({ content: content(), featured: photo, extra });
  assert.equal((twice.match(/og:site_name/g) || []).length, 1);
  assert.equal((twice.match(/og:image:alt/g) || []).length, 1);
});

test('headTags: no empty description; Bing and Google codes only when valid', () => {
  const html = B.headTags({ content: content({ description: '', bing_verification: 'ABCDEF1234567890', google_verification: 'x"><script>' }), featured: null });
  assert.equal(html.includes('name="description"'), false);
  assert.equal(html.includes('og:description'), false);
  assert.match(html, /<meta name="msvalidate\.01" content="ABCDEF1234567890">/);
  assert.equal(html.includes('google-site-verification'), false);
  assert.equal(html.includes('<meta name="robots"'), config.seo.indexing === 'hold');
});

test('jsonLd: a WebSite and the business in one @graph, phone in international form, pack overrides last', () => {
  const html = B.jsonLd(content(), 'https://ignored.test', null, { '@type': 'AutoRepair', priceRange: '$$' });
  const data = JSON.parse(html.replace(/^<script[^>]*>|<\/script>$/g, ''));
  const [site, biz] = data['@graph'];
  assert.equal(site['@type'], 'WebSite');
  assert.equal(site.url, `${config.productionUrl}/`);
  assert.equal(biz['@type'], 'AutoRepair');
  assert.equal(biz['@id'], `${config.productionUrl}/#business`);
  assert.equal(biz.telephone, '+1-512-555-0100');
  assert.equal(biz.priceRange, '$$');
  assert.ok(biz.sameAs.includes('https://instagram.com/fixture'));
  assert.equal(B.e164('+44 20 7946 0000'), '+44 20 7946 0000');
});

test('the engine adds the verification fields to the pack\'s seo section once, defaulting to empty', () => {
  const seo = SECTIONS.find((s) => s.key === 'seo');
  if (!seo) return;
  for (const f of SEO_FIELDS) assert.equal(seo.fields.filter((x) => x.key === f.key).length, 1, f.key);
  assert.equal(typeof DEFAULT_CONTENT.seo.google_verification, 'string');
  const already = [{ key: 'seo', label: 'S', fields: [{ key: 'google_verification', type: 'text', max: 9 }] }];
  const merged = withSeoFields(already);
  assert.equal(merged[0].fields.length, 2);
  assert.equal(merged[0].fields[0].max, 9, 'a pack\'s own field is kept as it is');
  assert.equal(already[0].fields.length, 1, 'the pack\'s export is not mutated');
});

test('robots.txt allows crawling and names the sitemap on the production address', async () => {
  const txt = robotsTxt();
  assert.match(txt, /^User-agent: \*\nAllow: \//);
  assert.ok(txt.includes(`Sitemap: ${config.productionUrl}/sitemap.xml`));
  const res = await robots(new Request('https://x.test/robots.txt'));
  assert.match(res.headers.get('content-type'), /text\/plain/);
  assert.deepEqual(robotsConfig, { path: '/robots.txt', preferStatic: true });
});

test('render: a page on the production host carries no noindex; 404s, held sites and stray hosts do', async () => {
  const prod = await renderRoute(new Request(`${config.productionUrl}/`), { load: ok });
  assert.equal(prod.headers.get('x-robots-tag'), config.seo.indexing === 'hold' ? 'noindex' : null);
  const nf = await renderRoute(new Request(`${config.productionUrl}/no-such-page`), { load: ok, notFound: null });
  assert.equal(nf.headers.get('x-robots-tag'), 'noindex');
  const held = await renderRoute(new Request(`${config.productionUrl}/`), { load: ok, cfg: { ...config, seo: { ...config.seo, indexing: 'hold' } } });
  assert.equal(held.headers.get('x-robots-tag'), 'noindex');
  const custom = { ...config, productionUrl: 'https://example.org' };
  const stray = await renderRoute(new Request('https://abc--x.netlify.app/'), { load: ok, cfg: custom });
  assert.equal(stray.headers.get('x-robots-tag'), 'noindex');
  assert.equal(stray.headers.get('netlify-cdn-cache-control'), null, 'a stray host is never cached');
  assert.equal(stray.headers.get('cache-control'), 'no-store');
});

test('render: /about/ is a 301 to /about (query kept)', { skip: ROUTES.length < 2 && 'single-page site' }, async () => {
  const r = ROUTES[1];
  const res = await renderRoute(new Request(`https://site.test${r}/?x=1`), { load: ok });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), `https://site.test${r}?x=1`);
});

test('netlify.toml: a forced 301 from the Netlify address only once a domain and the site name are set', async () => {
  const { hostRedirects } = await import('../scripts/gen-netlify-toml.mjs');
  const base = { ...config, netlify: { ...config.netlify } };
  assert.equal(hostRedirects({ ...base, productionUrl: 'https://x.netlify.app', netlify: { ...base.netlify, siteName: 'x' } }), '');
  assert.equal(hostRedirects({ ...base, productionUrl: 'https://example.org', netlify: { publish: 'public', managed: true } }), '');
  const rules = hostRedirects({ ...base, productionUrl: 'https://example.org', netlify: { ...base.netlify, siteName: 'x-site' } });
  assert.match(rules, /from = "https:\/\/x-site\.netlify\.app\/\*"\n  to = "https:\/\/example\.org\/:splat"\n  status = 301\n  force = true/);
  assert.match(rules, /from = "http:\/\/x-site\.netlify\.app\/\*"/);
});

test('render: pages carry the baseline security headers (netlify.toml headers never reach a function)', async () => {
  const res = await renderRoute(new Request(`${config.productionUrl}/`), { load: ok });
  assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('permissions-policy'), /camera=\(\)/);
});
