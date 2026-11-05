// Server-side renderer: (content, media) → the full home page HTML.
// Everything user-editable is escaped here. Effects live in /assets/site.js.

import { e, instagramUrl, jsonForScript, paragraphs, smsHref, telHref } from './html.mjs';
import { toView } from './content.mjs';

export const ASSET_VERSION = '20260905c';

const ICON_PHONE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z"/></svg>';
const ICON_ARROW =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v14m0 0-6-6m6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_MSG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const ICON_MAIL =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3z M3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const LOGO =
  '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 5.5 22.5 16 16 26.5 9.5 16Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>';

function words(text, cls) {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => `<span class="${cls}" style="--i:${i}"><span>${e(w)}</span></span>`)
    .join(' ');
}

function heroImage(featured) {
  if (!featured) return '';
  const srcset = featured.srcset ? ` srcset="${e(featured.srcset)}" sizes="100vw"` : '';
  return `<img class="hero__img" src="${e(featured.full)}"${srcset} alt="" width="${featured.width}" height="${featured.height}" fetchpriority="high" decoding="async">`;
}

function tile(m, i) {
  const srcset = m.srcset ? ` srcset="${e(m.srcset)}" sizes="(min-width: 1100px) 33vw, (min-width: 640px) 50vw, 100vw"` : '';
  const cap = m.caption ? `<span class="tile__caption">${e(m.caption)}</span>` : '';
  const cat = m.category ? `<span class="tile__cat">${e(m.category)}</span>` : '';
  return `<figure class="tile reveal" data-cat="${e(m.category)}" data-i="${i}" style="--w:${m.width};--h:${m.height};--d:${(i % 6) * 60}ms">
  <button class="tile__btn" type="button" aria-label="Open image${m.alt ? `: ${e(m.alt)}` : ''}" data-lightbox="${i}">
    <img src="${e(m.src)}"${srcset} alt="${e(m.alt)}" width="${m.width}" height="${m.height}" loading="lazy" decoding="async">
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

function marquee(content) {
  const items = [
    ...content.services.items.map((s) => s.title),
    content.hero.cta_primary,
    content.brand.tagline,
  ].filter(Boolean);
  const run = items.map((t) => `<span>${e(t)}</span><i aria-hidden="true">✦</i>`).join('');
  return `<div class="marquee" aria-hidden="true"><div class="marquee__track">${run}${run}</div></div>`;
}

function jsonLd(content, origin, featured) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: content.brand.name,
    description: content.seo.description,
    url: `${origin}/`,
    telephone: content.contact.phone,
    email: content.contact.email,
    image: featured ? new URL(featured.full, origin).href : undefined,
    sameAs: instagramUrl(content.contact.instagram) || undefined,
  };
  return `<script type="application/ld+json">${jsonForScript(data)}</script>`;
}

export function renderPage({ content, media, origin = '' }) {
  const views = media.map(toView);
  const featured = views.find((m) => m.featured) || views[0] || null;
  const year = String(new Date().getFullYear());
  const c = content;
  const tel = telHref(c.contact.phone);
  const sms = c.contact.sms ? smsHref(c.contact.phone) : '';
  const mail = c.contact.email ? `mailto:${c.contact.email}` : '';
  const ig = instagramUrl(c.contact.instagram);
  const title = c.seo.title || c.brand.name;
  const categories = [...new Set(views.map((m) => m.category).filter(Boolean))];
  const ogImage = featured ? new URL(featured.full, origin || 'https://zeroblur.netlify.app').href : '';
  const lightboxData = views.map((m) => ({ src: m.full, alt: m.alt, caption: m.caption, category: m.category }));
  const aboutImgs = views.slice(1, 3).length ? views.slice(1, 3) : views.slice(0, 2);
  const callBtn = (label, cls = '') =>
    tel ? `<a class="btn btn--primary ${cls}" href="${e(tel)}" data-magnetic>${ICON_PHONE}<span>${e(label)}</span></a>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(c.seo.description)}">
${origin ? `<link rel="canonical" href="${e(origin)}/">` : ''}
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(c.seo.description)}">
<meta property="og:type" content="website">
${origin ? `<meta property="og:url" content="${e(origin)}/">` : ''}
${ogImage ? `<meta property="og:image" content="${e(ogImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#07060b">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=${ASSET_VERSION}">
${jsonLd(c, origin, featured)}
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
  <a class="nav__brand" href="#top" aria-label="${e(c.brand.name)} — home">${LOGO}<span>${e(c.brand.name)}</span></a>
  <nav class="nav__links" aria-label="Sections">
    <a href="#work">Work</a><a href="#services">Services</a><a href="#process">Process</a><a href="#book">Book</a>
  </nav>
  ${callBtn(c.hero.cta_primary, 'btn--sm nav__cta')}
  <button class="nav__toggle" id="navtoggle" type="button" aria-expanded="false" aria-controls="menu"><span></span><span></span><span class="sr">Menu</span></button>
</header>
<div class="menu" id="menu" hidden>
  <nav aria-label="Sections">
    <a href="#work">Work</a><a href="#services">Services</a><a href="#process">Process</a><a href="#book">Book</a>
  </nav>
  ${callBtn(c.hero.cta_primary, 'btn--lg')}
</div>

<main id="main">
<section class="hero" id="top">
  <div class="hero__media" data-parallax>
    ${heroImage(featured)}
    <div class="hero__veil" aria-hidden="true"></div>
    <div class="aurora" aria-hidden="true"><i class="aurora__b aurora__b--1"></i><i class="aurora__b aurora__b--2"></i><i class="aurora__b aurora__b--3"></i></div>
    <div class="spot" id="spot" aria-hidden="true"></div>
  </div>
  <div class="wrap hero__inner">
    ${c.hero.eyebrow ? `<p class="eyebrow hero__eyebrow">${e(c.hero.eyebrow)}</p>` : ''}
    <h1 class="hero__title">${words(c.hero.headline, 'w')}</h1>
    ${c.hero.subhead ? `<p class="hero__sub">${e(c.hero.subhead)}</p>` : ''}
    <div class="hero__cta">
      ${callBtn(c.hero.cta_primary, 'btn--lg')}
      ${c.hero.cta_secondary ? `<a class="btn btn--ghost btn--lg" href="#work" data-magnetic><span>${e(c.hero.cta_secondary)}</span>${ICON_ARROW}</a>` : ''}
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

${marquee(c)}

<section class="section work" id="work">
  <div class="wrap">
    <header class="section__head reveal">
      <p class="eyebrow">01 — Work</p>
      <h2>${e(c.work.heading)}</h2>
      ${c.work.subhead ? `<p class="lede">${e(c.work.subhead)}</p>` : ''}
    </header>
    ${chips(categories)}
    <div class="gallery" id="gallery">
      ${views.map(tile).join('\n')}
    </div>
  </div>
</section>

<section class="section about">
  <div class="wrap about__inner">
    <div class="about__text reveal">
      <p class="eyebrow">02 — Studio</p>
      <h2>${e(c.about.heading)}</h2>
      ${paragraphs(c.about.body, 'lede')}
      ${callBtn(c.hero.cta_primary, 'btn--lg about__cta')}
    </div>
    <div class="about__art" data-parallax-group>
      ${aboutImgs
        .map(
          (m, i) =>
            `<figure class="about__img about__img--${i + 1} reveal" style="--d:${i * 150}ms" data-parallax-item="${i ? '-0.08' : '0.06'}"><img src="${e(m.src)}"${m.srcset ? ` srcset="${e(m.srcset)}" sizes="(min-width: 900px) 30vw, 60vw"` : ''} alt="${e(m.alt)}" width="${m.width}" height="${m.height}" loading="lazy" decoding="async"></figure>`
        )
        .join('')}
      <span class="about__ring" aria-hidden="true"></span>
    </div>
  </div>
</section>

<section class="section services" id="services">
  <div class="wrap">
    <header class="section__head reveal">
      <p class="eyebrow">03 — Services</p>
      <h2>${e(c.services.heading)}</h2>
      ${c.services.subhead ? `<p class="lede">${e(c.services.subhead)}</p>` : ''}
    </header>
    <div class="cards">${serviceCards(c.services.items)}</div>
  </div>
</section>

<section class="section process" id="process">
  <div class="wrap process__inner">
    <header class="section__head reveal">
      <p class="eyebrow">04 — Process</p>
      <h2>${e(c.process.heading)}</h2>
    </header>
    <ol class="steps" id="steps"><span class="steps__line" aria-hidden="true"><i></i></span>${steps(c.process.steps)}</ol>
  </div>
</section>

${
  c.testimonials.items.length
    ? `<section class="section quotes">
  <div class="wrap">
    <header class="section__head reveal"><p class="eyebrow">Kind words</p><h2>${e(c.testimonials.heading)}</h2></header>
  </div>
  <div class="quotes__rail" tabindex="0" aria-label="Testimonials"><div class="wrap quotes__track">${quotes(c.testimonials.items)}</div></div>
</section>`
    : ''
}

<section class="section book" id="book">
  <div class="aurora aurora--book" aria-hidden="true"><i class="aurora__b aurora__b--1"></i><i class="aurora__b aurora__b--2"></i></div>
  <div class="wrap book__inner">
    <p class="eyebrow reveal">05 — Book</p>
    <h2 class="reveal">${e(c.contact.heading)}</h2>
    ${c.contact.body ? `<p class="lede reveal">${e(c.contact.body)}</p>` : ''}
    ${tel ? `<a class="book__phone reveal" href="${e(tel)}">${e(c.contact.phone)}</a>` : ''}
    <div class="book__cta reveal">
      ${callBtn(c.contact.cta_label || c.hero.cta_primary, 'btn--lg')}
      ${sms ? `<a class="btn btn--ghost btn--lg" href="${e(sms)}" data-magnetic>${ICON_MSG}<span>Text us</span></a>` : ''}
      ${mail ? `<a class="btn btn--ghost btn--lg" href="${e(mail)}" data-magnetic>${ICON_MAIL}<span>Email</span></a>` : ''}
    </div>
    <dl class="book__meta reveal">
      ${c.contact.hours ? `<div><dt>Hours</dt><dd>${e(c.contact.hours)}</dd></div>` : ''}
      ${c.contact.location ? `<div><dt>Location</dt><dd>${e(c.contact.location)}</dd></div>` : ''}
      ${ig ? `<div><dt>Instagram</dt><dd><a href="${e(ig)}" rel="noopener" target="_blank">${e(c.contact.instagram.startsWith('@') ? c.contact.instagram : `@${c.contact.instagram}`)}</a></dd></div>` : ''}
      ${c.contact.email ? `<div><dt>Email</dt><dd><a href="${e(mail)}">${e(c.contact.email)}</a></dd></div>` : ''}
    </dl>
  </div>
</section>
</main>

<footer class="foot">
  <div class="wrap foot__inner">
    <a class="foot__brand" href="#top">${LOGO}<span>${e(c.brand.name)}</span></a>
    <p class="foot__note">${e(c.footer.note.replace('{year}', year))}</p>
    <p class="foot__links"><a href="https://handprotocol.org" rel="noopener">Made by HAND</a><a href="/admin/">Owner sign in</a></p>
  </div>
</footer>

${tel ? `<div class="callbar" id="callbar">${callBtn(c.hero.cta_primary)}</div>` : ''}

<div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Image viewer">
  <div class="lightbox__bg" id="lbbg" aria-hidden="true"></div>
  <button class="lightbox__close" id="lbclose" type="button" aria-label="Close">×</button>
  <button class="lightbox__nav lightbox__nav--prev" id="lbprev" type="button" aria-label="Previous image">‹</button>
  <button class="lightbox__nav lightbox__nav--next" id="lbnext" type="button" aria-label="Next image">›</button>
  <figure class="lightbox__fig"><img id="lbimg" src="" alt=""><figcaption id="lbcap"></figcaption></figure>
  <p class="lightbox__count" id="lbcount"></p>
</div>

<script id="zb-media" type="application/json">${jsonForScript(lightboxData)}</script>
<script src="/assets/site.js?v=${ASSET_VERSION}" defer></script>
</body>
</html>`;
}
