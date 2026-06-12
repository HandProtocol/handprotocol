"use client";

/*
  Motion helpers for the HAND Command Center.

  Wraps anime.js v4 with the project's motion vocabulary:
  pulse, burst, sweep, bloom, cardPop, dragGlow. Easing curves and
  durations match DESIGN.md so motion stays consistent across surfaces.

  All helpers respect prefers-reduced-motion. The reduced path runs the
  semantic effect (a brief color flash, a short fade) without any
  large transform or particle work.
*/

import { animate, stagger } from "animejs";

const EASE = {
  outQuart: "cubicBezier(0.22, 0.8, 0.2, 1)",
  outExpo: "cubicBezier(0.16, 1, 0.3, 1)",
  inOutQuart: "cubicBezier(0.7, 0, 0.2, 1)",
} as const;

function reducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* Pulse, radial expand + amber glow, 1.1s.
   For save, submit, accept-assist. */
export function pulse(target: HTMLElement) {
  if (reducedMotion()) {
    animate(target, {
      opacity: [{ to: 0.6, duration: 80 }, { to: 1, duration: 200 }],
      ease: EASE.outQuart,
    });
    return;
  }
  animate(target, {
    scale: [{ to: 1.04, duration: 220 }, { to: 1, duration: 380 }],
    boxShadow: [
      { to: "0 0 0 0 rgba(217,119,6,0.35)", duration: 0 },
      { to: "0 0 0 14px rgba(217,119,6,0)", duration: 600 },
    ],
    ease: EASE.outQuart,
    duration: 1100,
  });
}

/* Card pop, 200ms. For card hover, AI suggestion arrival. */
export function cardPop(target: HTMLElement) {
  if (reducedMotion()) return;
  animate(target, {
    translateY: [{ to: -2, duration: 100 }, { to: 0, duration: 140 }],
    scale: [{ to: 1.015, duration: 100 }, { to: 1, duration: 140 }],
    ease: EASE.outQuart,
    duration: 240,
  });
}

/* Drag glow, continuous while dragging.
   Returns a cleanup function to stop the loop. */
export function dragGlow(target: HTMLElement) {
  if (reducedMotion()) {
    target.style.outline = "2px solid var(--amber-soft)";
    return () => {
      target.style.outline = "";
    };
  }
  const anim = animate(target, {
    boxShadow: [
      { to: "0 0 0 0 rgba(255,186,73,0.25), 0 0 18px rgba(217,119,6,0.4)" },
      { to: "0 0 0 4px rgba(255,186,73,0.18), 0 0 36px rgba(217,119,6,0.6)" },
    ],
    duration: 900,
    direction: "alternate",
    loop: true,
    ease: EASE.outQuart,
  });
  return () => {
    anim.pause();
    target.style.boxShadow = "";
  };
}

/* Burst, particle field one-shot.
   Spawns the particles relative to the target's center within its parent.
   30 to 50 particles, mixed amber and cream, decaying over 1.5s.
   For awarded status flip. */
export function burst(target: HTMLElement, count = 36) {
  if (reducedMotion()) {
    pulse(target);
    return;
  }
  const rect = target.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const layer = document.createElement("div");
  layer.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 9999;
    mix-blend-mode: screen;
  `;
  document.body.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 60 + Math.random() * 180;
    const size = 3 + Math.random() * 5;
    const warm = Math.random() < 0.7;
    const dot = document.createElement("span");
    dot.style.cssText = `
      position: absolute;
      left: ${cx}px; top: ${cy}px;
      width: ${size}px; height: ${size}px;
      border-radius: 50%;
      background: ${warm ? "rgba(255,186,73,0.95)" : "rgba(255,240,200,0.85)"};
      box-shadow: 0 0 14px ${warm ? "rgba(217,119,6,0.7)" : "rgba(255,240,200,0.4)"};
      transform: translate(-50%, -50%);
    `;
    layer.appendChild(dot);
    animate(dot, {
      translateX: Math.cos(angle) * dist,
      translateY: Math.sin(angle) * dist,
      opacity: [{ to: 1, duration: 60 }, { to: 0, duration: 1100 }],
      scale: [{ to: 1, duration: 100 }, { to: 0.4, duration: 1200 }],
      ease: EASE.outExpo,
      duration: 1300,
    });
  }
  setTimeout(() => layer.remove(), 1500);
}

/* Bloom, soft radial light from center, 1.4s.
   For loader-to-dashboard handoff, decision-arrived notification. */
export function bloom(target: HTMLElement) {
  if (reducedMotion()) return;
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(circle at 50% 50%,
      rgba(255,220,140,0.25) 0%,
      rgba(255,186,73,0.12) 35%,
      rgba(217,119,6,0) 70%);
    mix-blend-mode: screen;
    opacity: 0;
  `;
  const computed = window.getComputedStyle(target);
  if (computed.position === "static") target.style.position = "relative";
  target.appendChild(overlay);
  animate(overlay, {
    opacity: [{ to: 0.9, duration: 280 }, { to: 0, duration: 1100 }],
    scale: [{ to: 1.6, duration: 1400 }],
    ease: EASE.outExpo,
    duration: 1400,
  });
  setTimeout(() => overlay.remove(), 1500);
}

/* Reveal cascade for a row of cards or tiles.
   Staggers a translateY + opacity rise across the targets. */
export function revealCascade(targets: HTMLElement[] | NodeListOf<HTMLElement>) {
  if (reducedMotion()) {
    Array.from(targets).forEach((el) => {
      el.style.opacity = "1";
    });
    return;
  }
  animate(Array.from(targets), {
    translateY: [{ to: 12, duration: 0 }, { to: 0, duration: 520 }],
    opacity: [{ to: 0, duration: 0 }, { to: 1, duration: 520 }],
    ease: EASE.outQuart,
    delay: stagger(60),
  });
}

/* Letter cycle for stage transitions.
   Cross-fades a target's textContent through a sequence of strings. */
export function letterCycle(target: HTMLElement, sequence: string[], dwell = 1200) {
  if (reducedMotion()) {
    let i = 0;
    target.textContent = sequence[0];
    const id = window.setInterval(() => {
      i = (i + 1) % sequence.length;
      target.textContent = sequence[i];
    }, dwell);
    return () => window.clearInterval(id);
  }
  let i = 0;
  const swap = () => {
    animate(target, {
      opacity: [{ to: 0, duration: 180 }],
      ease: EASE.outQuart,
      onComplete: () => {
        i = (i + 1) % sequence.length;
        target.textContent = sequence[i];
        animate(target, {
          opacity: [{ to: 1, duration: 220 }],
          ease: EASE.outQuart,
        });
      },
    });
  };
  target.textContent = sequence[0];
  const id = window.setInterval(swap, dwell);
  return () => window.clearInterval(id);
}
