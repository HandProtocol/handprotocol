/* Static: fit the two stacked hero lines to the full width, reveal blocks on scroll.
   No storage, no fetch. Reduced motion is handled entirely in CSS. */
(() => {
  const fits = Array.from(document.querySelectorAll("[data-fit]"));
  const header = document.querySelector(".top");
  let raf = 0;
  const fit = () => {
    if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
    for (const el of fits) {
      el.style.fontSize = "";
      const box = el.parentElement.clientWidth;
      const w = Math.max(el.scrollWidth, el.getBoundingClientRect().width);
      if (!box || !w) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = (fs * box / w).toFixed(2) + "px";
    }
  };
  const queue = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
  fit();
  addEventListener("resize", queue);
  if (document.fonts) {
    document.fonts.ready.then(fit);
    document.fonts.addEventListener("loadingdone", fit);
  }

  const items = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
  items.forEach((el) => io.observe(el));
})();
