/* The shared sky: its size, the thirteen named stars, and the colours a guest
   star may take. Imported by the server (placement, prompt enums) and by the
   React island (kc-collective/src/nightbloom/app.jsx, bundled by esbuild), so the two
   can never disagree about where "Home" is. No imports, no Node APIs. */

export const W = 1200;
export const H = 640;

export const NAMED = [
  ['Rhythm', 120, 180], ['Intuition', 260, 90], ['Becoming', 410, 160], ['Courage', 540, 70], ['Birthright', 690, 150],
  ['Light', 860, 80], ['Shadow', 1010, 170], ['Joy', 1120, 300], ['Release', 980, 420], ['Healing', 820, 330],
  ['Play', 640, 420], ['Stillness', 430, 360], ['Home', 240, 440],
].map(([name, x, y], i) => ({ id: 'n' + i, name, x, y, named: true }));

export const NAMED_NAMES = NAMED.map((s) => s.name);

// The brief's palette (Velvet Moon) plus the Nightbloom pastels, tuned to read
// on a night sky. Keys are what Claude picks from; hex is what gets drawn.
export const PALETTE = {
  gold: '#d9c08a',
  champagne: '#f1dfb4',
  rose: '#e7a6b8',
  'dusty-rose': '#c98291',
  lavender: '#c5b9ee',
  orchid: '#a98be6',
  aqua: '#9edcd8',
  sage: '#a9bf9c',
  pearl: '#f6f1f7',
  ember: '#f0a77a',
};
export const COLOR_KEYS = Object.keys(PALETTE);

export const POINTS = [4, 5, 6, 8];
