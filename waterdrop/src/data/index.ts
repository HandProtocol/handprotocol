// Combined Central Texas paddling dataset. Each source file owns one region;
// here we tag every record with its region (defaulting untagged San Marcos data)
// and expose the unified arrays the rest of the app reads from `@/data`.
import type { AccessPoint, Segment, Gauge } from '../types';
import * as sanMarcos from './riverData';
import * as austin from './ctx-austin';
import * as hillCountry from './ctx-hill-country';
import * as guadalupe from './ctx-guadalupe';

export { regions, regionById, DEFAULT_REGION } from './regions';
export type { Region } from './regions';

const tagP = (items: AccessPoint[], region: string): AccessPoint[] =>
  items.map((p) => ({ ...p, region: p.region ?? region }));
const tagS = (items: Segment[], region: string): Segment[] =>
  items.map((s) => ({ ...s, region: s.region ?? region }));
const tagG = (items: Gauge[], region: string): Gauge[] =>
  items.map((g) => ({ ...g, region: g.region ?? region }));

export const accessPoints: AccessPoint[] = [
  ...tagP(sanMarcos.accessPoints, 'san-marcos'),
  ...tagP(austin.accessPoints, 'austin'),
  ...tagP(hillCountry.accessPoints, 'hill-country'),
  ...tagP(guadalupe.accessPoints, 'guadalupe'),
];

// Only the San Marcos corridor ships contiguous runs today; other regions are
// drop-in points (and lakes) for now.
export const segments: Segment[] = [...tagS(sanMarcos.segments, 'san-marcos')];

export const gauges: Gauge[] = [
  ...tagG(sanMarcos.gauges, 'san-marcos'),
  ...tagG(austin.gauges, 'austin'),
  ...tagG(hillCountry.gauges, 'hill-country'),
  ...tagG(guadalupe.gauges, 'guadalupe'),
];

export const pointsInRegion = (region: string): AccessPoint[] =>
  accessPoints.filter((p) => p.region === region);

export const gaugesInRegion = (region: string): Gauge[] =>
  gauges.filter((g) => g.region === region);

// Distinct waterways within a region, in first-seen order.
export const waterwaysInRegion = (region: string): string[] => {
  const seen: string[] = [];
  for (const p of accessPoints) {
    if (p.region === region && p.waterway && !seen.includes(p.waterway)) {
      seen.push(p.waterway);
    }
  }
  return seen;
};
