/* Retro — scroll reveals only. Rays + badge are pure CSS. */
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const items = document.querySelectorAll('[data-reveal]');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(el => io.observe(el));
})();
