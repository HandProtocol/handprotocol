"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { WHATS_ON } from "./copy";
import { KOHSI_KEY, KOHSI_URL, loadWidget } from "./kohsi-booking";
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
