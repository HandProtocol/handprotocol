// Structured data and link-preview (Open Graph) checks.
import { collectNodes, describeNodes, isLocalBusiness, isType } from '../jsonld.mjs';
import { bareHost, hostOf, normalizeUrl, tryUrl } from '../util.mjs';
import { article, clip, digits, fail, info, phonesIn, warn } from './kit.mjs';

// Facts only the owner can supply: a missing one is theirs to give, not ours to invent.
const OWNER_CODES = new Set(['lb-telephone', 'lb-address', 'lb-hours', 'lb-price', 'lb-sameas']);
const by = { fail, warn, info };

export function iconLinks(a) {
  return a.head.links.filter((l) => l.rel.includes('icon') && l.href).map((l) => ({ ...l, abs: tryUrl(l.href, a.base)?.href || null }));
}

export const checks = [
  {
    id: 'jsonld-parse',
    category: 'structured-data',
    title: 'structured data parses and holds no placeholders',
    gate: true,
    page(ctx, a) {
      return a.ld.issues.filter((i) => ['jsonld-parse', 'jsonld-placeholder', 'jsonld-context', 'jsonld-empty'].includes(i.code)).map((i) => by[i.level](i.message, { fix: i.code === 'jsonld-parse' ? 'Fix the JSON (a trailing comma or an unescaped quote is the usual cause).' : 'Leave a property out until the real value is known.' }));
    },
  },
  {
    id: 'jsonld-present',
    category: 'structured-data',
    title: 'the home page describes the business in structured data',
    page({ crawl, facts }, a) {
      if (a.url !== crawl.start || facts.business === false) return [];
      if (a.blocks.length === 0) return [warn('no JSON-LD structured data on the home page', { fix: 'Add a LocalBusiness block (most specific subtype) with name, url, image, telephone, and address or areaServed.', engineFix: 'Engine sites: B.jsonLd() in site/page.mjs plus the seo block in site.config.mjs.' })];
      if (!a.ld.businesses.length) return [warn(`the home page's structured data (${describeNodes(a.ld.nodes) || 'no typed nodes'}) does not include a LocalBusiness type`, { fix: 'Describe the business with the most specific LocalBusiness subtype that fits.' })];
      return [];
    },
  },
  {
    id: 'jsonld-business',
    category: 'structured-data',
    title: 'the LocalBusiness data is complete and true',
    page({ facts }, a) {
      return a.ld.issues
        .filter((i) => i.code.startsWith('lb-'))
        .map((i) => by[i.level](i.message, { who: OWNER_CODES.has(i.code) && i.level !== 'fail' ? 'owner' : 'hand', fix: OWNER_CODES.has(i.code) ? 'Confirm the fact with the owner, then add it. Never fill it with a guess.' : 'Correct the structured data.' }));
    },
  },
  {
    id: 'jsonld-other',
    category: 'structured-data',
    title: 'other structured data types are well formed',
    page(ctx, a) {
      return a.ld.issues.filter((i) => /^(website|breadcrumb|faq|org)-/.test(i.code)).map((i) => by[i.level](i.message, { fix: 'Correct the structured data.' }));
    },
  },
  {
    id: 'jsonld-site-name',
    category: 'structured-data',
    title: 'the home page names the site for search results',
    page({ crawl }, a) {
      if (a.url !== crawl.start || crawl.scope !== '/' || !a.blocks.length) return [];
      return a.ld.nodes.some((n) => isType(n.node, 'WebSite')) ? [] : [info('no WebSite node: Google picks the site name shown above results from WebSite.name on the home page, then og:site_name, then the title', { fix: 'Add { "@type": "WebSite", "name": "<business name>", "url": "<home page>" } to the home page\'s JSON-LD.' })];
    },
  },
  {
    id: 'jsonld-host',
    category: 'structured-data',
    title: 'structured data points at this site',
    page(ctx, a) {
      const here = bareHost(hostOf(a.url));
      const off = [];
      for (const { node } of collectNodes(a.blocks.filter((b) => !b.error)).filter((n) => n.top)) {
        for (const key of ['url', '@id']) {
          const value = typeof node[key] === 'string' ? node[key] : null;
          if (value && /^https?:\/\//i.test(value) && bareHost(hostOf(value)) !== here && (isLocalBusiness(node) || isType(node, 'WebSite') || isType(node, 'WebPage'))) off.push(`${key}: ${value}`);
        }
      }
      return off.length ? [warn(`structured data names another host (${clip(off.join(', '), 140)})`, { fix: 'url and @id must use this site\'s own address.', who: 'cutover' })] : [];
    },
  },
  {
    id: 'jsonld-matches-page',
    category: 'structured-data',
    title: 'structured data matches what the page shows',
    page(ctx, a) {
      const out = [];
      const shown = new Set([...phonesIn(a.text), ...a.anchors.filter((x) => x.kind === 'tel').map((x) => digits(x.href).slice(-10))]);
      for (const b of a.ld.businesses) {
        const tel = digits(b.telephone).slice(-10);
        if (tel.length === 10 && !shown.has(tel)) out.push(fail(`structured data gives the phone ${b.telephone}, which is nowhere on the page`, { fix: 'The number in the markup must be the number a visitor sees. Confirm it with the owner digit by digit.', who: 'owner' }));
        const name = String(b.name || '').toLowerCase().trim();
        if (name && !a.text.toLowerCase().includes(name) && !(a.title || '').toLowerCase().includes(name)) out.push(warn(`structured data names the business "${b.name}", which does not appear in the page's text or title`, { fix: 'Use the same name everywhere: site, Business Profile, listings.' }));
      }
      return out;
    },
  },
  {
    id: 'og-basics',
    category: 'social',
    title: 'the page has a link preview (Open Graph)',
    page(ctx, a) {
      const missing = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].filter((k) => !(a.og.get(k) || []).some(Boolean));
      if (missing.length === 5) return [warn('no Open Graph tags: a link to this page in a text or on Facebook shows no title card or photo', { fix: 'Add og:title, og:description, og:image (1200×630), og:url and og:type.' })];
      const out = missing.length ? [warn(`missing ${missing.join(', ')}`, { fix: 'Add the missing Open Graph tags.' })] : [];
      const clashing = [...a.og].filter(([k, v]) => ['og:title', 'og:description', 'og:url', 'og:site_name', 'og:type'].includes(k) && new Set(v).size > 1).map(([k]) => k);
      if (clashing.length) out.push(warn(`${clashing.join(', ')} appear more than once with different values`, { fix: 'Keep one of each.' }));
      const repeated = [...a.og].filter(([k, v]) => ['og:title', 'og:description', 'og:url', 'og:site_name', 'og:type', 'og:image:alt'].includes(k) && v.length > 1 && new Set(v).size === 1).map(([k]) => k);
      if (repeated.length) out.push(info(`${repeated.join(', ')} are emitted twice (same value)`, { fix: 'Drop the duplicate (an engine pack passing the tag through `extra` after the engine started emitting it).' }));
      return out;
    },
  },
  {
    id: 'og-image',
    category: 'social',
    title: 'the share image loads and has the right shape',
    page({ res }, a) {
      if (!a.ogImage) return [];
      if (!/^https?:\/\//i.test(a.ogImage)) return [fail(`og:image is not an absolute URL ("${clip(a.ogImage, 60)}"): apps that build link previews cannot load it`, { fix: 'Use the full https:// URL.' })];
      const img = res.images.get(a.ogImageAbs);
      if (!img) return [];
      if (img.status !== 200) return [fail(`og:image answers ${img.status || img.error}`, { evidence: a.ogImageAbs, fix: 'Point og:image at an image that loads.' })];
      if (!/^image\//i.test(img.contentType)) return [fail(`og:image is served as "${img.contentType}"`, { evidence: a.ogImageAbs, fix: 'It must be an image.' })];
      const out = [];
      if (/placeholder|\bph-\d|stock-?photo|sample/i.test(new URL(a.ogImageAbs).pathname)) out.push(fail('og:image is a placeholder image: every shared link shows it', { evidence: a.ogImageAbs, fix: 'Set a real photo of the business as the share image.', who: 'owner' }));
      if (img.width && img.height) {
        const ratio = img.width / img.height;
        if (img.width < 600 || img.height < 315) out.push(warn(`og:image is ${img.width}×${img.height}: too small for a large preview card`, { fix: 'Use 1200×630.' }));
        else if (ratio < 1.5 || ratio > 2.2) out.push(warn(`og:image is ${img.width}×${img.height} (${ratio < 1 ? 'portrait' : ratio < 1.5 ? 'nearly square' : 'very wide'}): preview cards crop to about 1.91:1, so faces and words get cut`, { fix: 'Serve a 1200×630 crop.', engineFix: 'Engine sites: the current engine builds a 1200×630 JPEG from the Featured photo; run sync-engine for this client.' }));
      }
      if (['webp', 'avif', 'svg'].includes(img.type)) out.push(warn(`og:image is ${article(img.type.toUpperCase())} ${img.type.toUpperCase()} file: several apps that build link previews do not show it`, { fix: 'Use JPEG or PNG for the share image.', engineFix: 'Engine sites: fixed by the current engine (JPEG share image); run sync-engine for this client.' }));
      if (img.bytes && img.bytes > 5_000_000) out.push(warn(`og:image weighs ${(img.bytes / 1e6).toFixed(1)} MB`, { fix: 'Keep it under 1 MB; platforms give up on large files.' }));
      return out;
    },
  },
  {
    id: 'og-url',
    category: 'social',
    title: 'og:url matches the canonical',
    page(ctx, a) {
      const og = (a.og.get('og:url') || [])[0];
      if (!og || !a.canonical) return [];
      const same = (normalizeUrl(og, a.base) || '').replace(/\/$/, '') === a.canonical.replace(/\/$/, '');
      return same ? [] : [warn(`og:url (${og}) differs from the canonical (${a.canonical})`, { fix: 'Both should name the same URL; shares are counted against og:url.' })];
    },
  },
  {
    id: 'og-extras',
    category: 'social',
    title: 'the link preview is complete',
    page(ctx, a) {
      if (!a.ogImage) return [];
      const missing = [];
      if (!a.og.get('og:site_name')) missing.push('og:site_name');
      if (!a.og.get('og:image:width') || !a.og.get('og:image:height')) missing.push('og:image:width/height (lets the first share render without a delay)');
      if (!a.og.get('og:image:alt')) missing.push('og:image:alt');
      if (!a.twitter.get('twitter:card')) missing.push('twitter:card (summary_large_image)');
      return missing.length ? [info(`link-preview polish missing: ${missing.join('; ')}`, { fix: 'Add them.', engineFix: 'Engine sites: all emitted by the current engine; run sync-engine for this client.' })] : [];
    },
  },
  {
    id: 'favicon',
    category: 'on-page',
    title: 'the site has an icon search results can show',
    site({ crawl, res, home }) {
      if (!home || !home.head) return { skip: 'the start page did not load' };
      const icons = iconLinks(home);
      if (!icons.length) {
        const fallback = res.images.get(`${crawl.origin}/favicon.ico`);
        return fallback && fallback.status === 200 ? [info('no <link rel="icon">; browsers and Google fall back to /favicon.ico', { fix: 'Declare it: <link rel="icon" href="/favicon.ico">.' })] : [warn('no favicon: results and browser tabs show a blank globe', { fix: 'Add a square icon (SVG, or PNG in a multiple of 48 px) and <link rel="icon" href="…">.' })];
      }
      const out = [];
      for (const icon of icons) {
        const img = icon.abs ? res.images.get(icon.abs) : null;
        if (img && img.status !== 200) out.push(warn(`the favicon ${icon.href} answers ${img.status || img.error}`, { fix: 'Fix the path.' }));
        else if (img && img.width && img.height && img.type !== 'svg' && (img.width !== img.height || img.width < 48)) out.push(info(`the favicon is ${img.width}×${img.height}; Google wants a square of at least 48 px`, { fix: 'Supply a 48×48 (or larger multiple) PNG, or an SVG.' }));
      }
      return out;
    },
  },
];
