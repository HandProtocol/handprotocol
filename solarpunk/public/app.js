(() => {
  const API = "/api/drivers";
  const ME_KEY = "sps-driver";
  const REFRESH_MS = 30000;
  const SAVE_DELAY_MS = 700;
  const LABEL = { yes: "Can drive", maybe: "Maybe", no: "Can't" };
  const CODE_KEY = "sps-code";
  let code = "";
  try { code = localStorage.getItem(CODE_KEY) || ""; } catch {}
  const hdr = () => ({ "content-type": "application/json", "x-sps-code": code });
  const gate = document.getElementById("gate"), app = document.getElementById("app");
  function showGate(msg) {
    gate.hidden = false; app.hidden = true;
    const e = document.getElementById("gate-error"); e.textContent = msg || ""; e.hidden = !msg;
    document.getElementById("code").focus();
  }
  document.getElementById("gate-form").addEventListener("submit", (e) => {
    e.preventDefault();
    code = document.getElementById("code").value.trim();
    try { localStorage.setItem(CODE_KEY, code); } catch {}
    load();
  });

  let slots = [], drivers = [];
  let me = { id: null, token: null, name: "", seats: "", note: "", slots: {} };
  try { Object.assign(me, JSON.parse(localStorage.getItem(ME_KEY) || "{}")); } catch {}

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (hhmm) => {
    if (!/^\d{2}:\d{2}$/.test(hhmm || "")) return "";
    let [h, m] = hhmm.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    return m ? `${h}:${String(m).padStart(2, "0")} ${ap}` : `${h} ${ap}`;
  };
  const dayLabel = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const toast = (msg) => { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), 3200); };
  const persist = () => { try { localStorage.setItem(ME_KEY, JSON.stringify(me)); } catch {} };
  const setState = (text, cls = "muted") => { const s = $("#save-state"); s.textContent = text; s.className = "save-state " + cls; };

  $("#name").value = me.name || "";
  $("#seats").value = me.seats || "";
  $("#note").value = me.note || "";

  // Other drivers come from the server; my own row always comes from this tab's state.
  function driversFor(id) {
    const out = drivers.filter((d) => d.id !== me.id).map((d) => ({ name: d.name, v: d.slots[id] })).filter((d) => d.v);
    const mine = me.slots[id];
    if (me.id && (mine === "yes" || mine === "maybe")) out.unshift({ name: "You", v: mine });
    return out.sort((a, b) => (a.v === b.v ? 0 : a.v === "yes" ? -1 : 1));
  }

  function slotRow(s) {
    const ds = driversFor(s.id), my = me.slots[s.id] || "";
    const seats = parseInt(me.seats, 10);
    const short = seats && s.riders > seats ? ` Needs ${s.riders} rider seats; you listed ${seats}.` : "";
    const chips = ds.length
      ? ds.map((d) => `<span class="chip ${d.v}">${esc(d.name)}${d.v === "maybe" ? " (maybe)" : ""}</span>`).join("")
      : `<span class="chip none">No driver yet</span>`;
    return `<div class="slot ${s.dir}">
      <div class="when"><span class="t">${esc(s.pickup)}</span><small>Busy ${esc(fmt(s.start))}–${esc(fmt(s.end))}</small></div>
      <div class="what">
        <div class="route">${esc(s.from)} → ${esc(s.to)} <span class="tag ${s.dir}">${s.riders} rider${s.riders > 1 ? "s" : ""}</span></div>
        ${s.note || short ? `<p>${esc(s.note)}${esc(short)}</p>` : ""}
        <div class="drivers">${chips}</div>
      </div>
      <div class="toggle" role="group" aria-label="Your answer for ${esc(s.pickup)}, ${esc(s.from)} to ${esc(s.to)}">
        ${["yes", "maybe", "no"].map((v) => `<button type="button" data-slot="${esc(s.id)}" data-v="${v}" aria-pressed="${my === v}">${LABEL[v]}</button>`).join("")}
      </div>
    </div>`;
  }

  function render() {
    const box = $("#days");
    if (!slots.length) { box.innerHTML = `<p class="notice">No runs listed yet.</p>`; return; }
    const byDay = {};
    [...slots].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).forEach((s) => (byDay[s.date] ||= []).push(s));
    box.innerHTML = Object.entries(byDay).map(([date, ss]) => `
      <section class="day" aria-label="${esc(dayLabel(date))}">
        <div class="dayhead"><h2>${esc(dayLabel(date))}<span>${ss.length} run${ss.length > 1 ? "s" : ""}</span></h2>
          <button type="button" class="linkbtn" data-day="${esc(date)}">I can drive all of this day</button></div>
        <div class="rows">${ss.map(slotRow).join("")}</div>
      </section>`).join("");
    const others = drivers.filter((d) => d.id !== me.id).length + (me.id ? 1 : 0);
    $("#st-total").textContent = slots.length;
    $("#st-covered").textContent = slots.filter((s) => driversFor(s.id).some((d) => d.v === "yes")).length;
    $("#st-drivers").textContent = others;
    $("#st-mine").textContent = slots.filter((s) => me.slots[s.id] === "yes").length;
    $("#remove").hidden = !me.id;
  }

  async function load() {
    try {
      const res = await fetch(API, { cache: "no-store", headers: hdr() });
      if (res.status === 401) { showGate(code ? "That code isn't right. Try again." : ""); return; }
      if (!res.ok) throw new Error(res.status);
      gate.hidden = true; app.hidden = false;
      const data = await res.json();
      slots = data.slots || [];
      drivers = data.drivers || [];
      // Adopt my saved answers from the server the first time (e.g. after clearing this tab's state).
      const mineOnServer = me.id && drivers.find((d) => d.id === me.id);
      if (me.id && !mineOnServer && !saving) { me.id = null; persist(); }
      if (mineOnServer && !Object.keys(me.slots).length) { me.slots = { ...mineOnServer.slots }; persist(); }
      if (me.id) setState("Saved. Change anything and it saves again.", "ok");
      render();
    } catch {
      if (!slots.length) $("#days").innerHTML = `<p class="notice">Couldn't load the runs. Check your connection and reload the page.</p>`;
    }
  }

  // One save at a time; changes made during a save trigger one more.
  let saving = false, again = false, timer = null;
  function queueSave() {
    me.name = $("#name").value.trim();
    me.seats = $("#seats").value;
    me.note = $("#note").value;
    persist();
    if (!me.name) { setState("Add your name to save your answers.", "err"); return; }
    clearTimeout(timer);
    setState("Saving…");
    timer = setTimeout(save, SAVE_DELAY_MS);
  }
  async function save() {
    if (saving) { again = true; return; }
    saving = true;
    const answers = Object.fromEntries(Object.entries(me.slots).filter(([, v]) => v === "yes" || v === "maybe"));
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: hdr(),
        body: JSON.stringify({ id: me.id, token: me.token, name: me.name, seats: me.seats || null, note: me.note, slots: answers, website: $("#website").value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setState(data.error || "Couldn't save. Try again.", "err"); return; }
      if (data.driver) {
        me.id = data.driver.id;
        if (data.token) me.token = data.token;
        persist();
        drivers = [...drivers.filter((d) => d.id !== me.id), data.driver];
      }
      setState("Saved. Change anything and it saves again.", "ok");
      render();
    } catch {
      setState("Couldn't reach the server. Your answers are kept on this device; try again in a moment.", "err");
    } finally {
      saving = false;
      if (again) { again = false; save(); }
    }
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-slot]");
    if (b) {
      const id = b.dataset.slot, v = b.dataset.v;
      me.slots = { ...me.slots, [id]: me.slots[id] === v ? "" : v };
      render();
      if (!$("#name").value.trim()) { $("#name").focus(); toast("Add your name first so we can save this."); }
      queueSave();
      return;
    }
    const d = e.target.closest("button[data-day]");
    if (d) {
      const next = { ...me.slots };
      slots.filter((s) => s.date === d.dataset.day).forEach((s) => (next[s.id] = "yes"));
      me.slots = next;
      render(); queueSave();
      toast("Marked you as able to drive every run that day.");
    }
  });

  $("#me-form").addEventListener("submit", (e) => { e.preventDefault(); queueSave(); });
  ["name", "seats", "note"].forEach((id) => $("#" + id).addEventListener("change", () => { render(); queueSave(); }));
  $("#note").addEventListener("input", () => { if (me.id) queueSave(); });

  let confirmRemove = false;
  $("#remove").addEventListener("click", async () => {
    const btn = $("#remove");
    if (!confirmRemove) { confirmRemove = true; btn.textContent = "Tap again to remove your entry"; setTimeout(() => { confirmRemove = false; btn.textContent = "Remove my entry"; }, 4000); return; }
    confirmRemove = false;
    try {
      const res = await fetch(API, { method: "DELETE", headers: hdr(), body: JSON.stringify({ id: me.id, token: me.token }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast(data.error || "Couldn't remove your entry."); return; }
      drivers = drivers.filter((d) => d.id !== me.id);
      me = { id: null, token: null, name: "", seats: "", note: "", slots: {} };
      persist();
      $("#name").value = ""; $("#seats").value = ""; $("#note").value = "";
      btn.textContent = "Remove my entry";
      setState("Your entry is removed.");
      render();
    } catch { toast("Couldn't reach the server. Try again."); }
  });

  if (code) load(); else showGate();
  setInterval(() => { if (document.visibilityState === "visible" && !saving) load(); }, REFRESH_MS);
})();
