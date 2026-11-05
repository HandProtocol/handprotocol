// Page renderer for THIS site: (content, media, origin) → full HTML.
//
// This is the generic immersive single-page layout: loader, hero with the
// featured image, marquee, gallery, about, services, process, testimonials,
// book, footer, sticky mobile action bar. Every section hides itself when
// its content is empty, and the nav only links to sections that exist.
//
// Owner text is escaped with e(). Effects live in public/assets/site.js and
// hook onto the class names + ids used here; the theme is injected by
// blocks.headTags() from site.config.mjs.
//
// For a bespoke design, replace this file (keep the export signature) and
// compose from blocks.mjs — see the hand-client-site skill's
// reference/porting-a-design.md.

import * as B from '../netlify/functions/lib/blocks.mjs';
import { toView } from '../netlify/functions/lib/content.mjs';

const { e, paragraphs } = B;

function tile(m, i) {
  const cap = m.caption ? `<span class="tile__caption">${e(m.caption)}</span>` : '';
  const cat = m.category ? `<span class="tile__cat">${e(m.category)}</span>` : '';
  return `<figure class="tile reveal" data-cat="${e(m.category)}" data-i="${i}" style="--w:${m.width};--h:${m.height};--d:${(i % 6) * 60}ms">
  <button class="tile__btn" type="button" aria-label="Open image${m.alt ? `: ${e(m.alt)}` : ''}" data-lightbox="${i}">
    ${B.img(m, { sizes: '(min-width: 1100px) 33vw, (min-width: 640px) 50vw, 100vw' })}
    <span class="tile__shade" aria-hidden="true"></span>
  </button>
  ${cap || cat ? `<figcaption class="tile__meta">${cat}${cap}</figcaption>` : ''}
</figure>`;
}

function chips(categories) {
  if (categories.length < 2) return '';
  const all = `<button class="chip is-active" type="button" data-filter="*" aria-pressed="true">All</button>`;
  const rest = categories
    .map((c) => `<button class="chip" type="button" data-filter="${e(c)}" aria-pressed="false">${e(c)}</button>`)
    .join('');
  return `<div class="chips reveal" role="group" aria-label="Filter the gallery">${all}${rest}</div>`;
}

function serviceCards(items) {
  return items
    .map(
      (s, i) => `<article class="card reveal" style="--d:${i * 80}ms" data-glow>
  <span class="card__n">${String(i + 1).padStart(2, '0')}</span>
  <h3 class="card__title">${e(s.title)}</h3>
  ${paragraphs(s.description, 'card__body')}
  ${s.price ? `<span class="card__price">${e(s.price)}</span>` : ''}
</article>`
    )
    .join('');
}

function steps(items) {
  return items
    .map(
      (s, i) => `<li class="step reveal" style="--d:${i * 120}ms">
  <span class="step__n" aria-hidden="true">${i + 1}</span>
  <div class="step__body"><h3>${e(s.title)}</h3>${paragraphs(s.body)}</div>
</li>`
    )
    .join('');
}

function quotes(items) {
  return items
    .map(
      (q, i) => `<blockquote class="quote reveal" style="--d:${i * 90}ms">
  <span class="quote__mark" aria-hidden="true">“</span>
  <p>${e(q.quote)}</p>
  <footer><strong>${e(q.name)}</strong>${q.role ? `<span>${e(q.role)}</span>` : ''}</footer>
</blockquote>`
    )
    .join('');
}

function marquee(c, cta) {
  const items = [...c.services.items.map((s) => s.title), cta.label, c.brand.tagline].filter(Boolean);
  if (items.length < 2) return '';
  const run = items.map((t) => `<span>${e(t)}</span><i aria-hidden="true">✦</i>`).join('');
  return `<div class="marquee" aria-hidden="true"><div class="marquee__track">${run}${run}</div></div>`;
}

function navLinks(nav) {
  return nav.map((n) => `<a href="#${e(n.id)}">${e(n.label)}</a>`).join('');
}

export function renderPage({ content, media, origin = '' }) {
  const c = content;
  const views = media.map(toView);
  const featured = views.find((m) => m.featured) || views[0] || null;
  const cta = B.primaryCta(c, { anchor: '#book' });
  const tel = B.telHref(c.contact.phone);
  const sms = c.contact.sms ? B.smsHref(c.contact.phone) : '';
  const mail = c.contact.email ? `mailto:${c.contact.email}` : '';
  const ig = B.instagramUrl(c.contact.instagram);
  const categories = [...new Set(views.map((m) => m.category).filter(Boolean))];
  const aboutImgs = views.slice(1, 3).length ? views.slice(1, 3) : views.slice(0, 2);
  const L = B.config.labels;

  const has = {
    work: views.length > 0,
    about: Boolean(c.about.heading || c.about.body),
    services: c.services.items.length > 0,
    process: c.process.steps.length > 0,
    quotes: c.testimonials.items.length > 0,
    book: true,
  };
  const nav = B.config.nav.filter((n) => has[n.id] !== false);
  let n = 0;
  const num = () => String(++n).padStart(2, '0');

  const bookCta = B.ctaButton({ ...cta, label: c.contact.cta_label || cta.label }, 'btn--lg');
  const bookExtras = [
    cta.kind !== 'call' && tel ? `<a class="btn btn--ghost btn--lg" href="${e(tel)}" data-magnetic>${B.ICONS.phone}<span>Call</span></a>` : '',
    sms ? `<a class="btn btn--ghost btn--lg" href="${e(sms)}" data-magnetic>${B.ICONS.message}<span>Text us</span></a>` : '',
    cta.kind !== 'email' && mail ? `<a class="btn btn--ghost btn--lg" href="${e(mail)}" data-magnetic>${B.ICONS.mail}<span>Email</span></a>` : '',
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
${B.headTags({ content: c, featured, origin })}
${B.jsonLd(c, origin, featured)}
</head>
<body class="is-loading">
<div class="loader" id="loader" aria-hidden="true">
  <div class="loader__inner">
    <span class="loader__word">${e(c.brand.name.toUpperCase())}</span>
    <span class="loader__line"><i></i></span>
  </div>
</div>
<div class="cursor" id="cursor" aria-hidden="true"><i class="cursor__dot"></i><i class="cursor__ring"></i></div>
<div class="progress" id="progress" aria-hidden="true"></div>
<a class="skip" href="#main">Skip to content</a>

<header class="nav" id="nav">
  <a class="nav__brand" href="#top" aria-label="${e(c.brand.name)} — home">${B.logo()}<span>${e(c.brand.name)}</span></a>
  <nav class="nav__links" aria-label="Sections">${navLinks(nav)}</nav>
  ${B.ctaButton(cta, 'btn--sm nav__cta')}
  <button class="nav__toggle" id="navtoggle" type="button" aria-expanded="false" aria-controls="menu"><span></span><span></span><span class="sr">Menu</span></button>
</header>
<div class="menu" id="menu" hidden>
  <nav aria-label="Sections">${navLinks(nav)}</nav>
  ${B.ctaButton(cta, 'btn--lg')}
</div>

<main id="main">
<section class="hero" id="top">
  <div class="hero__media" data-parallax>
    ${featured ? B.img(featured, { cls: 'hero__img', sizes: '100vw', eager: true, alt: '' }) : ''}
    <div class="hero__veil" aria-hidden="true"></div>
    <div class="aurora" aria-hidden="true"><i class="aurora__b aurora__b--1"></i><i class="aurora__b aurora__b--2"></i><i class="aurora__b aurora__b--3"></i></div>
    <div class="spot" id="spot" aria-hidden="true"></div>
  </div>
  <div class="wrap hero__inner">
    ${c.hero.eyebrow ? `<p class="eyebrow hero__eyebrow">${e(c.hero.eyebrow)}</p>` : ''}
    <h1 class="hero__title">${B.words(c.hero.headline)}</h1>
    ${c.hero.subhead ? `<p class="hero__sub">${e(c.hero.subhead)}</p>` : ''}
    <div class="hero__cta">
      ${B.ctaButton(cta, 'btn--lg')}
      ${c.hero.cta_secondary && has.work ? `<a class="btn btn--ghost btn--lg" href="#work" data-magnetic><span>${e(c.hero.cta_secondary)}</span>${B.ICONS.arrow}</a>` : ''}
    </div>
  </div>
  ${
    c.about.stats.length
      ? `<ul class="hero__stats wrap">${c.about.stats
          .map((s) => `<li><strong data-count>${e(s.value)}</strong><span>${e(s.label)}</span></li>`)
          .join('')}</ul>`
      : ''
  }
</section>

${marquee(c, cta)}

${
  has.work
    ? `<section class="section work" id="work">
  <div class="wrap">
    <header class="section__head reveal">
      <p class="eyebrow">${num()} — ${e(L.work || 'Work')}</p>
      <h2>${e(c.work.heading)}</h2>
      ${c.work.subhead ? `<p class="lede">${e(c.work.subhead)}</p>` : ''}
    </header>
    ${chips(categories)}
    <div class="gallery" id="gallery">
      ${views.map(tile).join('\n')}
    </div>
  </div>
</section>`
    : ''
}

${
  has.about
    ? `<section class="section about" id="about">
  <div class="wrap about__inner">
    <div class="about__text reveal">
      <p class="eyebrow">${num()} — ${e(L.about || 'About')}</p>
      <h2>${e(c.about.heading)}</h2>
      ${paragraphs(c.about.body, 'lede')}
      ${B.ctaButton(cta, 'btn--lg about__cta')}
    </div>
    <div class="about__art" data-parallax-group>
      ${aboutImgs
        .map(
          (m, i) =>
            `<figure class="about__img about__img--${i + 1} reveal" style="--d:${i * 150}ms" data-parallax-item="${i ? '-0.08' : '0.06'}">${B.img(m, { sizes: '(min-width: 900px) 30vw, 60vw' })}</figure>`
        )
        .join('')}
      <span class="about__ring" aria-hidden="true"></span>
    </div>
  </div>
</section>`
    : ''
}

${
  has.services
    ? `<section class="section services" id="services">
  <div class="wrap">
    <header class="section__head reveal">
      <p class="eyebrow">${num()} — ${e(L.services || 'Services')}</p>
      <h2>${e(c.services.heading)}</h2>
      ${c.services.subhead ? `<p class="lede">${e(c.services.subhead)}</p>` : ''}
    </header>
    <div class="cards">${serviceCards(c.services.items)}</div>
  </div>
</section>`
    : ''
}

${
  has.process
    ? `<section class="section process" id="process">
  <div class="wrap process__inner">
    <header class="section__head reveal">
      <p class="eyebrow">${num()} — ${e(L.process || 'Process')}</p>
      <h2>${e(c.process.heading)}</h2>
    </header>
    <ol class="steps" id="steps"><span class="steps__line" aria-hidden="true"><i></i></span>${steps(c.process.steps)}</ol>
  </div>
</section>`
    : ''
}

${
  has.quotes
    ? `<section class="section quotes" id="quotes">
  <div class="wrap">
    <header class="section__head reveal"><p class="eyebrow">${e(L.quotes || 'Kind words')}</p><h2>${e(c.testimonials.heading)}</h2></header>
  </div>
  <div class="quotes__rail" tabindex="0" aria-label="Testimonials"><div class="wrap quotes__track">${quotes(c.testimonials.items)}</div></div>
</section>`
    : ''
}

<section class="section book" id="book">
  <div class="aurora aurora--book" aria-hidden="true"><i class="aurora__b aurora__b--1"></i><i class="aurora__b aurora__b--2"></i></div>
  <div class="wrap book__inner">
    <p class="eyebrow reveal">${num()} — ${e(L.book || 'Book')}</p>
    <h2 class="reveal">${e(c.contact.heading)}</h2>
    ${c.contact.body ? `<p class="lede reveal">${e(c.contact.body)}</p>` : ''}
    ${tel ? `<a class="book__phone reveal" href="${e(tel)}">${e(c.contact.phone)}</a>` : ''}
    <div class="book__cta reveal">${bookCta}${bookExtras}</div>
    <dl class="book__meta reveal">
      ${c.contact.hours ? `<div><dt>Hours</dt><dd>${e(c.contact.hours)}</dd></div>` : ''}
      ${c.contact.location ? `<div><dt>Location</dt><dd>${e(c.contact.location)}</dd></div>` : ''}
      ${ig ? `<div><dt>Instagram</dt><dd><a href="${e(ig)}" rel="noopener" target="_blank">${e(c.contact.instagram.startsWith('@') ? c.contact.instagram : `@${c.contact.instagram}`)}</a></dd></div>` : ''}
      ${c.contact.email ? `<div><dt>Email</dt><dd><a href="${e(mail)}">${e(c.contact.email)}</a></dd></div>` : ''}
    </dl>
    ${B.config.booking && B.config.booking.mode === 'request' ? `<div class="book__form reveal">${B.bookingBlock({ content: c })}</div>` : ''}
  </div>
</section>
</main>

<footer class="foot">
  <div class="wrap foot__inner">
    <a class="foot__brand" href="#top">${B.logo()}<span>${e(c.brand.name)}</span></a>
    <p class="foot__note">${e(c.footer.note.replace('{year}', B.year()))}</p>
    ${B.footerLinks()}
  </div>
</footer>

${B.callbarHtml(cta)}
${has.work ? B.lightboxHtml() : ''}
${B.mediaJson(views)}
${B.siteScript()}
</body>
</html>`;
}
