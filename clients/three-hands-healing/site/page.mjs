// Three Hands Healing — the Cathedral design, rendered from the owner's
// content. Four routes: "/" (homepage) and one page per practice area
// (/body, /mind, /pets). Every string is a schema field (site/schema.mjs).
//
// Photos are picked by Category in /admin/ Media (Featured = hero arch):
//   Path  → behind the Welcome heading (none = a teal glow, no photo)
//   About → Meet Maria          Book  → the small arch in the Book block
//   Body / Mind / Pets → that practice's page and its homepage block
//   Quote → beside the quote on a practice page
// With no photo in a category, a sensible shipped photo is used instead.
//
// Booking (2026-10-05): Calendly. contact.booking_url = the main Calendly
// page, contact.intro_call_url = the free intro-call event, and each session
// may carry its own book_url (a Calendly event with Stripe payment on).

import * as B from '../netlify/functions/lib/blocks.mjs';
import { toView } from '../netlify/functions/lib/content.mjs';
import { WORDMARK } from './brand.mjs';

const { e, paragraphs } = B;
const ARCH_SIZES = '(max-width: 860px) min(240px, 62vw), 340px';
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export const ROUTES = ['/body', '/mind', '/pets'];

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

function link(href, cls, label, external) {
  return `<a class="${cls}" href="${e(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
}

const isUrl = (u) => /^https?:\/\//i.test(String(u || '').trim());

// Online booking is live once any Calendly link is set. Until then the Book
// blocks say booking is coming soon and point to email (koH, 2026-10-06).
function bookingLive(c) {
  if (isUrl(c.contact.booking_url) || isUrl(c.contact.intro_call_url)) return true;
  return Object.values(PAGES).some((d) => (c[d.key].sessions || []).some((s) => isUrl(s.book_url)));
}

// "Booking is coming soon" + the email button, for both Book blocks.
function comingSoon(c, cls) {
  const mail = c.contact.email ? `mailto:${c.contact.email}` : '';
  return `${c.contact.coming_soon ? `<p class="${cls}__body">${e(c.contact.coming_soon)}</p>` : ''}
        ${mail ? `<div class="${cls}__actions"><a class="btn btn--gold" href="${e(mail)}">Email to book</a></div>
        <p class="${cls}__fine"><a href="${e(mail)}">${e(c.contact.email)}</a></p>` : ''}`;
}

// The free intro call: its own Calendly event, else the general next step.
function introCall(c, cta) {
  const url = String(c.contact.intro_call_url || '').trim();
  if (isUrl(url)) return { href: url, external: true };
  return { href: cta.href, external: cta.external };
}

// A session's own Calendly link, else the general next step.
function sessionHref(s, cta) {
  return isUrl(s.book_url) ? { href: s.book_url.trim(), external: true } : { href: cta.href, external: cta.external };
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
  return `${B.headTags({ content: c, featured, origin, path: route, title, description })}
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
  const navLinks = items.map((n) => `<a href="${pre}#${n.id}">${e(n.label)}</a>`).join('\n      ');
  const book = home ? cta : { ...cta, href: '#sessions', external: false };
  return `<a class="skip" href="#main">Skip to content</a>

  <header class="site-head">
    <a class="brand" href="${home ? '#top' : '/'}" aria-label="${e(c.brand.name)} — ${home ? 'back to top' : 'home'}">
      ${B.logo()}
      ${WORDMARK}
    </a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav" data-menu>Menu</button>
    <nav class="nav" id="nav" aria-label="Main">
      ${navLinks}
      ${link(intro.href, 'nav__intro', 'Intro call', intro.external)}
      ${link(book.href, 'nav__cta', e(home ? c.hero.cta_primary : 'Book now'), book.external)}
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
  const ctaLink = (cls, label) => link(cta.href, cls, e(label || cta.label), cta.external);
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
          c.ways.intro_call_heading
            ? `<aside class="introbar" aria-label="Free intro call">
          <div>
            ${c.ways.intro_call_eyebrow ? `<p class="eyebrow">${e(c.ways.intro_call_eyebrow)}</p>` : ''}
            <h3>${e(c.ways.intro_call_heading)}</h3>
            ${c.ways.intro_call_body ? `<p>${e(c.ways.intro_call_body)}</p>` : ''}
          </div>
          ${link(intro.href, 'btn', e(c.contact.intro_call_label || 'Book an intro call'), intro.external)}
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
          ${isUrl(c.contact.intro_call_url) ? link(intro.href, 'btn', e(c.contact.intro_call_label || 'Book an intro call'), true) : ''}
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

  ${B.siteScript()}
</body>
</html>`;
}

// --- practice pages ----------------------------------------------------------------

function offer(s, i, cta) {
  const go = sessionHref(s, cta);
  const chips = [s.length, s.where].filter(Boolean);
  return `<article class="offer" aria-labelledby="o-${i}">
            ${chips.length ? `<p class="chips">${chips.map((t) => `<span class="chip">${e(t)}</span>`).join('')}</p>` : ''}
            <h3 id="o-${i}">${e(s.name)}</h3>
            ${s.summary ? `<p class="offer__summary">${e(s.summary)}</p>` : ''}
            ${
              s.details
                ? `<div class="offer__details" id="od-${i}"><p>${e(s.details)}</p></div>
            <button class="offer__toggle" type="button" data-more aria-expanded="false" aria-controls="od-${i}">Read the full description</button>`
                : ''
            }
            <div class="offer__foot">
              ${s.price ? `<span class="price">${e(s.price)}</span>` : '<span></span>'}
              ${link(go.href, 'btn btn--gold btn--sm', 'Book now', go.external)}
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
  const oneGo = one ? sessionHref(one, cta) : null;
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
              ${one ? link(oneGo.href, 'btn btn--gold', 'Book now', oneGo.external) : '<a class="btn btn--gold" href="#sessions">See sessions &amp; book</a>'}
              ${link(intro.href, 'btn', e(introLabel), intro.external)}
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
          ${sessions.map((s, i) => offer(s, i, cta)).join('\n          ')}
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
            ${link(intro.href, 'btn btn--block', e(introLabel), intro.external)}
          </div>
          <div class="pcard pcard--now">
            <p class="eyebrow">Ready now</p>
            ${
              one
                ? `<h3>${e(one.name)}</h3>
            ${one.summary ? `<p class="pcard__body">${e(one.summary)}</p>` : ''}
            <div class="pcard__price">${one.price ? `<span class="price">${e(one.price)}</span>` : '<span></span>'}<span>${e([one.length, one.where].filter(Boolean).join(' · '))}</span></div>
            ${link(oneGo.href, 'btn btn--gold btn--block', 'Book now', oneGo.external)}`
                : `<h3>Book a session</h3>
            <ul class="menu" role="list">
              ${sessions
                .map((s) => {
                  const go = sessionHref(s, cta);
                  const meta = [s.price, s.length].filter(Boolean).join(' · ');
                  return `<li>${link(go.href, '', `<span>${e(s.name)}</span>${meta ? `<span class="menu__meta">${e(meta)}</span>` : '<span class="menu__meta" aria-hidden="true">→</span>'}`, go.external)}</li>`;
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
    ${link(intro.href, 'btn', 'Intro call', intro.external)}
    ${one ? link(oneGo.href, 'btn btn--gold', 'Book now', oneGo.external) : '<a class="btn btn--gold" href="#sessions">Book now</a>'}
  </nav>

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
  const cta = B.primaryCta({ ...c, contact: { ...c.contact, email: '' } }, { anchor: route === '/' ? '#book' : '/#book' });
  const intro = introCall(c, cta);
  const pick = photoPicker(views);
  if (PAGES[route]) return renderPractice({ c, route, featured, origin, cta, intro, pick });
  return renderHome({ c, views, featured, origin, cta, intro, pick });
}
