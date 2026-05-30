// Reimagine Ranch — compost latrine wireframe viewer.
// Click any figure image on the build report → this opens a modal that loads the matching
// GLB (exported from the same Blender model as the render) and shows it as a glowing
// wireframe you can drag to rotate. Three.js r169 via importmap, UnrealBloom for the glow.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const ACCENT = 0x2dd4bf;          // teal, matches the page
const MODELS = 'models/';

// Which GLB each image maps to (data-model on the <figure> overrides this).
const DEFAULT_MODEL = 'latrine.glb';

// ---- modal shell -----------------------------------------------------------------
const modal = document.createElement('div');
modal.id = 'wire-modal';
modal.innerHTML = `
  <canvas id="wire-canvas"></canvas>
  <div class="wire-bar">
    <span class="wire-title" id="wire-title">Wireframe</span>
    <span class="wire-hint">drag to rotate · scroll to zoom · Esc to close</span>
    <button class="wire-close" id="wire-close" aria-label="Close">✕</button>
  </div>
  <div class="wire-loading" id="wire-loading">building wireframe…</div>`;
document.body.appendChild(modal);

const canvas = modal.querySelector('#wire-canvas');
const titleEl = modal.querySelector('#wire-title');
const loadingEl = modal.querySelector('#wire-loading');

let renderer, scene, camera, controls, composer, raf, model, inited = false;

function init() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070b, 0.012);
  camera = new THREE.PerspectiveCamera(46, 1, 0.1, 1000);
  scene.add(new THREE.AmbientLight(0x404040, 0.6));
  const key = new THREE.DirectionalLight(0xffeeaa, 0.4); key.position.set(5, 10, 7); scene.add(key);
  const fill = new THREE.DirectionalLight(0x6688aa, 0.25); fill.position.set(-6, 4, -5); scene.add(fill);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.85, 0.2));
  inited = true;
}

function sizeToView() {
  const w = modal.clientWidth, h = modal.clientHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const wireMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85 });

// Replace every loaded mesh with the edge-wireframe of its geometry; drop the solid faces.
function toWireframe(root) {
  const edges = new THREE.Group();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.isMesh && o.geometry) {
      const eg = new THREE.EdgesGeometry(o.geometry, 25);
      const seg = new THREE.LineSegments(eg, wireMat);
      seg.applyMatrix4(o.matrixWorld);
      edges.add(seg);
    }
  });
  return edges;
}

function frame(group) {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center);                       // recenter at origin
  const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
  const dist = radius / Math.sin((camera.fov * Math.PI / 180) / 2) * 1.25;
  camera.position.set(dist * 0.8, dist * 0.55, dist * 0.9);
  camera.near = dist / 100; camera.far = dist * 100; camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.minDistance = radius; controls.maxDistance = dist * 4;
  controls.update();
}

const loader = new GLTFLoader();

function load(file, title) {
  loadingEl.style.display = 'block';
  titleEl.textContent = title || 'Wireframe';
  if (model) { scene.remove(model); model = null; }
  loader.load(MODELS + file, (gltf) => {
    model = toWireframe(gltf.scene);
    scene.add(model);
    sizeToView();
    frame(model);
    loadingEl.style.display = 'none';
  }, undefined, (err) => {
    loadingEl.textContent = 'could not load model';
    console.error(err);
  });
}

function open(file, title) {
  if (!inited) init();
  modal.classList.add('on');
  document.body.style.overflow = 'hidden';
  sizeToView();
  load(file, title);
  if (!raf) loop();
}

function close() {
  modal.classList.remove('on');
  document.body.style.overflow = '';
  cancelAnimationFrame(raf); raf = null;
}

function loop() {
  raf = requestAnimationFrame(loop);
  if (model) model.rotation.y += 0.0025;            // slow idle spin (drag overrides)
  controls.update();
  composer.render();
}

modal.querySelector('#wire-close').addEventListener('click', close);
modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('on')) close(); });
window.addEventListener('resize', () => { if (modal.classList.contains('on')) sizeToView(); });

// Which GLB each image maps to (by its filename stem).
const MODEL_BY_IMG = {
  'iso': 'latrine.glb', 'front': 'latrine.glb', 'plan': 'latrine.glb',
  'opt-2x2': '2x2.glb', 'opt-rainwater': 'rainwater.glb', 'opt-2x2-rainwater': '2x2_rainwater.glb',
  'vent-stackfan': 'stackfan.glb', 'vent-solarchimney': 'solarchimney.glb', 'vent-cupola': 'cupola.glb',
};

document.querySelectorAll('figure img').forEach((img) => {
  const m = (img.getAttribute('src') || '').match(/img\/([^.?/]+)/);
  const file = (m && MODEL_BY_IMG[m[1]]) || DEFAULT_MODEL;
  const fig = img.closest('figure');
  const cap = fig && fig.querySelector('figcaption');
  const title = cap ? cap.textContent.trim().split('.')[0].replace(/\s+/g, ' ') : 'Compost latrine';
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', () => open(file, title));
});
