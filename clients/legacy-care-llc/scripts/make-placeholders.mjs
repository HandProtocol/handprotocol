// Generates the placeholder gallery images listed in site.config.mjs
// (media.seed entries with placeholder:true) as abstract compositions in the
// site's palette. Deterministic per slug, so re-running produces identical
// files. Run after changing the palette or the seed dims.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../netlify/functions/lib/config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Small seeded PRNG (mulberry32) for stable, varied compositions.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function blob(r, w, h, colors) {
  const cx = Math.round(w * (0.15 + r() * 0.7));
  const cy = Math.round(h * (0.15 + r() * 0.7));
  const rx = Math.round(Math.min(w, h) * (0.22 + r() * 0.3));
  const ry = Math.round(rx * (0.6 + r() * 0.8));
  const rot = Math.round(r() * 180);
  const color = colors[Math.floor(r() * colors.length)];
  const op = (0.35 + r() * 0.4).toFixed(2);
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="${color}" opacity="${op}" filter="url(#b)"/>`;
}

export function placeholderSvg({ width, height, index, palette, bg, ink, seedKey }) {
  const r = rng(hashSeed(`${seedKey}:${index}`));
  const colors = palette.length ? palette : [ink];
  const blobs = Array.from({ length: 3 + Math.floor(r() * 3) }, () => blob(r, width, height, colors)).join('\n  ');
  const lines = Array.from({ length: 2 + Math.floor(r() * 3) }, () => {
    const y = Math.round(height * r());
    const x1 = Math.round(width * r() * 0.4);
    const x2 = Math.round(width * (0.6 + r() * 0.4));
    return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y + Math.round((r() - 0.5) * height * 0.3)}" stroke="${colors[Math.floor(r() * colors.length)]}" stroke-width="${(1 + r() * 2).toFixed(1)}" opacity="0.5"/>`;
  }).join('\n  ');
  const label = String(index + 1).padStart(2, '0');
  const fs = Math.round(Math.min(width, height) * 0.09);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="b" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${Math.round(Math.min(width, height) * 0.06)}"/></filter>
    <radialGradient id="v" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="${bg}" stop-opacity="0"/><stop offset="1" stop-color="${bg}" stop-opacity="0.85"/></radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  ${blobs}
  ${lines}
  <rect width="100%" height="100%" fill="url(#v)"/>
  <text x="${width - Math.round(fs * 0.6)}" y="${height - Math.round(fs * 0.5)}" text-anchor="end" font-family="system-ui, sans-serif" font-weight="700" font-size="${Math.round(fs * 0.45)}" fill="${ink}" opacity="0.22" letter-spacing="${Math.round(fs * 0.12)}">${label}</text>
</svg>
`;
}

export function writePlaceholders() {
  const outDir = join(root, 'public', 'img', 'placeholder');
  mkdirSync(outDir, { recursive: true });
  const seeds = config.media.seed.filter((m) => m.placeholder);
  let n = 0;
  seeds.forEach((m, index) => {
    if (!m.path.startsWith('/img/placeholder/')) return;
    const svg = placeholderSvg({
      width: m.width,
      height: m.height,
      index,
      palette: config.media.placeholderPalette,
      bg: config.theme.bg,
      ink: config.theme.ink,
      seedKey: config.slug,
    });
    writeFileSync(join(root, 'public', m.path), svg);
    n++;
  });
  return n;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`wrote ${writePlaceholders()} placeholder images to public/img/placeholder/`);
}
