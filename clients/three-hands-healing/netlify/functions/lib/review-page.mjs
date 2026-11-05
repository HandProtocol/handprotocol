// The guest review page (/review): a PIN pad, then the places to leave a review and
// a writing helper. Server-rendered in the site's palette and fonts; the behaviour
// and the look live in public/review/review.js + review.css, which are shared
// unmodified with other HAND sites and themed only through the --rv-* tokens below.
// Nothing the PIN protects is in this HTML: links and chips come from
// POST /api/review once the code is right (lib/review-core.mjs).

import { config, siteName } from './config.mjs';
import { escapeHtml as e, faviconLink } from './html.mjs';
import { siteThemeVars } from './theme.mjs';

const COPY = {
  gateEyebrow: 'For our customers',
  gateTitle: 'Enter the code we gave you.',
  eyebrow: 'Thank you',
  title: 'A review is the biggest favor you can do a small business.',
  lede: 'Two minutes, two taps. Here is where.',
  helperEyebrow: 'Not sure what to say?',
  helperTitle: 'Tell us how it went. We will give you a first draft.',
  helperSub: 'It only uses what you tell it, so your review comes out yours. Change anything you like.',
  placeholder: 'What you came in for, how it went, who helped you, anything that stood out.',
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

function padHtml() {
  return KEYS.map((k) => {
    if (k === '') return '<span aria-hidden="true"></span>';
    if (k === 'back') return '<button type="button" data-key="back" aria-label="Delete">&larr;</button>';
    return `<button type="button" data-key="${k}">${k}</button>`;
  }).join('');
}

const segHtml = (name, legend, options) =>
  `<fieldset class="rv-seg" data-seg="${name}"><legend>${e(legend)}</legend>${options
    .map(([value, label], i) => `<label><input type="radio" name="${name}" value="${value}"${i === 0 ? ' checked' : ''}><span>${e(label)}</span></label>`)
    .join('')}</fieldset>`;

export function renderReviewPage({ reviews }) {
  const t = config.theme;
  const fonts = config.fonts;
  const c = { ...COPY, ...reviews.page };
  const name = siteName();
  const v = encodeURIComponent(config.assetVersion);
  // Corners follow the feel the pack already set for its editor (square brand → square pad).
  const radius = (t.admin && t.admin.r) || '12px';
  // reviews.tokens: --rv-* overrides (button case + tracking, hairline, …), validated in config.mjs.
  const tokens = Object.entries(reviews.tokens || {}).map(([k, v]) => `--rv-${k}:${v}`).join(';');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Leave a review · ${e(name)}</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="${e(t.bg)}">
${faviconLink(config.favicon)}
${fonts.googleCss ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${e(fonts.googleCss)}" rel="stylesheet">` : ''}
<link rel="stylesheet" href="/review/review.css?v=${v}">
<style>
:root{${siteThemeVars()}}
.rv-body{--rv-bg:var(--bg);--rv-surface:var(--bg-2,var(--bg));--rv-fg:var(--ink);--rv-muted:var(--ink-3,var(--ink));--rv-line:rgb(var(--ink-rgb) / .18);--rv-accent:var(--accent);--rv-accent-hi:var(--accent-2,var(--accent));--rv-on-accent:var(--on-accent,#fff);--rv-display:var(--font-display);--rv-body-font:var(--font-body);--rv-radius:${e(radius)};--rv-btn-case:none;--rv-btn-track:0.01em;--rv-hairline:0${tokens ? `;${tokens}` : ''}}
</style>
</head>
<body class="rv-body">
<main id="main" class="rv" data-review data-api="/api/review" data-pin-length="${reviews.pin.length}">
  <a class="rv-brand${config.logo ? '' : ' rv-brand--text'}" href="/" aria-label="${e(name)}">${config.logo || e(name)}</a>

  <section class="rv-gate" data-gate aria-labelledby="rv-gate-title">
    <p class="rv-eyebrow">${e(c.gateEyebrow)}</p>
    <h1 id="rv-gate-title">${e(c.gateTitle)}</h1>
    <div class="rv-dots" data-dots aria-hidden="true"></div>
    <p class="rv-gate-msg" data-gate-msg role="status" aria-live="polite"></p>
    <div class="rv-pad" data-pad role="group" aria-label="Code keypad">${padHtml()}</div>
    <noscript><p class="rv-gate-msg">This page needs JavaScript.</p></noscript>
  </section>

  <div class="rv-open" data-open hidden>
    <header class="rv-head">
      <p class="rv-eyebrow">${e(c.eyebrow)}</p>
      <h1>${e(c.title)}</h1>
      <p class="rv-lede">${e(c.lede)}</p>
    </header>

    <section class="rv-links" aria-label="Where to leave your review"><ol class="rv-link-list" data-links></ol></section>

    <section class="rv-helper" aria-labelledby="rv-helper-title">
      <p class="rv-eyebrow">${e(c.helperEyebrow)}</p>
      <h2 id="rv-helper-title">${e(c.helperTitle)}</h2>
      <p class="rv-sub">${e(c.helperSub)}</p>
      <div class="rv-chips" data-chips aria-label="Ideas to start from"></div>
      <label class="rv-field"><span>Your notes</span><textarea data-notes rows="3" maxlength="600" placeholder="${e(c.placeholder)}"></textarea></label>
      <div class="rv-options">
        ${segHtml('tone', 'Sound', [['casual', 'Casual'], ['warm', 'Warm'], ['playful', 'Playful'], ['plain', 'To the point']])}
        ${segHtml('length', 'Length', [['short', 'Quick'], ['fuller', 'A bit more']])}
      </div>
      <button class="rv-btn" type="button" data-generate>Write my draft</button>
      <p class="rv-status" data-status role="status" aria-live="polite"></p>
      <div class="rv-draft" data-draft-wrap hidden>
        <label class="rv-field"><span>Your draft <em>&mdash; edit it until it sounds like you</em></span><textarea data-draft rows="7" maxlength="2000"></textarea></label>
        <div class="rv-tools" role="group" aria-label="Writing tools">
          <button type="button" data-tool="retake">Another take</button>
          <button type="button" data-tool="shorter">Shorter</button>
          <button type="button" data-tool="casual">More casual</button>
          <button type="button" data-tool="polish">Fix my typos</button>
          <button type="button" data-undo hidden>Undo</button>
        </div>
        <button class="rv-btn" type="button" data-copy>Copy my review</button>
      </div>
    </section>

    <footer class="rv-foot"><p>&copy; <span data-year></span> ${e(name)} &nbsp;·&nbsp; <a href="/">Back to the site</a></p></footer>
  </div>

  <div class="rv-bar" data-bar hidden><p>Copied. Now paste it here:</p><div class="rv-bar-links" data-bar-links></div></div>
</main>
<script src="/review/review.js?v=${v}" defer></script>
</body>
</html>`;
}
