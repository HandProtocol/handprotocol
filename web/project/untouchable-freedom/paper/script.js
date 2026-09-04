/* Untouchable Freedom, style: Paper.
   Scroll reveals, and the reflection page. Nothing typed on that page is
   stored or sent anywhere: no storage, no network, cleared on page hide. */
(() => {
  const d = document;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  const items = d.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce.matches) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("in"));
  }

  const box = d.getElementById("reflect-box");
  const clear = d.getElementById("clear");
  if (!box) return;
  const grow = () => { box.style.height = "auto"; box.style.height = box.scrollHeight + "px"; };
  box.addEventListener("input", grow);
  if (clear) clear.addEventListener("click", () => { box.value = ""; grow(); box.focus(); });
  addEventListener("pagehide", () => { box.value = ""; });
})();
