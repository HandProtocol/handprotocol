/* ============================================================
   Waterfall — scene
   A gorge, two falls, a reflecting pool, mist, light.
   Built procedurally; nothing is loaded but Three.js itself.

   Public API (window.WATERFALL):
     .scene / .camera / .renderer
     .anchor(el, x, y, z)    pin a DOM element to a world point
     .project(v3) -> {x,y,visible}
     .setAudio(bool), .setPaused(bool)
     .quality -> 'high' | 'mid' | 'low'
   ============================================================ */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import {
  NOISE_GLSL, withNoise, WATER_VERT, WATER_FRAG, POOL_VERT, POOL_FRAG,
  MIST_VERT, MIST_FRAG, SPRAY_VERT, SPRAY_FRAG, BANK_VERT, BANK_FRAG,
  SHAFT_VERT, SHAFT_FRAG, RAINBOW_FRAG, LEAF_VERT, LEAF_FRAG, GRADE_SHADER,
} from './shaders.js';

/* ------------------------------------------------------------
   Device + quality tiers
   ------------------------------------------------------------ */
const coarse = matchMedia('(pointer: coarse)').matches;
const small = Math.min(innerWidth, innerHeight) < 720;
const isMobile = coarse || small;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const TIERS = {
  high: { dpr: 2,   refl: 1024, mist: 1100, spray: 700, banks: 7, leaves: 30, octaves: 5, rockSegs: [280, 200], bloom: true },
  mid:  { dpr: 1.5, refl: 512,  mist: 600,  spray: 350, banks: 5, leaves: 20, octaves: 4, rockSegs: [200, 140], bloom: true },
  low:  { dpr: 1,   refl: 256,  mist: 320,  spray: 200, banks: 4, leaves: 12, octaves: 3, rockSegs: [120, 80],  bloom: false },
};
let quality = isMobile ? 'mid' : 'high';
let T = TIERS[quality];

/* ------------------------------------------------------------
   Palette (linear-ish; tone-mapped at the end)
   ------------------------------------------------------------ */
const PAL = {
  fog:      new THREE.Color(0x5e7a7e),
  sky:      new THREE.Color(0x9fc3c9),
  ground:   new THREE.Color(0x16262a),
  key:      new THREE.Color(0xfff1d6),
  rock:     new THREE.Color(0x4d5857),
  rockDark: new THREE.Color(0x26302f),
  rockWarm: new THREE.Color(0x7a6a55),
  moss:     new THREE.Color(0x4a6438),
  deep:     new THREE.Color(0x3f7f89),
  pool:     new THREE.Color(0x163a40),
  foam:     new THREE.Color(0xeef6f9).multiplyScalar(0.95),
  mist:     new THREE.Color(0xdfeef2),
};
const FOG_DENSITY = 0.028;
const LIGHT_DIR = new THREE.Vector3(-6.5, 9, 3.5).normalize();

/* ------------------------------------------------------------
   Renderer, scene, camera
   ------------------------------------------------------------ */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.setClearColor(PAL.fog, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(PAL.fog, FOG_DENSITY);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
const portrait = innerWidth / innerHeight < 0.8;
const CAM_BASE = new THREE.Vector3(portrait ? 0.7 : 1.6, 3.0, portrait ? 12.5 : 11.5);
const CAM_LOOK = new THREE.Vector3(portrait ? 0.2 : 0, 3.9, 0);
// debug views: ?cam=side | top
{
  const c = new URLSearchParams(location.search).get('cam');
  if (c === 'side') { CAM_BASE.set(13, 7.5, 4); CAM_LOOK.set(0, 6.5, -1); }
  if (c === 'top') { CAM_BASE.set(2, 16, 9); CAM_LOOK.set(0, 5, -1); }
}
camera.position.copy(CAM_BASE);

/* ------------------------------------------------------------
   Lights
   ------------------------------------------------------------ */
scene.add(new THREE.HemisphereLight(PAL.sky, PAL.ground, 1.0));
const key = new THREE.DirectionalLight(PAL.key, 3.4);
key.position.copy(LIGHT_DIR).multiplyScalar(26);
key.castShadow = true;
key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
key.shadow.camera.left = -18; key.shadow.camera.right = 18;
key.shadow.camera.top = 22; key.shadow.camera.bottom = -6;
key.shadow.camera.near = 2; key.shadow.camera.far = 70;
key.shadow.bias = -0.0006;
key.shadow.normalBias = 0.06;
key.shadow.radius = 3;
scene.add(key);
scene.add(key.target);
const bounce = new THREE.PointLight(PAL.deep, 18, 14, 1.6);
bounce.position.set(0, 0.8, 2.5);
scene.add(bounce);
const rim = new THREE.DirectionalLight(0x9fd3dc, 0.9);
rim.position.set(9, 6, -3);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xbfd6da, 0.35);
fill.position.set(0, 5, 12);
scene.add(fill);

/* ------------------------------------------------------------
   CPU simplex noise (3D) for geometry displacement
   Gustavson's classic, compacted.
   ------------------------------------------------------------ */
const Noise = (() => {
  const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
  const p = new Uint8Array(256);
  let s = 1337;
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512), pm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm[i] = perm[i] % 12; }
  const F3 = 1 / 3, G3 = 1 / 6;
  const dot = (g, x, y, z) => g[0] * x + g[1] * y + g[2] * z;
  function n3(x, y, z) {
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; } else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; } else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
    } else {
      if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; } else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; } else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2*G3, y2 = y0 - j2 + 2*G3, z2 = z0 - k2 + 2*G3;
    const x3 = x0 - 1 + 3*G3, y3 = y0 - 1 + 3*G3, z3 = z0 - 1 + 3*G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0, t0;
    t0 = 0.6 - x0*x0 - y0*y0 - z0*z0; if (t0 > 0) { t0 *= t0; n += t0*t0*dot(grad3[pm[ii+perm[jj+perm[kk]]]], x0, y0, z0); }
    t0 = 0.6 - x1*x1 - y1*y1 - z1*z1; if (t0 > 0) { t0 *= t0; n += t0*t0*dot(grad3[pm[ii+i1+perm[jj+j1+perm[kk+k1]]]], x1, y1, z1); }
    t0 = 0.6 - x2*x2 - y2*y2 - z2*z2; if (t0 > 0) { t0 *= t0; n += t0*t0*dot(grad3[pm[ii+i2+perm[jj+j2+perm[kk+k2]]]], x2, y2, z2); }
    t0 = 0.6 - x3*x3 - y3*y3 - z3*z3; if (t0 > 0) { t0 *= t0; n += t0*t0*dot(grad3[pm[ii+1+perm[jj+1+perm[kk+1]]]], x3, y3, z3); }
    return 32 * n;
  }
  function fbm(x, y, z, oct = 5, lac = 2.05, gain = 0.5) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += a * n3(x*f, y*f, z*f); f *= lac; a *= gain; }
    return v;
  }
  function ridged(x, y, z, oct = 4) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += a * (1 - Math.abs(n3(x*f, y*f, z*f))); f *= 2.1; a *= 0.5; }
    return v;
  }
  return { n3, fbm, ridged };
})();

/* ------------------------------------------------------------
   Rock material: standard PBR + injected wetness, moss, caustics
   ------------------------------------------------------------ */
const uTime = { value: 0 };
const FALLS = {
  main: { x: 0.0,  lip: 8.3, width: 3.1, impact: new THREE.Vector2(0.0, 0.9), bendAt: 0.86, radius: 0.9, z: 0.4 },
  side: { x: -3.6, lip: 6.6, width: 0.9, impact: new THREE.Vector2(-3.6, 0.5), bendAt: 0.86, radius: 0.7, z: 0.4 },
};
// Sheet planes span y = -0.5 .. lip - 0.2; the brink is where the bend starts.
for (const f of Object.values(FALLS)) {
  f.height = f.lip + 0.3;
  f.crestY = -0.5 + f.bendAt * f.height;          // where the sheet begins to bend
  f.shelfY = f.crestY + f.radius - 0.22;          // rock shelf top: just under the water
  f.shelfZ = f.z - 0.35;                          // shelf front face, behind the sheet
}

function rockMaterial() {
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.94, metalness: 0.0, side: THREE.FrontSide,
  });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; uniform float uTime;
        #define OCTAVES 3
        ${NOISE_GLSL}
        float wetness(vec3 w) {
          float m  = smoothstep(2.7, 1.4, abs(w.x - ${FALLS.main.x.toFixed(2)})) * smoothstep(${(FALLS.main.shelfY + 0.6).toFixed(2)}, ${(FALLS.main.shelfY - 0.3).toFixed(2)}, w.y);
          float sd = smoothstep(1.3, 0.5, abs(w.x - ${FALLS.side.x.toFixed(2)})) * smoothstep(${(FALLS.side.shelfY + 0.5).toFixed(2)}, ${(FALLS.side.shelfY - 0.3).toFixed(2)}, w.y);
          float splash = smoothstep(5.0, 1.0, length(vec2(w.x, w.y * 1.6)));
          float base = smoothstep(1.8, 0.0, w.y);
          float n = snoise(w * 0.9) * 0.18;
          return clamp(max(max(m, sd), max(splash, base)) + n, 0.0, 1.0);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float wet = wetness(vWPos);
        roughnessFactor = mix(roughnessFactor, 0.52, wet);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // procedural grain: perturb the normal with a noise gradient (world space -> view space)
          vec3 q = vWPos * 1.5;
          float e = 0.05;
          float n0 = snoise(q) + 0.5 * snoise(q * 2.7);
          float gx = snoise(q + vec3(e, 0.0, 0.0)) + 0.5 * snoise((q + vec3(e, 0.0, 0.0)) * 2.7) - n0;
          float gy = snoise(q + vec3(0.0, e, 0.0)) + 0.5 * snoise((q + vec3(0.0, e, 0.0)) * 2.7) - n0;
          float gz = snoise(q + vec3(0.0, 0.0, e)) + 0.5 * snoise((q + vec3(0.0, 0.0, e)) * 2.7) - n0;
          vec3 g = vec3(gx, gy, gz) / e;
          vec3 gv = (viewMatrix * vec4(g, 0.0)).xyz;
          normal = normalize(normal - gv * 0.05 * (1.0 - wet * 0.4));
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float wet2 = wetness(vWPos);
          diffuseColor.rgb *= mix(1.0, 0.5, wet2);
          // contact shadow where the wall steps back above each brink slab,
          // and under its overhang
          float ao = 0.0;
          ao += exp(-pow((vWPos.y - ${FALLS.main.shelfY.toFixed(2)} - 0.55) / 0.8, 2.0)) * smoothstep(6.5, 2.0, abs(vWPos.x - ${(FALLS.main.x + 0.6).toFixed(2)})) * step(vWPos.z, ${(FALLS.main.shelfZ - 0.6).toFixed(2)});
          ao += exp(-pow((vWPos.y - ${FALLS.main.shelfY.toFixed(2)} + 0.9) / 0.7, 2.0)) * smoothstep(6.5, 2.0, abs(vWPos.x - ${(FALLS.main.x + 0.6).toFixed(2)})) * 0.8;
          ao += exp(-pow((vWPos.y - ${FALLS.side.shelfY.toFixed(2)} - 0.5) / 0.7, 2.0)) * smoothstep(3.0, 1.0, abs(vWPos.x - ${(FALLS.side.x - 0.4).toFixed(2)})) * step(vWPos.z, ${(FALLS.side.shelfZ - 0.6).toFixed(2)});
          ao += exp(-pow((vWPos.y - ${FALLS.side.shelfY.toFixed(2)} + 0.8) / 0.6, 2.0)) * smoothstep(3.0, 1.0, abs(vWPos.x - ${(FALLS.side.x - 0.4).toFixed(2)})) * 0.8;
          diffuseColor.rgb *= 1.0 - 0.55 * clamp(ao, 0.0, 1.0);
          // caustics: light refracted through the pool dancing on the low rock
          float cm = smoothstep(0.45, 0.05, vWPos.y) * smoothstep(-0.3, 0.0, vWPos.y);
          if (cm > 0.001) {
            vec3 q = vWPos * vec3(1.4, 2.2, 1.4);
            float c1 = snoise(q + vec3(0.0, uTime * 0.45, 0.0));
            float c2 = snoise(q * 1.7 + vec3(3.0, -uTime * 0.35, 1.0));
            float caus = pow(max(0.0, 1.0 - abs(c1 + c2 * 0.6)), 4.0);
            diffuseColor.rgb += caus * cm * vec3(0.35, 0.55, 0.6) * 0.15;
          }
        }`);
  };
  return m;
}
const ROCK_MAT = rockMaterial();

/* Colour a displaced rock vertex from its noise field. */
function rockColor(out, x, y, z, relief) {
  const strata = 0.5 + 0.5 * Math.sin(y * 1.35 + Noise.n3(x * 0.3, y * 0.3, z * 0.3) * 2.2);
  const patch = Noise.fbm(x * 0.35 + 9, y * 0.35, z * 0.35, 3);
  const c = out.copy(PAL.rock).lerp(PAL.rockWarm, strata * 0.35);
  c.lerp(PAL.rockDark, THREE.MathUtils.clamp(0.25 - relief * 0.6, 0, 0.4));
  const mossMask = THREE.MathUtils.smoothstep(patch, 0.3, 0.6) * THREE.MathUtils.smoothstep(9.5 - y, 0, 4) * (relief > 0 ? 1 : 0.35);
  c.lerp(PAL.moss, mossMask * 0.55);
  return c;
}

/* Displace a geometry along its normals with layered noise; colour it. */
function sculpt(geo, { scale = 0.18, amp = 1.6, fine = 0.28, inward = 1, seed = 0, ridge = 0.9, radial = false, strata = 0, extra = null, macro = 0 } = {}) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (radial) n.copy(v).normalize(); else n.fromBufferAttribute(nrm, i);
    const sx = v.x + seed, sy = v.y, sz = v.z - seed;
    const big = Noise.fbm(sx * scale, sy * scale, sz * scale, 4) * amp;
    const rid = (Noise.ridged(sx * scale * 2.3, sy * scale * 1.1, sz * scale * 2.3, 3) - 0.6) * amp * ridge;
    const fn = Noise.fbm(sx * 0.9, sy * 0.9, sz * 0.9, 3) * fine
             + Noise.fbm(sx * 2.6, sy * 2.6, sz * 2.6, 2) * fine * 0.45;
    // sedimentary strata: horizontal shelves that wander with the noise
    const band = Math.sin(sy * 1.5 + Noise.n3(sx * 0.25, sy * 0.25, sz * 0.25) * 2.4);
    const shelf = strata * Math.sign(band) * Math.pow(Math.abs(band), 0.35);
    // macro: broad buttresses / pillars (wall only)
    const pillars = macro ? (Noise.ridged(sx * 0.075, sy * 0.035, sz * 0.075, 2) - 0.55) * macro : 0;
    // extra() returns [displacement, mask]; the mask damps the wild terms so
    // a brink reads as one coherent shelf instead of a ragged edge.
    const ex = extra ? extra(v.x, v.y, v.z) : [0, 0];
    const damp = 1 - 0.8 * ex[1];
    const d = ((big + rid + pillars + shelf) * damp + fn * (1 - 0.5 * ex[1]) + ex[0]) * inward;
    v.addScaledVector(n, d);
    pos.setXYZ(i, v.x, v.y, v.z);
    rockColor(c, v.x, v.y, v.z, (big + rid) / amp);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------
   The gorge
   ------------------------------------------------------------ */
const gorge = new THREE.Group();
scene.add(gorge);

function buildGorge() {
  // Curved back wall (inside of a cylinder segment)
  const R = 17, H = 30;
  const [segA, segH] = T.rockSegs;
  const wall = new THREE.CylinderGeometry(R, R, H, segA, segH, true, Math.PI - 1.05, 2.1);
  wall.scale(-1, 1, 1); // flip so the inside faces the camera with correct normals
  const WALL_POS = new THREE.Vector3(0, 9.5, R - 2.2);
  // Outcrops: the brinks the falls pour over, grown out of the wall itself.
  // Sharp falloff above (a shelf), slow falloff below (a buttress).
  const outcrop = (lx, ly, lz) => {
    const x = lx + WALL_POS.x, y = ly + WALL_POS.y;
    let d = 0, mask = 0;
    const wallZ = WALL_POS.z - R;   // resting z of the wall centre line
    // Thin overhanging slabs: quick recede above (the wall steps back), a
    // sharp underside below (a dark band, the strongest ledge cue from below).
    for (const [fx, top, w, push] of [[FALLS.main.x + 0.6, FALLS.main.shelfY, 6.0, FALLS.main.shelfZ - wallZ], [FALLS.side.x - 0.4, FALLS.side.shelfY, 2.8, FALLS.side.shelfZ - wallZ]]) {
      const dx = (x - fx) / w, dy = y - top;
      const vert = dy > 0 ? Math.exp(-((dy / 0.5) ** 2)) : Math.exp(-((dy / 1.4) ** 2));
      const m = Math.pow(Math.exp(-dx * dx * 1.2), 2.2) * vert;
      d += push * m;
      mask = Math.max(mask, Math.min(1, m * 1.3));
    }
    return [d, mask];
  };
  // NOTE: the mirrored cylinder's normals point away from the camera, so
  // inward = -1 pushes relief toward the viewer.
  sculpt(wall, { scale: 0.16, amp: 1.7, fine: 0.34, inward: -1, ridge: 1.2, strata: 0.22, macro: 3.2, extra: outcrop });
  const wallMesh = new THREE.Mesh(wall, ROCK_MAT);
  wallMesh.position.copy(WALL_POS);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  gorge.add(wallMesh);
  if (location.search.includes('debug')) {
    const pos = wall.attributes.position; let maxZ = -99, minZ = 99, n = 0;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).add(WALL_POS);
      if (Math.abs(v.x - 0.3) < 1.2 && v.y > 6.8 && v.y < 7.6) { maxZ = Math.max(maxZ, v.z); minZ = Math.min(minZ, v.z); n++; }
    }
    console.log('WALL lip zone: n=' + n + ' z in [' + minZ.toFixed(2) + ', ' + maxZ.toFixed(2) + ']');
  }

  // The lip: a shelf the main fall pours over.
  // Boulders at the base and in the foreground (parallax layers).
  const boulders = [
    [-4.2, -0.55, 3.2, 1.7, 7],
    [ 3.6, -0.5,  2.4, 1.5, 3],
    [ 5.6, -0.9,  6.8, 2.2, 21],
    [-6.4, -1.0,  6.2, 2.4, 15],
    [ 1.9, -0.7,  0.6, 1.0, 9],
    [-2.0, -0.8,  0.2, 0.9, 2],
    [ 7.5, -0.2, -0.5, 2.6, 31],
    [-8.0,  0.1, -0.8, 2.8, 27],
  ];
  for (const [x, y, z, r, seed] of boulders) {
    const g = new THREE.SphereGeometry(r, 72, 52);
    sculpt(g, { scale: 0.7 / r, amp: r * 0.3, fine: 0.3, seed, ridge: 1.4, strata: 0.08 });
    const m = new THREE.Mesh(g, ROCK_MAT);
    m.position.set(x, y, z);
    m.rotation.set(seed * 0.3, seed * 0.7, seed * 0.1);
    m.scale.y = 0.72;
    m.castShadow = true;
    m.receiveShadow = true;
    gorge.add(m);
  }
}
buildGorge();

/* ------------------------------------------------------------
   The pool: Reflector with the custom ripple shader
   ------------------------------------------------------------ */
// Rings the visitor makes. A small ring buffer of (x, z, birth, strength);
// the pool shader replays each as an expanding wave packet for 3.5s.
const RIPPLES = 16;
const rippleBuf = new Float32Array(RIPPLES * 4);
let rippleI = 0;
function ripple(x, z, amp = 1) {
  const o = (rippleI++ % RIPPLES) * 4;
  rippleBuf[o] = x; rippleBuf[o + 1] = z; rippleBuf[o + 2] = simTime; rippleBuf[o + 3] = amp;
}

const poolShader = {
  name: 'PoolShader',
  uniforms: {
    tDiffuse: { value: null },
    color: { value: PAL.pool.clone() },
    textureMatrix: { value: null },
    uTime,
    uImpact: { value: FALLS.main.impact },
    uImpact2: { value: FALLS.side.impact },
    uCamPos: { value: camera.position },
    uLightDir: { value: LIGHT_DIR },
    uFogColor: { value: PAL.fog },
    uFogDensity: { value: FOG_DENSITY },
    uReflect: { value: 0.9 },
    uRipples: { value: rippleBuf },
  },
  vertexShader: POOL_VERT,
  fragmentShader: withNoise(POOL_FRAG, 4),
};
const pool = new Reflector(new THREE.PlaneGeometry(70, 50), {
  clipBias: 0.004,
  multisample: isMobile ? 0 : 2,
  textureWidth: T.refl,
  textureHeight: T.refl,
  color: PAL.pool,
  shader: poolShader,
});
pool.rotation.x = -Math.PI / 2;
pool.position.set(0, 0, 6);
scene.add(pool);
// UniformsUtils.clone copies typed arrays by reference, but pin the shared
// buffer explicitly so ripple() always writes into the live material.
pool.material.uniforms.uRipples.value = rippleBuf;

/* ------------------------------------------------------------
   Water sheets
   ------------------------------------------------------------ */
const waterMats = [];
function makeFall({ x, width, height, bendAt, radius, z }, { speed, fray, opacityTop, segs = [36, 160] }) {
  const geo = new THREE.PlaneGeometry(width, height, segs[0], segs[1]);
  const mat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERT,
    fragmentShader: withNoise(WATER_FRAG, T.octaves),
    uniforms: {
      uTime, uSpeed: { value: speed }, uWidthFray: { value: fray }, uOpacityTop: { value: opacityTop },
      uHeight: { value: height }, uBendAt: { value: bendAt }, uRadius: { value: radius },
      uDeep: { value: PAL.deep }, uFoam: { value: PAL.foam }, uLightDir: { value: LIGHT_DIR },
      uFogColor: { value: PAL.fog }, uFogDensity: { value: FOG_DENSITY }, uCamPos: { value: camera.position },
    },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, height / 2 - 0.5, z);
  mesh.renderOrder = 2;
  mat.userData.fray0 = fray;   // gusts modulate around this
  waterMats.push(mat);
  scene.add(mesh);
  return mesh;
}
makeFall(FALLS.main, { speed: 1.25, fray: 0.8, opacityTop: 0.8 });
makeFall(FALLS.side, { speed: 1.6, fray: 1.0, opacityTop: 0.6, segs: [12, 130] });

/* ------------------------------------------------------------
   Mist + spray (analytic GPU particles)
   ------------------------------------------------------------ */
function particleGeometry(count, extra) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) seed[i] = Math.random();
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  extra(g, count);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 1), 14); // never culled
  return g;
}

const mistCommon = { uTime, uPixelRatio: { value: 1 }, uScale: { value: 800 } };
const winds = [];   // every uWind uniform + its calm-air base, for the gusts
function makeMist(origin, count, spread, rise, life, wind, sizeMul = 1, color = PAL.mist) {
  const geo = particleGeometry(count, (g, n) => {
    const size = new Float32Array(n), off = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      size[i] = (0.5 + Math.random() * 0.9) * sizeMul;
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
      off[i * 3] = Math.cos(a) * r; off[i * 3 + 1] = Math.random(); off[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aOffset', new THREE.BufferAttribute(off, 3));
  });
  const mat = new THREE.ShaderMaterial({
    vertexShader: MIST_VERT, fragmentShader: MIST_FRAG,
    uniforms: {
      ...mistCommon, uOrigin: { value: origin }, uSpread: { value: spread }, uRise: { value: rise },
      uLife: { value: life }, uWind: { value: wind }, uColor: { value: color },
    },
    transparent: true, depthWrite: false, depthTest: true,
  });
  winds.push({ u: mat.uniforms.uWind, base: wind.clone() });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = 4;
  scene.add(pts);
  return pts;
}
makeMist(new THREE.Vector3(FALLS.main.x, 0.1, 1.0), Math.round(T.mist * 0.55), new THREE.Vector2(2.2, 1.4), 4.2, 7.5, new THREE.Vector2(0.3, 0.2));
makeMist(new THREE.Vector3(FALLS.main.x, 0.0, 1.4), Math.round(T.mist * 0.3), new THREE.Vector2(1.6, 1.0), 1.8, 4.0, new THREE.Vector2(0.15, 0.3), 0.7);
makeMist(new THREE.Vector3(FALLS.side.x, 0.1, 0.6), Math.round(T.mist * 0.15), new THREE.Vector2(0.9, 0.7), 2.4, 6.0, new THREE.Vector2(0.25, 0.15), 0.7);

function makeSpray(origin, count) {
  const geo = particleGeometry(count, (g, n) => {
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 1.6;
      vel[i * 3] = Math.cos(a) * s; vel[i * 3 + 1] = 2.2 + Math.random() * 3.2; vel[i * 3 + 2] = Math.sin(a) * s * 0.7;
    }
    g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
  });
  const mat = new THREE.ShaderMaterial({
    vertexShader: SPRAY_VERT, fragmentShader: SPRAY_FRAG,
    uniforms: { ...mistCommon, uOrigin: { value: origin }, uLife: { value: 1.4 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = 5;
  scene.add(pts);
}
makeSpray(new THREE.Vector3(FALLS.main.x, 0.05, 0.9), T.spray);
makeSpray(new THREE.Vector3(FALLS.side.x, 0.05, 0.5), Math.round(T.spray * 0.3));

/* ------------------------------------------------------------
   Mist banks (camera-facing noise quads)
   ------------------------------------------------------------ */
const banks = [];
function makeBank(x, y, z, w, h, opacity, seed) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: BANK_VERT, fragmentShader: withNoise(BANK_FRAG, 3),
    uniforms: {
      uTime, uSeed: { value: seed }, uOpacity: { value: opacity }, uColor: { value: PAL.mist },
      uFogColor: { value: PAL.fog }, uFogDensity: { value: FOG_DENSITY }, uCamPos: { value: camera.position },
    },
    transparent: true, depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.renderOrder = 3;
  m.userData.op0 = opacity;   // gusts modulate around this
  scene.add(m);
  banks.push(m);
}
const bankDefs = [
  [0.0, 1.2, 1.6, 7.5, 4.2, 0.55, 1.0],
  [-1.6, 0.8, 2.6, 5.5, 3.0, 0.5, 2.3],
  [1.8, 0.9, 2.2, 5.0, 3.0, 0.45, 3.7],
  [-3.6, 0.7, 1.2, 3.6, 2.4, 0.4, 5.1],
  [0.6, 2.6, 0.4, 6.0, 3.6, 0.3, 6.9],
  [-0.8, 0.5, 4.2, 6.0, 2.4, 0.35, 8.4],
  [2.8, 1.4, 0.2, 3.2, 2.4, 0.16, 9.8],
];
bankDefs.slice(0, T.banks).forEach((b) => { b[5] *= 0.7; makeBank(...b); });

/* ------------------------------------------------------------
   Leaves: foliage let go from the canopy, landing on the pool
   and riding the current. Analytic like the mist.
   ------------------------------------------------------------ */
{
  const leafWind = new THREE.Vector2(0.35, 0.15);
  const geo = particleGeometry(T.leaves, () => {});
  const mat = new THREE.ShaderMaterial({
    vertexShader: LEAF_VERT, fragmentShader: LEAF_FRAG,
    uniforms: { ...mistCommon, uWind: { value: leafWind.clone() }, uLife: { value: 26 } },
    transparent: true, depthWrite: false,
  });
  winds.push({ u: mat.uniforms.uWind, base: leafWind });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = 3;
  scene.add(pts);
}

/* ------------------------------------------------------------
   Light shafts + rainbow
   ------------------------------------------------------------ */
const shafts = [];
function makeShaft(x, topY, len, width, tilt, strength, seed) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: SHAFT_VERT, fragmentShader: SHAFT_FRAG,
    uniforms: { uTime, uSeed: { value: seed }, uStrength: { value: strength }, uColor: { value: PAL.key.clone().multiplyScalar(0.9) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, len), mat);
  m.position.set(x, topY - len / 2, 1.2);
  m.rotation.z = tilt;
  m.renderOrder = 6;
  scene.add(m);
  shafts.push(m);
}
makeShaft(4.2, 15, 16, 2.4, -0.42, 0.45, 1);
makeShaft(2.4, 15, 15, 1.2, -0.40, 0.32, 2);
makeShaft(6.6, 15, 14, 3.4, -0.45, 0.26, 3);
makeShaft(-1.2, 15, 13, 1.6, -0.38, 0.2, 4);

const rainbow = (() => {
  const geo = new THREE.RingGeometry(1.5, 2.05, 64, 1, Math.PI * 0.05, Math.PI * 0.9);
  // remap uv so y runs across the band and x along it
  const uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const r = Math.hypot(x, y), a = Math.atan2(y, x);
    uv.setXY(i, (a - Math.PI * 0.05) / (Math.PI * 0.9), (r - 1.5) / 0.55);
  }
  const mat = new THREE.ShaderMaterial({
    vertexShader: SHAFT_VERT, fragmentShader: RAINBOW_FRAG,
    uniforms: { uTime, uOpacity: { value: 0.07 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(0.7, 0.2, 2.6);
  m.renderOrder = 6;
  scene.add(m);
  return m;
})();

/* ------------------------------------------------------------
   Post-processing
   ------------------------------------------------------------ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.65, 0.82);
bloom.enabled = T.bloom;
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass(GRADE_SHADER);
grade.uniforms.uRes.value = new THREE.Vector2(1, 1);
composer.addPass(grade);

/* ------------------------------------------------------------
   Resize: fov adapts to aspect so the fall always fits
   ------------------------------------------------------------ */
function resize() {
  const w = innerWidth, h = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, T.dpr);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);
  const aspect = w / h;
  camera.aspect = aspect;
  camera.fov = THREE.MathUtils.clamp(50 / Math.pow(aspect, 0.42), 48, 78);
  camera.updateProjectionMatrix();
  mistCommon.uPixelRatio.value = dpr;
  mistCommon.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  grade.uniforms.uRes.value.set(w * dpr, h * dpr);
}
addEventListener('resize', resize);
resize();

/* ------------------------------------------------------------
   Parallax: pointer on desktop, gyro on mobile, idle drift always
   ------------------------------------------------------------ */
const look = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', (e) => {
  if (coarse) return;
  look.tx = (e.clientX / innerWidth - 0.5) * 2;
  look.ty = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });

let gyroArmed = false;
function armGyro() {
  if (gyroArmed) return;
  gyroArmed = true;
  const attach = () => addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    look.tx = THREE.MathUtils.clamp(e.gamma / 25, -1, 1);
    look.ty = THREE.MathUtils.clamp((e.beta - 45) / 25, -1, 1);
  }, { passive: true });
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then((s) => { if (s === 'granted') attach(); }).catch(() => {});
  } else attach();
}
if (coarse) {
  addEventListener('touchend', armGyro, { once: true, passive: true });
  // touch drag fallback until gyro is granted
  let sx = 0, sy = 0;
  addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => {
    look.tx = THREE.MathUtils.clamp((e.touches[0].clientX - sx) / 160, -1, 1);
    look.ty = THREE.MathUtils.clamp((e.touches[0].clientY - sy) / 200, -1, 1);
  }, { passive: true });
}

/* ------------------------------------------------------------
   Touching the water: the pointer casts onto the pool plane.
   A tap rings the surface (and plips, when sound is on); a
   moving cursor leaves a quiet wake behind it.
   ------------------------------------------------------------ */
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();
function poolPoint(cx, cy) {
  _ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  _ray.setFromCamera(_ndc, camera);
  const t = -_ray.ray.origin.y / _ray.ray.direction.y;
  if (!(t > 0)) return null;
  _hit.copy(_ray.ray.direction).multiplyScalar(t).add(_ray.ray.origin);
  // the visible pool: out to the fog on the sides, back to the wall's foot
  if (Math.abs(_hit.x) > 26 || _hit.z < -2.5 || _hit.z > 26) return null;
  return _hit;
}
const wake = { x: 99, z: 99, t: 0 };
addEventListener('pointermove', (e) => {
  if (coarse) return;
  const p = poolPoint(e.clientX, e.clientY);
  if (!p) return;
  const now = performance.now();
  const dx = p.x - wake.x, dz = p.z - wake.z;
  if (now - wake.t > 110 && dx * dx + dz * dz > 0.16) {
    ripple(p.x, p.z, 0.28);
    wake.x = p.x; wake.z = p.z; wake.t = now;
  }
}, { passive: true });
addEventListener('pointerdown', (e) => {
  if (e.target !== canvas) return;
  const p = poolPoint(e.clientX, e.clientY);
  if (!p) return;
  ripple(p.x, p.z, 1.0);
  plip(0.85 + Math.random() * 0.3);
  navigator.vibrate?.(10);
  dispatchEvent(new CustomEvent('waterfall:touch'));
}, { passive: true });

/* Leaning in: the wheel eases the camera toward the falls. */
let lean = 0, leanTarget = 0;
addEventListener('wheel', (e) => {
  if (reducedMotion) return;
  // a wheel over an open story panel scrolls the panel, not the camera
  if (document.documentElement.classList.contains('has-panel')) return;
  leanTarget = THREE.MathUtils.clamp(leanTarget + e.deltaY * 0.0009, 0, 1);
}, { passive: true });

/* ------------------------------------------------------------
   DOM anchors: pin elements to world points (the portfolio hook)
   ------------------------------------------------------------ */
const anchors = [];
const _v = new THREE.Vector3();
function project(v3) {
  _v.copy(v3).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * innerWidth, y: (-_v.y * 0.5 + 0.5) * innerHeight, visible: _v.z < 1 };
}
function anchor(el, x, y, z) {
  const a = { el, p: new THREE.Vector3(x, y, z) };
  anchors.push(a);
  return a;
}
document.querySelectorAll('[data-anchor]').forEach((el) => {
  // portfolio pieces leave the 3D stage in portrait: CSS docks them in a
  // swipeable shelf instead, so don't project (or hide) them here
  if (portrait && el.classList.contains('piece')) return;
  const src = (portrait && el.dataset.anchorPortrait) || el.dataset.anchor;
  const [x, y, z] = src.split(',').map(Number);
  anchor(el, x, y, z);
  // cards standing in the pool ring the water around them when noticed
  if (el.classList.contains('piece') && !el.classList.contains('piece--dry')) {
    el.querySelector('.piece-card')?.addEventListener('mouseenter', () => ripple(x, z, 0.45));
    el.addEventListener('focusin', () => ripple(x, z, 0.45));
  }
});
function updateAnchors() {
  for (const a of anchors) {
    const s = project(a.p);
    a.el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0) ${a.el.dataset.xform || ''}`;
    a.el.style.visibility = s.visible ? '' : 'hidden';
  }
}

/* ------------------------------------------------------------
   Ambient audio: synthesised roar (no file)
   ------------------------------------------------------------ */
let audio = null;
function buildAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = 0;
  // the whole mix pans gently with the visitor's gaze
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan) { master.connect(pan); pan.connect(ctx.destination); }
  else master.connect(ctx.destination);
  const len = ctx.sampleRate * 4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch); let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 420; low.Q.value = 0.4;
  const roar = ctx.createGain(); roar.gain.value = 0.8;
  src.connect(low).connect(roar).connect(master);
  const hissSrc = ctx.createBufferSource(); hissSrc.buffer = buf; hissSrc.loop = true; hissSrc.playbackRate.value = 1.7;
  const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 2600; band.Q.value = 0.5;
  const hiss = ctx.createGain(); hiss.gain.value = 0.35;
  hissSrc.connect(band).connect(hiss).connect(master);
  // sub rumble: the weight of the falls, felt more than heard
  const subSrc = ctx.createBufferSource(); subSrc.buffer = buf; subSrc.loop = true; subSrc.playbackRate.value = 0.45;
  const subLow = ctx.createBiquadFilter(); subLow.type = 'lowpass'; subLow.frequency.value = 110; subLow.Q.value = 0.4;
  const sub = ctx.createGain(); sub.gain.value = 0.5;
  subSrc.connect(subLow).connect(sub).connect(master);
  // slow swell so it breathes
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.12;
  lfo.connect(lfoG).connect(hiss.gain); lfo.start();
  src.start(); hissSrc.start(); subSrc.start();
  return { ctx, master, hiss, pan };
}
function setAudio(on) {
  if (on) {
    if (!audio) audio = buildAudio();
    audio.ctx.resume();
    // autoplay policy can hold the context until a gesture (e.g. the
    // session-restored entrance): finish waking it on the next tap
    if (audio.ctx.state === 'suspended' && !audio.kickArmed) {
      audio.kickArmed = true;
      addEventListener('pointerdown', () => audio.ctx.resume(), { once: true });
    }
    if (!paused) audio.master.gain.setTargetAtTime(0.5, audio.ctx.currentTime, 1.2);
  } else if (audio) {
    audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.6);
  }
  document.documentElement.dataset.audio = on ? 'on' : 'off';
}

/* A single water "plip" when the visitor touches the pool. */
function plip(strength = 1) {
  if (!audio || document.documentElement.dataset.audio !== 'on' || paused) return;
  const { ctx, master } = audio;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const f0 = 420 + Math.random() * 320;
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.4, t0 + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.28 * strength, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
  osc.connect(g).connect(master);
  osc.start(t0); osc.stop(t0 + 0.22);
}

/* ------------------------------------------------------------
   Adaptive quality: watch frame time for the first seconds,
   step down if the device can't hold it.
   ------------------------------------------------------------ */
let frameSamples = 0, frameAccum = 0, adapted = false;
function adapt(dt) {
  if (adapted || frameSamples < 0) return;
  if (frameSamples++ < 40) return; // warm-up
  frameAccum += dt;
  if (frameSamples < 160) return;
  const avg = frameAccum / 120;
  adapted = true;
  if (avg > 0.028 && quality !== 'low') {
    quality = quality === 'high' ? 'mid' : 'low';
    T = TIERS[quality];
    pool.getRenderTarget().setSize(T.refl, T.refl);
    bloom.enabled = T.bloom;
    resize();
    document.documentElement.dataset.quality = quality;
  }
}

/* ------------------------------------------------------------
   Loop
   ------------------------------------------------------------ */
let paused = false, hidden = false, last = performance.now(), simTime = 0;
const timeScale = reducedMotion ? 0.3 : 1;
const swayAmp = reducedMotion ? 0 : 1;
const _lookAt = new THREE.Vector3();

// Weather: layered slow sines that occasionally line up into a gust.
// 0 most of the time; swells toward 1 for a few seconds, then settles.
function gustAt(t) {
  const s = Math.sin(t * 0.10) + Math.sin(t * 0.037 + 2.4) * 0.8 + Math.sin(t * 0.21 + 5.1) * 0.45;
  return THREE.MathUtils.clamp((s - 0.9) / 1.35, 0, 1);
}
let audioClock = 0;

function frame(now) {
  requestAnimationFrame(frame);
  if (hidden || paused) { last = now; return; }
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  simTime += dt * timeScale;
  uTime.value = simTime;
  grade.uniforms.uTime.value = simTime;

  // camera: lerp toward pointer/gyro target + slow idle drift
  look.x += (look.tx - look.x) * 0.045;
  look.y += (look.ty - look.y) * 0.045;
  const idleX = Math.sin(simTime * 0.17) * 0.18 + Math.sin(simTime * 0.043) * 0.12;
  const idleY = Math.cos(simTime * 0.13) * 0.08;
  camera.position.x = CAM_BASE.x + (look.x * 0.9 + idleX) * swayAmp;
  camera.position.y = CAM_BASE.y + (-look.y * 0.45 + idleY) * swayAmp;
  camera.position.z = CAM_BASE.z + Math.abs(look.x) * 0.3 * swayAmp;
  // leaning in (wheel): ease toward the falls, gaze dropping to the pool
  lean += (leanTarget - lean) * 0.05;
  camera.position.z -= lean * 1.7;
  camera.position.y -= lean * 0.28;
  _lookAt.copy(CAM_LOOK);
  _lookAt.x += look.x * 0.25 * swayAmp;
  _lookAt.y -= lean * 0.5;
  camera.lookAt(_lookAt);

  // weather: gusts stir the mist and leaves, fray the sheets, swell the hiss
  const gust = gustAt(simTime) * (reducedMotion ? 0.3 : 1);
  for (const m of waterMats) m.uniforms.uWidthFray.value = m.userData.fray0 * (1 + gust * 0.35);
  for (const w of winds) w.u.value.copy(w.base).multiplyScalar(1 + gust * 1.7);
  for (const b of banks) {
    b.quaternion.copy(camera.quaternion);
    b.material.uniforms.uOpacity.value = b.userData.op0 * (1 + gust * 0.45);
  }
  rainbow.material.uniforms.uOpacity.value = 0.06 + 0.06 * Math.max(0, -look.x);

  // audio follows the scene: the mix pans with the gaze, gusts swell the hiss
  if (audio) {
    audioClock += dt;
    if (audioClock > 0.25) {
      audioClock = 0;
      const tA = audio.ctx.currentTime;
      audio.hiss.gain.setTargetAtTime(0.35 * (1 + gust * 0.9), tA, 0.5);
      audio.pan?.pan.setTargetAtTime(THREE.MathUtils.clamp(look.x, -1, 1) * 0.3, tA, 0.3);
    }
  }

  pool.material.uniforms.uTime.value = simTime;
  pool.material.uniforms.uCamPos.value.copy(camera.position);
  composer.render();
  updateAnchors();
  adapt(dt);

  if (!document.documentElement.classList.contains('is-ready')) {
    document.documentElement.classList.add('is-ready');
  }
}
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => { hidden = document.hidden; });

/* ------------------------------------------------------------
   Public API
   ------------------------------------------------------------ */
window.WATERFALL = {
  scene, camera, renderer, project, anchor, setAudio, ripple,
  setPaused(v) {
    paused = !!v;
    document.documentElement.dataset.paused = paused ? 'on' : 'off';
    // a frozen waterfall shouldn't roar: duck while paused, restore
    // on resume only if the user still has sound switched on
    if (audio) {
      const on = document.documentElement.dataset.audio === 'on';
      audio.master.gain.setTargetAtTime(paused ? 0 : (on ? 0.5 : 0), audio.ctx.currentTime, paused ? 0.4 : 1.2);
    }
  },
  get quality() { return quality; },
  get paused() { return paused; },
  falls: FALLS,
};
