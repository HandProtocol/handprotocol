/* Shore: scroll reveals + the phone menu. No storage, no fetch. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const items = Array.from(document.querySelectorAll(".reveal, .stage"));

  if (!("IntersectionObserver" in window) || reduce.matches) {
    items.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    items.forEach((el) => io.observe(el));
  }

  const btn = document.querySelector(".menu-btn");
  const nav = document.getElementById("nav");
  if (!btn || !nav) return;
  const setOpen = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    btn.textContent = open ? "Close" : "Menu";
  };
  btn.addEventListener("click", () => setOpen(btn.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
})();
