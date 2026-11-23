// Three Hands Healing — the Cathedral design, rendered from the owner's
// content. Routes: "/" (homepage), one page per practice area (/body, /mind,
// /pets), every session in one list (/services) and the questions (/faq).
// Every string is a schema field (site/schema.mjs).
//
// Photos are picked by Category in /admin/ Media (Featured = hero arch):
//   Path  → behind the Welcome heading (none = a teal glow, no photo)
//   About → Meet Maria          Book  → the small arch in the Book block
//   Body / Mind / Pets → that practice's page and its homepage block
//   Quote → beside the quote on a practice page
// With no photo in a category, a sensible shipped photo is used instead.
//
// Booking (2026-11-15): Kohsi, not Calendly. contact.kohsi_url = Maria's
// Kohsi booking page (book.3handshealing.com). Every session's Book opens it
// on that session (?service=<Kohsi service key>, matched by session name in
// KOHSI_SERVICES); the intro call opens it on intro-call. The older link
// fields still win when filled: contact.booking_url (general Book),
// contact.intro_call_url, and a session's own book_url.

import * as B from '../netlify/functions/lib/blocks.mjs';
import { toView } from '../netlify/functions/lib/content.mjs';
import { WORDMARK } from './brand.mjs';

const { e, paragraphs } = B;
const ARCH_SIZES = '(max-width: 860px) min(240px, 62vw), 340px';
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export const ROUTES = ['/body', '/mind', '/pets', '/services', '/faq'];

// route → content section, fallback photo, homepage number
const PAGES = {
  '/body': { key: 'page_body', category: 'body', file: 'maria-arch-palms', homeFile: 'maria-arch-standing', num: '01', pos: '30% 40%', homePos: '50% 28%' },
  '/mind': { key: 'page_mind', category: 'mind', file: 'maria-arch-reach', num: '02', pos: '50% 52%' },
  '/pets': { key: 'page_pets', category: 'pets', file: 'pets-dog-cat', num: '03', pos: '45% 50%' },
};
// Shipped with the site but not (yet) a media row in production. Rendered
// through toView() like a media row, so they get the Image CDN srcset and the
// 1200×630 share image (a bare /img path would ship the full file and no
// preview crop).
const STATIC_PHOTOS = {
  'pets-dog-cat': { width: 1328, height: 1184, alt: 'A dog and a tabby cat asleep together on a soft blanket' },
  // 2026-10-06, from koH: homepage block 1, and the Mind photo everywhere.
  'maria-arch-standing': { width: 682, height: 1024, alt: 'Maria standing in a stone archway, the red door open beside her' },
  'maria-arch-reach': { width: 682, height: 1024, alt: 'Maria under a stone arch, smiling and reaching one open hand toward you' },
};

// The booking sheet: one native <dialog> per page that site.js fills with
// her <kohsi-booking> on the first Book click (widget.js loads then, never
// on first paint). Empty when there is no key: Book links stay plain links.
function bookSheet(c) {
  const k = kohsiEmbed(c);
  if (!k) return '';
  const mail = String(c.contact.email || '').trim();
  const phone = String(c.contact.phone || '').trim();
  return `<dialog class="booksheet" id="booksheet" aria-labelledby="booksheet-title" data-key="${e(k.key)}" data-api="${e(k.api)}"${mail ? ` data-email="${e(mail)}"` : ''}${phone ? ` data-phone="${e(phone)}"` : ''}>
    <div class="booksheet__bar">
      <p class="eyebrow booksheet__title" id="booksheet-title">${e(c.brand.name)}</p>
      <button class="booksheet__close" type="button" data-booksheet-close aria-label="Close booking">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3l12 12M15 3 3 15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/></svg>
      </button>
    </div>
    <div class="booksheet__body" data-booksheet-body>
      <p class="booksheet__wait" data-booksheet-wait>Opening the calendar…</p>
    </div>
  </dialog>`;
}

// --- small pieces ------------------------------------------------------------

function plumb() {
  return '<span class="plumb" aria-hidden="true"></span>';
}

function headline(text) {
  const lines = String(text || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3);
  if (lines.length === 3) {
    return `<span class="hero__l1">${e(lines[0])}</span>
          <span class="hero__l2">${e(lines[1])}</span>
          <span class="hero__l3">${e(lines[2])}</span>`;
  }
  return lines.map((l) => `<span class="hero__l3">${e(l)}</span>`).join('\n          ');
}

function arch(view, { cls = '', sizes = ARCH_SIZES, eager = false, glow = false, pos = '' } = {}) {
  if (!view) return '';
  const style = pos ? ` style="--pos:${e(pos)}"` : '';
  return `<figure class="arch-frame ${cls}"${style}>
          ${glow ? '<span class="glow" aria-hidden="true"></span>' : ''}
          <div class="arch${cls.includes('--sm') ? ' arch--sm' : ''}">${B.img(view, { sizes, eager })}</div>
        </figure>`;
}

// Booking links stay in this tab (koH, 2026-11-22: "it shouldnt open a
// completely new page and new window"). A link to her Kohsi page carries
// data-kohsi (the service key, or empty for no preselection): site.js opens
// it in the booking sheet on this page, and the href is the no-JS way in.
function link(href, cls, label, kohsi) {
  const sheet = typeof kohsi === 'string' ? ` data-kohsi="${e(kohsi)}"` : '';
  return `<a class="${cls}" href="${e(href)}"${sheet}>${label}</a>`;
}

const isUrl = (u) => /^https?:\/\//i.test(String(u || '').trim());

// Session name (as on the site) → its service key in Maria's Kohsi profile
// (kohsi/deploy/tenants/3handshealing.json). A renamed session that is not
// listed here still books: it opens her booking page without a preselection.
const KOHSI_SERVICES = Object.freeze({
  'candace silvers energy healing': 'energy-healing',
  'integrated bodywork': 'bodywork',
  'chakra balancing': 'chakra',
  'somatic movement, qi gong & sacred arts': 'qigong',
  'eft / tapping': 'eft',
  'systemic constellations': 'constellations',
  'emotional release exercises': 'emotional-release',
  'spiritual counseling & practice': 'spiritual-counseling',
  'distance healing session for your pet': 'pet-distance',
});
// A session she offers at more than one length in Kohsi gets one Book button
// per length, so the visitor never lands on the wrong one (2026-11-23).
const KOHSI_LENGTHS = Object.freeze({
  'integrated bodywork': [['bodywork', '60 min'], ['bodywork-90', '90 min']],
});
const INTRO_SERVICE = 'intro-call';

// Her publishable Kohsi key and the address its widget is served from
// (site.config.mjs kohsi). Without a key every Book link is a plain link.
function kohsiEmbed(c) {
  const key = String((B.config.kohsi && B.config.kohsi.key) || '').trim();
  const base = String(c.contact.kohsi_url || '').trim();
  if (!key || !isUrl(base)) return null;
  return { key, api: new URL(base).origin };
}

// The service a link opens in the booking sheet ('' = she picks), or null
// when the link is not her Kohsi page (an older link field, an anchor).
function kohsiOf(c, href) {
  if (!kohsiEmbed(c) || !isUrl(href)) return null;
  const base = new URL(String(c.contact.kohsi_url).trim());
  const u = new URL(href);
  if (u.origin !== base.origin || u.pathname !== base.pathname) return null;
  return u.searchParams.get('service') || '';
}

function kohsiLink(c, service) {
  const base = String(c.contact.kohsi_url || '').trim();
  if (!isUrl(base)) return '';
  if (!service) return base;
  const u = new URL(base);
  u.searchParams.set('service', service);
  return u.toString();
}

// The two pages HAND added on 2026-11-17 (/services, /faq) go public only
// once Maria signs them off in /admin/ → Setup (site/checklist.mjs). Before
// that they answer at their address (so she can read them) with noindex, and
// nothing on the site links to them.
const signedOff = (c) => Boolean(c.setup && c.setup.signoff_pages);
const NEW_PAGES = ['/services', '/faq'];

const serviceFor = (s) => KOHSI_SERVICES[String(s.name || '').trim().toLowerCase()] || '';

// Online booking is live once the Kohsi page (or any older link) is set.
// Until then the Book blocks say booking is coming soon and point to email
// (koH, 2026-10-06).
function bookingLive(c) {
  if (isUrl(c.contact.kohsi_url) || isUrl(c.contact.booking_url) || isUrl(c.contact.intro_call_url)) return true;
  return Object.values(PAGES).some((d) => (c[d.key].sessions || []).some((s) => isUrl(s.book_url)));
}

// "Booking is coming soon" + the email button, for both Book blocks.
function comingSoon(c, cls) {
  const mail = c.contact.email ? `mailto:${c.contact.email}` : '';
  return `${c.contact.coming_soon ? `<p class="${cls}__body">${e(c.contact.coming_soon)}</p>` : ''}
        ${mail ? `<div class="${cls}__actions"><a class="btn btn--gold" href="${e(mail)}">Email to book</a></div>
        <p class="${cls}__fine"><a href="${e(mail)}">${e(c.contact.email)}</a></p>` : ''}`;
}

// The free intro call: its own link, else Kohsi on intro-call, else the
// general next step.
function introCall(c, cta) {
  const url = String(c.contact.intro_call_url || '').trim() || kohsiLink(c, INTRO_SERVICE);
  if (isUrl(url)) return { href: url, external: true, kohsi: kohsiOf(c, url) };
  return cta;
}

// A session's own link, else Kohsi on that session, else the general next step.
function sessionHref(s, cta, c) {
  if (isUrl(s.book_url)) return { href: s.book_url.trim(), external: true, kohsi: c ? kohsiOf(c, s.book_url.trim()) : null };
  const kohsi = c ? kohsiLink(c, serviceFor(s)) : '';
  return kohsi ? { href: kohsi, external: true, kohsi: kohsiOf(c, kohsi) } : cta;
}

// The lengths a session books at, each with its own way in, or null when it
// books one way (its own link, or a single Kohsi service).
function sessionLengths(s, c) {
  if (!c || isUrl(s.book_url)) return null;
  const lengths = KOHSI_LENGTHS[String(s.name || '').trim().toLowerCase()];
  if (!lengths) return null;
  const out = lengths.map(([key, label]) => {
    const href = kohsiLink(c, key);
    return href ? { label, href, external: true, kohsi: kohsiOf(c, href) } : null;
  });
  return out.every(Boolean) ? out : null;
}

function tags(text) {
  return String(text || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
}

// Media picking: Category first, then a shipped file, then a fallback.
function photoPicker(views) {
  const byCat = (cat) => views.find((m) => String(m.category || '').trim().toLowerCase() === cat);
  const byFile = (file) => {
    const hit = views.find((m) => String(m.original || '').endsWith(`/${file}.jpg`));
    if (hit) return hit;
    const s = STATIC_PHOTOS[file];
    return s ? toView({ id: file, path: `/img/photos/${file}.jpg`, ...s }) : null;
  };
  return (cat, file, fallback = null) => byCat(cat) || (file && byFile(file)) || fallback;
}

function stepsList(steps, cls = 'thread') {
  return `<ol class="${cls}" role="list">
          ${steps
            .map(
              (s, i) => `<li><span class="thread__num" aria-hidden="true">${ROMAN[i] || i + 1}</span><div><h3>${e(s.title)}</h3><p>${e(s.body)}</p></div></li>`
            )
            .join('\n          ')}
        </ol>`;
}

const ICONS = [
  '<path d="M20 34c-8-5-13-10-13-17a7 7 0 0 1 13-3.6A7 7 0 0 1 33 17c0 7-5 12-13 17Z"/><path d="M12 19h5l2-4 3 8 2-4h4"/>',
  '<path d="M6 22c4-6 8-6 12 0s8 6 12 0 4-4 4-4"/><path d="M6 14c4-6 8-6 12 0s8 6 12 0"/><path d="M6 30c4-6 8-6 12 0s8 6 12 0"/>',
  '<path d="M6 19 20 7l14 12"/><path d="M10 16v17h20V16"/><path d="M17 33v-8h6v8"/>',
];

// --- shared chrome ------------------------------------------------------------

function head({ c, featured, origin, route, title, description }) {
  const hold = NEW_PAGES.includes(route) && !signedOff(c) ? '<meta name="robots" content="noindex">\n' : '';
  return `${hold}${B.headTags({ content: c, featured, origin, path: route, title, description })}
${B.jsonLd(c, origin, featured)}`;
}

function header({ c, route, cta, intro }) {
  const home = route === '/';
  const pre = home ? '' : '/';
  const items = [
    { id: 'practices', label: 'Practices', show: Object.values(PAGES).some((d) => c[d.key].title) },
    { id: 'session', label: 'Sessions', show: c.session.steps.length > 0 },
    { id: 'about', label: 'About', show: Boolean(c.meet.heading) },
  ].filter((n) => n.show);
  const pages = signedOff(c)
    ? [
        { href: '/services', label: 'All services' },
        { href: '/faq', label: 'FAQ' },
      ]
    : [];
  const navLinks = [
    ...items.map((n) => `<a href="${pre}#${n.id}">${e(n.label)}</a>`),
    ...pages.map((n) => `<a href="${n.href}"${route === n.href ? ' aria-current="page"' : ''}>${e(n.label)}</a>`),
  ].join('\n      ');
  const book = home || !PAGES[route] ? cta : { ...cta, href: '#sessions', external: false, kohsi: null };
  return `<a class="skip" href="#main">Skip to content</a>

  <header class="site-head">
    <a class="brand" href="${home ? '#top' : '/'}" aria-label="${e(c.brand.name)} — ${home ? 'back to top' : 'home'}">
      ${B.logo()}
      ${WORDMARK}
    </a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav" data-menu>Menu</button>
    <nav class="nav" id="nav" aria-label="Main">
      ${navLinks}
      ${link(intro.href, 'nav__intro', 'Intro call', intro.kohsi)}
      ${link(book.href, 'nav__cta', e(home ? c.hero.cta_primary : 'Book now'), book.kohsi)}
    </nav>
  </header>`;
}

// The maker credit only: no "Owner sign in" link on this site (koH,
// 2026-10-06). Maria opens the editor at /admin/ directly.
function madeBy() {
  const m = B.config.madeBy;
  return m.label ? `<p class="foot__links"><a href="${e(m.href)}" rel="noopener">${e(m.label)}</a></p>` : '';
}

function footer(c, route) {
  return `<footer class="foot">
    <a class="brand brand--foot" href="${route === '/' ? '#top' : '/'}" aria-label="${e(c.brand.name)} — ${route === '/' ? 'back to top' : 'home'}">
      <img class="foot__badge" src="/img/brand/thh-badge-gold.svg" alt="" width="226" height="219" loading="lazy" decoding="async">
    </a>
    ${c.footer.tagline ? `<p class="tagline foot__tag">${e(c.footer.tagline)}</p>` : ''}
    ${c.footer.disclaimer ? `<p class="foot__disc">${e(c.footer.disclaimer)}</p>` : ''}
    ${signedOff(c) ? '<p class="foot__links foot__pages"><a href="/services">All services</a><a href="/faq">FAQ</a></p>' : ''}
    <p class="foot__meta">${e(c.footer.note.replace('{year}', B.year()))}</p>
    ${madeBy()}
  </footer>`;
}

// --- homepage -------------------------------------------------------------------

function teaser(c, route, photo, flip, moreLabel) {
  const def = PAGES[route];
  const p = c[def.key];
  if (!p.title) return '';
  const chips = tags(p.tags);
  return `<article class="teaser${flip ? ' teaser--flip' : ''}" aria-labelledby="t-${def.key}">
          ${arch(photo, { cls: 'teaser__arch', sizes: '(max-width: 860px) 90vw, 360px', pos: def.homePos || def.pos })}
          <div class="teaser__copy">
            <p class="eyebrow"><span class="num">${def.num}</span> · ${e(p.eyebrow)}</p>
            <h3 id="t-${def.key}" class="teaser__title">${e(p.home_heading || p.title)}</h3>
            ${p.tagline ? `<p class="teaser__line">${e(p.tagline)}</p>` : ''}
            ${chips.length ? `<ul class="tags" role="list">${chips.map((t) => `<li>${e(t)}</li>`).join('')}</ul>` : ''}
            <a class="btn btn--gold teaser__more" href="${route}">${e(moreLabel || 'Read more')} <span aria-hidden="true">→</span></a>
          </div>
        </article>`;
}

function renderHome({ c, views, featured, origin, cta, intro, pick }) {
  const rest = views.filter((m) => m !== featured);
  const tel = B.telHref(c.contact.phone);
  const sms = c.contact.sms ? B.smsHref(c.contact.phone) : '';
  const mail = c.contact.email ? `mailto:${c.contact.email}` : '';
  const ig = B.instagramUrl(c.contact.instagram);
  const pathPhoto = pick('path');
  const aboutPhoto = pick('about', 'maria-meadow-smile', rest[0] || featured);
  const bookPhoto = pick('book', 'maria-arch-open-hand', rest[1] || featured);
  const ctaLink = (cls, label) => link(cta.href, cls, e(label || cta.label), cta.kohsi);
  const teasers = Object.keys(PAGES)
    .map((r, i) => teaser(c, r, pick(PAGES[r].category, PAGES[r].homeFile || PAGES[r].file, featured), i % 2 === 1, c.ways.more_label))
    .filter(Boolean);
  const facts = c.meet.facts || [];

  return `<!doctype html>
<html lang="en">
<head>
${head({ c, featured, origin, route: '/' })}
</head>
<body>
  ${header({ c, route: '/', cta, intro })}

  <main id="main">

    <section class="hero" id="top" aria-labelledby="hero-title">
      <div class="hero__stage">
        <p class="tagline hero__eyebrow">${plumb()}${e(c.brand.tagline)}</p>
        <h1 id="hero-title" class="hero__title">
          ${headline(c.hero.headline)}
        </h1>
        ${arch(featured, { cls: 'arch-frame--hero hero__arch', eager: true, glow: true })}
        ${c.hero.lede ? `<p class="hero__lede">${e(c.hero.lede)}</p>` : ''}
        <div class="hero__cta">
          ${ctaLink('btn', c.hero.cta_primary)}
          ${c.hero.cta_secondary ? `<a class="link" href="#practices">${e(c.hero.cta_secondary)}</a>` : ''}
        </div>
      </div>
    </section>

    ${
      c.welcome.heading
        ? `<section class="welcome${pathPhoto ? ' welcome--photo' : ''}" id="alone" aria-labelledby="welcome-title">
      ${pathPhoto ? `<div class="welcome__bg" aria-hidden="true">${B.img(pathPhoto, { sizes: '100vw', alt: '' })}</div>` : ''}
      <div class="welcome__head">
        ${plumb()}
        ${c.welcome.eyebrow ? `<p class="eyebrow">${e(c.welcome.eyebrow)}</p>` : ''}
        <h2 id="welcome-title">${e(c.welcome.heading)}</h2>
      </div>
      ${c.welcome.body ? `<div class="welcome__body prose">${paragraphs(c.welcome.body)}</div>` : ''}
    </section>`
        : ''
    }

    ${
      c.hello.body
        ? `<section class="intro" aria-label="Introduction">
      ${plumb()}
      <p class="intro__text">${c.hello.salute ? `<em class="intro__salute">${e(c.hello.salute)}</em> ` : ''}${e(c.hello.body)}</p>
    </section>`
        : ''
    }

    ${
      teasers.length
        ? `<section class="sec ways" id="practices" aria-labelledby="practices-title">
      <div class="wrap wrap--wide">
        <header class="sec-head">
          ${plumb()}
          ${c.ways.eyebrow ? `<p class="eyebrow">${e(c.ways.eyebrow)}</p>` : ''}
          <h2 id="practices-title">${e(c.ways.heading)}</h2>
        </header>
        ${c.ways.intro ? `<div class="prose measure center">${paragraphs(c.ways.intro)}</div>` : ''}

        <div class="teasers">
        ${teasers.join('\n        ')}
        </div>

        ${c.ways.closing ? `<p class="closing">${e(c.ways.closing)}</p>` : ''}

        ${
          signedOff(c)
            ? `<div class="allrow">
          <a class="btn btn--gold" href="/services">See all services <span aria-hidden="true">→</span></a>
          <a class="btn" href="/faq">Find out more</a>
        </div>`
            : ''
        }

        ${
          c.ways.intro_call_heading
            ? `<aside class="introbar" aria-label="Free intro call">
          <div>
            ${c.ways.intro_call_eyebrow ? `<p class="eyebrow">${e(c.ways.intro_call_eyebrow)}</p>` : ''}
            <h3>${e(c.ways.intro_call_heading)}</h3>
            ${c.ways.intro_call_body ? `<p>${e(c.ways.intro_call_body)}</p>` : ''}
          </div>
          ${link(intro.href, 'btn', e(c.contact.intro_call_label || 'Book an intro call'), intro.kohsi)}
        </aside>`
            : ''
        }
      </div>
    </section>`
        : ''
    }

    ${
      c.session.steps.length
        ? `<section class="sec session" id="session" aria-labelledby="session-title">
      <div class="wrap wrap--wide">
        <header class="sec-head">
          ${plumb()}
          ${c.session.eyebrow ? `<p class="eyebrow">${e(c.session.eyebrow)}</p>` : ''}
          <h2 id="session-title">${e(c.session.heading)}</h2>
          ${c.session.note ? `<p class="sec-head__note">${e(c.session.note)}</p>` : ''}
        </header>
        ${stepsList(c.session.steps)}
      </div>
    </section>`
        : ''
    }

    ${
      c.meet.heading
        ? `<section class="sec meet" id="about" aria-labelledby="about-title">
      <div class="wrap wrap--wide">
        <div class="meet__top">
          <div class="meet__head">
            ${c.meet.eyebrow ? `<p class="eyebrow">${e(c.meet.eyebrow)}</p>` : ''}
            <h2 id="about-title">${e(c.meet.heading)}</h2>
            ${c.meet.quote ? `<p class="meet__quote">“${e(c.meet.quote.replace(/^[“"]|[”"]$/g, ''))}”</p>` : ''}
          </div>
          ${arch(aboutPhoto, { cls: 'meet__arch', sizes: '(max-width: 860px) 90vw, 460px', pos: '40% 30%' })}
        </div>
        <div class="meet__cols prose">
          ${paragraphs(c.meet.body)}
        </div>
        ${
          facts.length
            ? `<dl class="facts">
          ${facts.map((f) => `<div><dt class="eyebrow">${e(f.label)}</dt><dd>${e(f.text)}</dd></div>`).join('\n          ')}
        </dl>`
            : ''
        }
      </div>
    </section>`
        : ''
    }

    <section class="book" id="book" aria-labelledby="book-title">
      <div class="wrap book__inner">
        ${arch(bookPhoto, { cls: 'arch-frame--sm book__arch', sizes: '180px' })}
        ${c.contact.eyebrow ? `<p class="eyebrow book__eyebrow">${e(c.contact.eyebrow)}</p>` : ''}
        <h2 id="book-title">${e(c.contact.heading)}</h2>
        ${!bookingLive(c) && c.contact.coming_soon ? `<p class="book__body">${e(c.contact.coming_soon)}</p>` : c.contact.body ? `<p class="book__body">${e(c.contact.body)}</p>` : ''}
        <div class="book__actions">
          ${cta.kind !== 'anchor' ? ctaLink('btn btn--gold', c.contact.cta_label || cta.label) : ''}
          ${isUrl(c.contact.intro_call_url) ? link(intro.href, 'btn', e(c.contact.intro_call_label || 'Book an intro call'), intro.kohsi) : ''}
          ${cta.kind !== 'call' && tel ? `<a class="btn" href="${e(tel)}">Call ${e(c.contact.phone)}</a>` : ''}
          ${sms ? `<a class="btn" href="${e(sms)}">Text me</a>` : ''}
          ${mail ? `<a class="btn${cta.kind === 'anchor' ? ' btn--gold' : ''}" href="${e(mail)}">${cta.kind === 'anchor' ? 'Email to book' : 'Email'}</a>` : ''}
        </div>
        ${cta.kind === 'call' ? `<p class="book__fine"><a href="${e(tel)}">${e(c.contact.phone)}</a></p>` : ''}
        ${mail ? `<p class="book__fine">${cta.kind === 'anchor' ? '' : 'Questions? '}<a href="${e(mail)}">${e(c.contact.email)}</a></p>` : ''}
        ${c.contact.fine_1 ? `<p class="book__fine">${e(c.contact.fine_1)}</p>` : ''}
        ${c.contact.fine_2 ? `<p class="book__fine">${e(c.contact.fine_2)}</p>` : ''}
        ${ig ? `<p class="book__fine"><a href="${e(ig)}" rel="noopener" target="_blank">Instagram</a></p>` : ''}
      </div>
    </section>

  </main>

  ${footer(c, '/')}

  ${bookSheet(c)}
  ${B.siteScript()}
</body>
</html>`;
}

// --- practice pages ----------------------------------------------------------------

function offer(s, i, cta, c, pre = '') {
  const go = sessionHref(s, cta, c);
  const lengths = sessionLengths(s, c);
  const chips = [s.length, s.where].filter(Boolean);
  const id = `${pre}${i}`;
  return `<article class="offer" aria-labelledby="o-${id}">
            ${chips.length ? `<p class="chips">${chips.map((t) => `<span class="chip">${e(t)}</span>`).join('')}</p>` : ''}
            <h3 id="o-${id}">${e(s.name)}</h3>
            ${s.summary ? `<p class="offer__summary">${e(s.summary)}</p>` : ''}
            ${
              s.details
                ? `<div class="offer__details" id="od-${id}"><p>${e(s.details)}</p></div>
            <button class="offer__toggle" type="button" data-more aria-expanded="false" aria-controls="od-${id}">Read the full description</button>`
                : ''
            }
            <div class="offer__foot">
              ${s.price ? `<span class="price">${e(s.price)}</span>` : '<span></span>'}
              ${
                lengths
                  ? `<span class="offer__books">${lengths.map((l) => link(l.href, 'btn btn--gold btn--sm', `Book ${e(l.label)}`, l.kohsi)).join('')}</span>`
                  : link(go.href, 'btn btn--gold btn--sm', 'Book now', go.kohsi)
              }
            </div>
          </article>`;
}

function renderPractice({ c, route, featured, origin, cta, intro, pick }) {
  const def = PAGES[route];
  const p = c[def.key];
  const photo = pick(def.category, def.file, featured);
  const quotePhoto = pick('quote', 'maria-forest-kimono', null);
  const sessions = p.sessions || [];
  const steps = p.steps && p.steps.length ? p.steps : c.session.steps;
  const introLabel = c.contact.intro_call_label || 'Book an intro call';
  const one = sessions.length === 1 ? sessions[0] : null;
  const oneGo = one ? sessionHref(one, cta, c) : null;
  const prices = sessions.map((s) => s.price).filter(Boolean);

  return `<!doctype html>
<html lang="en">
<head>
${head({ c, featured: photo || featured, origin, route, title: p.seo_title || `${p.title} | ${c.brand.name}`, description: p.seo_description || p.tagline })}
</head>
<body class="practice">
  ${header({ c, route, cta, intro })}

  <main id="main">

    <section class="phero" aria-labelledby="page-title">
      <div class="wrap wrap--wide">
        <a class="back" href="/#practices"><span aria-hidden="true">←</span> All practices</a>
        <div class="phero__grid">
          <div class="phero__copy">
            <p class="eyebrow">${def.num} · ${e(p.eyebrow)}</p>
            <h1 id="page-title">${e(p.title)}</h1>
            ${p.tagline ? `<p class="tagline phero__line">${e(p.tagline)}</p>` : ''}
            <div class="phero__cta">
              ${one ? link(oneGo.href, 'btn btn--gold', 'Book now', oneGo.kohsi) : '<a class="btn btn--gold" href="#sessions">See sessions &amp; book</a>'}
              ${link(intro.href, 'btn', e(introLabel), intro.kohsi)}
            </div>
            ${prices.length === 1 && one ? `<p class="phero__fine">Intro call is free · ${e(one.price)} per session</p>` : '<p class="phero__fine">The intro call is free</p>'}
          </div>
          ${arch(photo, { cls: 'phero__arch', eager: true, sizes: '(max-width: 860px) 80vw, 440px', pos: def.pos })}
        </div>
      </div>
    </section>

    ${
      p.intro
        ? `<section class="pintro" aria-label="About this practice">
      ${plumb()}
      <div class="prose measure center">${paragraphs(p.intro)}</div>
    </section>`
        : ''
    }

    ${
      p.support && p.support.length
        ? `<section class="sec psupport" aria-labelledby="support-title">
      <div class="wrap wrap--wide">
        <header class="sec-head">
          <p class="eyebrow">How it helps</p>
          <h2 id="support-title">${e(p.support_heading || 'How it helps.')}</h2>
        </header>
        <ul class="circles" role="list">
          ${p.support
            .map(
              (s, i) => `<li class="circle"><svg width="34" height="34" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">${ICONS[i % 3]}</svg><h3>${e(s.title)}</h3><p>${e(s.body)}</p></li>`
            )
            .join('\n          ')}
        </ul>
      </div>
    </section>`
        : ''
    }

    ${
      sessions.length > 1
        ? `<section class="sec offers" id="sessions" aria-labelledby="sessions-title">
      <div class="wrap wrap--wide">
        <header class="sec-head">
          <p class="eyebrow">Sessions</p>
          <h2 id="sessions-title">${e(p.sessions_heading || 'Sessions.')}</h2>
        </header>
        <div class="offers__grid">
          ${sessions.map((s, i) => offer(s, i, cta, c)).join('\n          ')}
        </div>
      </div>
    </section>`
        : ''
    }

    ${
      p.quote
        ? `<section class="sec pquote" aria-label="A word from Maria">
      <div class="wrap pquote__grid">
        ${arch(quotePhoto, { cls: 'pquote__arch', sizes: '280px', pos: '18% 35%' })}
        <div>
          <p class="eyebrow">From Maria</p>
          <blockquote><p>“${e(p.quote.replace(/^[“"]|[”"]$/g, ''))}”</p></blockquote>
          <a class="back" href="/#about">Meet Maria <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>`
        : ''
    }

    ${
      steps.length
        ? `<section class="sec psteps" id="how" aria-labelledby="steps-title">
      <div class="wrap wrap--wide">
        <header class="sec-head">
          <p class="eyebrow">What to expect</p>
          <h2 id="steps-title">${e(p.steps_heading || c.session.heading)}</h2>
        </header>
        ${stepsList(steps)}
        ${p.note ? `<p class="pnote">${e(p.note)}</p>` : ''}
      </div>
    </section>`
        : ''
    }

    ${bookingLive(c) ? `    <section class="pbook" id="${sessions.length > 1 ? 'book' : 'sessions'}" aria-labelledby="pbook-title">
      <div class="wrap wrap--wide">
        <header class="sec-head">
          <p class="eyebrow pbook__eyebrow">${e(c.contact.eyebrow || 'Begin where you are')}</p>
          <h2 id="pbook-title">Two ways to start.</h2>
          <p class="pbook__lede">${one ? 'Not sure if this is right for you? Start with a short call. Ready to go? Book and pay in one step.' : 'Not sure which session fits? Start with a short call. Ready to go? Pick a session and pay in one step.'}</p>
        </header>
        <div class="pbook__grid">
          <div class="pcard">
            <p class="eyebrow">Step one, if you like</p>
            <h3>${e(c.contact.intro_call_heading || 'A free intro call')}</h3>
            ${p.intro_call_body ? `<p class="pcard__body">${e(p.intro_call_body)}</p>` : ''}
            ${c.contact.intro_call_meta ? `<p class="pcard__meta">${e(c.contact.intro_call_meta)}</p>` : ''}
            ${link(intro.href, 'btn btn--block', e(introLabel), intro.kohsi)}
          </div>
          <div class="pcard pcard--now">
            <p class="eyebrow">Ready now</p>
            ${
              one
                ? `<h3>${e(one.name)}</h3>
            ${one.summary ? `<p class="pcard__body">${e(one.summary)}</p>` : ''}
            <div class="pcard__price">${one.price ? `<span class="price">${e(one.price)}</span>` : '<span></span>'}<span>${e([one.length, one.where].filter(Boolean).join(' · '))}</span></div>
            ${link(oneGo.href, 'btn btn--gold btn--block', 'Book now', oneGo.kohsi)}`
                : `<h3>Book a session</h3>
            <ul class="menu" role="list">
              ${sessions
                .map((s) => {
                  const lengths = sessionLengths(s, c);
                  if (lengths) {
                    return lengths
                      .map((l) => `<li>${link(l.href, '', `<span>${e(s.name)}</span><span class="menu__meta">${e([s.price, l.label].filter(Boolean).join(' · '))}</span>`, l.kohsi)}</li>`)
                      .join('\n              ');
                  }
                  const go = sessionHref(s, cta, c);
                  const meta = [s.price, s.length].filter(Boolean).join(' · ');
                  return `<li>${link(go.href, '', `<span>${e(s.name)}</span>${meta ? `<span class="menu__meta">${e(meta)}</span>` : '<span class="menu__meta" aria-hidden="true">→</span>'}`, go.kohsi)}</li>`;
                })
                .join('\n              ')}
            </ul>`
            }
            ${(one ? oneGo : cta).external ? `<p class="pcard__lock"><svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="1" y="6" width="10" height="7"/><path d="M3 6V4a3 3 0 0 1 6 0v2"/></svg>Secure booking and payment</p>` : ''}
          </div>
        </div>
        ${c.contact.cancellation ? `<p class="pbook__fine">${e(c.contact.cancellation)}</p>` : ''}
        ${c.contact.email ? `<p class="pbook__fine">Questions? <a href="mailto:${e(c.contact.email)}">${e(c.contact.email)}</a></p>` : ''}
      </div>
    </section>` : `<section class="pbook" id="${sessions.length > 1 ? 'book' : 'sessions'}" aria-labelledby="pbook-title">
      <div class="wrap wrap--wide">
        <header class="sec-head">
          <p class="eyebrow pbook__eyebrow">${e(c.contact.eyebrow || 'Begin where you are')}</p>
          <h2 id="pbook-title">Book by email for now.</h2>
        </header>
        <div class="pcard pcard--now pcard--soon">
          ${one ? `<h3>${e(one.name)}</h3>
          <div class="pcard__price">${one.price ? `<span class="price">${e(one.price)}</span>` : '<span></span>'}<span>${e([one.length, one.where].filter(Boolean).join(' · '))}</span></div>` : ''}
          ${comingSoon(c, 'pcard')}
        </div>
      </div>
    </section>`}

  </main>

  ${footer(c, route)}

  <nav class="stickybar" aria-label="Book">
    ${link(intro.href, 'btn', 'Intro call', intro.kohsi)}
    ${one ? link(oneGo.href, 'btn btn--gold', 'Book now', oneGo.kohsi) : '<a class="btn btn--gold" href="#sessions">Book now</a>'}
  </nav>

  ${bookSheet(c)}
  ${B.siteScript()}
</body>
</html>`;
}

// --- all services + questions ------------------------------------------------------

// The plain page top shared by /services and /faq: no photo, a way home.
function plainHero({ eyebrow, title, line, actions }) {
  return `<section class="phero phero--plain" aria-labelledby="page-title">
      <div class="wrap wrap--wide">
        <a class="back" href="/"><span aria-hidden="true">←</span> Home</a>
        <div class="phero__copy">
          ${eyebrow ? `<p class="eyebrow">${e(eyebrow)}</p>` : ''}
          <h1 id="page-title">${e(title)}</h1>
          ${line ? `<p class="tagline phero__line">${e(line)}</p>` : ''}
          <div class="phero__cta">${actions}</div>
        </div>
      </div>
    </section>`;
}

// The closing band on both pages: the intro call, plus one more door.
function askBand(c, intro, { heading, lede, other }) {
  const introLabel = c.contact.intro_call_label || 'Book an intro call';
  return `<section class="pbook askband" aria-labelledby="ask-title">
      <div class="wrap wrap--wide">
        <header class="sec-head">
          <p class="eyebrow pbook__eyebrow">${e(c.ways.intro_call_eyebrow || 'Not sure where to start?')}</p>
          <h2 id="ask-title">${e(heading)}</h2>
          <p class="pbook__lede">${e(lede)}</p>
        </header>
        <div class="askband__actions">
          ${link(intro.href, 'btn btn--gold', e(introLabel), intro.kohsi)}
          ${other}
        </div>
        ${c.contact.email ? `<p class="pbook__fine">Or write to me: <a href="mailto:${e(c.contact.email)}">${e(c.contact.email)}</a></p>` : ''}
      </div>
    </section>`;
}

function stickybar(intro, book) {
  return `<nav class="stickybar" aria-label="Book">
    ${link(intro.href, 'btn', 'Intro call', intro.kohsi)}
    ${link(book.href, 'btn btn--gold', 'Book now', book.kohsi)}
  </nav>`;
}

function renderServices({ c, featured, origin, cta, intro }) {
  const groups = Object.entries(PAGES)
    .map(([route, def]) => ({ route, def, p: c[def.key] }))
    .filter((g) => g.p.title && (g.p.sessions || []).length);
  const count = groups.reduce((n, g) => n + g.p.sessions.length, 0);

  return `<!doctype html>
<html lang="en">
<head>
${head({ c, featured, origin, route: '/services', title: `All services | ${c.brand.name}`, description: `Every session with Maria at ${c.brand.name} in one place: ${groups.map((g) => g.p.sessions.map((s) => s.name).join(', ')).join(', ')}.`.slice(0, 300) })}
</head>
<body class="practice">
  ${header({ c, route: '/services', cta, intro })}

  <main id="main">

    ${plainHero({
      eyebrow: `${count} sessions`,
      title: 'All services.',
      line: 'Every session I offer, in one place. Book the one that calls to you, or read more about each practice first.',
      actions: `<a class="btn btn--gold" href="#${groups[0] ? groups[0].def.key : 'main'}">See the sessions</a>
              <a class="btn" href="/faq">Find out more</a>`,
    })}

    ${groups
      .map(
        ({ route, def, p }) => `<section class="sec offers svcgroup" id="${def.key}" aria-labelledby="g-${def.key}">
      <div class="wrap wrap--wide">
        <header class="sec-head">
          <p class="eyebrow"><span class="num">${def.num}</span> · ${e(p.eyebrow)}</p>
          <h2 id="g-${def.key}">${e(p.home_heading || p.title)}</h2>
          ${p.tagline ? `<p class="sec-head__note">${e(p.tagline)}</p>` : ''}
          <a class="back svcgroup__more" href="${route}">More about this practice <span aria-hidden="true">→</span></a>
        </header>
        <div class="offers__grid${p.sessions.length === 1 ? ' offers__grid--one' : ''}">
          ${p.sessions.map((s, i) => offer(s, i, cta, c, `${def.key}-`)).join('\n          ')}
        </div>
        ${p.note ? `<p class="pnote">${e(p.note)}</p>` : ''}
      </div>
    </section>`
      )
      .join('\n\n    ')}

    ${askBand(c, intro, {
      heading: 'Questions before you book?',
      lede: 'How sessions work, online or in person, how long they take, and how booking works.',
      other: '<a class="btn" href="/faq">Find out more</a>',
    })}

  </main>

  ${footer(c, '/services')}

  ${stickybar(intro, cta)}

  ${bookSheet(c)}
  ${B.siteScript()}
</body>
</html>`;
}

function faqLd(items) {
  if (!items.length) return '';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: String(f.a).replace(/\s*\n+\s*/g, ' ') } })),
  };
  return `<script type="application/ld+json">${B.jsonForScript(data)}</script>`;
}

function renderFaq({ c, featured, origin, cta, intro }) {
  const f = c.faq;
  const items = (f.items || []).filter((x) => x.q && x.a);

  return `<!doctype html>
<html lang="en">
<head>
${head({ c, featured, origin, route: '/faq', title: f.seo_title || `${f.title} | ${c.brand.name}`, description: f.seo_description || f.intro })}
${faqLd(items)}
</head>
<body class="practice">
  ${header({ c, route: '/faq', cta, intro })}

  <main id="main">

    ${plainHero({
      eyebrow: f.eyebrow,
      title: f.title || 'Questions.',
      line: f.intro,
      actions: `<a class="btn" href="/services">See all services</a>`,
    })}

    ${
      items.length
        ? `<section class="sec faq" aria-label="Questions and answers">
      <div class="wrap faq__list">
        ${items
          .map(
            (x, i) => `<details class="faq__item"${i === 0 ? ' open' : ''}>
          <summary><h2 class="faq__q">${e(x.q)}</h2></summary>
          <div class="faq__a prose">${paragraphs(x.a)}</div>
        </details>`
          )
          .join('\n        ')}
      </div>
    </section>`
        : ''
    }

    ${askBand(c, intro, {
      heading: 'Still have a question?',
      lede: 'The free intro call is the easiest way to ask. Fifteen minutes, by phone or video.',
      other: '<a class="btn" href="/services">See all services</a>',
    })}

  </main>

  ${footer(c, '/faq')}

  ${stickybar(intro, cta)}

  ${bookSheet(c)}
  ${B.siteScript()}
</body>
</html>`;
}

// --- entry ------------------------------------------------------------------------

export function renderPage({ content, media, origin = '', route = '/' }) {
  const c = content;
  const views = media.map(toView);
  const featured = views.find((m) => m.featured) || views[0] || null;
  // Book buttons never open email (koH, 2026-10-06): booking link → phone →
  // the Book block. The email is shown inside the Book block instead.
  const booking = String(c.contact.booking_url || '').trim() || kohsiLink(c, '');
  const base = B.primaryCta({ ...c, contact: { ...c.contact, booking_url: booking, email: '' } }, { anchor: route === '/' ? '#book' : '/#book' });
  const cta = { ...base, kohsi: kohsiOf(c, base.href) };
  const intro = introCall(c, cta);
  const pick = photoPicker(views);
  if (PAGES[route]) return renderPractice({ c, route, featured, origin, cta, intro, pick });
  if (route === '/services') return renderServices({ c, featured, origin, cta, intro });
  if (route === '/faq') return renderFaq({ c, featured, origin, cta, intro });
  return renderHome({ c, views, featured, origin, cta, intro, pick });
}
