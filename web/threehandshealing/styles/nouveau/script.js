/* Nouveau — the small orchestration: the arrival timeline starts once the
   fonts are in, three scroll moments fire once each, the mobile menu, and
   the header's hairline. Everything visual lives in style.css. */
(() => {
  const html = document.documentElement;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* arrival: cartouche draws, words rise, irises open — after the faces load (or 400 ms) */
  const ready = () => html.classList.add('is-ready');
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 400))]).then(ready, ready);
  } else ready();

  /* mobile menu */
  const btn = document.querySelector('[data-menu]');
  const nav = document.getElementById('nav');
  if (btn && nav) {
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* header hairline once the poster starts to scroll */
  const head = document.querySelector('.site-head');
  if (head) {
    const onScroll = () => head.classList.toggle('is-stuck', window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* scroll moments — the diptych arc, the step stem, the peacock fan — each once */
  const targets = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  targets.forEach((t) => io.observe(t));
})();
