// Generates the 15 placeholder gallery images (public/img/placeholder/ph-NN.svg)
// as abstract black-and-purple compositions. Deterministic, so re-running
// produces identical files. Dimensions mirror the seed rows in migration 043.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'img', 'placeholder');
mkdirSync(outDir, { recursive: true });

const DIMS = [
  [1200, 1500], [1600, 1000], [1200, 1200], [1200, 1600], [1600, 1200],
  [1200, 1500], [1600, 900], [1200, 1200], [1200, 1600], [1600, 1200],
  [1200, 1500], [1200, 1200], [1600, 1000], [1200, 1600], [1600, 1200],
];

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

const PURPLES = ['#8b3dff', '#5a1fd6', '#b48cff', '#c04dff', '#3d1a8f', '#7a2cf0', '#e0b8ff'];

function blob(r, w, h, i) {
  const cx = Math.round(w * (0.15 + r() * 0.7));
  const cy = Math.round(h * (0.15 + r() * 0.7));
  const rx = Math.round(Math.min(w, h) * (0.22 + r() * 0.3));
  const ry = Math.round(rx * (0.6 + r() * 0.8));
  const rot = Math.round(r() * 180);
  const color = PURPLES[Math.floor(r() * PURPLES.length)];
  const op = (0.35 + r() * 0.4).toFixed(2);
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="${color}" opacity="${op}" filter="url(#blur${i % 2})"/>`;
}

function svg(n, w, h) {
  const r = rng(1000 + n * 7919);
  const blobs = Array.from({ length: 3 + Math.floor(r() * 2) }, (_, i) => blob(r, w, h, i)).join('\n    ');
  const streakX = Math.round(w * r());
  const label = `PLACEHOLDER ${String(n).padStart(2, '0')}`;
  const s = Math.min(w, h);
  const fs = Math.round(s * 0.024);
  const pad = Math.round(s * 0.05);
  const ringR = Math.round(s * 0.11);
  const ringX = w - pad - ringR;
  const ringY = h - pad - ringR;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b0812"/>
      <stop offset="1" stop-color="#150f26"/>
    </linearGradient>
    <linearGradient id="streak" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b48cff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#b48cff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#b48cff" stop-opacity="0"/>
    </linearGradient>
    <filter id="blur0" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(s * 0.09)}"/></filter>
    <filter id="blur1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(s * 0.05)}"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.12"/></feComponentTransfer></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#base)"/>
  <g>
    ${blobs}
  </g>
  <rect x="${streakX}" y="0" width="${Math.round(w * 0.08)}" height="${h}" fill="url(#streak)" transform="skewX(-18)"/>
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.5"/>
  <g fill="none" stroke="#e6d9ff" stroke-opacity="0.55" stroke-width="${Math.max(2, Math.round(s * 0.004))}">
    <circle cx="${ringX}" cy="${ringY}" r="${ringR}"/>
    <path d="M${ringX} ${ringY - ringR * 0.72} L${ringX + ringR * 0.72} ${ringY} L${ringX} ${ringY + ringR * 0.72} L${ringX - ringR * 0.72} ${ringY} Z"/>
    <circle cx="${ringX}" cy="${ringY}" r="${Math.round(ringR * 0.22)}" fill="#e6d9ff" stroke="none"/>
  </g>
  <text x="${pad}" y="${h - pad}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${fs}" letter-spacing="${Math.round(fs * 0.3)}" fill="#e6d9ff" fill-opacity="0.6">${label}</text>
</svg>
`;
}

DIMS.forEach(([w, h], i) => {
  const n = i + 1;
  const file = join(outDir, `ph-${String(n).padStart(2, '0')}.svg`);
  writeFileSync(file, svg(n, w, h));
});
console.log(`wrote ${DIMS.length} placeholders to ${outDir}`);
