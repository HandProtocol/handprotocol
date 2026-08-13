#!/usr/bin/env node
// Cafe Nena'i static site generator.
// Reads data/site.json + data/menu.json, writes the whole site to the project root.
// Run: node build.mjs

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const site = JSON.parse(readFileSync(join(ROOT, 'data/site.json'), 'utf8'));
const menu = JSON.parse(readFileSync(join(ROOT, 'data/menu.json'), 'utf8'));

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtDate = (iso) => { const [y, m, d] = iso.split('-'); return `${MONTHS[+m - 1]} · ${+d} · ${y}`; };

const havePhoto = new Set(existsSync(join(ROOT, 'img/menu')) ? readdirSync(join(ROOT, 'img/menu')) : []);
const itemImg = (it) => (it.img && havePhoto.has(it.img)) ? `img/menu/${it.img}` : null;

/* ---------------------------------------------------------------- chrome */

function head({ title, desc, path, image, jsonld }) {
  const canon = `${site.url}/${path}`.replace(/\/+$/, '/').replace(/([^:])\/\//g, '$1/');
  const img = `${site.url}/${image || 'img/site/hero-empanadas.webp'}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#c59d5f">
<link rel="icon" href="/img/site/logo-icon.png" type="image/png">
<link rel="apple-touch-icon" href="/img/site/logo-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cabin:wght@400;500;600;700&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&family=Herr+Von+Muellerhoff&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
<script>/* Opt into motion before first paint so nothing flashes. The timeout is a
   dead-man's switch: if motion.js never loads, reveal everything anyway. */
(function(d){var r=d.documentElement;r.className+=" motion";
setTimeout(function(){if(!r.classList.contains("motion-ready"))r.classList.remove("motion")},2500)})(document);</script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>`;
}

function header(current) {
  const on = (k) => (current === k ? ' aria-current="page"' : '');
  const cats = menu.sections.map(s => `<a href="/menu/${s.slug}/">${esc(s.title)}</a>`).join('');
  return `
<header class="site-header">
  <div class="site-header__inner">
    <a class="brand" href="/">${esc(site.wordmark)}</a>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>
    <nav class="nav" id="nav">
      <a href="/"${on('home')}>Home</a>
      <span class="has-sub"><a href="/menu/"${on('menu')}>Our Menu</a>
        <span class="subnav"><a href="/menu/">Full Menu</a>${cats}</span>
      </span>
      <a href="/news/"${on('news')}>News</a>
      <a href="/about/"${on('about')}>About</a>
      <a href="/contact/"${on('contact')}>Contact</a>
      <a class="nav-order" href="${site.order_url}" target="_blank" rel="noopener">Order Online</a>
    </nav>
  </div>
</header>
<main>`;
}

const IG = `<svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2m0 2.2c-3.1 0-3.5 0-4.7.06-1.1.05-1.7.24-2.1.4-.5.2-.9.44-1.3.84-.4.4-.64.8-.84 1.3-.16.4-.35 1-.4 2.1C2.6 10.3 2.6 10.7 2.6 12s0 1.7.06 2.9c.05 1.1.24 1.7.4 2.1.2.5.44.9.84 1.3.4.4.8.64 1.3.84.4.16 1 .35 2.1.4 1.2.06 1.6.06 4.7.06s3.5 0 4.7-.06c1.1-.05 1.7-.24 2.1-.4.5-.2.9-.44 1.3-.84.4-.4.64-.8.84-1.3.16-.4.35-1 .4-2.1.06-1.2.06-1.6.06-2.9s0-1.7-.06-2.9c-.05-1.1-.24-1.7-.4-2.1-.2-.5-.44-.9-.84-1.3-.4-.4-.8-.64-1.3-.84-.4-.16-1-.35-2.1-.4-1.2-.06-1.6-.06-4.7-.06z"/><path d="M12 15.3a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6zm0-8.4a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2zm6.5-.2a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/></svg>`;
const FB = `<svg viewBox="0 0 24 24"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.13-2.41-.13-2.38 0-4.02 1.46-4.02 4.14V9.9H7.5V13h2.77v8h3.23z"/></svg>`;

function footer() {
  const a = site.address;
  return `</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <span class="footer-brand">${esc(site.wordmark)}</span>
        <p class="muted" style="color:#8d8880;margin:0">${esc(site.tagline)}</p>
        <div class="social">
          <a href="${site.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${IG}</a>
          <a href="${site.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${FB}</a>
        </div>
      </div>
      <div>
        <h4>Visit</h4>
        <ul>
          <li><a href="${a.maps}" target="_blank" rel="noopener">${esc(a.street)}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.zip)}</a></li>
          <li><a href="tel:${site.phone_href}">${esc(site.phone)}</a></li>
          <li><a href="mailto:${site.email}">${esc(site.email)}</a></li>
        </ul>
      </div>
      <div>
        <h4>Hours</h4>
        <ul>${site.hours.map(h => `<li>${esc(h.day)} · ${esc(h.time)}</li>`).join('')}</ul>
      </div>
      <div>
        <h4>Menu</h4>
        <ul>
          <li><a href="/menu/">Full Menu</a></li>
          ${menu.sections.map(s => `<li><a href="/menu/${s.slug}/">${esc(s.title)}</a></li>`).join('')}
          <li><a href="${site.order_url}" target="_blank" rel="noopener">Order Online</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} ${esc(site.name)}. All rights reserved.</span>
      <span><a href="/about/">About</a> · <a href="/news/">Press</a> · <a href="/contact/">Contact</a></span>
    </div>
  </div>
</footer>
<script>
(function(){
  var b=document.querySelector('.nav-toggle'), n=document.getElementById('nav');
  if(b&&n) b.addEventListener('click',function(){
    var open=n.classList.toggle('open');
    b.setAttribute('aria-expanded',open?'true':'false');
  });
})();
</script>
<script src="/assets/motion.js" defer></script>
</body>
</html>`;
}

function page({ title, desc, path, image, jsonld, current, body }) {
  return head({ title, desc, path, image, jsonld }) + header(current) + body + footer();
}

// Reveal targets are tagged here rather than in every template, so the markup
// above stays readable and nothing gets forgotten when a page is added.
// Only unambiguous, single-purpose elements — never nav, footer or hero text.
const REVEAL_PATTERNS = [
  /<(a) class="(cat-card)"/g,
  /<(article) class="(item-card)"/g,
  /<(li) class="(menu-list__item)"/g,
  /<(article) class="(post)"/g,
  /<(p) class="(kicker)"/g,
  /<(p) class="(script)"/g,
  /<(p) class="(lede)"/g,
  /<(hr) class="(separator)"(?=>)/g,
  /<(hr) class="(separator separator--left)"/g,
  /<(blockquote)()/g,
];

function tagReveal(html) {
  // Split off head + header + footer so only <main> content is touched.
  const start = html.indexOf('<main>');
  const end = html.indexOf('</main>');
  if (start < 0 || end < 0) return html;
  const before = html.slice(0, start), after = html.slice(end);
  let mid = html.slice(start, end);
  for (const re of REVEAL_PATTERNS) mid = mid.replace(re, (m, tag, cls) => `<${tag}${cls ? ` class="${cls}"` : ''} data-reveal`);
  // h2s inside main, but not the ones already carrying attributes.
  mid = mid.replace(/<h2>/g, '<h2 data-reveal>');
  return before + mid + after;
}

function write(path, html) {
  const out = join(ROOT, path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, tagReveal(html));
  pages.push(path);
}
const pages = [];

// A slow band of dish names — the kind of thing a good restaurant site has
// drifting between sections. Duplicated once so the loop is seamless.
function marquee() {
  const names = menu.sections.flatMap(s => s.items.map(i => i.name));
  const pick = names.filter((_, i) => i % 2 === 0).slice(0, 16);
  const row = `<span class="marquee__row">${pick.map(n => `<span>${esc(n)}<i> ✦</i></span>`).join('')}</span>`;
  return `<div class="marquee" aria-hidden="true"><div class="marquee__track">${row}${row}</div></div>`;
}

/* ------------------------------------------------------------- partials */

function orderBand(text = 'Skip the line. Order ahead for pickup and we\'ll have it warm and waiting.') {
  return `
<section class="order-band">
  <div class="wrap">
    <h2>Order Ahead</h2>
    <p>${esc(text)}</p>
    <a class="btn btn--light" href="${site.order_url}" target="_blank" rel="noopener">Order for Pickup</a>
  </div>
</section>`;
}

function stockPill(it) {
  if (it.stock === 'out') return ' <span class="pill pill--out">Sold out today</span>';
  if (it.stock === 'low') return ' <span class="pill pill--muted">Low stock</span>';
  if (it.tag) return ` <span class="pill">${esc(it.tag)}</span>`;
  return '';
}

function menuRow(sec, it) {
  const img = itemImg(it);
  return `<li class="menu-list__item">
  <div class="menu-row">
    ${img ? `<img class="menu-row__thumb" src="/${img}" alt="${esc(it.name)}" loading="lazy" width="82" height="82">` : ''}
    <div class="menu-row__main">
      <h4 class="menu-row__title">
        <a href="/menu/${sec.slug}/${it.slug}/">${esc(it.name)}</a>${stockPill(it)}
        <span class="dots"></span><span class="price">${esc(it.price)}</span>
      </h4>
      ${it.desc ? `<p class="menu-row__desc">${esc(it.desc)}</p>` : ''}
    </div>
  </div>
</li>`;
}

/* ----------------------------------------------------------------- home */

const localBiz = {
  '@context': 'https://schema.org', '@type': 'CafeOrCoffeeShop',
  name: site.name, description: site.description, url: site.url,
  telephone: site.phone, email: site.email, image: `${site.url}/img/site/hero-empanadas.webp`,
  servesCuisine: ['South American', 'Paraguayan', 'Argentine', 'Coffee', 'Bakery'],
  priceRange: '$$',
  address: { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: 'TX', postalCode: site.address.zip, addressCountry: 'US' },
  openingHoursSpecification: site.hours.filter(h => !h.closed).map(h => ({
    '@type': 'OpeningHoursSpecification', dayOfWeek: h.day, opens: '08:00', closes: '14:00'
  })),
  hasMenu: `${site.url}/menu/`,
  sameAs: [site.social.instagram, site.social.facebook]
};

write('index.html', page({
  title: `${site.name} | Austin's South American Bakery & Coffee Shop`,
  desc: site.description, path: '', image: 'img/site/hero-empanadas.webp',
  current: 'home', jsonld: localBiz,
  body: `
<div class="hero hero--tall">
  <img src="/img/site/hero-empanadas.webp" alt="Freshly baked empanadas with chimichurri at Cafe Nena'i" fetchpriority="high" width="2048" height="1365">
  <div style="position:relative;z-index:2;text-align:center">
    <p class="hero__script" aria-hidden="true"><span class="first-letter">W</span>elcome</p>
    <h1 class="hero__title"><span class="sr-only">Welcome to </span>Cafe Nena'i</h1>
    <div class="hero__rule" aria-hidden="true">
      <span class="line line--left"></span><span class="line line--right"></span>
      <span class="arrow arrow--left"></span><span class="arrow arrow--right"></span>
      <span class="star">&#10043;</span>
    </div>
    <p class="hero__sub">South American Cafe</p>
  </div>
  <a class="hero__scroll" href="#who" aria-label="Scroll down">⌄</a>
</div>

<section id="who">
  <div class="wrap grid-2">
    <div>
      <p class="kicker">${esc(site.home.who_kicker)}</p>
      <p class="script">${esc(site.home.who_title)}</p>
      <hr class="separator">
      ${site.home.who_body.map(p => `<p>${esc(p)}</p>`).join('')}
      <a class="btn" href="/about/">About Us</a>
    </div>
    <div><img src="/img/site/cafe-portrait.webp" alt="Inside Cafe Nena'i" loading="lazy" width="564" height="774"></div>
  </div>
</section>

<section class="section--soft">
  <div class="wrap">
    <div class="center" style="margin-bottom:clamp(30px,4vw,52px)">
      <p class="kicker">Come and go, all day</p>
      <h2>Our Menu</h2>
      <hr class="separator">
      <p class="narrow muted">${esc(site.home.menu_intro_2)}</p>
    </div>
    <div class="menu-cats">
      ${menu.sections.map(s => `<a class="cat-card" href="/menu/${s.slug}/">
        <img src="/img/site/${s.hero}" alt="${esc(s.title)}" loading="lazy">
        <span class="cat-card__body"><h3>${esc(s.title)}</h3><span>${s.items.length} items</span></span>
      </a>`).join('')}
    </div>
    <p class="center" style="margin-top:40px"><a class="btn btn--solid" href="/menu/">See the Full Menu</a></p>
  </div>
</section>

${marquee()}

<section class="story-band story-band--art" aria-label="What Nena'i means">
  <img class="story-band__art" src="/img/site/nenai-story.webp" alt="" width="2047" height="1151" loading="lazy" decoding="async">
  <div class="wrap story-band__copy">
    <h2>The Little Girl</h2>
    <hr class="separator">
    <p>${esc(site.home.story)}</p>
  </div>
</section>

<section>
  <div class="wrap grid-2">
    <div><img src="/img/site/bola-de-fraile-patio.webp" alt="Bola de fraile and café con leche on the patio" loading="lazy"></div>
    <div>
      <p class="kicker">Mom &amp; daughter</p>
      <h2>Women Power</h2>
      <hr class="separator separator--left">
      <p>${esc(site.home.menu_intro)}</p>
      <a class="btn btn--text" href="/about/">Meet Gladys &amp; Elena</a>
    </div>
  </div>
</section>

<section class="section--soft">
  <div class="wrap center">
    <p class="kicker">In the press</p>
    <h2>Austin Noticed</h2>
    <hr class="separator">
    <div class="press-strip" style="margin-top:34px">
      <img src="/img/site/press-statesman.webp" alt="Austin American-Statesman" loading="lazy">
      <span>Eater Austin</span><span>KUT 90.5</span><span>Tribeza</span>
    </div>
    <p style="margin-top:34px"><a class="btn btn--text" href="/news/">Read the coverage</a></p>
  </div>
</section>

${orderBand()}

<section>
  <div class="wrap grid-2">
    <div>
      <p class="kicker">Find us</p>
      <h2>Visit</h2>
      <hr class="separator separator--left">
      <p><a href="${site.address.maps}" target="_blank" rel="noopener">${esc(site.address.street)}<br>${esc(site.address.city)}, ${esc(site.address.state)} ${esc(site.address.zip)}</a></p>
      <p><a href="tel:${site.phone_href}">${esc(site.phone)}</a> · <a href="mailto:${site.email}">${esc(site.email)}</a></p>
      <a class="btn" href="/contact/">Hours &amp; Directions</a>
    </div>
    <div>
      <ul class="hours" style="max-width:none">
        ${site.hours.map(h => `<li><span class="day">${esc(h.day)}</span><span${h.closed ? ' class="closed"' : ''}>${esc(h.time)}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</section>`
}));

/* ------------------------------------------------------------ full menu */

const menuJsonLd = {
  '@context': 'https://schema.org', '@type': 'Menu', name: `${site.name} Menu`, url: `${site.url}/menu/`,
  hasMenuSection: menu.sections.map(s => ({
    '@type': 'MenuSection', name: s.title, description: s.blurb,
    hasMenuItem: s.items.map(i => ({
      '@type': 'MenuItem', name: i.name, description: i.desc || undefined,
      url: `${site.url}/menu/${s.slug}/${i.slug}/`,
      offers: { '@type': 'Offer', price: (i.price.match(/[\d.]+/) || [''])[0], priceCurrency: 'USD' }
    }))
  }))
};

write('menu/index.html', page({
  title: `Menu | ${site.name} — Empanadas, Chipa, Cuban Espresso in East Austin`,
  desc: 'The full Cafe Nena\'i menu: Paraguayan and Argentine empanadas, chipa, facturas and alfajores, Cuban-style espresso, mate cocido and fresh juices.',
  path: 'menu/', image: 'img/site/hero-empanadas.webp', current: 'menu', jsonld: menuJsonLd,
  body: `
<div class="hero">
  <img src="/img/site/hero-empanadas.webp" alt="Empanadas at Cafe Nena'i" fetchpriority="high">
  <h1 class="hero__title">Our Menu</h1>
</div>

<section>
  <div class="wrap center narrow">
    <p class="kicker">Taste a bit of South America</p>
    <hr class="separator">
    <p>${esc(site.home.menu_intro)}</p>
    <p class="muted">${esc(site.home.menu_intro_2)}</p>
    <p style="margin-top:26px"><a class="btn btn--solid" href="${site.order_url}" target="_blank" rel="noopener">Order for Pickup</a></p>
  </div>
</section>

<section class="section--soft" style="padding-top:0;padding-bottom:clamp(40px,5vw,64px)">
  <div class="wrap" style="padding-top:clamp(40px,5vw,64px)">
    <div class="menu-cats">
      ${menu.sections.map(s => `<a class="cat-card" href="/menu/${s.slug}/">
        <img src="/img/site/${s.hero}" alt="${esc(s.title)}" loading="lazy">
        <span class="cat-card__body"><h3>${esc(s.title)}</h3><span>${s.items.length} items</span></span>
      </a>`).join('')}
    </div>
  </div>
</section>

${marquee()}

${menu.sections.map(s => `
<section class="menu-section" id="${s.slug}">
  <div class="wrap narrow">
    <div class="menu-section__head">
      <h2>${esc(s.title)}</h2>
      <hr class="separator">
      <p class="muted">${esc(s.blurb)}</p>
    </div>
    <ul class="menu-list">${s.items.map(it => menuRow(s, it)).join('')}</ul>
    <p class="center" style="margin-top:34px"><a class="btn btn--text" href="/menu/${s.slug}/">All ${esc(s.title)} →</a></p>
  </div>
</section>`).join('')}

<section class="section--soft">
  <div class="wrap narrow center">
    <h2>Also Available</h2>
    <hr class="separator">
    ${menu.extras.map(e => `<p><b>${esc(e.name)}</b> — ${esc(e.desc)} <span class="price">${esc(e.price)}</span></p>`).join('')}
  </div>
</section>

${orderBand()}`
}));

/* -------------------------------------------------- menu category pages */

for (const s of menu.sections) {
  write(`menu/${s.slug}/index.html`, page({
    title: `${s.title} | ${site.name} Menu`,
    desc: `${s.blurb} — ${s.items.map(i => i.name).slice(0, 6).join(', ')} and more at Cafe Nena'i in East Austin.`,
    path: `menu/${s.slug}/`, image: `img/site/${s.hero}`, current: 'menu',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'MenuSection', name: s.title, description: s.blurb,
      hasMenuItem: s.items.map(i => ({ '@type': 'MenuItem', name: i.name, description: i.desc || undefined, url: `${site.url}/menu/${s.slug}/${i.slug}/` }))
    },
    body: `
<div class="hero">
  <img src="/img/site/${s.hero}" alt="${esc(s.title)} at Cafe Nena'i" fetchpriority="high">
  <h1 class="hero__title">${esc(s.title)}</h1>
</div>

<section>
  <div class="wrap">
    <p class="crumbs"><a href="/menu/">Menu</a> / ${esc(s.title)}</p>
    <div class="center narrow" style="margin-bottom:clamp(32px,4vw,52px)">
      <p class="kicker">${esc(s.subtitle)}</p>
      <hr class="separator">
      <p class="muted">${esc(s.blurb)}</p>
    </div>
    <div class="item-grid">
      ${s.items.map(it => {
        const img = itemImg(it);
        return `<article class="item-card">
        <a href="/menu/${s.slug}/${it.slug}/" aria-label="${esc(it.name)}">
          ${img ? `<img class="item-card__img" src="/${img}" alt="${esc(it.name)}" loading="lazy">`
                : `<div class="item-card__ph" aria-hidden="true">N</div>`}
        </a>
        <div class="item-card__body">
          <h3><a href="/menu/${s.slug}/${it.slug}/">${esc(it.name)}</a></h3>
          ${it.desc ? `<p class="item-card__desc">${esc(it.desc)}</p>` : '<p class="item-card__desc"></p>'}
          <div class="item-card__foot">
            <span class="price">${esc(it.price)}</span>
            ${it.stock === 'out' ? '<span class="pill pill--out">Sold out</span>' : it.stock === 'low' ? '<span class="pill pill--muted">Low stock</span>' : it.tag ? `<span class="pill">${esc(it.tag)}</span>` : ''}
          </div>
        </div>
      </article>`; }).join('')}
    </div>
  </div>
</section>

${orderBand()}

<section>
  <div class="wrap center">
    <h2>More of the Menu</h2>
    <hr class="separator">
    <p>${menu.sections.filter(x => x.slug !== s.slug).map(x => `<a class="btn" style="margin:6px" href="/menu/${x.slug}/">${esc(x.title)}</a>`).join('')}</p>
  </div>
</section>`
  }));

  /* ------------------------------------------------- item detail pages */

  for (const [i, it] of s.items.entries()) {
    const img = itemImg(it);
    const prev = s.items[(i - 1 + s.items.length) % s.items.length];
    const next = s.items[(i + 1) % s.items.length];
    write(`menu/${s.slug}/${it.slug}/index.html`, page({
      title: `${it.name} | ${site.name} — ${s.title}`,
      desc: `${it.name}${it.desc ? ` — ${it.desc}` : ''}. ${it.price} at Cafe Nena'i, East Austin's South American bakery and coffee shop.`,
      path: `menu/${s.slug}/${it.slug}/`, image: img || `img/site/${s.hero}`, current: 'menu',
      jsonld: {
        '@context': 'https://schema.org', '@type': 'MenuItem', name: it.name,
        description: it.desc || undefined, image: img ? `${site.url}/${img}` : undefined,
        menuAddOn: undefined,
        offers: { '@type': 'Offer', price: (it.price.match(/[\d.]+/) || [''])[0], priceCurrency: 'USD', availability: it.stock === 'out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' }
      },
      body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/menu/">Menu</a> / <a href="/menu/${s.slug}/">${esc(s.title)}</a> / ${esc(it.name)}</p>
  </div>
</section>

<section style="padding-top:clamp(24px,3vw,36px)">
  <div class="wrap item-detail">
    <div class="item-detail__media">
      ${img ? `<img src="/${img}" alt="${esc(it.name)} at Cafe Nena'i" fetchpriority="high">`
            : `<div class="item-detail__ph" aria-hidden="true">N</div>`}
    </div>
    <div>
      <h1 style="font-size:clamp(1.6rem,4vw,2.6rem)">${esc(it.name)}</h1>
      <p class="price" style="font-size:1.5rem;margin:0 0 18px">${esc(it.price)}
        ${it.stock === 'out' ? '<span class="pill pill--out" style="margin-left:8px">Sold out today</span>' : it.stock === 'low' ? '<span class="pill pill--muted" style="margin-left:8px">Low stock</span>' : it.tag ? `<span class="pill" style="margin-left:8px">${esc(it.tag)}</span>` : ''}
      </p>
      ${it.desc ? `<p style="font-size:1.08rem">${esc(it.desc)}</p>` : ''}
      <p><a class="btn btn--solid" href="${site.order_url}" target="_blank" rel="noopener">Order for Pickup</a></p>
      <ul class="spec">
        <li><b>Section</b><span><a href="/menu/${s.slug}/">${esc(s.title)}</a></span></li>
        <li><b>Price</b><span>${esc(it.price)}</span></li>
        ${it.addon ? '<li><b>Note</b><span>Add-on — order alongside any espresso drink.</span></li>' : ''}
        <li><b>Where</b><span><a href="${site.address.maps}" target="_blank" rel="noopener">${esc(site.address.street)}, ${esc(site.address.city)}</a></span></li>
        <li><b>Hours</b><span>Tue–Sun, 8:00 am – 2:00 pm</span></li>
      </ul>
    </div>
  </div>
</section>

<section class="section--soft">
  <div class="wrap">
    <div class="center" style="margin-bottom:34px">
      <p class="kicker">More ${esc(s.title)}</p>
      <hr class="separator">
    </div>
    <div class="item-grid">
      ${s.items.filter(x => x.slug !== it.slug).slice(0, 4).map(x => {
        const xi = itemImg(x);
        return `<article class="item-card">
        <a href="/menu/${s.slug}/${x.slug}/" aria-label="${esc(x.name)}">
          ${xi ? `<img class="item-card__img" src="/${xi}" alt="${esc(x.name)}" loading="lazy">` : `<div class="item-card__ph" aria-hidden="true">N</div>`}
        </a>
        <div class="item-card__body">
          <h3><a href="/menu/${s.slug}/${x.slug}/">${esc(x.name)}</a></h3>
          <div class="item-card__foot"><span class="price">${esc(x.price)}</span></div>
        </div>
      </article>`; }).join('')}
    </div>
    <p class="center" style="margin-top:36px">
      <a class="btn btn--text" href="/menu/${s.slug}/${prev.slug}/">← ${esc(prev.name)}</a>
      <span style="display:inline-block;width:28px"></span>
      <a class="btn btn--text" href="/menu/${s.slug}/${next.slug}/">${esc(next.name)} →</a>
    </p>
  </div>
</section>`
    }));
  }
}

/* ---------------------------------------------------------------- about */

write('about/index.html', page({
  title: `About | ${site.name} — A Mother & Daughter Dream in East Austin`,
  desc: "Cafe Nena'i was born from a mother and daughter dream. Meet Gladys Benitez and Elena Sanguinetti, and the Guaraní word that named the cafe.",
  path: 'about/', image: `img/site/${site.about.hero}`, current: 'about',
  body: `
<div class="hero">
  <img src="/img/site/${site.about.hero}" alt="Bola de fraile and coffee at Cafe Nena'i" fetchpriority="high">
  <h1 class="hero__title">${esc(site.about.hero_title)}</h1>
</div>

<section>
  <div class="wrap center narrow">
    <p class="kicker">${esc(site.about.heading)}</p>
    <hr class="separator">
  </div>
  <div class="wrap grid-2 grid-2--top" style="margin-top:20px">
    ${site.about.founders.map(f => `
    <div>
      <img src="/img/site/${f.img}" alt="${esc(f.name)}" loading="lazy" style="margin-bottom:22px">
      <h3>${esc(f.name)}</h3>
      <p>${esc(f.bio)}</p>
    </div>`).join('')}
  </div>
</section>

<section class="story-band">
  <div class="wrap">
    <h2>What Nena'i Means</h2>
    <hr class="separator">
    <p>${esc(site.home.story)}</p>
  </div>
</section>

<section>
  <div class="wrap narrow center">
    <hr class="separator">
    <blockquote style="margin:0;font-size:1.14rem;line-height:1.85;font-style:italic;color:#3a3a3a">
      ${esc(site.about.quote)}
    </blockquote>
    <p class="kicker" style="margin-top:22px">Gladys &amp; Elena</p>
  </div>
</section>

<section class="section--soft">
  <div class="wrap grid-2">
    <div><img src="/img/site/interior.webp" alt="Inside the cafe" loading="lazy"></div>
    <div>
      <h2>The Room</h2>
      <hr class="separator separator--left">
      <p>Exposed-brick walls, antique chandeliers and a big window that lets in all the good light — plus outdoor seating for the days Austin cooperates.</p>
      <p>Come and go service all day, from the first cafecito to the last alfajor.</p>
      <a class="btn" href="/contact/">Plan Your Visit</a>
    </div>
  </div>
</section>

${orderBand()}`
}));

/* -------------------------------------------------------------- contact */

write('contact/index.html', page({
  title: `Contact & Hours | ${site.name} — 1700 Montopolis Dr, Austin TX`,
  desc: `Visit Cafe Nena'i at ${site.address.street}, ${site.address.city} ${site.address.state} ${site.address.zip}. Open Tuesday–Sunday 8am–2pm. Call ${site.phone}. We cater.`,
  path: 'contact/', image: 'img/site/storefront.webp', current: 'contact', jsonld: localBiz,
  body: `
<section class="page-head page-head--center">
  <div class="wrap">
    <h1>Contact</h1>
    <hr class="separator">
    <p class="lede">Questions, catering, or just want to say hello — get a hold of us whichever way is most convenient. Ask away.</p>
  </div>
</section>

<section>
  <div class="wrap info-grid">
    <div>
      <h3>Find Us</h3>
      <p><a href="${site.address.maps}" target="_blank" rel="noopener">${esc(site.address.street)}<br>${esc(site.address.city)}, ${esc(site.address.state)} ${esc(site.address.zip)}</a></p>
      <p><a class="btn btn--text" href="${site.address.maps}" target="_blank" rel="noopener">Get Directions</a></p>
    </div>
    <div>
      <h3>Talk To Us</h3>
      <p><a href="tel:${site.phone_href}">${esc(site.phone)}</a></p>
      <p><a href="mailto:${site.email}">${esc(site.email)}</a></p>
      <div class="social" style="margin-top:4px">
        <a href="${site.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram" style="border-color:#ddd">${IG.replace(/fill="[^"]*"/g, '')}</a>
        <a href="${site.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook" style="border-color:#ddd">${FB}</a>
      </div>
    </div>
    <div>
      <h3>Hours</h3>
      <ul class="hours">
        ${site.hours.map(h => `<li><span class="day">${esc(h.day)}</span><span${h.closed ? ' class="closed"' : ''}>${esc(h.time)}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</section>

<section class="section--soft">
  <div class="wrap grid-2">
    <div>
      <h2>We Cater</h2>
      <hr class="separator separator--left">
      <p>Empanadas and facturas travel well. Tell us the headcount and the date and we'll put together a tray — office breakfasts, showers, parties, or a table of chipa for the whole crew.</p>
      <p><a class="btn btn--solid" href="mailto:${site.email}?subject=Catering%20inquiry%20—%20Cafe%20Nena'i">Email Us About Catering</a></p>
    </div>
    <div>
      <img src="/img/site/storefront.webp" alt="Cafe Nena'i storefront" loading="lazy">
    </div>
  </div>
</section>

<section style="padding-top:0">
  <div class="wrap">
    <iframe class="map-embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map to Cafe Nena'i"
      src="https://www.openstreetmap.org/export/embed.html?bbox=-97.6835%2C30.2295%2C-97.6635%2C30.2455&amp;layer=mapnik&amp;marker=30.2375%2C-97.6735"></iframe>
    <p class="center" style="margin-top:16px"><a class="btn btn--text" href="${site.address.maps}" target="_blank" rel="noopener">Open in Google Maps</a></p>
  </div>
</section>

${orderBand()}`
}));

/* ----------------------------------------------------------------- news */

write('news/index.html', page({
  title: `News & Press | ${site.name}`,
  desc: "Cafe Nena'i in the press: Austin American-Statesman, Eater Austin, KUT 90.5 and Tribeza on East Austin's South American bakery.",
  path: 'news/', image: 'img/site/counter.webp', current: 'news',
  body: `
<section class="page-head">
  <div class="wrap narrow">
    <h1>News</h1>
    <hr class="separator separator--left">
    <p class="lede">What Austin has been saying about the little cafe on Montopolis.</p>
  </div>
</section>

<section>
  <div class="wrap narrow">
    <div class="post-list">
      ${site.press.map(p => `
      <article class="post">
        <p class="post__date">${esc(fmtDate(p.date))}</p>
        <p class="post__outlet">${esc(p.outlet)}</p>
        <h2 class="post__title"><a href="/news/${p.slug}/">${esc(p.title)}</a></h2>
        <hr class="separator" style="margin:14px 0">
        <p class="muted">${esc(p.body[0])}</p>
        <p><a class="btn btn--text" href="/news/${p.slug}/">Read More</a></p>
      </article>`).join('')}
    </div>
  </div>
</section>

${orderBand()}`
}));

for (const [i, p] of site.press.entries()) {
  const prev = site.press[i - 1], next = site.press[i + 1];
  write(`news/${p.slug}/index.html`, page({
    title: `${p.title} | ${site.name}`,
    desc: p.body[0].slice(0, 180),
    path: `news/${p.slug}/`, image: 'img/site/counter.webp', current: 'news',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'NewsArticle', headline: p.title,
      datePublished: p.date, publisher: { '@type': 'Organization', name: p.outlet },
      author: { '@type': 'Organization', name: site.name }, mainEntityOfPage: `${site.url}/news/${p.slug}/`
    },
    body: `
<section class="page-head page-head--center">
  <div class="wrap narrow">
    <p class="crumbs"><a href="/news/">News</a> / ${esc(p.outlet)}</p>
    <p class="post__date">${esc(fmtDate(p.date))}</p>
    <h1 style="font-size:clamp(1.5rem,3.6vw,2.5rem)">${esc(p.title)}</h1>
    <hr class="separator">
  </div>
</section>

<section style="padding-top:clamp(20px,3vw,32px)">
  <div class="wrap narrow">
    ${p.body.map(b => `<p style="font-size:1.06rem">${esc(b)}</p>`).join('')}
    <p style="margin-top:28px"><a class="btn" href="${p.link}" target="_blank" rel="noopener">${esc(p.link_label)}</a></p>
    <hr class="separator" style="margin:44px auto">
    <p class="center">
      ${prev ? `<a class="btn btn--text" href="/news/${prev.slug}/">← Newer</a>` : ''}
      <span style="display:inline-block;width:28px"></span>
      ${next ? `<a class="btn btn--text" href="/news/${next.slug}/">Older →</a>` : ''}
    </p>
    <p class="center" style="margin-top:24px"><a class="btn btn--text" href="/news/">All News</a></p>
  </div>
</section>

${orderBand()}`
  }));
}

/* ------------------------------------------------------------------ 404 */

write('404.html', page({
  title: `Page Not Found | ${site.name}`, desc: 'That page moved.', path: '404.html', current: '',
  body: `
<section class="page-head page-head--center" style="padding-bottom:clamp(60px,8vw,110px)">
  <div class="wrap narrow">
    <p class="script" style="font-size:clamp(3.5rem,10vw,7rem)">Oops</p>
    <h1>Page Not Found</h1>
    <hr class="separator">
    <p class="lede">That page isn't on the menu. Try one of these instead.</p>
    <p style="margin-top:28px">
      <a class="btn btn--solid" href="/">Home</a>
      <span style="display:inline-block;width:10px"></span>
      <a class="btn" href="/menu/">Menu</a>
      <span style="display:inline-block;width:10px"></span>
      <a class="btn" href="/contact/">Contact</a>
    </p>
  </div>
</section>`
}));

/* -------------------------------------------------------- sitemap/robots */

const urls = pages.filter(p => p !== '404.html')
  .map(p => `${site.url}/${p.replace(/index\.html$/, '')}`);
writeFileSync(join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + `\n</urlset>\n`);

writeFileSync(join(ROOT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);

console.log(`Built ${pages.length} pages + sitemap (${urls.length} urls)`);
for (const s of menu.sections) console.log(`  ${s.title}: ${s.items.length} item pages`);
