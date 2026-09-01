/* Three Hands Healing — style portfolio gallery.
   Renders the cards, the lightbox viewer (desktop / phone), and the picks
   tray. Picks are shared with each style page's pill through
   localStorage["thh-style-picks"] and sent through the site's feedback fn. */
(() => {
  const STYLES = [
    { slug: "gateway", name: "Gateway", tag: "original", href: "../?design=gateway",
      desc: "The first direction: a calm video hero, ivory and forest green, an editorial serif.",
      fonts: "DM Serif Display + DM Sans", colors: ["#f4efe4", "#344c3d", "#94a58d", "#a66148", "#c78b35"] },
    { slug: "meadow", name: "Meadow", tag: "original", href: "../?design=meadow",
      desc: "Same bones, warmer: meadow photography leads and the palette lifts toward sun and grass.",
      fonts: "DM Serif Display + DM Sans", colors: ["#f4efe4", "#4a5a3a", "#b3b56a", "#c78b35", "#2d3329"] },
    { slug: "forest", name: "Forest", tag: "original", href: "../?design=forest",
      desc: "Same bones, deeper: shaded greens, the archway portraits, a quieter mood.",
      fonts: "DM Serif Display + DM Sans", colors: ["#e9e0d1", "#2d3329", "#344c3d", "#94a58d", "#a66148"] },

    { slug: "linen", name: "Linen", tag: "stunning",
      desc: "Quiet Scandinavian editorial: one enormous line of type, a small photo, and room to breathe.",
      fonts: "Cormorant Garamond + Karla", colors: ["#f7f6f2", "#17181a", "#3f5a47", "#b9b6ae", "#e6eaf0"] },
    { slug: "cathedral", name: "Cathedral", tag: "stunning",
      desc: "Candlelit stone: near-black, gold hairlines, and every photo inside an arch like the real one.",
      fonts: "Bodoni Moda + Jost", colors: ["#0e0c0a", "#c9a46a", "#e9e2d6", "#5a2a26", "#2a2522"] },
    { slug: "bloom", name: "Bloom", tag: "stunning",
      desc: "Botanical watercolor: soft washes and hand-drawn florals that grow as you scroll.",
      fonts: "Fraunces + Nunito Sans", colors: ["#f8ece8", "#e9b3b8", "#a7bfa3", "#cbbcdd", "#e7c77f"] },
    { slug: "terra", name: "Terra", tag: "stunning",
      desc: "Hill Country earth: terracotta, ochre, and a rising sun behind Maria in the meadow.",
      fonts: "Fraunces + Work Sans", colors: ["#b5573a", "#d9a441", "#e7cbaf", "#2f2a24", "#8a9a7b"] },
    { slug: "meridian", name: "Meridian", tag: "stunning",
      desc: "Precision and trust: a clean tapping-point diagram, a visible grid, one red.",
      fonts: "IBM Plex Sans + IBM Plex Mono", colors: ["#ffffff", "#232323", "#e0452f", "#ededea", "#6b6e73"] },
    { slug: "halo", name: "Halo", tag: "stunning",
      desc: "Aurora glass: a soft rotating halo of light behind the portrait, frosted cards.",
      fonts: "Sora + Manrope", colors: ["#f3f5fb", "#ffc8a2", "#c7b9ff", "#b8f0dc", "#1e2140"] },
    { slug: "ink", name: "Ink", tag: "stunning",
      desc: "Sumi-e stillness: an ensō drawn on arrival, a printed duotone portrait, vast space.",
      fonts: "Noto Serif Display + Zen Kaku Gothic", colors: ["#eeebe4", "#1b1b1b", "#8c8a84", "#c8362b", "#ffffff"] },

    { slug: "prism", name: "Prism", tag: "wild",
      desc: "Chromatic aura: a cursor-reactive field of color behind Maria on deep violet.",
      fonts: "Unbounded + Space Grotesk", colors: ["#14002b", "#ff3cac", "#ff9a3c", "#2bd2ff", "#7b2cff"] },
    { slug: "stellar", name: "Stellar", tag: "wild",
      desc: "Constellations, literally: a night sky, a family drawn in stars, moon-phase sessions.",
      fonts: "Marcellus + Inter", colors: ["#070b1e", "#101a3a", "#f4f1ff", "#c9cfe3", "#e8c170"] },
    { slug: "pulse", name: "Pulse", tag: "wild",
      desc: "Neo-brutalist: black outlines, hard shadows, and a tap-along panel you can actually play.",
      fonts: "Archivo Black + Space Mono", colors: ["#ffffff", "#111111", "#ff5c1a", "#7ad0ff", "#ffe45c"] },
    { slug: "tide", name: "Tide", tag: "wild",
      desc: "The site breathes with you: waves that rise and fall on a guided 4-4-6 breath.",
      fonts: "Newsreader + Albert Sans", colors: ["#062c33", "#0e4f5c", "#9fe1d6", "#eaf7f5", "#f09a8a"] },
    { slug: "retro", name: "Retro", tag: "wild",
      desc: "Seventies wellness poster: sun rays, arches, mustard and burnt orange, groovy type.",
      fonts: "Shrikhand + Josefin Sans", colors: ["#e3a82b", "#c8501f", "#6b7f3a", "#f8e9c9", "#4a2c1a"] },
    { slug: "zine", name: "Zine", tag: "wild",
      desc: "A scrapbook made by hand: taped polaroids, marker circles, sticky-note sessions.",
      fonts: "Anton + Caveat + Special Elite", colors: ["#d9c4a1", "#faf7f0", "#d1342f", "#4b4a47", "#2b4c9b"] },
    { slug: "monolith", name: "Monolith", tag: "wild",
      desc: "One slow film: full-screen chapters, the tapping video, giant type, a chapter rail.",
      fonts: "Bricolage Grotesque + Inter Tight", colors: ["#0a0a0a", "#f2f0eb", "#e7c9a5", "#3b3b3b", "#8a7a6a"] },
  ];
  STYLES.forEach((s, i) => { s.index = i; s.href = s.href || `${s.slug}/`; });

  const KEY = "thh-style-picks";
  const ENDPOINT = "/.netlify/functions/feedback";
  const SOURCE = "Three Hands Healing styles";
  const readPicks = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]").filter((s) => STYLES.some((x) => x.slug === s)); } catch { return []; } };
  const writePicks = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} };
  const isPicked = (slug) => readPicks().includes(slug);
  const togglePick = (slug) => {
    const list = readPicks();
    writePicks(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
    renderPicks();
  };
  const byName = (slug) => STYLES.find((s) => s.slug === slug);
  const publicUrl = (s) => s.href.startsWith("../")
    ? `https://handprotocol.org/threehandshealing/${s.href.slice(3)}`
    : `https://handprotocol.org/threehandshealing/styles/${s.slug}/`;
  const pad = (n) => String(n + 1).padStart(2, "0");
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---- Cards -------------------------------------------------------- */
  const grid = document.querySelector("[data-grid]");
  grid.innerHTML = STYLES.map((s) => `
    <li class="card" data-card="${s.slug}" data-tag="${s.tag}">
      <button type="button" class="card__media" data-open="${s.slug}" aria-label="Open ${esc(s.name)}">
        <img class="card__shot" src="_shots/${s.slug}.webp" alt="" loading="lazy" decoding="async" width="960" height="600">
        <span class="card__phone" aria-hidden="true"><img src="_shots/${s.slug}-m.webp" alt="" loading="lazy" decoding="async" width="300" height="649"></span>
        <span class="card__open">Open →</span>
      </button>
      <div class="card__body">
        <div class="card__head"><span class="card__num">${pad(s.index)}</span><h2 class="card__name">${esc(s.name)}</h2><span class="tag tag--${s.tag}">${s.tag}</span></div>
        <p class="card__desc">${esc(s.desc)}</p>
        <div class="card__meta"><span class="swatches" aria-hidden="true">${s.colors.map((c) => `<i style="background:${c}"></i>`).join("")}</span><span class="card__fonts">${esc(s.fonts)}</span></div>
        <div class="card__actions">
          <button type="button" class="btn btn--primary" data-open="${s.slug}">View</button>
          <button type="button" class="btn pick" data-pick="${s.slug}" aria-pressed="${isPicked(s.slug)}"><span class="heart" aria-hidden="true"></span><span data-pick-label>${isPicked(s.slug) ? "Picked" : "Pick"}</span></button>
          <a class="btn" href="${s.href}" target="_blank" rel="noopener">Full page ↗</a>
        </div>
      </div>
    </li>`).join("");

  grid.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    if (open) return openViewer(open.dataset.open);
    const pick = e.target.closest("[data-pick]");
    if (pick) togglePick(pick.dataset.pick);
  });

  /* ---- Filters ------------------------------------------------------ */
  const counts = { all: STYLES.length };
  STYLES.forEach((s) => { counts[s.tag] = (counts[s.tag] || 0) + 1; });
  document.querySelectorAll("[data-count]").forEach((el) => { el.textContent = counts[el.dataset.count] || 0; });
  const filterButtons = [...document.querySelectorAll("[data-filter]")];
  const applyFilter = (tag) => {
    filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === tag)));
    let shown = 0;
    grid.querySelectorAll("[data-card]").forEach((card) => {
      const hide = tag !== "all" && card.dataset.tag !== tag;
      card.classList.toggle("is-hidden", hide);
      if (!hide) shown++;
    });
    document.querySelector("[data-empty]").hidden = shown > 0;
  };
  filterButtons.forEach((b) => b.addEventListener("click", () => applyFilter(b.dataset.filter)));

  document.querySelector("[data-surprise]").addEventListener("click", () => {
    const pool = STYLES.filter((s) => s.tag !== "original");
    openViewer(pool[Math.floor(Math.random() * pool.length)].slug);
  });

  /* ---- Viewer ------------------------------------------------------- */
  const viewer = document.querySelector("[data-viewer]");
  const frame = viewer.querySelector("[data-viewer-frame]");
  const vName = viewer.querySelector("[data-viewer-name]");
  const vNum = viewer.querySelector("[data-viewer-num]");
  const vTag = viewer.querySelector("[data-viewer-tag]");
  const vOpen = viewer.querySelector("[data-viewer-open]");
  const vPick = viewer.querySelector("[data-viewer-pick]");
  const vPickLabel = viewer.querySelector("[data-viewer-pick-label]");
  let current = null;
  let lastFocus = null;

  const setMode = (mode) => {
    viewer.dataset.mode = mode;
    viewer.querySelectorAll("[data-device]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.device === mode)));
    try { localStorage.setItem("thh-gallery-mode", mode); } catch {}
  };
  viewer.querySelectorAll("[data-device]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.device)));
  let storedMode = "desktop";
  try { storedMode = localStorage.getItem("thh-gallery-mode") || "desktop"; } catch {}
  setMode(window.innerWidth < 720 ? "desktop" : storedMode);

  function openViewer(slug) {
    const s = byName(slug);
    if (!s) return;
    if (viewer.hidden) lastFocus = document.activeElement;
    current = s;
    vName.textContent = s.name;
    vNum.textContent = pad(s.index);
    vTag.textContent = s.tag;
    vTag.className = `tag tag--${s.tag}`;
    vOpen.href = s.href;
    /* Directory URLs are fine on Netlify; index.html keeps file:// previews working too. */
    frame.src = s.href.startsWith("../") ? s.href : `${s.slug}/index.html`;
    vPick.setAttribute("aria-pressed", String(isPicked(slug)));
    vPickLabel.textContent = isPicked(slug) ? "Picked" : "Pick this";
    viewer.hidden = false;
    document.body.style.overflow = "hidden";
    if (location.hash !== `#${slug}`) history.replaceState(null, "", `#${slug}`);
    viewer.querySelector("[data-viewer-close]").focus();
  }
  function closeViewer() {
    viewer.hidden = true;
    frame.src = "about:blank";
    document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname + location.search);
    if (current) document.querySelector(`[data-card="${current.slug}"] [data-open]`)?.focus();
    else lastFocus?.focus?.();
    current = null;
  }
  const step = (dir) => {
    if (!current) return;
    const visible = STYLES.filter((s) => !grid.querySelector(`[data-card="${s.slug}"]`).classList.contains("is-hidden"));
    const list = visible.length ? visible : STYLES;
    const i = list.findIndex((s) => s.slug === current.slug);
    openViewer(list[(i + dir + list.length) % list.length].slug);
  };
  viewer.querySelector("[data-viewer-close]").addEventListener("click", closeViewer);
  viewer.querySelector("[data-viewer-prev]").addEventListener("click", () => step(-1));
  viewer.querySelector("[data-viewer-next]").addEventListener("click", () => step(1));
  vPick.addEventListener("click", () => {
    if (!current) return;
    togglePick(current.slug);
    vPick.setAttribute("aria-pressed", String(isPicked(current.slug)));
    vPickLabel.textContent = isPicked(current.slug) ? "Picked" : "Pick this";
  });
  document.addEventListener("keydown", (e) => {
    if (viewer.hidden) return;
    if (e.key === "Escape") closeViewer();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  /* ---- Picks tray --------------------------------------------------- */
  const tray = document.querySelector("[data-tray]");
  const trayCount = tray.querySelector("[data-tray-count]");
  const trayLabel = tray.querySelector("[data-tray-label]");
  const trayNames = tray.querySelector("[data-tray-names]");
  const trayStatus = tray.querySelector("[data-tray-status]");
  const trayForm = tray.querySelector("[data-tray-form]");

  function renderPicks() {
    const list = readPicks();
    grid.querySelectorAll("[data-pick]").forEach((b) => {
      const on = list.includes(b.dataset.pick);
      b.setAttribute("aria-pressed", String(on));
      b.querySelector("[data-pick-label]").textContent = on ? "Picked" : "Pick";
    });
    tray.hidden = list.length === 0;
    trayCount.textContent = list.length;
    trayLabel.textContent = list.length === 1 ? "pick" : "picks";
    trayNames.textContent = list.map((s) => byName(s).name).join(", ");
  }
  renderPicks();
  window.addEventListener("storage", (e) => { if (e.key === KEY) renderPicks(); });
  window.addEventListener("focus", renderPicks);

  tray.querySelector("[data-tray-clear]").addEventListener("click", () => { writePicks([]); renderPicks(); trayStatus.textContent = ""; });

  trayForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const list = readPicks();
    if (!list.length) return;
    const name = trayForm.name.value.trim() || "Maria (preview)";
    const note = trayForm.note.value.trim();
    const text = [
      `Style picks (${list.length}): ${list.map((s) => `${byName(s).name} [${s}]`).join(", ")}`,
      `Links: ${list.map((s) => publicUrl(byName(s))).join(" ")}`,
      note ? `Note: ${note}` : null,
    ].filter(Boolean).join("\n");
    const send = trayForm.querySelector(".tray__send");
    send.disabled = true;
    trayStatus.textContent = "Sending…";
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, path: location.pathname, title: document.title, name, source: SOURCE, tags: ["🧭 picks", "🎨 style"], vw: innerWidth, vh: innerHeight, ua: navigator.userAgent, ts: Date.now() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      trayStatus.textContent = "Sent ✓ — koH has your picks. You can keep browsing and send again any time.";
    } catch {
      try { await navigator.clipboard.writeText(text); trayStatus.textContent = "Couldn't reach koH from here — your picks were copied to the clipboard instead. Paste them into a text."; }
      catch { trayStatus.textContent = "Couldn't send. Just tell koH: " + list.map((s) => byName(s).name).join(", "); }
    } finally { send.disabled = false; }
  });

  /* ---- Deep link ---------------------------------------------------- */
  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (fromHash && byName(fromHash)) openViewer(fromHash);
  window.addEventListener("hashchange", () => {
    const slug = decodeURIComponent(location.hash.slice(1));
    if (slug && byName(slug)) openViewer(slug); else if (!slug && !viewer.hidden) closeViewer();
  });
})();
