/* Meander — the river is one SVG path through waypoints in every section, drawn by scroll. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, body = d.body;
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobileMq = window.matchMedia('(max-width: 860px)');
  var GUTTER_X = 22;

  /* ---- mobile menu ---- */
  var head = d.querySelector('.site-head'), btn = d.querySelector('[data-menu]');
  if (btn && head) {
    btn.addEventListener('click', function () {
      var open = head.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    head.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { head.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); });
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && head.classList.contains('is-open')) { head.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });
  }

  /* ---- reveals ---- */
  var svg = d.getElementById('river');
  var reveals = Array.prototype.slice.call(d.querySelectorAll('[data-reveal]'));
  function revealAll() { reveals.forEach(function (el) { el.classList.add('in'); }); if (svg) svg.classList.add('tribs-in'); }
  if (rm.matches || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        if (en.target.classList.contains('pillars') && svg) svg.classList.add('tribs-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  if (!svg) { body.classList.add('ready'); return; }

  /* ---- the river ---- */
  var water = svg.querySelector('.river__water'), bank = svg.querySelector('.river__bank'), current = svg.querySelector('.river__current');
  var endDot = svg.querySelector('.river__end');
  var tribPaths = { a: svg.querySelector('[data-trib-path="a"]'), b: svg.querySelector('[data-trib-path="b"]') };
  var reachPath = d.getElementById('reach-path'), reachSvg = d.querySelector('.reach'), hero = d.querySelector('.hero');
  var isle = d.querySelector('[data-isle]');
  var markers = Array.prototype.slice.call(d.querySelectorAll('[data-rw]'));
  var samples = [], total = 1, drawn = 0, arrived = rm.matches, animating = false, ticking = false;
  var STEP = 6;

  function isMobile() { return mobileMq.matches; }
  function docPt(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY };
  }
  function dirv(a, b) { var dx = b.x - a.x, dy = b.y - a.y, l = Math.sqrt(dx * dx + dy * dy) || 1; return { x: dx / l, y: dy / l }; }
  /* Catmull-Rom with chord-scaled tangents: control offsets never exceed a third of the segment, so uneven spacing cannot fold the river back on itself */
  function segments(p) {
    var s = [];
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      var k = Math.min(110, Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)) / 3);
      var t1 = dirv(p0, p2), t2 = dirv(p1, p3);
      s.push([p1, { x: p1.x + t1.x * k, y: p1.y + t1.y * k }, { x: p2.x - t2.x * k, y: p2.y - t2.y * k }, p2]);
    }
    return s;
  }
  function f(n) { return Math.round(n * 10) / 10; }
  function toD(s, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    if (!s.length) return 'M0 0';
    var out = 'M' + f(s[0][0].x + ox) + ' ' + f(s[0][0].y + oy);
    for (var i = 0; i < s.length; i++) {
      var g = s[i];
      out += 'C' + f(g[1].x + ox) + ' ' + f(g[1].y + oy) + ' ' + f(g[2].x + ox) + ' ' + f(g[2].y + oy) + ' ' + f(g[3].x + ox) + ' ' + f(g[3].y + oy);
    }
    return out;
  }
  function lengthAtY(y) {
    for (var i = 0; i < samples.length; i++) if (samples[i].y > y) return Math.max(0, (i - 1) * STEP);
    return total;
  }
  function pointNearY(y) {
    var best = samples[0], bd = Infinity;
    for (var i = 0; i < samples.length; i++) { var dd = Math.abs(samples[i].y - y); if (dd < bd) { bd = dd; best = samples[i]; } }
    return best;
  }
  function setDraw(len) {
    drawn = len;
    var off = Math.max(0, total - len);
    water.style.strokeDashoffset = off;
    current.style.strokeDashoffset = off;
  }

  function build() {
    var mob = isMobile();
    var W = root.clientWidth, H = Math.max(root.scrollHeight, body.scrollHeight);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.style.height = H + 'px';
    var pts = [], reachEnd = -1, confPt = null, n = 0;
    markers.forEach(function (m) {
      if (!m.getClientRects().length) return;
      var kind = m.getAttribute('data-rw') || '';
      var p = docPt(m);
      if (kind === 'oxbow' && !mob && isle) {
        var r = isle.getBoundingClientRect();
        var cx = r.left + r.width / 2 + window.scrollX, cy = r.top + r.height / 2 + window.scrollY;
        var rx = r.width / 2 + 30, ry = r.height / 2 + 30;
        for (var a = 238; a <= 500; a += 26) { var t = a * Math.PI / 180; pts.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) }); }
        pts.push({ x: cx - rx - 24, y: cy + ry + 54 });
        return;
      }
      if (mob && !m.hasAttribute('data-keep')) p.x = GUTTER_X + 10 * Math.sin(n * 0.8);
      n++;
      pts.push(p);
      if (kind === 'reach-end') reachEnd = pts.length - 1;
      if (kind === 'conf') confPt = p;
    });
    if (pts.length < 2) return;
    var segs = segments(pts), dStr = toD(segs);
    water.setAttribute('d', dStr); bank.setAttribute('d', dStr); current.setAttribute('d', dStr);
    var last = pts[pts.length - 1];
    endDot.setAttribute('cx', f(last.x)); endDot.setAttribute('cy', f(last.y));

    /* the lede's reach: the same curve, in hero coordinates */
    if (reachSvg && reachPath && hero && reachEnd > 0) {
      var hr = hero.getBoundingClientRect();
      var ox = -(hr.left + window.scrollX), oy = -(hr.top + window.scrollY);
      reachSvg.setAttribute('viewBox', '0 0 ' + Math.round(hr.width) + ' ' + Math.round(hr.height));
      reachPath.setAttribute('d', toD(segs.slice(0, Math.min(segs.length, reachEnd + 1)), ox, oy));
    }

    /* samples for scroll lookup */
    total = water.getTotalLength();
    samples = [];
    for (var l = 0; l <= total; l += STEP) { var q = water.getPointAtLength(l); samples.push({ x: q.x, y: q.y }); }
    water.style.strokeDasharray = total;
    current.style.strokeDasharray = total;

    /* tributaries: from beneath each pillar into the river */
    ['a', 'b'].forEach(function (k) {
      var card = d.querySelector('[data-trib="' + k + '"]'), path = tribPaths[k];
      if (!card || !path) return;
      var cr = card.getBoundingClientRect();
      if (mob) {
        /* under 860 the stream slips out from beneath the card's left edge and curls down into the gutter river */
        var mx = cr.left + window.scrollX + 2, my = cr.top + window.scrollY + cr.height * 0.5, me = pointNearY(my + 52);
        path.setAttribute('d', 'M' + f(mx) + ' ' + f(my) + 'C' + f(mx - 16) + ' ' + f(my + 4) + ' ' + f(me.x + 8) + ' ' + f(me.y - 30) + ' ' + f(me.x) + ' ' + f(me.y));
        return;
      }
      var sx = cr.left + window.scrollX + cr.width * (k === 'a' ? 0.66 : 0.34);
      var sy = cr.top + window.scrollY + cr.height - 1;
      var e = confPt || pointNearY(sy + 30);
      var dir = sx > e.x ? 1 : -1;
      path.setAttribute('d', 'M' + f(sx) + ' ' + f(sy) + 'C' + f(sx) + ' ' + f(sy + 70) + ' ' + f(e.x + dir * 42) + ' ' + f(e.y - 56) + ' ' + f(e.x) + ' ' + f(e.y));
    });

    if (rm.matches) { setDraw(total); return; }
    if (arrived) update(); else setDraw(Math.min(drawn, total));
  }

  function targetLength() { return lengthAtY(window.scrollY + window.innerHeight * 0.88); }
  function update() {
    if (!arrived || animating) return;
    var t = targetLength();
    if (t > drawn) setDraw(t);
  }
  function onScroll() {
    if (ticking) return; ticking = true;
    window.requestAnimationFrame(function () { ticking = false; update(); });
  }

  function arrive() {
    if (rm.matches) { arrived = true; setDraw(total); return; }
    var to = targetLength(), t0 = null, dur = 2600;
    animating = true; svg.classList.add('is-arriving');
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      setDraw(to * e);
      if (k < 1) window.requestAnimationFrame(frame);
      else { animating = false; arrived = true; svg.classList.remove('is-arriving'); update(); }
    }
    window.requestAnimationFrame(frame);
  }

  var resizeTimer = null;
  function scheduleBuild() { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 160); }
  window.addEventListener('resize', scheduleBuild);
  /* late-loading images or fonts move sections; the river follows the layout, never a hard-coded height */
  if ('ResizeObserver' in window) new ResizeObserver(scheduleBuild).observe(body);
  Array.prototype.forEach.call(d.images, function (im) { if (!im.complete) im.addEventListener('load', scheduleBuild, { once: true }); });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', build);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(build);

  build();
  body.classList.add('ready');
  arrive();
})();
