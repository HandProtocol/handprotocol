/* Vellum — mobile menu, scroll reveals (versals gild, catchwords ink in, the
   acanthus unrolls, the nota bene draws), and the line-filler measurement. */
(() => {
  const html = document.documentElement;
  html.classList.add('js');

  /* menu */
  const btn = document.querySelector('[data-menu]');
  const nav = document.getElementById('nav');
  if (btn && nav) {
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* line-filler: how much of the closing sentence's last line is empty */
  const closing = document.querySelector('[data-linefill]');
  const measure = () => {
    if (!closing) return;
    const text = closing.querySelector('.closing__text');
    const fill = closing.querySelector('.linefiller');
    if (!text || !fill) return;
    const range = document.createRange();
    range.selectNodeContents(text);
    const rects = range.getClientRects();
    if (!rects.length) return;
    const last = rects[rects.length - 1];
    const box = closing.getBoundingClientRect();
    const room = box.right - parseFloat(getComputedStyle(closing).paddingRight) - last.right - 16;
    fill.style.setProperty('--fill', (room > 40 ? Math.floor(room) : 0) + 'px');
  };
  /* marginalia: pin each margin device to the line of text it glosses (--y = that line's centre within its folio) */
  const notes = document.querySelectorAll('.marginalia[data-anchor]');
  const place = () => {
    notes.forEach((m) => {
      const a = document.querySelector(m.dataset.anchor);
      const f = m.closest('.folio');
      if (!a || !f) return;
      const r = a.getClientRects();
      const line = r.length ? r[0] : a.getBoundingClientRect();
      m.style.setProperty('--y', Math.round(line.top + line.height / 2 - f.getBoundingClientRect().top) + 'px');
    });
  };
  const relayout = () => { measure(); place(); };
  relayout();
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(relayout);
    if (closing) ro.observe(closing);
    notes.forEach((m) => { const f = m.closest('.folio'); if (f) ro.observe(f); });
  }
  window.addEventListener('resize', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  /* reveals */
  const items = document.querySelectorAll('[data-reveal]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  items.forEach((el) => io.observe(el));
})();
