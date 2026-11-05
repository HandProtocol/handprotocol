import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedMedia } from '../netlify/functions/lib/config.mjs';
import { DEFAULT_CONTENT, ROUTES, renderPage, sanitize } from '../netlify/functions/lib/site.mjs';

const render = (route = '/', content = DEFAULT_CONTENT, media = seedMedia()) =>
  renderPage({ content: sanitize(content), media, origin: 'https://example.test', route });

test('the pack serves the homepage and three practice pages', () => {
  assert.deepEqual(ROUTES, ['/', '/body', '/mind', '/pets']);
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
  assert.equal(html.includes('handprotocol.org/threehandshealing'), false);
});

test('practice pages: own title, canonical, sessions with prices, both booking doors, back link', () => {
  const body = render('/body');
  assert.match(body, /<title>Energy Healing, Bodywork &amp; Qi Gong in Texas \| Three Hands Healing<\/title>/);
  assert.match(body, /rel="canonical" href="[^"]*\/body"/);
  assert.match(body, /<h1 id="page-title">Where pain lives, ease can return\.<\/h1>/);
  assert.equal((body.match(/class="offer"/g) || []).length, 4);
  assert.match(body, /Tantra meditation practices/);
  assert.match(body, /Book by email for now\.[\s\S]{0,400}Online booking is coming soon\./, 'no Calendly links yet: the booking block says coming soon');
  assert.equal(body.includes('Two ways to start'), false);
  assert.match(body, /href="\/#practices"/);
  assert.match(body, /href="\/#about"/, 'nav links point home');
  assert.match(body, /maria-arch-palms\.jpg/);

  const mind = render('/mind');
  assert.match(mind, /class="sec pquote"/);
  assert.match(mind, /phero__arch[\s\S]{0,400}maria-arch-reach\.jpg/);
  assert.match(mind, /call or text 988/);

  const pets = render('/pets');
  assert.match(pets, /pets-dog-cat\.jpg/);
  assert.match(pets, /srcset="[^"]*netlify\/images\?url=%2Fimg%2Fphotos%2Fpets-dog-cat\.jpg/, 'shipped fallback photos go through the Image CDN');
  assert.match(pets, /og:image" content="[^"]*w=1200&amp;h=630/, 'and get the 1200×630 share crop');
  assert.equal(pets.includes('Secure booking and payment'), false, 'no padlock while the button is only a mailto');
  assert.equal((pets.match(/class="circle"/g) || []).length, 3);
  assert.equal(pets.includes('class="offer"'), false, 'one session = the booking card, no grid');
  assert.match(pets, /Book &amp; share/);
});

test('every Book button follows the session link, then the booking link, then phone, then the anchor', () => {
  const plain = render('/', { contact: { email: '' } });
  assert.match(plain, /href="#book">Book a session/);
  const mail = render('/');
  assert.equal(/class="btn[^"]*" href="mailto:[^"]*">Book/.test(mail), false, 'Book buttons never open email');
  assert.match(mail, /href="#book">Book a session/, 'without Calendly, Book buttons go to the Book block');
  assert.match(mail, /class="btn btn--gold" href="mailto:maria@3handshealing\.com">Email to book/);
  assert.match(mail, /class="book__body">Online booking is coming soon\. For now, just email me/);
  assert.match(render('/body'), /class="btn btn--gold" href="mailto:maria@3handshealing\.com">Email to book/);
  assert.match(render('/body'), /class="pcard__fine"><a href="mailto:maria@3handshealing\.com">/);
  const phone = render('/', { contact: { phone: '(512) 555-0100' } });
  assert.match(phone, /class="btn btn--gold" href="tel:5125550100"/);
  const booked = render('/', { contact: { booking_url: 'https://calendly.com/maria', phone: '(512) 555-0100' } });
  assert.match(booked, /class="btn btn--gold" href="https:\/\/calendly\.com\/maria" target="_blank"/);
  assert.match(booked, /class="btn" href="tel:5125550100"/);

  const own = sanitize(DEFAULT_CONTENT);
  own.page_pets.sessions[0].book_url = 'https://calendly.com/maria/pet-session';
  own.page_pets.sessions[0].price = '$85';
  own.contact.intro_call_url = 'https://calendly.com/maria/intro';
  const pets = renderPage({ content: own, media: seedMedia(), route: '/pets' });
  assert.match(pets, /href="https:\/\/calendly\.com\/maria\/pet-session" target="_blank" rel="noopener">Book now/);
  assert.match(pets, /href="https:\/\/calendly\.com\/maria\/intro" target="_blank"/);
  assert.match(pets, /Two ways to start\./, 'once a Calendly link is set, the coming-soon note disappears by itself');
  assert.equal(pets.includes('Online booking is coming soon'), false);
  assert.equal(sanitize({ contact: { email: 'x@y.co' } }).contact.coming_soon.startsWith('Online booking is coming soon'), true, 'a stored contact section without the new field gets its default');
  assert.match(pets, /<span class="price">\$85<\/span>/);
  assert.match(pets, /Secure booking and payment/, 'padlock once the button opens Calendly');
  assert.match(pets, /<nav class="stickybar"/);
  const offPage = render('/body', { contact: { email: '' } });
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
