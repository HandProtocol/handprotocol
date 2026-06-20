/**
 * divIcon factory functions for the WaterDrop river map.
 *
 * Every marker is a Leaflet `L.divIcon` built from a small HTML string so it
 * renders crisply at retina and carries no external image (the default Leaflet
 * marker PNG 404s). Glyphs are inline SVG traced from lucide so they match the
 * rest of the UI. Colors come from design tokens via CSS classes / inline vars.
 */
import L from 'leaflet';
import type { AccessType, Verdict, Observation } from '@/types';

// ── Verdict → river/gauge color (mirrors verdict.ts tokens) ──────────────────
const VERDICT_COLOR: Record<Verdict, string> = {
  good: 'var(--good)',
  low: 'var(--low)',
  high: 'var(--high)',
  danger: 'var(--danger)',
  unknown: 'var(--stone-400)',
};

/** Raw hex fallbacks for Polyline stroke (Leaflet SVG can't read CSS vars). */
export const VERDICT_HEX: Record<Verdict, string> = {
  good: '#2f9e7a',
  low: '#c79a2a',
  high: '#c8702f',
  danger: '#c0392b',
  unknown: '#3bb98f',
};

export const RIVER_BASE_HEX = '#3bb98f'; // --spring-500 equivalent
export const RIVER_CASING_HEX = '#1f4a44'; // --cypress-700 equivalent

// ── Lucide glyph paths (24x24 viewBox, stroke-based) ─────────────────────────
// Only the inner <path>/<line>/etc. markup; wrapped by `svg()` below.
const GLYPHS = {
  // park → tree-pine
  park: '<path d="M17 14h.352a.5.5 0 0 0 .424-.764l-2.776-4.46a.5.5 0 0 1 0-.53l2.776-4.46A.5.5 0 0 0 17.352 3H6.648a.5.5 0 0 0-.424.764l2.776 4.46a.5.5 0 0 1 0 .53l-2.776 4.46A.5.5 0 0 0 6.648 14H7a.5.5 0 0 1 .424.764l-2.776 4.46A.5.5 0 0 0 5.072 21h13.856a.5.5 0 0 0 .424-.776l-2.776-4.46A.5.5 0 0 1 17 14"/><path d="M12 22v-3"/>',
  // ramp → anchor
  ramp: '<path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>',
  // dam-portage → triangle-alert
  'dam-portage':
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  // campground → tent
  campground:
    '<path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/>',
  // crossing → milestone / signpost
  crossing:
    '<path d="M12 13v8"/><path d="M12 3v3"/><path d="M4 6a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h13a2 2 0 0 0 1.152-.365l3.424-2.317a1 1 0 0 0 0-1.635l-3.424-2.318A2 2 0 0 0 17 6z"/>',
  // outfitter → store
  outfitter:
    '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
  // gauge → droplet
  droplet:
    '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  // observation glyphs
  flask:
    '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
  fish: '<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3.5c-1.18.74-2.19 2.45-2.46 3.94"/>',
  biohazard:
    '<circle cx="12" cy="11.9" r="2"/><path d="M6.7 3.4c-.9 2.5 0 5.2 2.2 6.7C6.5 9.7 3.7 10.6 2 13"/><path d="M14.3 3.4c.9 2.5 0 5.2-2.2 6.7 2.4-.4 5.2.5 6.9 2.9"/><path d="M9.7 14.4c-2.2 1.5-3.1 4.2-2.2 6.7 2.4-2.4 5.2-1.5 7.3.3"/><path d="m4 20.4 2.4-2.4"/><path d="m17.6 20.4-2.4-2.4"/><path d="M22 13c-1.7-2.4-4.5-3.3-7-2.9 2.2-1.5 3.1-4.2 2.2-6.7"/>',
  note: '<path d="M13 21h-7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7"/><path d="M9 7h6"/><path d="M9 11h4"/><path d="M16 16l5 5"/>',
} as const;

type GlyphKey = keyof typeof GLYPHS;

function svg(glyph: GlyphKey, opts?: { size?: number; sw?: number }): string {
  const size = opts?.size ?? 18;
  const sw = opts?.sw ?? 2;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${GLYPHS[glyph]}</svg>`;
}

const ACCESS_GLYPH: Record<AccessType, GlyphKey> = {
  park: 'park',
  ramp: 'ramp',
  'dam-portage': 'dam-portage',
  campground: 'campground',
  crossing: 'crossing',
  outfitter: 'outfitter',
};

// ── Access point teardrop pin ────────────────────────────────────────────────
export interface AccessIconOpts {
  type: AccessType;
  selected?: boolean;
  isPublic?: boolean;
}

export function accessIcon({ type, selected = false, isPublic = true }: AccessIconOpts): L.DivIcon {
  const isDam = type === 'dam-portage';
  const cls = [
    'wd-map-pin',
    isDam ? 'wd-map-pin--dam' : '',
    selected ? 'wd-map-pin--selected' : '',
    !isPublic ? 'wd-map-pin--private' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const lock = !isPublic
    ? `<span class="wd-map-pin__lock" aria-hidden="true">${svg('lock', { size: 9, sw: 2.6 })}</span>`
    : '';

  const html = `
    <div class="${cls}">
      <span class="wd-map-pin__body">
        <span class="wd-map-pin__glyph">${svg(ACCESS_GLYPH[type], { size: 19, sw: 2 })}</span>
      </span>
      ${lock}
    </div>`;

  // 44px tall hit area incl. the teardrop tail; anchor at the tip.
  return L.divIcon({
    html,
    className: 'wd-map-divicon',
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -46],
  });
}

// ── Gauge data badge ─────────────────────────────────────────────────────────
export function gaugeIcon(verdict: Verdict, selected = false): L.DivIcon {
  const cls = ['wd-map-gauge', selected ? 'wd-map-gauge--selected' : '']
    .filter(Boolean)
    .join(' ');
  const html = `
    <div class="${cls}" style="--wd-gauge-color:${VERDICT_COLOR[verdict]}">
      <span class="wd-map-gauge__glyph">${svg('droplet', { size: 15, sw: 2.2 })}</span>
    </div>`;
  return L.divIcon({
    html,
    className: 'wd-map-divicon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

// ── Observation dot ──────────────────────────────────────────────────────────
type ObsKind = 'contamination' | 'water-test' | 'species' | 'note';

function obsKind(o: Observation): ObsKind {
  if (o.contamination) return 'contamination';
  if (o.waterTest && Object.keys(o.waterTest).length > 0) return 'water-test';
  if (o.species && o.species.length > 0) return 'species';
  return 'note';
}

function obsColor(o: Observation): string {
  const kind = obsKind(o);
  if (kind === 'contamination') {
    const sev = o.contamination!.severity;
    return `var(--sev-${sev})`;
  }
  if (kind === 'water-test') return 'var(--info)';
  if (kind === 'species') return 'var(--spring-600)';
  return 'var(--stone-500)';
}

const OBS_GLYPH: Record<ObsKind, GlyphKey> = {
  contamination: 'biohazard',
  'water-test': 'flask',
  species: 'fish',
  note: 'note',
};

export function observationIcon(o: Observation, selected = false): L.DivIcon {
  const kind = obsKind(o);
  const cls = ['wd-map-obs', selected ? 'wd-map-obs--selected' : '']
    .filter(Boolean)
    .join(' ');
  const html = `
    <div class="${cls}" style="--wd-obs-color:${obsColor(o)}">
      <span class="wd-map-obs__glyph">${svg(OBS_GLYPH[kind], { size: 13, sw: 2.2 })}</span>
    </div>`;
  return L.divIcon({
    html,
    className: 'wd-map-divicon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -15],
  });
}

// ── "You are here" transient marker ──────────────────────────────────────────
export function locationIcon(): L.DivIcon {
  const html = `
    <div class="wd-map-here" aria-hidden="true">
      <span class="wd-map-here__pulse"></span>
      <span class="wd-map-here__dot"></span>
    </div>`;
  return L.divIcon({
    html,
    className: 'wd-map-divicon',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}
