import { create } from 'zustand';
import type { Selection, GaugeReading, Observation, ComposeDraft } from './types';
import { DEFAULT_REGION, regionById } from './data/regions';

export type SheetDetent = 'peek' | 'half' | 'full';

export interface FlyToRequest {
  center: [number, number];
  zoom?: number;
  nonce: number; // increments each request so the map effect re-fires
}

interface AppState {
  // ── Selection + sheet ──────────────────────────────────────────────
  selection: Selection;
  select: (s: Selection) => void;
  clearSelection: () => void;
  sheetDetent: SheetDetent;
  setDetent: (d: SheetDetent) => void;

  // ── Map focus requests (features ask the map to fly) ───────────────
  flyTo: FlyToRequest | null;
  requestFlyTo: (center: [number, number], zoom?: number) => void;

  // ── Crew mode ──────────────────────────────────────────────────────
  crewMode: boolean;
  setCrewMode: (b: boolean) => void;

  // ── Live conditions (written by the conditions feature) ────────────
  gaugeReadings: Record<string, GaugeReading>;
  setGaugeReadings: (r: Record<string, GaugeReading>) => void;

  // ── Observations (written by the crew feature) ─────────────────────
  observations: Observation[];
  setObservations: (o: Observation[]) => void;

  // ── Crew compose flow ──────────────────────────────────────────────
  compose: ComposeDraft | null;
  startCompose: (init?: Partial<ComposeDraft>) => void;
  updateCompose: (patch: Partial<ComposeDraft>) => void;
  cancelCompose: () => void;

  // ── Trip planner ───────────────────────────────────────────────────
  tripOpen: boolean;
  tripFromId?: string;
  openTrip: (fromId?: string) => void;
  closeTrip: () => void;

  // ── Active region (which waterway area the map + overview focus on) ─
  activeRegion: string;
  setActiveRegion: (id: string) => void;

  // ── Feedback modal ─────────────────────────────────────────────────
  feedbackOpen: boolean;
  setFeedbackOpen: (b: boolean) => void;
}

const emptyDraft = (init?: Partial<ComposeDraft>): ComposeDraft => ({
  refType: 'gps',
  refId: undefined,
  coords: null,
  notes: '',
  species: [],
  waterTest: {},
  contamination: null,
  photos: [],
  ...init,
});

export const useStore = create<AppState>((set) => ({
  selection: { kind: 'none' },
  select: (selection) => set({ selection, sheetDetent: 'half' }),
  clearSelection: () => set({ selection: { kind: 'none' } }),

  sheetDetent: 'peek',
  setDetent: (sheetDetent) => set({ sheetDetent }),

  flyTo: null,
  requestFlyTo: (center, zoom) =>
    set((s) => ({ flyTo: { center, zoom, nonce: (s.flyTo?.nonce ?? 0) + 1 } })),

  // Joined stewards stay in crew mode across reloads (the join flag persists).
  crewMode: (() => {
    try {
      return localStorage.getItem('wd-crew-unlocked') === '1';
    } catch {
      return false;
    }
  })(),
  setCrewMode: (crewMode) => set({ crewMode }),

  gaugeReadings: {},
  setGaugeReadings: (gaugeReadings) => set({ gaugeReadings }),

  observations: [],
  setObservations: (observations) => set({ observations }),

  compose: null,
  startCompose: (init) => set({ compose: emptyDraft(init), crewMode: true }),
  updateCompose: (patch) =>
    set((s) => (s.compose ? { compose: { ...s.compose, ...patch } } : {})),
  cancelCompose: () => set({ compose: null }),

  tripOpen: false,
  tripFromId: undefined,
  openTrip: (fromId) =>
    set({ tripOpen: true, tripFromId: fromId, selection: { kind: 'none' }, sheetDetent: 'full' }),
  closeTrip: () => set({ tripOpen: false, tripFromId: undefined, selection: { kind: 'none' } }),

  activeRegion: DEFAULT_REGION,
  setActiveRegion: (activeRegion) =>
    set((s) => {
      const r = regionById(activeRegion);
      return {
        activeRegion,
        selection: { kind: 'none' },
        tripOpen: false,
        flyTo: r
          ? { center: r.center, zoom: r.zoom, nonce: (s.flyTo?.nonce ?? 0) + 1 }
          : s.flyTo,
      };
    }),

  feedbackOpen: false,
  setFeedbackOpen: (feedbackOpen) => set({ feedbackOpen }),
}));
