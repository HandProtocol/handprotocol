"use client";

import { useLayoutEffect, type RefObject } from "react";

// Laying a leaf down in ink, ported from design/sheet-styles/b3-almanac-nav.html ("the reveal").
// As a leaf opens (or lands after a turn) its parts appear in order: the running heads and
// kickers are stamped, the headline is written left to right, the drawings are stroked line by
// line, then the words ink in. What sits below the fold inks in as the reader scrolls to it.
// No words are split and no React text is touched: only classes, a delay and `pathLength` on
// the drawn lines of the static ornaments. Without script, or with reduced motion, everything is
// simply there.

const KINDS: [string, string][] = [
  [".al-rh, .al-kicker, .al-folio, .al-wheel-note, .al-legend-head, .al-frontis figcaption, .al-apex, .al-num, .al-vows svg, .al-rubric-cap", "stamp"],
  [".al-title, .al-vows span, .al-note-big, .al-host .al-h3, .al-calendar-door .al-h3", "write"],
  [".al-illum", "gild"],
  [".al-arch", "photo"],
  [".al-wheel, .al-seasons-wheel, .al-compass", "draw"],
  [".al-moonband", "moons"],
  [
    ".al-lede, .al-body p, .al-quote, .al-colophon, .al-covenant .al-name, .al-covenant .al-meaning, .al-legend .al-glyph, .al-legend .al-name, .al-legend .al-use, .al-offerings li, .al-hint, .al-host p, .al-note-small, .al-ways, .al-way-panel, .al-form, .al-turnline, .al-actions > .al-btn, .al-calendar-door > .al-btn",
    "ink",
  ],
];
const HEAD = ".al-rh, .al-kicker, .al-folio";
const BASE: Record<string, number> = { head: 0, write: 0.2, art: 0.55, flow: 0.75 };
const STEP: Record<string, number> = { head: 0.1, write: 0.3, art: 0.22 };

function category(el: Element) {
  const k = el.getAttribute("data-rv");
  if (k === "write") return "write";
  if (k === "draw" || k === "photo" || k === "moons" || k === "gild") return "art";
  if (k === "stamp" && el.matches(HEAD)) return "head";
  return "flow";
}

// Lines that are only stroked are drawn; filled shapes, text and symbols fade in after them.
function prepareDrawing(svg: SVGElement) {
  let j = 0;
  svg.querySelectorAll("path, circle, line, rect, polygon, polyline, ellipse, text, use").forEach((el) => {
    if (el.closest("defs, clipPath, mask")) return;
    const tag = el.tagName.toLowerCase();
    const cs = getComputedStyle(el);
    const stroked = cs.stroke !== "none";
    const filled = cs.fill !== "none" && tag !== "line";
    if (stroked && !filled && !el.hasAttribute("stroke-dasharray") && tag !== "text" && tag !== "use") {
      el.setAttribute("pathLength", "1");
      el.classList.add("al-ln");
    } else {
      el.classList.add("al-fl");
      (el as SVGElement).style.setProperty("--j", `${Math.min(j++ * 0.025, 0.5).toFixed(3)}s`);
    }
  });
}

function fire(el: HTMLElement | SVGElement, d: number) {
  el.style.setProperty("--d", `${d.toFixed(2)}s`);
  el.classList.add("in");
}

// Where a part sits inside its scrolling window, from layout offsets, which ignore transforms
// (a page landing after a turn is still rotated edge-on when this runs).
function offsetIn(el: Element, box: HTMLElement): number {
  let node: HTMLElement | null = el instanceof HTMLElement ? el : el.parentElement;
  let y = 0;
  while (node && node !== box) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return node === box ? y - box.scrollTop : 0;
}

function scrollerOf(leaf: HTMLElement, el: Element): HTMLElement {
  const page = el.closest<HTMLElement>(".al-page");
  if (page && getComputedStyle(page).display !== "contents") return page;
  return leaf.querySelector<HTMLElement>(".al-scroll") ?? leaf;
}

export function useInk(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const leaf = ref.current;
    if (!leaf) return;
    for (const [selector, kind] of KINDS) {
      leaf.querySelectorAll<HTMLElement | SVGElement>(selector).forEach((el) => {
        if (el.classList.contains("rv")) return;
        el.classList.add("rv");
        el.setAttribute("data-rv", kind);
        if (kind === "draw") prepareDrawing(el as SVGElement);
        if (kind === "moons") Array.from(el.children).forEach((m, i) => (m as HTMLElement).style.setProperty("--i", String(i)));
      });
    }
    leaf.dataset.ink = "";
    // safe to run again (React runs effects twice in development): parts already laid down stay
    const items = Array.from(leaf.querySelectorAll<HTMLElement | SVGElement>(".rv:not(.in)"));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((el) => fire(el, 0));
      return;
    }

    // A leaf that arrives by a turn waits for its page to come into view: on a wide screen the
    // left page lands in the second half of the turn, on a phone the page beneath is uncovered.
    const dir = leaf.closest<HTMLElement>(".al-leaves")?.dataset.dir;
    const wide = window.matchMedia("(min-width: 960px)").matches;
    const start = dir ? (wide ? 0.42 : 0.22) : 0.12;

    const groups: Record<string, (HTMLElement | SVGElement)[]> = {};
    const later: (HTMLElement | SVGElement)[] = [];
    for (const el of items) {
      if (el.getClientRects().length === 0) continue; // not shown at this size
      const box = scrollerOf(leaf, el);
      if (offsetIn(el, box) < box.clientHeight - 8) (groups[category(el)] ??= []).push(el);
      else later.push(el);
    }
    for (const [c, list] of Object.entries(groups)) {
      // the leaf's headline is always written first, whichever page it sits on
      const ordered = [...list.filter((el) => el.classList.contains("al-title")), ...list.filter((el) => !el.classList.contains("al-title"))];
      const step = c === "flow" ? Math.min(0.08, 0.9 / ordered.length) : STEP[c];
      ordered.forEach((el, i) => fire(el, start + BASE[c] + i * step));
    }

    const io = new IntersectionObserver(
      (entries) => {
        const hits = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        hits.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        hits.forEach((el, i) => {
          io.unobserve(el);
          fire(el, Math.min(i * 0.07, 0.6));
        });
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    later.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ref]);
}
