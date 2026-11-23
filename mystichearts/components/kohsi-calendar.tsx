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

// The collective's public address, as the hero and the waiver show it.
const CONTACT_EMAIL = "mysticheartshealing@gmail.com";

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

  // Which days carry a gathering with its own page here (the Fairy Ball): date → page.
  const pageDays = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    if (status !== "ready") return;
    const abort = new AbortController();
    eventPageDays(abort.signal).then((days) => {
      pageDays.current = days;
    });
    return () => abort.abort();
  }, [status]);

  // A gathering with its own page here (the Fairy Ball) goes straight to that page, which
  // carries the tickets: from its gold day, its entry in the strip, or its "Ask to join" button.
  // No day card and no Kohsi request form first (koH, 2026-11-10). Capture runs before the
  // element's own click handler inside the shadow root.
  useEffect(() => {
    const node = element.current;
    if (status !== "ready" || !node) return;
    const onClick = (event: Event) => {
      const target = event.composedPath().find((each): each is HTMLElement => each instanceof HTMLElement && Boolean(each.dataset?.act));
      if (!target) return;
      const href = pageFor(target, pageDays.current);
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
        // Named on Kohsi's own limit and failure notices (and on the visit form it opens inside a day).
        "data-email": CONTACT_EMAIL,
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

// The page a clicked control leads to, when it belongs to a gathering with its own page here.
// "ask": the request button on a day card; "go": an entry in the strip of coming gatherings;
// "day": a day in the month.
function pageFor(target: HTMLElement, days: ReadonlyMap<string, string>): string | null {
  const act = target.dataset.act;
  if (act === "ask") return eventPageFor(target.closest(".kg-item")?.querySelector(".kg-title")?.textContent);
  if (act === "go") return eventPageFor(target.querySelector(".kc-mq-title")?.textContent) ?? days.get(target.dataset.value ?? "") ?? null;
  if (act === "day") return days.get(target.dataset.value ?? "") ?? null;
  return null;
}

type ListedGathering = { title?: unknown; startsAt?: unknown; timezone?: unknown };

// The listed gatherings that have a page here, by their day (YYYY-MM-DD in the gathering's own
// zone, the same day the calendar lights). Kohsi out of reach: an empty map, and every click
// falls through to the element as before.
async function eventPageDays(signal: AbortSignal): Promise<Map<string, string>> {
  const days = new Map<string, string>();
  try {
    const res = await fetch(`${KOHSI_URL}/v1/gatherings?limit=50`, { headers: { authorization: `Bearer ${KOHSI_KEY}` }, signal });
    const body = res.ok ? await res.json() : null;
    const list: ListedGathering[] = Array.isArray(body?.data) ? body.data : [];
    for (const g of list) {
      const href = eventPageFor(typeof g.title === "string" ? g.title : null);
      if (!href || typeof g.startsAt !== "string") continue;
      const zone = typeof g.timezone === "string" ? g.timezone : "America/Chicago";
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(g.startsAt));
      days.set(day, href);
    }
  } catch {
    /* out of reach or aborted: no shortcuts */
  }
  return days;
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
/* The day rises over the calendar itself (.kc is position: relative) as a card of paper, as tall
   as it needs, and the page scrolls to read the rest. Not fixed to the book: the page it sits on
   wears a fade mask (the scroll cues), and a mask clips every descendant, fixed ones too, so a
   book-wide card lost its left half (the day and its buttons) behind the page edge (2026-11-22). */
.kc-panel {
  position: absolute;
  inset: 0 0 auto;
  z-index: 20;
  margin: 0;
  padding: clamp(1.3em, 3.2vw, 2em);
  color: #2b1621;
  border: 3px double rgba(168, 117, 38, 0.85);
  border-radius: 2px;
  background: radial-gradient(120% 90% at 50% 30%, #f7eedd 50%, #e8d6b4 100%);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4), 0 0 0 100vmax rgba(43, 22, 33, 0.42);
  opacity: 1;
  animation: none;
}
.kc-day-h { font-size: 1.45em; font-family: var(--font-display), Georgia, serif; font-weight: 400; }
`;
