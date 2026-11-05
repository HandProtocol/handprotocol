// Local-business checks: can a visitor reach the business, does the page say
// where it works, and is anything left over from the demo. Plus language
// (hreflang, client-side language toggles). These lean on `facts`: what HAND
// knows to be true about the business. An unknown fact is the owner's to
// supply, never ours to invent.
import { anchorName } from '../html.mjs';
import { clip, digits, fail, info, phonesIn, warn } from './kit.mjs';

const BOOKING_HOSTS = /calendly\.com|acuityscheduling\.com|squareup\.com|square\.site|msgsndr\.com|leadconnectorhq\.com|gohighlevel\.com|setmore\.com|booksy\.com|vagaro\.com|schedulicity\.com|simplybook\.|cal\.com|tidycal\.com|fresha\.com|mindbodyonline\.com|janeapp\.com|opentable\.com|resy\.com|fareharbor\.com|peek\.com/i;
const REVIEW_HOSTS = /g\.page|google\.[a-z.]+\/maps|maps\.app\.goo\.gl|search\.google\.com\/local|yelp\.com|facebook\.com\/[^/]+\/reviews|tripadvisor\./i;
const MAP_HOSTS = /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|maps\.apple\.com|goo\.gl\/maps/i;
const US_STATES = 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming';
// "Austin, TX" / "Austin, Texas"
const CITY_STATE = new RegExp(`\\b([A-Z][a-zA-Z.'-]+(?: [A-Z][a-zA-Z.'-]+){0,2}),\\s?(?:[A-Z]{2}\\b|${US_STATES})`);
const HREFLANG_RE = /^(x-default|[a-z]{2,3}(-[A-Za-z]{4})?(-([A-Za-z]{2}|\d{3}))?)$/;

function contactPaths(a, facts) {
  const tel = a.anchors.filter((x) => x.kind === 'tel');
  const sms = a.anchors.filter((x) => x.kind === 'sms');
  const mail = a.anchors.filter((x) => x.kind === 'mailto');
  const forms = a.doc.find('form').filter((f) => !f.offPage && f.descendants('input').concat(f.descendants('textarea')).some((i) => !['hidden', 'search', 'submit'].includes(String(i.attrs.type || 'text').toLowerCase())));
  const booking = a.anchors.filter((x) => x.kind === 'http' && (BOOKING_HOSTS.test(x.href) || (facts.bookingUrl && x.href.startsWith(facts.bookingUrl))));
  return { tel, sms, mail, forms, booking, any: tel.length + sms.length + mail.length + forms.length + booking.length > 0 };
}

export const checks = [
  {
    id: 'local-contact-path',
    category: 'local',
    title: 'a visitor can reach the business',
    gate: true,
    page({ crawl, facts, pages }, a) {
      if (a.url !== crawl.start || facts.business === false) return [];
      const sitewide = pages.some((p) => p.doc && contactPaths(p, facts).any);
      if (sitewide) return [];
      const dead = a.anchors.filter((x) => /\b(book|schedule|appointment|reserve|contact|call|get in touch)\b/i.test(anchorName(x)) && ['anchor', 'hash-only', 'empty'].includes(x.kind));
      return [fail(`there is no way to contact or book: no phone link, email link, form or booking link anywhere on the site${dead.length ? ` (the "${clip(anchorName(dead[0]), 30)}" button only scrolls the page)` : ''}`, { fix: 'Get one real contact route from the owner (a booking link, a phone number, or an email) and wire the main button to it.', who: 'owner' })];
    },
  },
  {
    id: 'local-phone',
    category: 'local',
    title: 'the phone number is on the page and tappable',
    page({ crawl, facts }, a) {
      if (a.url !== crawl.start || facts.business === false) return [];
      const paths = contactPaths(a, facts);
      const shown = phonesIn(a.text);
      const linked = new Set(paths.tel.map((x) => digits(x.href).slice(-10)));
      const out = [];
      if (facts.phone) {
        const want = digits(facts.phone).slice(-10);
        if (!shown.includes(want) && !linked.has(want)) out.push(fail(`the business phone (${facts.phone}) is not on the home page`, { fix: 'Show it in the header or the contact section as a tel: link.' }));
        const strangers = [...new Set([...shown, ...linked])].filter((n) => n !== want);
        if (strangers.length) out.push(warn(`the page shows a phone number that is not the one on file: ${strangers.join(', ')}`, { fix: 'Confirm the number with the owner digit by digit. A wrong phone on a live site is the one mistake that costs them customers.', who: 'owner' }));
      } else if (!shown.length && !linked.size) {
        out.push((paths.booking.length || paths.forms.length ? info : warn)('no phone number on the site', { fix: 'Ask the owner whether they take calls or texts. If yes, add the number as a tel: link; if no, leave it out on purpose.', who: 'owner' }));
      }
      const unlinked = shown.filter((n) => !linked.has(n));
      if (unlinked.length && shown.length) out.push(warn(`a phone number is shown as plain text, not a tap-to-call link: ${unlinked.join(', ')}`, { fix: 'Wrap it in <a href="tel:+1…">.' }));
      return out;
    },
  },
  {
    id: 'local-area',
    category: 'local',
    title: 'the page says where the business works',
    page({ crawl, facts }, a) {
      if (a.url !== crawl.start || facts.business === false) return [];
      const place = facts.locality || (facts.areaServed && facts.areaServed[0]) || null;
      const hay = `${a.title || ''} ${a.h1s.map((h) => h.text).join(' ')} ${a.description || ''}`.toLowerCase();
      if (place) {
        const out = [];
        if (!a.text.toLowerCase().includes(place.toLowerCase())) out.push(warn(`the page never mentions ${place}`, { fix: 'State the city or service area in the visible copy; local results match on it.' }));
        else if (!hay.includes(place.toLowerCase())) out.push(info(`${place} is in the copy but not in the title, main heading or description`, { fix: `Work it into the title: "<service> in ${place} | <name>".` }));
        return out;
      }
      const found = CITY_STATE.exec(a.text);
      if (found) return [info(`the page mentions "${found[0]}", but no city or service area is on file for this business`, { fix: 'Confirm the service area with the owner and record it, so the title and structured data can use it.', who: 'owner' })];
      return [warn('the page names no city: nothing tells a search engine (or a visitor) where the business works', { fix: 'Ask the owner for the city or service area, then put it in the title, the copy and the structured data. Do not guess it.', who: 'owner' })];
    },
  },
  {
    id: 'local-reviews',
    category: 'local',
    title: 'the site connects to the business\'s profiles',
    page({ crawl, facts }, a) {
      if (a.url !== crawl.start || facts.business === false) return [];
      const out = [];
      const hrefs = a.anchors.map((x) => x.href || '');
      if (!hrefs.some((h) => REVIEW_HOSTS.test(h))) out.push(info('no link to a Google Business Profile or a review page', { fix: 'Once the Business Profile is verified, link to it (and to its "leave a review" link) from the site.', who: 'owner' }));
      if (facts.serviceMode === 'storefront' && !hrefs.some((h) => MAP_HOSTS.test(h)) && !a.doc.find('iframe').some((f) => MAP_HOSTS.test(f.attrs.src || ''))) out.push(info('a storefront without a map or directions link', { fix: 'Add a "Get directions" link to the Maps listing.' }));
      return out;
    },
  },
  {
    id: 'demo-leftovers',
    category: 'content',
    title: 'nothing from the demo or the host is left on the page',
    gate: true,
    page(ctx, a) {
      const out = [];
      const scripts = a.head.scripts.map((s) => s.src || '');
      if (scripts.some((s) => /demo-visit\.js/.test(s))) out.push(fail('the demo visit tracker (/assets/demo-visit.js) is still on the page', { fix: 'Remove it from the production site.' }));
      if (scripts.some((s) => /\/\.netlify\/scripts\/hud/.test(s)) || /\/\.netlify\/scripts\/hud/.test(a.page.html || '')) out.push(fail('the "Powered by Netlify" badge script is on the page', { fix: 'PATCH the site with built_with_badge_enabled: false and redeploy.' }));
      if (/free preview|this is a (free )?(demo|preview)|design preview/i.test(a.text)) out.push(warn('the page still calls itself a preview or demo', { evidence: clip(a.text.match(/.{0,40}(free preview|this is a (free )?(demo|preview)|design preview).{0,40}/i)?.[0] || '', 110), fix: 'Remove the demo wording.' }));
      return out;
    },
  },
  {
    id: 'copyright-year',
    category: 'content',
    title: 'the footer year is current',
    page(ctx, a) {
      const m = /(?:©|&copy;|\(c\)|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/i.exec(a.text);
      const year = new Date().getFullYear();
      return m && Number(m[1]) < year ? [info(`the copyright line says ${m[1]}`, { fix: `Make it ${year} (or compute it), so the site does not look abandoned.` })] : [];
    },
  },
  {
    id: 'hreflang',
    category: 'i18n',
    title: 'language alternates are valid',
    page({ byUrl }, a) {
      const alts = a.head.links.filter((l) => l.rel.includes('alternate') && l.hreflang);
      if (!alts.length) return [];
      const out = [];
      const bad = alts.filter((l) => !HREFLANG_RE.test(l.hreflang.trim()));
      if (bad.length) out.push(warn(`invalid hreflang value(s): ${bad.map((l) => `"${l.hreflang}"`).join(', ')}`, { fix: 'Use a language code like "en" or "es", optionally with a region ("es-MX"), or "x-default".' }));
      if (alts.some((l) => !l.inHead)) out.push(fail('hreflang tags sit outside <head> and are ignored', { fix: 'Move them into <head>.' }));
      if (alts.some((l) => l.href && !/^https?:\/\//i.test(l.href))) out.push(warn('hreflang URLs must be absolute', { fix: 'Use full https:// URLs.' }));
      const urls = alts.map((l) => (l.href || '').replace(/\/$/, ''));
      if (!urls.includes(a.url.replace(/\/$/, ''))) out.push(warn('the page does not list itself among its hreflang alternates', { fix: 'Every page in the set must include a self-referencing entry.' }));
      for (const l of alts) {
        const other = byUrl.get(l.href);
        if (other && other.head && other.url !== a.url && !other.head.links.some((x) => x.rel.includes('alternate') && x.hreflang && (x.href || '').replace(/\/$/, '') === a.url.replace(/\/$/, ''))) {
          out.push(warn(`${l.href} (hreflang ${l.hreflang}) does not link back to this page`, { fix: 'hreflang must be reciprocal or Google ignores the pair.' }));
        }
      }
      return out;
    },
  },
  {
    id: 'bilingual-toggle',
    category: 'i18n',
    title: 'a second language is reachable by search engines',
    page({ crawl }, a) {
      if (a.url !== crawl.start || !a.bilingualToggle) return [];
      return [info('Spanish copy is swapped in by the browser on the same URL (data-es): search engines index the English page only', { fix: 'This serves Spanish-speaking visitors who arrive, not Spanish searches. To rank in Spanish, add a real /es page with its own title and hreflang tags.' })];
    },
  },
];
