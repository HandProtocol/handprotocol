/* Three Hands Healing — Tide. The breath engine (4 in · 4 hold · 6 out). */
(() => {
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.hero');
  const svg = document.querySelector('.tide__svg');
  const paths = svg ? [...svg.querySelectorAll('path')] : [];
  const caption = document.querySelector('.breath__caption');
  const header = document.querySelector('[data-header]');

  /* ---- header ---- */
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 24);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- reveals + water levels ---- */
  const targets = document.querySelectorAll('[data-reveal], [data-levels]');
  if ('IntersectionObserver' in window && !rm.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add('is-in'));
  }

  /* ---- the tide ---- */
  if (!hero || !svg || paths.length !== 3) return;

  // level: resting waterline as a fraction of band height from the bottom;
  // rise: extra height at full inhale; amp: crest amplitude [exhaled, inhaled] in px;
  // cycles: crests across a 1440px band; speed: slow horizontal drift (cycles per second).
  const layers = [
    { level: .55, rise: .17, amp: [9, 20], cycles: 2.2, speed: .085 },   // back — teal
    { level: .43, rise: .16, amp: [11, 24], cycles: 1.55, speed: -.065 }, // mid — seafoam
    { level: .31, rise: .14, amp: [12, 26], cycles: 1.1, speed: .05 },   // front — foam
  ];
  const IN = 4000, HOLD = 4000, OUT = 6000, TOTAL = IN + HOLD + OUT;
  const LABEL = { in: 'breathe in', hold: 'hold', out: 'breathe out' };
  const ease = (x) => .5 - .5 * Math.cos(Math.PI * x);

  let W = 0, H = 0;
  const size = () => {
    const r = svg.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  };

  const build = (l, b, t) => {
    const base = H * (1 - (l.level + l.rise * b));
    const amp = l.amp[0] + (l.amp[1] - l.amp[0]) * b;
    const k = (2 * Math.PI * l.cycles * Math.max(.5, Math.min(1, W / 1440))) / W;
    const ph = t * l.speed * 2 * Math.PI;
    const step = Math.max(10, W / 110);
    const y = (x) => base + amp * Math.sin(x * k + ph) + amp * .38 * Math.sin(x * k * 2.3 - ph * 1.6 + 1.2);
    let d = `M0 ${H + 4}L0 ${y(0).toFixed(1)}`;
    for (let x = step; x < W + step; x += step) d += `L${x.toFixed(0)} ${y(x).toFixed(1)}`;
    return d + `L${W + 4} ${H + 4}Z`;
  };

  const draw = (b, t) => {
    hero.style.setProperty('--breath', b.toFixed(4));
    for (let i = 0; i < 3; i++) paths[i].setAttribute('d', build(layers[i], b, t));
  };

  let phase = '';
  const setPhase = (p) => {
    if (p === phase) return;
    phase = p;
    hero.dataset.phase = p;
    if (!caption) return;
    caption.textContent = LABEL[p];
    caption.classList.remove('is-new');
    void caption.offsetWidth;
    caption.classList.add('is-new');
  };

  const breathAt = (ms) => {
    const t = ms % TOTAL;
    if (t < IN) return [ease(t / IN), 'in'];
    if (t < IN + HOLD) return [1, 'hold'];
    return [1 - ease((t - IN - HOLD) / OUT), 'out'];
  };

  let raf = 0, start = 0, paused = 0;
  const frame = (now) => {
    const ms = now - start;
    const [b, p] = breathAt(ms);
    setPhase(p);
    draw(b, ms / 1000);
    raf = requestAnimationFrame(frame);
  };

  const run = () => {
    cancelAnimationFrame(raf);
    start = performance.now() - paused;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; paused = performance.now() - start; };

  const still = () => {
    cancelAnimationFrame(raf); raf = 0;
    phase = 'still';
    hero.dataset.phase = 'still';
    if (caption) { caption.classList.remove('is-new'); caption.textContent = 'Breathe at your own pace.'; }
    draw(.5, 0);
  };

  const apply = () => { size(); if (rm.matches) still(); else { paused = 0; run(); } };

  if ('ResizeObserver' in window) new ResizeObserver(size).observe(svg);
  else addEventListener('resize', size);
  rm.addEventListener ? rm.addEventListener('change', apply) : rm.addListener(apply);
  document.addEventListener('visibilitychange', () => {
    if (rm.matches) return;
    if (document.hidden) stop(); else run();
  });

  apply();
})();
