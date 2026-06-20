import { gauges, segments, accessPoints } from '../data';
import type { Gauge, Segment, AccessPoint } from '../types';

/** The gauge whose reach best represents a given segment. */
export function gaugeForSegment(segmentId: string): Gauge | undefined {
  return gauges.find((g) => g.nearestSegmentIds.includes(segmentId));
}

export const segmentById = (id: string): Segment | undefined =>
  segments.find((s) => s.id === id);

export const pointById = (id: string): AccessPoint | undefined =>
  accessPoints.find((p) => p.id === id);

export const gaugeById = (usgsId: string): Gauge | undefined =>
  gauges.find((g) => g.usgsId === usgsId);

/** Segments touching an access point, ordered downstream. */
export function segmentsFromPoint(pointId: string): Segment[] {
  return segments.filter((s) => s.fromPointId === pointId || s.toPointId === pointId);
}

/** Midpoint of a segment polyline, for label/marker placement. */
export function segmentMidpoint(seg: Segment): [number, number] {
  const g = seg.geometry;
  if (g.length === 0) return [29.8, -97.8];
  return g[Math.floor(g.length / 2)];
}
