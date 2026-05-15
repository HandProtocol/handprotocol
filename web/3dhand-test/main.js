/* ============================================================
   /3dhand-test/ — focused hand visualization
   Ported from loading.html's WORKING hand orientation values.
   pivot → turn → orient nested groups; orient holds the
   dialed-in rotation that makes palm face the camera.
   Plus +90° X rotation on pivot per user spec.
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const HAND_GLB = 'models/jtoastie-rigged-hand.glb';

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

// Lighting from loading.html — warm amber rim + cool fill
scene.add(new THREE.AmbientLight(0xfff2d6, 0.55));
const key = new THREE.DirectionalLight(0xffcc88, 1.1);
key.position.set(2.5, 3, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0xff8a3d, 0.9);
rim.position.set(-3, 1.5, -2);
scene.add(rim);
const fillLight = new THREE.DirectionalLight(0x88aaff, 0.25);
fillLight.position.set(-1, -2, 2);
scene.add(fillLight);

// Three-group rig from loading.html:
//   pivot  — animated wobble + the +90° X rotation
//   turn   — reserved (not used here, kept for parity)
//   orient — the locked-in dialed orientation values
const pivot = new THREE.Group();
scene.add(pivot);
const turn = new THREE.Group();
pivot.add(turn);
const orient = new THREE.Group();
turn.add(orient);

let modelLoaded = false;
let queuedPose = null;
let boneRefs = null;

/* ============================================================
   Load model
   ============================================================ */

const loader = new GLTFLoader();
loader.load(HAND_GLB, (gltf) => {
  const modelRoot = gltf.scene;
  if (gltf.animations?.length) gltf.animations.length = 0;

  // Two-pass render: solid amber base + wireframe overlay so we keep
  // the warm glow but get the wireframe protocol look back on top.
  modelRoot.traverse((obj) => {
    if (obj.isCamera || obj.isLight) obj.visible = false;
    if (obj.isMesh || obj.isSkinnedMesh) {
      obj.material = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0x4a1f00,
        emissiveIntensity: 0.25,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.65,         // dimmed slightly so wireframe reads on top
        side: THREE.DoubleSide,
      });

      // Wireframe clone — same skinning, deforms with poses
      const wireMesh = obj.clone();
      wireMesh.material = new THREE.MeshStandardMaterial({
        color: 0xfde68a,        // brighter cream amber
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      });
      if (obj.isSkinnedMesh) {
        wireMesh.bind(obj.skeleton, obj.bindMatrix);
      }
      obj.parent.add(wireMesh);
    }
  });

  orient.add(modelRoot);
  modelRoot.updateMatrixWorld(true);

  // Mesh-only bbox for fit math
  const box = new THREE.Box3();
  let mc = 0;
  modelRoot.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      if (mc === 0) box.copy(b); else box.union(b);
      mc++;
    }
  });
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  modelRoot.position.sub(center);

  // EXACT WORKING ORIENTATION VALUES from loading.html
  orient.rotation.set(-6.0214, 1.8090, -1.8326);

  // Base tilt. Bumped X for a slight leftward spin per spec.
  pivot.rotation.x = 0.2;
  pivot.rotation.y = -0.15;

  // Camera frame
  const fitDist = (maxDim / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);
  camera.position.set(0, 0, fitDist * 1.85);
  camera.near = maxDim * 0.01;
  camera.far = maxDim * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0);

  // Resolve bone refs and capture rest pose
  boneRefs = { fingers: {}, rest: {} };
  Object.entries(BONE_MAP).forEach(([finger, names]) => {
    boneRefs.fingers[finger] = names.map((n) => modelRoot.getObjectByName(n) || null);
    boneRefs.rest[finger] = boneRefs.fingers[finger].map((b) => b ? b.rotation.x : 0);
  });

  modelLoaded = true;
  if (queuedPose) { applyPose(queuedPose); queuedPose = null; }
}, undefined, (err) => {
  console.error('GLB load error:', err);
});

/* ============================================================
   Pose driver + auto-cycle
   ============================================================ */

let currentPoseIndex = 0;
let cycleTimer = null;

function applyPose(poseName) {
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

  poseDots.querySelectorAll('.dot').forEach((d) => {
    d.classList.toggle('is-active', d.dataset.pose === poseName);
  });
}

function advancePose() {
  currentPoseIndex = (currentPoseIndex + 1) % POSES.length;
  applyPose(POSES[currentPoseIndex]);
}
function startCycle() {
  if (cycleTimer) clearInterval(cycleTimer);
  cycleTimer = setInterval(advancePose, 3400);
}

poseDots.addEventListener('click', (e) => {
  const dot = e.target.closest('.dot');
  if (!dot) return;
  const pose = dot.dataset.pose;
  currentPoseIndex = POSES.indexOf(pose);
  applyPose(pose);
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
  if (modelLoaded) {
    pivot.rotation.x = 0.2 + Math.sin(t * 0.4) * 0.04;
    pivot.rotation.y = -0.15 + Math.sin(t * 0.6) * 0.08;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}
renderLoop();

/* ============================================================
   Boot
   ============================================================ */

poseLabel.textContent = POSE_DATA.give.label;
poseSub.textContent = POSE_DATA.give.sub;
setTimeout(() => {
  poseLabel.classList.add('is-show');
  poseSub.classList.add('is-show');
}, 200);

applyPose('give');
startCycle();
