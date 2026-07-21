# ACCI Handoff

Last updated: 2026-07-19

## Current state

ACCI, the Austin Crash Context Interface, is live at [acci.handprotocol.org](https://acci.handprotocol.org). It is a standalone static Netlify app that renders recent fatal and suspected serious-injury crashes from the City of Austin Vision Zero crash-level dataset.

The production Netlify project is `acci-handprotocol`, project ID `92b38e69-7254-4e2d-aed6-4f6795379b22`. The custom domain is managed through the existing `handprotocol.org` Netlify DNS zone and is covered by its wildcard TLS certificate.

## Product behavior

- The initial map loads the latest five calendar years of fatal and suspected serious-injury crashes.
- WebGL terrain, point markers, and severity-weighted hexagonal columns show spatial concentrations of harm.
- Year, travel mode, severity, and terrain controls update the map and totals.
- Address and landmark search is bounded to Austin through Photon.
- A selected address summarizes matching crashes within 80 meters.
- “Show accidents near location” expands the investigation radius to one kilometer.
- Double-clicking the map reverse-searches the selected point and shows a five-second “Search this pin” confirmation.
- Top-harm arrows step through the 20 highest severity-weighted concentrations under the active filters.
- The target control selects a random crash under the active filters.
- Tapping a crash opens its date, harm, speed, involved units, location, and source-record link.

## Mobile interaction rules

Mobile uses one active surface at a time. Search results, Explore Data, location summaries, crash details, about content, and pin confirmation must not stack.

- Explore Data opens from the bottom-left settings control.
- Explore Data has an internal X close control.
- Crash and location details open as bottom sheets with safe-area padding.
- Crash markers retain their small visual dots but have 36 to 44 pixel invisible hit regions.
- Opening a new surface closes competing surfaces.
- Closing crash details restores the active location summary when one exists.

## Files

- `index.html`: semantic application shell, controls, summaries, prompts, and source notes.
- `style.css`: full visual system, responsive layout, bottom sheets, and reduced-motion behavior.
- `app.js`: map setup, City data query, filtering, spatial aggregation, search, reverse lookup, hotspot navigation, random targeting, and overlay state.
- `netlify.toml`: static publish configuration, security headers, and revalidated asset caching.
- `favicon.svg`: ACCI application mark.
- `README.md`: short local-development and data-source guide.

## External services

- Crash data: `https://data.austintexas.gov/resource/y2wy-tgr5.geojson`
- Geocoding and reverse lookup: `https://photon.komoot.io`
- Basemap: `https://tiles.openfreemap.org/styles/dark`
- Terrain tiles: AWS Terrain Tiles, Terrarium encoding
- Map runtime: MapLibre GL JS 5.24.0 from unpkg
- Fonts: Inter and JetBrains Mono from Google Fonts

The app has no build step and no stored API secrets. External-service availability is a runtime dependency.

## Local development

```bash
cd accispace
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Validation

Run before deployment:

```bash
node --check app.js
npx --yes html-validate@10 index.html
git diff --check -- .
```

The latest browser verification covered:

- Loading 2,063 live crash records
- Ranked hotspot navigation
- Random crash targeting
- Address and nearby-crash summaries
- Double-click reverse lookup and countdown dismissal
- Real crash-marker pointer selection
- Exclusive mobile overlays at 390 by 844 pixels
- Mobile Explore Data open and close behavior
- No browser exceptions during the verified flows

## Deploy

The directory is linked locally to the Netlify project through `.netlify/state.json`, which is intentionally ignored by git. Deploy manually with:

```bash
netlify deploy --prod --dir . --message "Describe the ACCI update"
```

After deployment, verify both `https://acci.handprotocol.org` and the browser-level live data load. JavaScript and CSS use `max-age=0, must-revalidate` because the filenames are not content-hashed.

## Known constraints and next moves

- There is no bundled crash-data fallback if the City API is unavailable.
- Photon, OpenFreeMap, terrain tiles, fonts, and MapLibre are external runtime dependencies.
- The word “accident” appears in user-facing discovery controls because that is the requested language. City data and explanatory copy otherwise use “crash.”
- A future reliability pass could vendor MapLibre, self-host fonts, and create a scheduled crash-data snapshot.
- A future analysis pass could add accessible crash lists and permalinked filter state.

## Repository safety

ACCI work is confined to `accispace/`. The adjacent `wxl/` working changes belong to a separate workstream and must not be staged or modified as part of ACCI work.
