// WaterDrop trip planner feature — multi-leg "plan a float" panel + pure logic.

export { TripPlanner } from './TripPlanner';
export type { TripPlannerProps } from './TripPlanner';

export { planTrip, aggregateVerdict, mostNotableHazard, HAZARD_SEVERITY } from './planTrip';
export type { TripLeg, TripPlan } from './planTrip';
