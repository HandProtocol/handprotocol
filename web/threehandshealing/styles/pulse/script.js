/* Pulse — tap-along machine + stamp reveals. Vanilla, no deps. */
(() => {
  const html = document.documentElement;
  html.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---- signature: tap-along ---- */
  const panel = document.querySelector("[data-tap]");
  if (panel) {
    const btns = Array.from(panel.querySelectorAll(".tap__btn"));
    const dots = Array.from(panel.querySelectorAll("[data-dot]"));
    const countEl = panel.querySelector("[data-count]");
    const runBtn = panel.querySelector("[data-run]");
    const status = panel.querySelector("[data-status]");
    let count = 0;
    let running = false;
    let timer = null;
    const pulseTimers = new Map();

    const pulse = (i) => {
      const b = btns[i];
      if (!b) return;
      b.classList.remove("is-pulse");
      void b.offsetWidth; // restart the animation
      b.classList.add("is-pulse");
      clearTimeout(pulseTimers.get(b));
      pulseTimers.set(b, setTimeout(() => b.classList.remove("is-pulse"), 380));
      dots.forEach((d, j) => d.classList.toggle("is-on", j === i));
      count += 1;
      countEl.textContent = String(count);
    };

    btns.forEach((b, i) => {
      b.addEventListener("click", () => {
        pulse(i);
        if (!running) status.textContent = "";
      });
    });

    const stop = (finished) => {
      clearTimeout(timer);
      running = false;
      panel.classList.remove("is-running");
      runBtn.textContent = finished ? "Run the round again" : "Run the round";
      status.textContent = finished ? "Round complete." : "";
      if (finished) setTimeout(() => dots.forEach((d) => d.classList.remove("is-on")), 700);
    };

    runBtn.addEventListener("click", () => {
      if (running) { stop(false); return; }
      running = true;
      panel.classList.add("is-running");
      runBtn.textContent = "Stop";
      status.textContent = "Running the round…";
      const beat = 700;
      let i = 0;
      const step = () => {
        if (i >= btns.length) { stop(true); return; }
        pulse(i);
        i += 1;
        timer = setTimeout(step, beat);
      };
      step();
    });
  }

  /* ---- stamp reveals ---- */
  const targets = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!targets.length) return;
  if (reduce.matches || !("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  targets.forEach((t) => io.observe(t));
})();
