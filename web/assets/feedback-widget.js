/*
  HAND — drop-in feedback widget.

  Adds an anonymous-by-default feedback button + modal to any standalone
  presentation page (mosquitos, airstream, governance, …). Notes POST to
  /.netlify/functions/feedback, which pins them into command.feedback_pins
  so they show up in the Command Center at /pins and /inspector and page a
  human in the Telegram "🎯 Inspector" topic.

  Drop-in (before </body>):
    <script defer src="/assets/feedback-widget.js?v=1" data-source="Airstream Studio"></script>

  Config via data-* on the <script> tag (all optional):
    data-source  human label for provenance, e.g. "Airstream Studio"
                 (falls back to document.title, then the path)
    data-accent  accent colour (default HAND amber #d97706)
    data-tags    comma-separated quick tags (default: the set below)
    data-label   button text (default "Feedback")

  Privacy: anonymous by default — no name required, no email, no cookies,
  no tracking. localStorage is used only to (a) auto-fill a name the user
  chose to type before and (b) hold an offline retry queue so a note is
  never lost. Everything degrades gracefully when storage is blocked.
*/
(function () {
  'use strict';

  if (window.__handFeedbackMounted) return;
  window.__handFeedbackMounted = true;

  // ---------- Config ------------------------------------------------------
  var script =
    document.currentScript ||
    document.querySelector('script[src*="feedback-widget"]');
  var ds = (script && script.dataset) || {};

  var ENDPOINT = '/.netlify/functions/feedback';
  var ACCENT = ds.accent || '#d97706';
  var BTN_LABEL = ds.label || 'Feedback';
  var DEFAULT_TAGS = ['👍 love it', '🐛 issue', '💡 idea', '❓ question', '✍️ copy'];
  var TAGS = ds.tags
    ? ds.tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean)
    : DEFAULT_TAGS;

  var LS_NAME = 'hand_fb_name_v1';
  var LS_QUEUE = 'hand_fb_queue_v1';
  var MAX_TEXT = 2000;

  function pathNow() {
    var p = location.pathname || '/';
    return p;
  }
  function sourceLabel() {
    if (ds.source) return ds.source;
    var t = (document.title || '').split('·')[0].split('—')[0].trim();
    if (t) return t;
    return pathNow();
  }

  // ---------- Style (self-contained, theme-agnostic) ----------------------
  // Scoped under #hand-fb-root so it can never leak into the host page.
  var css = [
    '#hand-fb-root{--fb-accent:' + ACCENT + ';--fb-ink:#f5efe1;--fb-dim:#a8a29a;',
    'font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;}',
    '#hand-fb-root *{box-sizing:border-box;}',

    /* Launcher button */
    '#hand-fb-btn{position:fixed;right:max(18px,env(safe-area-inset-right));',
    'bottom:max(18px,env(safe-area-inset-bottom));z-index:2147483000;',
    'display:inline-flex;align-items:center;gap:8px;border:0;cursor:pointer;',
    'padding:11px 16px;border-radius:999px;font-size:14px;font-weight:600;',
    'color:#1b1206;background:var(--fb-accent);',
    'box-shadow:0 6px 22px rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.06) inset;',
    'transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease;}',
    '#hand-fb-btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,.34);}',
    '#hand-fb-btn:active{transform:translateY(0);}',
    '#hand-fb-btn:focus-visible{outline:2px solid var(--fb-accent);outline-offset:3px;}',
    '#hand-fb-btn svg{width:16px;height:16px;display:block;}',
    '@media(max-width:520px){#hand-fb-btn span{position:absolute;width:1px;height:1px;',
    'overflow:hidden;clip:rect(0 0 0 0);}#hand-fb-btn{padding:13px;}}',

    /* Overlay + scrim */
    '#hand-fb-overlay{position:fixed;inset:0;z-index:2147483001;display:none;',
    'align-items:flex-end;justify-content:center;padding:0;}',
    '#hand-fb-overlay.open{display:flex;}',
    '@media(min-width:560px){#hand-fb-overlay{align-items:center;padding:24px;}}',
    '#hand-fb-scrim{position:absolute;inset:0;',
    'background:rgba(8,6,3,.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);',
    'opacity:0;transition:opacity .2s ease;}',
    '#hand-fb-overlay.open #hand-fb-scrim{opacity:1;}',

    /* Card */
    '#hand-fb-card{position:relative;width:100%;max-width:460px;',
    'background:#16130e;color:var(--fb-ink);',
    'border:1px solid rgba(245,239,225,.1);border-bottom:0;',
    'border-radius:18px 18px 0 0;padding:20px 20px 18px;',
    'box-shadow:0 -10px 50px rgba(0,0,0,.5);',
    'transform:translateY(16px);opacity:0;transition:transform .24s cubic-bezier(.2,.9,.3,1),opacity .24s ease;}',
    '@media(min-width:560px){#hand-fb-card{border:1px solid rgba(245,239,225,.1);',
    'border-radius:18px;transform:translateY(10px) scale(.98);}}',
    '#hand-fb-overlay.open #hand-fb-card{transform:none;opacity:1;}',

    '#hand-fb-card h2{margin:0;font-size:16px;font-weight:650;letter-spacing:-.01em;}',
    '#hand-fb-card .fb-sub{margin:3px 0 0;font-size:12px;color:var(--fb-dim);}',
    '#hand-fb-x{position:absolute;top:14px;right:14px;width:30px;height:30px;',
    'border:0;border-radius:8px;background:rgba(245,239,225,.06);color:var(--fb-dim);',
    'font-size:16px;line-height:1;cursor:pointer;transition:background .15s,color .15s;}',
    '#hand-fb-x:hover{background:rgba(245,239,225,.12);color:var(--fb-ink);}',

    /* Tags */
    '#hand-fb-tags{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 12px;}',
    '.hand-fb-tag{border:1px solid rgba(245,239,225,.14);background:transparent;',
    'color:var(--fb-dim);border-radius:999px;padding:5px 11px;font-size:12.5px;',
    'cursor:pointer;transition:all .15s ease;font-family:inherit;}',
    '.hand-fb-tag:hover{border-color:rgba(245,239,225,.3);color:var(--fb-ink);}',
    '.hand-fb-tag[aria-pressed="true"]{background:var(--fb-accent);border-color:var(--fb-accent);color:#1b1206;}',

    /* Fields */
    '#hand-fb-text{width:100%;min-height:104px;resize:vertical;',
    'background:rgba(8,6,3,.5);border:1px solid rgba(245,239,225,.14);',
    'border-radius:11px;padding:11px 12px;color:var(--fb-ink);font-size:14px;',
    'font-family:inherit;line-height:1.5;transition:border-color .15s;}',
    '#hand-fb-text:focus{outline:0;border-color:var(--fb-accent);}',
    '#hand-fb-text::placeholder{color:#6f6a61;}',
    '#hand-fb-name{width:100%;margin-top:8px;background:rgba(8,6,3,.5);',
    'border:1px solid rgba(245,239,225,.14);border-radius:11px;padding:9px 12px;',
    'color:var(--fb-ink);font-size:13px;font-family:inherit;transition:border-color .15s;}',
    '#hand-fb-name:focus{outline:0;border-color:var(--fb-accent);}',
    '#hand-fb-name::placeholder{color:#6f6a61;}',
    '.hand-fb-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0;}',

    /* Footer */
    '#hand-fb-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;}',
    '#hand-fb-status{font-size:11.5px;color:var(--fb-dim);min-height:16px;flex:1;}',
    '#hand-fb-send{border:0;cursor:pointer;background:var(--fb-accent);color:#1b1206;',
    'font-weight:650;font-size:13.5px;border-radius:10px;padding:10px 18px;',
    'font-family:inherit;transition:filter .15s,opacity .15s;white-space:nowrap;}',
    '#hand-fb-send:hover{filter:brightness(1.07);}',
    '#hand-fb-send:disabled{opacity:.55;cursor:default;}',
    '#hand-fb-done{text-align:center;padding:26px 8px 18px;}',
    '#hand-fb-done .fb-check{font-size:34px;}',
    '#hand-fb-done p{margin:10px 0 0;font-size:14px;color:var(--fb-ink);}',
    '#hand-fb-done .fb-sub2{font-size:12px;color:var(--fb-dim);margin-top:4px;}',

    '@media(prefers-reduced-motion:reduce){#hand-fb-root *{transition:none!important;}}',
  ].join('');

  // ---------- Build DOM ---------------------------------------------------
  var root = document.createElement('div');
  root.id = 'hand-fb-root';

  var style = document.createElement('style');
  style.textContent = css;
  root.appendChild(style);

  // Launcher
  var btn = document.createElement('button');
  btn.id = 'hand-fb-btn';
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 ' +
    '8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z"/></svg>' +
    '<span>' + escapeHtml(BTN_LABEL) + '</span>';
  root.appendChild(btn);

  // Overlay + card
  var overlay = document.createElement('div');
  overlay.id = 'hand-fb-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  var tagButtons = TAGS.map(function (t, i) {
    return (
      '<button type="button" class="hand-fb-tag" data-tag="' +
      escapeHtml(t) + '" aria-pressed="false" id="hand-fb-tag-' + i + '">' +
      escapeHtml(t) + '</button>'
    );
  }).join('');

  overlay.innerHTML =
    '<div id="hand-fb-scrim"></div>' +
    '<div id="hand-fb-card" role="dialog" aria-modal="true" aria-labelledby="hand-fb-title">' +
      '<button id="hand-fb-x" type="button" aria-label="Close feedback">✕</button>' +
      '<div id="hand-fb-form-wrap">' +
        '<h2 id="hand-fb-title">Share feedback</h2>' +
        '<p class="fb-sub">Anonymous unless you add your name. Goes straight to the team.</p>' +
        '<div id="hand-fb-tags" role="group" aria-label="Quick tags">' + tagButtons + '</div>' +
        '<textarea id="hand-fb-text" maxlength="' + MAX_TEXT + '" ' +
          'placeholder="What works, what doesn’t, what’s missing…"></textarea>' +
        '<input id="hand-fb-name" type="text" autocomplete="name" maxlength="80" ' +
          'placeholder="Name (optional)">' +
        '<input class="hand-fb-hp" type="text" tabindex="-1" autocomplete="off" ' +
          'aria-hidden="true" id="hand-fb-website" placeholder="Leave this empty">' +
        '<div id="hand-fb-foot">' +
          '<span id="hand-fb-status" role="status" aria-live="polite"></span>' +
          '<button id="hand-fb-send" type="button">Send</button>' +
        '</div>' +
      '</div>' +
      '<div id="hand-fb-done" hidden>' +
        '<div class="fb-check" aria-hidden="true">🙏</div>' +
        '<p>Thank you — your note is in.</p>' +
        '<p class="fb-sub2">The team sees it in the Command Center.</p>' +
      '</div>' +
    '</div>';
  root.appendChild(overlay);

  (document.body || document.documentElement).appendChild(root);

  // ---------- Refs --------------------------------------------------------
  var scrim = root.querySelector('#hand-fb-scrim');
  var card = root.querySelector('#hand-fb-card');
  var closeX = root.querySelector('#hand-fb-x');
  var tagsWrap = root.querySelector('#hand-fb-tags');
  var textEl = root.querySelector('#hand-fb-text');
  var nameEl = root.querySelector('#hand-fb-name');
  var hpEl = root.querySelector('#hand-fb-website');
  var statusEl = root.querySelector('#hand-fb-status');
  var sendEl = root.querySelector('#hand-fb-send');
  var formWrap = root.querySelector('#hand-fb-form-wrap');
  var doneEl = root.querySelector('#hand-fb-done');

  var activeTags = {};
  var lastFocus = null;

  // Pre-fill remembered name (the user opted in by typing it before).
  try {
    var savedName = localStorage.getItem(LS_NAME);
    if (savedName) nameEl.value = savedName;
  } catch (_) {}

  // ---------- Open / close ------------------------------------------------
  function open() {
    lastFocus = document.activeElement;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    setStatus('');
    setTimeout(function () { textEl.focus(); }, 60);
    document.addEventListener('keydown', onKey, true);
  }
  function close() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', onKey, true);
    // reset to form view for next open
    setTimeout(function () {
      formWrap.hidden = false;
      doneEl.hidden = true;
      sendEl.disabled = false;
      sendEl.textContent = 'Send';
    }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') trapFocus(e);
  }
  function trapFocus(e) {
    var f = card.querySelectorAll(
      'button,textarea,input:not([tabindex="-1"]),[href]'
    );
    var list = Array.prototype.filter.call(f, function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  btn.addEventListener('click', open);
  closeX.addEventListener('click', close);
  scrim.addEventListener('click', close);

  // ---------- Tags --------------------------------------------------------
  tagsWrap.addEventListener('click', function (e) {
    var t = e.target.closest('.hand-fb-tag');
    if (!t) return;
    var tag = t.getAttribute('data-tag');
    var on = t.getAttribute('aria-pressed') === 'true';
    t.setAttribute('aria-pressed', on ? 'false' : 'true');
    if (on) delete activeTags[tag]; else activeTags[tag] = true;
  });

  // ---------- Status helper ----------------------------------------------
  function setStatus(msg, kind) {
    statusEl.textContent = msg || '';
    statusEl.style.color =
      kind === 'err' ? '#fca5a5' :
      kind === 'warn' ? '#fbbf24' :
      kind === 'ok' ? '#86efac' : '';
  }

  // ---------- Submit ------------------------------------------------------
  sendEl.addEventListener('click', submit);
  textEl.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
  });

  function buildPayload() {
    var name = nameEl.value.trim();
    if (name) { try { localStorage.setItem(LS_NAME, name); } catch (_) {} }
    var scrollMax = Math.max(
      0,
      (document.documentElement.scrollHeight || 0) - window.innerHeight
    );
    var scrollPct = scrollMax > 0 ? Math.min(1, (window.scrollY || 0) / scrollMax) : 0;
    return {
      text: textEl.value.trim(),
      path: pathNow(),
      title: document.title || '',
      name: name,
      source: sourceLabel(),
      tags: Object.keys(activeTags),
      scroll: scrollPct,
      vw: window.innerWidth || null,
      vh: window.innerHeight || null,
      ua: (navigator.userAgent || '').slice(0, 200),
      ts: Date.now(),
      website: hpEl.value || '',
    };
  }

  function submit() {
    var text = textEl.value.trim();
    if (text.length < 2) {
      setStatus('Add a note before sending.', 'warn');
      textEl.focus();
      return;
    }
    var payload = buildPayload();
    sendEl.disabled = true;
    sendEl.textContent = 'Sending…';
    setStatus('Sending…');

    send(payload).then(function (ok) {
      if (ok) {
        showDone();
        resetForm();
      } else {
        enqueue(payload);
        setStatus('Saved offline — will send when you’re back online.', 'warn');
        sendEl.disabled = false;
        sendEl.textContent = 'Retry';
        scheduleFlush(3000);
      }
    });
  }

  function showDone() {
    formWrap.hidden = true;
    doneEl.hidden = false;
    setTimeout(function () {
      // auto-close shortly after the thank-you
      if (!doneEl.hidden) close();
    }, 1900);
  }

  function resetForm() {
    textEl.value = '';
    activeTags = {};
    Array.prototype.forEach.call(
      tagsWrap.querySelectorAll('.hand-fb-tag'),
      function (t) { t.setAttribute('aria-pressed', 'false'); }
    );
  }

  // ---------- Transport ---------------------------------------------------
  function send(payload) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(function (res) {
        if (!res.ok) return false;
        return res.json().catch(function () { return {}; });
      })
      .then(function (data) {
        return !!(data && data.status === 'synced');
      })
      .catch(function () { return false; });
  }

  // ---------- Offline retry queue ----------------------------------------
  function loadQueue() {
    try { return JSON.parse(localStorage.getItem(LS_QUEUE) || '[]'); }
    catch (_) { return []; }
  }
  function saveQueue(q) {
    try { localStorage.setItem(LS_QUEUE, JSON.stringify(q.slice(0, 100))); }
    catch (_) {}
  }
  function enqueue(payload) {
    var q = loadQueue();
    if (!q.some(function (e) { return e.ts === payload.ts; })) {
      q.push(payload);
      saveQueue(q);
    }
  }

  var flushTimer = 0;
  var flushing = false;
  function scheduleFlush(ms) {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, ms);
  }
  function flush() {
    if (flushing) return;
    if (navigator.onLine === false) return;
    var q = loadQueue();
    if (!q.length) return;
    flushing = true;
    var remaining = [];
    var chain = Promise.resolve();
    q.forEach(function (entry) {
      chain = chain.then(function () {
        return send(entry).then(function (ok) {
          if (!ok) remaining.push(entry);
        });
      });
    });
    chain.then(function () {
      saveQueue(remaining);
      flushing = false;
      if (remaining.length) scheduleFlush(20000);
    });
  }

  window.addEventListener('online', function () { flush(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') flush();
  });
  // Flush anything left from a previous session.
  setTimeout(flush, 1500);

  // ---------- Util --------------------------------------------------------
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
