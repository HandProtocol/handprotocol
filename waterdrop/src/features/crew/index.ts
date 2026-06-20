// Crew mode public surface. The orchestrator wires these into the app shell:
// mount useObservationsLoader near the root, render CrewControls + ComposePanel
// over the map, open CrewGate to unlock, and render ObservationDetail in the
// sheet when an observation is selected.

export { CrewGate } from './CrewGate';
export type { CrewGateProps } from './CrewGate';

export { ComposePanel } from './ComposePanel';

export { ObservationDetail } from './ObservationDetail';
export type { ObservationDetailProps } from './ObservationDetail';

export { CrewControls } from './CrewControls';

export { useObservationsLoader } from './useObservationsLoader';

export {
  observationRepo,
  loadObservationsIntoStore,
  saveObservation,
  deleteObservation,
  db,
} from './db';

export {
  isUnlocked,
  joinCrew,
  lock,
  crewName,
  crewTeam,
} from './passcode';

export { exportCsv, exportGeoJson } from './exportObservations';
