// ─────────────────────────────────────────────────────────────────────────────
// useCorridorVerdict — collapse the whole corridor to one headline verdict for
// the app-bar pill. The worst (most cautionary) verdict across gauges wins, so
// the planner sees the highest-caution signal at a glance. The representative
// gauge prefers Luling (08172000) for the headline flow number.
// ─────────────────────────────────────────────────────────────────────────────

import { useStore } from '@/store';
import { gauges } from '@/data';
import { gaugeById } from '@/lib/segments';
import { VERDICT_SEVERITY } from '@/lib/verdict';
import type { Gauge, GaugeReading, Verdict } from '@/types';

/** Gauge whose flow we headline in the pill (Luling reads the lower corridor). */
export const HEADLINE_GAUGE_ID = '08172000';

export interface CorridorVerdict {
  verdict: Verdict;
  gauge?: Gauge;
  reading?: GaugeReading;
  loading: boolean;
  anyStale: boolean;
}

export function useCorridorVerdict(): CorridorVerdict {
  const gaugeReadings = useStore((s) => s.gaugeReadings);
  const activeRegion = useStore((s) => s.activeRegion);

  // Only the active region's gauges drive the headline (fall back to all).
  const regionGauges = gauges.filter((g) => g.region === activeRegion);
  const pool = regionGauges.length > 0 ? regionGauges : gauges;

  const readings = pool
    .map((g) => gaugeReadings[g.usgsId])
    .filter((r): r is GaugeReading => r != null);

  // Nothing fetched yet for this region.
  if (readings.length === 0) {
    return { verdict: 'unknown', loading: true, anyStale: false };
  }

  // Worst verdict wins (highest severity); ignore 'unknown' unless it's all we have.
  const ranked = [...readings].sort(
    (a, b) => VERDICT_SEVERITY[b.verdict] - VERDICT_SEVERITY[a.verdict],
  );
  const worst = ranked[0];
  const verdict: Verdict = worst.verdict;

  // Headline gauge: Luling for the San Marcos corridor, else the worst in-region.
  const headlineReading =
    (activeRegion === 'san-marcos' && gaugeReadings[HEADLINE_GAUGE_ID]) || worst;
  const gauge = gaugeById(headlineReading.usgsId) ?? gaugeById(worst.usgsId);

  const anyStale = readings.some((r) => r.stale);

  return {
    verdict,
    gauge,
    reading: headlineReading,
    loading: false,
    anyStale,
  };
}
