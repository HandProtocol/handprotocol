// ─────────────────────────────────────────────────────────────────────────────
// useWeather — owns Open-Meteo fetching for a single coordinate. Loads on mount
// and whenever the coordinate changes, refreshes every 15 minutes, and re-fetches
// when the tab regains focus or the device comes back online. Guards overlapping
// fetches and unmount; stays idle while coords is null (e.g. a deselected access
// point) so we never spam the API.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWeather, type WeatherNow } from './weather';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export interface UseWeatherResult {
  weather: WeatherNow | null;
  loading: boolean;
  error: boolean;
}

export function useWeather(coords: [number, number] | null): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [loading, setLoading] = useState<boolean>(coords != null);
  const [error, setError] = useState(false);

  // Refs so interval/event handlers always read live values without capturing
  // stale closures, and so we can guard overlapping fetches + unmount.
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const lat = coords?.[0];
  const lng = coords?.[1];

  const run = useCallback(async () => {
    if (lat == null || lng == null) return; // idle while coords is null
    if (inFlight.current) return; // guard against overlapping fetches
    inFlight.current = true;
    setLoading(true);

    try {
      const next = await fetchWeather(lat, lng);
      if (!mounted.current) return;
      setWeather(next);
      // The data layer never throws; surface a soft error when it degraded.
      setError(next.stale);
    } catch {
      if (mounted.current) setError(true);
    } finally {
      if (mounted.current) setLoading(false);
      inFlight.current = false;
    }
  }, [lat, lng]);

  useEffect(() => {
    mounted.current = true;

    if (lat == null || lng == null) {
      // No target: clear any prior reading and stop loading. Nothing scheduled.
      setWeather(null);
      setError(false);
      setLoading(false);
      return () => {
        mounted.current = false;
      };
    }

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
    // Re-run when the coordinate changes (lat/lng captured in `run`).
  }, [lat, lng, run]);

  return { weather, loading, error };
}
