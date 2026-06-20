import type { Observation } from '@/types';

/** Quote a CSV field per RFC 4180, and neutralize spreadsheet formula injection:
 *  free-text fields that start with = + - @ (or tab/CR) are prefixed with a
 *  leading apostrophe so Excel/Sheets treat them as text, not formulas. */
function csvField(value: unknown): string {
  if (value == null) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// UTF-8 BOM so Excel on Windows renders accented species names and µS/cm.
const BOM = '﻿';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

const CSV_COLUMNS = [
  'id',
  'ts',
  'author',
  'refType',
  'refId',
  'lat',
  'lng',
  'notes',
  'species',
  'tempC',
  'pH',
  'turbidityNTU',
  'dissolvedO2',
  'conductivity',
  'contaminationSeverity',
  'contaminationType',
  'contaminationDescription',
  'photoCount',
] as const;

/** Build and download a flat CSV of all observations (blobs omitted). */
export function exportCsv(obs: Observation[]): void {
  const header = CSV_COLUMNS.join(',');
  const rows = obs.map((o) => {
    const wt = o.waterTest ?? {};
    const species = o.species
      .map((s) => (s.count != null ? `${s.name} (${s.count})` : s.name))
      .join('; ');
    const cells = [
      o.id,
      new Date(o.ts).toISOString(),
      o.author,
      o.refType,
      o.refId ?? '',
      o.coords[0],
      o.coords[1],
      o.notes,
      species,
      wt.tempC ?? '',
      wt.pH ?? '',
      wt.turbidityNTU ?? '',
      wt.dissolvedO2 ?? '',
      wt.conductivity ?? '',
      o.contamination?.severity ?? '',
      o.contamination?.type ?? '',
      o.contamination?.description ?? '',
      o.photos.length,
    ];
    return cells.map(csvField).join(',');
  });
  const csv = [header, ...rows].join('\r\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `waterdrop-observations-${stamp()}.csv`);
}

/** Build and download a GeoJSON FeatureCollection (blobs omitted). */
export function exportGeoJson(obs: Observation[]): void {
  const features = obs.map((o) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      // GeoJSON is [lng, lat]; our coords are [lat, lng].
      coordinates: [o.coords[1], o.coords[0]],
    },
    properties: {
      id: o.id,
      ts: new Date(o.ts).toISOString(),
      author: o.author,
      refType: o.refType,
      refId: o.refId ?? null,
      notes: o.notes,
      species: o.species,
      waterTest: o.waterTest ?? null,
      contamination: o.contamination ?? null,
      photoCount: o.photos.length,
    },
  }));
  const fc = { type: 'FeatureCollection' as const, features };
  const blob = new Blob([JSON.stringify(fc, null, 2)], {
    type: 'application/geo+json',
  });
  triggerDownload(blob, `waterdrop-observations-${stamp()}.geojson`);
}
