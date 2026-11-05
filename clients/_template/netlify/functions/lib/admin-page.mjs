// The owner editor's HTML, server-rendered so the site's theme, fonts, name
// and logo are in the first byte (no flash of a default look) and the asset
// version comes from site.config.mjs. Behaviour lives in public/admin/admin.js,
// styling in public/admin/admin.css (which reads only the injected tokens).
//
// One portal, phone first (2026-10-15): sign-in lands on Home (what needs you,
// the next job, setup left, Stripe status, a tile for every place); a menu
// lists everything in groups with a Find box (a rail on a computer, a bottom
// sheet on a phone); a bottom dock on a phone keeps Home / Bookings / Edit /
// Photos / Menu one tap away. Places are routes (#home, #bookings,
// #content/<section>, #look, #payments …) so the phone's back button works.

import { BOOKING, PAYMENTS, config } from './config.mjs';
import { escapeHtml as e, faviconLink } from './html.mjs';
import { adminThemeVars } from './theme.mjs';
import { checklistHtml, checklistItems, looksHtml } from './checklist.mjs';
import { TIME_OPTIONS } from './booking.mjs';

function fontLinks() {
  if (!config.fonts.googleCss) return '';
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${e(config.fonts.googleCss)}" rel="stylesheet">`;
}

// The Bookings tab (config.booking, request mode). Lists are rendered by
// admin.js from /api/admin/bookings; the shell, the add-by-hand form and the
// block-a-day form are static.
function bookingsPanel() {
  const times = TIME_OPTIONS.map((o) => `<option value="${e(o.value)}">${e(o.label)}</option>`).join('');
  const durations = [[30, '30 min'], [45, '45 min'], [60, '1 hour'], [90, '1½ hours'], [120, '2 hours'], [180, '3 hours'], [240, '4 hours'], [480, 'All day']].map(([v, l]) => `<option value="${v}"${v === 60 ? ' selected' : ''}>${l}</option>`).join('');
  return `<!-- Bookings -->
      <section class="panel panel--single" id="panel-bookings" hidden>
        <div class="content bookings">
          <header class="panel__head">
            <div>
              <h2>Bookings</h2>
              <p class="muted">Requests wait for you here. Confirm one as asked, at another time, or decline it; the customer is emailed if they left an email, and you are told when they did not. Several people may ask for the same time: the chips tell you.</p>
              <p class="muted bk-notify" id="bknotify" hidden></p>
            </div>
            <div class="row">
              <a class="btn btn--ghost btn--sm" id="bkfeed" href="#" hidden>Add to my phone's calendar</a>
              <button class="btn btn--ghost btn--sm" id="bkblockbtn" type="button">Block a day</button>
              <button class="btn btn--primary btn--sm" id="bkaddbtn" type="button">+ Add a booking</button>
            </div>
          </header>

          <form class="bk-form" id="bkadd" hidden>
            <h3>Add a booking by hand</h3>
            <p class="muted tiny">A walk-in or a phone call. Lands under Confirmed; the customer gets the confirmation email if you add one.</p>
            <div class="grid2">
              <label class="field"><span>Service</span><select name="service" id="bkaddservice"></select></label>
              <label class="field"><span>Name</span><input type="text" name="name" required maxlength="80"></label>
              <label class="field"><span>Day</span><input type="date" name="date" required></label>
              <label class="field"><span>Time</span><select name="time">${times}</select></label>
              <label class="field"><span>How long</span><select name="duration">${durations}</select></label>
              <label class="field"><span>Phone</span><input type="tel" name="phone" maxlength="24"></label>
              <label class="field"><span>Email (optional)</span><input type="email" name="email" maxlength="120"></label>
              <label class="field"><span>Language</span><select name="lang"><option value="en">English</option><option value="es">Español</option></select></label>
              <label class="field field--wide"><span>Where</span><input type="text" name="address" maxlength="160" placeholder="Address"></label>
              <label class="field"><span>City</span><input type="text" name="city" id="bkaddcity" maxlength="40" list="bkcities"><datalist id="bkcities"></datalist></label>
              <div class="field field--wide" id="bkaddintake"></div>
              <label class="field field--wide"><span>Notes</span><textarea name="notes" maxlength="1500"></textarea></label>
            </div>
            <div class="row"><button class="btn btn--primary btn--sm" type="submit">Save as confirmed</button><button class="btn btn--ghost btn--sm" type="button" data-bk-close="bkadd">Close</button></div>
          </form>

          <form class="bk-form" id="bkblock" hidden>
            <h3>Block a day</h3>
            <p class="muted tiny">Nobody can ask for this day. It goes into your Days off list under Booking calendar in the Content tab.</p>
            <div class="grid2">
              <label class="field"><span>Day</span><input type="date" name="date" required></label>
              <label class="field"><span>Note (only you see it)</span><input type="text" name="note" maxlength="40"></label>
            </div>
            <div class="row"><button class="btn btn--primary btn--sm" type="submit">Block it</button><button class="btn btn--ghost btn--sm" type="button" data-bk-close="bkblock">Close</button></div>
          </form>

          <div class="bk-strip" id="bkstrip"></div>

          <details class="bk-group" id="bkrequested" open>
            <summary><h3>Requested <span class="pill" data-count></span></h3><span class="muted tiny">newest first</span></summary>
            <div class="bk-list" data-list></div>
          </details>
          <details class="bk-group" id="bkconfirmed" open>
            <summary><h3>Confirmed <span class="pill pill--quiet" data-count></span></h3><span class="muted tiny">by day, today first</span></summary>
            <div class="bk-list" data-list></div>
          </details>
          <details class="bk-group" id="bkpast">
            <summary><h3>Past <span class="pill pill--quiet" data-count></span></h3><span class="muted tiny">done and no-shows, last 30 days</span></summary>
            <div class="bk-list" data-list></div>
          </details>
          <details class="bk-group" id="bkclosed">
            <summary><h3>Declined and cancelled <span class="pill pill--quiet" data-count></span></h3><span class="muted tiny">last 30 days</span></summary>
            <div class="bk-list" data-list></div>
          </details>
        </div>
      </section>`;
}

// Line icons for the menu, the phone dock and the Home tiles (stroke =
// currentColor, so every theme colours them). Decorative: labels carry meaning.
const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  bookings: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="m9 14.5 2 2 4-4"/>',
  content: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="m14 7.5 3 3"/>',
  media: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5.5-5.5 4 4 2.5-2.5L20 18"/>',
  look: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1-.8-1.4-.8-2.3 0-1 .8-1.6 1.8-1.6h2.2a3.5 3.5 0 0 0 3.5-3.5c0-4.4-3.8-7.9-8.5-7.9z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10.5" cy="7.5" r="1.1"/><circle cx="15" cy="8" r="1.1"/>',
  hours: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  payments: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  setup: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>',
  editors: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.6c2.4-.3 4.4 1.2 5 4.4"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5M12 8v4.5l3 1.8"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
  site: '<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V7.5A1.5 1.5 0 0 1 5.5 6H10"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  out: '<path d="M14.5 4.5H18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3.5"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>',
};
export function icon(name) {
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

// Every place in the editor, in the order the menu shows them. `go` is the
// route admin.js understands (#home, #bookings, #content/<section> …);
// `when` drops places a site does not have. The Home tiles, the phone dock
// and the menu's "Find" box all read from this one list.
export function destinations({ booking = BOOKING, payments = PAYMENTS, themes = config.themes, tasks = checklistItems() } = {}) {
  const all = [
    { group: 'Today', go: 'home', icon: 'home', label: 'Home', sub: 'Everything at a glance' },
    { group: 'Today', go: 'bookings', icon: 'bookings', label: 'Bookings', sub: 'Requests, confirmed jobs, add one by hand', badge: 'bookingcount', when: Boolean(booking) },
    { group: 'Your site', go: 'content', icon: 'content', label: 'Words and info', sub: 'Every line on your site, phone, email, services' },
    { group: 'Your site', go: 'media', icon: 'media', label: 'Photos', sub: 'Add, replace, reorder', badge: 'mediacount' },
    { group: 'Your site', go: 'look', icon: 'look', label: 'Look', sub: 'Colours and style, previewed live', when: Boolean(themes) },
    { group: 'Business', go: 'content/calendar', icon: 'hours', label: 'Hours and days off', sub: 'When people can ask for a time', when: Boolean(booking) },
    { group: 'Business', go: 'payments', icon: 'payments', label: 'Payments', sub: 'Connect Stripe, see if it is live', badge: 'paycount', when: Boolean(payments) },
    { group: 'Account', go: 'setup', icon: 'setup', label: 'Setup', sub: 'What is left to make the site fully yours', badge: 'setupcount', when: tasks.length > 0 },
    { group: 'Account', go: 'account', icon: 'key', label: 'Your sign-in', sub: 'Set a password, or keep using email links' },
    { group: 'Account', go: 'editors', icon: 'editors', label: 'Who can edit', sub: 'Add a helper or another owner', owner: true },
    { group: 'Account', go: 'history', icon: 'history', label: 'Publish history', sub: 'Undo: restore an earlier version' },
  ];
  return all.filter((d) => d.when === undefined || d.when);
}

// a count that is not a to-do (photos) is grey, not the alert colour
const QUIET_BADGES = new Set(['mediacount']);

function navButton(d, cls = 'nav') {
  return `<button class="${cls}" type="button" data-go="${e(d.go)}"${d.owner ? ' data-owner-only hidden' : ''}>${icon(d.icon)}<span class="${cls}__label">${e(d.label)}</span>${d.badge ? `<span class="pill${QUIET_BADGES.has(d.badge) ? ' pill--quiet' : ''}" data-badge="${e(d.badge)}"></span>` : ''}</button>`;
}

function menuHtml(list) {
  const groups = [];
  list.forEach((d) => {
    let g = groups.find((x) => x.name === d.group);
    if (!g) groups.push((g = { name: d.group, items: [] }));
    g.items.push(d);
  });
  return `<nav class="menu" id="menu" aria-label="Everything in your editor">
      <div class="menu__head"><strong>Menu</strong><button class="icon" type="button" id="menuclose" aria-label="Close the menu">${icon('close')}</button></div>
      <label class="menu__find">${icon('search')}<input type="search" id="menufind" placeholder="Find: hours, phone, photos…" autocomplete="off" aria-label="Find anything in the editor"></label>
      <div class="menu__results" id="menuresults" hidden></div>
      <div class="menu__groups" id="menugroups">
${groups.map((g) => `        <div class="menu__group"><p class="menu__label">${e(g.name)}</p>${g.items.map((d) => navButton(d)).join('')}</div>`).join('\n')}
        <div class="menu__group menu__group--foot">
          <a class="nav" href="/" target="_blank" rel="noopener">${icon('site')}<span class="nav__label">View your site</span></a>
          <button class="nav" type="button" data-logout>${icon('out')}<span class="nav__label">Sign out</span></button>
          <p class="menu__who" id="who"></p>
        </div>
      </div>
    </nav>`;
}

// The phone's bottom bar: Home, the thing that needs them most, Edit, Photos, Menu.
function dockHtml(list) {
  const pick = (go) => list.find((d) => d.go === go);
  const second = pick('bookings') || pick('setup') || pick('look');
  const items = [pick('home'), second, pick('content'), pick('media')].filter(Boolean);
  const short = { home: 'Home', bookings: 'Bookings', setup: 'Setup', look: 'Look', content: 'Edit', media: 'Photos' };
  return `<nav class="dock" aria-label="Quick menu">
    ${items.map((d) => navButton({ ...d, label: short[d.go] || d.label }, 'dock__btn')).join('\n    ')}
    <button class="dock__btn" type="button" id="dockmenu" aria-controls="menu" aria-expanded="false">${icon('menu')}<span class="dock__btn__label">Menu</span></button>
  </nav>`;
}

// /admin/ → Payments (config.payments): the steps to get a Stripe key, the
// paste box, and the status card admin.js fills from /api/admin/payments.
function paymentsPanel() {
  const p = PAYMENTS;
  const perms = p.permissions.map((x) => `<li>${e(x)}</li>`).join('');
  const keyName = `${config.name} website`;
  return `<!-- Payments -->
      <section class="panel panel--single" id="panel-payments" hidden>
        <div class="content narrow pay">
          <header class="panel__head"><div><h2>Payments</h2><p class="muted">Stripe takes ${e(p.purpose)} for you. The money goes straight to your own Stripe account and your bank; HAND never touches it.</p></div></header>
          <div class="pay__status" id="paystatus" role="status" aria-live="polite"><p class="muted">Checking Stripe…</p></div>
          <div class="pay__connect" id="payconnect" hidden>
            <ol class="pay__steps">
              <li class="pay__step">
                <h3>Have a Stripe account</h3>
                <p>Free to open. Stripe asks for your ID, your business, and the bank account your money is paid out to. Already have one? Go to step 2.</p>
                <div class="row"><a class="btn btn--ghost btn--sm" href="https://dashboard.stripe.com/register" target="_blank" rel="noopener">Create a Stripe account ↗</a></div>
              </li>
              <li class="pay__step">
                <h3>Make a key for your website</h3>
                <p>Open your keys, tap <strong>Create restricted key</strong>, name it <code>${e(keyName)}</code>, and set these to <strong>Write</strong>. Leave everything else at None:</p>
                <ul class="pay__perms">${perms}</ul>
                <p>Tap <strong>Create key</strong>, type the code Stripe sends you, then tap the key to copy it. It starts with <code>rk_live_</code>.</p>
                <div class="row"><a class="btn btn--primary btn--sm" href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener">Open my Stripe keys ↗</a></div>
                <details class="pay__alt"><summary>Easier but less safe: the secret key</summary><p>On the same page, under <strong>Standard keys</strong>, tap <strong>Reveal</strong> next to the Secret key and copy it (it starts with <code>sk_live_</code>). It also works, but it can do anything in your Stripe account, so the restricted key above is the better choice.</p></details>
              </li>
              <li class="pay__step">
                <h3>Paste it here</h3>
                <form id="payform" class="pay__form" autocomplete="off" novalidate>
                  <label class="field"><span>Your Stripe key</span><input type="password" name="key" id="paykey" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="rk_live_…" required></label>
                  <div class="row">
                    <button class="btn btn--ghost btn--sm" type="button" id="paypaste">Paste</button>
                    <button class="btn btn--ghost btn--sm" type="button" id="payshow">Show</button>
                    <button class="btn btn--primary" type="submit" id="paysubmit">Connect Stripe</button>
                  </div>
                  <p class="pay__msg" id="paymsg" role="status" aria-live="polite"></p>
                </form>
                <p class="muted tiny">The site checks the key with Stripe, sets up the "someone paid" notice for you, and locks the key away. Nobody can read it back, not even here: you will only see its last four characters.</p>
              </li>
            </ol>
            <details class="pay__alt"><summary>Try it first with pretend money</summary><p>In Stripe, switch to <strong>Test mode</strong> (or open a sandbox), make the same key there (it starts with <code>rk_test_</code>) and paste it. Pay with the card <code>4242 4242 4242 4242</code>, any future date, any 3 digits. Connect the live key when you are ready; it replaces the test one.</p></details>
            <p class="task__ask"><strong>Rather have HAND do it?</strong> Make the key, then send it to HAND in a private message (never by email), and HAND connects it for you.</p>
          </div>
        </div>
      </section>`;
}

export function renderAdminPage() {
  const name = config.name;
  const v = e(config.assetVersion);
  const brand = (tag = '') => `<div class="brand"><span class="brand__mark" data-logo>${config.logo}</span><span data-site-name>${e(name)}</span>${tag}</div>`;
  const tasks = checklistItems();
  const places = destinations({ tasks });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(name)} · Editor</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="${e(config.theme.bg)}">
${faviconLink(config.favicon)}
${fontLinks()}
<style id="theme">:root{${adminThemeVars()}}</style>
<link rel="stylesheet" href="/admin/admin.css?v=${v}">
</head>
<body>
<div id="app" class="app" data-state="loading">

  <!-- Login -->
  <section class="login" id="login" hidden>
    <div class="login__card">
      ${brand()}
      <h1>Edit your site</h1>
      <p class="muted">Sign in with your email and password.</p>
      <form id="loginform" class="stack">
        <label class="field"><span>Email</span><input type="email" name="email" autocomplete="username" required placeholder="you@example.com"></label>
        <label class="field"><span>Password</span><span class="pw"><input type="password" name="password" autocomplete="current-password" required maxlength="200"><button class="pw__show" type="button" data-pwshow aria-pressed="false">Show</button></span></label>
        <button class="btn btn--primary" type="submit" id="loginbtn">Sign in</button>
      </form>
      <button class="btn btn--ghost login__or" type="button" id="loginlink" aria-expanded="false" aria-controls="linkdrop">Or send magic link</button>
      <div class="login__drop" id="linkdrop" hidden>
        <form id="linkform" class="stack">
          <p class="tiny muted">No password yet, or forgot it? We’ll email you a one-time link that signs you in.</p>
          <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required placeholder="you@example.com"></label>
          <button class="btn btn--primary" type="submit" id="linkbtn">Email me the link</button>
        </form>
      </div>
      <p class="login__msg" id="loginmsg" role="status" aria-live="polite"></p>
      <p class="tiny muted"><a href="/">← Back to the site</a></p>
    </div>
  </section>

  <!-- Editor: one portal. Home first, a menu to everything (a rail on a
       computer, a sheet on a phone), and a bottom dock on a phone. -->
  <div class="shell" id="shell" hidden>
    <header class="top">
      <button class="icon top__menu" type="button" id="menubtn" aria-controls="menu" aria-expanded="false" aria-label="Open the menu">${icon('menu')}</button>
      ${brand('<em>Editor</em>')}
      <span class="top__title" id="viewtitle">Home</span>
      <div class="top__right">
        <a class="btn btn--ghost btn--sm" href="/" target="_blank" rel="noopener">View site ↗</a>
        <button class="btn btn--ghost btn--sm top__out" type="button" data-logout>Sign out</button>
      </div>
    </header>

    <div class="frame">
    ${menuHtml(places)}
    <div class="scrim" id="scrim" hidden></div>

    <main class="main" id="main" tabindex="-1">
      <!-- Home -->
      <section class="panel panel--single" id="panel-home">
        <div class="content home">
          <header class="home__hello"><p class="muted tiny" id="homewho"></p><h2>Your site, at a glance</h2></header>
          <div class="home__cards" id="homecards"></div>
          <h3 class="home__h">Go to</h3>
          <div class="home__tiles" id="hometiles">
${places.filter((d) => d.go !== 'home').map((d) => `            <button class="tile" type="button" data-go="${e(d.go)}"${d.owner ? ' data-owner-only hidden' : ''}>${icon(d.icon)}<span class="tile__label">${e(d.label)}${d.badge ? ` <span class="pill${QUIET_BADGES.has(d.badge) ? ' pill--quiet' : ''}" data-badge="${e(d.badge)}"></span>` : ''}</span><span class="tile__sub">${e(d.sub)}</span></button>`).join('\n')}
            <a class="tile" href="/" target="_blank" rel="noopener">${icon('site')}<span class="tile__label">View your site ↗</span><span class="tile__sub">Opens in a new tab</span></a>
          </div>
        </div>
      </section>

      <!-- Content -->
      <section class="panel" id="panel-content" data-focus="" hidden>
        <aside class="side"><nav id="sidenav" class="sidenav" aria-label="Jump to section"></nav></aside>
        <div class="content">
          <div class="secindex" id="secindex"><p class="muted">What do you want to change?</p><div class="secindex__list" id="secindexlist"></div></div>
          <button class="secback" type="button" id="secback" hidden>‹ All sections</button>
          <div class="content" id="contentform"></div>
        </div>
      </section>

      <!-- Media -->
      <section class="panel panel--single" id="panel-media" hidden>
        <div class="content">
          <header class="panel__head">
            <div>
              <h2>Photos</h2>
              <p class="muted">Use <strong>Replace</strong> on any image (or drop a photo onto it) to swap in your own. Drag to reorder, or use the arrows. The featured image leads the page. Photos are resized on your device before upload, so big files are fine.</p>
            </div>
            <div class="row">
              <button class="btn btn--ghost btn--sm" id="removeplaceholders" type="button" hidden>Remove all placeholders</button>
              <label class="btn btn--primary" for="fileinput">Add photos</label>
              <input id="fileinput" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple hidden>
            </div>
          </header>
          <div class="dropzone" id="dropzone"><span>Drop photos here</span></div>
          <div class="uploads" id="uploads"></div>
          <div class="mediagrid" id="mediagrid"></div>
        </div>
      </section>
${
  config.themes
    ? `
      <!-- Look -->
      <section class="panel panel--single" id="panel-look" hidden>
        <div class="content">
          <header class="panel__head"><div><h2>Look</h2><p class="muted">Tap a look to see your real site in it. <strong>Use this look</strong> puts it live at once; switch back any time.</p></div></header>
          <div id="lookhost"></div>
        </div>
      </section>`
    : ''
}
      <!-- Editors -->
      <section class="panel panel--single" id="panel-editors" hidden>
        <div class="content narrow">
          <header class="panel__head"><div><h2>Who can edit</h2><p class="muted">Anyone listed here can request a sign-in link. Owners can also manage this list.</p></div></header>
          <form id="editorform" class="row row--form">
            <input type="email" name="email" placeholder="name@example.com" required>
            <select name="role"><option value="editor">Editor</option><option value="owner">Owner</option></select>
            <button class="btn btn--primary btn--sm" type="submit">Add</button>
          </form>
          <ul class="list" id="editorlist"></ul>
        </div>
      </section>

      <!-- Your sign-in: every editor, owner or not -->
      <section class="panel panel--single" id="panel-account" hidden>
        <div class="content narrow">
          <header class="panel__head"><div><h2>Your sign-in</h2><p class="muted" id="acctstatus">Email links always work. A password is optional.</p></div></header>
          <form id="pwform" class="stack">
            <input type="email" name="username" autocomplete="username" hidden>
            <label class="field" id="pwcurrent" hidden><span>Current password</span><input type="password" name="current" autocomplete="current-password" maxlength="200"></label>
            <label class="field"><span id="pwlabel">Password</span><span class="pw"><input type="password" name="password" autocomplete="new-password" minlength="10" maxlength="200" required><button class="pw__show" type="button" data-pwshow aria-pressed="false">Show</button></span><small class="help">At least 10 characters. A short sentence you will remember works well.</small></label>
            <div><button class="btn btn--primary" type="submit" id="pwsave">Save password</button></div>
          </form>
          <p class="tiny muted">Saving a password signs you out on your other phones and computers. Forgot it? Sign out, then sign in with an email link and set a new one here.</p>
        </div>
      </section>

      <!-- History -->
      <section class="panel panel--single" id="panel-history" hidden>
        <div class="content narrow">
          <header class="panel__head"><div><h2>Publish history</h2><p class="muted">Every publish is saved. Restore any earlier version of the copy in one click.</p></div></header>
          <ul class="list" id="historylist"></ul>
        </div>
      </section>

      ${BOOKING ? bookingsPanel() : ''}

      ${PAYMENTS ? paymentsPanel() : ''}

      ${
        tasks.length
          ? `<!-- Setup checklist -->
      <section class="panel panel--single" id="panel-setup" hidden>
        <div class="content narrow setup">
          <header class="panel__head">
            <div>
              <h2>Getting your site fully live</h2>
              <p class="muted">Everything left to do, in order, written for a phone. Every step has a button that takes you to the right place. Steps tick themselves when the site can tell they are done; tick the rest as you go, they save on the spot. Anything you would rather not do yourself, HAND can do for you.</p>
            </div>
          </header>
          <div class="setup__progress" id="setupprogress" role="status" aria-live="polite"><i></i><span></span></div>
          <div class="setup__list" id="setuplist">
${checklistHtml()}
          </div>
        </div>
      </section>`
          : ''
      }
    </main>
    </div>

    ${dockHtml(places)}

    <div class="savebar" id="savebar" hidden>
      <span id="savemsg">You have unpublished changes.</span>
      <div class="row">
        <button class="btn btn--ghost btn--sm" id="discard" type="button">Discard</button>
        <button class="btn btn--primary" id="publish" type="button">Publish changes</button>
      </div>
    </div>
  </div>

  <div class="toasts" id="toasts" aria-live="polite"></div>
</div>
${
  config.themes
    ? `<template id="looks-tpl">${looksHtml()}</template>
<div class="preview" id="preview" hidden role="dialog" aria-label="Preview a look">
  <iframe id="previewframe" title="Site preview" src="about:blank"></iframe>
  <div class="preview__bar">
    <button class="icon" id="previewprev" type="button" title="Previous look" aria-label="Previous look">‹</button>
    <span class="preview__name" id="previewname"></span>
    <button class="icon" id="previewnext" type="button" title="Next look" aria-label="Next look">›</button>
    <span class="spacer"></span>
    <button class="btn btn--primary btn--sm" id="previewuse" type="button">Use this look</button>
    <button class="btn btn--ghost btn--sm" id="previewclose" type="button">Close</button>
  </div>
</div>`
    : ''
}
<script src="/admin/admin.js?v=${v}" defer></script>
</body>
</html>`;
}
