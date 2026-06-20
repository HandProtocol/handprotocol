// ─────────────────────────────────────────────────────────────────────────────
// planTrip — pure multi-leg trip planning logic (no React).
//
// Access points are contiguous along the river, ordered by `riverMile`
// (City Park = mile 0). A trip from put-in A to take-out B is the ordered set of
// `segments` whose endpoints lie between A and B. Distances, times, hazards and
// difficulty aggregate across those legs. The "is it runnable?" answer comes
// from the worst live verdict across the gauges the trip passes through.
// ─────────────────────────────────────────────────────────────────────────────

import { accessPoints, segments } from '@/data';
import { pointById, gaugeForSegment } from '@/lib/segments';
import { VERDICT_SEVERITY } from '@/lib/verdict';
import type {
  Segment,
  Hazard,
  Difficulty,
  Verdict,
  GaugeReading,
} from '@/types';

export interface TripLeg {
  segment: Segment;
  fromName: string;
  toName: string;
}

export interface TripPlan {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  legs: TripLeg[];
  totalMiles: number;
  totalHours: number;
  hazards: Hazard[];
  portageCount: number;
  difficulty: Difficulty;
  gaugeIds: string[];
  valid: boolean;
  reason?: string;
}

// Severity order for the hazard union: most dangerous first, so the readout
// leads with the things that can hurt you. Dams (portage-or-die) outrank rebar,
// strainers and rapids; log jams trail. Exported so UI hints rank identically.
export const HAZARD_SEVERITY: Record<Hazard, number> = {
  dam: 6,
  'low-water-bridge': 5,
  strainer: 4,
  rebar: 3,
  rapid: 2,
  'log-jam': 1,
};

// Difficulty rank used to take the hardest leg as the trip's difficulty.
const DIFFICULTY_RANK: Record<Difficulty, number> = {
  flatwater: 0,
  easy: 1,
  moderate: 2,
  advanced: 3,
};

/** The single most notable hazard on a reach, for a compact leg hint. */
export function mostNotableHazard(hazards: Hazard[]): Hazard | undefined {
  if (hazards.length === 0) return undefined;
  return [...hazards].sort((a, b) => HAZARD_SEVERITY[b] - HAZARD_SEVERITY[a])[0];
}

const nameOf = (id: string): string => pointById(id)?.name ?? id;

/**
 * Build a trip plan from a put-in to a take-out. Returns a valid plan only when
 * the take-out is downstream of the put-in (fromMile < toMile); otherwise the
 * plan is marked invalid with a plain-language `reason`. Distances/times are
 * additive over the contiguous segments between the two points.
 */
export function planTrip(fromId: string, toId: string): TripPlan {
  const from = pointById(fromId);
  const to = pointById(toId);

  const base: Omit<TripPlan, 'valid' | 'reason'> = {
    fromId,
    toId,
    fromName: from?.name ?? fromId,
    toName: to?.name ?? toId,
    legs: [],
    totalMiles: 0,
    totalHours: 0,
    hazards: [],
    portageCount: 0,
    difficulty: 'flatwater',
    gaugeIds: [],
  };

  if (!from || !to) {
    return {
      ...base,
      valid: false,
      reason: 'Pick a put-in and a take-out to plan your float.',
    };
  }

  if (from.id === to.id) {
    return {
      ...base,
      valid: false,
      reason: 'Pick a take-out downstream of your put-in.',
    };
  }

  if (from.riverMile >= to.riverMile) {
    return {
      ...base,
      valid: false,
      reason: 'Pick a take-out downstream of your put-in.',
    };
  }

  // Access points ordered by river mile define the contiguous chain. The trip is
  // the run of segments whose endpoints fall within [fromMile, toMile].
  const ordered = [...accessPoints].sort((a, b) => a.riverMile - b.riverMile);
  const mileById = new Map(ordered.map((p) => [p.id, p.riverMile]));

  const legs: TripLeg[] = [];
  let totalMiles = 0;
  let totalHours = 0;
  const hazardSet = new Set<Hazard>();
  const gaugeIds: string[] = [];
  let difficulty: Difficulty = 'flatwater';

  for (const seg of segments) {
    const segFrom = mileById.get(seg.fromPointId);
    const segTo = mileById.get(seg.toPointId);
    if (segFrom == null || segTo == null) continue;

    // Keep a segment when both of its endpoints lie within the trip window.
    const lo = Math.min(segFrom, segTo);
    const hi = Math.max(segFrom, segTo);
    if (lo >= from.riverMile && hi <= to.riverMile) {
      legs.push({
        segment: seg,
        fromName: nameOf(seg.fromPointId),
        toName: nameOf(seg.toPointId),
      });
      totalMiles += seg.distanceMiles;
      totalHours += seg.estHours;
      for (const h of seg.hazards) hazardSet.add(h);
      if (DIFFICULTY_RANK[seg.difficulty] > DIFFICULTY_RANK[difficulty]) {
        difficulty = seg.difficulty;
      }
      const gauge = gaugeForSegment(seg.id);
      if (gauge && !gaugeIds.includes(gauge.usgsId)) gaugeIds.push(gauge.usgsId);
    }
  }

  if (legs.length === 0) {
    return {
      ...base,
      valid: false,
      reason: 'No mapped run connects those two points yet.',
    };
  }

  legs.sort(
    (a, b) =>
      (mileById.get(a.segment.fromPointId) ?? 0) -
      (mileById.get(b.segment.fromPointId) ?? 0),
  );

  const hazards = [...hazardSet].sort(
    (a, b) => HAZARD_SEVERITY[b] - HAZARD_SEVERITY[a],
  );

  // Portages: a segment carrying a 'dam' hazard means a portage on that reach,
  // plus any dam-portage access point passed *through* (strictly between the
  // endpoints, since the put-in/take-out themselves are where you start/stop).
  let portageCount = legs.filter((l) => l.segment.hazards.includes('dam')).length;
  for (const p of ordered) {
    if (
      p.type === 'dam-portage' &&
      p.riverMile > from.riverMile &&
      p.riverMile < to.riverMile
    ) {
      // Only count it if no adjacent leg already carries a dam hazard at it,
      // to avoid double-counting the same structure.
      const coveredByDamLeg = legs.some(
        (l) =>
          l.segment.hazards.includes('dam') &&
          (l.segment.fromPointId === p.id || l.segment.toPointId === p.id),
      );
      if (!coveredByDamLeg) portageCount += 1;
    }
  }

  return {
    ...base,
    legs,
    totalMiles: Math.round(totalMiles * 10) / 10,
    totalHours: Math.round(totalHours * 100) / 100,
    hazards,
    portageCount,
    difficulty,
    gaugeIds,
    valid: true,
  };
}

/**
 * Collapse the live readings for a plan's gauges into one trip verdict. The
 * worst (most cautionary) verdict across contributing gauges wins, mirroring the
 * corridor headline so the planner always sees the highest-caution signal.
 * `stale` is true if any contributing reading is stale OR missing (we cannot
 * vouch for a fresh answer when a reach has no current data).
 */
export function aggregateVerdict(
  plan: TripPlan,
  readings: Record<string, GaugeReading>,
): { verdict: Verdict; stale: boolean } {
  if (!plan.valid || plan.gaugeIds.length === 0) {
    return { verdict: 'unknown', stale: true };
  }

  let verdict: Verdict = 'unknown';
  let stale = false;

  for (const id of plan.gaugeIds) {
    const reading = readings[id];
    if (!reading) {
      // No data for a reach this trip crosses: cannot promise freshness.
      stale = true;
      continue;
    }
    if (reading.stale) stale = true;
    if (VERDICT_SEVERITY[reading.verdict] > VERDICT_SEVERITY[verdict]) {
      verdict = reading.verdict;
    }
  }

  return { verdict, stale };
}
