/* Cathedral — the mobile menu, and "Read the full description" on the
   practice pages (phones only; without JS every description shows). (site pack) */
(() => {
  document.documentElement.classList.add('js');

  const btn = document.querySelector('[data-menu]');
  const nav = document.getElementById('nav');
  if (btn && nav) {
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  document.querySelectorAll("[data-more]").forEach((more) => {
    more.addEventListener('click', () => {
      const card = more.closest('.offer');
      const open = !card.classList.contains('is-open');
      card.classList.toggle('is-open', open);
      more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? 'Show less' : 'Read the full description';
    });
  });

  // The booking sheet (2026-11-22). A Book link carries data-kohsi (its
  // service key, or empty for "she picks"); a click opens her Kohsi booking
  // in the <dialog id="booksheet"> on this page instead of a new tab.
  // widget.js loads on the first sign of intent (hover, focus, tap), never on
  // first paint. If it cannot load, the link is followed in this tab.
  const sheet = document.getElementById('booksheet');
  if (!sheet || typeof sheet.showModal !== 'function') return;
  const body = sheet.querySelector('[data-booksheet-body]');
  const wait = sheet.querySelector('[data-booksheet-wait]');
  const api = sheet.dataset.api;
  let widget = null; // the loading promise
  let shown = null; // the service the current <kohsi-booking> opened on
  let opener = null;
  let pushed = false;

  const loadWidget = () => {
    if (widget) return widget;
    widget = new Promise((resolve, reject) => {
      if (customElements.get('kohsi-booking')) return resolve();
      const s = document.createElement('script');
      s.src = `${api}/widget.js`;
      s.defer = true;
      const timer = setTimeout(() => reject(new Error('timeout')), 10000);
      s.onload = () => customElements.whenDefined('kohsi-booking').then(() => { clearTimeout(timer); resolve(); });
      s.onerror = () => { clearTimeout(timer); reject(new Error('widget.js did not load')); };
      document.head.appendChild(s);
    });
    widget.catch(() => { widget = null; });
    return widget;
  };

  const mount = (service) => {
    if (shown === service && body.querySelector('kohsi-booking')) return;
    body.querySelectorAll('kohsi-booking').forEach((el) => el.remove());
    const el = document.createElement('kohsi-booking');
    el.setAttribute('data-key', sheet.dataset.key);
    el.setAttribute('data-api', api);
    el.setAttribute('data-lang', document.documentElement.lang === 'es' ? 'es' : 'en');
    el.setAttribute('data-heading', '2');
    if (sheet.dataset.email) el.setAttribute('data-email', sheet.dataset.email);
    if (sheet.dataset.phone) el.setAttribute('data-phone', sheet.dataset.phone);
    if (service) el.setAttribute('data-service', service);
    body.appendChild(el);
    shown = service;
  };

  const close = () => {
    if (sheet.open) sheet.close();
  };

  sheet.addEventListener('close', () => {
    document.documentElement.classList.remove('is-booking');
    if (pushed) { pushed = false; history.back(); }
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  // Phone Back closes the sheet instead of leaving the page.
  window.addEventListener('popstate', () => { if (sheet.open) { pushed = false; close(); } });
  sheet.querySelector('[data-booksheet-close]').addEventListener('click', close);
  // Esc and a click on the dimmed page around it do not close the sheet: one
  // stray key or tap would throw away a half-filled booking (koH, 2026-11-23).
  // The close button and phone Back do. The keydown guard also covers
  // browsers whose second Esc would force the dialog shut.
  sheet.addEventListener('cancel', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet.open) e.preventDefault(); }, true);

  const open = (a) => {
    const service = a.dataset.kohsi || '';
    opener = a;
    wait.hidden = false;
    sheet.showModal();
    document.documentElement.classList.add('is-booking');
    try { history.pushState({ booksheet: true }, ''); pushed = true; } catch { pushed = false; }
    sheet.querySelector('[data-booksheet-close]').focus({ preventScroll: true });
    loadWidget().then(
      () => { wait.hidden = true; mount(service); },
      () => {
        // The sheet's own history entry becomes the booking page, so Back still returns here.
        const had = pushed;
        pushed = false;
        close();
        if (had) window.location.replace(a.href);
        else window.location.assign(a.href);
      },
    );
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-kohsi]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(a);
  });
  const intent = (e) => { if (e.target.closest && e.target.closest('a[data-kohsi]')) loadWidget().catch(() => {}); };
  document.addEventListener('pointerover', intent, { passive: true });
  document.addEventListener('focusin', intent);
  document.addEventListener('touchstart', intent, { passive: true });
})();
