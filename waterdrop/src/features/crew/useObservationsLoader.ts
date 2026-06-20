import { useEffect } from 'react';
import { loadObservationsIntoStore } from './db';

/**
 * Loads persisted observations into the shared store once on mount. The
 * orchestrator mounts this near the app root so crew pins render immediately
 * on cold start, before crew mode is ever unlocked.
 */
export function useObservationsLoader(): void {
  useEffect(() => {
    let cancelled = false;
    void loadObservationsIntoStore().catch((err) => {
      if (!cancelled) {
        // Never throw on load: an empty map is preferable to a dead screen.
        console.error('Failed to load observations', err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
}
