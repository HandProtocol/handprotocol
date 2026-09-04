/* Untouchable Freedom, Marble.
   Gold veins that trace themselves as you scroll, a thread through the journey, scroll reveals, and the phone menu. */
(() => {
  "use strict";
  const doc = document;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* Phone menu */
  const btn = doc.querySelector(".menu-btn");
  const nav = doc.getElementById("site-nav");
  if (btn && nav) {
    const set = (open) => {
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "Close" : "Menu";
      nav.classList.toggle("is-open", open);
    };
    btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
    doc.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  }

  /* Entrance reveals */
  const reveals = [...doc.querySelectorAll(".reveal")];
  if (reduce.matches || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    reveals.forEach((el) => io.observe(el));
  }

  /* Hand-drawn veins: uniform scale (slice), stroke width corrected by --s, traced with stroke-dashoffset */
  const veins = [...doc.querySelectorAll("svg.vein")].map((svg) => {
    const vb = svg.viewBox.baseVal;
    return { svg, paths: [...svg.querySelectorAll("path")], vbW: vb.width || 1000, vbH: vb.height || 1000, mode: svg.dataset.vein || "section" };
  });
  const scaleVeins = () => veins.forEach((v) => {
    const r = v.svg.getBoundingClientRect();
    const s = Math.max(r.width / v.vbW, r.height / v.vbH) || 1;
    v.svg.style.setProperty("--s", s.toFixed(4));
  });
  const setProgress = (paths, p) => {
    const o = (1.02 * (1 - p)).toFixed(4);
    paths.forEach((path) => { path.style.strokeDashoffset = o; });
  };

  /* The journey thread: built in pixel space so it passes through every stage node */
  const track = doc.querySelector(".track");
  const thread = track && track.querySelector(".thread");
  const line = thread && thread.querySelector(".thread-line");
  let threadPaths = [], threadLen = 0, nodes = [], samples = [];

  const buildThread = () => {
    if (!thread || !line) return;
    const tr = track.getBoundingClientRect();
    const W = Math.round(tr.width), H = Math.round(tr.height);
    thread.setAttribute("viewBox", `0 0 ${W} ${H}`);
    nodes = [...track.querySelectorAll(".node")].map((el) => {
      const r = el.getBoundingClientRect();
      return { el, x: r.left - tr.left + r.width / 2, y: r.top - tr.top + r.height / 2 };
    });
    if (!nodes.length) return;
    const x0 = nodes[0].x, yEnd = nodes[nodes.length - 1].y;
    const amp = W > 700 ? 18 : 5;
    const pts = [];
    for (let y = 0; ; y += 34) {
      const yy = Math.min(y, yEnd);
      let env = 1;
      nodes.forEach((n) => { env = Math.min(env, Math.abs(yy - n.y) / 120); });
      env = clamp(env, 0, 1); env = env * env * (3 - 2 * env);
      const w = Math.sin(yy / 190 + 0.8) * 0.6 + Math.sin(yy / 67 + 2.1) * 0.3 + Math.sin(yy / 23 + 4.4) * 0.12;
      pts.push([x0 + amp * w * env, yy]);
      if (yy >= yEnd) break;
    }
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    threadPaths = [...thread.querySelectorAll("path")];
    threadPaths.forEach((p) => p.setAttribute("d", d));
    threadLen = line.getTotalLength();
    threadPaths.forEach((p) => { p.style.strokeDasharray = `${threadLen} ${threadLen + 24}`; });
    /* length-to-y lookup so the tip lands exactly where the reader is */
    samples = [];
    const N = 80;
    for (let k = 0; k <= N; k++) {
      const len = (threadLen * k) / N;
      samples.push([len, line.getPointAtLength(len).y]);
    }
  };
  const lengthAtY = (y) => {
    if (!samples.length) return 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i][1] >= y) {
        const [l0, y0] = samples[i - 1], [l1, y1] = samples[i];
        const t = y1 === y0 ? 1 : (y - y0) / (y1 - y0);
        return l0 + (l1 - l0) * clamp(t, 0, 1);
      }
    }
    return threadLen;
  };
  const setThread = (tipY) => {
    if (!threadLen) return;
    const off = threadLen - lengthAtY(tipY);
    threadPaths.forEach((p) => { p.style.strokeDashoffset = off.toFixed(1); });
    nodes.forEach((n) => n.el.classList.toggle("is-lit", tipY >= n.y - 1));
  };

  const update = () => {
    const ih = innerHeight;
    veins.forEach((v) => {
      const r = v.svg.getBoundingClientRect();
      const p = v.mode === "hero"
        ? 0.5 + 0.5 * clamp(scrollY / (ih * 0.9), 0, 1)
        : clamp((ih - r.top) / (ih * 0.55 + r.height * 0.45), 0, 1);
      setProgress(v.paths, p);
    });
    if (thread) {
      const r = track.getBoundingClientRect();
      setThread(clamp(ih * 0.62 - r.top, 0, r.height));
    }
  };

  const finish = () => {
    veins.forEach((v) => setProgress(v.paths, 1));
    setThread(Number.MAX_SAFE_INTEGER);
  };

  let raf = 0;
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
  const init = () => {
    scaleVeins();
    buildThread();
    if (reduce.matches) finish(); else update();
  };

  /* First paint: the hero veins trace in, then follow the scroll directly */
  scaleVeins();
  buildThread();
  if (reduce.matches) {
    finish();
  } else {
    const hero = veins.find((v) => v.mode === "hero");
    if (hero) hero.svg.classList.add("is-drawing");
    update();
    setTimeout(() => { if (hero) hero.svg.classList.remove("is-drawing"); }, 700);
    addEventListener("scroll", onScroll, { passive: true });
  }
  let rt = 0;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(init, 120); });
  addEventListener("load", init);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(init);
})();
