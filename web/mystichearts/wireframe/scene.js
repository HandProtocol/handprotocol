import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SVGLoader }       from 'three/addons/loaders/SVGLoader.js';
import { FontLoader }      from 'three/addons/loaders/FontLoader.js';
import { TextGeometry }    from 'three/addons/geometries/TextGeometry.js';

// ---------- Palette ----------
const COLORS = {
  heart:  0xff6b9d,  // rose
  text:   0xd4b468,  // warm gold
  wave:   0xa97cff,  // soft violet
  barn:   0xc45f3a,  // weathered rust
  ground: 0x5a3a26,  // earthy brown
  bg:     0x0a0510,  // deep night
};

// ---------- Materials ----------
const wireMat = (color, opacity = 0.82) =>
  new THREE.LineBasicMaterial({ color, transparent: true, opacity });

const glassMat = (color, opacity = 0.18) =>
  new THREE.MeshStandardMaterial({
    color: 0x080010,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.25,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });

// ---------- Renderer / Scene / Camera ----------
const canvas   = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(COLORS.bg, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(COLORS.bg, 0.028);

const camera = new THREE.PerspectiveCamera(
  58,                                      // wider FOV → stronger perspective
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
const CAM_BASE = new THREE.Vector3(-2.2, 2.0, 12.5);
const CAM_LOOK = new THREE.Vector3(0.8, 0.2, -2.5);
camera.position.copy(CAM_BASE);
camera.lookAt(CAM_LOOK);

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0x404048, 0.6));
const key = new THREE.DirectionalLight(0xffd9b3, 0.45);
key.position.set(5, 10, 7);
scene.add(key);
const fill = new THREE.DirectionalLight(0x6f7fbf, 0.3);
fill.position.set(-6, 4, -5);
scene.add(fill);

// ---------- Bloom ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.95, 0.85, 0.15
));

// ---------- Starfield ----------
{
  const N = 700;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 110;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 110;
    pos[i * 3 + 2] = -20 - Math.random() * 70;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xd4b468, size: 0.08, transparent: true, opacity: 0.45,
  })));
}

// ---------- Ground grid (sells depth via converging lines) ----------
{
  const SIZE = 60, DIV = 30, half = SIZE / 2, step = SIZE / DIV;
  const pts = [];
  for (let i = 0; i <= DIV; i++) {
    const t = -half + i * step;
    pts.push(new THREE.Vector3(-half, 0, t), new THREE.Vector3(half, 0, t));
    pts.push(new THREE.Vector3(t, 0, -half), new THREE.Vector3(t, 0, half));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const grid = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: COLORS.ground, transparent: true, opacity: 0.45,
  }));
  grid.position.y = -3.0;
  scene.add(grid);
}

// ---------- Barn (gambrel roof, classic American) ----------
function buildBarn(group, color) {
  // Gambrel profile, drawn in the X/Y plane, then extruded along Z
  const profile = new THREE.Shape();
  profile.moveTo(-2.6, 0);
  profile.lineTo(-2.6, 2.4);
  profile.lineTo(-1.8, 3.6);
  profile.lineTo( 0.0, 4.4);
  profile.lineTo( 1.8, 3.6);
  profile.lineTo( 2.6, 2.4);
  profile.lineTo( 2.6, 0);
  profile.lineTo(-2.6, 0);

  const barnGeo = new THREE.ExtrudeGeometry(profile, {
    depth: 4.2,
    bevelEnabled: false,
    curveSegments: 1,
  });
  barnGeo.translate(0, 0, -2.1); // center on Z

  group.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(barnGeo, 1),
    wireMat(color, 0.88)
  ));
  group.add(new THREE.Mesh(barnGeo, glassMat(color, 0.10)));

  // Front big sliding door
  const doorGeo = new THREE.BoxGeometry(1.4, 1.8, 0.05);
  const door = new THREE.LineSegments(new THREE.EdgesGeometry(doorGeo), wireMat(color, 0.95));
  door.position.set(0, 0.9, 2.11);
  group.add(door);

  // X-brace on door
  const xMat = wireMat(color, 0.8);
  const xPts1 = [new THREE.Vector3(-0.7, 0.0, 2.13), new THREE.Vector3(0.7, 1.8, 2.13)];
  const xPts2 = [new THREE.Vector3(-0.7, 1.8, 2.13), new THREE.Vector3(0.7, 0.0, 2.13)];
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPts1), xMat));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPts2), xMat));

  // Hayloft window high on the gable
  const loftGeo = new THREE.BoxGeometry(0.8, 0.8, 0.05);
  const loft = new THREE.LineSegments(new THREE.EdgesGeometry(loftGeo), wireMat(color, 0.9));
  loft.position.set(0, 3.3, 2.11);
  group.add(loft);

  // Side windows (two per side)
  const winGeo = new THREE.BoxGeometry(0.05, 0.6, 0.6);
  [[-2.61, 1.4, -0.7], [-2.61, 1.4, 0.7], [2.61, 1.4, -0.7], [2.61, 1.4, 0.7]].forEach((p) => {
    const w = new THREE.LineSegments(new THREE.EdgesGeometry(winGeo), wireMat(color, 0.85));
    w.position.set(...p);
    group.add(w);
  });
}

const barnGroup = new THREE.Group();
buildBarn(barnGroup, COLORS.barn);
barnGroup.position.set(4.2, -3.0, -5.0);
barnGroup.rotation.y = -0.35;            // angled to face camera
scene.add(barnGroup);

// ---------- Hearts (loaded from SVG) ----------
const heartGroup = new THREE.Group();
scene.add(heartGroup);

new SVGLoader().load('./assets/heart.svg', (data) => {
  const shapes = [];
  data.paths.forEach((p) => {
    SVGLoader.createShapes(p).forEach((s) => shapes.push(s));
  });

  // Three hearts: clustered left of barn, varying depth for parallax
  const layouts = [
    { pos: [-4.8, -0.4,  1.5], scale: 0.022, rot:  0.12, spin: 0.0040, bobAmp: 0.18, bobPhase: 0.0 },
    { pos: [-1.6,  0.6,  0.5], scale: 0.028, rot:  0.00, spin: 0.0028, bobAmp: 0.25, bobPhase: 1.4 },
    { pos: [ 1.6, -0.8, -1.0], scale: 0.020, rot: -0.10, spin: 0.0050, bobAmp: 0.20, bobPhase: 2.8 },
  ];

  layouts.forEach((cfg) => {
    const g = new THREE.Group();

    shapes.forEach((shape) => {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 12,
        bevelEnabled: true,
        bevelThickness: 1.5,
        bevelSize: 1.5,
        bevelSegments: 3,
        curveSegments: 28,
      });
      geo.center();
      // SVG y is inverted — flip so heart point hangs down
      geo.scale(1, -1, 1);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo, 12),
        wireMat(COLORS.heart, 0.92)
      );
      g.add(edges);

      const shell = new THREE.Mesh(geo, glassMat(COLORS.heart, 0.16));
      g.add(shell);
    });

    g.position.set(...cfg.pos);
    g.scale.setScalar(cfg.scale);
    g.rotation.z = cfg.rot;
    g.userData = cfg;
    heartGroup.add(g);
  });
});

// ---------- "Mystic Hearts" text ----------
const textGroup = new THREE.Group();
scene.add(textGroup);

new FontLoader().load(
  'https://threejs.org/examples/fonts/gentilis_regular.typeface.json',
  (font) => {
    const geo = new TextGeometry('Mystic Hearts', {
      font,
      size: 1.35,
      depth: 0.18,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    geo.center();

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 18),
      wireMat(COLORS.text, 0.95)
    );
    textGroup.add(edges);

    const fill = new THREE.Mesh(geo, glassMat(COLORS.text, 0.22));
    textGroup.add(fill);

    textGroup.position.set(-0.4, 3.4, 0.5);
  },
  undefined,
  (err) => console.warn('Font load failed', err)
);

// ---------- Energy wave: expanding tilted rings ----------
const WAVE_RINGS = 5;
const waveRings = [];
const waveGroup = new THREE.Group();
waveGroup.position.set(4.2, -2.95, -5.0); // emanates from the ground around the barn
scene.add(waveGroup);

for (let i = 0; i < WAVE_RINGS; i++) {
  const torusGeo = new THREE.TorusGeometry(1, 0.045, 14, 128);
  const mat = wireMat(COLORS.wave, 0.7);
  // Use the torus as a full wireframe (every triangle edge) for a soft glowing band
  const ring = new THREE.LineSegments(
    new THREE.WireframeGeometry(torusGeo),
    mat
  );
  ring.rotation.x = -Math.PI / 2 + 0.32; // tilt toward camera
  ring.userData.phase = i / WAVE_RINGS;
  waveRings.push(ring);
  waveGroup.add(ring);
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
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Hearts: gentle Y-axis sway + bob
  heartGroup.children.forEach((h) => {
    const u = h.userData;
    h.rotation.y += u.spin || 0.003;
    if (u.pos && u.bobAmp !== undefined) {
      h.position.y = u.pos[1] + Math.sin(t * 0.65 + (u.bobPhase || 0)) * u.bobAmp;
    }
  });

  // Text: slow drift
  textGroup.rotation.y = Math.sin(t * 0.28) * 0.06;
  textGroup.position.y = 3.4 + Math.sin(t * 0.55) * 0.10;

  // Subtle camera parallax — emphasizes perspective without making text unreadable
  camera.position.x = CAM_BASE.x + Math.sin(t * 0.14) * 0.45;
  camera.position.y = CAM_BASE.y + Math.cos(t * 0.11) * 0.20;
  camera.lookAt(CAM_LOOK);

  // Energy wave: expanding pulses with fade in / fade out
  waveRings.forEach((ring) => {
    const p = (t * 0.28 + ring.userData.phase) % 1;
    const scale = 0.4 + p * 9;
    ring.scale.set(scale, scale, scale);
    const fadeIn  = Math.min(p / 0.08, 1);
    const fadeOut = Math.max(0, 1 - p);
    ring.material.opacity = 0.78 * fadeIn * fadeOut;
  });

  composer.render();
}
animate();
