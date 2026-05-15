/* ============================================================
   3D Hand Test — three spikes, one scroll story
   Spike A: Three.js with rigged J-Toastie GLB (wireframe + glowing nodes)
   Spike B: SVG hand with anime.js joint rotations
   Spike C: Frame sequence crossfade
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const POSES = ['give', 'receive', 'together', 'grow'];
const POSE_LABEL = { give: 'Give', receive: 'Receive', together: 'Together', grow: 'Grow' };

// Sign-language pose curl values (radians) per finger × phalanx.
// Driven onto J-Toastie's rig — same bone-axis convention as the
// procedural hand (curl on rotation.x).
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

// J-Toastie's bone names (Thumb has only 3 phalanges; we map proximal/middle/distal)
const BONE_MAP = {
  thumb:  ['ThumbRoot', 'ThumbMiddle', 'ThumbTop'],
  index:  ['IndexF_lower', 'IndexF_middle', 'IndexF_tip'],
  middle: ['MiddleF_lower', 'MiddleF_middle', 'MiddleF_tip'],
  ring:   ['RingF_lower', 'RingF_middle', 'RingF_tip'],
  pinky:  ['PinkyF_lower', 'PinkyF_middle', 'PinkyF_tip'],
};

/* ============================================================
   SPIKE A — Three.js with J-Toastie rigged GLB
   Wireframe + glowing joint nodes, scroll-driven bone poses.
   The wireframe material is applied to the SkinnedMesh itself so the
   wireframe deforms with the skin (unlike EdgesGeometry which is static).
   ============================================================ */

const COLOR_EDGE = 0xfbbf24;        // warm amber
const COLOR_FILL = 0xd97706;        // accent
const COLOR_NODE_CORE = 0xfffbeb;   // pale cream
const COLOR_NODE_HALO = 0xfde68a;   // pale gold

const HAND_GLB = 'models/jtoastie-rigged-hand.glb';
// FBX2glTF default orientation needs a 90° X flip to stand the hand upright.
const HAND_BASE_ROTATION = [-Math.PI / 2, 0, 0];

function initThreeSpike() {
  const canvas = document.getElementById('three-canvas');
  if (!canvas) return null;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10000);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Lighting — soft ambient + warm key + cool rim so the wireframe
  // gets subtle depth shading without losing the x-ray feel.
  scene.add(new THREE.AmbientLight(0xfff4e0, 0.7));
  const keyLight = new THREE.DirectionalLight(0xffd28a, 0.8);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x6cd5c0, 0.4);
  rimLight.position.set(-4, 2, -3);
  scene.add(rimLight);

  // Pivot we rotate; hand mesh + nodes both attach inside
  const pivot = new THREE.Group();
  scene.add(pivot);

  // State filled after async load
  let boneRefs = null;   // { fingers: { thumb: [bone,...], ... }, rest: {...} }
  let modelLoaded = false;
  let queuedPose = null;

  // ---------- Load J-Toastie GLB ----------
  const loader = new GLTFLoader();
  loader.load(HAND_GLB, (gltf) => {
    const modelRoot = gltf.scene;
    // Discard the baked animation that ships with the model
    gltf.animations.length = 0;

    // Wireframe material applied directly to SkinnedMesh — Three.js's
    // shader handles skinning, so wireframe lines DEFORM with the pose
    // (unlike EdgesGeometry which is static rest-pose only).
    const wireMat = new THREE.MeshStandardMaterial({
      color: COLOR_EDGE,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    // A second, faint solid pass underneath for x-ray fill
    const fillMat = new THREE.MeshStandardMaterial({
      color: COLOR_FILL,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const bones = [];
    modelRoot.traverse((obj) => {
      if (obj.isCamera || obj.isLight) obj.visible = false;
      if (obj.isSkinnedMesh) {
        // Clone the skinned mesh so we can render both fill + wireframe
        // versions of the same skin in one pass each.
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

    // Mesh-only bbox (cameras/lights got hidden above but exclude them
    // from bbox math too in case Three.js still factors them in).
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

    // Adapt camera to actual model size (J-Toastie is at ~km scale due
    // to FBX2glTF's 100× × 380× scale baking — don't fight it, just fit).
    const fitDist = (maxDim / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);
    camera.position.set(0, 0, fitDist * 1.6);
    camera.near = maxDim * 0.001;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);

    // ---------- Glowing joint nodes (scale-compensated per bone) ----------
    const fingerBones = bones.filter((b) => {
      const n = b.name;
      return /^(Thumb|Index|Middle|Ring|Pinky)/.test(n) && !/_end$/.test(n);
    });
    const targetCoreR = maxDim * 0.012;
    const targetHaloR = maxDim * 0.028;
    const unitGeom = new THREE.SphereGeometry(1, 12, 10);
    const coreMat = new THREE.MeshBasicMaterial({ color: COLOR_NODE_CORE });
    const haloMat = new THREE.MeshBasicMaterial({
      color: COLOR_NODE_HALO,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
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
    });

    // ---------- Resolve bone refs for pose driving ----------
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

    modelLoaded = true;
    // If a pose was requested while loading, apply it now
    if (queuedPose) { applyPose(queuedPose, 0); queuedPose = null; }
  }, undefined, (err) => {
    console.error('Failed to load hand GLB:', err);
  });

  // ---------- Pose driver ----------
  function applyPose(poseName, duration = 1100) {
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
          duration,
          easing: 'easeInOutQuad',
        });
      });
    });
  }

  // ---------- Resize ----------
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(canvas);

  // ---------- Render loop with subtle idle drift ----------
  const clock = new THREE.Clock();
  function renderLoop() {
    const t = clock.getElapsedTime();
    pivot.rotation.y = Math.sin(t * 0.3) * 0.08;
    pivot.position.y = Math.sin(t * 0.6) * (modelLoaded ? 0.02 : 0);
    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
  }
  renderLoop();

  // Initial pose (queued until load completes)
  applyPose('give', 0);

  return { applyPose };
}


/* ============================================================
   SPIKE B — SVG hand
   Each finger group has nested pivots (proximal -> middle -> distal).
   We animate the rotate() inside their transform attribute via anime.js.
   ============================================================ */

function initSvgSpike() {
  const root = document.getElementById('svg-hand');
  if (!root) return null;

  // Per-pose target angles (degrees) for each joint.
  // Joint nesting: pivot rotates relative to its parent, so cumulative curl
  // appears naturally. Positive = curl toward palm.
  const SVG_POSES = {
    give: {
      thumbP: -15, thumbD: -25,
      indexP: 25, indexM: 30, indexD: 25,
      middleP: 28, middleM: 32, middleD: 25,
      ringP: 30, ringM: 35, ringD: 28,
      pinkyP: 35, pinkyM: 38, pinkyD: 30,
      rootR: 0,
    },
    receive: {
      thumbP: -45, thumbD: 0,
      indexP: -5, indexM: 0, indexD: 0,
      middleP: -3, middleM: 0, middleD: 0,
      ringP: -2, ringM: 0, ringD: 0,
      pinkyP: 0, pinkyM: 0, pinkyD: 0,
      rootR: 0,
    },
    together: {
      thumbP: -55, thumbD: 70,
      indexP: 90, indexM: 95, indexD: 75,
      middleP: 90, middleM: 95, middleD: 75,
      ringP: 90, ringM: 95, ringD: 75,
      pinkyP: 90, pinkyM: 95, pinkyD: 75,
      rootR: 0,
    },
    grow: {
      thumbP: -50, thumbD: 50,
      indexP: 0, indexM: 0, indexD: 0,
      middleP: 95, middleM: 95, middleD: 75,
      ringP: 95, ringM: 95, ringD: 75,
      pinkyP: 95, pinkyM: 95, pinkyD: 75,
      rootR: 0,
    },
  };

  // Map pose keys -> DOM groups + the transform template each group uses
  const groups = {
    thumbP: { el: document.getElementById('finger-thumb-p'), tpl: (a) => `rotate(${a})` },
    thumbD: { el: document.getElementById('finger-thumb-d'), tpl: (a) => `translate(0, -50) rotate(${a})` },
    indexP: { el: document.getElementById('finger-index-p'), tpl: (a) => `rotate(${a})` },
    indexM: { el: document.getElementById('finger-index-m'), tpl: (a) => `translate(0, -50) rotate(${a})` },
    indexD: { el: document.getElementById('finger-index-d'), tpl: (a) => `translate(0, -38) rotate(${a})` },
    middleP: { el: document.getElementById('finger-middle-p'), tpl: (a) => `rotate(${a})` },
    middleM: { el: document.getElementById('finger-middle-m'), tpl: (a) => `translate(0, -58) rotate(${a})` },
    middleD: { el: document.getElementById('finger-middle-d'), tpl: (a) => `translate(0, -42) rotate(${a})` },
    ringP: { el: document.getElementById('finger-ring-p'), tpl: (a) => `rotate(${a})` },
    ringM: { el: document.getElementById('finger-ring-m'), tpl: (a) => `translate(0, -52) rotate(${a})` },
    ringD: { el: document.getElementById('finger-ring-d'), tpl: (a) => `translate(0, -38) rotate(${a})` },
    pinkyP: { el: document.getElementById('finger-pinky-p'), tpl: (a) => `rotate(${a})` },
    pinkyM: { el: document.getElementById('finger-pinky-m'), tpl: (a) => `translate(0, -42) rotate(${a})` },
    pinkyD: { el: document.getElementById('finger-pinky-d'), tpl: (a) => `translate(0, -32) rotate(${a})` },
  };

  // Hold current angles to interpolate from
  const current = Object.fromEntries(Object.keys(SVG_POSES.give).map((k) => [k, 0]));

  function applyPose(poseName, duration = 900) {
    const target = SVG_POSES[poseName];
    if (!target) return;

    Object.keys(target).forEach((key) => {
      if (key === 'rootR') {
        anime({
          targets: current,
          [key]: target[key],
          duration,
          easing: 'easeInOutQuad',
          update: () => {
            root.style.transform = `rotate(${current.rootR}deg)`;
          },
        });
        return;
      }
      const group = groups[key];
      if (!group || !group.el) return;
      anime({
        targets: current,
        [key]: target[key],
        duration,
        easing: 'easeInOutQuad',
        update: () => {
          group.el.setAttribute('transform', group.tpl(current[key]));
        },
      });
    });
  }

  applyPose('give', 0);

  return { applyPose };
}

/* ============================================================
   SPIKE C — Frame sequence
   Crossfade between rendered frames. Tiny logic, all CSS.
   ============================================================ */

function initFrameSpike() {
  const stage = document.getElementById('frames-stage');
  if (!stage) return null;
  const frames = stage.querySelectorAll('.frame');

  function applyPose(poseName) {
    frames.forEach((frame) => {
      frame.classList.toggle('active', frame.dataset.frame === poseName);
    });
  }

  return { applyPose };
}

/* ============================================================
   Scroll coordinator
   IntersectionObserver fires when each .pose-block enters viewport,
   each spike updates its own visualization.
   ============================================================ */

function initScrollCoordinator(spikes) {
  const spikeEls = document.querySelectorAll('.spike');

  spikeEls.forEach((spikeEl) => {
    const spikeKey = spikeEl.dataset.spike;       // 'three' | 'svg' | 'frames'
    const blocks = spikeEl.querySelectorAll('.pose-block');
    const poseLabel = document.getElementById(`${spikeKey}-pose`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
            const pose = entry.target.dataset.pose;
            blocks.forEach((b) => {
              b.classList.toggle('is-active', b === entry.target);
              b.classList.toggle('is-faded', b !== entry.target);
            });
            if (poseLabel) poseLabel.textContent = POSE_LABEL[pose];
            if (spikes[spikeKey] && spikes[spikeKey].applyPose) {
              spikes[spikeKey].applyPose(pose);
            }
          }
        });
      },
      { threshold: [0.4, 0.6], rootMargin: '-20% 0px -20% 0px' }
    );

    blocks.forEach((b) => observer.observe(b));
  });
}

/* ============================================================
   Boot
   ============================================================ */

window.addEventListener('DOMContentLoaded', () => {
  const spikes = {
    three: initThreeSpike(),
    svg: initSvgSpike(),
    frames: initFrameSpike(),
  };
  initScrollCoordinator(spikes);
});
