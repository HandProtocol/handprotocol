# WaterDrop

**Live: https://waterdrop.handprotocol.org**

A mobile-first PWA (great on desktop too) for paddling **Central Texas** — find the best drop-in spots, plan a float, read live river conditions, and (as crew) log field observations. It now covers **4 regions, ~15 waterways, 91 drop-in spots, and 20 live USGS gauges**: Austin (Lady Bird Lake, Lake Austin, the Colorado below Longhorn Dam), the San Marcos River corridor, the Hill Country (Pedernales, Llano, San Gabriel, Blanco, Highland Lakes), and the Guadalupe & Comal. The interactive map is the hero; one map serves the public planning a float and the crew logging observations. On desktop the bottom sheet docks as a left rail.

Deployment + DB notes (Netlify via handprotocol, Supabase for the future sync phase) are recorded in the project memory; region data lives in `src/data/ctx-*.ts` merged through `src/data/index.ts`.

## Run it

```bash
npm install
npm run dev        # dev server (Vite)
npm run build      # production build -> dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
```

Open the local URL, install to your home screen (it is an installable PWA), and it works offline once tiles and conditions have been seen.

## What it does

**Public (no login)**
- Browse every public put-in and take-out with river mile, type, and amenities.
- Tap a run between two access points to see distance, estimated paddle time, difficulty, and hazards (rapids, dams to portage, strainers, rebar, low-water bridges).
- See **live river conditions** from real USGS gauges, resolved to a plain verdict (Runnable / Too low / High water / Unsafe) before any number, plus a 24-hour discharge trend.

**Crew (passcode)**
- Unlock with a passcode, then log GPS-stamped field observations: photos (camera capture), notes, species seen, a full water-test panel (temp, pH, turbidity, dissolved O2, conductivity), and contamination flags with a severity scale.
- Observations save locally (offline-safe, IndexedDB) and render as pins on the shared map.
- Export all observations as CSV or GeoJSON.

The v1 crew passcode is `sanmarcos` (override with `VITE_CREW_PASSCODE`). Real accounts + sync land in the Supabase phase (see below).

## Architecture

- **Vite + React 18 + TypeScript**, plain CSS with an OKLCH token system (`src/styles/tokens.css`, see `DESIGN.md`).
- **Leaflet + react-leaflet** over OpenStreetMap raster tiles (no API key).
- **A Zustand store (`src/store.ts`) is the integration bus.** Features never import each other: the conditions feature writes gauge readings into the store and the crew feature writes observations into it; the map reads both. Selection and the bottom-sheet detent also live there.
- **Live data:** USGS Water Services Instantaneous Values API (`waterservices.usgs.gov/nwis/iv`), params 00060 (discharge) and 00065 (gage height). Degrades to last-known/stale gracefully when offline.
- **Local-first crew storage:** Dexie/IndexedDB behind `ObservationRepository` (`src/lib/repository.ts`), so a later Supabase implementation drops in with no UI rewrite.
- **PWA:** `vite-plugin-pwa` with a service worker, app-shell precache, CacheFirst OSM tiles, and NetworkFirst USGS.
- **Code-split:** the chart-heavy gauge detail (recharts) and the crew compose form load on demand.

### Layout

```
src/
  data/riverData.ts        real georeferenced access points, segments, gauges (sourced; see file header)
  types/index.ts           the domain model
  store.ts                 shared state bus
  lib/                     verdict logic, segment<->gauge links, formatters, repository interface
  components/ui/           the design-system primitives (Button, Sheet, StatusPill, ...)
  components/              app shell: Wordmark, DetailSheet host, CorridorOverview, CrewToggle
  features/map/            RiverMap (hero) + access/gauge/observation markers + detail cards
  features/conditions/     USGS fetch, verdict, corridor pill, gauge detail + trend chart
  features/crew/           passcode gate, compose form, observation detail, Dexie store, export
```

## Data accuracy

River data is real and sourced (TPWD paddling trails, TG Canoes & Kayaks, USGS, Texas Rivers Protection Assoc.); see the header of `src/data/riverData.ts`. A few river miles, some coordinates, and the coarse river polylines are flagged in-file as estimates to refine. Three USGS gauges (08170500, 08171400, 08172000) were confirmed to return live data.

## Roadmap

- **Now:** map + planning + live conditions + local crew logging (this build).
- **Next:** Supabase auth + sync (multi-crew observations and photos), contamination review/escalation workflow, refine estimated river miles and polylines, vector tiles, a crew "field night" dark mode.
