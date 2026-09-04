/* Untouchable Freedom, style: Ember. Scroll reveals and the seasons strip. */
(() => {
  const html = document.documentElement;
  html.classList.add("js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Reveal blocks as they enter the viewport. */
  const items = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("is-in"));
  }

  /* The seasons strip: on phones it scrolls sideways, and the section warms
     from ash to gold as the centred card changes. Dots let you jump. */
  const journey = document.getElementById("journey");
  const strip = journey && journey.querySelector(".seasons");
  const dots = journey && journey.querySelector(".seasons__dots");
  if (!strip || !dots) return;

  const cards = Array.from(strip.querySelectorAll(".season"));
  const buttons = cards.map((card, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "seasons__dot seasons__dot--" + (i + 1);
    b.setAttribute("aria-label", card.querySelector("h3").textContent.trim());
    b.setAttribute("aria-current", i === 0 ? "true" : "false");
    b.addEventListener("click", () => {
      const left = card.offsetLeft + card.offsetWidth / 2 - strip.clientWidth / 2;
      strip.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
    });
    dots.append(b);
    return b;
  });
  dots.hidden = false;

  const setStage = (n) => {
    if (journey.dataset.stage === String(n)) return;
    journey.dataset.stage = String(n);
    buttons.forEach((b, i) => b.setAttribute("aria-current", i + 1 === n ? "true" : "false"));
  };

  const scrollable = () => strip.scrollWidth - strip.clientWidth > 8;

  const update = () => {
    if (!scrollable()) { strip.removeAttribute("tabindex"); setStage(1); return; }
    strip.setAttribute("tabindex", "0");
    const mid = strip.scrollLeft + strip.clientWidth / 2;
    let best = 0, dist = Infinity;
    cards.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < dist) { dist = d; best = i; }
    });
    setStage(best + 1);
  };

  let raf = 0;
  strip.addEventListener("scroll", () => {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); });
  }, { passive: true });
  addEventListener("resize", update, { passive: true });
  update();
})();
