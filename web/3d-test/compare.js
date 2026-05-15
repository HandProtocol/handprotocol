/* ============================================================
   Hand model comparison — wireframe + glowing nodes + LIVE POSES
   Each rigged hand cycles through give/receive/together/grow so
   you can compare deformation quality side by side.
   Static models just slow-rotate.
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ------------------------------------------------------------
   Bone name maps per model. Sign-language curl is applied to
   3 finger phalanges per finger. Different rigs name things
   differently, so we map each one explicitly.
   ------------------------------------------------------------ */
const BONE_MAPS = {
  'jtoastie-rigged': {
    thumb:  ['ThumbRoot', 'ThumbMiddle', 'ThumbTop'],
    index:  ['IndexF_lower', 'IndexF_middle', 'IndexF_tip'],
    middle: ['MiddleF_lower', 'MiddleF_middle', 'MiddleF_tip'],
    ring:   ['RingF_lower', 'RingF_middle', 'RingF_tip'],
    pinky:  ['PinkyF_lower', 'PinkyF_middle', 'PinkyF_tip'],
    curlAxis: 'x',  // FBX2glTF rigs from Blender, finger bones curl on X
    curlSign: 1,
  },
  'realistic-rigged': {
    // Same author/pipeline as J-Toastie — same naming
    thumb:  ['Bone.001', 'Bone.002', 'Bone.003'],
    index:  ['IndexF_lower', 'IndexF_middle', 'IndexF_tip'],
    middle: ['MiddleF_lower', 'MiddleF_middle', 'MiddleF_tip'],
    ring:   ['RingF_lower', 'RingF_middle', 'RingF_tip'],
    pinky:  ['PinkyF_lower', 'PinkyF_middle', 'PinkyF_tip'],
    curlAxis: 'x',
    curlSign: 1,
  },
  'elena-rigged': {
    // Sketchfab export, Blender Z-axis curl, .R suffix = right hand
    thumb:  ['thumb_01.R', 'thumb_02.R', 'thumb_03.R'],
    index:  ['index_01.R', 'index_02.R', 'index_03.R'],
    middle: ['middle_01.R', 'middle_02.R', 'middle_03.R'],
    ring:   ['ring_01.R', 'ring_02.R', 'ring_03.R'],
    pinky:  ['pinky_01.R', 'pinky_02.R', 'pinky_03.R'],
    curlAxis: 'z',
    curlSign: -1,  // Blender Z curl is typically negative for finger flex
  },
};

/* ------------------------------------------------------------
   Sign-language pose definitions. Each pose lists curl values
   (radians) per finger × phalanx. Curl is the joint hinge angle.
   ------------------------------------------------------------ */
const POSES = {
  give: {
    label: 'Give',
    curls: {
      thumb:  [-0.3, 0.2, 0.2],
      index:  [0.35, 0.5, 0.45],
      middle: [0.35, 0.5, 0.45],
      ring:   [0.4, 0.55, 0.45],
      pinky:  [0.45, 0.6, 0.5],
    },
  },
  receive: {
    label: 'Receive',
    curls: {
      thumb:  [-0.55, 0.0, 0.0],
      index:  [-0.05, -0.05, 0.0],
      middle: [-0.05, -0.05, 0.0],
      ring:   [-0.05, -0.05, 0.0],
      pinky:  [-0.05, -0.05, 0.0],
    },
  },
  together: {
    label: 'Together',
    curls: {
      thumb:  [-0.7, 0.8, 0.7],
      index:  [1.3, 1.5, 1.3],
      middle: [1.3, 1.5, 1.3],
      ring:   [1.3, 1.5, 1.3],
      pinky:  [1.3, 1.5, 1.3],
    },
  },
  grow: {
    label: 'Grow',
    curls: {
      thumb:  [-0.5, 0.6, 0.6],
      index:  [-0.05, -0.05, 0.0],
      middle: [1.3, 1.5, 1.3],
      ring:   [1.3, 1.5, 1.3],
      pinky:  [1.3, 1.5, 1.3],
    },
  },
};

const POSE_SEQUENCE = ['give', 'receive', 'together', 'grow'];

// Per-model orientation overrides (radians, applied to modelRoot.rotation
// BEFORE bbox computation). The right values depend on how the source FBX
// was authored — this is iterated visually.
const MODELS = [
  { key: 'elena-rigged',     file: 'models/rigged_hand.glb',           rigged: true  },
  { key: 'jtoastie-rigged',  file: 'models/jtoastie-rigged-hand.glb',  rigged: true,  baseRotation: [-Math.PI/2, 0, 0] },
  { key: 'realistic-rigged', file: 'models/realistic-hand.glb',        rigged: true,  baseRotation: [-Math.PI/2, 0, 0] },
  { key: 'skeletal-static',  file: 'models/skeletal-hand.glb',         rigged: false },
  { key: 'google-static',    file: 'models/google-poly-hand.glb',      rigged: false },
];

const COLOR_EDGE = 0xfbbf24;
const COLOR_FILL = 0xd97706;
const COLOR_NODE_HALO = 0xfde68a;
const COLOR_NODE_CORE = 0xfffbeb;

const loader = new GLTFLoader();

/* ============================================================
   Setup one card
   ============================================================ */

async function setupModelCard({ key, file, rigged, baseRotation }) {
  const cardEl = document.querySelector(`.model-card[data-model="${key}"]`);
  if (!cardEl) return null;
  const canvas = cardEl.querySelector('canvas');
  const loadingEl = cardEl.querySelector('.model-card__loading');
  const wrap = cardEl.querySelector('.model-card__canvas-wrap');

  // Pose label overlay (only meaningful for rigged hands)
  let poseLabelEl = null;
  if (rigged) {
    poseLabelEl = document.createElement('div');
    poseLabelEl.className = 'model-card__pose';
    poseLabelEl.textContent = 'Give';
    wrap.appendChild(poseLabelEl);
  }

  // Debug overlay — shows bbox dims so we can spot weird-scaled models
  const debugEl = document.createElement('div');
  debugEl.className = 'model-card__debug';
  wrap.appendChild(debugEl);

  // Rotation controls — click to nudge model orientation in 15° steps.
  // Useful for dialing in the right "facing" interactively.
  const rotEl = document.createElement('div');
  rotEl.className = 'model-card__rot';
  rotEl.innerHTML = `
    <button data-rot="x" data-dir="-1" title="Rotate X-">X−</button>
    <button data-rot="x" data-dir="1"  title="Rotate X+">X+</button>
    <button data-rot="y" data-dir="-1" title="Rotate Y-">Y−</button>
    <button data-rot="y" data-dir="1"  title="Rotate Y+">Y+</button>
    <button data-rot="z" data-dir="-1" title="Rotate Z-">Z−</button>
    <button data-rot="z" data-dir="1"  title="Rotate Z+">Z+</button>
    <span class="model-card__rot-readout">0, 0, 0</span>
  `;
  wrap.appendChild(rotEl);

  // ----- three.js setup -----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const fillLight = new THREE.DirectionalLight(0xffd28a, 0.5);
  fillLight.position.set(2, 2, 3);
  scene.add(fillLight);

  // Stable rotation pivot — model goes inside this group
  const pivot = new THREE.Group();
  scene.add(pivot);

  let bones = [];
  let modelRoot = null;
  let boneRefs = null;  // populated for rigged models

  try {
    const gltf = await loader.loadAsync(file);
    modelRoot = gltf.scene;

    // Stop any baked animation that came with the model (we drive our own poses)
    if (gltf.animations?.length) {
      gltf.animations.length = 0;  // ignore
    }

    // Walk + remap materials, collect bones
    modelRoot.traverse((obj) => {
      // Strip any non-mesh, non-bone scene noise (cameras, lights, empties
      // pinned far out in space) that would otherwise corrupt the bbox.
      if (obj.isCamera || obj.isLight) {
        obj.visible = false;
      }
      if (obj.isMesh || obj.isSkinnedMesh) {
        const fillMat = new THREE.MeshStandardMaterial({
          color: COLOR_FILL,
          transparent: true,
          opacity: 0.6,           // ↑ from 0.3 so pose deformation reads through
          roughness: 0.5,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const edgeGeom = new THREE.EdgesGeometry(obj.geometry, 25);
        const edgeMat = new THREE.LineBasicMaterial({
          color: COLOR_EDGE,
          transparent: true,
          opacity: 0.45,          // ↓ from 0.9 so edges don't dominate the deforming fill
        });
        const edges = new THREE.LineSegments(edgeGeom, edgeMat);
        // Note: edges don't deform with skin (they share geometry but not skin attrs).
        // For the comparison page, that's OK — fill mesh deforms, edges stay rest.
        // The user will see the silhouette wireframe at rest pose, and the FILL mesh
        // shows the actual pose-driven deformation underneath.
        obj.material = fillMat;
        obj.add(edges);
      }
      if (obj.isBone) bones.push(obj);
    });

    pivot.add(modelRoot);

    // Apply per-model orientation override BEFORE bbox so bbox/recenter
    // accounts for the rotated geometry.
    if (baseRotation) {
      modelRoot.rotation.set(baseRotation[0], baseRotation[1], baseRotation[2]);
    }
    modelRoot.updateMatrixWorld(true);

    // Mesh-only bbox (excludes cameras/lights/empties that ship inside FBX
    // and Sketchfab GLBs and would otherwise corrupt size by 1000x).
    const box = new THREE.Box3();
    let meshCount = 0;
    modelRoot.traverse((obj) => {
      if (obj.isMesh || obj.isSkinnedMesh) {
        if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
        const localBox = obj.geometry.boundingBox.clone();
        localBox.applyMatrix4(obj.matrixWorld);
        if (meshCount === 0) box.copy(localBox);
        else box.union(localBox);
        meshCount++;
      }
    });

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    // KEEP model at its native scale (some rigs have 100×380 scale baked into
    // bones; scaling the root cascades unpredictably to bone-attached helpers).
    // Recenter only — translate model so its bbox center is at pivot origin.
    modelRoot.position.sub(center);

    // Adapt camera and clip planes to the model's actual scale so it looks
    // the same size on screen regardless of source units.
    const fitDist = (maxDim / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);
    camera.position.set(0, 0, fitDist * 1.8);
    camera.near = maxDim * 0.01;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);

    // Stash maxDim on the closure for halo sizing below
    var modelScale = maxDim;

    // ----- glowing joint nodes on bones -----
    // Filter to "important" bones for dense rigs (Elena has 69 joints; if
    // we draw a halo at each one the silhouette drowns in glow).
    if (rigged && bones.length) {
      const interestingBones = bones.filter((b) => {
        const n = b.name.toLowerCase();
        // Skip Ctrl/control IK helpers, *_end terminators
        if (n.includes('ctrl') || n.includes('_end') || n.includes('helper')) return false;
        return true;
      });

      // Each bone may have its own accumulated world scale (J-Toastie has
      // 38,000× baked into Armature×Hand). To make halos render at a
      // consistent VISUAL size, compensate per-bone with 1/world_scale.
      const targetCoreR = modelScale * 0.008;
      const targetHaloR = modelScale * 0.022;
      const unitCore = new THREE.SphereGeometry(1, 10, 8);
      const unitHalo = new THREE.SphereGeometry(1, 10, 8);
      const coreMat = new THREE.MeshBasicMaterial({ color: COLOR_NODE_CORE });
      const haloMat = new THREE.MeshBasicMaterial({
        color: COLOR_NODE_HALO,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
      interestingBones.forEach((bone) => {
        bone.updateMatrixWorld(true);
        bone.matrixWorld.decompose(_v, _q, _s);
        const avgScale = (Math.abs(_s.x) + Math.abs(_s.y) + Math.abs(_s.z)) / 3;
        if (avgScale < 1e-6) return;
        const coreCompensated = targetCoreR / avgScale;
        const haloCompensated = targetHaloR / avgScale;
        const core = new THREE.Mesh(unitCore, coreMat);
        core.scale.setScalar(coreCompensated);
        bone.add(core);
        const halo = new THREE.Mesh(unitHalo, haloMat);
        halo.scale.setScalar(haloCompensated);
        bone.add(halo);
      });
    }

    // ----- resolve bone refs for pose cycling -----
    if (rigged) {
      // Log every bone we found, so we can compare against expected names
      const allBoneNames = bones.map((b) => b.name);
      console.log(`[${key}] ${bones.length} bones:`, allBoneNames);

      const map = BONE_MAPS[key];
      if (map) {
        boneRefs = { axis: map.curlAxis, sign: map.curlSign, fingers: {} };
        let resolved = 0, missing = 0;
        ['thumb', 'index', 'middle', 'ring', 'pinky'].forEach((finger) => {
          boneRefs.fingers[finger] = map[finger].map((boneName) => {
            const bone = modelRoot.getObjectByName(boneName);
            if (!bone) { console.warn(`[${key}] bone NOT FOUND: ${boneName}`); missing++; }
            else { resolved++; }
            return bone || null;
          });
        });
        console.log(`[${key}] pose driver: ${resolved}/${resolved+missing} bones resolved, curl axis=${map.curlAxis}, sign=${map.curlSign}`);
        // Save rest rotations so poses are RELATIVE (additive) to rest
        boneRefs.rest = {};
        Object.entries(boneRefs.fingers).forEach(([finger, refs]) => {
          boneRefs.rest[finger] = refs.map((b) => b ? b.rotation[map.curlAxis] : 0);
        });
      } else {
        console.warn(`[${key}] no BONE_MAP defined — no pose cycling`);
      }
    }

    debugEl.textContent = `bbox ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)} · meshes ${meshCount} · bones ${bones.length}`;
    if (loadingEl) loadingEl.classList.add('hidden');

    // Wire rotation controls
    const readoutEl = rotEl.querySelector('.model-card__rot-readout');
    function updateReadout() {
      const r = modelRoot.rotation;
      const deg = (rad) => Math.round(rad * 180 / Math.PI);
      readoutEl.textContent = `${deg(r.x)}°, ${deg(r.y)}°, ${deg(r.z)}°`;
    }
    updateReadout();
    rotEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const axis = btn.dataset.rot;
      const dir = parseInt(btn.dataset.dir, 10);
      modelRoot.rotation[axis] += dir * Math.PI / 12; // 15° steps
      updateReadout();
    });
  } catch (err) {
    console.error(`Failed to load ${file}:`, err);
    if (loadingEl) loadingEl.textContent = 'load failed';
    debugEl.textContent = err.message;
    return null;
  }

  // ----- resize handling -----
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // ----- pose cycling for rigged hands -----
  let poseIndex = 0;
  function nextPose() {
    if (!boneRefs) return;
    const poseName = POSE_SEQUENCE[poseIndex];
    const pose = POSES[poseName];
    if (poseLabelEl) poseLabelEl.textContent = pose.label;

    Object.entries(pose.curls).forEach(([finger, curlValues]) => {
      const refs = boneRefs.fingers[finger];
      const rests = boneRefs.rest[finger];
      if (!refs) return;
      refs.forEach((bone, i) => {
        if (!bone) return;
        const target = rests[i] + curlValues[i] * boneRefs.sign;
        anime({
          targets: bone.rotation,
          [boneRefs.axis]: target,
          duration: 1100,
          easing: 'easeInOutQuad',
        });
      });
    });

    poseIndex = (poseIndex + 1) % POSE_SEQUENCE.length;
  }

  if (rigged) {
    setTimeout(nextPose, 200);  // initial pose
    setInterval(nextPose, 2400); // cycle
  }

  // ----- render loop (slow auto-rotate around Y) -----
  const clock = new THREE.Clock();
  function render() {
    const t = clock.getElapsedTime();
    // Rigged hands hold a fixed orientation so the chosen "facing" reads.
    // Static hands rotate so we can see them in the round.
    pivot.rotation.y += (rigged ? 0 : 0.006);
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  render();

  return { scene, camera, renderer };
}

/* ============================================================
   Boot
   ============================================================ */

window.addEventListener('DOMContentLoaded', async () => {
  // Spin up all in parallel
  await Promise.all(MODELS.map(setupModelCard));

  // Pick handlers
  const SELECTED_KEY = 'hand-model-selection';
  const saved = localStorage.getItem(SELECTED_KEY);
  if (saved) {
    const card = document.querySelector(`.model-card[data-model="${saved}"]`);
    if (card) card.classList.add('is-selected');
  }
  document.querySelectorAll('.model-card__pick').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.pick;
      localStorage.setItem(SELECTED_KEY, key);
      document.querySelectorAll('.model-card').forEach((c) => c.classList.remove('is-selected'));
      document.querySelector(`.model-card[data-model="${key}"]`).classList.add('is-selected');
      btn.textContent = 'Selected ✓';
      setTimeout(() => { btn.textContent = 'Use this one'; }, 1500);
    });
  });
});
