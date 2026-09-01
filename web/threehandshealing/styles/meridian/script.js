/* Meridian — tapping-sequence light-up, list hover, scroll reveals. */
(() => {
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  const svg = document.getElementById('dg');
  const pts = svg ? [...svg.querySelectorAll('.pt')] : [];
  const rows = [...document.querySelectorAll('.seq li')];

  // Crop the figure on narrow screens (labels move to the list below).
  const mq = matchMedia('(max-width: 719px)');
  const setBox = () => svg && svg.setAttribute('viewBox', mq.matches ? '120 40 400 520' : '0 0 640 560');
  setBox();
  mq.addEventListener('change', setBox);

  let timers = [];
  let playing = false;
  const set = (i, on) => {
    pts[i].classList.toggle('lit', on);
    if (rows[i]) rows[i].classList.toggle('lit', on);
  };
  function play() {
    if (!pts.length) return;
    if (rm.matches) { pts.forEach((_, i) => set(i, true)); return; }
    timers.forEach(clearTimeout); timers = [];
    pts.forEach((_, i) => set(i, false));
    void svg.getBoundingClientRect(); // reflow so the ring animation restarts
    playing = true;
    pts.forEach((_, i) => timers.push(setTimeout(() => {
      set(i, true);
      if (i === pts.length - 1) playing = false;
    }, 420 + i * 260)));
  }
  play();

  const seq = document.querySelector('.seq');
  if (seq) seq.addEventListener('mouseenter', () => { if (!playing) play(); });
  rows.forEach((r, i) => {
    r.addEventListener('mouseenter', () => pts[i] && pts[i].classList.add('hot'));
    r.addEventListener('mouseleave', () => pts[i] && pts[i].classList.remove('hot'));
  });
  const rp = document.getElementById('replay');
  if (rp) rp.addEventListener('click', play);

  // Scroll reveals + the session timeline dots.
  const targets = document.querySelectorAll('[data-reveal], .tl');
  if (rm.matches || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  targets.forEach(el => io.observe(el));
})();
