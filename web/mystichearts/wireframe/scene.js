import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SVGLoader }       from 'three/addons/loaders/SVGLoader.js';

// ---------- Palette ----------
const COLORS = {
  outerHeart: 0xff8fb5,
  roofHeart:  0xff5d8f,
  barn:       0xc45f3a,
  hand:       0xeac38a,
  human:      0xf5e8d4,
  ground:     0x4a2f1e,
  mist:       0xfff0d6,
  ring:       0xa97cff,
  bg:         0x0a0510,
};

// ---------- Materials ----------
const wireMat = (color, opacity = 0.85) =>
  new THREE.LineBasicMaterial({ color, transparent: true, opacity });

// ---------- Renderer / Scene / Camera ----------
const canvas   = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(COLORS.bg, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.bg);
scene.fog        = new THREE.FogExp2(COLORS.bg, 0.020);

const camera = new THREE.PerspectiveCamera(
  52,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
const CAM_RADIUS = 14;
const CAM_HEIGHT = 2.8;
const CAM_LOOK   = new THREE.Vector3(0, 2.8, 0);
camera.position.set(0, CAM_HEIGHT, CAM_RADIUS);
camera.lookAt(CAM_LOOK);

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0x40404a, 0.55));
const key = new THREE.DirectionalLight(0xffd9b3, 0.45);
key.position.set(5, 12, 7);
scene.add(key);
const fill = new THREE.DirectionalLight(0x6f7fbf, 0.30);
fill.position.set(-6, 4, -5);
scene.add(fill);

// ---------- Bloom ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.95, 0.85, 0.18
));

// ---------- Starfield ----------
{
  const N = 600;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i*3]     = (Math.random() - 0.5) * 120;
    pos[i*3 + 1] = (Math.random() - 0.5) * 120;
    pos[i*3 + 2] = -30 - Math.random() * 70;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xd4b468, size: 0.07, transparent: true, opacity: 0.40,
  })));
}

// ---------- Ground grid (subtle, under barn) ----------
{
  const SIZE = 40, DIV = 20, half = SIZE / 2, step = SIZE / DIV;
  const pts = [];
  for (let i = 0; i <= DIV; i++) {
    const t = -half + i * step;
    pts.push(new THREE.Vector3(-half, 0, t), new THREE.Vector3(half, 0, t));
    pts.push(new THREE.Vector3(t, 0, -half), new THREE.Vector3(t, 0, half));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const grid = new THREE.LineSegments(g, new THREE.LineBasicMaterial({
    color: COLORS.ground, transparent: true, opacity: 0.35,
  }));
  grid.position.y = 0;
  scene.add(grid);
}

// ---------- Barn skeleton ----------
// Posts + beams + gambrel trusses + ridge + X-braces. No walls or roof skin —
// pure structural frame so chairs/humans inside are visible from any angle.
function buildBarn(group, color) {
  const W = 3.2;     // half-width  (X)
  const D = 3.8;     // half-depth  (Z)
  const H = 4.0;     // eaves height
  const HB = 5.2;    // gambrel break height
  const WB = 1.8;    // gambrel break half-width
  const HP = 6.5;    // peak height

  const addLine = (a, b, op = 0.85) => {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    group.add(new THREE.Line(g, wireMat(color, op)));
  };
  const addPath = (pts, op = 0.85) => {
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(g, wireMat(color, op)));
  };
  const v = (x, y, z) => new THREE.Vector3(x, y, z);

  // 4 corner posts
  [[-W, -D], [W, -D], [-W, D], [W, D]].forEach(([x, z]) => {
    addLine(v(x, 0, z), v(x, H, z));
  });

  // Floor perimeter (faint)
  addPath([v(-W,0,-D), v(W,0,-D), v(W,0,D), v(-W,0,D), v(-W,0,-D)], 0.55);
  // Eave perimeter
  addPath([v(-W,H,-D), v(W,H,-D), v(W,H,D), v(-W,H,D), v(-W,H,-D)], 0.85);

  // Gambrel trusses (front and back walls)
  for (const z of [-D, D]) {
    addPath([
      v(-W, H, z), v(-WB, HB, z), v(0, HP, z),
      v(WB, HB, z), v(W, H, z)
    ], 0.9);
  }

  // Ridge beam (Z-axis)
  addLine(v(0, HP, -D), v(0, HP, D), 0.95);

  // Gambrel break beams along Z (where slope changes)
  addLine(v(-WB, HB, -D), v(-WB, HB, D), 0.85);
  addLine(v( WB, HB, -D), v( WB, HB, D), 0.85);

  // Mid rafters between trusses (a few interior rafters for depth)
  for (const z of [-D * 0.4, D * 0.4]) {
    addPath([
      v(-W, H, z), v(-WB, HB, z), v(0, HP, z),
      v(WB, HB, z), v(W, H, z)
    ], 0.4);
  }

  // X-braces on long sides (cattycorner across each side panel)
  // Left wall (x = -W)
  addLine(v(-W, 0, -D), v(-W, H,  D), 0.45);
  addLine(v(-W, H, -D), v(-W, 0,  D), 0.45);
  // Right wall (x = +W)
  addLine(v( W, 0, -D), v( W, H,  D), 0.45);
  addLine(v( W, H, -D), v( W, 0,  D), 0.45);

  // X-brace on back wall only (front stays open for camera view)
  addLine(v(-W, 0, -D), v( W, H, -D), 0.35);
  addLine(v( W, 0, -D), v(-W, H, -D), 0.35);
}

const barnGroup = new THREE.Group();
buildBarn(barnGroup, COLORS.barn);
scene.add(barnGroup);

// ---------- Hand-chair (palm seat + finger backrest) ----------
function buildHandChair(group, color) {
  // Base column from floor to seat
  const baseGeo = new THREE.CylinderGeometry(0.10, 0.14, 0.5, 8);
  baseGeo.translate(0, 0.25, 0);
  group.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(baseGeo), wireMat(color, 0.65)
  ));

  // Palm rim — torus at seat height
  const rimRadius = 0.48;
  const seatY = 0.55;
  const rimGeo = new THREE.TorusGeometry(rimRadius, 0.025, 8, 32);
  rimGeo.rotateX(Math.PI / 2);  // lay flat
  rimGeo.translate(0, seatY, 0);
  group.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(rimGeo, 1), wireMat(color, 0.85)
  ));

  // Palm webbing — 4 crossing diameters at seat height (the cupped surface)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    const x = Math.cos(a) * rimRadius;
    const z = Math.sin(a) * rimRadius;
    const pts = [
      new THREE.Vector3(-x, seatY, -z),
      new THREE.Vector3(0, seatY - 0.05, 0),   // slight dip = cupped palm
      new THREE.Vector3( x, seatY,  z),
    ];
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(g, wireMat(color, 0.55)));
  }

  // Five finger backrest tubes from back arc, curling up and slightly inward
  const FINGER_COUNT = 5;
  for (let i = 0; i < FINGER_COUNT; i++) {
    // back-half arc from -160° to -20° (relative to +z)
    const a = Math.PI + (-0.7 + (i / (FINGER_COUNT - 1)) * 1.4);
    const bx = Math.cos(a) * rimRadius;
    const bz = Math.sin(a) * rimRadius;
    const tipFactor = 0.55;
    const pts = [
      new THREE.Vector3(bx, seatY, bz),
      new THREE.Vector3(bx * 1.02, seatY + 0.25, bz * 1.02),
      new THREE.Vector3(bx * 0.92, seatY + 0.55, bz * 0.85),
      new THREE.Vector3(bx * 0.78, seatY + 0.80, bz * 0.72),
      new THREE.Vector3(bx * tipFactor, seatY + 0.95, bz * tipFactor),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 14, 0.035, 6, false);
    group.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(tubeGeo, 1), wireMat(color, 0.85)
    ));
  }
}

// ---------- Human figure (head + tapered torso, seated) ----------
function buildHuman(group, color) {
  // Torso: tapered cylinder, narrower at top (shoulders) wider at bottom (hips)
  const torsoGeo = new THREE.CylinderGeometry(0.18, 0.30, 0.65, 10, 2, true);
  torsoGeo.translate(0, 0.325, 0);  // base at y=0
  group.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(torsoGeo, 18), wireMat(color, 0.90)
  ));

  // Head: sphere
  const headGeo = new THREE.SphereGeometry(0.17, 14, 10);
  headGeo.translate(0, 0.85, 0);
  group.add(new THREE.LineSegments(
    new THREE.WireframeGeometry(headGeo), wireMat(color, 0.80)
  ));

  // Hands resting in lap — small sphere at front-low
  const lapGeo = new THREE.SphereGeometry(0.10, 10, 8);
  lapGeo.translate(0, 0.20, 0.20);
  group.add(new THREE.LineSegments(
    new THREE.WireframeGeometry(lapGeo), wireMat(color, 0.70)
  ));
}

// Layout: 3 chair+human pairs in a slight arc on the barn floor, facing camera
const SEAT_Y = 0.55;
const PAIRS = [
  { x: -2.3, z:  0.6, phase: 0.0 },
  { x:  0.0, z:  1.2, phase: 1.4 },
  { x:  2.3, z:  0.6, phase: 2.8 },
];

const humanGroups = [];
PAIRS.forEach((p) => {
  const chair = new THREE.Group();
  buildHandChair(chair, COLORS.hand);
  chair.position.set(p.x, 0, p.z);
  scene.add(chair);

  const human = new THREE.Group();
  buildHuman(human, COLORS.human);
  human.position.set(p.x, SEAT_Y, p.z);
  human.userData = { basePos: [p.x, SEAT_Y, p.z], phase: p.phase };
  scene.add(human);
  humanGroups.push(human);
});

// ---------- Outer heart + roof hearts (loaded from SVG) ----------
// Outer heart frames the whole scene; roof hearts perch along the ridge.
// All hearts billboard toward the camera so the silhouette stays clean.
const outerHeartGroup = new THREE.Group();
const roofHeartGroups = [];
scene.add(outerHeartGroup);

new SVGLoader().load('./assets/heart.svg', (data) => {
  // Build outline-only LineLoops (no fill) from the shape perimeter
  const outlines = [];
  data.paths.forEach((p) => {
    SVGLoader.createShapes(p).forEach((s) => {
      const pts = s.getPoints(120).map((pt) => new THREE.Vector3(pt.x, -pt.y, 0));
      outlines.push(pts);
    });
  });

  // --- Outer heart: huge, behind the barn, dim glow ---
  outlines.forEach((pts) => {
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.LineLoop(g, wireMat(COLORS.outerHeart, 0.85));
    outerHeartGroup.add(line);
  });
  outerHeartGroup.position.set(0, 3.6, -4.5);
  outerHeartGroup.scale.setScalar(0.072);   // ~13 wide × 9.4 tall

  // --- Roof hearts: 3 small ones along the ridge ---
  const roofLayouts = [
    { pos: [-2.4, 7.2,  0.0], scale: 0.0050, phase: 0.0 },
    { pos: [ 0.0, 7.9,  0.0], scale: 0.0070, phase: 1.2 },
    { pos: [ 2.4, 7.2,  0.0], scale: 0.0050, phase: 2.4 },
  ];
  roofLayouts.forEach((cfg) => {
    const g = new THREE.Group();
    outlines.forEach((pts) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      g.add(new THREE.LineLoop(geo, wireMat(COLORS.roofHeart, 0.95)));
    });
    g.position.set(...cfg.pos);
    g.scale.setScalar(cfg.scale);
    g.userData = { basePos: [...cfg.pos], phase: cfg.phase };
    roofHeartGroups.push(g);
    scene.add(g);
  });
});

// ---------- Particle mist (3 streams rising from humans toward outer heart) ----------
const PARTICLES_PER_STREAM = 70;
const STREAM_COUNT         = PAIRS.length;
const PARTICLE_TOTAL       = PARTICLES_PER_STREAM * STREAM_COUNT;
const particlePos          = new Float32Array(PARTICLE_TOTAL * 3);
const particleState        = [];

for (let i = 0; i < PARTICLE_TOTAL; i++) {
  particleState.push({
    streamIdx: Math.floor(i / PARTICLES_PER_STREAM),
    life:      Math.random(),
    speed:     0.7 + Math.random() * 0.6,
    swirlAng:  Math.random() * Math.PI * 2,
    swirlR:    0.08 + Math.random() * 0.18,
    swirlRate: 0.4 + Math.random() * 0.8,
  });
  particlePos[i*3]     = 0;
  particlePos[i*3 + 1] = -999;
  particlePos[i*3 + 2] = 0;
}

const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
  color: COLORS.mist,
  size: 0.075,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
}));
scene.add(particles);

// ---------- Ground energy ring (subtle pulse at barn center) ----------
const RING_COUNT = 4;
const groundRings = [];
const groundRingGroup = new THREE.Group();
groundRingGroup.position.set(0, 0.02, 0); // just above grid
scene.add(groundRingGroup);

for (let i = 0; i < RING_COUNT; i++) {
  const geo = new THREE.TorusGeometry(1, 0.025, 10, 96);
  const ring = new THREE.LineSegments(
    new THREE.WireframeGeometry(geo),
    wireMat(COLORS.ring, 0.55)
  );
  ring.rotation.x = -Math.PI / 2;
  ring.userData.phase = i / RING_COUNT;
  groundRings.push(ring);
  groundRingGroup.add(ring);
}

// ---------- Resize ----------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// ---------- Animate ----------
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Camera: subtle orbit so the barn's depth reads
  const orbit = REDUCED_MOTION ? 0 : Math.sin(t * 0.10) * 0.18;
  camera.position.x = Math.sin(orbit) * CAM_RADIUS;
  camera.position.z = Math.cos(orbit) * CAM_RADIUS;
  camera.position.y = CAM_HEIGHT + (REDUCED_MOTION ? 0 : Math.sin(t * 0.07) * 0.12);
  camera.lookAt(CAM_LOOK);

  // Outer heart: billboard to face camera, gentle breathing
  outerHeartGroup.lookAt(camera.position);
  const breath = 0.072 * (1 + (REDUCED_MOTION ? 0 : Math.sin(t * 0.6) * 0.018));
  outerHeartGroup.scale.setScalar(breath);

  // Roof hearts: billboard, small bob
  roofHeartGroups.forEach((h) => {
    h.lookAt(camera.position);
    if (!REDUCED_MOTION) {
      h.position.y = h.userData.basePos[1] + Math.sin(t * 0.9 + h.userData.phase) * 0.08;
    }
  });

  // Humans: gentle breathing scale + slight bob
  humanGroups.forEach((h) => {
    const u = h.userData;
    if (REDUCED_MOTION) return;
    const s = 1 + Math.sin(t * 0.9 + u.phase) * 0.022;
    h.scale.set(s, s, s);
    h.position.y = u.basePos[1] + Math.sin(t * 0.55 + u.phase) * 0.04;
  });

  // Particle streams: each particle rises from a human and drifts toward outer heart center
  const heartCenter = outerHeartGroup.position;
  for (let i = 0; i < PARTICLE_TOTAL; i++) {
    const s = particleState[i];
    s.life += 0.0035 * s.speed;
    if (s.life > 1) s.life -= 1;

    const h = humanGroups[s.streamIdx];
    if (!h) continue;

    const life = s.life;
    // start at human's chest, drift toward heart center
    const startX = h.position.x;
    const startY = h.position.y + 0.55;
    const startZ = h.position.z;
    const x = startX + (heartCenter.x - startX) * life;
    const y = startY + (heartCenter.y - startY) * life;
    const z = startZ + (heartCenter.z - startZ) * life;
    // add swirl that grows with life
    const ang = s.swirlAng + t * s.swirlRate;
    const r   = s.swirlR * (0.4 + life * 1.6);
    particlePos[i*3]     = x + Math.cos(ang) * r;
    particlePos[i*3 + 1] = y + Math.sin(ang * 0.7) * r * 0.5;
    particlePos[i*3 + 2] = z + Math.sin(ang) * r;
  }
  particleGeo.attributes.position.needsUpdate = true;

  // Ground rings: expanding fade pulse
  groundRings.forEach((ring) => {
    const p = (t * 0.22 + ring.userData.phase) % 1;
    const scale = 0.3 + p * 7;
    ring.scale.set(scale, scale, scale);
    const fadeIn  = Math.min(p / 0.10, 1);
    const fadeOut = Math.max(0, 1 - p);
    ring.material.opacity = 0.55 * fadeIn * fadeOut;
  });

  composer.render();
}
animate();
