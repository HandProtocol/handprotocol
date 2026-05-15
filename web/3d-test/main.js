/* ============================================================
   3D Hand Test — three spikes, one scroll story
   Spike A: Three.js procedural rigged hand
   Spike B: SVG hand with anime.js joint rotations
   Spike C: Frame sequence crossfade
   ============================================================ */

import * as THREE from 'three';

const POSES = ['give', 'receive', 'together', 'grow'];
const POSE_LABEL = { give: 'Give', receive: 'Receive', together: 'Together', grow: 'Grow' };

/* ============================================================
   SPIKE A — Three.js procedural hand
   Builds a parented bone hierarchy. Each finger has 3 phalanges
   (thumb has 2). setPose() animates rotations via anime.js.
   ============================================================ */

function initThreeSpike() {
  const canvas = document.getElementById('three-canvas');
  if (!canvas) return null;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.5, 8);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Lighting — warm key, cool rim, soft ambient
  scene.add(new THREE.AmbientLight(0xfff4e0, 0.45));

  const keyLight = new THREE.DirectionalLight(0xffd28a, 1.3);
  keyLight.position.set(4, 6, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 30;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x6cd5c0, 0.6);
  rimLight.position.set(-4, 2, -3);
  scene.add(rimLight);

  // Material — warm amber, slightly soft
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8a560,
    roughness: 0.55,
    metalness: 0.05,
  });

  // ---------- Build the hand ----------
  const hand = new THREE.Group();
  scene.add(hand);

  // Palm
  const palmGeometry = new THREE.BoxGeometry(2.0, 2.4, 0.55);
  const palm = new THREE.Mesh(palmGeometry, skinMaterial);
  palm.castShadow = true;
  palm.receiveShadow = true;
  hand.add(palm);

  // Build a finger: returns { root, segments: [proximal, middle, distal] }
  // root attaches to palm at base position; rotating root curls whole finger
  function buildFinger({ name, basePos, lengths, widths, hasMiddle = true }) {
    const segments = [];
    const root = new THREE.Group();
    root.position.set(...basePos);
    palm.add(root);

    let parent = root;
    let yOffset = 0;
    const phalanges = hasMiddle ? ['proximal', 'middle', 'distal'] : ['proximal', 'distal'];

    phalanges.forEach((phalanx, i) => {
      const pivot = new THREE.Group(); // pivot at joint (parent-relative)
      pivot.position.y = yOffset;
      parent.add(pivot);

      const geom = new THREE.CylinderGeometry(widths[i] * 0.55, widths[i] * 0.45, lengths[i], 14);
      const mesh = new THREE.Mesh(geom, skinMaterial);
      mesh.position.y = lengths[i] / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pivot.add(mesh);

      // knuckle bead at joint
      const knuckleGeom = new THREE.SphereGeometry(widths[i] * 0.55, 12, 10);
      const knuckle = new THREE.Mesh(knuckleGeom, skinMaterial);
      knuckle.castShadow = true;
      pivot.add(knuckle);

      // fingertip cap on last segment
      if (i === phalanges.length - 1) {
        const tipGeom = new THREE.SphereGeometry(widths[i] * 0.5, 12, 10);
        const tip = new THREE.Mesh(tipGeom, skinMaterial);
        tip.position.y = lengths[i];
        tip.castShadow = true;
        pivot.add(tip);
      }

      segments.push(pivot);
      parent = pivot;
      yOffset = lengths[i];
    });

    return { name, root, segments };
  }

  // Anatomy — slight differences per finger for character
  const fingers = {
    thumb: buildFinger({
      name: 'thumb',
      basePos: [-1.0, -0.4, 0.15],
      lengths: [0.7, 0.55],
      widths: [0.32, 0.28],
      hasMiddle: false,
    }),
    index: buildFinger({
      name: 'index',
      basePos: [-0.7, 1.1, 0],
      lengths: [0.75, 0.55, 0.45],
      widths: [0.28, 0.26, 0.22],
    }),
    middle: buildFinger({
      name: 'middle',
      basePos: [-0.22, 1.22, 0],
      lengths: [0.85, 0.62, 0.48],
      widths: [0.3, 0.27, 0.23],
    }),
    ring: buildFinger({
      name: 'ring',
      basePos: [0.28, 1.15, 0],
      lengths: [0.78, 0.58, 0.45],
      widths: [0.28, 0.26, 0.22],
    }),
    pinky: buildFinger({
      name: 'pinky',
      basePos: [0.72, 0.92, 0],
      lengths: [0.6, 0.42, 0.35],
      widths: [0.24, 0.22, 0.19],
    }),
  };

  // Set thumb root rotation so it points outward and forward
  fingers.thumb.root.rotation.z = Math.PI * 0.35;
  fingers.thumb.root.rotation.y = -Math.PI * 0.15;

  // Set finger root y-spread for natural fan
  fingers.index.root.rotation.z = 0.08;
  fingers.middle.root.rotation.z = 0;
  fingers.ring.root.rotation.z = -0.06;
  fingers.pinky.root.rotation.z = -0.14;

  // Tilt the whole hand slightly toward camera
  hand.rotation.x = -0.15;
  hand.rotation.y = 0.05;

  // ---------- Pose definitions ----------
  // Each value = rotation.x in radians (curl).
  // Positive curls finger toward palm (palm faces +Z, fingers point +Y).
  // Pose shape: per-finger curl + optional finger spread (rotation.z on root)
  function makePose(curls, opts = {}) {
    return {
      curls,                       // { thumb:[a,b], index:[a,b,c], middle:..., ring:..., pinky:... }
      spread: opts.spread || {},   // { thumb, index, middle, ring, pinky } -- root.z rotation
      handRotation: opts.handRotation || { x: -0.15, y: 0.05, z: 0 },
    };
  }

  const poses = {
    // GIVE — palm tilted up toward viewer, fingers gently cupped
    give: makePose({
      thumb:  [-0.4, 0.3],
      index:  [0.35, 0.55, 0.55],
      middle: [0.35, 0.55, 0.55],
      ring:   [0.4, 0.6, 0.55],
      pinky:  [0.45, 0.65, 0.6],
    }, {
      spread: { thumb: 1.25, index: 0.06, middle: 0, ring: -0.05, pinky: -0.12 },
      handRotation: { x: -0.6, y: 0.1, z: -0.05 },
    }),

    // RECEIVE — palm flat up, fingers extended and slightly spread
    receive: makePose({
      thumb:  [-0.55, 0.05],
      index:  [-0.05, -0.05, 0.0],
      middle: [-0.05, -0.05, 0.0],
      ring:   [-0.05, -0.05, 0.0],
      pinky:  [-0.05, -0.05, 0.0],
    }, {
      spread: { thumb: 1.35, index: 0.18, middle: 0.05, ring: -0.1, pinky: -0.22 },
      handRotation: { x: -0.85, y: 0.0, z: 0 },
    }),

    // TOGETHER — fist (closed hand, thumb wrapped over)
    together: makePose({
      thumb:  [-0.8, 1.0],
      index:  [1.35, 1.7, 1.5],
      middle: [1.35, 1.7, 1.5],
      ring:   [1.35, 1.7, 1.5],
      pinky:  [1.35, 1.7, 1.5],
    }, {
      spread: { thumb: 0.6, index: 0.04, middle: 0, ring: -0.04, pinky: -0.08 },
      handRotation: { x: -0.1, y: 0.15, z: 0 },
    }),

    // GROW — index pointing up (sprout), others curled, thumb tucked
    grow: makePose({
      thumb:  [-0.6, 0.7],
      index:  [-0.1, -0.05, 0.0],
      middle: [1.4, 1.7, 1.5],
      ring:   [1.4, 1.7, 1.5],
      pinky:  [1.4, 1.7, 1.5],
    }, {
      spread: { thumb: 0.7, index: 0.04, middle: 0, ring: -0.04, pinky: -0.08 },
      handRotation: { x: -0.25, y: 0.05, z: 0 },
    }),
  };

  // ---------- Apply pose (animated) ----------
  function applyPose(poseName, duration = 1200) {
    const pose = poses[poseName];
    if (!pose) return;

    // Animate each finger segment's rotation.x
    Object.keys(pose.curls).forEach((fingerName) => {
      const finger = fingers[fingerName];
      const targets = pose.curls[fingerName];
      finger.segments.forEach((segment, i) => {
        anime({
          targets: segment.rotation,
          x: targets[i],
          duration,
          easing: 'easeInOutQuad',
        });
      });
      // Animate root spread (z rotation) — but keep thumb's special outward rotation
      if (pose.spread[fingerName] !== undefined) {
        anime({
          targets: finger.root.rotation,
          z: pose.spread[fingerName],
          duration,
          easing: 'easeInOutQuad',
        });
      }
    });

    // Animate whole-hand orientation
    anime({
      targets: hand.rotation,
      x: pose.handRotation.x,
      y: pose.handRotation.y,
      z: pose.handRotation.z,
      duration,
      easing: 'easeInOutQuad',
    });
  }

  // Idle breathing — gentle whole-hand drift
  const clock = new THREE.Clock();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  // also observe size changes (sticky panel)
  new ResizeObserver(resize).observe(canvas);

  function renderLoop() {
    const t = clock.getElapsedTime();
    // tiny ambient drift on top of pose-driven rotation
    hand.position.y = Math.sin(t * 0.6) * 0.08;
    hand.position.x = Math.cos(t * 0.4) * 0.05;
    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
  }
  renderLoop();

  // initial pose
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
