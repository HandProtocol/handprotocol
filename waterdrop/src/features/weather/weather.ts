// ─────────────────────────────────────────────────────────────────────────────
// Weather data layer for WaterDrop. Pairs with river flow so a paddler gets a
// real go/no-go: flow says "runnable", weather says whether the sky agrees.
//
// Source: Open-Meteo current weather (free, no key, CORS-enabled). Fails soft:
// on timeout, network error, HTTP error, or parse trouble we hand back a stale
// reading rather than throwing, so the card degrades to "unavailable" and the
// app never goes blank.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudLightning,
  CloudHail,
  Snowflake,
  CloudSnow,
  type LucideIcon,
} from 'lucide-react';

const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const FETCH_TIMEOUT_MS = 8_000;

export interface WeatherNow {
  tempF?: number;
  feelsF?: number;
  humidity?: number;
  precipIn?: number;
  windMph?: number;
  gustMph?: number;
  code?: number;
  isDay?: boolean;
  /** ISO timestamp of the observation, from `current.time`. */
  observedAt?: string;
  /** Epoch ms when this reading was fetched (always set). */
  fetchedAt: number;
  /** True when the reading is a graceful fallback, not a fresh observation. */
  stale: boolean;
}

// ── Open-Meteo response shape (only the parts we read) ──────────────────────

interface OpenMeteoCurrent {
  time?: string;
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  precipitation?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  wind_gusts_10m?: number;
  is_day?: number;
}
interface OpenMeteoResponse {
  current?: OpenMeteoCurrent;
}

const buildUrl = (lat: number, lng: number): string => {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_gusts_10m',
      'is_day',
    ].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
  });
  return `${API_BASE}?${params.toString()}`;
};

/** Finite numbers only; Open-Meteo omits or nulls fields it cannot report. */
const num = (raw: unknown): number | undefined =>
  typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;

/** A graceful reading for a forecast we could not refresh. */
const staleNow = (): WeatherNow => ({ fetchedAt: Date.now(), stale: true });

/**
 * Fetch and parse the current weather for a coordinate. Always resolves: on
 * timeout, network error, HTTP error, or parse failure it returns a stale
 * reading so the UI degrades rather than throwing.
 */
export async function fetchWeather(lat: number, lng: number): Promise<WeatherNow> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let data: OpenMeteoResponse;
  try {
    const res = await fetch(buildUrl(lat, lng), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return staleNow();
    data = (await res.json()) as OpenMeteoResponse;
  } catch {
    return staleNow();
  } finally {
    clearTimeout(timer);
  }

  const c = data.current;
  if (!c || typeof c !== 'object') return staleNow();

  const tempF = num(c.temperature_2m);
  // Nothing usable came back: degrade instead of showing an empty shell.
  if (tempF == null && num(c.weather_code) == null) return staleNow();

  return {
    tempF,
    feelsF: num(c.apparent_temperature),
    humidity: num(c.relative_humidity_2m),
    precipIn: num(c.precipitation),
    windMph: num(c.wind_speed_10m),
    gustMph: num(c.wind_gusts_10m),
    code: num(c.weather_code),
    isDay: c.is_day == null ? undefined : c.is_day === 1,
    observedAt: typeof c.time === 'string' ? c.time : undefined,
    fetchedAt: Date.now(),
    stale: false,
  };
}

// ── WMO weather-code mapping ────────────────────────────────────────────────
//
// We map by exact code (small enough to enumerate) and fall back to a banded
// lookup for any unlisted code, so a stray value still resolves to a sensible
// label/icon instead of "Unknown". Icons are day/night aware where it reads.

interface WmoMeta {
  label: string;
  /** Daytime icon (also used when is_day is unknown). */
  icon: LucideIcon;
  /** Night variant where one exists; falls back to `icon`. */
  night?: LucideIcon;
}

const WMO: Record<number, WmoMeta> = {
  0: { label: 'Clear', icon: Sun, night: Moon },
  1: { label: 'Mainly clear', icon: CloudSun, night: CloudMoon },
  2: { label: 'Partly cloudy', icon: CloudSun, night: CloudMoon },
  3: { label: 'Overcast', icon: Cloudy },
  45: { label: 'Fog', icon: CloudFog },
  48: { label: 'Freezing fog', icon: CloudFog },
  51: { label: 'Light drizzle', icon: CloudDrizzle },
  53: { label: 'Drizzle', icon: CloudDrizzle },
  55: { label: 'Heavy drizzle', icon: CloudDrizzle },
  56: { label: 'Freezing drizzle', icon: CloudDrizzle },
  57: { label: 'Freezing drizzle', icon: CloudDrizzle },
  61: { label: 'Light rain', icon: CloudRain },
  63: { label: 'Rain', icon: CloudRain },
  65: { label: 'Heavy rain', icon: CloudRainWind },
  66: { label: 'Freezing rain', icon: CloudRain },
  67: { label: 'Freezing rain', icon: CloudRainWind },
  71: { label: 'Light snow', icon: CloudSnow },
  73: { label: 'Snow', icon: CloudSnow },
  75: { label: 'Heavy snow', icon: Snowflake },
  77: { label: 'Snow grains', icon: CloudSnow },
  80: { label: 'Light showers', icon: CloudRain },
  81: { label: 'Showers', icon: CloudRain },
  82: { label: 'Heavy showers', icon: CloudRainWind },
  85: { label: 'Snow showers', icon: CloudSnow },
  86: { label: 'Heavy snow showers', icon: Snowflake },
  95: { label: 'Thunderstorm', icon: CloudLightning },
  96: { label: 'Thunderstorm, hail', icon: CloudHail },
  99: { label: 'Thunderstorm, heavy hail', icon: CloudHail },
};

/** Banded fallback for any WMO code not enumerated above. */
function wmoBand(code: number): WmoMeta {
  if (code <= 0) return WMO[0];
  if (code <= 2) return WMO[2];
  if (code <= 3) return WMO[3];
  if (code <= 48) return WMO[45];
  if (code <= 57) return WMO[53];
  if (code <= 67) return WMO[63];
  if (code <= 77) return WMO[73];
  if (code <= 82) return WMO[81];
  if (code <= 86) return WMO[85];
  return WMO[95];
}

const metaFor = (code: number): WmoMeta =>
  WMO[code] ?? wmoBand(code);

/** Plain-language label for a WMO weather code (e.g. "Partly cloudy"). */
export function wmoLabel(code: number): string {
  return metaFor(code).label;
}

/**
 * The lucide icon component for a WMO weather code, day/night aware. Returns a
 * component reference (render as `<Icon />`), e.g. Sun for clear day, Moon for
 * clear night. Defaults to the day icon when `isDay` is omitted.
 */
export function wmoIcon(code: number, isDay = true): LucideIcon {
  const meta = metaFor(code);
  return !isDay && meta.night ? meta.night : meta.icon;
}
