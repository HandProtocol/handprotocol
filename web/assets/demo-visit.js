/*
  Demo-site visit beacon. Fires once per browser session per demo page to
  /.netlify/functions/biz-visit, which persists the hit to command.biz_visits so
  the Command Center (and the gated /demos portfolio) can show who looked at a
  generated site.

  Drop-in: <script defer src="/assets/demo-visit.js"></script> before </body> on
  any /demos/<slug>/ page (the demo itself, not the pitch).

  Top-frame only: if the page is loaded inside an iframe (the pitch page's live
  preview, or a portfolio thumbnail) it does NOT fire, so operator views never
  inflate a lead's visit count. No cookies, no IDs; sessionStorage dedup only,
  which also filters most non-JS crawlers and in-page navigation.
*/
(function () {
  try {
    if (window.top !== window.self) return; // embedded preview, skip
  } catch (_) {
    return; // cross-origin frame access threw; treat as embedded
  }

  // Only the demo index, e.g. /demos/roberts-realty-austin/ (not /pitch/).
  var m = location.pathname.match(/^\/demos\/([a-z0-9][a-z0-9-]*)\/$/i);
  if (!m) return;
  var slug = m[1];

  var key = 'hand_demo_visit_' + slug;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch (_) {
    // sessionStorage blocked (private mode) — fall through and ping once.
  }

  var payload = JSON.stringify({
    slug: slug,
    kind: 'demo',
    path: location.pathname,
    ref: document.referrer || '',
  });

  var url = '/.netlify/functions/biz-visit';
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(function () {});
    }
  } catch (_) {
    // Never let tracking break the page.
  }
})();
