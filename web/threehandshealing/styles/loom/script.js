/* Loom — the mobile menu, the load choreography switch, and the scroll-woven
   ornaments: the partnership cord, the knots that untie, the shuttle that
   crosses the steps, and the headings that expand once. Finished states are
   the CSS defaults; this file only ever moves things toward them. */
(() => {
  const html = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- mobile menu ---- */
  const btn = document.querySelector('[data-menu]');
  const nav = document.getElementById('nav');
  if (btn && nav) {
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* ---- pieces ---- */
  const knots = [...document.querySelectorAll('.knot')];
  const loom = document.querySelector('.loom-steps');
  const steps = [...document.querySelectorAll('.step')];
  const cord = document.querySelector('.cord');
  const main = document.getElementById('main');
  const setP = (p) => {
    if (!loom) return;
    loom.style.setProperty('--p', p.toFixed(3));
    steps.forEach((s, i) => s.classList.toggle('is-woven', p >= (i + 0.5) / steps.length));
  };

  /* ---- the partnership cord: two threads down the left gutter, twisting at every section boundary ---- */
  let len = 0, cordStart = 0, cordSpan = 1;
  const paths = cord ? [...cord.querySelectorAll('path')] : [];
  const draw = () => {
    if (!len) return;
    const doc = document.documentElement;
    const y = window.scrollY + window.innerHeight * 0.8 - main.offsetTop;
    const f = doc.scrollHeight - doc.clientHeight < 4 ? 1 : Math.min(1, Math.max(0, (y - cordStart) / cordSpan));
    paths.forEach((p) => { p.style.strokeDashoffset = String(len * (1 - f)); });
  };
  const buildCord = () => {
    if (!cord || !main || window.innerWidth < 1000) { len = 0; return; }
    const H = main.offsetHeight;
    const secs = [...main.querySelectorAll(':scope > section')];
    cordStart = 0;
    cordSpan = Math.max(1, H);
    let a = `M8 ${cordStart}`, b = `M20 ${cordStart}`;
    secs.slice(1).forEach((s) => {
      const t = s.offsetTop;
      if (t - 60 <= 40) return;
      a += ` L8 ${t - 60} C8 ${t - 20} 20 ${t - 40} 20 ${t} C20 ${t + 40} 8 ${t + 20} 8 ${t + 60}`;
      b += ` L20 ${t - 60} C20 ${t - 20} 8 ${t - 40} 8 ${t} C8 ${t + 40} 20 ${t + 20} 20 ${t + 60}`;
    });
    a += ` L8 ${H}`; b += ` L20 ${H}`;
    cord.setAttribute('viewBox', `0 0 28 ${H}`);
    paths[0].setAttribute('d', a);
    paths[1].setAttribute('d', b);
    len = paths[0].getTotalLength();
    paths.forEach((p) => { p.style.strokeDasharray = String(len); });
    if (still) paths.forEach((p) => { p.style.strokeDashoffset = '0'; });
    else draw();
  };

  /* ---- align the headline's flax threads to the hero warp's pitch ---- */
  const hero = document.getElementById('top');
  const wovenHero = document.querySelector('.woven--hero');
  const alignThreads = () => {
    if (!hero || !wovenHero) return;
    const wr = wovenHero.getBoundingClientRect();
    const dx = wr.left - 14 - hero.getBoundingClientRect().left;
    wovenHero.style.setProperty('--wx', `${19 - dx}px`);
    /* park the last shuttle just past the end of the third weft line */
    const last = wovenHero.querySelector('.woven__front .weft:last-child');
    if (last) {
      const r = document.createRange(); r.selectNodeContents(last);
      wovenHero.style.setProperty('--park', `${Math.round(r.getBoundingClientRect().right - wr.left)}px`);
    }
  };
  alignThreads();

  /* ---- reduced motion: land on the finished state and stop ---- */
  if (still) {
    html.classList.add('is-still');
    knots.forEach((k) => k.setAttribute('d', k.dataset.straight));
    setP(1);
    buildCord();
    window.addEventListener('resize', () => { alignThreads(); buildCord(); });
    window.addEventListener('load', () => { alignThreads(); buildCord(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { alignThreads(); buildCord(); });
    return;
  }

  /* ---- load: start the choreography once the faces are in (or soon after) ---- */
  let readied = false;
  const woven = () => html.classList.add('is-woven');
  const label = document.querySelector('.hero__label');
  const ready = () => {
    if (readied) return; readied = true; html.classList.add('is-ready');
    /* commit the finished hero as a static rule once the last animation (the label's rise) ends, or 2.8 s in regardless */
    if (label) label.addEventListener('animationend', woven, { once: true });
    setTimeout(woven, 2800);
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready);
  setTimeout(ready, 1100);

  const g = window.gsap;
  const ST = window.ScrollTrigger;
  if (g && ST) g.registerPlugin(ST);

  /* ---- headings expand once as they enter ---- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.expand').forEach((el) => io.observe(el));

  /* ---- the knots untie as the validation heading enters ---- */
  const alone = document.getElementById('alone');
  if (knots.length && alone) {
    const untie = () => knots.forEach((k, i) => {
      if (g) g.to(k, { attr: { d: k.dataset.straight }, duration: 1.5, delay: i * 0.3, ease: 'power2.inOut' });
      else k.setAttribute('d', k.dataset.straight);
    });
    const kio = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { untie(); kio.disconnect(); }
    }, { rootMargin: '0px 0px -30% 0px' });
    kio.observe(alone);
  }

  /* ---- the shuttle crosses the three steps on scroll ---- */
  if (loom) {
    setP(0);
    if (ST) {
      ST.create({ trigger: loom, start: 'top 82%', end: 'bottom 50%', scrub: 0.6, onUpdate: (s) => setP(s.progress) });
    } else {
      const sio = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setP(1); sio.disconnect(); } }, { rootMargin: '0px 0px -20% 0px' });
      sio.observe(loom);
    }
  }

  /* ---- the cord draws to just ahead of where you are reading ---- */
  let tick = false;
  window.addEventListener('scroll', () => {
    if (tick) return;
    tick = true;
    requestAnimationFrame(() => { draw(); tick = false; });
  }, { passive: true });
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); alignThreads(); rt = setTimeout(buildCord, 150); });
  buildCord();
  window.addEventListener('load', () => { alignThreads(); buildCord(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { alignThreads(); buildCord(); });
})();
