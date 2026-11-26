/* Three Hands Healing — Bloom
   Florals are composed from small specs (stems as hand-authored cubic
   paths; leaves + blossoms generated from anchor points) and draw
   themselves bottom-up with stroke-dashoffset when scrolled into view. */
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = () => matchMedia('(min-width: 761px)').matches;

  /* ---------- geometry ---------- */
  const f = n => Math.round(n * 10) / 10;
  const rot = (x, y, a) => { const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; };
  // leaf: base (x,y), heading a (deg, 0 = right, -90 = up), length L
  function leaf(x, y, a, L) {
    const w = L * 0.4;
    const P = (px, py) => { const [rx, ry] = rot(px, py, a); return `${f(x + rx)} ${f(y + ry)}`; };
    return [
      `M${P(0, 0)}C${P(L * .22, -w)} ${P(L * .74, -w * .92)} ${P(L, 0)}C${P(L * .74, w * .92)} ${P(L * .22, w)} ${P(0, 0)}Z`,
      `M${P(0, 0)}C${P(L * .35, -w * .06)} ${P(L * .65, -w * .05)} ${P(L * .86, 0)}`
    ];
  }
  // blossom petals around (cx,cy): outer radius R, inner r0, n petals, spin deg
  function petals(cx, cy, R, n, r0, spin, wf) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = spin + i * 360 / n, w = R * wf;
      const P = (px, py) => { const [rx, ry] = rot(px, py, a); return `${f(cx + rx)} ${f(cy + ry)}`; };
      out.push(`M${P(0, -r0)}C${P(-w, -r0 - R * .16)} ${P(-w * 1.02, -R + R * .24)} ${P(0, -R)}C${P(w * 1.02, -R + R * .24)} ${P(w, -r0 - R * .16)} ${P(0, -r0)}`);
    }
    return out;
  }
  const ring = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;

  /* ---------- specs (viewBox coords, base at bottom) ---------- */
  const SPECS = {
    hero: { vb: [320, 520], total: 2.7,
      stems: ['M34 520C22 440 58 380 46 300C36 240 70 180 62 110C58 78 76 52 96 34',
              'M48 323C86 302 122 292 140 244C152 214 148 186 160 160',
              'M38 420C76 412 104 380 112 340',
              'M33 508C70 498 115 488 150 470'],
      leaves: [[30, 466, -155, 46], [42, 400, -25, 44], [47, 352, -160, 40], [46, 258, -20, 42], [53, 209, -165, 38], [61, 160, -30, 34], [66, 75, -160, 30],
               [92, 300, -60, 34], [119, 278, 45, 30], [150, 200, -40, 28],
               [78, 400, -70, 30], [102, 368, 15, 26],
               [150, 470, -10, 40], [92, 492, 45, 26]],
      blooms: [{ x: 96, y: 34, R: 16, c: 'petal' }, { x: 160, y: 160, R: 13, c: 'honey', spin: 30 }, { x: 112, y: 340, R: 9, c: 'lilac', n: 3, spin: 20 }] },
    sprigA: { vb: [200, 200], total: 1.7,
      stems: ['M22 196C30 150 62 128 80 84C90 60 98 42 116 26', 'M26 180C56 174 86 164 110 146'],
      leaves: [[35, 160, -150, 30], [54, 129, -28, 32], [71, 102, -150, 28], [95, 52, -25, 26], [110, 146, -15, 30], [70, 167, 35, 22]],
      blooms: [{ x: 116, y: 26, R: 12, c: 'petal' }] },
    sprigB: { vb: [200, 200], total: 1.7,
      stems: ['M18 196C44 158 34 118 72 88C104 64 126 62 152 34', 'M34 162C60 158 82 138 96 112'],
      leaves: [[32, 167, -150, 28], [40, 139, -30, 30], [48, 112, -160, 26], [98, 71, -60, 28], [122, 58, 50, 24], [140, 45, -40, 22], [96, 112, -70, 26], [69, 145, 40, 20]],
      blooms: [{ x: 152, y: 34, R: 9, c: 'lilac', n: 3, spin: 45 }] },
    sprigC: { vb: [200, 160], total: 1.7,
      stems: ['M8 150C60 142 100 122 130 92C150 72 168 58 186 36'],
      leaves: [[52, 140, -35, 30], [83, 126, 40, 26], [111, 109, -30, 30], [150, 73, 35, 24], [167, 57, -25, 24]],
      blooms: [{ x: 186, y: 36, R: 12, c: 'honey' }] },
    stem1: { vb: [140, 240], total: 1.3, ground: 'M28 236C50 230 90 230 112 236',
      stems: ['M70 240C66 210 76 180 70 146'], leaves: [[69, 208, -150, 26], [72, 176, -30, 24]],
      blooms: [{ x: 70, y: 146, R: 28, c: 'petal', n: 6, r0: .5, wf: .25, num: '1' }] },
    stem2: { vb: [140, 240], total: 1.3, ground: 'M28 236C50 230 90 230 112 236',
      stems: ['M70 240C62 200 80 160 70 110'], leaves: [[68, 204, -150, 26], [71, 172, -30, 26], [73, 139, -155, 22]],
      blooms: [{ x: 70, y: 110, R: 28, c: 'lilac', n: 6, r0: .5, wf: .25, num: '2', spin: 30 }] },
    stem3: { vb: [140, 240], total: 1.3, ground: 'M28 236C50 230 90 230 112 236',
      stems: ['M70 240C60 190 82 140 70 74'], leaves: [[67, 202, -150, 26], [70, 171, -30, 26], [73, 138, -155, 24], [73, 102, -25, 20]],
      blooms: [{ x: 70, y: 74, R: 28, c: 'honey', n: 6, r0: .5, wf: .25, num: '3' }] }
  };

  /* ---------- build ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  function build(el) {
    const spec = SPECS[el.dataset.floral];
    if (!spec) return;
    const [W, H] = spec.vb, total = spec.total;
    const off = wide() || !el.classList.contains('floral--stem') ? +(el.dataset.offset || 0) : 0;
    const T = y => off + total * (1 - y / H);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.dataset.vbw = W;
    const add = (tag, attrs, t, d) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      n.style.setProperty('--t', t.toFixed(2) + 's');
      if (d) n.style.setProperty('--d', d.toFixed(2) + 's');
      svg.appendChild(n);
      return n;
    };
    const path = (d, t, dur) => add('path', { d, pathLength: 1, 'data-draw': '' }, t, dur);
    if (spec.ground) path(spec.ground, off, .5);
    for (const d of spec.stems) {
      const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
      const y0 = nums[1], y1 = nums[nums.length - 1];
      path(d, T(y0), Math.max(.4, total * Math.abs(y0 - y1) / H));
    }
    for (const [x, y, a, L] of spec.leaves || []) {
      const [body, rib] = leaf(x, y, a, L), t = T(y) + .05;
      path(body, t, .6); path(rib, t + .25, .4);
    }
    for (const b of spec.blooms || []) {
      const n = b.n || 5, r0 = b.R * (b.r0 || .2), t = T(b.y) + .1;
      add('circle', { cx: b.x, cy: b.y, r: f(b.R * .95), class: 'dab' }, t + .3).style.setProperty('--dab', `var(--${b.c || 'petal'})`);
      petals(b.x, b.y, b.R, n, r0, b.spin || 0, b.wf || .34).forEach((d, i) => path(d, t + i * .07, .65));
      path(ring(b.x, b.y, b.num ? r0 * .92 : r0 * .85), t + .4, .45);
      if (b.num) { const tx = add('text', { x: b.x, y: b.y }, t + .55); tx.textContent = b.num; }
    }
    el.appendChild(svg);
  }
  const florals = [...document.querySelectorAll('[data-floral]')];
  florals.forEach(build);

  // keep rendered line weight at 1.5px regardless of how each svg is scaled
  function fit() {
    document.querySelectorAll('.floral svg').forEach(s => {
      const w = s.getBoundingClientRect().width;
      if (w) s.style.setProperty('--sw', (1.5 * s.dataset.vbw / w).toFixed(2));
    });
  }
  fit();
  let raf = 0;
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });

  /* ---------- scroll choreography ---------- */
  const reveals = [...document.querySelectorAll('.reveal')];
  if (reduce || !('IntersectionObserver' in window)) {
    florals.forEach(e => e.classList.add('is-drawn'));
    reveals.forEach(e => e.classList.add('in'));
  } else {
    const draw = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-drawn'); draw.unobserve(e.target); }
    }), { threshold: .3, rootMargin: '0px 0px -6% 0px' });
    florals.forEach(e => draw.observe(e));
    const show = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); show.unobserve(e.target); }
    }), { threshold: .12, rootMargin: '0px 0px -4% 0px' });
    reveals.forEach(e => show.observe(e));
  }

  /* ---------- mobile nav ---------- */
  const tog = document.querySelector('.nav-toggle'), nav = document.getElementById('nav');
  if (tog && nav) {
    const set = open => { nav.classList.toggle('is-open', open); tog.setAttribute('aria-expanded', String(open)); };
    tog.addEventListener('click', () => set(!nav.classList.contains('is-open')));
    nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); tog.focus(); } });
  }
})();
