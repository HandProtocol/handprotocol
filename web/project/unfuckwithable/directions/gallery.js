/* Unfuckable With: style portfolio gallery.
   Renders the cards, the lightbox viewer (desktop / phone), and the picks
   tray. Picks are shared with each style page's pill through
   localStorage["uw-style-picks"] and sent through the site's feedback fn. */
(() => {
  const STYLES = [
    { slug: "noir", name: "Noir", tag: "black", label: "black leads",
      desc: "Lacquer black and light gold. Your Giza photo glows inside a three-layer shield of gold rings with the course's verbs orbiting it. Glamorous, protective, expensive.",
      fonts: "Bodoni Moda + Hanken Grotesk", colors: ["#140d10", "#ecd9a3", "#f2a7b5", "#f8f6f2"] },
    { slug: "rose", name: "Rosé", tag: "rose", label: "pink leads",
      desc: "The whole page is rose pink and the type does the shouting. Poster headline, black censor bars, a spinning asterisk in sh*t, outcomes stacked like strips of tape. Direct and unapologetic.",
      fonts: "Archivo, condensed to wide", colors: ["#f5a8b8", "#140d10", "#f8f6f2", "#eedba6"] },
    { slug: "halo", name: "Halo", tag: "white", label: "white leads",
      desc: "How it feels after the reset. Warm white, an engraved roman typeface, thin gold lines, and your photo held in an oval with a soft aura of rose and gold. Calm, clear, quietly luxurious.",
      fonts: "Marcellus + Jost", colors: ["#fbf9f6", "#f2aab6", "#ead7a0", "#15100f"] },
    { slug: "gilt", name: "Gilt", tag: "gold", label: "gold leads",
      desc: "Light gold from edge to edge. Art-deco symmetry: a ruled frame, your doorway photo under an arch with a sunburst rising behind it, a rose wax-seal, and a black dome for the final offer. Bold and ceremonial.",
      fonts: "Gloock + Figtree", colors: ["#ecd9a4", "#15110c", "#f3a9b6", "#fbf9f3"] },
  ];
  STYLES.forEach((s, i) => { s.index = i; s.href = `${s.slug}/`; });

  const KEY = "uw-style-picks";
  const ENDPOINT = "/.netlify/functions/feedback";
  const SOURCE = "Unfuckable With styles";
  const BASE = "https://handprotocol.org/project/unfuckwithable/directions/";
  const readPicks = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]").filter((s) => STYLES.some((x) => x.slug === s)); } catch { return []; } };
  const writePicks = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} };
  const isPicked = (slug) => readPicks().includes(slug);
  const togglePick = (slug) => {
    const list = readPicks();
    writePicks(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
    renderPicks();
  };
  const byName = (slug) => STYLES.find((s) => s.slug === slug);
  const publicUrl = (s) => `${BASE}${s.slug}/`;
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
        <div class="card__head"><span class="card__num">${pad(s.index)}</span><h2 class="card__name">${esc(s.name)}</h2><span class="tag tag--${s.tag}">${esc(s.label)}</span></div>
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
    try { localStorage.setItem("uw-gallery-mode", mode); } catch {}
  };
  viewer.querySelectorAll("[data-device]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.device)));
  let storedMode = "desktop";
  try { storedMode = localStorage.getItem("uw-gallery-mode") || "desktop"; } catch {}
  setMode(window.innerWidth < 720 ? "desktop" : storedMode);

  function openViewer(slug) {
    const s = byName(slug);
    if (!s) return;
    if (viewer.hidden) lastFocus = document.activeElement;
    current = s;
    vName.textContent = s.name;
    vNum.textContent = pad(s.index);
    vTag.textContent = s.label;
    vTag.className = `tag tag--${s.tag}`;
    vOpen.href = s.href;
    /* index.html keeps file:// previews working; directory URLs are fine on Netlify. */
    frame.src = `${s.slug}/index.html`;
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
    const list = STYLES;
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
    const name = trayForm.name.value.trim() || "Courtney (preview)";
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
      trayStatus.textContent = "Sent ✓ koH has your picks. You can keep browsing and send again any time.";
    } catch {
      try { await navigator.clipboard.writeText(text); trayStatus.textContent = "Couldn't reach koH from here, so your picks were copied to the clipboard instead. Paste them into a text."; }
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
