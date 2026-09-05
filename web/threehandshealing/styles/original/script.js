/* Replace the preview interaction with the public GoHighLevel calendar before launch. */

document.querySelector("[data-year]").textContent = new Date().getFullYear();

const header = document.querySelector("[data-header]");
const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 32);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const eftChapter = document.querySelector('[data-motion-chapter="eft"]');
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let teardownEftMotion;
let eftMotionLoading;
let eftMotionObserver;

const loadMotionLibrary = (src, name) => {
  if (window[name]) return Promise.resolve();
  const existing = document.querySelector(`script[data-motion-library="${name}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.motionLibrary = name;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });
};

const initializeEftMotion = async () => {
  if (!eftChapter || reducedMotion.matches || teardownEftMotion) return;
  if (eftMotionLoading) return eftMotionLoading;

  eftMotionLoading = (async () => {
    await loadMotionLibrary("vendor/gsap.min.js", "gsap");
    await loadMotionLibrary("vendor/ScrollTrigger.min.js", "ScrollTrigger");
    if (reducedMotion.matches) return;

    window.gsap.registerPlugin(window.ScrollTrigger);

    const artwork = eftChapter.querySelector(".eft-art");
    const eftSection = eftChapter.querySelector(".practice--eft");
    const eftPointOrder = ["eyebrow", "side-eye", "under-eye", "under-nose", "chin", "collarbone", "under-arm", "top-head"];
    const tapPoints = eftPointOrder
      .map((point) => eftChapter.querySelector(`[data-eft-point="${point}"]`))
      .filter(Boolean);
    const tapRings = tapPoints.map((point) => point.querySelector(".tap-ring"));
    const session = eftChapter.querySelector(".session");
    const sessionSteps = [...session.querySelectorAll(".session-steps [data-motion-step]")];
    const media = window.gsap.matchMedia();

    eftChapter.classList.add("is-motion-ready");

    media.add("(min-width: 981px)", () => {
      window.gsap.set(artwork, { autoAlpha: 0.72, y: 16 });
      window.gsap.set(tapPoints, { opacity: 0.28, scale: 0.92 });
      window.gsap.set(tapRings, { opacity: 0, scale: 0.72 });

      const pointsTimeline = window.gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: eftSection,
          start: "top 76%",
          end: "bottom 48%",
          scrub: 0.55,
          invalidateOnRefresh: true,
        },
      });

      pointsTimeline.to(artwork, { autoAlpha: 1, y: 0, duration: 0.24 });
      tapPoints.forEach((point, index) => {
        const ring = tapRings[index];
        const position = 0.26 + index * 0.105;
        pointsTimeline
          .to(point, { opacity: 1, scale: 1, duration: 0.16 }, position)
          .to(ring, { opacity: 0.34, scale: 1.04, duration: 0.08 }, position)
          .to(ring, { opacity: 0, scale: 1.46, duration: 0.17 }, position + 0.08);
      });

      window.gsap.fromTo(sessionSteps,
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: { trigger: session, start: "top 78%", once: true },
        });
    });

    media.add("(max-width: 980px)", () => {
      window.gsap.set(artwork, { autoAlpha: 0.76, y: 10 });
      window.gsap.set(tapPoints, { opacity: 0.3, scale: 0.92 });
      window.gsap.set(tapRings, { opacity: 0, scale: 0.76 });

      const compactTimeline = window.gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: { trigger: eftSection, start: "top 78%", once: true },
      });

      compactTimeline
        .to(artwork, { autoAlpha: 1, y: 0, duration: 0.5 })
        .to(tapPoints, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.12 }, "-=0.18")
        .to(tapRings, { opacity: 0.32, scale: 1.04, duration: 0.16, stagger: 0.12 }, "<")
        .to(tapRings, { opacity: 0, scale: 1.42, duration: 0.26, stagger: 0.12 }, "<0.12");

      window.gsap.fromTo(sessionSteps,
        { autoAlpha: 0, y: 8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.48,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: { trigger: session, start: "top 82%", once: true },
        });
    });

    teardownEftMotion = () => {
      media.revert();
      eftChapter.classList.remove("is-motion-ready");
      teardownEftMotion = undefined;
    };
  })().catch(() => {
    eftChapter?.classList.remove("is-motion-ready");
  }).finally(() => {
    eftMotionLoading = undefined;
  });

  return eftMotionLoading;
};

const observeEftChapter = () => {
  if (!eftChapter || reducedMotion.matches || teardownEftMotion || eftMotionLoading || eftMotionObserver) return;
  if (!("IntersectionObserver" in window)) {
    initializeEftMotion();
    return;
  }

  eftMotionObserver = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    eftMotionObserver.disconnect();
    eftMotionObserver = undefined;
    initializeEftMotion();
  }, { rootMargin: "40% 0px" });
  eftMotionObserver.observe(eftChapter);
};

const handleMotionPreference = () => {
  if (reducedMotion.matches) {
    eftMotionObserver?.disconnect();
    eftMotionObserver = undefined;
    teardownEftMotion?.();
    return;
  }
  observeEftChapter();
};

handleMotionPreference();
reducedMotion.addEventListener("change", handleMotionPreference);
window.addEventListener("pagehide", () => {
  eftMotionObserver?.disconnect();
  teardownEftMotion?.();
}, { once: true });

/* Design-direction preview switcher. Three directions live in one document;
   html[data-design] selects photography, palette, and hero treatment. */
const DESIGNS = ["gateway", "meadow", "forest"];
const designSwitcher = document.querySelector("[data-design-switcher]");
const designButtons = [...document.querySelectorAll("[data-design-choice]")];
const heroVideo = document.querySelector(".hero__video");

const applyDesign = (name, { updateUrl = true } = {}) => {
  if (!DESIGNS.includes(name)) name = DESIGNS[0];
  document.documentElement.dataset.design = name;
  designButtons.forEach((button) =>
    button.setAttribute("aria-pressed", String(button.dataset.designChoice === name)));
  try { localStorage.setItem("thh-design", name); } catch {}
  if (updateUrl && window.history.replaceState) {
    const url = new URL(window.location.href);
    url.searchParams.set("design", name);
    window.history.replaceState(null, "", url);
  }
  /* The video hero belongs to Gateway only; rest the element elsewhere. */
  if (heroVideo) {
    if (name === "gateway") heroVideo.play?.().catch(() => {});
    else heroVideo.pause?.();
  }
};

if (designSwitcher) {
  const fromUrl = new URLSearchParams(window.location.search).get("design");
  let stored = null;
  try { stored = localStorage.getItem("thh-design"); } catch {}
  applyDesign(fromUrl || stored || DESIGNS[0], { updateUrl: Boolean(fromUrl) });
  designButtons.forEach((button) =>
    button.addEventListener("click", () => applyDesign(button.dataset.designChoice)));
}

const breathButton = document.querySelector("[data-breath]");
const breathNote = document.querySelector("[data-breath-note]");
breathButton?.addEventListener("click", () => {
  breathButton.classList.remove("is-breathing");
  void breathButton.offsetWidth;
  breathButton.classList.add("is-breathing");
  breathNote.textContent = "Inhale gently. Let the exhale take its time.";
  window.setTimeout(() => { breathNote.textContent = "You are here."; }, 5400);
});

const floating = document.querySelector("[data-floating-nav]");
const floatingTrigger = floating?.querySelector("button");
floatingTrigger?.addEventListener("click", () => {
  const open = floating.classList.toggle("is-open");
  floatingTrigger.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (event) => {
  if (floating && !floating.contains(event.target)) {
    floating.classList.remove("is-open");
    floatingTrigger?.setAttribute("aria-expanded", "false");
  }
});

const bookingStatus = document.querySelector("[data-booking-status]");
const serviceChoices = document.querySelectorAll("[data-service-choice]");
serviceChoices.forEach((choice) => choice.addEventListener("click", () => {
  serviceChoices.forEach((item) => item.classList.remove("is-selected"));
  choice.classList.add("is-selected");
  bookingStatus.textContent = `${choice.textContent} selected.`;
}));
document.querySelector("[data-booking-continue]")?.addEventListener("click", () => {
  bookingStatus.textContent = "This calendar preview will connect to live availability soon.";
});
