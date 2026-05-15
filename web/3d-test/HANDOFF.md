# Loading Screen Handoff

Self-contained HAND loading screen test. Single file. Status: animating with hand upright. Pose curl values still need visual tuning per letter.

## File

`web/3d-test/loading.html`

## What it does

Cinematic loading screen: dark HUD with rotating compass-tick rings, amber particle field, scan sweep, corner brackets, live FPS/hash/lat-lng readouts, progress bar.

Centerpiece is the **j-toastie rigged hand GLB** (`web/3d-test/models/jtoastie-rigged-hand.glb`, 91KB, 23 bones), morphing through ASL fingerspelling **H → A → N → D** via bone rotation tweens. Big amber gradient letter and a `H · A · N · D` mono sequence stay synced underneath.

## Orientation (locked in)

Hand sits upright via an `orient` group between `pivot` and `modelRoot`. Pivot does the wobble animation, orient holds the static rotation, modelRoot stays bbox-centered.

```js
orient.rotation.set(-6.0214, 1.3090, -1.8326);
```

Transform order matters: `modelRoot` is added to `orient` with rotation 0, bbox is computed and `modelRoot.position` is recentered, then `orient.rotation` is set. Don't reverse this order — putting rotation on `modelRoot` before recenter throws off the centering math.

## Stack

Loaded from CDN, no build:
- **anime.js 4.0.2** (`https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.esm.js`) — ring rotations, bone rotation tweens
- **three.js 0.160.0** (`https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`) — 3D scene
- **GLTFLoader** from `three/addons/loaders/GLTFLoader.js`

Importmap declared at top of `<script type="module">` block.

## Architecture

```
loading.html
├─ HUD chrome (pure HTML/CSS)
│  ├─ corner brackets, hud-tl/tr/bl/br readouts
│  ├─ center label, progress bar
│  └─ big letter (cross-fades) + letter sequence (highlights)
├─ Stage div
│  ├─ Rings SVG (4 concentric layers + 60 ticks, all anime.js rotated)
│  └─ .hand div containing <canvas id="handCanvas"> for three.js
└─ Particle canvas (raw canvas2d, 160 particles, orbital pull)
```

Script boot order:
1. Dynamic imports of anime, three, GLTFLoader (with try/catch + visible debug overlay)
2. Generate compass ticks (60 line elements)
3. Start ring rotations (anime.js infinite loops)
4. Setup three.js scene, lights, camera, pivot, resize observer
5. `loader.load('models/jtoastie-rigged-hand.glb', ...)` → traverse for mesh+bones, apply translucent amber material, recenter via bbox, resolve bones from `BONE_MAP`, capture rest rotations
6. `applyPose('H', 0)` instant
7. `cycle()` every 1900ms, applying the next pose with 850ms `easeInOutQuad` tween per bone

## Bone map (verified against j-toastie GLB)

From `compare.js`:
```js
const BONE_MAP = {
  thumb:  ['ThumbRoot', 'ThumbMiddle', 'ThumbTop'],
  index:  ['IndexF_lower', 'IndexF_middle', 'IndexF_tip'],
  middle: ['MiddleF_lower', 'MiddleF_middle', 'MiddleF_tip'],
  ring:   ['RingF_lower', 'RingF_middle', 'RingF_tip'],
  pinky:  ['PinkyF_lower', 'PinkyF_middle', 'PinkyF_tip'],
};
// curl axis: x, sign: +1 (positive = flex toward palm)
```

## ASL pose data (first-pass, needs visual tuning)

Curl values are radians, additive on top of rest rotation. `0` = fully extended, `~1.4` = fully curled to palm.

```js
H: { thumb: [-0.4, 1.0, 0.8], index: [0,0,0], middle: [0,0,0], ring: [1.4,1.6,1.4], pinky: [1.4,1.6,1.4] }
A: { thumb: [0, 0.1, 0.1],    index: [1.4,1.6,1.4], middle: [1.4,1.6,1.4], ring: [1.4,1.6,1.4], pinky: [1.4,1.6,1.4] }
N: { thumb: [0.6, 1.0, 0.7],  index: [1.4,1.6,1.4], middle: [1.4,1.6,1.4], ring: [1.4,1.6,1.4], pinky: [1.4,1.6,1.4] }
D: { thumb: [0.5, 1.1, 1.0],  index: [0,0,0], middle: [1.4,1.5,1.3], ring: [1.4,1.6,1.4], pinky: [1.4,1.6,1.4] }
```

After orientation is fixed, expect to dial these in by eye. **A and N** will look near-identical from most angles, that's accurate to real ASL — N differs from A by thumb being tucked between middle and ring rather than on the side.

## How to run

```bash
cd /home/koh/Documents/handprotocol/web && python3 -m http.server 8766
xdg-open http://localhost:8766/3d-test/loading.html
```

Hard refresh (Ctrl+Shift+R) when editing — wallet browser extensions may swallow some console noise.

## Debug overlay

There's a green debug overlay (bottom-left) that logs each boot step (`boot: script started`, `anime.js OK`, `three.js OK`, `GLB loaded`, `bones missing: 0`, `cycle scheduled`). It also surfaces JS errors and promise rejections. **Remove before shipping** — search `dbgEl` and the `dbg(...)` calls. Or keep behind a `?debug=1` query toggle.

## Voice/visual decisions made

- Dark palette `#07090f` / `#0c1220` with the warm amber `#D97706` from `DESIGN.md` as the single accent (DESIGN.md says ~5-10% coverage — particles + ring sweep stay in budget).
- HUD chrome reads as a research/tracking instrument, not a game UI. JetBrains Mono for all readouts.
- Big letter uses Inter 600 with a `#fff5dd → #f59e0b` gradient `-webkit-background-clip: text`.
- Hand silhouette has `drop-shadow(0 0 18px var(--amber-glow))` + a 60px outer halo for that "specimen under sodium light" feel.
- Particles use `mix-blend-mode: screen` so they glow into the background gradient.

## Out of scope for this test

Routing/use in production. This is a standalone `web/3d-test/` test page. Whoever wires it into the real app should:
- Strip the debug overlay
- Decide whether the loading screen has a finite duration (gated on actual app readiness) or just loops while initialization completes
- Confirm CDN dependencies are acceptable, or vendor anime.js + three.js into the bundle

## File pointers

- Loading screen: `web/3d-test/loading.html`
- GLB: `web/3d-test/models/jtoastie-rigged-hand.glb`
- Reference for bone naming + per-model orientation: `web/3d-test/compare.js`, `web/3d-test/compare.html`
- Reference for spike A pose-driven hand (procedural, not GLB): `web/3d-test/main.js`
- Brand tokens: `DESIGN.md`
