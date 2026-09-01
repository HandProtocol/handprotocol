/* Terra — sun rise on load, subtle rise on scroll, quiet reveals. */
(() => {
  const html = document.documentElement;
  html.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const head = document.querySelector('[data-head]');
  const sun = document.querySelector('[data-sun]');

  const onScroll = () => {
    const y = window.scrollY || 0;
    if (head) head.classList.toggle('is-scrolled', y > 24);
    if (sun && !reduce.matches) {
      const p = Math.min(1, y / 720);
      const eased = 1 - Math.pow(1 - p, 2);
      sun.style.transform = `translate3d(0, ${(-84 * eased).toFixed(1)}px, 0)`;
    }
  };
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  // Load orchestration: sun rises, headline settles, photo fades in.
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add('is-ready')));

  // Section reveals.
  const targets = document.querySelectorAll('[data-reveal]');
  if (!reduce.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add('in'));
  }
})();
