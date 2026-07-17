(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const canvas = $("#game-canvas");
  const intro = $("#intro");
  const gameUI = $("#game-ui");
  const resultPanel = $("#result-panel");
  const rideButton = $("#ride-button");
  const againButton = $("#again-button");
  const jumpButton = $("#jump-button");
  const leverButton = $("#litter-lever");
  const soundButton = $("#sound-button");
  const audio = $("#theme-music");
  const announcement = $("#announcement");
  const tutorial = $("#tutorial");
  const junctionCard = $("#junction-card");
  const worldWash = $("#world-wash");

  if (!window.THREE) {
    intro.querySelector(".tagline").textContent = "The railway is temporarily closed. Please reload to try again.";
    rideButton.disabled = true;
    return;
  }

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compactDevice = innerWidth < 700 || navigator.hardwareConcurrency <= 4;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !compactDevice, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, compactDevice ? 1.35 : 1.75));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !compactDevice;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#27214b");
  scene.fog = new THREE.Fog("#27214b", 35, 135);
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 220);
  const clock = new THREE.Clock();
  const cameraLook = new THREE.Vector3();
  const cameraGoal = new THREE.Vector3();
  const lookGoal = new THREE.Vector3();

  const VERSES = {
    moon: {
      name: "Moonmeadow", sky: "#27214b", fog: "#27214b", ground: "#3c3469",
      rail: "#9eead7", accent: "#79e6c5", light: "#c8b6ff", prop: "lantern"
    },
    candy: {
      name: "Candy Canyon", sky: "#7b315f", fog: "#b95973", ground: "#e18b83",
      rail: "#ffe3a5", accent: "#ffc857", light: "#ffb4d1", prop: "candy"
    },
    neon: {
      name: "Neon Harbor", sky: "#101631", fog: "#182752", ground: "#17284a",
      rail: "#64e4ff", accent: "#ef476f", light: "#718cff", prop: "neon"
    },
    garden: {
      name: "Giant's Garden", sky: "#315d59", fog: "#4e7770", ground: "#56865e",
      rail: "#f5dd9d", accent: "#ff9f68", light: "#d5ffb6", prop: "flower"
    }
  };

  const state = {
    mode: "intro",
    elapsed: 0,
    introElapsed: 0,
    runElapsed: 0,
    distance: 0,
    lane: 0,
    targetLane: 0,
    hearts: 3,
    jump: 0,
    jumpVelocity: 0,
    speed: 16,
    verse: "moon",
    nextJunction: 19,
    junctionOpen: false,
    junctionChoice: 0,
    junctionCount: 0,
    raccoons: 0,
    nextSpawn: 8,
    leverCharge: 1,
    tutorialStep: 0,
    ended: false,
    lastFrame: performance.now()
  };

  const mat = (color, options = {}) => new THREE.MeshStandardMaterial({
    color: new THREE.Color(color), roughness: 0.72, metalness: 0.04, ...options
  });
  const box = (size, material) => new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  const sphere = (radius, material, width = 16, height = 12) => new THREE.Mesh(new THREE.SphereGeometry(radius, width, height), material);
  const cylinder = (top, bottom, height, material, sides = 12) => new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, sides), material);

  scene.add(new THREE.HemisphereLight("#ddc9ff", "#281b3c", 1.45));
  const keyLight = new THREE.DirectionalLight("#ffeac3", 2.2);
  keyLight.position.set(-12, 18, 8);
  keyLight.castShadow = !compactDevice;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight("#79e6c5", 3, 45);
  rimLight.position.set(5, 5, 4);
  scene.add(rimLight);

  function createCat(color = "#f3a44f", eyeColor = "#79e6c5") {
    const group = new THREE.Group();
    const fur = mat(color);
    const cream = mat("#fff0ce");
    const pink = mat("#ef8ba8");
    const dark = mat("#171225");
    const eyes = mat(eyeColor, { emissive: new THREE.Color(eyeColor), emissiveIntensity: 0.45 });

    const body = sphere(0.57, fur, 18, 14);
    body.scale.set(0.84, 1.05, 0.78);
    body.position.y = 0.56;
    const head = sphere(0.43, fur, 18, 14);
    head.position.set(0, 1.28, 0.04);
    group.add(body, head);

    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 3), fur);
      ear.position.set(side * 0.25, 1.67, 0.03);
      ear.rotation.z = side * -0.15;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.24, 3), pink);
      inner.position.set(side * 0.25, 1.66, 0.075);
      inner.rotation.z = side * -0.15;
      const eye = sphere(0.07, eyes, 10, 8);
      eye.position.set(side * 0.145, 1.34, 0.4);
      const pupil = box([0.025, 0.08, 0.025], dark);
      pupil.position.set(side * 0.145, 1.34, 0.463);
      group.add(ear, inner, eye, pupil);
    });

    const muzzle = sphere(0.18, cream, 12, 8);
    muzzle.scale.set(1.15, 0.65, 0.55);
    muzzle.position.set(0, 1.17, 0.39);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.08, 3), pink);
    nose.position.set(0, 1.25, 0.51);
    nose.rotation.x = Math.PI / 2;
    group.add(muzzle, nose);

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.5, -0.35), new THREE.Vector3(-0.5, 0.8, -0.38),
      new THREE.Vector3(-0.65, 1.25, -0.15), new THREE.Vector3(-0.35, 1.55, 0)
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 14, 0.07, 7), fur));
    group.userData.head = head;
    return group;
  }

  function createTrain() {
    const group = new THREE.Group();
    const red = mat("#d94b55");
    const redDark = mat("#8d293e");
    const brass = mat("#ffc857", { metalness: 0.65, roughness: 0.28 });
    const charcoal = mat("#201b2e", { metalness: 0.38 });
    const cream = mat("#fff0ce");
    const glass = mat("#68bfd4", { emissive: new THREE.Color("#285c72"), emissiveIntensity: 0.28, roughness: 0.15 });

    const chassis = box([2.8, 0.45, 4.9], redDark);
    chassis.position.y = 0.78;
    const cabin = box([2.55, 2.25, 2.2], red);
    cabin.position.set(0, 2, 0.65);
    const nose = cylinder(1.05, 1.18, 2.6, red, 18);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.6, -1.55);
    const boilerBand = new THREE.Mesh(new THREE.TorusGeometry(1.11, 0.08, 8, 24), brass);
    boilerBand.position.set(0, 1.6, -2.02);
    const roof = cylinder(1.7, 1.7, 0.22, charcoal, 20);
    roof.scale.z = 0.75;
    roof.position.set(0, 3.2, 0.65);
    const chimney = cylinder(0.36, 0.55, 1.25, charcoal, 14);
    chimney.position.set(0, 2.85, -1.6);
    const lamp = sphere(0.27, mat("#fff5a8", { emissive: new THREE.Color("#ffc857"), emissiveIntensity: 2 }), 12, 8);
    lamp.position.set(0, 2, -2.75);
    group.add(chassis, cabin, nose, boilerBand, roof, chimney, lamp);

    [-1, 1].forEach(side => {
      const windowMesh = box([0.72, 0.76, 0.08], glass);
      windowMesh.position.set(side * 0.78, 2.18, -0.49);
      group.add(windowMesh);
    });

    [-1.05, 1.05].forEach(x => [-1.55, 1.45].forEach(z => {
      const wheel = cylinder(0.58, 0.58, 0.28, charcoal, 16);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.62, z);
      const hub = cylinder(0.22, 0.22, 0.31, brass, 12);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      group.add(wheel, hub);
    }));

    const crest = new THREE.Group();
    const crestCircle = cylinder(0.48, 0.48, 0.08, cream, 18);
    crestCircle.rotation.x = Math.PI / 2;
    const crestText = createTextSprite("KX", "#171225", "#fff0ce", 96);
    crestText.scale.set(0.75, 0.42, 1);
    crestText.position.z = 0.07;
    crest.add(crestCircle, crestText);
    crest.position.set(0, 1.92, -2.77);
    group.add(crest);

    const conductor = createCat();
    conductor.scale.setScalar(0.75);
    conductor.position.set(0, 3.15, 0.15);
    group.add(conductor);
    group.scale.setScalar(0.78);
    group.position.set(0, 0.04, 4);
    group.userData.cat = conductor;
    return group;
  }

  function createTextSprite(text, color, background, size = 72) {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 256;
    textureCanvas.height = 128;
    const context = textureCanvas.getContext("2d");
    context.fillStyle = background;
    context.fillRect(0, 0, 256, 128);
    context.fillStyle = color;
    context.font = `700 ${size}px Fredoka, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 128, 67);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.encoding = THREE.sRGBEncoding;
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  }

  function createRaccoon() {
    const group = new THREE.Group();
    const gray = mat("#777387");
    const light = mat("#beb9c4");
    const dark = mat("#24202e");
    const body = sphere(0.55, gray);
    body.scale.set(0.85, 1, 0.75);
    body.position.y = 0.65;
    const head = sphere(0.42, gray);
    head.position.set(0, 1.35, 0);
    const mask = box([0.7, 0.18, 0.12], dark);
    mask.position.set(0, 1.39, 0.34);
    const muzzle = sphere(0.18, light, 10, 8);
    muzzle.position.set(0, 1.21, 0.34);
    group.add(body, head, mask, muzzle);
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 3), dark);
      ear.position.set(side * 0.24, 1.72, 0);
      const eye = sphere(0.045, mat("#ffc857", { emissive: new THREE.Color("#ffc857"), emissiveIntensity: 1 }));
      eye.position.set(side * 0.14, 1.4, 0.43);
      group.add(ear, eye);
    });
    const bag = sphere(0.34, mat("#8b603d"));
    bag.scale.set(0.8, 1, 0.5);
    bag.position.set(0.42, 0.76, -0.16);
    group.add(bag);
    group.userData.active = true;
    return group;
  }

  const train = createTrain();
  scene.add(train);

  const groundMaterial = mat(VERSES.moon.ground);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 280), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.08, -85);
  ground.receiveShadow = !compactDevice;
  scene.add(ground);

  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array((compactDevice ? 90 : 180) * 3);
  for (let index = 0; index < starPositions.length; index += 3) {
    starPositions[index] = (Math.random() - 0.5) * 150;
    starPositions[index + 1] = 7 + Math.random() * 55;
    starPositions[index + 2] = -160 + Math.random() * 185;
  }
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: "#fff3cf", size: 0.28, transparent: true, opacity: 0.75 }));
  scene.add(stars);

  const trackGroup = new THREE.Group();
  const trackSegments = [];
  const segmentCount = compactDevice ? 25 : 34;
  const segmentLength = 7;
  const laneWidth = 3.9;

  function createTrackSegment(index) {
    const group = new THREE.Group();
    const sleeperMat = mat("#49372f");
    const railMat = mat(VERSES.moon.rail, { metalness: 0.82, roughness: 0.2, emissive: new THREE.Color(VERSES.moon.rail), emissiveIntensity: 0.12 });
    [-1, 0, 1].forEach(lane => {
      [-0.72, 0.72].forEach(offset => {
        const rail = box([0.11, 0.13, segmentLength + 0.25], railMat);
        rail.position.set(lane * laneWidth + offset, 0.16, 0);
        rail.userData.baseX = rail.position.x;
        rail.userData.lane = lane;
        group.add(rail);
      });
      for (let sleeperIndex = 0; sleeperIndex < 4; sleeperIndex += 1) {
        const sleeper = box([2.15, 0.11, 0.22], sleeperMat);
        sleeper.position.set(lane * laneWidth, 0.06, -segmentLength / 2 + sleeperIndex * 1.85);
        sleeper.userData.baseX = sleeper.position.x;
        sleeper.userData.lane = lane;
        group.add(sleeper);
      }
    });
    group.position.z = 18 - index * segmentLength;
    group.userData.rails = group.children.filter(child => child.material === railMat);
    trackGroup.add(group);
    trackSegments.push(group);
  }
  for (let index = 0; index < segmentCount; index += 1) createTrackSegment(index);
  scene.add(trackGroup);

  const propGroup = new THREE.Group();
  const props = [];

  function rebuildProp(prop, verseKey) {
    while (prop.children.length) prop.remove(prop.children[0]);
    const verse = VERSES[verseKey];
    const trunk = mat(verseKey === "neon" ? "#213055" : "#49372f");
    const accent = mat(verse.accent, { emissive: new THREE.Color(verse.accent), emissiveIntensity: verseKey === "neon" ? 0.8 : 0.18 });
    if (verse.prop === "lantern") {
      const stem = cylinder(0.06, 0.08, 2.3, trunk, 8);
      stem.position.y = 1.15;
      const glow = sphere(0.25, accent, 10, 8);
      glow.position.y = 2.35;
      prop.add(stem, glow);
    } else if (verse.prop === "candy") {
      const stick = cylinder(0.09, 0.1, 1.8, mat("#fff0ce"), 8);
      stick.position.y = 0.9;
      const candy = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.14, 8, 20), accent);
      candy.position.y = 2;
      prop.add(stick, candy);
    } else if (verse.prop === "neon") {
      const stem = box([0.12, 2.8, 0.12], trunk);
      stem.position.y = 1.4;
      const sign = box([1.1, 0.5, 0.08], accent);
      sign.position.y = 2.6;
      prop.add(stem, sign);
    } else {
      const stem = cylinder(0.13, 0.18, 1.8, trunk, 9);
      stem.position.y = 0.9;
      prop.add(stem);
      for (let petal = 0; petal < 6; petal += 1) {
        const mesh = sphere(0.32, accent, 10, 8);
        const angle = petal / 6 * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * 0.36, 1.9 + Math.sin(angle) * 0.36, 0);
        prop.add(mesh);
      }
    }
    prop.userData.verse = verseKey;
  }

  for (let index = 0; index < (compactDevice ? 24 : 36); index += 1) {
    const prop = new THREE.Group();
    rebuildProp(prop, "moon");
    prop.position.set((index % 2 ? 1 : -1) * (8.5 + Math.random() * 14), 0, 12 - index * 5.5);
    prop.rotation.y = Math.random() * Math.PI;
    prop.scale.setScalar(0.7 + Math.random() * 0.9);
    propGroup.add(prop);
    props.push(prop);
  }
  scene.add(propGroup);

  const obstacles = [];
  const effects = [];

  function spawnRaccoon(scripted = false) {
    if (obstacles.filter(item => item.userData.active).length > 3) return;
    const raccoon = createRaccoon();
    const lane = scripted ? state.lane : Math.floor(Math.random() * 3) - 1;
    raccoon.position.set(lane * laneWidth, 0, scripted ? -42 : -85);
    raccoon.userData.lane = lane;
    raccoon.userData.scripted = scripted;
    raccoon.userData.hit = false;
    scene.add(raccoon);
    obstacles.push(raccoon);
    if (scripted) {
      showTutorial("!", "Raccoon robbers", "Pull the litter lever when they get close");
      leverButton.classList.add("charged");
      $("#mission-copy").textContent = "Protect the snack carriage";
    }
  }

  function litterBlast() {
    if (state.mode !== "playing" || state.leverCharge < 1) return;
    state.leverCharge = 0;
    leverButton.classList.remove("charged");
    leverButton.classList.add("pulled", "cooldown");
    $("#lever-ready").textContent = "Charging";
    setTimeout(() => leverButton.classList.remove("pulled"), 350);
    const litterMat = new THREE.PointsMaterial({ color: "#f1dbad", size: 0.34, transparent: true, opacity: 1 });
    const geometry = new THREE.BufferGeometry();
    const count = compactDevice ? 55 : 100;
    const points = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      points[index * 3] = (Math.random() - 0.5) * 3;
      points[index * 3 + 1] = 1 + Math.random() * 2;
      points[index * 3 + 2] = -Math.random() * 4;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
    const blast = new THREE.Points(geometry, litterMat);
    blast.position.copy(train.position);
    blast.userData.life = 1;
    blast.userData.velocity = 20;
    scene.add(blast);
    effects.push(blast);
    let bounced = 0;
    obstacles.forEach(raccoon => {
      if (!raccoon.userData.active || raccoon.position.z < -34) return;
      raccoon.userData.active = false;
      raccoon.userData.bounced = true;
      raccoon.userData.bounceVelocity = 9 + Math.random() * 4;
      raccoon.userData.spin = (Math.random() - 0.5) * 8;
      bounced += 1;
    });
    state.raccoons += bounced;
    announce(bounced ? `Litter launch! ${bounced} robber${bounced > 1 ? "s" : ""} bounced` : "Litter launch!");
    if (state.tutorialStep < 2) {
      state.tutorialStep = 2;
      hideTutorial();
      $("#mission-copy").textContent = "Reach the first junction";
    }
  }

  function jump() {
    if (state.mode !== "playing" || state.jump > 0.04) return;
    state.jumpVelocity = 8.8;
  }

  function selectLane(lane) {
    if (state.mode !== "playing") return;
    state.targetLane = Math.max(-1, Math.min(1, lane));
    document.querySelectorAll(".lane-button").forEach(button => button.classList.toggle("active", Number(button.dataset.lane) === state.targetLane));
    if (state.tutorialStep === 0) {
      state.tutorialStep = 1;
      hideTutorial();
      $("#mission-copy").textContent = "Watch for raccoon robbers";
    }
    if (state.junctionOpen && state.targetLane !== 0) state.junctionChoice = state.targetLane;
  }

  function openJunction() {
    state.junctionOpen = true;
    state.junctionChoice = 0;
    junctionCard.classList.add("visible");
    $("#left-route").textContent = state.verse === "candy" ? "← Giant's Garden" : "← Candy Canyon";
    $("#right-route").textContent = state.verse === "neon" ? "Moonmeadow →" : "Neon Harbor →";
    announce("Junction ahead");
    $("#mission-copy").textContent = "Choose the left or right rail";
  }

  function completeJunction() {
    let next = "moon";
    if (state.junctionChoice < 0) next = state.verse === "candy" ? "garden" : "candy";
    if (state.junctionChoice > 0) next = state.verse === "neon" ? "moon" : "neon";
    if (state.junctionChoice === 0) next = state.junctionCount % 2 ? "garden" : "candy";
    state.junctionOpen = false;
    state.junctionCount += 1;
    state.nextJunction = state.runElapsed + 22;
    junctionCard.classList.remove("visible");
    setVerse(next);
    announce(`Entering ${VERSES[next].name}`);
    $("#mission-copy").textContent = "Keep the Express rolling";
  }

  function setVerse(key) {
    state.verse = key;
    const verse = VERSES[key];
    scene.background.set(verse.sky);
    scene.fog.color.set(verse.fog);
    groundMaterial.color.set(verse.ground);
    rimLight.color.set(verse.accent);
    worldWash.style.backgroundColor = verse.accent;
    worldWash.style.opacity = key === "moon" ? ".1" : ".16";
    $("#verse-name").textContent = verse.name;
    $("#verse-dot").style.background = verse.accent;
    $("#verse-dot").style.boxShadow = `0 0 10px ${verse.accent}`;
    trackSegments.forEach(segment => segment.userData.rails.forEach(rail => {
      rail.material.color.set(verse.rail);
      rail.material.emissive.set(verse.rail);
    }));
    props.forEach(prop => rebuildProp(prop, key));
    stars.material.opacity = key === "candy" ? 0.3 : 0.75;
  }

  function announce(message) {
    announcement.textContent = message;
    announcement.classList.add("show");
    clearTimeout(announce.timeout);
    announce.timeout = setTimeout(() => announcement.classList.remove("show"), 1300);
  }

  function showTutorial(icon, title, copy) {
    $("#tutorial-icon").textContent = icon;
    $("#tutorial-title").textContent = title;
    $("#tutorial-copy").textContent = copy;
    tutorial.classList.remove("is-hidden");
  }

  function hideTutorial() { tutorial.classList.add("is-hidden"); }

  function takeDamage() {
    state.hearts -= 1;
    updateHearts();
    announce("Cargo snagged!");
    train.rotation.z = 0.12;
    setTimeout(() => { train.rotation.z = 0; }, 250);
    if (navigator.vibrate) navigator.vibrate([30, 30, 50]);
    if (state.hearts <= 0) endRun(false);
  }

  function updateHearts() {
    [...$("#hearts").children].forEach((heart, index) => heart.classList.toggle("lost", index >= state.hearts));
    $("#hearts").setAttribute("aria-label", `${state.hearts} hearts remaining`);
  }

  function startRun() {
    state.mode = "playing";
    state.runElapsed = 0;
    state.distance = 0;
    state.hearts = 3;
    state.lane = 0;
    state.targetLane = 0;
    state.jump = 0;
    state.raccoons = 0;
    state.nextSpawn = 8;
    state.nextJunction = 19;
    state.junctionCount = 0;
    state.leverCharge = 1;
    state.tutorialStep = 0;
    state.ended = false;
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles.length = 0;
    intro.classList.add("is-hidden");
    resultPanel.classList.add("is-hidden");
    gameUI.classList.remove("is-hidden");
    leverButton.classList.remove("cooldown", "pulled", "charged");
    $("#lever-ready").textContent = "Ready";
    document.querySelectorAll(".lane-button").forEach(button => button.classList.toggle("active", Number(button.dataset.lane) === 0));
    updateHearts();
    setVerse("moon");
    showTutorial("↔", "Switch rails", "Swipe or tap a rail");
    $("#mission-copy").textContent = "Follow the lantern rails";
    announce("All aboard!");
    audio.play().catch(() => {});
  }

  function endRun(success) {
    if (state.ended) return;
    state.ended = true;
    state.mode = "result";
    gameUI.classList.add("is-hidden");
    resultPanel.classList.remove("is-hidden");
    $("#result-title").textContent = success ? "Purrfect run" : "Train rescued";
    $("#result-distance").textContent = `${Math.floor(state.distance)} m`;
    $("#result-raccoons").textContent = state.raccoons;
    $("#result-verses").textContent = state.junctionCount + 1;
    try {
      const best = Math.max(Number(localStorage.getItem("kittyExpressBest")) || 0, Math.floor(state.distance));
      localStorage.setItem("kittyExpressBest", String(best));
    } catch (error) {
      // The run remains playable when browser storage is unavailable.
    }
  }

  function updateIntro(delta) {
    state.introElapsed += delta;
    const cycle = reducedMotion ? 2 : 13;
    const time = state.introElapsed % cycle;
    train.position.x = 0;
    train.position.y = 0.04;
    train.position.z = 3.7;
    train.rotation.y = 0;
    if (reducedMotion) {
      cameraGoal.set(5.8, 4.2, 11.5);
      lookGoal.set(0, 1.6, 0);
    } else if (time < 3.5) {
      const progress = time / 3.5;
      cameraGoal.set(-11 + progress * 5, 2.2 + progress * 1.5, -10 + progress * 8);
      lookGoal.set(0, 1.5, -2 + progress * 3);
    } else if (time < 7) {
      const progress = (time - 3.5) / 3.5;
      cameraGoal.set(-6 + progress * 8.2, 3.7 + Math.sin(progress * Math.PI) * 1.8, -2 + progress * 6);
      lookGoal.set(0, 1.75, 1.5);
    } else if (time < 10) {
      const progress = (time - 7) / 3;
      cameraGoal.set(2.2 - progress * 1.3, 4.2 - progress * 1.3, 4.2 - progress * 2.3);
      lookGoal.set(0, 2.8, 1);
    } else {
      const progress = (time - 10) / 3;
      cameraGoal.set(1 + progress * 5, 3 + progress * 1.5, 2 + progress * 9);
      lookGoal.set(0, 1.7, -1 - progress * 4);
    }
    camera.position.lerp(cameraGoal, 0.035);
    cameraLook.lerp(lookGoal, 0.05);
    camera.lookAt(cameraLook);
    moveWorld(delta * 5.5);
  }

  function moveWorld(distance) {
    let farthestTrack = Infinity;
    trackSegments.forEach(segment => { farthestTrack = Math.min(farthestTrack, segment.position.z); });
    trackSegments.forEach(segment => {
      segment.position.z += distance;
      if (segment.position.z > 24) {
        segment.position.z = farthestTrack - segmentLength;
        farthestTrack = segment.position.z;
      }
      const inSplit = state.junctionOpen && segment.position.z < -8 && segment.position.z > -65;
      const split = inSplit ? THREE.MathUtils.smoothstep(segment.position.z, -65, -8) : 0;
      segment.children.forEach(child => {
        child.position.x = child.userData.baseX + child.userData.lane * split * 2.2;
      });
    });
    let farthestProp = Infinity;
    props.forEach(prop => { farthestProp = Math.min(farthestProp, prop.position.z); });
    props.forEach(prop => {
      prop.position.z += distance;
      if (prop.position.z > 18) {
        prop.position.z = farthestProp - 7 - Math.random() * 6;
        prop.position.x = (Math.random() > 0.5 ? 1 : -1) * (8.5 + Math.random() * 14);
        farthestProp = prop.position.z;
      }
    });
  }

  function updatePlaying(delta) {
    state.runElapsed += delta;
    state.speed = Math.min(23, 16 + state.runElapsed * 0.055);
    state.distance += state.speed * delta;
    state.lane = THREE.MathUtils.damp(state.lane, state.targetLane, 8, delta);
    train.position.x = state.lane * laneWidth;
    train.rotation.z = THREE.MathUtils.damp(train.rotation.z, (state.targetLane - state.lane) * -0.12, 7, delta);
    train.userData.cat.rotation.z = Math.sin(state.elapsed * 4) * 0.04;
    train.userData.cat.userData.head.rotation.y = Math.sin(state.elapsed * 1.2) * 0.12;

    if (state.jump > 0 || state.jumpVelocity > 0) {
      state.jumpVelocity -= 21 * delta;
      state.jump = Math.max(0, state.jump + state.jumpVelocity * delta);
      if (state.jump === 0) state.jumpVelocity = 0;
    }
    train.position.y = 0.04 + state.jump;

    state.leverCharge = Math.min(1, state.leverCharge + delta / 8);
    if (state.leverCharge >= 1 && leverButton.classList.contains("cooldown")) {
      leverButton.classList.remove("cooldown");
      $("#lever-ready").textContent = "Ready";
    }
    moveWorld(state.speed * delta);

    if (state.runElapsed >= state.nextSpawn) {
      spawnRaccoon(state.runElapsed < 11);
      state.nextSpawn = state.runElapsed + 7 + Math.random() * 5;
    }
    if (!state.junctionOpen && state.runElapsed >= state.nextJunction) openJunction();
    if (state.junctionOpen && state.runElapsed >= state.nextJunction + 6) completeJunction();

    obstacles.forEach(raccoon => {
      raccoon.position.z += state.speed * delta;
      raccoon.position.y = Math.max(0, raccoon.position.y);
      if (raccoon.userData.bounced) {
        raccoon.userData.bounceVelocity -= 18 * delta;
        raccoon.position.y += raccoon.userData.bounceVelocity * delta;
        raccoon.rotation.z += raccoon.userData.spin * delta;
        raccoon.position.x += raccoon.userData.spin * delta * 0.7;
      } else {
        raccoon.rotation.y = Math.sin(state.elapsed * 6) * 0.18;
        if (!raccoon.userData.hit && raccoon.position.z > 1.3 && raccoon.position.z < 6.4 && Math.abs(state.lane - raccoon.userData.lane) < 0.42) {
          raccoon.userData.hit = true;
          raccoon.userData.active = false;
          if (state.jump < 0.9) takeDamage();
          else {
            state.raccoons += 1;
            announce("Robber cleared!");
          }
        }
      }
      if (raccoon.position.z > 30 || raccoon.position.y < -3) {
        raccoon.visible = false;
        raccoon.userData.active = false;
      }
    });

    effects.forEach(effect => {
      effect.userData.life -= delta * 1.3;
      effect.position.z -= effect.userData.velocity * delta;
      effect.material.opacity = Math.max(0, effect.userData.life);
      effect.rotation.z += delta * 1.4;
      if (effect.userData.life <= 0) {
        scene.remove(effect);
        effect.geometry.dispose();
        effect.material.dispose();
      }
    });
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      if (effects[index].userData.life <= 0) effects.splice(index, 1);
    }

    const sway = Math.sin(state.elapsed * 0.8) * 0.25;
    cameraGoal.set(train.position.x + 5 + sway, 5.2 + state.jump * 0.35, 12.8);
    lookGoal.set(train.position.x, 1.7 + state.jump * 0.2, -12);
    if (state.junctionOpen) {
      cameraGoal.x = THREE.MathUtils.damp(cameraGoal.x, 0, 2, delta);
      cameraGoal.y = 7.2;
      cameraGoal.z = 14.5;
      lookGoal.set(state.junctionChoice * 5, 0.8, -34);
    }
    camera.position.lerp(cameraGoal, 1 - Math.exp(-3.2 * delta));
    cameraLook.lerp(lookGoal, 1 - Math.exp(-4 * delta));
    camera.lookAt(cameraLook);
    camera.fov = THREE.MathUtils.damp(camera.fov, state.junctionOpen ? 61 : 54, 3, delta);
    camera.updateProjectionMatrix();

    $("#distance-value").textContent = `${Math.floor(state.distance)} m`;
    if (state.runElapsed >= 66) endRun(true);
  }

  function updateResult(delta) {
    moveWorld(delta * 4);
    train.position.x = THREE.MathUtils.damp(train.position.x, 0, 2, delta);
    train.position.y = 0.04;
    cameraGoal.set(6.7, 4.5, 11.5);
    lookGoal.set(0, 1.7, 0);
    camera.position.lerp(cameraGoal, 1 - Math.exp(-2 * delta));
    cameraLook.lerp(lookGoal, 1 - Math.exp(-2 * delta));
    camera.lookAt(cameraLook);
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min(0.05, (now - state.lastFrame) / 1000 || 0.016);
    state.lastFrame = now;
    state.elapsed += delta;
    stars.rotation.y += delta * 0.006;
    rimLight.intensity = 2.7 + Math.sin(state.elapsed * 2) * 0.35;
    if (state.mode === "intro") updateIntro(delta);
    if (state.mode === "playing") updatePlaying(delta);
    if (state.mode === "result") updateResult(delta);
    renderer.render(scene, camera);
  }

  let pointerStart = null;
  canvas.addEventListener("pointerdown", event => { pointerStart = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener("pointerup", event => {
    if (!pointerStart || state.mode !== "playing") return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) selectLane(state.targetLane + Math.sign(dx));
    else if (dy < -35) jump();
    else if (dy > 45) selectLane(0);
    pointerStart = null;
  });

  document.querySelectorAll(".lane-button").forEach(button => button.addEventListener("click", () => selectLane(Number(button.dataset.lane))));
  rideButton.addEventListener("click", startRun);
  againButton.addEventListener("click", startRun);
  jumpButton.addEventListener("click", jump);
  leverButton.addEventListener("click", litterBlast);
  window.addEventListener("keydown", event => {
    if (["ArrowLeft", "a", "A"].includes(event.key)) selectLane(state.targetLane - 1);
    if (["ArrowRight", "d", "D"].includes(event.key)) selectLane(state.targetLane + 1);
    if (["ArrowUp", "w", "W", " "].includes(event.key)) { event.preventDefault(); jump(); }
    if (["ArrowDown", "s", "S"].includes(event.key)) selectLane(0);
    if (["e", "E"].includes(event.key)) litterBlast();
  });

  audio.volume = 0.45;
  soundButton.addEventListener("click", () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });
  const updateSound = () => {
    const playing = !audio.paused;
    soundButton.setAttribute("aria-pressed", String(playing));
    soundButton.setAttribute("aria-label", playing ? "Turn music off" : "Turn music on");
  };
  audio.addEventListener("play", updateSound);
  audio.addEventListener("pause", updateSound);
  addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    state.lastFrame = performance.now();
    if (document.hidden && !audio.paused) audio.pause();
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    addEventListener("load", () => navigator.serviceWorker.register("/kitties/sw.js").catch(() => {}));
  }

  resize();
  camera.position.set(-11, 2.2, -10);
  cameraLook.set(0, 1.5, -2);
  requestAnimationFrame(animate);
})();
