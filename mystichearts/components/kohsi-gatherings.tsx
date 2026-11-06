"use client";

import { createElement, useEffect, useState } from "react";
import { KOHSI_KEY, KOHSI_URL, loadWidget } from "./kohsi-booking";

// Kohsi's <kohsi-gatherings> element: the tenant's listed gatherings with "Request a spot"
// (Kohsi record 0041, docs/plans/2026-10-31-gatherings.md). Same script as the booking
// widget; the element registers itself when the service that serves /widget.js has it.
export function KohsiGatherings({ onHello, onVisit }: { onHello: () => void; onVisit: () => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "failed">("loading");

  useEffect(() => {
    let alive = true;
    loadWidget().then(
      () => alive && setStatus(customElements.get("kohsi-gatherings") ? "ready" : "missing"),
      () => alive && setStatus("failed"),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (!KOHSI_KEY || status === "failed" || status === "missing") {
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
    <div className="kohsi-shell" data-status={status}>
      {status === "loading" && <p className="door-fallback">Opening the calendar…</p>}
      {createElement("kohsi-gatherings", { "data-key": KOHSI_KEY, "data-api": KOHSI_URL, "data-lang": "en", "data-heading": "3", "data-limit": "12", "data-empty": "Nothing on the calendar yet. First gatherings open fall 2027." })}
    </div>
  );
}
