/* Lenticular — the tilt. One value, --tilt (−12°…12°), lerped from scroll position,
   drives every light-catching surface at once. Nothing moves unless you do. */
(function () {
  var d = document, root = d.documentElement;
  root.classList.add('js');

  /* mobile menu */
  var btn = d.querySelector('[data-menu]'), nav = d.getElementById('nav');
  if (btn && nav) {
    var setOpen = function (open) { nav.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); btn.focus(); } });
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var grad = d.getElementById('chrome');
  var lents = [].slice.call(d.querySelectorAll('[data-lent]')).map(function (el) {
    return { el: el, on: false, off: parseFloat(el.getAttribute('data-lent')) || 0 };
  });

  function setTilt(v) {
    root.style.setProperty('--tilt', v.toFixed(2) + 'deg');
    root.style.setProperty('--tn', v.toFixed(3));
    if (grad) grad.setAttribute('gradientTransform', 'rotate(' + (v * 2).toFixed(1) + ' .5 .5)');
  }

  /* registration: each H2 snaps into register once, as it scrolls in */
  var heads = d.querySelectorAll('.reg');
  if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < heads.length; i++) heads[i].classList.add('is-reg');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-reg'); io.unobserve(e.target); } });
    }, { threshold: 0.35 });
    for (var j = 0; j < heads.length; j++) io.observe(heads[j]);
  }

  if (reduce) { setTilt(-4); return; }

  /* lenticulars: a card's viewing angle is the sheet's tilt plus where the card sits on the sheet;
     it snaps to its second image past +3° and back past −3° — hysteresis, never a continuous phase */
  function updateLents(tilt) {
    var vh = window.innerHeight || 1;
    for (var k = 0; k < lents.length; k++) {
      var l = lents[k], r = l.el.getBoundingClientRect();
      var local = tilt + 24 * (vh / 2 - (r.top + r.height / 2)) / vh + l.off;
      if (!l.on && local > 3) { l.on = true; l.el.classList.add('is-b'); }
      else if (l.on && local < -3) { l.on = false; l.el.classList.remove('is-b'); }
    }
  }

  var tilt = -12, target = -12, t0 = null, SWEEP = 1200, running = false;
  function scrollTarget() {
    var max = Math.max(1, root.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, (window.scrollY || root.scrollTop) / max));
    return -12 + 24 * p;
  }
  function frame(now) {
    if (t0 === null) t0 = now;
    var p = (now - t0) / SWEEP;
    if (p < 1) {                       /* arrival: one sweep, −12° → 4°, so the sheet catches light once */
      var e = 1 - Math.pow(1 - p, 3);
      tilt = -12 + 16 * e;
    } else {
      target = scrollTarget();
      tilt += (target - tilt) * 0.06;
    }
    setTilt(tilt); updateLents(tilt);
    if (p < 1 || Math.abs(target - tilt) > 0.01) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  setTilt(tilt); kick();
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
})();
