/* Three Hands Healing — Zine. Vanilla: staggered strip "stick-on" at load,
   scroll reveals, and hand-drawn marks that draw themselves on scroll. */
(() => {
  const html = document.documentElement;
  html.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stagger the headline strips (index feeds the CSS transition-delay).
  document.querySelectorAll('.hero .cut .w').forEach((w, i) => w.style.setProperty('--i', i));

  let loadedOnce = false;
  const loaded = () => { if (!loadedOnce) { loadedOnce = true; html.classList.add('is-loaded'); } };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(loaded, loaded); else loaded();
  window.setTimeout(loaded, 1400); // never hold the headline hostage to a slow font

  const targets = document.querySelectorAll('.reveal, .mk');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-in', 'is-drawn'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in', 'is-drawn');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  targets.forEach((t) => io.observe(t));
})();
