// The owner editor's HTML, server-rendered so the site's theme, fonts, name
// and logo are in the first byte (no flash of a default look) and the asset
// version comes from site.config.mjs. Behaviour lives in public/admin/admin.js,
// styling in public/admin/admin.css (which reads only the injected tokens).

import { BOOKING, config } from './config.mjs';
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
              <p class="muted">Requests wait for you here. Confirm one as asked, at another time, or decline it; the customer is emailed either way. Several people may ask for the same time: the chips tell you.</p>
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

export function renderAdminPage() {
  const name = config.name;
  const v = e(config.assetVersion);
  const brand = (tag = '') => `<div class="brand"><span class="brand__mark" data-logo>${config.logo}</span><span data-site-name>${e(name)}</span>${tag}</div>`;
  const tasks = checklistItems();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
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
      <p class="muted">Enter the email that can edit this site and we’ll send you a one-time sign-in link. No password to remember.</p>
      <form id="loginform" class="stack">
        <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required placeholder="you@example.com"></label>
        <button class="btn btn--primary" type="submit">Email me a sign-in link</button>
      </form>
      <p class="login__msg" id="loginmsg" role="status" aria-live="polite"></p>
      <p class="tiny muted"><a href="/">← Back to the site</a></p>
    </div>
  </section>

  <!-- Editor -->
  <div class="shell" id="shell" hidden>
    <header class="top">
      ${brand('<em>Editor</em>')}
      <nav class="tabs" aria-label="Editor sections">
        ${BOOKING ? '<button class="tab" data-tab="bookings" type="button">Bookings <span class="pill" id="bookingcount"></span></button>' : ''}
        <button class="tab is-active" data-tab="content" type="button">Content</button>
        <button class="tab" data-tab="media" type="button">Media <span class="pill" id="mediacount"></span></button>
        <button class="tab" data-tab="editors" type="button" id="tab-editors" hidden>Editors</button>
        <button class="tab" data-tab="history" type="button">History</button>
        ${tasks.length ? '<button class="tab" data-tab="setup" type="button">Setup <span class="pill" id="setupcount"></span></button>' : ''}
      </nav>
      <div class="top__right">
        <a class="btn btn--ghost btn--sm" href="/" target="_blank" rel="noopener">View site ↗</a>
        <span class="who" id="who"></span>
        <button class="btn btn--ghost btn--sm" id="logout" type="button">Sign out</button>
      </div>
    </header>

    <main class="main">
      <!-- Content -->
      <section class="panel" id="panel-content">
        <aside class="side"><nav id="sidenav" class="sidenav" aria-label="Jump to section"></nav></aside>
        <div class="content" id="contentform"></div>
      </section>

      <!-- Media -->
      <section class="panel panel--single" id="panel-media" hidden>
        <div class="content">
          <header class="panel__head">
            <div>
              <h2>Media</h2>
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

      <!-- History -->
      <section class="panel panel--single" id="panel-history" hidden>
        <div class="content narrow">
          <header class="panel__head"><div><h2>Publish history</h2><p class="muted">Every publish is saved. Restore any earlier version of the copy in one click.</p></div></header>
          <ul class="list" id="historylist"></ul>
        </div>
      </section>

      ${BOOKING ? bookingsPanel() : ''}

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
