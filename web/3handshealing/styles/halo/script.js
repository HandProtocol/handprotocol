/* Three Hands Healing — Halo. Header glass on scroll, mobile menu,
   scroll reveals, and the halo that drifts a few px toward the pointer. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  /* header turns to glass once the page moves */
  const header = document.querySelector('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 16);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* mobile menu */
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    const set = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* scroll reveals */
  const targets = document.querySelectorAll('[data-reveal]');
  if (reduce.matches || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
  }

  /* the halo (and, more faintly, Maria) drift toward the pointer — lerped */
  const hero = document.querySelector('.hero');
  const halo = document.querySelector('.halo');
  const portrait = document.querySelector('.portrait');
  if (hero && halo && portrait && fine.matches && !reduce.matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.055;
      cy += (ty - cy) * 0.055;
      halo.style.setProperty('--dx', (cx * 22).toFixed(2) + 'px');
      halo.style.setProperty('--dy', (cy * 22).toFixed(2) + 'px');
      portrait.style.setProperty('--px', (cx * 8).toFixed(2) + 'px');
      portrait.style.setProperty('--py', (cy * 8).toFixed(2) + 'px');
      raf = (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) ? requestAnimationFrame(tick) : 0;
    };
    const aim = (x, y) => { tx = x; ty = y; if (!raf) raf = requestAnimationFrame(tick); };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      aim(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    });
    hero.addEventListener('pointerleave', () => aim(0, 0));
  }
})();
