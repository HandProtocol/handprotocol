/* Untouchable Freedom — style portfolio gallery.
   Renders the cards, the lightbox viewer (desktop / phone), and the picks
   tray. Picks are shared with each style page's pill through
   localStorage["ufc-style-picks"] and sent through the site's feedback fn. */
(() => {
  const STYLES = [
    { slug: "marble", name: "Marble", tag: "faithful",
      desc: "Your cover, expanded into a room: black marble, thin gold veins that draw themselves as you scroll, white script, candlelight.",
      fonts: "Pinyon Script + Cormorant Garamond", colors: ["#121212", "#2a2a2a", "#c9a45c", "#f2ede4", "#515151"] },
    { slug: "shore", name: "Shore", tag: "faithful",
      desc: "The store you have now, done properly: the sea stacks, ivory and slate, a big editorial serif, a product card with real depth.",
      fonts: "Newsreader + Inter", colors: ["#f6f4ef", "#1f2428", "#6b7a86", "#c9a227", "#dfe3e6"] },
    { slug: "mirror", name: "Mirror", tag: "calm",
      desc: "\"It is a mirror.\" Museum white, enormous type, the cover shown with its own reflection, the four stages on a single line you descend.",
      fonts: "Cormorant Garamond + Inter Tight", colors: ["#fafafa", "#111111", "#8a8a8a", "#dcdcdc", "#ffffff"] },
    { slug: "ember", name: "Ember", tag: "calm",
      desc: "Warmth after the fall: blush, terracotta, cream, a soft glow behind the black cover, the stages as a strip of seasons.",
      fonts: "Fraunces + Nunito Sans", colors: ["#fbf1ea", "#e8b4a2", "#b5573a", "#3a2a26", "#e7c77f"] },
    { slug: "paper", name: "Paper", tag: "calm",
      desc: "The journal itself as a website: cream stock, ruled lines, ink-blue headings, handwritten prompts, and a page you can actually write on.",
      fonts: "Libre Baskerville + Caveat", colors: ["#f5efe3", "#1d2a44", "#7c6f5c", "#b23a3a", "#ffffff"] },
    { slug: "passage", name: "Passage", tag: "bold",
      desc: "The journey is the page: four full-screen chapters that move from deep charcoal through slate and dawn into light as you scroll.",
      fonts: "Playfair Display + Manrope", colors: ["#0f0f10", "#2b2f36", "#b98c5a", "#f4efe6", "#6d6a63"] },
    { slug: "static", name: "Static", tag: "bold",
      desc: "Loud and young: black, white, and your acid yellow. Stacked poster type, film grain, a marquee of the twelve chapters, hard edges.",
      fonts: "Bebas Neue + Space Grotesk", colors: ["#0a0a0a", "#ffffff", "#e8d21c", "#ff5c1a", "#3a3a3a"] },
  ];
  STYLES.forEach((s, i) => { s.index = i; s.href = `${s.slug}/`; });

  const KEY = "ufc-style-picks";
  const ENDPOINT = "/.netlify/functions/feedback";
  const SOURCE = "Untouchable Freedom styles";
  const BASE = "https://handprotocol.org/project/untouchable-freedom/";
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
    openViewer(STYLES[Math.floor(Math.random() * STYLES.length)].slug);
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
    try { localStorage.setItem("ufc-gallery-mode", mode); } catch {}
  };
  viewer.querySelectorAll("[data-device]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.device)));
  let storedMode = "desktop";
  try { storedMode = localStorage.getItem("ufc-gallery-mode") || "desktop"; } catch {}
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
    const name = trayForm.name.value.trim() || "Hannah (preview)";
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
