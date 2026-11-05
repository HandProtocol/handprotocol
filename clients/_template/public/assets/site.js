/* Site effects: loader, cursor, parallax, reveals, masonry, tilt, magnetic
   buttons, lightbox. Vanilla, no dependencies. Every effect degrades cleanly.
   Hooks onto the class names/ids in site/page.mjs; lightbox data comes from
   the #site-media JSON block. */
(function () {
  'use strict';
  var d = document, w = window, body = d.body;
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* ---- loader: the wordmark pulls into focus, then the curtain lifts ---- */
  function ready() { body.classList.remove('is-loading'); body.classList.add('is-ready'); }
  if (reduce) ready();
  else {
    var done = false, fire = function () { if (!done) { done = true; ready(); } };
    setTimeout(fire, 1750);
    w.addEventListener('load', function () { setTimeout(fire, 1750); });
    setTimeout(fire, 4000); // never trap the visitor
  }

  /* ---- scroll: nav state, progress bar, mobile call bar, parallax ---- */
  var nav = $('#nav'), progress = $('#progress'), callbar = $('#callbar'), hero = $('.hero');
  var parallaxEls = $$('[data-parallax]'), pItems = $$('[data-parallax-item]');
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    w.requestAnimationFrame(function () {
      var y = w.scrollY || w.pageYOffset;
      var h = d.documentElement.scrollHeight - w.innerHeight;
      if (nav) nav.classList.toggle('is-scrolled', y > 24);
      if (progress) progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
      if (callbar) callbar.classList.toggle('is-visible', hero ? y > hero.offsetHeight * 0.6 : y > 400);
      if (!reduce) {
        parallaxEls.forEach(function (el) { el.style.transform = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)'; });
        pItems.forEach(function (el) {
          var r = el.parentNode.getBoundingClientRect();
          var f = parseFloat(el.getAttribute('data-parallax-item')) || 0;
          var rel = (r.top + r.height / 2 - w.innerHeight / 2);
          var off = Math.max(-56, Math.min(56, rel * f));
          el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
        });
      }
      ticking = false;
    });
  }
  w.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- mobile menu ---- */
  var toggle = $('#navtoggle'), menu = $('#menu');
  if (toggle && menu) {
    var setMenu = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.hidden = !open; body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', function () { setMenu(menu.hidden); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
  }

  /* ---- custom cursor + spotlight (desktop only) ---- */
  var cursor = $('#cursor'), spot = $('#spot');
  if (fine && !reduce && cursor) {
    body.classList.add('has-cursor');
    var mx = w.innerWidth / 2, my = w.innerHeight / 2, rx = mx, ry = my;
    var dot = $('.cursor__dot', cursor), ring = $('.cursor__ring', cursor);
    d.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
      if (spot) { spot.style.setProperty('--mx', mx + 'px'); spot.style.setProperty('--my', (my + (w.scrollY || 0) * 0.18) + 'px'); }
    }, { passive: true });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px) translate(-50%,-50%)';
      w.requestAnimationFrame(loop);
    })();
    d.addEventListener('mouseover', function (e) {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .tile, .card'));
    });
    d.addEventListener('mouseleave', function () { cursor.style.opacity = '0'; });
    d.addEventListener('mouseenter', function () { cursor.style.opacity = '1'; });
  }

  /* ---- glow that follows the pointer on cards, tiles, primary buttons ---- */
  if (fine) {
    d.addEventListener('pointermove', function (e) {
      var el = e.target.closest('[data-glow], .tile, .btn--primary');
      if (!el) return;
      var r = el.getBoundingClientRect();
      var px = ((e.clientX - r.left) / r.width) * 100, py = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty('--mx', px + '%'); el.style.setProperty('--my', py + '%');
      if (el.classList.contains('tile') && !reduce) {
        el.style.setProperty('--ry', ((px - 50) / 50 * 4).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((50 - py) / 50 * 4).toFixed(2) + 'deg');
      }
    }, { passive: true });
    d.addEventListener('pointerleave', function (e) {
      var el = e.target && e.target.closest && e.target.closest('.tile');
      if (el) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
    }, true);
  }

  /* ---- magnetic buttons ---- */
  if (fine && !reduce) {
    $$('[data-magnetic]').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = 'translate(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.28).toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  }

  /* ---- reveal on scroll (blur → sharp) ---- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in w && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add('in'); });

  /* ---- stat counters ---- */
  $$('[data-count]').forEach(function (el) {
    var text = el.textContent.trim(), m = text.match(/^([^\d]*)(\d[\d,]*)(\.\d+)?(.*)$/);
    if (!m || reduce) return;
    var target = parseFloat(m[2].replace(/,/g, '') + (m[3] || '')), dec = m[3] ? m[3].length - 1 : 0;
    var start = null, dur = 1400;
    function fmt(n) { var s = n.toFixed(dec); return dec ? s : s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function step(ts) {
      if (!start) start = ts; var p = Math.min(1, (ts - start) / dur), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = m[1] + fmt(target * eased) + m[4];
      if (p < 1) w.requestAnimationFrame(step); else el.textContent = text;
    }
    setTimeout(function () { w.requestAnimationFrame(step); }, 1400);
  });

  /* ---- masonry gallery + category filter ---- */
  var gallery = $('#gallery');
  function layout() {
    if (!gallery) return;
    var cs = getComputedStyle(gallery);
    var cols = cs.gridTemplateColumns.split(' ').length;
    var tiles = $$('.tile', gallery).filter(function (t) { return !t.classList.contains('is-hidden'); });
    if (cols < 2) {
      gallery.classList.remove('is-masonry');
      tiles.forEach(function (t) { t.style.gridColumn = ''; t.style.gridRow = ''; });
      return;
    }
    gallery.classList.add('is-masonry');
    var gap = parseFloat(cs.rowGap) || 16, rowH = 8;
    var colW = (gallery.clientWidth - gap * (cols - 1)) / cols;
    var heights = []; for (var i = 0; i < cols; i++) heights.push(0);
    tiles.forEach(function (t) {
      var wv = parseFloat(t.style.getPropertyValue('--w')) || 4, hv = parseFloat(t.style.getPropertyValue('--h')) || 3;
      var span = Math.max(1, Math.round((colW * hv / wv + gap) / (rowH + gap)));
      var c = heights.indexOf(Math.min.apply(null, heights));
      t.style.gridColumn = String(c + 1);
      t.style.gridRow = (heights[c] + 1) + ' / span ' + span;
      heights[c] += span;
    });
  }
  layout();
  var rt; w.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 120); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(layout);
  $$('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      $$('.chip').forEach(function (c) { var on = c === chip; c.classList.toggle('is-active', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      $$('.tile', gallery).forEach(function (t) {
        var show = f === '*' || t.getAttribute('data-cat') === f;
        t.classList.toggle('is-hidden', !show);
        if (show) { t.classList.add('in'); }
      });
      layout();
    });
  });

  /* ---- process line draws as you scroll ---- */
  var steps = $('#steps');
  if (steps && !reduce) {
    var line = $('.steps__line', steps);
    var drawLine = function () {
      var r = steps.getBoundingClientRect();
      var p = (w.innerHeight * 0.75 - r.top) / r.height;
      line.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3));
    };
    w.addEventListener('scroll', drawLine, { passive: true }); drawLine();
  }

  /* ---- lightbox ---- */
  var lb = $('#lightbox'), items = [];
  try { items = JSON.parse(($('#site-media') || {}).textContent || '[]'); } catch (_) { items = []; }
  if (lb && items.length) {
    var img = $('#lbimg'), cap = $('#lbcap'), count = $('#lbcount'), bg = $('#lbbg');
    var idx = 0, lastFocus = null, visible = [];
    function visibleIdx() {
      return $$('.tile', gallery).filter(function (t) { return !t.classList.contains('is-hidden'); })
        .map(function (t) { return parseInt(t.getAttribute('data-i'), 10); });
    }
    function show(i) {
      if (!visible.length) visible = visibleIdx();
      idx = (i + visible.length) % visible.length;
      var it = items[visible[idx]];
      img.src = it.src; img.alt = it.alt || '';
      cap.textContent = [it.category, it.caption].filter(Boolean).join(' — ');
      count.textContent = (idx + 1) + ' / ' + visible.length;
      bg.style.backgroundImage = 'url("' + it.src.replace(/"/g, '%22') + '")';
      var nxt = items[visible[(idx + 1) % visible.length]]; if (nxt) { var pre = new Image(); pre.src = nxt.src; }
    }
    function open(i) {
      visible = visibleIdx(); lastFocus = d.activeElement;
      lb.hidden = false; body.style.overflow = 'hidden';
      show(visible.indexOf(i) >= 0 ? visible.indexOf(i) : 0);
      $('#lbclose').focus();
    }
    function close() { lb.hidden = true; body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lightbox]');
      if (b) { open(parseInt(b.getAttribute('data-lightbox'), 10)); return; }
      if (e.target === lb || e.target.classList.contains('lightbox__bg')) close();
    });
    $('#lbclose').addEventListener('click', close);
    $('#lbprev').addEventListener('click', function () { show(idx - 1); });
    $('#lbnext').addEventListener('click', function () { show(idx + 1); });
    d.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });
    var tx = null;
    lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50) show(dx < 0 ? idx + 1 : idx - 1);
    });
  }
})();
