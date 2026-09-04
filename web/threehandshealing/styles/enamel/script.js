/* Three Hands Healing — Enamel. Menu, the firing, one sweep per section, the hero gloss. */
(() => {
  const html = document.documentElement;
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  html.classList.add('js');
  if (rm.matches) html.classList.add('rm');
  rm.addEventListener?.('change', (e) => html.classList.toggle('rm', e.matches));

  /* Mobile menu */
  const btn = document.querySelector('[data-menu]');
  const nav = document.getElementById('nav');
  if (btn && nav) {
    const close = () => { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.site-head')) close(); });
  }

  /* Arrival: the egg fires clear */
  const egg = document.querySelector('.egg');
  if (egg) requestAnimationFrame(() => setTimeout(() => egg.classList.add('fired'), 160));

  /* Scroll moments: cells fire, medallions fire, the bracelet lights, the wire draws, the chip heals, the ground catches light */
  if ('IntersectionObserver' in window) {
    const mark = (cls) => (entries, io) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add(cls); io.unobserve(en.target); }
    });
    const cells = new IntersectionObserver(mark('in'), { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    document.querySelectorAll('.cell, .step, .eft').forEach((el) => cells.observe(el));
    const draw = new IntersectionObserver(mark('drawn'), { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    document.querySelectorAll('.plaque').forEach((el) => draw.observe(el));
    const lit = new IntersectionObserver(mark('lit'), { threshold: 0.25 });
    document.querySelectorAll('.guil').forEach((el) => lit.observe(el));
  } else {
    document.querySelectorAll('.cell, .step, .eft').forEach((el) => el.classList.add('in'));
    document.querySelectorAll('.plaque').forEach((el) => el.classList.add('drawn'));
    document.querySelectorAll('.guil').forEach((el) => el.classList.add('lit'));
  }

  /* One wire, two cells: when the pillars stack, the divider follows the first cell's real height */
  const plaque = document.querySelector('.plaque');
  const mPath = document.querySelector('.plaque__wire-m');
  const stacked = matchMedia('(max-width: 900px)');
  const setWire = () => {
    if (!plaque || !mPath || !stacked.matches) return;
    const first = plaque.querySelector('.cell');
    const r = Math.round((first.offsetHeight / plaque.offsetHeight) * 1000);
    mPath.setAttribute('d', `M0 ${r}V0H1000V1000H0V${r}H1000`);
  };
  setWire();
  addEventListener('load', setWire);
  addEventListener('resize', setWire, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(setWire);

  /* Bracelet: tap a gem to read its point (touch has no reliable hover); closes siblings, Escape and outside taps close all */
  const beads = Array.from(document.querySelectorAll('.bead'));
  if (beads.length) {
    const closeAll = (except) => beads.forEach((b) => { if (b !== except) b.classList.remove('is-open'); });
    beads.forEach((b) => b.addEventListener('click', () => { const open = b.classList.toggle('is-open'); closeAll(open ? b : null); }));
    document.addEventListener('click', (e) => { if (!e.target.closest('.bead')) closeAll(null); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(null); });
  }

  /* Hero-only gloss parallax at 0.3x — transform only, off under 700px and under reduced motion */
  const gloss = document.querySelector('.hero__gloss');
  const hero = document.querySelector('.hero');
  if (gloss && hero) {
    let ticking = false;
    const update = () => {
      ticking = false;
      if (html.classList.contains('rm') || innerWidth < 700) { gloss.style.transform = ''; return; }
      const y = Math.min(scrollY, hero.offsetHeight);
      gloss.style.transform = `translate3d(0, ${Math.round(y * 0.3)}px, 0)`;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    update();
  }
})();
