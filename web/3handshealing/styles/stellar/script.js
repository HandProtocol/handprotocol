/* Three Hands Healing — Stellar. Starfield, parallax, reveals. */
(() => {
  const rm = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- canvas starfield ---------- */
  const c = document.getElementById('sky');
  const ctx = c && c.getContext('2d');
  let W = 0, H = 0, stars = [], raf = 0, running = false;
  const t0 = performance.now();

  // seeded so the same sky greets every visit
  function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  function seed() {
    const r = rng(1979);
    const n = Math.max(150, Math.round((W * H) / 4200));
    stars = [];
    for (let i = 0; i < n; i++) {
      const depth = [0.1, 0.2, 0.36][Math.floor(r() * 3)];
      stars.push({
        x: r() * W, y: r() * H,
        r: 0.35 + r() * r() * 1.35,
        a: 0.18 + r() * 0.68,
        p: r() * 6.283, v: 0.22 + r() * 0.5,
        d: depth, g: r() < 0.045,
      });
    }
  }

  function size() {
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    draw(performance.now());
  }

  function draw(now) {
    const still = rm.matches;
    const t = (now - t0) / 1000;
    const sy = still ? 0 : window.scrollY;
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      let y = (s.y - sy * s.d) % H; if (y < 0) y += H;
      const tw = still ? 1 : 0.72 + 0.28 * Math.sin(t * s.v + s.p);
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = s.g ? '#E8C170' : '#F4F1FF';
      ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) { draw(now); raf = requestAnimationFrame(loop); }
  function start() { if (!ctx || running || rm.matches) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  if (ctx) {
    size();
    start();
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 120); }, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    rm.addEventListener?.('change', () => { stop(); draw(performance.now()); start(); });
  }

  /* ---------- header ---------- */
  const header = document.querySelector('[data-header]');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- mobile menu ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('nav');
  if (toggle && nav) {
    const set = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      header && header.classList.toggle('is-open', open);
      toggle.querySelector('[data-open]').hidden = open;
      toggle.querySelector('[data-close]').hidden = !open;
    };
    toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* ---------- reveals + constellation drawing ---------- */
  const targets = document.querySelectorAll('[data-reveal], .fam');
  if ('IntersectionObserver' in window && !rm.matches) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add('in'));
  }
})();
