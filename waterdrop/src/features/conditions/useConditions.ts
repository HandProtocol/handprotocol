// ─────────────────────────────────────────────────────────────────────────────
// useConditions — owns USGS fetching for the whole app. Mounted ONCE near the
// app root. Loads on mount, refreshes every 5 minutes, and re-fetches when the
// tab regains focus or the device comes back online. Writes readings into the
// shared store so the map can tint segments and the pill/detail can read them.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/store';
import { fetchReadings } from './usgs';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface UseConditionsResult {
  loading: boolean;
  error: boolean;
  lastUpdated: number | null;
  refresh: () => void;
}

export function useConditions(): UseConditionsResult {
  const setGaugeReadings = useStore((s) => s.setGaugeReadings);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Refs so event handlers / intervals always see live values and never
  // capture stale closures, and so we can guard overlapping fetches + unmount.
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const run = useCallback(async () => {
    if (inFlight.current) return; // guard against overlapping fetches
    inFlight.current = true;
    setLoading(true);

    // Pass current readings forward so a failed refresh keeps last-known numbers.
    const prev = useStore.getState().gaugeReadings;

    try {
      const readings = await fetchReadings(undefined, prev);
      if (!mounted.current) return;

      setGaugeReadings(readings);
      // The data layer never throws; surface a soft error if every gauge is stale.
      const values = Object.values(readings);
      const allStale = values.length > 0 && values.every((r) => r.stale);
      setError(allStale);
      setLastUpdated(Date.now());
    } catch {
      if (mounted.current) setError(true);
    } finally {
      if (mounted.current) setLoading(false);
      inFlight.current = false;
    }
  }, [setGaugeReadings]);

  const refresh = useCallback(() => {
    void run();
  }, [run]);

  useEffect(() => {
    mounted.current = true;
    void run();

    const interval = window.setInterval(() => void run(), REFRESH_INTERVAL_MS);

    const onFocus = () => void run();
    const onOnline = () => void run();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted.current = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [run]);

  return { loading, error, lastUpdated, refresh };
}
