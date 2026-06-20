// Resolve the live reading that best represents a given segment's reach.
// gaugeForSegment -> the store reading for that gauge's usgsId (or undefined).

import { useStore } from '@/store';
import { gaugeForSegment } from '@/lib/segments';
import type { GaugeReading } from '@/types';

export function useSegmentCondition(segmentId: string): GaugeReading | undefined {
  const gauge = gaugeForSegment(segmentId);
  return useStore((s) => (gauge ? s.gaugeReadings[gauge.usgsId] : undefined));
}
