/* Three Hands Healing — DESIGN STUDIO (preview-only tooling).
   Extends the design switcher with type packs, energy-flare layers,
   and a copy-suggestion mode whose edits post to
   /.netlify/functions/feedback → command.feedback_pins (Postgres) +
   the Telegram Inspector topic, tagged with the picks in force.
   At launch: delete this file, studio.css, and their two index.html
   tags. The base site never references anything defined here. */

(() => {
  "use strict";

  const doc = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const ENDPOINT = "/.netlify/functions/feedback";
  const SOURCE = "Three Hands Healing preview";
  const MAX_MESSAGE = 1800; /* the feedback fn rejects >2000 chars */

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} },
    remove(key) { try { localStorage.removeItem(key); } catch {} },
  };

  const syncUrl = (key, value) => {
    if (!window.history.replaceState) return;
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history.replaceState(null, "", url);
  };

  let toastEl;
  let toastTimer;
  const toast = (message) => {
    if (!toastEl) {
      toastEl = document.createElement("p");
      toastEl.className = "studio-toast";
      toastEl.setAttribute("role", "status");
      document.body.append(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("is-shown");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove("is-shown"), 2800);
  };

  /* ---- Type packs ------------------------------------------------ */
  const TYPES = ["editorial", "ember", "quiet"];
  const TYPE_LABELS = { editorial: "Editorial", ember: "Ember", quiet: "Quiet" };
  const TYPE_FONTS = {
    ember: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Outfit:wght@400;500;600&display=swap",
    quiet: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600&display=swap",
  };
  const loadedFonts = new Set();

  const applyType = (name, { updateUrl = true } = {}) => {
    if (!TYPES.includes(name)) name = TYPES[0];
    if (TYPE_FONTS[name] && !loadedFonts.has(name)) {
      loadedFonts.add(name);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = TYPE_FONTS[name];
      document.head.append(link);
    }
    if (name === TYPES[0]) delete doc.dataset.type;
    else doc.dataset.type = name;
    store.set("thh-type", name);
    if (updateUrl) syncUrl("type", name === TYPES[0] ? null : name);
    typeChips.forEach((chip) =>
      chip.setAttribute("aria-pressed", String(chip.dataset.typeChoice === name)));
  };

  /* ---- Energy flare ---------------------------------------------- */
  const FLARES = [
    { id: "aura", label: "Aura veil" },
    { id: "motes", label: "Light motes" },
    { id: "cursor", label: "Cursor glow" },
    { id: "thread", label: "Golden thread" },
  ];
  const flareState = new Set();

  const buildAura = () => {
    if (document.querySelector(".fx-aura")) return;
    const layer = document.createElement("div");
    layer.className = "fx-aura";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = "<i></i><i></i><i></i>";
    document.body.append(layer);
  };

  const buildMotes = () => {
    if (document.querySelector(".fx-motes")) return;
    const layer = document.createElement("div");
    layer.className = "fx-motes";
    layer.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 16; i += 1) {
      const mote = document.createElement("i");
      if (i % 3 === 2) mote.className = "is-sage";
      const size = 3.5 + Math.random() * 4;
      const duration = 15 + Math.random() * 16;
      mote.style.cssText = [
        `left:${(Math.random() * 96 + 2).toFixed(1)}%`,
        `width:${size.toFixed(1)}px`,
        `height:${size.toFixed(1)}px`,
        `--dx:${(Math.random() * 90 - 45).toFixed(0)}px`,
        `animation-duration:${duration.toFixed(1)}s`,
        `animation-delay:-${(Math.random() * duration).toFixed(1)}s`,
      ].join(";");
      layer.append(mote);
    }
    document.body.append(layer);
  };

  let cursorEl;
  let cursorRaf;
  const cursor = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
  const trackCursor = (event) => { cursor.tx = event.clientX; cursor.ty = event.clientY; cursorEl.classList.add("is-live"); };
  const glideCursor = () => {
    cursor.x += (cursor.tx - cursor.x) * 0.09;
    cursor.y += (cursor.ty - cursor.y) * 0.09;
    cursorEl.style.transform = `translate3d(${cursor.x.toFixed(1)}px,${cursor.y.toFixed(1)}px,0)`;
    cursorRaf = requestAnimationFrame(glideCursor);
  };
  const startCursor = () => {
    if (!finePointer.matches || reducedMotion.matches) return;
    if (!cursorEl) {
      cursorEl = document.createElement("div");
      cursorEl.className = "fx-cursor";
      cursorEl.setAttribute("aria-hidden", "true");
      document.body.append(cursorEl);
    }
    window.addEventListener("pointermove", trackCursor, { passive: true });
    if (!cursorRaf) cursorRaf = requestAnimationFrame(glideCursor);
  };
  const stopCursor = () => {
    window.removeEventListener("pointermove", trackCursor);
    if (cursorRaf) { cancelAnimationFrame(cursorRaf); cursorRaf = undefined; }
    cursorEl?.classList.remove("is-live");
  };

  const applyFlare = ({ updateUrl = true } = {}) => {
    if (flareState.has("aura")) buildAura();
    if (flareState.has("motes")) buildMotes();
    if (flareState.has("cursor")) startCursor(); else stopCursor();
    const tokens = FLARES.map((f) => f.id).filter((id) => flareState.has(id));
    if (tokens.length) doc.dataset.flare = tokens.join(" ");
    else delete doc.dataset.flare;
    store.set("thh-flare", tokens.join(","));
    if (updateUrl) syncUrl("flare", tokens.join(",") || null);
    flareChips.forEach((chip) =>
      chip.setAttribute("aria-pressed", String(flareState.has(chip.dataset.flareChoice))));
  };

  /* ---- Copy-suggestion mode -------------------------------------- */
  const EDIT_STORE = "thh-copy-edits-v1";
  const NAME_STORE = "hand_fb_name_v1";
  const editables = [];        /* [{ el, key, where, orig }] */
  const byKey = new Map();
  const edits = new Map();     /* key → entry (subset of editables with changes) */
  let editing = false;

  const norm = (text) => String(text || "").replace(/\s+/g, " ").trim();

  const whereOf = (el) => {
    const section = el.closest("section[id], section, .learning-chapter, footer");
    if (!section) return "page";
    if (section.id === "top") return "hero";
    if (section.id) return section.id;
    const cls = (section.className || "").split(" ").find((c) => c && !c.startsWith("is-"));
    return cls ? cls.replace(/^(section|learning-)/, "") || cls : section.tagName.toLowerCase();
  };

  const collectEditables = () => {
    const raw = [...document.querySelectorAll(
      "main h1, main h2, main h3, main p, main li, main dt, main dd, main figcaption, footer .footer__brand p, footer .footer__notice",
    )].filter((el) =>
      !el.closest(".sr-only") && !el.classList.contains("sr-only") &&
      !el.hasAttribute("data-booking-status") && !el.hasAttribute("data-breath-note"));
    /* Keep leaf-most nodes only, so a card <li> never nests its own <h3>. */
    const leaves = raw.filter((el) => !raw.some((other) => other !== el && el.contains(other)));
    const perWhere = new Map();
    leaves.forEach((el) => {
      const where = whereOf(el);
      const tag = el.tagName.toLowerCase();
      const slot = `${where}:${tag}`;
      const index = (perWhere.get(slot) || 0);
      perWhere.set(slot, index + 1);
      const entry = { el, key: `${slot}:${index}`, where: `${where} · ${tag}`, orig: el.innerText };
      el.dataset.copyKey = entry.key;
      editables.push(entry);
      byKey.set(entry.key, entry);
    });
  };

  const saveEdits = () => {
    const payload = {};
    edits.forEach((entry, key) => { payload[key] = entry.el.innerText; });
    if (Object.keys(payload).length) store.set(EDIT_STORE, JSON.stringify(payload));
    else store.remove(EDIT_STORE);
  };

  const registerChange = (entry) => {
    const changed = norm(entry.el.innerText) !== norm(entry.orig);
    entry.el.classList.toggle("is-copy-changed", changed);
    if (changed) edits.set(entry.key, entry);
    else edits.delete(entry.key);
    saveEdits();
    renderTray();
  };

  const restoreSavedEdits = () => {
    let saved;
    try { saved = JSON.parse(store.get(EDIT_STORE) || "{}"); } catch { saved = {}; }
    Object.entries(saved).forEach(([key, text]) => {
      const entry = byKey.get(key);
      if (!entry || norm(text) === norm(entry.orig)) return;
      entry.el.innerText = text;
      entry.el.classList.add("is-copy-changed");
      edits.set(key, entry);
    });
  };

  const setEditing = (on) => {
    editing = on;
    if (on) doc.setAttribute("data-copy-editing", "");
    else doc.removeAttribute("data-copy-editing");
    editables.forEach((entry) => {
      if (on) {
        entry.el.setAttribute("contenteditable", "plaintext-only");
        if (entry.el.contentEditable !== "plaintext-only") entry.el.setAttribute("contenteditable", "true");
        entry.el.spellcheck = false;
      } else {
        entry.el.removeAttribute("contenteditable");
      }
    });
    editChip.setAttribute("aria-pressed", String(on));
    if (on) {
      closeCard();
      tray.hidden = false;
      tray.classList.add("is-open");
      toast("Tap any text and type your suggestion. Edits collect in the tray below.");
    } else if (!edits.size) {
      tray.hidden = true;
    }
    renderTray();
  };

  /* Editable text sits inside anchors (path cards); while editing,
     a tap should place the caret, never navigate. */
  document.addEventListener("click", (event) => {
    if (!editing) return;
    const anchor = event.target.closest("a[href]");
    if (anchor && (anchor.querySelector("[data-copy-key]") || event.target.closest("[data-copy-key]"))) {
      event.preventDefault();
    }
  }, true);

  document.addEventListener("input", (event) => {
    const el = event.target.closest?.("[data-copy-key]");
    if (!el) return;
    const entry = byKey.get(el.dataset.copyKey);
    if (entry) registerChange(entry);
  });

  /* ---- Picks + send ---------------------------------------------- */
  const picksLine = () => {
    const design = doc.dataset.design || "gateway";
    const type = doc.dataset.type || "editorial";
    const flare = doc.dataset.flare ? doc.dataset.flare.split(" ").join(", ") : "none";
    return `Picks — design: ${design} · type: ${type} · flare: ${flare}`;
  };

  const postNote = async (text, tags) => {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        path: window.location.pathname,
        title: document.title,
        name: nameInput.value.trim() || "Maria (preview)",
        source: SOURCE,
        tags,
        vw: window.innerWidth,
        vh: window.innerHeight,
        ua: navigator.userAgent,
        ts: Date.now(),
      }),
    });
    if (!response.ok) throw new Error(`feedback ${response.status}`);
  };

  const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

  const buildMessages = () => {
    const header = picksLine();
    const items = [...edits.values()].map((entry, index) =>
      `${index + 1}. [${entry.where}]\n   was: ${clip(norm(entry.orig), 700)}\n   now: ${clip(norm(entry.el.innerText), 700)}`);
    if (!items.length) return [`${header}\n(picks only — no copy edits)`];
    const messages = [];
    let current = `${header}\nCopy suggestions:\n`;
    items.forEach((item) => {
      if ((current + item).length > MAX_MESSAGE) { messages.push(current.trimEnd()); current = ""; }
      current += `\n${item}`;
    });
    messages.push(current.trimEnd());
    return messages.map((message, i) =>
      messages.length > 1 ? `${message}\n(part ${i + 1}/${messages.length})` : message);
  };

  const sendAll = async (statusEl, { picksOnly = false } = {}) => {
    const messages = picksOnly ? [`${picksLine()}\n(picks only)`] : buildMessages();
    statusEl.textContent = "Sending…";
    try {
      for (const message of messages) {
        await postNote(message, picksOnly ? ["🧭 picks"] : ["✍️ copy", "🧭 picks"]);
      }
      statusEl.textContent = picksOnly
        ? "Sent ✓ — your picks are pinned for koH."
        : "Sent ✓ — your suggestions are pinned for koH to fold in.";
    } catch {
      statusEl.textContent = "Couldn't sync — everything is still saved on this device. Try again, or use “Copy as text”.";
    }
  };

  const editsAsText = () => buildMessages().join("\n\n");

  /* ---- Studio panel UI ------------------------------------------- */
  const pill = document.querySelector("[data-design-switcher]");
  if (!pill) return;

  const sep = document.createElement("i");
  sep.className = "studio-sep";
  const studioToggle = document.createElement("button");
  studioToggle.type = "button";
  studioToggle.setAttribute("aria-expanded", "false");
  studioToggle.innerHTML = "<b>✦</b> Studio";
  pill.append(sep, studioToggle);

  const card = document.createElement("section");
  card.className = "studio-card";
  card.setAttribute("aria-label", "Design studio options");
  card.innerHTML = `
    <div class="studio-card__head"><b>Design studio</b>
      <button type="button" class="studio-card__close" aria-label="Close">✕</button></div>
    <div class="studio-group"><span>Type</span><div class="studio-chips" data-type-chips></div></div>
    <div class="studio-group"><span>Energy flare</span><div class="studio-chips" data-flare-chips></div></div>
    <div class="studio-group"><span>Copy</span><div class="studio-chips">
      <button type="button" class="studio-chip" data-edit-toggle aria-pressed="false">✎ Suggest copy edits</button>
    </div></div>
    <div class="studio-actions">
      <button type="button" class="studio-action" data-share>Copy preview link</button>
      <button type="button" class="studio-action" data-send-picks>Send my picks to koH</button>
    </div>
    <p class="studio-card__status" data-card-status aria-live="polite"></p>
    <p class="studio-card__hint">Mix a design, a type voice, and any flare you like — then send your picks, or switch on copy edits and rewrite the page in your own words.</p>`;
  document.body.append(card);

  const typeChipHolder = card.querySelector("[data-type-chips]");
  TYPES.forEach((name) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "studio-chip";
    chip.dataset.typeChoice = name;
    chip.setAttribute("aria-pressed", "false");
    chip.textContent = TYPE_LABELS[name];
    chip.addEventListener("click", () => applyType(name));
    typeChipHolder.append(chip);
  });
  const typeChips = [...typeChipHolder.children];

  const flareChipHolder = card.querySelector("[data-flare-chips]");
  FLARES.forEach((flare) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "studio-chip";
    chip.dataset.flareChoice = flare.id;
    chip.setAttribute("aria-pressed", "false");
    chip.textContent = flare.label;
    chip.addEventListener("click", () => {
      if (flareState.has(flare.id)) flareState.delete(flare.id);
      else flareState.add(flare.id);
      applyFlare();
    });
    flareChipHolder.append(chip);
  });
  const flareChips = [...flareChipHolder.children];

  const editChip = card.querySelector("[data-edit-toggle]");
  editChip.addEventListener("click", () => setEditing(!editing));

  const cardStatus = card.querySelector("[data-card-status]");
  const openCard = () => { card.classList.add("is-open"); studioToggle.setAttribute("aria-expanded", "true"); };
  const closeCard = () => { card.classList.remove("is-open"); studioToggle.setAttribute("aria-expanded", "false"); };
  studioToggle.addEventListener("click", () =>
    card.classList.contains("is-open") ? closeCard() : openCard());
  card.querySelector(".studio-card__close").addEventListener("click", closeCard);
  document.addEventListener("click", (event) => {
    if (!card.classList.contains("is-open")) return;
    if (!card.contains(event.target) && !pill.contains(event.target)) closeCard();
  });

  card.querySelector("[data-share]").addEventListener("click", async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("design", doc.dataset.design || "gateway");
    if (doc.dataset.type) url.searchParams.set("type", doc.dataset.type); else url.searchParams.delete("type");
    if (doc.dataset.flare) url.searchParams.set("flare", doc.dataset.flare.split(" ").join(",")); else url.searchParams.delete("flare");
    try {
      await navigator.clipboard.writeText(url.toString());
      cardStatus.textContent = "Link copied — it opens with exactly this look.";
    } catch {
      cardStatus.textContent = url.toString();
    }
  });
  card.querySelector("[data-send-picks]").addEventListener("click", () =>
    sendAll(cardStatus, { picksOnly: true }));

  /* ---- Copy tray -------------------------------------------------- */
  const tray = document.createElement("section");
  tray.className = "copy-tray";
  tray.hidden = true;
  tray.setAttribute("aria-label", "Your copy suggestions");
  tray.innerHTML = `
    <button type="button" class="copy-tray__bar" aria-expanded="false">
      <b>Copy suggestions</b><span class="copy-tray__count">0</span>
      <span class="copy-tray__chev">▾</span></button>
    <div class="copy-tray__body">
      <p class="copy-tray__empty">Tap any paragraph or heading on the page and type over it. Every change you make lands here so nothing is lost.</p>
      <div data-tray-items></div>
      <div class="copy-tray__send">
        <input class="copy-tray__name" type="text" placeholder="Your name (optional)" autocomplete="name">
        <button type="button" class="studio-action" data-send-edits>Send to koH</button>
        <button type="button" class="studio-action" data-copy-text>Copy as text</button>
        <button type="button" class="studio-action" data-clear-edits>Clear all</button>
        <p class="copy-tray__status" data-tray-status aria-live="polite"></p>
      </div>
    </div>`;
  document.body.append(tray);

  const trayBar = tray.querySelector(".copy-tray__bar");
  const trayCount = tray.querySelector(".copy-tray__count");
  const trayItems = tray.querySelector("[data-tray-items]");
  const trayEmpty = tray.querySelector(".copy-tray__empty");
  const trayStatus = tray.querySelector("[data-tray-status]");
  const nameInput = tray.querySelector(".copy-tray__name");
  nameInput.value = store.get(NAME_STORE) || "";
  nameInput.addEventListener("input", () => store.set(NAME_STORE, nameInput.value.trim()));

  trayBar.addEventListener("click", () => {
    const open = tray.classList.toggle("is-open");
    trayBar.setAttribute("aria-expanded", String(open));
  });

  const renderTray = () => {
    trayCount.textContent = String(edits.size);
    trayEmpty.hidden = edits.size > 0 || !editing;
    trayItems.textContent = "";
    edits.forEach((entry) => {
      const item = document.createElement("article");
      item.className = "copy-tray__item";
      const head = document.createElement("header");
      const where = document.createElement("span");
      where.className = "copy-tray__where";
      where.textContent = entry.where;
      const revert = document.createElement("button");
      revert.type = "button";
      revert.className = "copy-tray__revert";
      revert.textContent = "↺ revert";
      revert.addEventListener("click", () => {
        entry.el.innerText = entry.orig;
        registerChange(entry);
      });
      head.append(where, revert);
      const was = document.createElement("p");
      was.className = "copy-tray__was";
      was.textContent = norm(entry.orig);
      const now = document.createElement("p");
      now.className = "copy-tray__now";
      now.textContent = norm(entry.el.innerText);
      item.append(head, was, now);
      trayItems.append(item);
    });
    if (!editing && !edits.size) tray.hidden = true;
    else tray.hidden = false;
  };

  tray.querySelector("[data-send-edits]").addEventListener("click", () => {
    if (!edits.size) { trayStatus.textContent = "No changes yet — tap some text on the page first."; return; }
    sendAll(trayStatus);
  });
  tray.querySelector("[data-copy-text]").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(editsAsText());
      trayStatus.textContent = "Copied — paste it into any message to koH.";
    } catch {
      trayStatus.textContent = "Couldn't reach the clipboard on this device.";
    }
  });
  tray.querySelector("[data-clear-edits]").addEventListener("click", () => {
    if (!edits.size || !window.confirm("Put all text back the way it was?")) return;
    [...edits.values()].forEach((entry) => {
      entry.el.innerText = entry.orig;
      entry.el.classList.remove("is-copy-changed");
    });
    edits.clear();
    saveEdits();
    renderTray();
    trayStatus.textContent = "All text restored.";
  });

  /* ---- Boot ------------------------------------------------------- */
  collectEditables();
  restoreSavedEdits();
  renderTray();

  const params = new URLSearchParams(window.location.search);
  applyType(params.get("type") || store.get("thh-type") || TYPES[0], { updateUrl: Boolean(params.get("type")) });
  const flareParam = params.get("flare");
  const flareSaved = flareParam !== null ? flareParam : (store.get("thh-flare") || "");
  flareSaved.split(",").map((token) => token.trim()).filter(Boolean)
    .forEach((token) => { if (FLARES.some((f) => f.id === token)) flareState.add(token); });
  applyFlare({ updateUrl: Boolean(flareParam) });

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) stopCursor();
    else if (flareState.has("cursor")) startCursor();
  });
})();
