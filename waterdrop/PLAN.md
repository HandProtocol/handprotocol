# WaterDrop — Planning Doc

A mobile-first PWA for stewardship of the San Marcos River paddling corridor
(City Park → Luling / Zedler Dam, ~50 river miles per the TG Canoes & Kayaks map).

The **interactive river map is the hero.** Two audiences share it:
- **Public** — plan a float: access points, segment mileage, run-time estimates, live river conditions.
- **Crew** (logged in) — run routes and pin field observations: photos, notes, species, water tests, contamination flags.

## Decisions locked

| Question | Decision |
|---|---|
| Primary users | Both, one map (public + crew login) |
| Data realness (v1) | **Live USGS gauges** for level/flow; observations local-first |
| Hero | Interactive river map |
| Platform | Mobile-first **PWA** (installable, camera, offline-capable) |

## Tech stack

- **Vite + React + TypeScript** — fast, PWA-friendly, matches house stack.
- **Leaflet + react-leaflet** + OpenStreetMap raster tiles — zero API key, battle-tested mobile gestures. (MapLibre vector is an option later.)
- **vite-plugin-pwa** — service worker, app-shell + tile caching, installable, offline river stretches.
- **USGS Water Services IV API** — `waterservices.usgs.gov/nwis/iv/` — real-time **gage height (param 00065)** and **discharge/flow (00060)**. Free, no key, CORS-enabled.
- **Dexie (IndexedDB)** — local-first observation store incl. photo blobs. One repository interface so we can swap to **Supabase** (auth + Postgres + storage) in a later phase with no UI rewrite.
- **Recharts** — gauge trend + water-test sparklines.

## Data model

```
AccessPoint   id, name, type(park|ramp|dam-portage|campground|crossing),
              coords[lat,lng], public:bool, riverMile, amenities[], notes

Segment       id, fromPointId, toPointId, distanceMiles, estHours,
              hazards[](rapid|dam|low-water-bridge|strainer), difficulty,
              geometry(polyline), description

Gauge         usgsId, name, coords, params{gageHeight, discharge},
              nearestSegmentIds[]

Observation   id, ts, author, refType(point|segment|gps), refId, coords,
              photos[](blob), notes, species[]{name,count,notes},
              waterTest{tempC, pH, turbidityNTU, dissolvedO2, conductivity},
              contamination?{severity, type, description}
```

Access points + segments are seeded as **GeoJSON** from real coordinates of the
TG map landmarks (Rio Vista Falls, City Park, Cummings Dam, San Marcos River
Retreat, Scull's Crossing, Martindale, Shady Grove/Spencer Canoes, Staples Dam,
Zedler Dam/Luling, Palmetto State Park). The hand-drawn TG map is a **reference**,
not a data source — georeferencing it is the one real research task.

## Build phases

**Phase 0 — Scaffold** (Vite/React/TS, PWA plugin, Leaflet shell, repo structure).
**Phase 1 — The map** (seeded GeoJSON points + segments, tap a point → detail card,
tap a segment → mileage/hours/hazards). This is the hero; ship it first.
**Phase 2 — Live conditions** (USGS gauges on map + segment cards, "runnable today?"
heuristic from flow, trend charts).
**Phase 3 — Crew mode** (passcode gate → observation form: GPS pin, camera capture,
species, water test, contamination flag; observations render as map pins; Dexie persistence).
**Phase 4 — Polish/PWA** (offline tile cache, install prompt, export observations CSV/GeoJSON).
**Phase 5 — Supabase** (real auth, sync observations + photos, multi-crew). Deferred.

## Open / deferred
- Exact gauge IDs to feature (confirm which USGS stations cover our reach).
- Crew auth is a passcode in v1; real accounts land in Phase 5.
- Contamination workflow (who reviews flags, escalation) — define before Phase 3.
