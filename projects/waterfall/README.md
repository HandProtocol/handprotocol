# Waterfall — waterfall.handprotocol.org

HAND Protocol as a living waterfall: contributions fall, pool, rise and
return. A procedural scene rendered live in the browser — no textures, no
model files: the gorge, the water, the mist and the light are all noise +
GLSL + Three.js r169 (CDN importmap, no build step).

Live at **https://waterfall.handprotocol.org** (Netlify site
`hand-waterfall`, id `b6c67806-64c7-45cf-9e45-d0527a513727`, under the
`cryptokoh` account — same as all HAND sites). NOT repo-linked: deploy by
CLI from this directory, which matters because `netlify.toml` HERE
overrides the repo root's CSP (root blocks the three.js CDN):

```bash
cd projects/waterfall
NETLIFY_AUTH_TOKEN=<cryptokoh token> netlify deploy --prod \
  --site b6c67806-64c7-45cf-9e45-d0527a513727 --dir . --message "..."
```

The stage carries HAND's story: the title HAND rises from the pool, a
governance card stands at the source ("Built in the open"), and four lore
markers pinned to scene features — reciprocity in the mist, technology in
the light shafts, missions on the far rocks, on-the-ground by the
small-business cards — each open a glass story panel (`.panel` /
`.panel-page` in `index.html`) written from the live handprotocol.org
copy (three flows, Article XI/XII, "two sides of one fabric", "with you,
not at you").

This is the first stone of a portfolio: the page exposes a CSS-3D "stage"
whose elements are pinned to points in the 3D scene. The portfolio now
lives on it, hugging the falls: HAND Protocol stands on the brink at the
source (with aspect chips — develop / learn / reciprocate), and the works
(Yuhm Network, WaterDrop, Longhorn Wine Tours, Ed's Barber Shop) rise out
of the pool flanking the main sheet, each a glass card with a blurred
reflection in the water. Hovering a card is a premium moment: it lifts
and pops toward the viewer, tilts toward the pointer, a glare and a
border-light track the cursor (`--mx/--my/--rx/--ry` custom props set by
`index.html`), a "visit ↗" affordance fades in, and its reflection
sharpens. In portrait the waterline band is too shallow for anchored
cards, so the pieces dock into a swipeable shelf floating over the pool
instead (`.pieces` in `style.css`; `waterfall.js` skips anchoring them
there).

## Run it

```bash
cd projects/waterfall
python3 -m http.server 8765
# open http://127.0.0.1:8765/
```

Debug query params:

| param        | effect                                                       |
|--------------|--------------------------------------------------------------|
| `?still`     | skip the loading veil + entrance transitions (screenshots)   |
| `?cam=side`  | camera on the right looking across the brink                 |
| `?cam=top`   | camera high, looking down into the gorge                     |
| `?debug`     | logs wall geometry stats around the main brink               |

## What's in the frame

| layer | file | technique |
|---|---|---|
| Gorge wall | `waterfall.js` `buildGorge()` | inside of a cylinder segment, CPU-displaced with fbm + ridged noise + strata + macro pillars; vertex colours for strata/moss; brink shelves grown from the wall with `outcrop()` |
| Rock shading | `rockMaterial()` | `MeshStandardMaterial` + `onBeforeCompile`: wetness (darker, glossier near the falls), procedural normal bump, caustics at the waterline, contact-shadow bands above/below the shelves |
| Water sheets | `WATER_VERT/FRAG` | plane bent over the brink (quarter-cylinder then flat into the rock), spreads as it falls, fbm body at 3 speeds, streaks, foam growing with fall distance, ropes separating near the base, fake normals for lighting, sun glints, ragged edges, dissolve into mist |
| Pool | `POOL_VERT/FRAG` + `Reflector` | real planar reflection; UVs perturbed by swell + capillary ripples + rings from the impact; fresnel into deep water; churned foam disc; drifting foam streaks; sun glint |
| Mist | `MIST_*` | analytic GPU point sprites born at the impact, rising, drifting on the wind |
| Spray | `SPRAY_*` | ballistic droplets, additive |
| Mist banks | `BANK_*` | camera-facing noise quads at the base |
| Light shafts | `SHAFT_*` | additive tilted planes, breathing |
| Leaves | `LEAF_*` | analytic point sprites: flutter down from the canopy, land on the pool, ride the current away from the falls |
| Rainbow | `RAINBOW_FRAG` | faint arc in the spray, stronger when you look from the left |
| Post | `GRADE_SHADER` | UnrealBloom (foam only) → ACES → split-tone, vignette, fine grain |
| Light | | warm raking key with a 2048² shadow map, hemisphere sky/ground, cool rim, faint fill, teal point light in the pool |

Camera parallax: pointer on desktop, gyro on phones (iOS permission on
first tap, touch-drag fallback), plus a slow idle drift so it is never
static. `prefers-reduced-motion` slows the sim to 30% and removes the sway.

## Immersion layer

* **The entrance.** The loading veil thins to frosted glass once the first
  frame is up and offers *enter with sound / enter quietly*. The click is
  the user gesture the autoplay policy wants, so most visitors actually
  hear the falls. The choice is kept in `sessionStorage` (`wf-enter`);
  same-tab reloads walk straight back in.
* **Touching the water.** The pointer raycasts onto the pool plane
  (`poolPoint()` in `waterfall.js`). A tap spawns a strong ring, a moving
  cursor leaves a quiet wake; rings live in a 16-slot uniform buffer
  (`uRipples`) the pool shader replays as expanding wave packets for
  3.5 s. Taps also plip (synth, only when sound is on), vibrate on
  Android, and dispatch `waterfall:touch` (used to retire the "touch the
  water" hint). Hovering or focusing a pool-standing card rings the water
  at its anchor.
* **Weather.** `gustAt(t)` — layered slow sines — occasionally swells to a
  gust: mist and leaves drift harder, the sheets fray wider, the mist
  banks thicken, the audio hiss rises.
* **Audio.** Three synthesized layers (roar low-pass, hiss band-pass, sub
  rumble) behind a master gain; the whole mix pans gently with the gaze
  via a `StereoPannerNode`.
* **Leaning in.** The mouse wheel eases the camera toward the falls
  (clamped, ease-out; disabled under `prefers-reduced-motion`).

## Quality

Three tiers in `TIERS` (high / mid / low): pixel ratio cap, reflection
resolution, particle counts, noise octaves, wall mesh density, bloom.
Phones start on `mid`; after a 2-second warm-up the loop measures frame
time and steps down a tier if it averages over 28 ms. The tab pauses when
hidden. Current tier is on `<html data-quality>` once adapted.

## Putting the portfolio on the stage

```html
<div id="stage">
  <article class="piece" data-anchor="x,y,z" data-anchor-portrait="x,y,z"
           data-xform="translate(-50%, -100%) rotateX(6deg)">…</article>
</div>
```

* `data-anchor` is a world point. The pool surface is `y = 0`; the main
  fall lands at `(0, 0, 0.9)`, the side fall at `(-3.6, 0, 0.5)`; the
  crest of the main fall is at `y ≈ 7.6`. Camera sits at `(1.6, 3, 11.5)`
  (portrait: `(0.7, 3, 12.5)`).
* Each frame `waterfall.js` projects the point and writes
  `transform: translate3d(px, py, 0) <data-xform>` on the element, so
  elements track the camera sway. `#stage` has `perspective: 1100px`; put
  `rotateX / translateZ` in `data-xform` for the 3D pose.
* From JS: `WATERFALL.anchor(el, x, y, z)`, `WATERFALL.project(v3)`,
  `WATERFALL.scene / camera`, `WATERFALL.setAudio(bool)`,
  `WATERFALL.setPaused(bool)`, `WATERFALL.ripple(x, z, amp)`,
  `WATERFALL.falls`.
* The title's entrance (`.is-emerged`) is the reference "rise out of the
  water" motion: `clip-path` on the wrapper clips at the waterline, the
  element slides up with an ease-out-quint, and a flipped, blurred, masked
  copy below it is the reflection.
* The portfolio pieces (`.piece` in `index.html`) reuse that motion:
  `--d` staggers each card's rise after the title, `piece--dry` marks a
  card standing on rock (no water reflection), and reflections are cloned
  in by the inline module. Anchor placement was chosen empirically by
  projecting a grid of pool points through `WATERFALL.project` — the
  usable waterline band in landscape is roughly `z 0.8–3.3` before cards
  slide off the bottom of the frame.

## Tuning knobs worth knowing

* `PAL` (colours), `FOG_DENSITY`, `LIGHT_DIR`, `toneMappingExposure`.
* `FALLS` — position, lip height, width, bend radius of each fall; shelf
  heights are derived from these, so moving a fall moves its brink.
* `makeFall(..., { speed, fray, opacityTop })`.
* `bankDefs`, `makeShaft(...)`, `makeMist(...)` calls for the atmosphere.
* `UnrealBloomPass(strength, radius, threshold)` at the post section.
