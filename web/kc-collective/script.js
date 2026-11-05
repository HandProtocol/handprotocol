/* KC Collective: menu toggle, a single section reveal, form thanks. */
(function () {
  var menuBtn = document.querySelector('[data-menu]');
  var nav = document.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('.sec > .wrap, .quote, .join__inner');
  if (!reduce && 'IntersectionObserver' in window) {
    targets.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .08 });
    targets.forEach(function (el) { io.observe(el); });
  }

  if (/[?&]joined=1/.test(location.search)) {
    var ok = document.querySelector('[data-joined]');
    var form = ok && ok.closest('form');
    if (ok) {
      ok.hidden = false;
      if (form) {
        form.querySelectorAll('input:not([type=hidden]), button').forEach(function (el) { el.disabled = true; });
      }
    }
  }
})();
