/* ============================================================
   /3dhand-test/ — focused hand visualization
   J-Toastie's rigged GLB rendered as wireframe + glowing joint nodes.
   Auto-cycles through give → receive → together → grow.
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const HAND_GLB = 'models/jtoastie-rigged-hand.glb';
// Start from neutral — user dials in orientation via on-screen controls.
// Bake the final picked values back here once they're chosen.
const HAND_BASE_ROTATION = [0, 0, 0];

const COLOR_EDGE = 0xfbbf24;
const COLOR_FILL = 0xd97706;
const COLOR_NODE_CORE = 0xfffbeb;
const COLOR_NODE_HALO = 0xfde68a;

const POSES = ['give', 'receive', 'together', 'grow'];

const POSE_DATA = {
  give: {
    label: 'Give',
    sub: 'An act of giving forward, before any return is named.',
  },
  receive: {
    label: 'Receive',
    sub: 'Healers, builders, organizers receive long-arc support. Not a grant cycle. A pool of resources.',
  },
  together: {
    label: 'Together',
    sub: 'Three communities of regenerative impact, coordinating in one place.',
  },
  grow: {
    label: 'Grow',
    sub: 'What was given becomes infrastructure. Infrastructure compounds.',
  },
};

const BONE_POSES = {
  give: {
    thumb:  [-0.3, 0.2, 0.2],
    index:  [0.35, 0.5, 0.45],
    middle: [0.35, 0.5, 0.45],
    ring:   [0.4, 0.55, 0.45],
    pinky:  [0.45, 0.6, 0.5],
  },
  receive: {
    thumb:  [-0.55, 0.0, 0.0],
    index:  [-0.05, -0.05, 0.0],
    middle: [-0.05, -0.05, 0.0],
    ring:   [-0.05, -0.05, 0.0],
    pinky:  [-0.05, -0.05, 0.0],
  },
  together: {
    thumb:  [-0.7, 0.8, 0.7],
    index:  [1.3, 1.5, 1.3],
    middle: [1.3, 1.5, 1.3],
    ring:   [1.3, 1.5, 1.3],
    pinky:  [1.3, 1.5, 1.3],
  },
  grow: {
    thumb:  [-0.5, 0.6, 0.6],
    index:  [-0.05, -0.05, 0.0],
    middle: [1.3, 1.5, 1.3],
    ring:   [1.3, 1.5, 1.3],
    pinky:  [1.3, 1.5, 1.3],
  },
};

const BONE_MAP = {
  thumb:  ['ThumbRoot', 'ThumbMiddle', 'ThumbTop'],
  index:  ['IndexF_lower', 'IndexF_middle', 'IndexF_tip'],
  middle: ['MiddleF_lower', 'MiddleF_middle', 'MiddleF_tip'],
  ring:   ['RingF_lower', 'RingF_middle', 'RingF_tip'],
  pinky:  ['PinkyF_lower', 'PinkyF_middle', 'PinkyF_tip'],
};

/* ============================================================ */

const canvas = document.getElementById('hand-canvas');
const poseLabel = document.getElementById('pose-label');
const poseSub = document.getElementById('pose-sub');
const poseDots = document.getElementById('pose-dots');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.01, 10000);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Cinematic lighting
scene.add(new THREE.AmbientLight(0xfff4e0, 0.55));
const keyLight = new THREE.DirectionalLight(0xffd28a, 1.1);
keyLight.position.set(3, 5, 4);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x6cd5c0, 0.5);
rimLight.position.set(-3, 1, -2);
scene.add(rimLight);
const underLight = new THREE.DirectionalLight(0xfbbf24, 0.3);
underLight.position.set(0, -3, 2);
scene.add(underLight);

const pivot = new THREE.Group();
scene.add(pivot);

let boneRefs = null;
let modelLoaded = false;
let queuedPose = null;
let modelRootRef = null;     // exposed so the on-screen rotation controls can drive it

/* ============================================================
   Load model
   ============================================================ */

const loader = new GLTFLoader();
loader.load(HAND_GLB, (gltf) => {
  const modelRoot = gltf.scene;
  gltf.animations.length = 0;

  // Wireframe material — applied directly to SkinnedMesh so wireframe
  // deforms with skinning.
  const wireMat = new THREE.MeshStandardMaterial({
    color: COLOR_EDGE,
    wireframe: true,
    transparent: true,
    opacity: 0.9,
  });
  const fillMat = new THREE.MeshStandardMaterial({
    color: COLOR_FILL,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const bones = [];
  modelRoot.traverse((obj) => {
    if (obj.isCamera || obj.isLight) obj.visible = false;
    if (obj.isSkinnedMesh) {
      // Two-pass render: faint solid fill underneath, wireframe over top
      const fillMesh = obj.clone();
      fillMesh.material = fillMat;
      fillMesh.bind(obj.skeleton, obj.bindMatrix);
      obj.parent.add(fillMesh);
      obj.material = wireMat;
    }
    if (obj.isBone) bones.push(obj);
  });

  pivot.add(modelRoot);
  modelRoot.rotation.set(...HAND_BASE_ROTATION);
  modelRoot.updateMatrixWorld(true);
  modelRootRef = modelRoot;     // expose for orientation controls

  // Fit camera to model
  const box = new THREE.Box3();
  let mc = 0;
  modelRoot.traverse((obj) => {
    if (obj.isMesh || obj.isSkinnedMesh) {
      if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
      const lb = obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld);
      if (mc === 0) box.copy(lb); else box.union(lb);
      mc++;
    }
  });
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;

  modelRoot.position.sub(center);
  modelRoot.updateMatrixWorld(true);

  const fitDist = (maxDim / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);
  camera.position.set(0, 0, fitDist * 1.6);
  camera.near = maxDim * 0.001;
  camera.far = maxDim * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0);

  // Glowing joint nodes — scale-compensated per bone
  const fingerBones = bones.filter((b) => /^(Thumb|Index|Middle|Ring|Pinky)/.test(b.name) && !/_end$/.test(b.name));
  const targetCoreR = maxDim * 0.013;
  const targetHaloR = maxDim * 0.03;
  const unitGeom = new THREE.SphereGeometry(1, 14, 12);
  const coreMat = new THREE.MeshBasicMaterial({ color: COLOR_NODE_CORE });
  const haloMat = new THREE.MeshBasicMaterial({
    color: COLOR_NODE_HALO,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const haloMeshes = [];
  fingerBones.forEach((bone) => {
    bone.updateMatrixWorld(true);
    bone.matrixWorld.decompose(_v, _q, _s);
    const avg = (Math.abs(_s.x) + Math.abs(_s.y) + Math.abs(_s.z)) / 3;
    if (avg < 1e-9) return;
    const core = new THREE.Mesh(unitGeom, coreMat);
    core.scale.setScalar(targetCoreR / avg);
    bone.add(core);
    const halo = new THREE.Mesh(unitGeom, haloMat);
    halo.scale.setScalar(targetHaloR / avg);
    bone.add(halo);
    haloMeshes.push({ halo, baseScale: targetHaloR / avg });
  });

  // Resolve pose-driving bone references
  boneRefs = { fingers: {}, rest: {} };
  let resolved = 0, missing = 0;
  Object.entries(BONE_MAP).forEach(([finger, names]) => {
    boneRefs.fingers[finger] = names.map((n) => {
      const b = modelRoot.getObjectByName(n);
      if (!b) { console.warn(`bone missing: ${n}`); missing++; } else resolved++;
      return b || null;
    });
    boneRefs.rest[finger] = boneRefs.fingers[finger].map((b) => b ? b.rotation.x : 0);
  });
  console.log(`[hand] ${resolved}/${resolved+missing} bones resolved`);

  // Halo pulse — slight rhythmic glow
  modelLoaded = true;
  haloMeshesRef = haloMeshes;
  if (queuedPose) { applyPose(queuedPose); queuedPose = null; }
}, undefined, (err) => {
  console.error('Failed to load hand GLB:', err);
});

let haloMeshesRef = [];

/* ============================================================
   Pose driver + auto-cycle
   ============================================================ */

let currentPoseIndex = 0;
let cycleTimer = null;

function applyPose(poseName, opts = {}) {
  if (!modelLoaded) { queuedPose = poseName; return; }
  const pose = BONE_POSES[poseName];
  if (!pose || !boneRefs) return;

  Object.entries(pose).forEach(([finger, curls]) => {
    const refs = boneRefs.fingers[finger];
    const rests = boneRefs.rest[finger];
    if (!refs) return;
    refs.forEach((bone, i) => {
      if (!bone) return;
      anime({
        targets: bone.rotation,
        x: rests[i] + curls[i],
        duration: 1400,
        easing: 'easeInOutQuad',
      });
    });
  });

  // Caption swap with fade
  const data = POSE_DATA[poseName];
  if (data) {
    poseLabel.classList.remove('is-show');
    poseSub.classList.remove('is-show');
    setTimeout(() => {
      poseLabel.textContent = data.label;
      poseSub.textContent = data.sub;
      poseLabel.classList.add('is-show');
      poseSub.classList.add('is-show');
    }, 300);
  }

  // Dot indicator
  poseDots.querySelectorAll('.dot').forEach((d) => {
    d.classList.toggle('is-active', d.dataset.pose === poseName);
  });
}

function advancePose() {
  currentPoseIndex = (currentPoseIndex + 1) % POSES.length;
  applyPose(POSES[currentPoseIndex]);
}

function startCycle() {
  stopCycle();
  cycleTimer = setInterval(advancePose, 3400);
}
function stopCycle() {
  if (cycleTimer) clearInterval(cycleTimer);
  cycleTimer = null;
}

// Click a dot to jump
poseDots.addEventListener('click', (e) => {
  const dot = e.target.closest('.dot');
  if (!dot) return;
  const pose = dot.dataset.pose;
  currentPoseIndex = POSES.indexOf(pose);
  applyPose(pose);
  // Reset cycle so we don't immediately advance away
  startCycle();
});

/* ============================================================
   Resize + render loop
   ============================================================ */

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

const clock = new THREE.Clock();
function renderLoop() {
  const t = clock.getElapsedTime();
  // Gentle idle breathing on the pivot
  pivot.rotation.y = Math.sin(t * 0.3) * 0.1;
  pivot.position.y = Math.sin(t * 0.5) * (modelLoaded ? 0.02 : 0) * (camera.position.z * 0.05);
  // Halo pulse
  if (haloMeshesRef.length) {
    const pulse = 0.92 + Math.sin(t * 1.8) * 0.08;
    haloMeshesRef.forEach(({ halo, baseScale }) => {
      halo.scale.setScalar(baseScale * pulse);
    });
  }
  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}
renderLoop();

/* ============================================================
   Boot
   ============================================================ */

// Set initial caption
poseLabel.textContent = POSE_DATA.give.label;
poseSub.textContent = POSE_DATA.give.sub;
setTimeout(() => {
  poseLabel.classList.add('is-show');
  poseSub.classList.add('is-show');
}, 200);

applyPose('give');
startCycle();

/* ============================================================
   Orientation controls
   Click X/Y/Z ± buttons to nudge modelRoot's rotation in 15° steps.
   Readout shows current rotation in degrees. Reset zeroes everything.
   Once the right orientation is dialed in, the values can be copied
   into HAND_BASE_ROTATION at the top of this file.
   ============================================================ */

const rotControls = document.getElementById('rot-controls');
const rotReadout = document.getElementById('rot-readout');
const rotReset = document.getElementById('rot-reset');

function updateReadout() {
  if (!modelRootRef) return;
  const r = modelRootRef.rotation;
  const deg = (rad) => Math.round(rad * 180 / Math.PI);
  rotReadout.textContent = `x: ${deg(r.x)}°  y: ${deg(r.y)}°  z: ${deg(r.z)}°`;
}

rotControls.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-axis]');
  if (!btn || !modelRootRef) return;
  const axis = btn.dataset.axis;
  const dir = parseInt(btn.dataset.dir, 10);
  modelRootRef.rotation[axis] += dir * Math.PI / 12;  // 15° steps
  updateReadout();
});

rotReset.addEventListener('click', () => {
  if (!modelRootRef) return;
  modelRootRef.rotation.set(0, 0, 0);
  updateReadout();
});

// Refresh readout after load completes
const readoutInterval = setInterval(() => {
  if (modelRootRef) {
    updateReadout();
    clearInterval(readoutInterval);
  }
}, 200);
