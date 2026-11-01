"use client";

import { createElement, useEffect, useState } from "react";
import { KOORDI_KEY, KOORDI_URL, loadWidget } from "./koordi-booking";

// koordi's <koordi-gatherings> element: the tenant's listed gatherings with "Request a spot"
// (koordi record 0041, docs/plans/2026-10-31-gatherings.md). Same script as the booking
// widget; the element registers itself when the service that serves /widget.js has it.
export function KoordiGatherings({ onHello, onVisit }: { onHello: () => void; onVisit: () => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "failed">("loading");

  useEffect(() => {
    let alive = true;
    loadWidget().then(
      () => alive && setStatus(customElements.get("koordi-gatherings") ? "ready" : "missing"),
      () => alive && setStatus("failed"),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (!KOORDI_KEY || status === "failed" || status === "missing") {
    return (
      <div className="door-done">
        <h3>The calendar is being set.</h3>
        <p>
          First gatherings open fall 2027. If you would like first word when dates are posted,{" "}
          <button type="button" className="link-btn" onClick={onHello}>
            say hello
          </button>{" "}
          and tick keep me posted. The land is open to visit in the meantime:{" "}
          <button type="button" className="link-btn" onClick={onVisit}>
            choose a day
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="koordi-shell" data-status={status}>
      {status === "loading" && <p className="door-fallback">Opening the calendar…</p>}
      {createElement("koordi-gatherings", { "data-key": KOORDI_KEY, "data-api": KOORDI_URL, "data-lang": "en", "data-heading": "3", "data-limit": "12", "data-empty": "Nothing on the calendar yet. First gatherings open fall 2027." })}
    </div>
  );
}
