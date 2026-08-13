/* Cafe Nena'i — motion layer. No dependencies, ~2KB.
   Everything degrades to a static page if this file never loads. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------------------------------------------- scroll reveal */
  // Stagger is per-section, so each block counts up from zero as you reach it.
  var targets = document.querySelectorAll('[data-reveal]');
  var seen = new Map();
  targets.forEach(function (el) {
    var group = el.closest('section, .hero, footer') || document.body;
    var n = seen.get(group) || 0;
    // Cap the delay so a long list never leaves the last item hanging.
    el.style.setProperty('--i', Math.min(n, 6));
    seen.set(group, n + 1);
  });

  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    targets.forEach(function (el) {
      // Anything already on screen at load reveals immediately — no blank fold.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        el.classList.add('is-in');
      } else {
        io.observe(el);
      }
    });
  }

  /* ------------------------------------------- header condense */
  var header = document.querySelector('.site-header');
  if (header) {
    var stuck = false;
    var onScroll = function () {
      var now = window.scrollY > 40;
      if (now !== stuck) { stuck = now; header.classList.toggle('is-stuck', now); }
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------- cursor spotlight on cards */
  if (!reduced && matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('.item-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    /* ------------------------------------- magnetic buttons */
    // A few pixels of pull — enough to feel responsive, not enough to notice.
    document.querySelectorAll('.btn:not(.btn--text), .nav-order').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / r.width;
        var y = (e.clientY - r.top - r.height / 2) / r.height;
        btn.style.transform = 'translate(' + (x * 7).toFixed(2) + 'px,' + (y * 5).toFixed(2) + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  }

  /* --------------------------------- lazy images fade in */
  document.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
    if (img.complete && img.naturalWidth) { img.classList.add('is-loaded'); return; }
    img.addEventListener('load', function () { img.classList.add('is-loaded'); }, { once: true });
    img.addEventListener('error', function () { img.classList.add('is-loaded'); }, { once: true });
  });

  /* ------------------- hero chevron scrolls to the next block */
  var chev = document.querySelector('.hero__scroll');
  if (chev) {
    chev.addEventListener('click', function (e) {
      var t = document.querySelector(chev.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  }

  root.classList.add('motion-ready');
})();
