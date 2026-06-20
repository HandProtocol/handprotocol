import type { Verdict, Gauge } from '../types';

/**
 * Single source of truth for the "is it runnable?" verdict, derived from
 * discharge (CFS) against a gauge's paddling thresholds. Used by both the
 * conditions feature (to compute GaugeReading.verdict) and the map (to tint
 * segments) so the logic never diverges.
 */
export function verdictForFlow(
  cfs: number | undefined,
  g: Pick<Gauge, 'flowLowCfs' | 'flowHighCfs'>,
): Verdict {
  if (cfs == null || Number.isNaN(cfs)) return 'unknown';
  const low = g.flowLowCfs ?? 80;
  const high = g.flowHighCfs ?? 400;
  const danger = high * 2.5;
  if (cfs >= danger) return 'danger';
  if (cfs > high) return 'high';
  if (cfs < low) return 'low';
  return 'good';
}

export type VerdictTone = 'good' | 'low' | 'high' | 'danger' | 'neutral';

export interface VerdictMeta {
  label: string;
  tone: VerdictTone;
  blurb: string;
}

export const VERDICT_META: Record<Verdict, VerdictMeta> = {
  good: { label: 'Runnable', tone: 'good', blurb: 'Flow is in the comfortable range.' },
  low: { label: 'Too low', tone: 'low', blurb: 'Expect scraping and dragging over shallows.' },
  high: { label: 'High water', tone: 'high', blurb: 'Fast and pushy. Experienced paddlers only.' },
  danger: { label: 'Unsafe', tone: 'danger', blurb: 'Flood flows. Stay off the river.' },
  unknown: { label: 'No data', tone: 'neutral', blurb: 'Live gauge data is unavailable right now.' },
};

/** Rank used to summarize a whole corridor: worst (most cautionary) wins. */
export const VERDICT_SEVERITY: Record<Verdict, number> = {
  unknown: 0,
  good: 1,
  low: 2,
  high: 3,
  danger: 4,
};
