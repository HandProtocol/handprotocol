// Theme math shared by the site renderer (blocks.mjs) and the admin page.
// The site gets config.theme verbatim as CSS variables. The admin gets the
// same palette plus derived surfaces (bg-2…4, ink-2/3, accent-2/3/deep/hi,
// on-accent, ok/bad, sheen) for anything the pack did not define, and the
// "feel" tokens (radii, label case, weights) from config.theme.admin, so the
// editor reads as the site it edits — pill-and-glow for one brand, square
// hairlines for another.

import { config } from './config.mjs';

export function hexToRgb(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

// mix(a, b, t): a moved t of the way toward b, in sRGB.
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  if (!A || !B) return a;
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}

export function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

export function isDark(hex) {
  return luminance(hex) < 0.4;
}

function declarations(tokens) {
  const out = [];
  for (const [key, value] of Object.entries(tokens)) {
    if (value == null || typeof value === 'object') continue;
    out.push(`--${key}:${value}`);
    const rgb = hexToRgb(value);
    if (rgb) out.push(`--${key}-rgb:${rgb.join(' ')}`);
  }
  return out.join(';');
}

// :root variables for the SITE: every config.theme key (except `admin`) +
// the two font stacks.
export function siteThemeVars() {
  const { admin, ...palette } = config.theme;
  return declarations({ ...palette, 'font-display': config.fonts.display, 'font-body': config.fonts.body });
}

// The admin's full token set: pack palette, derived gaps, feel defaults.
export function adminTheme() {
  const t = config.theme;
  const { admin: feel = {}, ...palette } = t;
  const bg = t.bg, ink = t.ink, accent = t.accent;
  const dark = isDark(bg);
  const toward = dark ? '#ffffff' : '#000000';
  const derived = {
    'bg-2': mix(bg, ink, 0.05),
    'bg-3': mix(bg, ink, 0.1),
    'bg-4': mix(bg, ink, 0.16),
    'ink-2': mix(ink, bg, 0.22),
    'ink-3': mix(ink, bg, 0.48),
    'accent-2': mix(accent, toward, dark ? 0.25 : 0.15),
    'accent-3': mix(accent, toward, dark ? 0.5 : 0.3),
    'accent-deep': mix(accent, '#000000', 0.3),
    'accent-hi': mix(accent, '#ffffff', 0.12),
    'on-accent': luminance(accent) > 0.45 ? '#111111' : '#ffffff',
    sheen: dark ? '#ffffff' : '#000000',
    ok: dark ? '#57e6a1' : '#1e9e63',
    bad: dark ? '#ff6b8a' : '#c8324f',
    // hairlines: a pack may set line/line-2 in its palette (e.g. gold-35)
    line: 'rgb(var(--accent-2-rgb) / 0.14)',
    'line-2': 'rgb(var(--accent-2-rgb) / 0.3)',
  };
  const FEEL = {
    r: '12px', // inputs, list rows, toasts
    'r-lg': '16px', // cards, sections, the login card
    'r-btn': '999px', // buttons
    'r-pill': '999px', // tabs, badges, the save bar
    'label-transform': 'none',
    'label-spacing': '0.04em',
    'display-weight': '800',
    'display-spacing': '-0.02em',
    'btn-weight': '700',
    'btn-primary-bg': 'linear-gradient(135deg, var(--accent-hi), var(--accent) 45%, var(--accent-deep))',
    'btn-primary-shadow': '0 8px 24px -8px rgb(var(--accent-rgb) / 0.7)',
    'glow-opacity': '1', // the soft accent radials behind the editor
  };
  return {
    ...derived,
    ...palette,
    ...FEEL,
    ...feel,
    'font-display': config.fonts.display,
    'font-body': config.fonts.body,
    'color-scheme': dark ? 'dark' : 'light',
  };
}

export function adminThemeVars() {
  return declarations(adminTheme());
}
