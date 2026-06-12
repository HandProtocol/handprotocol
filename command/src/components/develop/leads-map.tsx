"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { isLiveSite, type BizLead, type BizStatus } from "@/lib/develop/types";

/*
  Develop pillar, leads plotted by location on a token-free MapLibre map.

  The leads handed in are already pin-filtered (lat AND lng present) by the
  page, so this component never has to reason about coverage, only render.

  SSR note: MapLibre touches `window`/`document` at construct time, so the map
  is only ever initialised inside a browser `useEffect`, guarded against a
  null container ref. The "use client" boundary keeps the import off the
  server, and the effect keeps the constructor out of any render pass.
*/

// Status -> hex, kept consistent with status-chip.tsx. Amber through the
// pipeline, brighter at interested, green at closed, faint at passed.
const STATUS_HEX: Record<BizStatus, string> = {
  prospect: "#8e8a7e", // ink-dim grey
  built: "#d97706", // amber
  contacted: "#d97706", // amber
  interested: "#fbbf24", // warm amber-gold
  closed: "#22c55e", // green
  passed: "#4a4940", // ink-faint
};

// Legend rows, ordered as the pipeline reads.
const LEGEND: { status: BizStatus; label: string }[] = [
  { status: "prospect", label: "Prospect" },
  { status: "built", label: "Demo built" },
  { status: "contacted", label: "Contacted" },
  { status: "interested", label: "Interested" },
  { status: "closed", label: "Closed" },
  { status: "passed", label: "Passed" },
];

const AUSTIN: [number, number] = [-97.74, 30.27];

// Escape user-derived strings before they go into raw popup HTML.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function popupHtml(lead: BizLead): string {
  const meta = [lead.category, lead.city]
    .filter((v): v is string => Boolean(v))
    .map(esc)
    .join(" · ");
  const rating =
    typeof lead.google_rating === "number"
      ? `<div class="lm-pop-rating">${lead.google_rating.toFixed(1)} &#9733;</div>`
      : "";
  const live = isLiveSite(lead)
    ? `<span class="lm-pop-live">LIVE</span>`
    : "";
  return [
    `<div class="lm-pop">`,
    `<div class="lm-pop-name">${esc(lead.name)}${live}</div>`,
    meta ? `<div class="lm-pop-meta">${meta}</div>` : "",
    rating,
    `<a class="lm-pop-link" href="/develop/${esc(lead.slug)}">Open lead &rarr;</a>`,
    `</div>`,
  ].join("");
}

export function LeadsMap({ leads }: { leads: BizLead[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    // SSR / null-ref guard. MapLibre needs a real DOM node and `window`.
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: AUSTIN,
      zoom: 9,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    const markers: maplibregl.Marker[] = [];

    map.on("load", () => {
      const bounds = new maplibregl.LngLatBounds();
      let plotted = 0;

      for (const lead of leads) {
        if (lead.lat == null || lead.lng == null) continue;
        const lngLat: [number, number] = [lead.lng, lead.lat];
        const hex = STATUS_HEX[lead.status] ?? STATUS_HEX.prospect;
        const live = isLiveSite(lead);

        // Hand-built circle marker so we control fill + a brighter ring for
        // live sites without leaning on a sprite sheet.
        const el = document.createElement("div");
        el.className = "lm-marker";
        el.style.background = hex;
        el.style.boxShadow = live
          ? `0 0 0 2px #07090f, 0 0 0 4px ${hex}, 0 0 10px 2px ${hex}`
          : `0 0 0 2px #07090f, 0 0 6px 1px rgba(0,0,0,0.5)`;
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", lead.name);
        el.title = lead.name;

        const popup = new maplibregl.Popup({
          offset: 14,
          closeButton: true,
          className: "lm-popup",
          maxWidth: "260px",
        }).setHTML(popupHtml(lead));

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(lngLat)
          .setPopup(popup)
          .addTo(map);

        markers.push(marker);
        bounds.extend(lngLat);
        plotted += 1;
      }

      // Fit to the markers; single pin centres at a comfortable city zoom.
      if (plotted === 1) {
        const only = leads.find((l) => l.lat != null && l.lng != null);
        if (only && only.lat != null && only.lng != null) {
          map.easeTo({ center: [only.lng, only.lat], zoom: 12, duration: 0 });
        }
      } else if (plotted > 1 && !bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 0 });
      }
      // plotted === 0 leaves the Austin fallback center in place.
    });

    return () => {
      for (const m of markers) m.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [leads]);

  return (
    <div className="panel relative overflow-hidden rounded-[10px]">
      <div
        ref={containerRef}
        className="h-[70vh] min-h-[480px] w-full"
        aria-label="Map of business-development leads"
      />

      {/* Legend: status -> color swatch, floated over the map's lower-left. */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-[rgba(245,239,225,0.1)] bg-[rgba(7,9,15,0.82)] px-3 py-2.5 backdrop-blur">
        <p className="eyebrow mb-1.5">PIPELINE</p>
        <ul className="space-y-1">
          {LEGEND.map((row) => (
            <li
              key={row.status}
              className="flex items-center gap-2 text-[11px] text-[var(--ink-dim)]"
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: STATUS_HEX[row.status] }}
                aria-hidden
              />
              {row.label}
            </li>
          ))}
          <li className="mt-1 flex items-center gap-2 border-t border-[rgba(245,239,225,0.08)] pt-1.5 text-[11px] text-[var(--ink-dim)]">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-[var(--amber-soft)]"
              style={{ background: "var(--amber)" }}
              aria-hidden
            />
            Live site
          </li>
        </ul>
      </div>

      {/* Marker + popup chrome scoped to this map; MapLibre popups are raw HTML
          so the dark theme has to be styled here rather than via Tailwind. */}
      <style>{`
        .lm-marker {
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          cursor: pointer;
          transition: transform 120ms ease;
        }
        .lm-marker:hover { transform: scale(1.25); }
        .lm-popup .maplibregl-popup-content {
          background: #0c1220;
          color: #f5efe1;
          border: 1px solid rgba(245, 239, 225, 0.12);
          border-radius: 8px;
          padding: 10px 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          font-family: var(--font-inter), system-ui, sans-serif;
        }
        .lm-popup .maplibregl-popup-tip {
          border-top-color: #0c1220;
          border-bottom-color: #0c1220;
        }
        .lm-popup .maplibregl-popup-close-button {
          color: #8e8a7e;
          font-size: 15px;
          padding: 0 5px;
        }
        .lm-popup .maplibregl-popup-close-button:hover {
          color: #f5efe1;
          background: transparent;
        }
        .lm-pop-name {
          font-weight: 500;
          font-size: 13px;
          color: #f5efe1;
          line-height: 1.3;
          padding-right: 12px;
        }
        .lm-pop-live {
          display: inline-block;
          margin-left: 6px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.14em;
          color: #ffba49;
          border: 1px solid rgba(217, 119, 6, 0.45);
          border-radius: 9999px;
          padding: 1px 6px;
          vertical-align: middle;
        }
        .lm-pop-meta {
          margin-top: 3px;
          font-size: 11px;
          color: #8e8a7e;
        }
        .lm-pop-rating {
          margin-top: 4px;
          font-size: 11px;
          color: #ffba49;
          font-feature-settings: "tnum" 1;
        }
        .lm-pop-link {
          display: inline-block;
          margin-top: 8px;
          font-size: 12px;
          color: #ffba49;
          text-decoration: none;
        }
        .lm-pop-link:hover { color: #d97706; }
      `}</style>
    </div>
  );
}
