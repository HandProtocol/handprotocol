// Links and images: does everything a visitor (or a crawler) can follow lead
// somewhere, and do the photos carry words, sizes and a sane weight.
import { anchorName } from '../html.mjs';
import { likelyLcpImage } from '../analyze.mjs';
import { tryUrl } from '../util.mjs';
import { clip, digits, fail, info, warn } from './kit.mjs';

const GENERIC_TEXT = /^(click here|here|read more|learn more|more|this|link|go|details|continue)$/i;
const FILENAME_ALT = /\.(jpe?g|png|gif|webp|avif|svg)$|^(img|image|photo|picture|dsc|untitled)[\s_-]?\d*$/i;
const first = (list, n = 4) => list.slice(0, n).join(', ') + (list.length > n ? ` (+${list.length - n} more)` : '');
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

function imageUrl(a, im) {
  return tryUrl(im.src, a.base)?.href || null;
}

export const checks = [
  {
    id: 'links-broken-internal',
    category: 'links',
    title: 'no internal link is broken',
    gate: true,
    page({ res }, a) {
      const bad = [];
      for (const l of a.page.links) {
        if (!l.internal) continue;
        const r = res.links.get(l.url);
        if (r && (r.status === 0 || r.status >= 400)) bad.push(`${l.url} → ${r.status || r.error}`);
      }
      const uniq = [...new Set(bad)];
      return uniq.length ? [fail(`${uniq.length} broken internal link(s): ${first(uniq, 3)}`, { fix: 'Fix the address or remove the link.' })] : [];
    },
  },
  {
    id: 'links-broken-external',
    category: 'links',
    title: 'no outbound link is dead',
    // Site-wide: a dead link in the footer is one problem, not one per page.
    site({ res, pages }) {
      const bad = new Map();
      const unsure = new Map();
      const note = (map, key, url) => map.set(key, [...(map.get(key) || []), url]);
      for (const a of pages) {
        for (const l of new Map(a.page.links.filter((x) => !x.internal).map((x) => [x.url, x])).values()) {
          const r = res.links.get(l.url);
          if (!r) continue;
          if (r.botWall && r.status !== 200) {
            if (r.status === 404 || r.status === 410) note(bad, `${l.url} → ${r.status}`, a.page.url);
            else note(unsure, l.url, a.page.url);
          } else if (r.status === 0 || r.status === 404 || r.status === 410 || r.status >= 500) note(bad, `${l.url} → ${r.status || r.error}`, a.page.url);
          else if (r.status >= 400) note(unsure, `${l.url} (${r.status})`, a.page.url);
        }
      }
      const where = (map) => [...map].map(([k, urls]) => `${k} (on ${urls.length === 1 ? urls[0] : `${urls.length} pages`})`).join('; ');
      const out = [];
      if (bad.size) out.push(warn(`${bad.size} outbound link(s) are dead: ${first([...bad.keys()], 3)}`, { url: [...bad.values()][0][0], evidence: where(bad), fix: 'Update or remove them.' }));
      if (unsure.size) out.push(info(`${unsure.size} outbound link(s) could not be verified by a script (social sites refuse bots): ${first([...unsure.keys()], 3)}`, { evidence: where(unsure), fix: 'Open each once by hand.' }));
      return out;
    },
  },
  {
    id: 'links-fragments',
    category: 'links',
    title: 'in-page links land on something',
    page({ byUrl }, a) {
      const missing = [];
      for (const l of a.page.links) {
        if (!l.fragment || !l.internal) continue;
        const target = byUrl.get(l.url);
        if (target && target.ids && !target.ids.has(l.fragment) && l.fragment !== 'top') missing.push(`#${l.fragment}${target.url === a.url ? '' : ` on ${target.url}`}`);
      }
      const uniq = [...new Set(missing)];
      return uniq.length ? [warn(`${uniq.length} link(s) jump to an anchor that does not exist: ${first(uniq)}`, { fix: 'Add the id to the target section or correct the link (a hidden empty section takes its id with it).' })] : [];
    },
  },
  {
    id: 'links-crawlable',
    category: 'links',
    title: 'links are real links',
    page(ctx, a) {
      const dead = a.anchors.filter((x) => ['empty', 'hash-only', 'javascript'].includes(x.kind));
      const bare = a.anchors.filter((x) => x.kind === 'none' && (x.text || x.hasImg));
      const out = [];
      if (dead.length) out.push(warn(`${dead.length} link(s) go nowhere (href="", "#" or javascript:): ${first(dead.map((x) => `"${clip(anchorName(x) || '(no text)', 30)}"`))}`, { fix: 'Give each a real destination, or make it a <button> if it only runs script. Crawlers do not follow these.' }));
      if (bare.length) out.push(info(`${bare.length} <a> tag(s) have no href: ${first(bare.map((x) => `"${clip(anchorName(x), 30)}"`))}`, { fix: 'Add the destination.' }));
      return out;
    },
  },
  {
    id: 'links-names',
    category: 'links',
    title: 'every link says where it goes',
    page(ctx, a) {
      const real = a.anchors.filter((x) => !['none', 'empty', 'hash-only', 'javascript'].includes(x.kind));
      const nameless = real.filter((x) => !anchorName(x));
      const generic = real.filter((x) => GENERIC_TEXT.test(anchorName(x)));
      const out = [];
      if (nameless.length) out.push(warn(`${nameless.length} link(s) have no text, alt text or aria-label: ${first(nameless.map((x) => clip(x.href, 40)))}`, { fix: 'Add visible text, alt text on the image inside, or an aria-label.' }));
      if (generic.length) out.push(info(`${generic.length} link(s) say only "${anchorName(generic[0])}"`, { fix: 'Name the destination ("See session prices") so people and search engines know what is behind it.' }));
      return out;
    },
  },
  {
    id: 'links-contact-format',
    category: 'links',
    title: 'phone and email links are well formed',
    page(ctx, a) {
      const out = [];
      for (const x of a.anchors) {
        if (x.kind === 'tel') {
          const raw = x.href.replace(/^tel:/i, '');
          const n = digits(raw);
          if (/[^\d+().\s-]/.test(raw) || n.length < 10 || n.length > 15) out.push(fail(`a phone link will not dial: href="${x.href}"`, { fix: 'Use tel:+15125550100: country code, digits only.' }));
          else if (!raw.trim().startsWith('+')) out.push(info(`phone link without a country code: href="${x.href}"`, { fix: 'Write tel:+1… so it dials from anywhere.' }));
        }
        if (x.kind === 'mailto' && !/^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+(\?.*)?$/i.test(x.href.trim())) out.push(fail(`an email link is malformed: href="${clip(x.href, 60)}"`, { fix: 'Use mailto:name@domain.com.' }));
      }
      return out;
    },
  },
  {
    id: 'links-attributes',
    category: 'links',
    title: 'link attributes do not work against the site',
    page(ctx, a) {
      const nofollow = a.page.links.filter((l) => l.internal && l.nofollow && l.kind !== 'anchor' && !/^\/(admin|api)(\/|$)/.test(new URL(l.url).pathname)).map((l) => l.url);
      const insecure = a.anchors.filter((x) => x.kind === 'http' && /^http:\/\//i.test(x.href)).map((x) => x.href);
      const out = [];
      if (nofollow.length) out.push(warn(`${new Set(nofollow).size} internal link(s) carry rel="nofollow": ${first([...new Set(nofollow)], 3)}`, { fix: 'Remove nofollow from links to your own pages.' }));
      if (insecure.length) out.push(info(`${insecure.length} link(s) point at plain http:// addresses: ${first(insecure, 3)}`, { fix: 'Use https:// where the destination supports it.' }));
      return out;
    },
  },
  {
    id: 'img-alt',
    category: 'images',
    title: 'photos have alt text',
    page(ctx, a) {
      const none = a.images.filter((i) => i.alt === null && !i.decorative);
      const linked = a.images.filter((i) => i.alt === '' && i.inLink);
      const poor = a.images.filter((i) => i.alt && (FILENAME_ALT.test(i.alt.trim()) || i.alt.length > 180));
      const out = [];
      if (none.length) out.push(warn(`${none.length} image(s) have no alt attribute: ${first(none.map((i) => clip(i.src, 50)), 3)}`, { fix: 'Describe what the photo shows in a short sentence; use alt="" only for decoration.' }));
      if (poor.length) out.push(info(`${poor.length} alt text(s) are a file name or far too long: ${first(poor.map((i) => `"${clip(i.alt, 40)}"`), 3)}`, { fix: 'Describe the photo in plain words, under 125 characters.' }));
      const namelessLinks = a.anchors.filter((x) => x.hasImg && !anchorName(x)).length;
      if (linked.length && namelessLinks) out.push(warn(`${namelessLinks} linked image(s) have empty alt text, so the link has no name`, { fix: 'Give the image alt text that says where the link goes.' }));
      return out;
    },
  },
  {
    id: 'img-dimensions',
    category: 'images',
    title: 'images reserve their space',
    page(ctx, a) {
      const none = a.images.filter((i) => (!i.width || !i.height) && i.src && !i.src.startsWith('data:'));
      return none.length ? [warn(`${none.length} image(s) have no width/height attributes, so the page jumps as they load: ${first(none.map((i) => clip(i.src, 50)), 3)}`, { fix: 'Add the intrinsic width and height (layout shift counts against Core Web Vitals).' })] : [];
    },
  },
  {
    id: 'img-broken',
    category: 'images',
    title: 'every image loads',
    gate: true,
    page({ res }, a) {
      const bad = [];
      for (const im of a.images) {
        const u = imageUrl(a, im);
        const r = u ? res.images.get(u) : null;
        if (r && (r.status === 0 || r.status >= 400)) bad.push(`${clip(im.src, 60)} → ${r.status || r.error}`);
      }
      return bad.length ? [fail(`${bad.length} image(s) do not load: ${first(bad, 3)}`, { fix: 'Fix the path or re-upload the photo.' })] : [];
    },
  },
  {
    id: 'img-weight',
    category: 'images',
    title: 'photos are not oversized',
    page({ res }, a) {
      const heavy = [];
      const legacy = [];
      for (const im of a.images) {
        const u = imageUrl(a, im);
        const r = u ? res.images.get(u) : null;
        if (!r || r.status !== 200 || !r.bytes) continue;
        if (r.bytes > 400_000) heavy.push({ src: im.src, bytes: r.bytes, dims: r.width ? `${r.width}×${r.height}` : '' });
        else if (r.bytes > 120_000 && ['jpeg', 'png'].includes(r.type)) legacy.push({ src: im.src, bytes: r.bytes, type: r.type });
      }
      const out = [];
      if (heavy.length) out.push((heavy.some((h) => h.bytes > 1_500_000) ? fail : warn)(`${heavy.length} image(s) weigh more than 400 KB: ${first(heavy.map((h) => `${clip(h.src, 40)} (${kb(h.bytes)}${h.dims ? `, ${h.dims}` : ''})`), 3)}`, { fix: 'Resize to the width it is shown at and serve WebP or AVIF; on Netlify use /.netlify/images?url=…&w=…&fm=webp.' }));
      if (legacy.length) out.push(info(`${legacy.length} image(s) over 120 KB are JPEG/PNG: ${first(legacy.map((h) => `${clip(h.src, 40)} (${kb(h.bytes)})`), 3)}`, { fix: 'WebP or AVIF is usually half the size at the same quality.' }));
      return out;
    },
  },
  {
    id: 'img-lcp',
    category: 'performance',
    title: 'the first big image loads with priority',
    page({ crawl }, a) {
      if (a.url !== crawl.start) return [];
      const lcp = likelyLcpImage(a);
      if (!lcp) return [];
      if (lcp.loading === 'lazy') return [warn(`the first large image is lazy-loaded (${clip(lcp.src, 50)}): the browser waits to fetch what is probably the largest thing on screen`, { fix: 'Remove loading="lazy" from the hero image and add fetchpriority="high".' })];
      const eager = a.images.filter((i) => i.fetchpriority === 'high');
      if (eager.length > 1) return [info(`${eager.length} images claim fetchpriority="high"; only the one in the first screen should`, { fix: 'Keep it on the hero image only.' })];
      if (!lcp.fetchpriority) return [info(`the hero image has no fetchpriority="high" (${clip(lcp.src, 50)})`, { fix: 'Add fetchpriority="high" so it is fetched before other images.' })];
      return [];
    },
  },
];
