/* Untouchable Freedom: Mirror. Menu, scroll reveals, and the journey line that draws itself. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Menu (phones and small tablets) */
  const nav = document.querySelector(".nav");
  const menu = nav && nav.querySelector(".menu");
  if (menu) {
    const set = (open) => {
      nav.classList.toggle("is-open", open);
      menu.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("menu-open", open);
    };
    menu.addEventListener("click", () => set(!nav.classList.contains("is-open")));
    nav.querySelectorAll(".nav__list a").forEach((a) => a.addEventListener("click", () => set(false)));
    addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  }

  /* Reveals */
  const reveals = document.querySelectorAll("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* The journey line */
  const line = document.querySelector(".line");
  const titles = Array.from(document.querySelectorAll(".stage__title"));
  if (!line) return;
  if (reduce) {
    line.style.setProperty("--p", "1");
    titles.forEach((t) => t.classList.add("is-lit"));
    return;
  }
  let queued = false;
  let best = 0;
  const draw = () => {
    queued = false;
    const r = line.getBoundingClientRect();
    if (!r.height) return;
    const focus = innerHeight * 0.72;
    const p = Math.max(best, Math.min(1, Math.max(0, (focus - r.top) / r.height)));
    best = p;
    line.style.setProperty("--p", p.toFixed(4));
    const reach = r.top + p * r.height;
    titles.forEach((t) => t.classList.toggle("is-lit", t.getBoundingClientRect().top + 10 <= reach));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  draw();
})();
