// The owner editor's HTML, server-rendered so the site's theme, fonts, name
// and logo are in the first byte (no flash of a default look) and the asset
// version comes from site.config.mjs. Behaviour lives in public/admin/admin.js,
// styling in public/admin/admin.css (which reads only the injected tokens).

import { config } from './config.mjs';
import { escapeHtml as e } from './html.mjs';
import { adminThemeVars } from './theme.mjs';

function fontLinks() {
  if (!config.fonts.googleCss) return '';
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${e(config.fonts.googleCss)}" rel="stylesheet">`;
}

export function renderAdminPage() {
  const name = config.name;
  const v = e(config.assetVersion);
  const brand = (tag = '') => `<div class="brand"><span class="brand__mark" data-logo>${config.logo}</span><span data-site-name>${e(name)}</span>${tag}</div>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(name)} · Editor</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="${e(config.theme.bg)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
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
        <button class="tab is-active" data-tab="content" type="button">Content</button>
        <button class="tab" data-tab="media" type="button">Media <span class="pill" id="mediacount"></span></button>
        <button class="tab" data-tab="editors" type="button" id="tab-editors" hidden>Editors</button>
        <button class="tab" data-tab="history" type="button">History</button>
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
<script src="/admin/admin.js?v=${v}" defer></script>
</body>
</html>`;
}
