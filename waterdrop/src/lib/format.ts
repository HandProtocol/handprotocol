// Shared display formatters. Numbers render with tabular figures (set globally).

export const fmtMiles = (m: number): string =>
  `${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)} mi`;

export function fmtHours(h: number): string {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (hh === 0) return `${mm} min`;
  if (mm === 0) return `${hh} hr`;
  return `${hh} hr ${mm} min`;
}

export const fmtCfs = (c?: number): string =>
  c == null ? '—' : `${Math.round(c).toLocaleString()} cfs`;

export const fmtFeet = (f?: number): string => (f == null ? '—' : `${f.toFixed(2)} ft`);

export function fmtAgo(epochMs: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - epochMs) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.round(hr / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function fmtClock(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
