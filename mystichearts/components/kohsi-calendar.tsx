"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { WHATS_ON } from "./copy";
import { KOHSI_KEY, KOHSI_URL, loadWidget } from "./kohsi-booking";
import { eventPageFor } from "./events";
import { KohsiGatherings } from "./kohsi-gatherings";

// Kohsi's <kohsi-calendar> element: the breathing calendar. Days with a gathering glow gold,
// days the land is open to visit are softly lit, and choosing one opens it in place (Kohsi
// src/widget/calendar.js, reports docs/reports/2026-11-01-breathing-calendar.md and
// 2026-11-01-calendar-marquee.md). Same script as the other two elements. An intro card names
// the collective's event registry while it loads, then folds into the strip of coming
// gatherings; the breathing cue is off here, since the strip carries the life. "Come out to
// the land" on an open day fires kohsi-calendar-visit; this site takes it (preventDefault) and
// opens its own visit door on that day. "Host a gathering here" fires kohsi-calendar-host;
// this site takes it and opens Say hello with a line about hosting already written.
//
// Until the Kohsi that serves /widget.js has the element, the gatherings board stands in, so
// What's on looks as it did before.
interface KohsiCalendarProps {
  onHello: () => void;
  onVisit: (date: string | null) => void;
  onHost: () => void;
}

export function KohsiCalendar({ onHello, onVisit, onHost }: KohsiCalendarProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "failed">("loading");
  const element = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let alive = true;
    loadWidget().then(
      () => alive && setStatus(customElements.get("kohsi-calendar") ? "ready" : "missing"),
      () => alive && setStatus("failed"),
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const node = element.current;
    if (status !== "ready" || !node) return;
    const onVisitDay = (event: Event) => {
      const date = (event as CustomEvent<{ date?: unknown }>).detail?.date;
      event.preventDefault();
      onVisit(typeof date === "string" ? date : null);
    };
    const onHostHere = (event: Event) => {
      event.preventDefault();
      onHost();
    };
    node.addEventListener("kohsi-calendar-visit", onVisitDay);
    node.addEventListener("kohsi-calendar-host", onHostHere);
    return () => {
      node.removeEventListener("kohsi-calendar-visit", onVisitDay);
      node.removeEventListener("kohsi-calendar-host", onHostHere);
    };
  }, [status, onVisit, onHost]);

  // The site's own layer over Kohsi's element (its shadow root is open): a compact month that
  // fits the sheet, and a chosen day that rises as a raised card over the whole calendar, the
  // month dimmed behind it, instead of opening below and pushing the page down. An adopted
  // sheet survives the element's re-renders. To move into Kohsi as an option later.
  useEffect(() => {
    const root = element.current?.shadowRoot;
    if (status !== "ready" || !root || typeof CSSStyleSheet === "undefined") return;
    return adoptSheet(root, DAY_OVERLAY_CSS);
  }, [status]);

  // A gathering with its own page here (the Fairy Ball): its button opens that page, which
  // carries the tickets, instead of Kohsi's request form. Capture runs before the element's own
  // click handler inside the shadow root.
  useEffect(() => {
    const node = element.current;
    if (status !== "ready" || !node) return;
    const onClick = (event: Event) => {
      const target = event.composedPath().find((each): each is HTMLElement => each instanceof HTMLElement && each.dataset?.act === "ask");
      if (!target) return;
      const title = target.closest(".kg-item")?.querySelector(".kg-title")?.textContent;
      const href = eventPageFor(title);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(href);
    };
    node.addEventListener("click", onClick, true);
    return () => node.removeEventListener("click", onClick, true);
  }, [status]);

  if (!KOHSI_KEY || status === "failed" || status === "missing") {
    return <KohsiGatherings onHello={onHello} onVisit={() => onVisit(null)} />;
  }

  return (
    <div className="kohsi-shell kohsi-calendar-shell" data-status={status}>
      {status === "loading" && <p className="door-fallback">Opening the calendar…</p>}
      {createElement("kohsi-calendar", {
        ref: element,
        "data-key": KOHSI_KEY,
        "data-api": KOHSI_URL,
        "data-service": "visit",
        "data-lang": "en",
        "data-heading": "3",
        "data-title": WHATS_ON.calendar.title,
        "data-weeks": "5",
        "data-cue": "off",
        "data-intro": WHATS_ON.calendar.intro,
        "data-host-label": WHATS_ON.calendar.host,
        "data-visit-label": WHATS_ON.calendar.visit,
        "data-empty": WHATS_ON.calendar.empty,
      })}
      <p className="calendar-aside">
        {WHATS_ON.hello}{" "}
        <button type="button" className="link-btn" onClick={onHello}>
          {WHATS_ON.helloLink}
        </button>
        .
      </p>
    </div>
  );
}

// Adds a stylesheet to a shadow root; returns the undo.
function adoptSheet(root: ShadowRoot, css: string): () => void {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
  return () => {
    root.adoptedStyleSheets = root.adoptedStyleSheets.filter((each) => each !== sheet);
  };
}

const DAY_OVERLAY_CSS = `
/* the sheet already says what this is: the element's own heading stays for screen readers only */
.kc-h { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.kc-day { aspect-ratio: auto; height: clamp(2.4em, 5.4vh, 3.3em); max-height: none; }
/* fixed: the sheet's backdrop-filter makes the sheet its containing block, so the day rises
   over the whole sheet with a margin of padding all round, wherever the sheet is scrolled */
.kc-panel {
  position: fixed;
  inset: clamp(0.75rem, 2.2vw, 1.4rem);
  z-index: 20;
  margin: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: clamp(1.1em, 3vw, 1.8em);
  border: 1px solid rgba(217, 165, 78, 0.38);
  border-radius: 22px;
  background:
    radial-gradient(120% 80% at 10% 0%, rgba(217, 165, 78, 0.12), transparent 60%),
    rgba(26, 13, 21, 0.94);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 100vmax rgba(14, 7, 11, 0.55);
  opacity: 1;
  animation: none;
}
.kc-day-h { font-size: 1.35em; }
`;
