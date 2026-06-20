// Core domain types for the Waterdrop San Marcos River paddling app.
// riverData.ts imports these; do not duplicate them elsewhere.

export type AccessType =
  | 'park'
  | 'ramp'
  | 'dam-portage'
  | 'campground'
  | 'crossing'
  | 'outfitter';

export interface AccessPoint {
  id: string; // kebab-case slug, e.g. 'city-park'
  name: string;
  type: AccessType;
  coords: [number, number]; // [lat, lng] decimal degrees, ~5 decimals
  public: boolean; // true = publicly accessible put-in/take-out
  riverMile: number; // miles downstream from the waterway's mile-0 reference
  amenities: string[]; // e.g. ['parking','restrooms','ramp','shade']
  notes: string; // one or two sentences, paddler-useful
  region?: string; // region id (e.g. 'san-marcos' | 'austin'); defaulted in @/data
  waterway?: string; // specific water body, e.g. 'Lady Bird Lake', 'Pedernales River'
  featured?: boolean; // a standout, recommended drop-in spot
}

export type Hazard =
  | 'rapid'
  | 'dam'
  | 'low-water-bridge'
  | 'strainer'
  | 'rebar'
  | 'log-jam';

export type Difficulty = 'flatwater' | 'easy' | 'moderate' | 'advanced';

export interface Segment {
  id: string; // e.g. 'city-park__rio-vista'
  fromPointId: string; // AccessPoint.id
  toPointId: string; // AccessPoint.id
  distanceMiles: number;
  estHours: number; // typical leisurely paddle time at normal flow
  hazards: Hazard[];
  difficulty: Difficulty;
  geometry: [number, number][]; // coarse polyline of 4-10 [lat,lng] waypoints
  description: string; // 1-2 sentences: character of the run, notable features
  region?: string; // region id; defaulted in @/data
  waterway?: string; // specific water body
}

export interface Gauge {
  usgsId: string; // 8-digit USGS site number
  name: string;
  coords: [number, number];
  nearestSegmentIds: string[]; // segment ids this gauge best represents
  region?: string; // region id; defaulted in @/data
  flowLowCfs?: number; // discharge below this = too low/scrapey for this reach
  flowHighCfs?: number; // discharge above this = high water / caution
}

// ───────────────────────────────────────────────────────────────────────────
// Live conditions (USGS). Populated by the conditions feature into the store.
// ───────────────────────────────────────────────────────────────────────────

export type Verdict = 'good' | 'low' | 'high' | 'danger' | 'unknown';

export interface TrendPoint {
  t: string; // ISO timestamp
  cfs?: number; // discharge (param 00060)
  ft?: number; // gage height (param 00065)
}

export interface GaugeReading {
  usgsId: string;
  gageHeightFt?: number; // param 00065, latest
  dischargeCfs?: number; // param 00060, latest
  observedAt?: string; // ISO timestamp of the latest reading
  fetchedAt: number; // epoch ms when we fetched
  stale: boolean; // true if served from cache or the fetch failed
  verdict: Verdict; // runnable verdict for this gauge's reach
  series?: TrendPoint[]; // recent trend (last ~24h)
}

// ───────────────────────────────────────────────────────────────────────────
// Crew observations (local-first; see lib/repository.ts).
// ───────────────────────────────────────────────────────────────────────────

export type ObservationRefType = 'point' | 'segment' | 'gps';
export type ContaminationSeverity = 'trace' | 'minor' | 'moderate' | 'severe';

export interface SpeciesSighting {
  name: string;
  count?: number;
  notes?: string;
}

export interface WaterTest {
  tempC?: number;
  pH?: number;
  turbidityNTU?: number;
  dissolvedO2?: number; // mg/L
  conductivity?: number; // µS/cm
}

export interface Contamination {
  severity: ContaminationSeverity;
  type: string; // e.g. 'sewage' | 'trash' | 'algae' | 'oil' | 'sediment' | 'other'
  description: string;
}

export interface Photo {
  id: string;
  blob: Blob;
  caption?: string;
}

export interface Observation {
  id: string;
  ts: number; // epoch ms
  author: string;
  refType: ObservationRefType;
  refId?: string; // AccessPoint.id or Segment.id when not 'gps'
  coords: [number, number]; // [lat, lng]
  photos: Photo[];
  notes: string;
  species: SpeciesSighting[];
  waterTest?: WaterTest;
  contamination?: Contamination;
}

// Draft used by the crew compose flow (photos held as blobs until saved).
export interface ComposeDraft {
  refType: ObservationRefType;
  refId?: string;
  coords: [number, number] | null;
  notes: string;
  species: SpeciesSighting[];
  waterTest: WaterTest;
  contamination: Contamination | null;
  photos: Photo[];
}

// ───────────────────────────────────────────────────────────────────────────
// Map / sheet selection bus.
// ───────────────────────────────────────────────────────────────────────────

export type Selection =
  | { kind: 'none' }
  | { kind: 'point'; id: string }
  | { kind: 'segment'; id: string }
  | { kind: 'gauge'; usgsId: string }
  | { kind: 'observation'; id: string };
