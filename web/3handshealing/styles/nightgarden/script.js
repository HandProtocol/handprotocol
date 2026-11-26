/* Nightgarden — the small orchestration. Arrival (moon rises, hero moonflowers
   open) once the fonts are in; the mobile menu; the header plate; scroll
   reveals that fire once; the lantern turning once per step; the jasmine vine
   drawn with the scroll. Everything visual lives in style.css. */
(() => {
  const html = document.documentElement;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* arrival */
  const ready = () => {
    html.classList.add('is-ready');
    $$('.hero [data-bloom]').forEach((b) => b.classList.add('in'));
  };
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 450))]).then(ready, ready);
  } else ready();

  /* mobile menu */
  const btn = $('[data-menu]');
  const nav = $('#nav');
  if (btn && nav) {
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* header plate once the hero starts to scroll */
  const head = $('[data-head]');
  const onHead = () => head && head.classList.toggle('is-stuck', window.scrollY > 24);
  window.addEventListener('scroll', onHead, { passive: true });
  onHead();

  /* the jasmine vine: stem drawn upward with the scroll, leaves and flowers set on it */
  const vine = $('[data-vine]');
  if (vine) {
    const stem = $('.vine__stem', vine);
    const parts = $$('[data-at]', vine);
    let len = 0;
    try { len = stem.getTotalLength(); } catch (e) { len = 0; }
    if (len) {
      stem.style.strokeDasharray = String(len);
      parts.forEach((p) => {
        const at = parseFloat(p.dataset.at);
        const pt = stem.getPointAtLength(len * at);
        const ahead = stem.getPointAtLength(Math.min(len, len * at + 4));
        const ang = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
        const flip = p.hasAttribute('data-flip') ? ' scale(1 -1)' : '';
        const isFlower = p.getAttribute('href') === '#jas';
        p.setAttribute('transform', isFlower ? `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})` : `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${(ang + 90).toFixed(1)})${flip}`);
      });
      const draw = () => {
        const max = html.scrollHeight - window.innerHeight;
        const p = reduce ? 1 : Math.min(1, Math.max(0, max > 0 ? window.scrollY / max : 1));
        stem.style.strokeDashoffset = String(len * (1 - p));
        parts.forEach((el) => el.classList.toggle('is-on', p >= parseFloat(el.dataset.at)));
      };
      window.addEventListener('scroll', draw, { passive: true });
      window.addEventListener('resize', draw);
      draw();
    }
  }

  /* scroll moments — sections, moonflowers, the EFT fireflies — each once */
  const targets = $$('[data-reveal], [data-bloom]:not(.hero [data-bloom])');
  const lantern = $('[data-lantern]');
  const steps = $$('.step');
  let lit = 1;
  const turn = (n) => {
    if (!lantern) return;
    lantern.dataset.turn = String(n);           /* the panel follows the step at the viewport centre, both directions */
    lit = Math.max(lit, n);                      /* the numerals stay lit once reached */
    steps.forEach((s) => s.classList.toggle('is-lit', parseInt(s.dataset.step, 10) <= lit));
  };

  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('in'));
    steps.forEach((s) => s.classList.add('is-lit'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  targets.forEach((t) => io.observe(t));

  const so = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const n = parseInt(e.target.dataset.step, 10);
      if (e.isIntersecting) turn(n);
      /* a step leaving the band downward (scrolling up, or a jump to the top) turns the drum back */
      else if (n > 1 && e.rootBounds && e.boundingClientRect.top >= e.rootBounds.bottom) turn(Math.min(parseInt(lantern.dataset.turn || '1', 10), n - 1));
    }
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  steps.forEach((s) => so.observe(s));
  turn(1);
})();
