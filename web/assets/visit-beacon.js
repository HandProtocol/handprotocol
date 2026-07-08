/*
  High-value page-visit beacon. Fires once per browser session per page to
  command.public_visits and the Telegram Activity topic.

  Privacy: no cookies, no IDs. Dedup uses sessionStorage, so it naturally
  filters most non-JS crawlers and does not re-ping on in-page navigation.
*/
(function () {
  var ALLOWED = [
    '/',
    '/donate-crypto/',
    '/deck/',
    '/governance/',
    '/sovereign-reciprocates/',
  ];

  function normalize(p) {
    if (!p || p === '/foundation-campaign' || p === '/foundation-campaign/') return '/';
    if (p.charAt(p.length - 1) !== '/') p += '/';
    return p;
  }

  var path = normalize(location.pathname);
  if (ALLOWED.indexOf(path) === -1) return;

  var key = 'hand_visit_' + path;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch (_) {
    // sessionStorage blocked, fall through and ping once.
  }

  var payload = JSON.stringify({
    path: path,
    title: document.title || '',
    ref: document.referrer || '',
  });

  var url = '/.netlify/functions/visit';
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
    // Never let analytics break the page.
  }
})();
