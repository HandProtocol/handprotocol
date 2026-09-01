/* Three Hands Healing — style-portfolio pill.
   Injected into every style page. Adds a small floating pill:
   "← All styles · <Style name> · ♡ Pick this". Picks persist in
   localStorage["thh-style-picks"] and can be sent to koH through
   /.netlify/functions/feedback (source "Three Hands Healing styles").
   Preview-only; delete at launch. */
(() => {
  /* Inside the gallery lightbox the toolbar handles picks; stay out of the way. */
  if (window.self !== window.top) return;
  const html = document.documentElement;
  const slug = html.dataset.style || location.pathname.split("/").filter(Boolean).pop() || "style";
  const name = (document.title.split("—")[1] || document.title.split("|")[1] || slug).trim();
  const KEY = "thh-style-picks";
  const ENDPOINT = "/.netlify/functions/feedback";
  const SOURCE = "Three Hands Healing styles";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
  const write = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} };
  const picked = () => read().includes(slug);

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = new URL("_portfolio.css", document.currentScript?.src || new URL("../", location.href)).href;
  document.head.append(css);

  const pill = document.createElement("div");
  pill.className = "thh-pill";
  pill.setAttribute("role", "region");
  pill.setAttribute("aria-label", "Style portfolio");
  pill.innerHTML = `
    <a class="thh-pill__back" href="../">← All styles</a>
    <span class="thh-pill__name">${name}</span>
    <button type="button" class="thh-pill__pick" aria-pressed="${picked()}">
      <span class="thh-pill__heart" aria-hidden="true"></span><span class="thh-pill__label"></span>
    </button>
    <button type="button" class="thh-pill__send" hidden>Send picks to koH</button>
    <span class="thh-pill__status" role="status" aria-live="polite"></span>`;
  document.body.append(pill);

  const pick = pill.querySelector(".thh-pill__pick");
  const label = pill.querySelector(".thh-pill__label");
  const send = pill.querySelector(".thh-pill__send");
  const status = pill.querySelector(".thh-pill__status");

  const render = () => {
    const on = picked();
    pick.setAttribute("aria-pressed", String(on));
    label.textContent = on ? "Picked" : "Pick this";
    const n = read().length;
    send.hidden = n === 0;
    send.textContent = n === 1 ? "Send my pick to koH" : `Send my ${n} picks to koH`;
  };
  render();

  pick.addEventListener("click", () => {
    const list = read();
    write(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
    render();
    status.textContent = picked() ? `${name} saved to your picks.` : `${name} removed.`;
  });

  send.addEventListener("click", async () => {
    const list = read();
    if (!list.length) return;
    const who = window.prompt("Your name (optional) — so koH knows who is choosing:", "Maria") ?? "";
    const note = window.prompt("Anything you want to say about these picks? (optional)", "") ?? "";
    send.disabled = true;
    status.textContent = "Sending…";
    const text = [
      `Style picks: ${list.join(", ")}`,
      `Links: ${list.map((s) => `https://handprotocol.org/threehandshealing/styles/${s}/`).join(" ")}`,
      note.trim() ? `Note: ${note.trim()}` : null,
    ].filter(Boolean).join("\n");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text, path: location.pathname, title: document.title,
          name: who.trim() || "Maria (preview)", source: SOURCE, tags: ["🧭 picks", "🎨 style"],
          vw: innerWidth, vh: innerHeight, ua: navigator.userAgent, ts: Date.now(),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      status.textContent = "Sent ✓ — koH has your picks.";
    } catch {
      try { await navigator.clipboard.writeText(text); status.textContent = "Couldn't send — copied to your clipboard instead. Text it to koH."; }
      catch { status.textContent = "Couldn't send. Tell koH: " + list.join(", "); }
    } finally { send.disabled = false; }
  });

  /* Tuck away while scrolling down, return on scroll up. */
  let last = scrollY;
  addEventListener("scroll", () => {
    const y = scrollY;
    pill.classList.toggle("is-tucked", y > last && y > 120);
    last = y;
  }, { passive: true });
})();
