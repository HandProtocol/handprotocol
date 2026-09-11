import * as B from '../netlify/functions/lib/blocks.mjs';
import { toView } from '../netlify/functions/lib/content.mjs';
import { config } from '../netlify/functions/lib/config.mjs';

export function renderPage({ content, media, origin = '' }) {
  const c = content;
  const views = media.map(toView);
  const social = c.social || {};
  const httpsUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  };
  const profiles = [
    { href: httpsUrl(social.facebook_url), label: 'Facebook' },
    { href: httpsUrl(social.instagram_url), label: 'Instagram' },
  ].filter((link) => link.href);
  const reviewUrl = httpsUrl(social.google_review_url);
  const socialLinks = (id) => {
    if (!profiles.length && !reviewUrl) return '';
    const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
    return `<div class="social" aria-labelledby="${id}">
      <h3 class="social__heading" id="${id}" data-es="${B.e(social.heading_es)}">${B.e(social.heading)}</h3>
      <ul class="social__links">
        ${profiles.map((link) => `<li><a href="${B.e(link.href)}" target="_blank" rel="noopener noreferrer">${B.e(link.label)}${arrow}</a></li>`).join('')}
        ${reviewUrl ? `<li><a href="${B.e(reviewUrl)}" target="_blank" rel="noopener noreferrer"><span data-es="${B.e(social.review_label_es)}">${B.e(social.review_label)}</span>${arrow}</a></li>` : ''}
      </ul>
    </div>`;
  };
  const image = (name, options = {}) => {
    if (name === 'mark') return config.logo;
    const view = views.find((m) => (m.original || m.src || '').toLowerCase().endsWith('/' + name.toLowerCase() + '.webp')) || views.find((m) => (m.original || m.src || '').toLowerCase().includes('/' + name.toLowerCase() + '.'));
    return B.img(view, { sizes: '100vw', ...options });
  };
  return `<!DOCTYPE html><html lang="en"><head>${B.headTags({ content: c, featured: views.find((m) => m.featured), origin, extra: '<meta name="description" content="Legacy Care LLC provides compassionate in-home care for seniors.">' })}
${B.jsonLd(c, origin, views.find((m) => m.featured), { telephone: c.contact.phone, email: c.contact.email, sameAs: profiles.length ? profiles.map((link) => link.href) : undefined })}</head><body>


<a class="skip" href="#main"><span data-es="${B.e(c.brand.copy_1_es)}">${B.e(c.brand.copy_1)}</span></a>

<header class="nav">
  <div class="wrap nav__row">
    <a class="brand" href="#top" aria-label="Legacy Care LLC, home">
      ${image('mark')}
      <span class="brand__name">
        <span class="brand__legacy">${B.e(c.brand.copy_7)}</span>
        <span class="brand__care" data-es="${B.e(c.brand.copy_2_es)}">${B.e(c.brand.copy_2)}</span>
      </span>
    </a>
    <nav class="nav__links" aria-label="Primary">
      <a href="#services" data-es="${B.e(c.brand.copy_3_es)}">${B.e(c.brand.copy_3)}</a>
      <a href="#about" data-es="${B.e(c.brand.copy_4_es)}">${B.e(c.brand.copy_4)}</a>
      <a href="#how" data-es="${B.e(c.brand.copy_5_es)}">${B.e(c.brand.copy_5)}</a>
      <a href="#contact" data-es="${B.e(c.brand.copy_6_es)}">${B.e(c.brand.copy_6)}</a>
    </nav>
    <div class="nav__actions">
      <button class="lang-toggle" type="button" data-lang-to="es" aria-label="Ver en español" aria-pressed="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
        <span class="lang-label">Español</span>
      </button>
      <a class="btn btn--primary" href="${B.e(B.telHref(c.contact.phone))}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"></path></svg>
        <span class="btn-txt">${B.e(c.contact.phone)}</span>
      </a>
    </div>
  </div>
</header>

<main id="main">

  <!-- ═══════════ HERO ═══════════ -->
  <section class="hero" id="top" aria-labelledby="hero-title">
    <div class="wrap">
      <div class="hero__panel">
        <div class="hero__hearts" aria-hidden="true">
          <svg class="h1" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
          <svg class="h2" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
          <svg class="h3" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
        </div>

        <div class="hero__copy">
          <span class="eyebrow reveal in">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
            <span data-es="${B.e(c.hero.copy_1_es)}">${B.e(c.hero.copy_1)}</span>
          </span>
          <h1 id="hero-title" class="reveal in" data-delay="1">
            <span data-es="${B.e(c.hero.copy_2_es)}">${B.e(c.hero.copy_2)}</span>
            <span class="script" data-es="${B.e(c.hero.copy_3_es)}">${B.e(c.hero.copy_3)}</span>
          </h1>
          <p class="lead reveal in" data-delay="2" data-es="${B.e(c.hero.copy_4_es)}">${B.e(c.hero.copy_4)}</p>
          <div class="hero__cta reveal in" data-delay="3">
            <a class="btn btn--primary btn--lg" href="${B.e(B.telHref(c.contact.phone))}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"></path></svg>
              <span data-es="${B.e(c.hero.copy_5_es)}">${B.e(c.hero.copy_5)}</span>
            </a>
            <a class="btn btn--ghost btn--lg" href="#services" data-es="${B.e(c.hero.copy_6_es)}">${B.e(c.hero.copy_6)}</a>
          </div>
          <p class="hero__free reveal in" data-delay="3"><b data-es="${B.e(c.hero.copy_7_es)}">${B.e(c.hero.copy_7)}</b><span data-es="${B.e(c.hero.copy_8_es)}">${B.e(c.hero.copy_8)}</span></p>
          <ul class="why reveal in" data-delay="3" aria-label="Why families choose Legacy Care">
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m8.5 12.5 2.3 2.3 4.7-5"></path></svg><span data-es="${B.e(c.hero.copy_9_es)}">${B.e(c.hero.copy_9)}</span></li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m8.5 12.5 2.3 2.3 4.7-5"></path></svg><span data-es="${B.e(c.hero.copy_10_es)}">${B.e(c.hero.copy_10)}</span></li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m8.5 12.5 2.3 2.3 4.7-5"></path></svg><span data-es="${B.e(c.hero.copy_11_es)}">${B.e(c.hero.copy_11)}</span></li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m8.5 12.5 2.3 2.3 4.7-5"></path></svg><span data-es="${B.e(c.hero.copy_12_es)}">${B.e(c.hero.copy_12)}</span></li>
          </ul>
        </div>

        <div class="hero__media reveal in" data-delay="1">
          <div class="hero__photo">
            ${image('hero', { eager: true })}
          </div>
          <div class="badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
            <span data-es="${B.e(c.hero.copy_13_es)}">${B.e(c.hero.copy_13)}</span>
            <em data-es="${B.e(c.hero.copy_14_es)}">${B.e(c.hero.copy_14)}</em>
            <span data-es="${B.e(c.hero.copy_15_es)}">${B.e(c.hero.copy_15)}</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════ SERVICES ═══════════ -->
  <section class="services" id="services" aria-labelledby="svc-title">
    <div class="wrap">
      <div class="sec-head reveal">
        <span class="eyebrow" data-es="${B.e(c.services.copy_1_es)}">${B.e(c.services.copy_1)}</span>
        <h2 id="svc-title" data-es="${B.e(c.services.copy_2_es)}">${B.e(c.services.copy_2)}</h2>
        <p class="lead" data-es="${B.e(c.services.copy_3_es)}">${B.e(c.services.copy_3)}</p>
      </div>

      <div class="svc reveal">
        <ul class="svc__list">
          <li class="svc__item">
            <span class="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg></span>
            <span class="svc__name" data-es="${B.e(c.services.copy_4_es)}">${B.e(c.services.copy_4)}</span>
            <span class="svc__desc" data-es="${B.e(c.services.copy_5_es)}">${B.e(c.services.copy_5)}</span>
          </li>
          <li class="svc__item">
            <span class="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.7 3 4 3.7 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"></path><path d="M10 5 8 7M2 12h20M7 19v2M17 19v2"></path></svg></span>
            <span class="svc__name" data-es="${B.e(c.services.copy_6_es)}">${B.e(c.services.copy_6)}</span>
            <span class="svc__desc" data-es="${B.e(c.services.copy_7_es)}">${B.e(c.services.copy_7)}</span>
          </li>
          <li class="svc__item">
            <span class="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"></path></svg></span>
            <span class="svc__name" data-es="${B.e(c.services.copy_8_es)}">${B.e(c.services.copy_8)}</span>
            <span class="svc__desc" data-es="${B.e(c.services.copy_9_es)}">${B.e(c.services.copy_9)}</span>
          </li>
          <li class="svc__item">
            <span class="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"></path><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"></path><path d="M9 21v-6h6v6"></path></svg></span>
            <span class="svc__name" data-es="${B.e(c.services.copy_10_es)}">${B.e(c.services.copy_10)}</span>
            <span class="svc__desc" data-es="${B.e(c.services.copy_11_es)}">${B.e(c.services.copy_11)}</span>
          </li>
          <li class="svc__item">
            <span class="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg></span>
            <span class="svc__name" data-es="${B.e(c.services.copy_12_es)}">${B.e(c.services.copy_12)}</span>
            <span class="svc__desc" data-es="${B.e(c.services.copy_13_es)}">${B.e(c.services.copy_13)}</span>
          </li>
          <li class="svc__item">
            <span class="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg></span>
            <span class="svc__name" data-es="${B.e(c.services.copy_14_es)}">${B.e(c.services.copy_14)}</span>
            <span class="svc__desc" data-es="${B.e(c.services.copy_15_es)}">${B.e(c.services.copy_15)}</span>
          </li>
          <li class="svc__item">
            <span class="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg></span>
            <span class="svc__name" data-es="${B.e(c.services.copy_16_es)}">${B.e(c.services.copy_16)}</span>
            <span class="svc__desc" data-es="${B.e(c.services.copy_17_es)}">${B.e(c.services.copy_17)}</span>
          </li>
          <li class="svc__item">
            <span class="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="13" cy="4" r="2"></circle><path d="m8 22 2.5-7M14 22l-2-5.5-3-2 1.5-5.5 3.5 1 2 3"></path><path d="M10.5 9 8 11l-1.5 4"></path></svg></span>
            <span class="svc__name" data-es="${B.e(c.services.copy_18_es)}">${B.e(c.services.copy_18)}</span>
            <span class="svc__desc" data-es="${B.e(c.services.copy_19_es)}">${B.e(c.services.copy_19)}</span>
          </li>
          <li class="svc__item">
            <span class="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4.5a3 3 0 0 0-5.7 1.3A3 3 0 0 0 5 11.5a3.5 3.5 0 0 0 1.5 6.3A3 3 0 0 0 12 19.5M12 4.5a3 3 0 0 1 5.7 1.3A3 3 0 0 1 19 11.5a3.5 3.5 0 0 1-1.5 6.3A3 3 0 0 1 12 19.5M12 4.5v15"></path></svg></span>
            <span class="svc__name" data-es="${B.e(c.services.copy_20_es)}">${B.e(c.services.copy_20)}</span>
            <span class="svc__desc" data-es="${B.e(c.services.copy_21_es)}">${B.e(c.services.copy_21)}</span>
          </li>
          <li class="svc__item">
            <span class="svc__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 13.5c1.4-1.3 3.5-3 3.5-5a2.5 2.5 0 0 0-5 0 2.5 2.5 0 0 0-5 0c0 2 2.1 3.7 3.5 5l1.5 1.4Z" transform="translate(1.5 -1)"></path><path d="M4 19c3 2.2 13 2.2 16 0M4 19v-3M20 19v-3"></path></svg></span>
            <span class="svc__name" data-es="${B.e(c.services.copy_22_es)}">${B.e(c.services.copy_22)}</span>
            <span class="svc__desc" data-es="${B.e(c.services.copy_23_es)}">${B.e(c.services.copy_23)}</span>
          </li>
        </ul>

        <div class="svc__side">
          <div class="svc__photos">
            <figure class="p1">${image('meal')}</figure>
            <figure class="p2">${image('hands')}</figure>
          </div>
          <div class="svc__foot">
            <p data-es="${B.e(c.services.copy_24_es)}">${B.e(c.services.copy_24)}</p>
            <a class="call" href="${B.e(B.telHref(c.contact.phone))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"></path></svg>${B.e(c.contact.phone)}</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════ ABOUT: a note from Emma ═══════════ -->
  <section class="about" id="about" aria-labelledby="about-title">
    <div class="wrap about__grid">
      <div class="about__media reveal">
        <div class="about__photo">
          ${image('walk')}
        </div>
        <div class="mission">
          <span class="eyebrow" data-es="${B.e(c.about.copy_1_es)}">${B.e(c.about.copy_1)}</span>
          <p data-es="${B.e(c.about.copy_2_es)}">${B.e(c.about.copy_2)}</p>
        </div>
        <p class="about__caption">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          <span data-es="${B.e(c.about.copy_3_es)}">${B.e(c.about.copy_3)}</span>
        </p>
      </div>

      <div class="letter reveal" data-delay="1">
        <span class="eyebrow" data-es="${B.e(c.about.copy_4_es)}">${B.e(c.about.copy_4)}</span>
        <h2 id="about-title" data-es="${B.e(c.about.copy_5_es)}">${B.e(c.about.copy_5)}</h2>
        <p data-es="${B.e(c.about.copy_6_es)}">${B.e(c.about.copy_6)}</p>
        <p data-es="${B.e(c.about.copy_7_es)}">${B.e(c.about.copy_7)}</p>
        <p data-es="${B.e(c.about.copy_8_es)}">${B.e(c.about.copy_8)}</p>
        <p data-es="${B.e(c.about.copy_9_es)}">${B.e(c.about.copy_9)}</p>
        <p data-es="${B.e(c.about.copy_10_es)}">${B.e(c.about.copy_10)}</p>
        <p class="letter__sig">
          <span class="script" aria-hidden="true">${B.e(c.about.copy_12)}</span>
          <span data-es="${B.e(c.about.copy_11_es)}">${B.e(c.about.copy_11)}</span>
        </p>
      </div>
    </div>
  </section>

  <!-- ═══════════ HOW IT WORKS ═══════════ -->
  <section id="how" aria-labelledby="how-title">
    <div class="wrap">
      <div class="sec-head reveal">
        <span class="eyebrow" data-es="${B.e(c.process.copy_1_es)}">${B.e(c.process.copy_1)}</span>
        <h2 id="how-title" data-es="${B.e(c.process.copy_2_es)}">${B.e(c.process.copy_2)}</h2>
      </div>
      <ol class="steps">
        <li class="reveal">
          <h3 data-es="${B.e(c.process.copy_3_es)}">${B.e(c.process.copy_3)}</h3>
          <p data-es="${B.e(c.process.copy_4_es)}">${B.e(c.process.copy_4)}</p>
          <a class="btn btn--ghost" href="${B.e(B.telHref(c.contact.phone))}" data-es="${B.e(c.process.copy_5_es)}">${B.e(c.process.copy_5)}</a>
        </li>
        <li class="reveal" data-delay="1">
          <h3 data-es="${B.e(c.process.copy_6_es)}">${B.e(c.process.copy_6)}</h3>
          <p data-es="${B.e(c.process.copy_7_es)}">${B.e(c.process.copy_7)}</p>
        </li>
        <li class="reveal" data-delay="2">
          <h3 data-es="${B.e(c.process.copy_8_es)}">${B.e(c.process.copy_8)}</h3>
          <p data-es="${B.e(c.process.copy_9_es)}">${B.e(c.process.copy_9)}</p>
        </li>
      </ol>

      <div class="spot">
        <article class="spot--tint reveal">
          <span class="eyebrow" data-es="${B.e(c.process.copy_10_es)}">${B.e(c.process.copy_10)}</span>
          <h3 data-es="${B.e(c.process.copy_11_es)}">${B.e(c.process.copy_11)}</h3>
          <p data-es="${B.e(c.process.copy_12_es)}">${B.e(c.process.copy_12)}</p>
        </article>
        <article class="reveal" data-delay="1">
          <span class="eyebrow" data-es="${B.e(c.process.copy_13_es)}">${B.e(c.process.copy_13)}</span>
          <h3 data-es="${B.e(c.process.copy_14_es)}">${B.e(c.process.copy_14)}</h3>
          <p data-es="${B.e(c.process.copy_15_es)}">${B.e(c.process.copy_15)}</p>
        </article>
      </div>
    </div>
  </section>

  <!-- ═══════════ CONTACT ═══════════ -->
  <section class="contact" id="contact" aria-labelledby="contact-title">
    <div class="wrap">
      <div class="contact__panel reveal">
        <div class="contact__copy">
          <span class="eyebrow" data-es="${B.e(c.contact.copy_1_es)}">${B.e(c.contact.copy_1)}</span>
          <h2 id="contact-title" class="script" data-es="${B.e(c.contact.copy_2_es)}">${B.e(c.contact.copy_2)}</h2>
          <p data-es="${B.e(c.contact.copy_3_es)}">${B.e(c.contact.copy_3)}</p>
          <a class="contact__phone" href="${B.e(B.telHref(c.contact.phone))}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"></path></svg>${B.e(c.contact.phone)}</a>
          <div class="contact__actions">
            <a class="btn btn--light" href="${B.e(B.smsHref(c.contact.phone))}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span data-es="${B.e(c.contact.copy_4_es)}">${B.e(c.contact.copy_4)}</span>
            </a>
            <a class="btn btn--outline-light" href="${B.e(`mailto:${c.contact.email}`)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
              <span data-es="${B.e(c.contact.copy_5_es)}">${B.e(c.contact.copy_5)}</span>
            </a>
          </div>
          <div class="contact__meta">
            <div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
              <a href="${B.e(`mailto:${c.contact.email}`)}">${B.e(c.contact.email)}</a>
            </div>
            <div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span data-es="${B.e(c.contact.copy_6_es)}">${B.e(c.contact.copy_6)}</span>
            </div>
          </div>
          ${socialLinks('contact-social-title')}
        </div>
        <div class="contact__photo">
          ${image('hero', { eager: true })}
        </div>
      </div>
    </div>
  </section>

</main>

<footer>
  <div class="wrap">
    <div class="foot__badges reveal">
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg><span data-es="${B.e(c.footer.copy_1_es)}">${B.e(c.footer.copy_1)}</span></span>
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg><span data-es="${B.e(c.footer.copy_2_es)}">${B.e(c.footer.copy_2)}</span></span>
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 9-8 9 8"></path><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"></path><path d="M12 17.5c1-.9 2.5-2.1 2.5-3.5a1.75 1.75 0 0 0-3.5 0 1.75 1.75 0 0 0-3.5 0c0 1.4 1.5 2.6 2.5 3.5l1 .9Z" transform="translate(1 -1)"></path></svg><span data-es="${B.e(c.footer.copy_3_es)}">${B.e(c.footer.copy_3)}</span></span>
    </div>
    <div class="foot__grid">
      <div>
        ${image('logo', { cls: 'foot__logo', sizes: '150px' })}
      </div>
      <div class="foot__contact">
        <a href="${B.e(B.telHref(c.contact.phone))}">${B.e(c.contact.phone)}</a>
        <a href="${B.e(`mailto:${c.contact.email}`)}">${B.e(c.contact.email)}</a>
        ${socialLinks('footer-social-title')}
      </div>
      <p class="foot__legal"><span>${B.e(c.footer.copy_5)}</span><br>${B.e(c.contact.email)}</p>
    </div>
  </div>
</footer>

<div class="callbar" aria-hidden="false">
  <a class="btn btn--primary" href="${B.e(B.telHref(c.contact.phone))}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"></path></svg>
    <span data-es="${B.e(c.footer.copy_4_es)}">${B.e(c.footer.copy_4)}</span>
  </a>
</div>





  ${B.footerLinks()}
  ${views.length ? B.mediaJson(views) + B.lightboxHtml() : ''}
${B.siteScript()}
</body></html>`;
}
