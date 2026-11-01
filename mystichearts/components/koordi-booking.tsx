"use client";

import { createElement, useEffect, useState } from "react";

// koordi's <koordi-booking> element (see ../koordi/docs/connect.md). The script is loaded
// once, from the koordi address in NEXT_PUBLIC_KOORDI_URL, and the business's publishable
// key comes from NEXT_PUBLIC_KOORDI_KEY. Colours are passed down through the --koordi-*
// custom properties the widget reads inside its shadow root.
export const KOORDI_URL = (process.env.NEXT_PUBLIC_KOORDI_URL || "https://koordi.handprotocol.org").replace(/\/+$/, "");
export const KOORDI_KEY = process.env.NEXT_PUBLIC_KOORDI_KEY || "";

let scriptPromise: Promise<void> | null = null;

export function loadWidget(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (customElements.get("koordi-booking")) return resolve();
    const script = document.createElement("script");
    script.src = `${KOORDI_URL}/widget.js`;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("koordi widget did not load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// date: a day to open on (from the calendar's visit day), passed as data-date with the visit
// service; the element opens on it when it is offered and on the first open day otherwise.
export function KoordiBooking({ fallbackEmail, date = null }: { fallbackEmail: string; date?: string | null }) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let alive = true;
    loadWidget().then(
      () => alive && setStatus("ready"),
      () => alive && setStatus("failed"),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (!KOORDI_KEY || status === "failed") {
    return (
      <p className="door-fallback">
        Visits are arranged by hand for now. Write to{" "}
        <a href={`mailto:${fallbackEmail}`}>{fallbackEmail}</a> and we will find a day together.
      </p>
    );
  }

  return (
    <div className="koordi-shell" data-status={status}>
      {status === "loading" && <p className="door-fallback">Opening the calendar…</p>}
      {createElement("koordi-booking", { key: date ?? "any", "data-key": KOORDI_KEY, "data-api": KOORDI_URL, "data-lang": "en", "data-heading": "3", ...(date ? { "data-service": "visit", "data-date": date } : {}) })}
    </div>
  );
}
