import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedMedia } from '../netlify/functions/lib/config.mjs';
import { DEFAULT_CONTENT, ROUTES, renderPage, sanitize } from '../netlify/functions/lib/site.mjs';

const render = (route = '/', content = DEFAULT_CONTENT, media = seedMedia()) =>
  renderPage({ content: sanitize(content), media, origin: 'https://example.test', route });
// No booking page set: the site falls back to email (the state before Kohsi).
const NO_BOOKING = { contact: { kohsi_url: '' } };

test('the pack serves the homepage, three practice pages, all services and the questions', () => {
  assert.deepEqual(ROUTES, ['/', '/body', '/mind', '/pets', '/services', '/faq']);
});

test('all services: every session on one page with its Book link, a door to each practice page and to the FAQ', () => {
  const html = render('/services');
  assert.match(html, /rel="canonical" href="[^"]*\/services"/);
  assert.match(html, /<h1 id="page-title">All services\.<\/h1>/);
  const names = ['/body', '/mind', '/pets'].flatMap((r) => DEFAULT_CONTENT[{ '/body': 'page_body', '/mind': 'page_mind', '/pets': 'page_pets' }[r]].sessions.map((s) => s.name));
  for (const n of names) assert.ok(html.includes(`>${n.replace(/&/g, '&amp;')}</h3>`), n);
  for (const k of ['energy-healing', 'bodywork', 'chakra', 'qigong', 'eft', 'constellations', 'emotional-release', 'spiritual-counseling', 'pet-distance']) {
    assert.match(html, new RegExp(`href="https://book\\.3handshealing\\.com/\\?service=${k}"`), k);
  }
  for (const r of ['/body', '/mind', '/pets']) assert.match(html, new RegExp(`class="back svcgroup__more" href="${r}"`));
  assert.match(html, /href="\/faq">Find out more</);
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique across the three groups');
});

test('questions page: owner-editable items as native disclosures, FAQPage data, intro call + all services', () => {
  const html = render('/faq');
  assert.match(html, /rel="canonical" href="[^"]*\/faq"/);
  assert.match(html, /<title>Questions about sessions \| Three Hands Healing<\/title>/);
  assert.equal((html.match(/<details class="faq__item"/g) || []).length, DEFAULT_CONTENT.faq.items.length);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /href="https:\/\/book\.3handshealing\.com\/\?service=intro-call"/);
  assert.match(html, /href="\/services">See all services</);
  assert.equal(html.includes('massage'), false, 'never "massage"');
  const own = sanitize({ faq: { items: [{ q: 'Do you <b>travel</b>?', a: 'Yes.' }] } });
  const one = renderPage({ content: own, media: seedMedia(), route: '/faq' });
  assert.equal((one.match(/<details class="faq__item"/g) || []).length, 1);
  assert.ok(one.includes('Do you &lt;b&gt;travel&lt;/b&gt;?'), 'questions are escaped');
});

const SIGNED = { setup: { signoff_pages: true } };

test('sign-off: before Maria ticks it, nothing links to /services or /faq and both pages are noindex', () => {
  for (const r of ['/', '/body', '/mind', '/pets', '/services', '/faq']) {
    const page = render(r);
    const nav = page.match(/<nav class="nav"[\s\S]*?<\/nav>/)[0];
    assert.equal(/href="\/(services|faq)"/.test(nav), false, `${r} nav`);
    assert.equal(page.includes('foot__pages'), false, `${r} footer`);
  }
  assert.equal(render('/').includes('class="allrow"'), false, 'no homepage buttons');
  for (const r of ['/services', '/faq']) assert.match(render(r), /<meta name="robots" content="noindex">/, r);
  for (const r of ['/', '/body']) assert.equal(render(r).includes('content="noindex"'), false, r);
});

test('sign-off: once ticked, "See all services" and "Find out more" show on the homepage, nav and footer, and the pages index', () => {
  const html = render('/', SIGNED);
  assert.match(html, /class="allrow"[\s\S]*?href="\/services"[\s\S]*?href="\/faq">Find out more</);
  for (const r of ['/', '/body', '/services', '/faq']) {
    const page = render(r, SIGNED);
    assert.match(page, /<nav class="nav"[\s\S]*?href="\/services"[\s\S]*?href="\/faq"/, r);
    assert.match(page, /class="foot__links foot__pages"/, r);
    assert.equal(page.includes('content="noindex"'), false, r);
  }
  assert.match(render('/faq', SIGNED), /href="\/faq" aria-current="page"/);
});

test('sign-off is the first Setup step and links to both pages and the FAQ editor', async () => {
  const { CHECKLIST } = await import('../site/checklist.mjs');
  assert.equal(CHECKLIST[0].id, 'signoff_pages');
  assert.deepEqual(CHECKLIST[0].actions.map((a) => a.target), ['/faq', '/services', 'faq']);
  assert.equal(CHECKLIST[0].check, undefined, 'only Maria can tick it');
});

test('homepage: welcome before "I’m Maria", three teasers linking to their pages, brand lockup, footer links', () => {
  const html = render('/');
  for (const id of ['id="top"', 'id="alone"', 'id="practices"', 'id="session"', 'id="about"', 'id="book"']) assert.ok(html.includes(id), id);
  assert.ok(html.indexOf('You don’t have to walk this alone.') < html.indexOf('I’m Maria.'), 'welcome comes first');
  assert.match(html, /<p class="eyebrow">Welcome<\/p>/);
  assert.equal(html.includes('You don’t have to navigate this alone—'), false, 'the line moved out of the Maria paragraph');
  for (const r of ['/body', '/mind', '/pets']) assert.match(html, new RegExp(`class="btn btn--gold teaser__more" href="${r}"`));
  assert.match(html, /teaser teaser--flip/);
  assert.match(html, /pets-dog-cat\.jpg/);
  assert.match(html, /teaser__arch[\s\S]{0,400}maria-arch-standing\.jpg/);
  assert.match(html, /maria-arch-reach\.jpg/);
  assert.equal(html.includes('maria-eft-tapping.jpg'), false);
  assert.match(html, /class="introbar"/);
  assert.match(html, /class="mark brand__mark"/);
  assert.match(html, /hero__l1[^<]*Feel good in your body,/);
  assert.match(html, /HealthAndBeautyBusiness/);
  assert.match(html, /og:site_name" content="Three Hands Healing"/);
  assert.equal(html.includes('handprotocol.org/3handshealing'), false);
});

test('practice pages: own title, canonical, sessions with prices, both booking doors, back link', () => {
  const body = render('/body', NO_BOOKING);
  assert.match(body, /<title>Energy Healing, Bodywork &amp; Qi Gong in Texas \| Three Hands Healing<\/title>/);
  assert.match(body, /rel="canonical" href="[^"]*\/body"/);
  assert.match(body, /<h1 id="page-title">Where pain lives, ease can return\.<\/h1>/);
  assert.equal((body.match(/class="offer"/g) || []).length, 4);
  assert.match(body, /Tantra meditation practices/);
  assert.match(body, /Book by email for now\.[\s\S]{0,400}Online booking is coming soon\./, 'no booking page: the booking block says coming soon');
  assert.equal(body.includes('Two ways to start'), false);
  assert.match(body, /href="\/#practices"/);
  assert.match(body, /href="\/#about"/, 'nav links point home');
  assert.match(body, /maria-arch-palms\.jpg/);

  const mind = render('/mind');
  assert.match(mind, /class="sec pquote"/);
  assert.match(mind, /phero__arch[\s\S]{0,400}maria-arch-reach\.jpg/);
  assert.match(mind, /call or text 988/);

  const pets = render('/pets', NO_BOOKING);
  assert.match(pets, /pets-dog-cat\.jpg/);
  assert.match(pets, /srcset="[^"]*netlify\/images\?url=%2Fimg%2Fphotos%2Fpets-dog-cat\.jpg/, 'shipped fallback photos go through the Image CDN');
  assert.match(pets, /og:image" content="[^"]*w=1200&amp;h=630/, 'and get the 1200×630 share crop');
  assert.equal(pets.includes('Secure booking and payment'), false, 'no padlock while the button is only a mailto');
  assert.equal((pets.match(/class="circle"/g) || []).length, 3);
  assert.equal(pets.includes('class="offer"'), false, 'one session = the booking card, no grid');
  assert.match(pets, /Book &amp; share/);
});

test('every Book button follows the session link, then the booking link, then phone, then the anchor', () => {
  const plain = render('/', { contact: { email: '', kohsi_url: '' } });
  assert.match(plain, /href="#book">Book a session/);
  const mail = render('/', NO_BOOKING);
  assert.equal(/class="btn[^"]*" href="mailto:[^"]*">Book/.test(mail), false, 'Book buttons never open email');
  assert.match(mail, /href="#book">Book a session/, 'without a booking page, Book buttons go to the Book block');
  assert.match(mail, /class="btn btn--gold" href="mailto:maria@3handshealing\.com">Email to book/);
  assert.match(mail, /class="book__body">Online booking is coming soon\. For now, just email me/);
  assert.match(render('/body', NO_BOOKING), /class="btn btn--gold" href="mailto:maria@3handshealing\.com">Email to book/);
  assert.match(render('/body', NO_BOOKING), /class="pcard__fine"><a href="mailto:maria@3handshealing\.com">/);
  const phone = render('/', { contact: { phone: '(512) 555-0100', kohsi_url: '' } });
  assert.match(phone, /class="btn btn--gold" href="tel:5125550100"/);
  const booked = render('/', { contact: { booking_url: 'https://calendly.com/maria', phone: '(512) 555-0100' } });
  assert.match(booked, /class="btn btn--gold" href="https:\/\/calendly\.com\/maria">/, 'another booking link opens in this tab, with no booking sheet');
  assert.match(booked, /class="btn" href="tel:5125550100"/);

  const own = sanitize(DEFAULT_CONTENT);
  own.page_pets.sessions[0].book_url = 'https://calendly.com/maria/pet-session';
  own.page_pets.sessions[0].price = '$85';
  own.contact.intro_call_url = 'https://calendly.com/maria/intro';
  const pets = renderPage({ content: own, media: seedMedia(), route: '/pets' });
  assert.match(pets, /href="https:\/\/calendly\.com\/maria\/pet-session">Book now/);
  assert.match(pets, /href="https:\/\/calendly\.com\/maria\/intro">/);
  assert.match(pets, /Two ways to start\./, 'once a link is set, the coming-soon note disappears by itself');
  assert.equal(pets.includes('Online booking is coming soon'), false);
  assert.equal(sanitize({ contact: { email: 'x@y.co' } }).contact.coming_soon.startsWith('Online booking is coming soon'), true, 'a stored contact section without the new field gets its default');
  assert.match(pets, /<span class="price">\$85<\/span>/);
  assert.match(pets, /Secure booking and payment/, 'padlock once the button opens a booking page');
  assert.match(pets, /<nav class="stickybar"/);
  const offPage = render('/body', { contact: { email: '', kohsi_url: '' } });
  assert.match(offPage, /href="\/#book"/, 'without links, practice pages fall back to the homepage Book block');
});

test('escapes owner text and never emits raw markup from content', () => {
  const html = render('/', { hero: { headline: '<script>x</script>\nline' }, hello: { salute: '"><img src=x>' } });
  assert.equal(html.includes('<script>x</script>'), false);
  assert.equal(html.includes('<img src=x>'), false);
  const page = render('/mind', { page_mind: { title: '<b>x</b>', sessions: [{ name: '<i>y</i>', book_url: 'javascript:alert(1)' }] } });
  assert.equal(page.includes('<b>x</b>'), false);
  assert.equal(page.includes('javascript:alert'), false);
});

test('empty content hides sections; the Book block always renders', () => {
  const html = render('/', { welcome: { heading: '' }, session: { steps: [] }, meet: { heading: '' }, hello: { body: '' } });
  for (const id of ['id="alone"', 'id="session"', 'id="about"']) assert.equal(html.includes(id), false, id);
  assert.match(html, /id="book"/);
});

test('photos by Category win over the shipped defaults; Featured drives the hero', () => {
  const media = seedMedia();
  media.find((m) => m.path.includes('maria-forest-kimono')).category = 'Body';
  media[0].featured = false;
  media[3].featured = true; // eft-tapping becomes the hero
  const home = render('/', DEFAULT_CONTENT, media);
  assert.match(home, /hero__arch[\s\S]{0,400}maria-eft-tapping\.jpg/);
  assert.match(home, /meet__arch[\s\S]{0,400}maria-meadow-smile\.jpg/);
  const body = render('/body', DEFAULT_CONTENT, media);
  assert.match(body, /phero__arch[\s\S]{0,400}maria-forest-kimono\.jpg/);
  assert.equal(body.includes('maria-arch-palms.jpg'), false);
});

test('the footer carries the maker credit but no owner sign-in link', () => {
  for (const route of ['/', '/body', '/mind', '/pets']) {
    const html = render(route);
    assert.equal(html.includes('Owner sign in'), false, route);
    assert.equal(html.includes('href="/admin/"'), false, route);
    assert.match(html, /<p class="foot__links"><a href="https:\/\/handprotocol\.org" rel="noopener">Made by HAND<\/a><\/p>/);
  }
});

test('hiding every practice page hides the section and its nav link', () => {
  const html = render('/', { page_body: { title: '' }, page_mind: { title: '' }, page_pets: { title: '' } });
  assert.equal(html.includes('id="practices"'), false);
  assert.equal(html.includes('href="#practices">Practices'), false);
});

test('Kohsi: every Book button opens her booking page on the right session', () => {
  const base = 'https://book.3handshealing.com/';
  assert.equal(sanitize({ contact: { email: 'x@y.co' } }).contact.kohsi_url, base, 'a stored contact section without the field gets the booking page');
  const home = render('/');
  assert.match(home, /class="btn btn--gold" href="https:\/\/book\.3handshealing\.com\/" data-kohsi="">/, 'general Book = her page, no preselection');
  assert.match(home, /href="https:\/\/book\.3handshealing\.com\/\?service=intro-call" data-kohsi="intro-call"/, 'intro call');
  assert.equal(home.includes('Online booking is coming soon'), false);
  const want = {
    '/body': ['energy-healing', 'bodywork', 'chakra', 'qigong'],
    '/mind': ['eft', 'constellations', 'emotional-release', 'spiritual-counseling'],
    '/pets': ['pet-distance'],
  };
  for (const [route, keys] of Object.entries(want)) {
    const html = render(route);
    for (const k of keys) assert.match(html, new RegExp(`href="https://book\\.3handshealing\\.com/\\?service=${k}" data-kohsi="${k}"`), `${route} ${k}`);
    assert.equal(html.includes('Online booking is coming soon'), false, route);
    assert.match(html, /Secure booking and payment/, `${route} padlock`);
  }
  const body = render('/body');
  assert.match(body, /href="https:\/\/book\.3handshealing\.com\/\?service=bodywork" data-kohsi="bodywork">Book 60 min</, 'bodywork 60');
  assert.match(body, /href="https:\/\/book\.3handshealing\.com\/\?service=bodywork-90" data-kohsi="bodywork-90">Book 90 min</, 'bodywork 90');
  const renamed = sanitize(DEFAULT_CONTENT);
  renamed.page_pets.sessions[0].name = 'Something new';
  assert.match(renderPage({ content: renamed, media: seedMedia(), route: '/pets' }), /href="https:\/\/book\.3handshealing\.com\/" data-kohsi="">Book now/, 'an unknown session opens the page without a preselection');
  const own = sanitize(DEFAULT_CONTENT);
  own.page_mind.sessions[0].book_url = 'https://example.com/eft';
  assert.match(renderPage({ content: own, media: seedMedia(), route: '/mind' }), /href="https:\/\/example\.com\/eft"/, 'a session link still wins');
});

test('booking sheet: no booking link opens a new tab; every page carries the sheet, the key and the widget address', () => {
  for (const route of ['/', '/body', '/mind', '/pets', '/services', '/faq']) {
    const html = render(route);
    const book = [...html.matchAll(/<a\b[^>]*href="https:\/\/book\.3handshealing\.com[^"]*"[^>]*>/g)].map((m) => m[0]);
    assert.ok(book.length > 0, `${route} has Book links`);
    for (const a of book) {
      assert.equal(a.includes('target='), false, `${route}: ${a}`);
      assert.match(a, /data-kohsi="[a-z0-9-]*"/, `${route}: ${a}`);
    }
    assert.equal((html.match(/<dialog class="booksheet" id="booksheet"/g) || []).length, 1, `${route} one sheet`);
    assert.match(html, /<dialog[^>]*data-key="kohsi_pk_live_[A-Za-z0-9_-]+"[^>]*data-api="https:\/\/book\.3handshealing\.com"/, route);
    assert.match(html, /aria-labelledby="booksheet-title"/);
    assert.match(html, /<button class="booksheet__close" type="button" data-booksheet-close aria-label="Close booking">/, `${route} close button`);
    assert.match(html, /<div class="booksheet__leave" data-booksheet-leave role="alertdialog"[^>]*hidden>[\s\S]*data-booksheet-stay>Keep booking<[\s\S]*data-booksheet-go>Leave</, `${route} asks before leaving a booking under way`);
    assert.equal(html.includes('kohsi_sk_'), false, 'never a secret key');
    assert.equal(/<script[^>]*widget\.js/.test(html), false, `${route}: widget.js is not on first paint`);
    assert.match(html, /<dialog[\s\S]*<\/dialog>\s*<script src="\/assets\/site\.js/, `${route}: the sheet sits before site.js`);
  }
  const one = render('/pets');
  assert.match(one, /href="https:\/\/book\.3handshealing\.com\/\?service=pet-distance" data-kohsi="pet-distance">Book now/);
});

test('booking sheet: without a booking page there is no sheet; an older booking link stays a plain same-tab link', () => {
  const none = render('/', NO_BOOKING);
  assert.equal(none.includes('id="booksheet"'), false);
  assert.equal(none.includes('data-kohsi'), false);
  const other = render('/', { contact: { booking_url: 'https://calendly.com/maria' } });
  assert.match(other, /href="https:\/\/calendly\.com\/maria">/);
  assert.equal(/href="https:\/\/calendly[^"]*" data-kohsi/.test(other), false, 'only her Kohsi page opens in the sheet');
  assert.match(render('/', { contact: { instagram: 'threehandshealing' } }), /instagram\.com\/threehandshealing[^"]*" rel="noopener" target="_blank">Instagram/, 'Instagram keeps its new tab');
});

test('the website editor links to the booking console (one back end, two halves)', async () => {
  const { renderAdminPage } = await import('../netlify/functions/lib/admin-page.mjs');
  const { normalizeConfig } = await import('../netlify/functions/lib/config.mjs');
  assert.match(renderAdminPage(), /href="https:\/\/admin\.3handshealing\.com\/console" target="_blank" rel="noopener">Bookings ↗/);
  const cfg = normalizeConfig({ slug: 'x-y', name: 'X', theme: { bg: '#000', ink: '#fff', accent: '#f00' }, adminLinks: [{ label: 'Bad', href: 'javascript:alert(1)' }, { label: 'Ok', href: 'https://a.example/c' }] });
  assert.deepEqual(cfg.adminLinks, [{ label: 'Ok', href: 'https://a.example/c' }]);
});
