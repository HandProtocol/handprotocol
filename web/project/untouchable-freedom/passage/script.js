/* Passage: the page background moves from night into light as you scroll,
   text flips from light to dark at the luminance where both keep 4.5:1,
   and the chapter rail tracks the stage nearest the viewport centre.
   Under reduced motion the four stages keep their own flat backgrounds. */
(() => {
  const html = document.documentElement;
  html.classList.remove('no-js');
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  const stages = Array.from(document.querySelectorAll('.stage'));
  const rail = document.querySelector('.rail');
  const links = rail ? Array.from(rail.querySelectorAll('a')) : [];
  const COL = [[15, 15, 16], [43, 47, 54], [185, 140, 90], [244, 239, 230]];

  /* Entrance reveals, once. */
  const rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rv.forEach((el) => io.observe(el));
  } else {
    rv.forEach((el) => el.classList.add('is-in'));
  }

  if (stages.length !== 4) return;

  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  /* Steep ease: the colour holds near each stage and crosses quickly between them. */
  const ease = (p) => (p < 0.5 ? 8 * p * p * p * p : 1 - 8 * Math.pow(1 - p, 4));
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

  let tops = [], bottoms = [], centres = [];
  const measure = () => {
    tops = stages.map((s) => s.getBoundingClientRect().top + window.scrollY);
    bottoms = stages.map((s, i) => tops[i] + s.offsetHeight);
    centres = tops.map((t, i) => (t + bottoms[i]) / 2);
  };

  const colourAt = (y) => {
    if (rm.matches) {
      if (y < tops[0]) return COL[0];
      for (let i = 3; i >= 0; i--) if (y >= tops[i]) return COL[i];
      return COL[0];
    }
    if (y <= centres[0]) return COL[0];
    if (y >= centres[3]) return COL[3];
    let i = 0;
    while (y >= centres[i + 1]) i++;
    return mix(COL[i], COL[i + 1], ease((y - centres[i]) / (centres[i + 1] - centres[i])));
  };

  const last = { bg: '', light: null, on: null, active: -1 };
  const update = () => {
    const vh = window.innerHeight;
    const y = window.scrollY + vh / 2;
    const c = colourAt(y);
    const bg = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    if (bg !== last.bg) { html.style.setProperty('--bg', bg); last.bg = bg; }
    /* #fff holds 4.5:1 up to L 0.183, #000 from L 0.175: flip between them. */
    const light = lum(c) >= 0.18;
    if (light !== last.light) { html.classList.toggle('is-light', light); last.light = light; }
    if (!rail) return;
    const on = y > tops[0] - vh * 0.35 && y < bottoms[3] + vh * 0.1;
    if (on !== last.on) { rail.classList.toggle('is-on', on); last.on = on; }
    let active = -1;
    if (on) {
      let best = Infinity;
      centres.forEach((cc, i) => { const d = Math.abs(cc - y); if (d < best) { best = d; active = i; } });
    }
    if (active !== last.active) {
      links.forEach((a, i) => {
        const isActive = i === active;
        a.classList.toggle('is-active', isActive);
        if (isActive) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      last.active = active;
    }
  };

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  };
  const refresh = () => { measure(); update(); };
  const setMode = () => { html.classList.toggle('passage', !rm.matches); refresh(); };

  setMode();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(document.body);
  if (typeof rm.addEventListener === 'function') rm.addEventListener('change', setMode);
})();
