# ACCI

Austin Crash Context Interface is an experimental spatial view of fatal and serious-injury crashes in Austin. It reads the City of Austin's public Vision Zero crash-level dataset directly in the browser and renders severity-weighted harm cells over a WebGL terrain map.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Data

Source: [Austin Crash Report Data, Crash Level Records](https://data.austintexas.gov/Transportation-and-Mobility/Austin-Crash-Report-Data-Crash-Level-Records/y2wy-tgr5)

The app requests fatal and suspected serious-injury records for the latest five calendar years. Data can be delayed, revised, incomplete, or imprecisely located. Recent totals are especially likely to change.
