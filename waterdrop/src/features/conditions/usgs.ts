// ─────────────────────────────────────────────────────────────────────────────
// USGS data layer for WaterDrop live conditions.
//
// Pulls real-time Instantaneous Values for the corridor's three live gauges and
// turns them into GaugeReadings (latest cfs/ft, a downsampled 24h trend, and a
// plain-language verdict). CORS-enabled, no API key. Fails soft: on any network
// or parse trouble we hand back `unknown`/`stale` readings rather than throwing,
// so the map and pill never go blank.
// ─────────────────────────────────────────────────────────────────────────────

import type { GaugeReading, TrendPoint } from '@/types';
import { gauges } from '@/data';
import { gaugeById } from '@/lib/segments';
import { verdictForFlow } from '@/lib/verdict';

const IV_BASE = 'https://waterservices.usgs.gov/nwis/iv/';
const PARAM_DISCHARGE = '00060'; // cubic feet per second
const PARAM_GAGE_HEIGHT = '00065'; // feet
const FETCH_TIMEOUT_MS = 8_000;
const MAX_SERIES_POINTS = 48; // ~hourly over ~24h
const USGS_NO_DATA = -999_999; // USGS sentinel for "no value at this timestamp"

/** Verdict hex colors for recharts series, map markers, and segment tints.
 *  Recharts cannot read CSS custom properties, so these mirror the semantic
 *  tokens as concrete hex values. */
export const VERDICT_COLORS: Record<string, string> = {
  good: '#2f9e7a',
  low: '#c79a2a',
  high: '#c8702f',
  danger: '#c0392b',
  unknown: '#7c8a7e',
};

const ALL_GAUGE_IDS = gauges.map((g) => g.usgsId);

// ── USGS response shapes (only the parts we read) ───────────────────────────

interface UsgsValueEntry {
  value: string;
  dateTime: string;
}
interface UsgsTimeSeries {
  sourceInfo?: { siteCode?: { value?: string }[] };
  variable?: { variableCode?: { value?: string }[] };
  values?: { value?: UsgsValueEntry[] }[];
}
interface UsgsResponse {
  value?: { timeSeries?: UsgsTimeSeries[] };
}

const buildUrl = (ids: string[]): string => {
  const params = new URLSearchParams({
    format: 'json',
    sites: ids.join(','),
    parameterCd: `${PARAM_DISCHARGE},${PARAM_GAGE_HEIGHT}`,
    siteStatus: 'all',
    period: 'P1D',
  });
  return `${IV_BASE}?${params.toString()}`;
};

const num = (raw: string | undefined): number | undefined => {
  if (raw == null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n === USGS_NO_DATA) return undefined;
  return n;
};

/** Latest non-empty entry from a USGS value array (entries are time-ordered). */
function latestEntry(entries: UsgsValueEntry[] | undefined): UsgsValueEntry | undefined {
  if (!entries) return undefined;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (num(entries[i].value) != null) return entries[i];
  }
  return undefined;
}

/** Merge discharge + gage-height series by timestamp, then evenly downsample to
 *  at most MAX_SERIES_POINTS so the chart stays light and honest. */
function buildSeries(
  cfsEntries: UsgsValueEntry[] | undefined,
  ftEntries: UsgsValueEntry[] | undefined,
): TrendPoint[] {
  const byTime = new Map<string, TrendPoint>();

  const ingest = (entries: UsgsValueEntry[] | undefined, key: 'cfs' | 'ft') => {
    if (!entries) return;
    for (const e of entries) {
      const v = num(e.value);
      if (v == null || !e.dateTime) continue;
      const existing = byTime.get(e.dateTime) ?? { t: e.dateTime };
      existing[key] = v;
      byTime.set(e.dateTime, existing);
    }
  };
  ingest(cfsEntries, 'cfs');
  ingest(ftEntries, 'ft');

  const merged = Array.from(byTime.values()).sort(
    (a, b) => new Date(a.t).getTime() - new Date(b.t).getTime(),
  );

  if (merged.length <= MAX_SERIES_POINTS) return merged;

  // Even-stride downsample, always keeping the final (latest) point.
  const stride = Math.ceil(merged.length / MAX_SERIES_POINTS);
  const out: TrendPoint[] = [];
  for (let i = 0; i < merged.length; i += stride) out.push(merged[i]);
  const last = merged[merged.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/** Index a USGS response by site id, then by parameter code. */
function indexResponse(
  data: UsgsResponse,
): Map<string, Map<string, UsgsValueEntry[]>> {
  const bySite = new Map<string, Map<string, UsgsValueEntry[]>>();
  const series = data.value?.timeSeries ?? [];
  for (const ts of series) {
    const site = ts.sourceInfo?.siteCode?.[0]?.value;
    const param = ts.variable?.variableCode?.[0]?.value;
    const entries = ts.values?.[0]?.value;
    if (!site || !param || !entries) continue;
    const byParam = bySite.get(site) ?? new Map<string, UsgsValueEntry[]>();
    byParam.set(param, entries);
    bySite.set(site, byParam);
  }
  return bySite;
}

/** A graceful reading for a gauge we could not refresh. Preserves last-known
 *  numbers/series from `prev` when available so the UI shows real history. The
 *  verdict is carried forward from the last-known flow (not discarded as
 *  "unknown") so an outage still answers "is it runnable?" PRODUCT.md L50. */
function staleReading(usgsId: string, prev?: GaugeReading): GaugeReading {
  const gauge = gaugeById(usgsId);
  const verdict =
    prev?.dischargeCfs != null && gauge
      ? verdictForFlow(prev.dischargeCfs, gauge)
      : prev?.verdict ?? 'unknown';
  return {
    usgsId,
    gageHeightFt: prev?.gageHeightFt,
    dischargeCfs: prev?.dischargeCfs,
    observedAt: prev?.observedAt,
    series: prev?.series,
    verdict,
    stale: true,
    fetchedAt: Date.now(),
  };
}

/**
 * Fetch and parse live readings for the given gauges (all corridor gauges by
 * default). Always resolves: on timeout, network error, HTTP error, or parse
 * failure it returns stale `unknown` readings (carrying forward `prev` numbers
 * when provided) for every requested gauge.
 */
export async function fetchReadings(
  gaugeIds: string[] = ALL_GAUGE_IDS,
  prev?: Record<string, GaugeReading>,
): Promise<Record<string, GaugeReading>> {
  const ids = gaugeIds.filter((id) => gaugeById(id) != null);
  const requested = ids.length > 0 ? ids : ALL_GAUGE_IDS;

  const allStale = (): Record<string, GaugeReading> => {
    const out: Record<string, GaugeReading> = {};
    for (const id of requested) out[id] = staleReading(id, prev?.[id]);
    return out;
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let data: UsgsResponse;
  try {
    const res = await fetch(buildUrl(requested), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return allStale();
    data = (await res.json()) as UsgsResponse;
  } catch {
    return allStale();
  } finally {
    clearTimeout(timer);
  }

  let bySite: Map<string, Map<string, UsgsValueEntry[]>>;
  try {
    bySite = indexResponse(data);
  } catch {
    return allStale();
  }

  const out: Record<string, GaugeReading> = {};
  for (const id of requested) {
    const gauge = gaugeById(id);
    if (!gauge) continue;

    const byParam = bySite.get(id);
    const cfsEntries = byParam?.get(PARAM_DISCHARGE);
    const ftEntries = byParam?.get(PARAM_GAGE_HEIGHT);

    const latestCfs = latestEntry(cfsEntries);
    const latestFt = latestEntry(ftEntries);
    const dischargeCfs = num(latestCfs?.value);
    const gageHeightFt = num(latestFt?.value);

    // No usable discharge for this site: keep last-known if we have it.
    if (dischargeCfs == null && gageHeightFt == null) {
      out[id] = staleReading(id, prev?.[id]);
      continue;
    }

    const series = buildSeries(cfsEntries, ftEntries);
    const observedAt = latestCfs?.dateTime ?? latestFt?.dateTime;

    out[id] = {
      usgsId: id,
      dischargeCfs,
      gageHeightFt,
      observedAt,
      series: series.length > 0 ? series : undefined,
      verdict: verdictForFlow(dischargeCfs, gauge),
      stale: false,
      fetchedAt: Date.now(),
    };
  }

  // Any requested gauge missing from the response degrades gracefully.
  for (const id of requested) {
    if (!out[id]) out[id] = staleReading(id, prev?.[id]);
  }

  return out;
}
