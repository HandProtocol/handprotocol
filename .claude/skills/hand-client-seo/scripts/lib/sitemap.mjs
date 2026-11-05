// sitemap.xml reader: urlset and sitemapindex, with the problems an audit
// cares about. Regex-level XML on purpose (sitemaps are flat). No dependencies.
// Fetching (and following an index's children) happens in crawl.mjs.
import { decodeEntities } from './html.mjs';

const W3C_DATE = /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/;

// → { kind: 'urlset'|'index'|'unknown', urls: [{ loc, lastmod, images }], children: [loc], problems: [string] }
export function parseSitemap(xml) {
  const text = String(xml ?? '');
  const out = { kind: 'unknown', urls: [], children: [], problems: [] };
  if (!text.trim()) {
    out.problems.push('empty file');
    return out;
  }
  const isIndex = /<sitemapindex[\s>]/i.test(text);
  const isSet = /<urlset[\s>]/i.test(text);
  if (!isIndex && !isSet) {
    out.problems.push(/<html[\s>]/i.test(text) ? 'this is an HTML page, not a sitemap' : 'no <urlset> or <sitemapindex> element');
    return out;
  }
  out.kind = isIndex ? 'index' : 'urlset';
  if (!/xmlns=["']https?:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/i.test(text)) {
    out.problems.push('missing the sitemaps.org namespace (xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")');
  }
  const block = isIndex ? /<sitemap[\s>][\s\S]*?<\/sitemap>/gi : /<url[\s>][\s\S]*?<\/url>/gi;
  const pick = (chunk, tag) => {
    const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(chunk);
    return m ? decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()) : null;
  };
  for (const chunk of text.match(block) || []) {
    const loc = pick(chunk, 'loc');
    if (!loc) {
      out.problems.push('an entry has no <loc>');
      continue;
    }
    if (isIndex) {
      out.children.push(loc);
      continue;
    }
    const lastmod = pick(chunk, 'lastmod');
    if (lastmod && !W3C_DATE.test(lastmod)) out.problems.push(`lastmod "${lastmod}" is not a W3C date (use YYYY-MM-DD or a full ISO timestamp)`);
    out.urls.push({ loc, lastmod, images: (chunk.match(/<image:loc>/gi) || []).length });
  }
  if (!isIndex && out.urls.length === 0) out.problems.push('the sitemap lists no URLs');
  if (out.urls.length > 50000) out.problems.push(`${out.urls.length} URLs: the limit is 50,000 per file`);
  return out;
}
