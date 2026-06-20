// Live conditions feature — public surface for the app orchestrator and map.
//
// The conditions feature OWNS USGS fetching: useConditions() is mounted ONCE
// near the app root and writes readings into the shared store. The map reads
// those readings (via useSegmentCondition) to tint segments; the AppBar shows
// CorridorConditionsPill; the sheet renders GaugeDetail.

export { fetchReadings, VERDICT_COLORS } from './usgs';

export { useConditions } from './useConditions';
export type { UseConditionsResult } from './useConditions';

export { useSegmentCondition } from './useSegmentCondition';

export { useCorridorVerdict, HEADLINE_GAUGE_ID } from './corridor';
export type { CorridorVerdict } from './corridor';

export { CorridorConditionsPill } from './CorridorConditionsPill';

export { GaugeDetail } from './GaugeDetail';
