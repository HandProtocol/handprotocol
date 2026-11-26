"use client";

import { AnimatePresence, MotionConfig, motion, usePresence } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { useInk } from "./almanac/ink";
import { AlmanacDefs, Frame } from "./almanac/ornaments";
import "./almanac/almanac.css";

// The one sheet every layer of the site opens in: an illuminated almanac
// (design/sheet-styles/b3-almanac-nav.html, nav style 1). A framed leaf of paper (two pages side
// by side on a wide screen, one on a phone), the nav below it as ribbon bookmarks and a band of
// three doors, Close on the leaf's top-right corner.
//
// The leaves are one book in one order (the chapters, then the calendar, then Say hello), so a
// move between them is a page turn: forward lifts the right page over the spine, back lifts the
// left one. Turn by the curled corners, the "turn the page" line at a page's foot, a sideways
// swipe on a phone, or the arrow keys.
//
// Closes on Escape, on the night around it, and on Close; locks the page scroll; returns focus.

export type Turn = { label: string; go: () => void };
export type Turns = { prev?: Turn; next?: Turn };

const TurnContext = createContext<Turns>({});

// How long a turn takes; the leaving leaf stays in the book this long (the landing page's
// soft settle in almanac.css runs to 1.2s).
const TURN_MS = 1200;
const FADE_MS = 240;

export function Sheet({
  open,
  label,
  tabs,
  page,
  turns = {},
  onClose,
  children,
}: {
  open: boolean;
  label: string;
  tabs: ReactNode;
  /** the open leaf: its key and its place in the book's order */
  page: { key: string; index: number };
  turns?: Turns;
  onClose: () => void;
  children: ReactNode;
}) {
  const lastActive = useRef<Element | null>(null);

  const close = useCallback(() => {
    onClose();
    const back = lastActive.current as HTMLElement | null;
    if (back && typeof back.focus === "function") back.focus();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    lastActive.current = document.activeElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <motion.div
            className="al-veil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onMouseDown={(e) => e.target === e.currentTarget && close()}
          >
            <AlmanacDefs />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-label={label}
              className="almanac"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
              onMouseDown={(e) => e.target === e.currentTarget && close()}
            >
              <Book page={page} turns={turns} onClose={close}>
                {children}
              </Book>
              {tabs}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

// Keys and swipes never turn the page while the visitor is typing or working a widget.
function busyTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el?.closest?.("input, textarea, select, [contenteditable], kohsi-calendar, kohsi-booking, kohsi-gatherings");
}

function Book({ page, turns, onClose, children }: { page: { key: string; index: number }; turns: Turns; onClose: () => void; children: ReactNode }) {
  // Which way the last turn went. Mounted fresh with every opening, so the first leaf only
  // fades in; after that every new key is a turn, forward or back by the book's order.
  const [last, setLast] = useState<{ key: string; index: number; dir: "fwd" | "back" | null }>({ key: page.key, index: page.index, dir: null });
  let shown = last;
  if (last.key !== page.key) {
    shown = { key: page.key, index: page.index, dir: page.index >= last.index ? "fwd" : "back" };
    setLast(shown);
  }
  const dir = shown.dir;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || busyTarget(e.target)) return;
      if (e.key === "ArrowRight") turns.next?.go();
      if (e.key === "ArrowLeft") turns.prev?.go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turns]);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    touch.current = busyTarget(e.target) ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
    if (dx < 0) turns.next?.go();
    else turns.prev?.go();
  };

  return (
    <TurnContext.Provider value={turns}>
      <div className="al-book">
        <div className="al-leaves" data-dir={dir ?? undefined} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <AnimatePresence initial={false}>
            <TurnPage key={page.key}>{children}</TurnPage>
          </AnimatePresence>
        </div>
        <Frame side="verso" />
        <Frame side="recto" />
        {turns.prev && <Curl side="prev" turn={turns.prev} />}
        {turns.next && <Curl side="next" turn={turns.next} />}
        <button className="al-close" onClick={onClose} type="button" aria-label="Close">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.2 3.2 12.8 12.8M12.8 3.2 3.2 12.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="8" cy="8" r="1.1" fill="currentColor" />
          </svg>
        </button>
      </div>
    </TurnContext.Provider>
  );
}

// One leaf in the book. When its key goes, it stays (the same DOM, nothing remounts) while its
// page turns away, then leaves; the CSS reads data-state and the book's data-dir.
function TurnPage({ children }: { children: ReactNode }) {
  const [isPresent, safeToRemove] = usePresence();
  useEffect(() => {
    if (isPresent) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => safeToRemove?.(), reduce ? FADE_MS : TURN_MS);
    return () => window.clearTimeout(t);
  }, [isPresent, safeToRemove]);
  return (
    <div className="al-turn" data-state={isPresent ? "in" : "out"} inert={!isPresent}>
      {children}
    </div>
  );
}

// A curled page corner: the bottom right turns forward, the bottom left turns back.
function Curl({ side, turn }: { side: "prev" | "next"; turn: Turn }) {
  return (
    <button type="button" className={`al-curl al-curl--${side}`} onClick={turn.go} aria-label={`${side === "next" ? "Turn to" : "Back to"} ${turn.label}`} title={turn.label}>
      <i aria-hidden="true" />
    </button>
  );
}

type Cue = "none" | "top" | "mid" | "end";

function cueOf(el: Element): Cue {
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 6) return "none";
  if (el.scrollTop <= 4) return "top";
  if (el.scrollTop >= max - 4) return "end";
  return "mid";
}

// Watches the leaf's scrolling windows (the one page on a phone, each of the two pages on a wide
// screen) and marks on the leaf whether there is more below or above and how far down the reader
// is: the fades, the "read on" catchword and the gilt thread in the margin all read these marks.
function useScrollCues(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const windows: [string, HTMLElement][] = [];
    const one = root.querySelector<HTMLElement>(".al-scroll");
    if (one) windows.push(["leaf", one]);
    root.querySelectorAll<HTMLElement>(".al-page").forEach((el) => windows.push([el.classList.contains("al-page--verso") ? "verso" : "recto", el]));

    let frame = 0;
    const update = () => {
      frame = 0;
      for (const [name, el] of windows) {
        const cue = cueOf(el);
        el.dataset.cue = cue;
        root.dataset[`cue${name[0].toUpperCase()}${name.slice(1)}`] = cue;
        const max = el.scrollHeight - el.clientHeight;
        root.style.setProperty(`--al-p-${name}`, max > 0 ? String(Math.min(1, el.scrollTop / max)) : "0");
      }
    };
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    const sizes = new ResizeObserver(soon);
    for (const [, el] of windows) {
      el.addEventListener("scroll", soon, { passive: true });
      sizes.observe(el);
    }
    const watchParts = () => root.querySelectorAll(".al-page > *").forEach((el) => sizes.observe(el));
    watchParts();
    // a door's panel swaps (calendar to visit) and widgets fill in after loading
    const parts = new MutationObserver(() => {
      watchParts();
      soon();
    });
    parts.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      parts.disconnect();
      for (const [, el] of windows) el.removeEventListener("scroll", soon);
    };
  }, [ref]);
}

// "Read on": the old printer's catchword at a page's foot, there only while the page has more
// below it. Pressing it brings the next stretch of the page up.
function Catchword({ name }: { name: "leaf" | "verso" | "recto" }) {
  const go = (e: React.MouseEvent<HTMLButtonElement>) => {
    const leaf = e.currentTarget.closest(".al-leaf");
    const el = name === "leaf" ? leaf?.querySelector<HTMLElement>(".al-scroll") : leaf?.querySelector<HTMLElement>(`.al-page--${name}`);
    el?.scrollBy({ top: el.clientHeight * 0.72, behavior: "smooth" });
  };
  return (
    <>
      <button type="button" className={`al-catch al-catch--${name}`} onClick={go} tabIndex={-1} aria-hidden="true">
        <span>Read on</span>
        <svg viewBox="0 0 14 18" aria-hidden="true">
          <path d="M7 1v13M2.5 9.5 7 14l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>
      <i className={`al-thread al-thread--${name}`} aria-hidden="true" />
    </>
  );
}

// The foot of a page: the folio, and the way to the next leaf or back to the one before.
function Foot({ side, folio }: { side: "verso" | "recto"; folio: string }) {
  const { prev, next } = useContext(TurnContext);
  return (
    <div className="al-foot">
      {prev && (
        <button type="button" className="al-turnline al-turnline--prev" onClick={prev.go}>
          <svg viewBox="0 0 22 10" aria-hidden="true">
            <path d="M21 5H2M6 1 2 5l4 4" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          {prev.label}
        </button>
      )}
      <span className="al-folio">{folio}</span>
      {side === "recto" && next && (
        <button type="button" className="al-turnline al-turnline--next" onClick={next.go}>
          <span className="al-turnline-k">Turn the page</span>
          <span className="al-turnline-t">
            {next.label}
            <svg viewBox="0 0 22 10" aria-hidden="true">
              <path d="M1 5h19M16 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

// A leaf: the left page (verso) and the right page (recto), each with its running head and
// folio. On a phone the two melt into one page; `order` on each part sets where it falls then.
// tone "vellum" is the purple dedication leaf (Our vision); the rest are paper.
export function Leaf({
  tone = "paper",
  heads,
  folio,
  verso,
  recto,
}: {
  id?: string;
  tone?: "paper" | "vellum";
  heads: [string, string];
  folio: [string, string];
  verso: ReactNode;
  recto: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollCues(ref);
  useInk(ref);
  return (
    <div ref={ref} className="al-leaf" data-tone={tone}>
      <div className="al-scroll">
        <div className="al-page al-page--verso">
          <p className="al-rh">{heads[0]}</p>
          {verso}
          <Foot side="verso" folio={folio[0]} />
        </div>
        <div className="al-page al-page--recto">
          <p className="al-rh">{heads[1]}</p>
          {recto}
          <Foot side="recto" folio={folio[1]} />
        </div>
      </div>
      <Catchword name="leaf" />
      <Catchword name="verso" />
      <Catchword name="recto" />
    </div>
  );
}

export function FocusTitle({ children, className = "al-title" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <h2 ref={ref} tabIndex={-1} className={className}>
      {children}
    </h2>
  );
}
