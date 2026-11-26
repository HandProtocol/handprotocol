/* Prism — cursor-reactive aura + header state. No dependencies. */
(() => {
  const head = document.getElementById('site-head');
  const onScroll = () => head && head.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const hero = document.querySelector('.hero');
  const blob = document.getElementById('aura');
  const portrait = document.getElementById('portrait');
  if (!hero || !blob || !portrait) return;

  // Anchor the aura to the centre of the portrait, whatever the layout does.
  const anchor = () => {
    const h = hero.getBoundingClientRect();
    const p = portrait.getBoundingClientRect();
    blob.style.left = (p.left - h.left + p.width / 2) + 'px';
    blob.style.top = (p.top - h.top + p.height * 0.48) + 'px';
  };
  anchor();
  window.addEventListener('resize', anchor, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(anchor);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return; // static aura, no drift

  const coarse = window.matchMedia('(hover: none)');
  const EASE = 0.06;
  let tx = 0, ty = 0, cx = 0, cy = 0;
  let idle = true, lastMove = 0, t = Math.random() * 100;
  let running = false, raf = 0;

  const range = () => {
    const w = hero.clientWidth;
    return { x: Math.min(180, w * 0.14), y: Math.min(130, hero.clientHeight * 0.12) };
  };

  const onMove = (e) => {
    if (coarse.matches) return;
    const r = hero.getBoundingClientRect();
    if (e.clientY > r.bottom) return; // pointer is below the hero: let it drift home
    const R = range();
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    tx = Math.max(-1, Math.min(1, nx)) * R.x;
    ty = Math.max(-1, Math.min(1, ny)) * R.y;
    idle = false;
    lastMove = performance.now();
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  const tick = (now) => {
    if (!running) return;
    if (!idle && now - lastMove > 2400) idle = true;
    if (idle) {
      // slow autonomous drift — a breath, not a loop that tires
      t += 0.0035;
      const R = range();
      tx = Math.sin(t * 0.9) * R.x * 0.55;
      ty = Math.cos(t * 0.65) * R.y * 0.55;
    }
    cx += (tx - cx) * EASE;
    cy += (ty - cy) * EASE;
    blob.style.transform = `translate3d(calc(-50% + ${cx.toFixed(2)}px), calc(-50% + ${cy.toFixed(2)}px), 0)`;
    raf = requestAnimationFrame(tick);
  };

  const start = () => { if (!running) { running = true; raf = requestAnimationFrame(tick); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  // Only animate while the hero is on screen and the tab is visible.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries[0].isIntersecting && !document.hidden ? start() : stop();
    }, { threshold: 0.05 }).observe(hero);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
})();
