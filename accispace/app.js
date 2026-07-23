const DATASET_ID = "y2wy-tgr5";
const DATASET_URL = `https://data.austintexas.gov/resource/${DATASET_ID}.geojson`;
const SOURCE_PAGE = "https://data.austintexas.gov/Transportation-and-Mobility/Austin-Crash-Report-Data-Crash-Level-Records/y2wy-tgr5/about_data";
const DEFAULT_VIEW = { center: [-97.7431, 30.2672], zoom: 10.35, pitch: 57, bearing: -18 };
const CURRENT_YEAR = new Date().getFullYear();
const FIRST_YEAR = Math.max(2016, CURRENT_YEAR - 4);
const ADDRESS_RADIUS_METERS = 80;
const NEARBY_RADIUS_METERS = 1000;

const state = {
  features: [],
  firstYear: FIRST_YEAR,
  mode: "all",
  showFatal: true,
  showSerious: true,
  terrain: true,
  visualization: "combined",
  selectedLocation: null,
  locationRadius: null,
  hotspots: [],
  hotspotIndex: -1,
  hotspotSignature: "",
  navigationFeatures: [],
};

const elements = {
  dataStatus: document.querySelector("#data-status"),
  loading: document.querySelector("#loading-screen"),
  loadingDetail: document.querySelector("#loading-detail"),
  yearRange: document.querySelector("#year-range"),
  yearOutput: document.querySelector("#year-output"),
  statCrashes: document.querySelector("#stat-crashes"),
  statLives: document.querySelector("#stat-lives"),
  statInjuries: document.querySelector("#stat-injuries"),
  showFatal: document.querySelector("#show-fatal"),
  showSerious: document.querySelector("#show-serious"),
  detailCard: document.querySelector("#detail-card"),
  controls: document.querySelector("#controls"),
  mobileToggle: document.querySelector("#mobile-toggle"),
  aboutPanel: document.querySelector("#about-panel"),
  placeSearch: document.querySelector("#place-search"),
  placeQuery: document.querySelector("#place-query"),
  searchResults: document.querySelector("#search-results"),
  locationCard: document.querySelector("#location-card"),
  pinPrompt: document.querySelector("#pin-prompt"),
  pinConfirm: document.querySelector("#pin-confirm"),
  hotspotPosition: document.querySelector("#hotspot-position"),
  hotspotPrev: document.querySelector("#hotspot-prev"),
  hotspotNext: document.querySelector("#hotspot-next"),
  randomTarget: document.querySelector("#random-target"),
  timelinePanel: document.querySelector("#timeline-panel"),
  timelineToggle: document.querySelector("#timeline-toggle"),
  crashTooltip: document.querySelector("#crash-tooltip"),
  navSearchToggle: document.querySelector("#nav-search-toggle"),
};

let searchMarker;
let candidateMarker;
let searchTimer;
let searchAbortController;
let pinCountdownTimer;
let pendingPin;

elements.yearRange.min = FIRST_YEAR;
elements.yearRange.max = CURRENT_YEAR;
elements.yearRange.value = FIRST_YEAR;
document.querySelector("#timeline-first").textContent = FIRST_YEAR;

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/dark",
  ...DEFAULT_VIEW,
  maxPitch: 72,
  minZoom: 8,
  maxZoom: 17,
  hash: false,
  attributionControl: false,
  antialias: true,
});

map.doubleClickZoom.disable();

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

map.on("load", async () => {
  softenBaseMap();
  addTerrain();
  addDataLayers();
  await loadCrashData();
});

function softenBaseMap() {
  const style = map.getStyle();
  style.layers.forEach((layer) => {
    if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#070604");
    if (layer.type === "symbol" && layer.layout?.["text-field"]) {
      map.setPaintProperty(layer.id, "text-color", "#ad9270");
      map.setPaintProperty(layer.id, "text-halo-color", "#070604");
      map.setPaintProperty(layer.id, "text-halo-width", 1);
    }
    if (layer.type === "line") {
      const id = layer.id.toLowerCase();
      if (id.includes("road") || id.includes("street") || id.includes("highway")) {
        map.setPaintProperty(layer.id, "line-color", id.includes("motorway") ? "#74501e" : "#392812");
        map.setPaintProperty(layer.id, "line-opacity", 0.72);
      }
    }
  });
  if (typeof map.setFog === "function") {
    map.setFog({ color: "#070604", "high-color": "#2a1806", "horizon-blend": 0.16, "space-color": "#020201", "star-intensity": 0.14 });
  }
}

function addTerrain() {
  map.addSource("terrain", {
    type: "raster-dem",
    tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
    tileSize: 256,
    encoding: "terrarium",
    maxzoom: 15,
  });
  map.setTerrain({ source: "terrain", exaggeration: 1.65 });
}

function addDataLayers() {
  map.addSource("harm-cells", { type: "geojson", data: emptyCollection() });
  map.addSource("crashes", { type: "geojson", data: emptyCollection() });

  map.addLayer({
    id: "harm-cell-glow",
    source: "harm-cells",
    type: "fill-extrusion",
    paint: {
      "fill-extrusion-color": ["interpolate", ["linear"], ["get", "score"], 1, "#ffd36a", 8, "#ff9f1a", 20, "#ff573b"],
      "fill-extrusion-height": ["interpolate", ["linear"], ["get", "score"], 1, 80, 25, 1350],
      "fill-extrusion-base": 10,
      "fill-extrusion-opacity": 0.18,
      "fill-extrusion-vertical-gradient": true,
    },
  });

  map.addLayer({
    id: "harm-cells",
    source: "harm-cells",
    type: "line",
    paint: {
      "line-color": ["interpolate", ["linear"], ["get", "score"], 1, "#ffe6a8", 8, "#ffb000", 20, "#ff573b"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 13, 1.4],
      "line-opacity": 0.72,
    },
  });

  map.addLayer({
    id: "crash-halo",
    source: "crashes",
    type: "circle",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 10],
      "circle-color": ["case", [">", ["to-number", ["get", "death_cnt"]], 0], "#ff573b", "#ffd05a"],
      "circle-opacity": 0.12,
      "circle-blur": 0.85,
    },
  });

  map.addLayer({
    id: "crash-points",
    source: "crashes",
    type: "circle",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1.4, 14, 4.5],
      "circle-color": ["case", [">", ["to-number", ["get", "death_cnt"]], 0], "#ff573b", "#ffd05a"],
      "circle-stroke-color": "#fff6e8",
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 0, 14, 0.8],
      "circle-opacity": 0.92,
    },
  });

  map.addLayer({
    id: "crash-hit-targets",
    source: "crashes",
    type: "circle",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 18, 14, 22],
      "circle-color": "#ffffff",
      "circle-opacity": 0.001,
    },
  });

  map.on("mouseenter", "crash-hit-targets", () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mousemove", "crash-hit-targets", showCrashTooltip);
  map.on("mouseleave", "crash-hit-targets", () => {
    map.getCanvas().style.cursor = "grab";
    elements.crashTooltip.hidden = true;
  });
  map.on("click", "crash-hit-targets", (event) => {
    elements.crashTooltip.hidden = true;
    showCrashDetail(event.features[0]);
  });
  map.on("click", (event) => {
    const hits = map.queryRenderedFeatures(event.point, { layers: ["crash-hit-targets"] });
    if (!hits.length && !elements.detailCard.hidden) closeCrashDetail();
  });
  map.on("dblclick", handleMapDoubleClick);
}

async function loadCrashData() {
  const fields = [
    "id", "cris_crash_id", "crash_timestamp_ct", "latitude", "longitude", "crash_sev_id", "death_cnt",
    "sus_serious_injry_cnt", "units_involved", "rpt_block_num", "rpt_street_name",
    "rpt_street_sfx", "crash_speed_limit", "pedestrian_death_count",
    "pedestrian_serious_injury_count", "bicycle_death_count", "bicycle_serious_injury_count",
    "motorcycle_death_count", "motorcycle_serious_injury_count", "micromobility_death_count",
    "micromobility_serious_injury_count", "point",
  ].join(",");
  const where = `is_deleted=false AND crash_timestamp_ct >= '${FIRST_YEAR}-01-01T00:00:00' AND (crash_sev_id=1 OR crash_sev_id=4) AND point IS NOT NULL`;
  const params = new URLSearchParams({ "$select": fields, "$where": where, "$limit": "5000", "$order": "crash_timestamp_ct DESC" });

  try {
    elements.loadingDetail.textContent = "Mapping fatal and serious-injury records";
    const response = await fetch(`${DATASET_URL}?${params}`);
    if (!response.ok) throw new Error(`Data request returned ${response.status}`);
    const data = await response.json();
    state.features = data.features.filter(isAustinCoordinate);
    renderData();
    elements.dataStatus.textContent = `${state.features.length.toLocaleString()} records synced`;
    window.setTimeout(() => elements.loading.classList.add("done"), 500);
  } catch (error) {
    console.error(error);
    elements.dataStatus.textContent = "Live data unavailable";
    elements.loadingDetail.textContent = "The City data service did not respond. Please refresh to try again.";
    elements.loading.querySelector("p").textContent = "Connection interrupted";
  }
}

function isAustinCoordinate(feature) {
  const [lng, lat] = feature.geometry?.coordinates || [];
  return lng > -98.05 && lng < -97.45 && lat > 30.05 && lat < 30.58;
}

function renderData() {
  const scopeFiltered = state.features.filter(matchesFilters);
  const filtered = state.selectedLocation && state.locationRadius
    ? scopeFiltered.filter((feature) => distanceMeters(feature.geometry.coordinates, state.selectedLocation.geometry.coordinates) <= state.locationRadius)
    : scopeFiltered;
  const scopeCells = buildHexCells(scopeFiltered);
  const filterSignature = `${state.firstYear}:${state.mode}:${state.showFatal}:${state.showSerious}`;
  if (filterSignature !== state.hotspotSignature) {
    state.hotspotIndex = -1;
    state.hotspotSignature = filterSignature;
  }
  state.navigationFeatures = scopeFiltered;
  state.hotspots = [...scopeCells.features].sort((a, b) => b.properties.score - a.properties.score).slice(0, 20);
  map.getSource("crashes").setData({ type: "FeatureCollection", features: filtered });
  map.getSource("harm-cells").setData(filtered === scopeFiltered ? scopeCells : buildHexCells(filtered));

  const totals = filtered.reduce((sum, feature) => {
    sum.deaths += number(feature.properties.death_cnt);
    sum.injuries += number(feature.properties.sus_serious_injry_cnt);
    return sum;
  }, { deaths: 0, injuries: 0 });

  animateNumber(elements.statCrashes, filtered.length);
  animateNumber(elements.statLives, totals.deaths);
  animateNumber(elements.statInjuries, totals.injuries);
  elements.yearOutput.textContent = `${state.firstYear} to present`;
  updateLocationCard(scopeFiltered, filtered);
  updateDiscoveryControls();
}

function matchesFilters(feature) {
  const p = feature.properties;
  const year = new Date(p.crash_timestamp_ct).getFullYear();
  const isFatal = number(p.death_cnt) > 0 || number(p.crash_sev_id) === 4;
  const severityMatches = (isFatal && state.showFatal) || (!isFatal && state.showSerious);
  if (year < state.firstYear || !severityMatches) return false;
  if (state.mode === "walking") return number(p.pedestrian_death_count) + number(p.pedestrian_serious_injury_count) > 0;
  if (state.mode === "bicycle") return number(p.bicycle_death_count) + number(p.bicycle_serious_injury_count) > 0;
  if (state.mode === "motorcycle") return number(p.motorcycle_death_count) + number(p.motorcycle_serious_injury_count) > 0;
  return true;
}

function buildHexCells(features) {
  const radius = 0.0062;
  const vertical = radius * Math.sqrt(3);
  const cells = new Map();

  features.forEach((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const row = Math.round((lat - 30.05) / vertical);
    const offset = row % 2 ? radius * 0.75 : 0;
    const column = Math.round((lng + 98.05 - offset) / (radius * 1.5));
    const key = `${column}:${row}`;
    const score = Math.max(1, number(feature.properties.death_cnt) * 4 + number(feature.properties.sus_serious_injry_cnt));
    const existing = cells.get(key) || { lng: column * radius * 1.5 - 98.05 + offset, lat: row * vertical + 30.05, score: 0, crashes: 0 };
    existing.score += score;
    existing.crashes += 1;
    cells.set(key, existing);
  });

  return {
    type: "FeatureCollection",
    features: [...cells.values()].map((cell) => ({
      type: "Feature",
      properties: { score: cell.score, crashes: cell.crashes, lng: cell.lng, lat: cell.lat },
      geometry: { type: "Polygon", coordinates: [hexagon(cell.lng, cell.lat, radius * 0.83)] },
    })),
  };
}

function hexagon(lng, lat, radius) {
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    points.push([lng + radius * Math.cos(angle), lat + radius * Math.sin(angle) * 0.86]);
  }
  points.push(points[0]);
  return points;
}

function showCrashDetail(feature) {
  setExploreOpen(false);
  closeSearchResults();
  if (!elements.aboutPanel.hidden) toggleAbout(false);
  if (!elements.pinPrompt.hidden) dismissPinPrompt(true, false);
  const p = feature.properties;
  const date = new Date(p.crash_timestamp_ct);
  const deaths = number(p.death_cnt);
  const injuries = number(p.sus_serious_injry_cnt);
  const address = [p.rpt_block_num, p.rpt_street_name, p.rpt_street_sfx].filter(Boolean).join(" ");
  document.querySelector("#detail-severity").textContent = deaths ? "Fatal crash" : "Serious-injury crash";
  document.querySelector("#detail-severity").style.color = deaths ? "var(--coral)" : "var(--amber)";
  document.querySelector("#detail-location").textContent = address || "Location recorded in Austin";
  document.querySelector("#detail-date").textContent = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  document.querySelector("#detail-harm").textContent = [deaths ? `${deaths} ${deaths === 1 ? "death" : "deaths"}` : "", injuries ? `${injuries} serious ${injuries === 1 ? "injury" : "injuries"}` : ""].filter(Boolean).join(", ") || "Not specified";
  document.querySelector("#detail-speed").textContent = number(p.crash_speed_limit) ? `${p.crash_speed_limit} mph` : "Not recorded";
  const travelType = crashTravelType(p);
  const units = number(p.units_involved);
  document.querySelector("#detail-mode").textContent = units
    ? `${travelType}, ${units} ${units === 1 ? "unit" : "units"}`
    : travelType;
  document.querySelector("#detail-reference").textContent = p.cris_crash_id ? `TxDOT CRIS ${p.cris_crash_id}` : `City record ${p.id}`;
  document.querySelector("#detail-source").href = SOURCE_PAGE;
  elements.locationCard.hidden = true;
  elements.detailCard.hidden = false;
}

function crashTravelType(properties = {}) {
  if (number(properties.pedestrian_death_count) + number(properties.pedestrian_serious_injury_count) > 0) return "Pedestrian involved";
  if (number(properties.bicycle_death_count) + number(properties.bicycle_serious_injury_count) > 0) return "Bicycle involved";
  if (number(properties.motorcycle_death_count) + number(properties.motorcycle_serious_injury_count) > 0) return "Motorcycle involved";
  if (number(properties.micromobility_death_count) + number(properties.micromobility_serious_injury_count) > 0) return "Micromobility involved";
  return "Motor vehicle crash";
}

function showCrashTooltip(event) {
  const feature = event.features?.[0];
  if (!feature || window.matchMedia("(hover: none)").matches) return;
  const p = feature.properties;
  const deaths = number(p.death_cnt);
  const injuries = number(p.sus_serious_injry_cnt);
  const date = new Date(p.crash_timestamp_ct);
  document.querySelector("#tooltip-mode").textContent = crashTravelType(p);
  document.querySelector("#tooltip-severity").textContent = deaths ? "Level 4 · fatal" : "Level 1 · serious";
  document.querySelector("#tooltip-severity").style.color = deaths ? "var(--coral)" : "var(--amber)";
  document.querySelector("#tooltip-harm").textContent = [
    deaths ? `${deaths} ${deaths === 1 ? "life" : "lives"} lost` : "",
    injuries ? `${injuries} serious ${injuries === 1 ? "injury" : "injuries"}` : "",
  ].filter(Boolean).join(", ") || "Harm count not specified";
  document.querySelector("#tooltip-date").textContent = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const tooltipWidth = 220;
  const left = Math.min(window.innerWidth - tooltipWidth - 12, event.point.x + 16);
  const top = Math.max(76, Math.min(window.innerHeight - 118, event.point.y - 42));
  elements.crashTooltip.style.left = `${left}px`;
  elements.crashTooltip.style.top = `${top}px`;
  elements.crashTooltip.hidden = false;
}

function closeCrashDetail() {
  elements.detailCard.hidden = true;
  if (state.selectedLocation && elements.aboutPanel.hidden && elements.pinPrompt.hidden && !elements.controls.classList.contains("open")) {
    elements.locationCard.hidden = false;
  }
}

function updateLocationCard(scopeFeatures, visibleFeatures) {
  if (!state.selectedLocation || !state.locationRadius) {
    elements.locationCard.hidden = true;
    return;
  }
  const properties = state.selectedLocation.properties || {};
  const isNearby = state.locationRadius === NEARBY_RADIUS_METERS;
  const nearbyCount = scopeFeatures.filter((feature) => distanceMeters(feature.geometry.coordinates, state.selectedLocation.geometry.coordinates) <= NEARBY_RADIUS_METERS).length;
  const totals = visibleFeatures.reduce((sum, feature) => {
    sum.deaths += number(feature.properties.death_cnt);
    sum.injuries += number(feature.properties.sus_serious_injry_cnt);
    return sum;
  }, { deaths: 0, injuries: 0 });
  document.querySelector("#location-scope").textContent = isNearby ? "Near this location" : "At this location";
  document.querySelector("#location-name").textContent = placeName(properties);
  document.querySelector("#location-context").textContent = placeContext(properties);
  document.querySelector("#location-crashes").textContent = visibleFeatures.length.toLocaleString();
  document.querySelector("#location-deaths").textContent = totals.deaths.toLocaleString();
  document.querySelector("#location-injuries").textContent = totals.injuries.toLocaleString();
  document.querySelector("#location-note").textContent = isNearby
    ? "Showing records within 1 kilometer of this point. Current year, mode, and severity filters still apply."
    : visibleFeatures.length
      ? "Showing records located within 80 meters of this address. Current filters still apply."
      : "No severe crashes match within 80 meters. Widen the view to inspect the surrounding area.";
  document.querySelector("#show-nearby").textContent = `Show ${nearbyCount.toLocaleString()} accidents near location`;
  document.querySelector("#show-nearby").hidden = isNearby;
  document.querySelector("#show-address").textContent = properties.name === "Top harm concentration" ? "Narrow to this point" : "Return to this address";
  document.querySelector("#show-address").hidden = !isNearby;
  elements.locationCard.hidden = false;
  elements.detailCard.hidden = true;
}

function placeName(properties = {}) {
  const streetAddress = properties.housenumber && properties.street ? `${properties.housenumber} ${properties.street}` : "";
  return streetAddress || properties.name || properties.street || properties.district || "Selected Austin location";
}

function placeContext(properties = {}) {
  return [properties.street, properties.city || "Austin", properties.state || "Texas"]
    .filter((value, index, values) => value && value !== placeName(properties) && values.indexOf(value) === index)
    .join(", ") || "Austin, Texas";
}

function distanceMeters([lngA, latA], [lngB, latB]) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const earthRadius = 6371000;
  const latDelta = toRadians(latB - latA);
  const lngDelta = toRadians(lngB - lngA);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(lngDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateDiscoveryControls() {
  const ready = state.hotspots.length > 0 && state.navigationFeatures.length > 0;
  elements.hotspotPrev.disabled = !ready;
  elements.hotspotNext.disabled = !ready;
  elements.randomTarget.disabled = !ready;
  if (!ready) {
    elements.hotspotPosition.textContent = "No harm sites";
  } else if (state.hotspotIndex >= 0) {
    elements.hotspotPosition.textContent = `Top ${String(state.hotspotIndex + 1).padStart(2, "0")} / ${state.hotspots.length}`;
  } else {
    elements.hotspotPosition.textContent = "Top harm sites";
  }
}

function navigateHotspot(direction) {
  if (!state.hotspots.length) return;
  if (state.hotspotIndex < 0) state.hotspotIndex = direction > 0 ? 0 : state.hotspots.length - 1;
  else state.hotspotIndex = (state.hotspotIndex + direction + state.hotspots.length) % state.hotspots.length;
  const hotspot = state.hotspots[state.hotspotIndex];
  const coordinates = [number(hotspot.properties.lng), number(hotspot.properties.lat)];
  const nearest = nearestCrash(coordinates, state.navigationFeatures);
  const street = nearest ? crashAddress(nearest.properties) : "Austin street network";
  const feature = {
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties: { name: "Top harm concentration", street, city: "Austin", state: "Texas" },
  };
  selectPlace(feature, NEARBY_RADIUS_METERS, 13.35);
  updateDiscoveryControls();
}

function targetRandomCrash() {
  if (!state.navigationFeatures.length) return;
  const randomIndex = Math.floor(Math.random() * state.navigationFeatures.length);
  const crash = state.navigationFeatures[randomIndex];
  const feature = {
    type: "Feature",
    geometry: crash.geometry,
    properties: {
      name: "Random crash target",
      street: crashAddress(crash.properties),
      city: "Austin",
      state: "Texas",
    },
  };
  state.hotspotIndex = -1;
  selectPlace(feature, ADDRESS_RADIUS_METERS, 15.3);
  elements.hotspotPosition.textContent = "Random target";
}

function nearestCrash(coordinates, features) {
  return features.reduce((nearest, feature) => {
    const distance = distanceMeters(coordinates, feature.geometry.coordinates);
    return !nearest || distance < nearest.distance ? { feature, distance } : nearest;
  }, null)?.feature;
}

function crashAddress(properties = {}) {
  const address = [properties.rpt_block_num, properties.rpt_street_name, properties.rpt_street_sfx].filter(Boolean).join(" ");
  return address && !address.toLowerCase().includes("not reported") ? address : "Recorded Austin location";
}

function number(value) { return Number(value) || 0; }
function emptyCollection() { return { type: "FeatureCollection", features: [] }; }

function animateNumber(element, value) {
  const start = Number(element.textContent.replace(/\D/g, "")) || 0;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.textContent = value.toLocaleString();
    return;
  }
  const started = performance.now();
  const duration = 350;
  function frame(now) {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(start + (value - start) * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

elements.yearRange.addEventListener("input", (event) => {
  state.firstYear = Number(event.target.value);
  renderData();
});

document.querySelectorAll("#mode-filter button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#mode-filter button").forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    state.mode = button.dataset.mode;
    renderData();
  });
});

elements.showFatal.addEventListener("change", () => {
  state.showFatal = elements.showFatal.checked;
  if (!state.showFatal && !state.showSerious) {
    elements.showSerious.checked = true;
    state.showSerious = true;
  }
  renderData();
});

elements.showSerious.addEventListener("change", () => {
  state.showSerious = elements.showSerious.checked;
  if (!state.showFatal && !state.showSerious) {
    elements.showFatal.checked = true;
    state.showFatal = true;
  }
  renderData();
});

document.querySelector("#reset-view").addEventListener("click", () => map.flyTo({ ...DEFAULT_VIEW, duration: 900, essential: true }));
document.querySelector("#toggle-terrain").addEventListener("click", (event) => {
  state.terrain = !state.terrain;
  map.setTerrain(state.terrain ? { source: "terrain", exaggeration: 1.65 } : null);
  event.currentTarget.classList.toggle("active", state.terrain);
  event.currentTarget.setAttribute("aria-pressed", String(state.terrain));
  event.currentTarget.querySelector("span").textContent = state.terrain ? "Terrain" : "Terrain off";
  event.currentTarget.dataset.label = state.terrain ? "Turn terrain off" : "Turn terrain on";
});

document.querySelector("#toggle-layer").addEventListener("click", (event) => {
  const modes = ["combined", "points", "columns"];
  state.visualization = modes[(modes.indexOf(state.visualization) + 1) % modes.length];
  const showPoints = state.visualization !== "columns";
  const showColumns = state.visualization !== "points";
  ["crash-halo", "crash-points"].forEach((layer) => map.setLayoutProperty(layer, "visibility", showPoints ? "visible" : "none"));
  ["harm-cell-glow", "harm-cells"].forEach((layer) => map.setLayoutProperty(layer, "visibility", showColumns ? "visible" : "none"));
  const labels = { combined: "Combined", points: "Points", columns: "Columns" };
  document.querySelector("#layer-label").textContent = labels[state.visualization];
  event.currentTarget.dataset.label = `Map visual: ${labels[state.visualization]}`;
});

document.querySelector("#detail-close").addEventListener("click", closeCrashDetail);

document.querySelector("#show-nearby").addEventListener("click", () => {
  state.locationRadius = NEARBY_RADIUS_METERS;
  renderData();
  map.flyTo({ center: state.selectedLocation.geometry.coordinates, zoom: 13.35, pitch: 57, duration: 700, essential: true });
});

document.querySelector("#show-address").addEventListener("click", () => {
  state.locationRadius = ADDRESS_RADIUS_METERS;
  renderData();
  map.flyTo({ center: state.selectedLocation.geometry.coordinates, zoom: 15.3, pitch: 62, duration: 700, essential: true });
});

document.querySelector("#location-close").addEventListener("click", clearSelectedLocation);

elements.hotspotPrev.addEventListener("click", () => navigateHotspot(-1));
elements.hotspotNext.addEventListener("click", () => navigateHotspot(1));
elements.randomTarget.addEventListener("click", targetRandomCrash);

function setExploreOpen(open) {
  if (open) {
    closeSearchResults();
    elements.detailCard.hidden = true;
    elements.locationCard.hidden = true;
    if (!elements.aboutPanel.hidden) toggleAbout(false);
    if (!elements.pinPrompt.hidden) dismissPinPrompt(true, false);
  }
  elements.controls.classList.toggle("open", open);
  elements.mobileToggle.setAttribute("aria-expanded", String(open));
  elements.mobileToggle.classList.toggle("active", open);
}

elements.mobileToggle.addEventListener("click", () => setExploreOpen(!elements.controls.classList.contains("open")));
document.querySelector("#controls-close").addEventListener("click", () => setExploreOpen(false));

function setTimelineOpen(open) {
  elements.timelinePanel.classList.toggle("collapsed", !open);
  elements.timelineToggle.setAttribute("aria-expanded", String(open));
  elements.timelineToggle.classList.toggle("active", open);
  elements.timelineToggle.dataset.label = open ? "Hide timeline" : "Show timeline";
}

elements.timelineToggle.addEventListener("click", () => setTimelineOpen(elements.timelinePanel.classList.contains("collapsed")));
document.querySelector("#timeline-collapse").addEventListener("click", () => setTimelineOpen(false));
setTimelineOpen(true);

function setSearchOpen(open) {
  elements.placeSearch.classList.toggle("search-open", open);
  elements.navSearchToggle.setAttribute("aria-expanded", String(open));
  elements.navSearchToggle.setAttribute("aria-label", open ? "Close location search" : "Open location search");
  if (open) {
    setExploreOpen(false);
    elements.placeQuery.focus();
  } else {
    closeSearchResults();
  }
}

elements.navSearchToggle.addEventListener("click", () => setSearchOpen(!elements.placeSearch.classList.contains("search-open")));

function toggleAbout(open) {
  if (open) {
    setExploreOpen(false);
    closeSearchResults();
    elements.detailCard.hidden = true;
    elements.locationCard.hidden = true;
    if (!elements.pinPrompt.hidden) dismissPinPrompt(true, false);
  }
  elements.aboutPanel.hidden = !open;
  document.querySelector("#about-toggle").setAttribute("aria-expanded", String(open));
  if (open) document.querySelector("#about-close").focus();
}

document.querySelector("#about-toggle").addEventListener("click", () => toggleAbout(elements.aboutPanel.hidden));
document.querySelector("#about-close").addEventListener("click", () => toggleAbout(false));

elements.placeSearch.addEventListener("submit", async (event) => {
  event.preventDefault();
  await searchPlaces(elements.placeQuery.value, true);
});

elements.placeQuery.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  const query = elements.placeQuery.value.trim();
  if (query.length < 3) {
    closeSearchResults();
    return;
  }
  searchTimer = window.setTimeout(() => searchPlaces(query, false), 260);
});

elements.placeQuery.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    const first = elements.searchResults.querySelector("button");
    if (first) {
      event.preventDefault();
      first.focus();
    }
  }
});

document.addEventListener("click", (event) => {
  if (!elements.placeSearch.contains(event.target)) closeSearchResults();
});

async function searchPlaces(rawQuery, selectFirst) {
  const query = rawQuery.trim();
  if (query.length < 2) return;
  setExploreOpen(false);
  elements.detailCard.hidden = true;
  elements.locationCard.hidden = true;
  if (!elements.aboutPanel.hidden) toggleAbout(false);
  if (!elements.pinPrompt.hidden) dismissPinPrompt(true, false);
  if (searchAbortController) searchAbortController.abort();
  searchAbortController = new AbortController();
  elements.searchResults.hidden = false;
  elements.searchResults.replaceChildren(makeStatusItem("Searching Austin..."));
  elements.placeQuery.setAttribute("aria-expanded", "true");

  try {
    const params = new URLSearchParams({
      q: `${query}, Austin, Texas`,
      limit: "6",
      bbox: "-98.05,30.05,-97.45,30.58",
      lang: "en",
    });
    const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: searchAbortController.signal });
    if (!response.ok) throw new Error(`Location search returned ${response.status}`);
    const data = await response.json();
    const results = data.features.filter(isAustinCoordinate).slice(0, 6);
    if (selectFirst && results[0]) {
      selectPlace(results[0]);
      return;
    }
    renderSearchResults(results);
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    const localResults = findCrashStreets(query);
    if (selectFirst && localResults[0]) selectPlace(localResults[0]);
    else renderSearchResults(localResults, "Location service unavailable. Showing crash streets.");
  }
}

function findCrashStreets(query) {
  const needle = query.toLowerCase();
  const seen = new Set();
  return state.features.filter((feature) => {
    const street = [feature.properties.rpt_street_name, feature.properties.rpt_street_sfx].filter(Boolean).join(" ");
    if (!street.toLowerCase().includes(needle) || seen.has(street)) return false;
    seen.add(street);
    feature.properties.name = street;
    feature.properties.city = "Austin";
    feature.properties.state = "Texas";
    return true;
  }).slice(0, 6);
}

function renderSearchResults(results, note = "") {
  elements.searchResults.replaceChildren();
  if (note) elements.searchResults.append(makeStatusItem(note));
  if (!results.length) {
    elements.searchResults.append(makeStatusItem("No Austin location found. Try a street, park, or landmark."));
    return;
  }
  results.forEach((feature) => {
    const properties = feature.properties || {};
    const name = properties.name || properties.street || properties.district || "Austin location";
    const context = [properties.street, properties.city, properties.state].filter((value, index, values) => value && value !== name && values.indexOf(value) === index).join(", ");
    const item = document.createElement("li");
    const button = document.createElement("button");
    const strong = document.createElement("strong");
    const span = document.createElement("span");
    button.type = "button";
    strong.textContent = name;
    span.textContent = context || "Austin, Texas";
    button.append(strong, span);
    button.addEventListener("click", () => selectPlace(feature));
    button.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") item.nextElementSibling?.querySelector("button")?.focus();
      if (event.key === "ArrowUp") (item.previousElementSibling?.querySelector("button") || elements.placeQuery).focus();
    });
    item.append(button);
    elements.searchResults.append(item);
  });
}

function makeStatusItem(text) {
  const item = document.createElement("li");
  item.className = "search-empty";
  item.textContent = text;
  return item;
}

function selectPlace(feature, initialRadius = ADDRESS_RADIUS_METERS, zoom = 15.3) {
  const coordinates = feature.geometry.coordinates;
  const name = placeName(feature.properties);
  setExploreOpen(false);
  elements.detailCard.hidden = true;
  if (!elements.aboutPanel.hidden) toggleAbout(false);
  elements.placeQuery.value = name;
  closeSearchResults();
  elements.placeSearch.classList.remove("search-open");
  elements.navSearchToggle.setAttribute("aria-expanded", "false");
  if (searchMarker) searchMarker.remove();
  if (candidateMarker) {
    candidateMarker.remove();
    candidateMarker = null;
  }
  const markerElement = document.createElement("div");
  markerElement.style.cssText = "width:18px;height:18px;border:2px solid #ffe0a3;border-radius:2px;background:#070604;box-shadow:0 0 0 6px rgba(255,176,0,.18),0 0 24px #ffb000;transform:rotate(45deg)";
  searchMarker = new maplibregl.Marker({ element: markerElement }).setLngLat(coordinates).addTo(map);
  state.selectedLocation = feature;
  state.locationRadius = initialRadius;
  renderData();
  map.flyTo({ center: coordinates, zoom, pitch: 62, bearing: -12, duration: 1100, essential: true });
}

function clearSelectedLocation() {
  state.selectedLocation = null;
  state.locationRadius = null;
  elements.locationCard.hidden = true;
  elements.detailCard.hidden = true;
  elements.placeQuery.value = "";
  if (searchMarker) {
    searchMarker.remove();
    searchMarker = null;
  }
  renderData();
}

function closeSearchResults() {
  elements.searchResults.hidden = true;
  elements.placeQuery.setAttribute("aria-expanded", "false");
}

async function handleMapDoubleClick(event) {
  event.originalEvent.preventDefault();
  setExploreOpen(false);
  closeSearchResults();
  elements.detailCard.hidden = true;
  elements.locationCard.hidden = true;
  if (!elements.aboutPanel.hidden) toggleAbout(false);
  const coordinates = [event.lngLat.lng, event.lngLat.lat];
  if (candidateMarker) candidateMarker.remove();
  const markerElement = document.createElement("div");
  markerElement.style.cssText = "width:20px;height:20px;border:1px solid #ffb000;background:rgba(7,6,4,.78);box-shadow:0 0 0 8px rgba(255,176,0,.12),0 0 28px #ffb000;transform:rotate(45deg)";
  candidateMarker = new maplibregl.Marker({ element: markerElement }).setLngLat(coordinates).addTo(map);
  pendingPin = {
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties: { name: "Selected map point", city: "Austin", state: "Texas" },
  };
  window.clearInterval(pinCountdownTimer);
  elements.pinPrompt.hidden = false;
  elements.pinConfirm.disabled = true;
  document.querySelector("#pin-prompt-label").textContent = "Locating this point";
  document.querySelector("#pin-prompt-context").textContent = `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`;
  document.querySelector("#pin-countdown").textContent = "...";

  try {
    const params = new URLSearchParams({ lon: coordinates[0], lat: coordinates[1], lang: "en" });
    const response = await fetch(`https://photon.komoot.io/reverse?${params}`);
    if (!response.ok) throw new Error(`Reverse location search returned ${response.status}`);
    const data = await response.json();
    const result = data.features?.[0];
    if (result) pendingPin.properties = result.properties || pendingPin.properties;
  } catch (error) {
    console.error(error);
  }

  document.querySelector("#pin-prompt-label").textContent = placeName(pendingPin.properties);
  document.querySelector("#pin-prompt-context").textContent = placeContext(pendingPin.properties);
  elements.pinConfirm.disabled = false;
  startPinCountdown();
}

function startPinCountdown() {
  let seconds = 5;
  const countdown = document.querySelector("#pin-countdown");
  countdown.textContent = seconds;
  countdown.setAttribute("aria-label", `Closes in ${seconds} seconds`);
  window.clearInterval(pinCountdownTimer);
  pinCountdownTimer = window.setInterval(() => {
    seconds -= 1;
    countdown.textContent = seconds;
    countdown.setAttribute("aria-label", `Closes in ${seconds} seconds`);
    if (seconds <= 0) dismissPinPrompt();
  }, 1000);
}

function dismissPinPrompt(removeCandidate = true, restoreLocation = true) {
  window.clearInterval(pinCountdownTimer);
  elements.pinPrompt.hidden = true;
  if (removeCandidate && candidateMarker) {
    candidateMarker.remove();
    candidateMarker = null;
  }
  if (removeCandidate) pendingPin = null;
  if (restoreLocation && state.selectedLocation && elements.detailCard.hidden && elements.aboutPanel.hidden && !elements.controls.classList.contains("open")) {
    elements.locationCard.hidden = false;
  }
}

elements.pinConfirm.addEventListener("click", () => {
  if (!pendingPin) return;
  const selectedPin = pendingPin;
  dismissPinPrompt(false);
  selectPlace(selectedPin);
  pendingPin = null;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    elements.detailCard.hidden = true;
    if (!elements.pinPrompt.hidden) dismissPinPrompt();
    if (!elements.aboutPanel.hidden) toggleAbout(false);
    setExploreOpen(false);
    setSearchOpen(false);
  }
});
