/* Monolith — one slow film. Vanilla, transform/opacity only. */
(function () {
  var d = document, root = d.documentElement, body = d.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  /* 1 · headline, word by word */
  var h = d.querySelector('.reveal');
  if (h && !reduce) {
    var i = 0;
    var walk = function (node, into) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { into.appendChild(d.createTextNode(' ')); return; }
            var s = d.createElement('span');
            s.className = 'w'; s.textContent = part;
            s.style.transitionDelay = (i++ * 60) + 'ms';
            into.appendChild(s);
          });
        } else if (n.nodeType === 1) {
          var c = n.cloneNode(false); into.appendChild(c); walk(n, c);
        }
      });
    };
    var frag = d.createDocumentFragment();
    walk(h, frag); h.textContent = ''; h.appendChild(frag);
    var go = function () { requestAnimationFrame(function () { h.classList.add('is-in'); }); };
    var done = false, once = function () { if (!done) { done = true; go(); } };
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(once);
    setTimeout(once, 900);
  } else if (h) { h.classList.add('is-in'); }

  /* 2 · progress line */
  var bar = d.querySelector('.progress span'), ticking = false;
  var bookSec = d.getElementById('book'), fade = d.querySelector('.fade');
  var paint = function () {
    var max = root.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
    /* the fade band's contrast crossover (~65% down) decides when fixed chrome goes dark */
    if (bookSec && fade) {
      var top = bookSec.getBoundingClientRect().top, cross = top + fade.offsetHeight * 0.65;
      body.classList.toggle('is-light', cross < 44);
      body.classList.toggle('is-warm-mid', cross < window.innerHeight / 2);
    }
    ticking = false;
  };
  var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  paint();

  /* 3 · frames entering */
  var seen = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); seen.unobserve(e.target); } });
  }, { threshold: 0.18 });
  Array.prototype.forEach.call(d.querySelectorAll('.frame, .split, .book'), function (el) { seen.observe(el); });

  /* 4 · active chapter (rail) — the chapter crossing the middle of the viewport */
  var links = Array.prototype.slice.call(d.querySelectorAll('.rail a'));
  var setActive = function (id) {
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    body.classList.toggle('is-book', id === 'book');
  };
  var mid = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-48% 0px -48% 0px', threshold: 0 });
  Array.prototype.forEach.call(d.querySelectorAll('.chapter'), function (c) { mid.observe(c); });

})();
