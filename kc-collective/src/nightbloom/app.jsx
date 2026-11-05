/* Nightbloom sky: thirteen named stars, and a star for everyone who leaves
   KC Collective a message. "A constellation of women walking each other home."

   The guest stars come from the star guestbook (kc-collective/stars, GET/POST
   /api/stars). Each one sits beside the named star its message felt closest
   to. A visitor can let Claude shape her star from her message (opt-in, with
   the privacy note right there) or take a plain gold one. Her own stars are
   remembered on this device so a star waiting for review still shows for her. */
const React = window.React;
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const { createRoot } = window.ReactDOMClient;
import { W, H, NAMED } from "../../stars/lib/sky.mjs";

// Must match PRIVACY_VERSION in kc-collective/stars/lib/star-core.mjs: the server only
// accepts AI consent given against the wording below.
const PRIVACY_VERSION = "2026-10-30";
const MINE_KEY = "kc-stars-mine-v1";

function loadMine() { try { const v = JSON.parse(localStorage.getItem(MINE_KEY)); if (Array.isArray(v)) return v; } catch (e) {} return []; }
function saveMine(v) { try { localStorage.setItem(MINE_KEY, JSON.stringify(v.slice(-12))); } catch (e) {} }

// A small n-pointed star centred on 0,0.
function starPath(points, r) {
  const inner = r * (points >= 6 ? 0.5 : 0.42);
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const rad = i % 2 ? inner : r;
    out.push(`${(Math.cos(a) * rad).toFixed(2)},${(Math.sin(a) * rad).toFixed(2)}`);
  }
  return `M${out.join("L")}Z`;
}
const RADIUS = { 1: 5, 2: 6.5, 3: 8 };
const byName = Object.fromEntries(NAMED.map((s) => [s.name, s]));

function Caption({ active }) {
  if (!active) return <p className="sky__caption sky__caption--quiet">Hover or tap a star to read it.</p>;
  if (active.named) return <p className="sky__caption"><em>{active.name}</em>, one of the thirteen.</p>;
  const s = active.star;
  return (
    <div className="sky__caption">
      <p><span className="sky__dot" style={{ background: s.hex }} aria-hidden="true" /><em>{s.name}</em>, {active.firstName}’s star{active.held ? " (waiting to go up, only you can see it)" : ""}</p>
      {s.line && <p className="sky__line">{s.line}</p>}
      {active.message && <blockquote className="sky__msg">{active.message}</blockquote>}
    </div>
  );
}

function StarForm({ api, onPlaced, isOpenForStars }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ firstName: "", email: "", message: "", aiOptIn: false, shareRequested: false, website: "" });
  const [state, setState] = useState({ phase: "idle", error: "" });
  const firstRef = useRef(null);
  useEffect(() => { if (open && firstRef.current) firstRef.current.focus(); }, [open]);
  const set = (k) => (e) => { const v = e.target.type === "checkbox" ? e.target.checked : e.target.value; setF((x) => ({ ...x, [k]: v })); };

  async function submit(e) {
    e.preventDefault();
    setState({ phase: "sending", error: "" });
    try {
      const res = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, privacyVersion: PRIVACY_VERSION }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.error || "The sky could not take your star just now. Please try again in a minute.");
      onPlaced({ ...body.star, held: body.held });
      setState({ phase: "done", error: "", star: body.star, held: body.held });
      setF((x) => ({ ...x, message: "", shareRequested: false }));
    } catch (err) {
      const offline = err instanceof TypeError;
      setState({ phase: "idle", error: offline ? "Could not reach the sky. Check your connection and try again." : err.message });
    }
  }

  // The guestbook didn't answer: no form to fail on send.
  if (isOpenForStars === false) return <div className="sky__form"><p className="sky__hint">Soon you can leave KC Collective a message here and add your own star.</p></div>;

  if (!open) {
    return (
      <div className="sky__form">
        <button type="button" className="btn btn--light" aria-expanded="false" aria-controls="star-form" onClick={() => setOpen(true)}>Leave a star for KC Collective</button>
        <p className="sky__hint">Send the collective a message, and a star with your name joins the sky.</p>
      </div>
    );
  }

  if (state.phase === "done") {
    const s = state.star.star;
    return (
      <div className="sky__form" aria-live="polite">
        <p className="sky__done"><span className="sky__dot sky__dot--big" style={{ background: s.hex }} aria-hidden="true" /><em>{s.name}</em> is {state.held ? "waiting for KC Collective to look before it joins the sky." : `in the sky, beside ${s.near}.`}</p>
        {s.line && <p className="sky__line">{s.line}</p>}
        <p className="sky__hint">Your message is with KC Collective. We emailed you a keepsake with a link to remove your star any time.</p>
        <button type="button" className="btn btn--ghost" onClick={() => setState({ phase: "idle", error: "" })}>Leave another</button>
      </div>
    );
  }

  const sending = state.phase === "sending";
  return (
    <form id="star-form" className="sky__form sky__form--open" onSubmit={submit}>
      <p className="sky__title">Leave a star for KC Collective</p>
      <p className="hp" aria-hidden="true"><label>Leave this empty <input name="website" tabIndex="-1" autoComplete="off" value={f.website} onChange={set("website")} /></label></p>
      <div className="sky__fields">
        <label className="field"><span>First name</span><input ref={firstRef} type="text" required maxLength="40" autoComplete="given-name" value={f.firstName} onChange={set("firstName")} /></label>
        <label className="field"><span>Email <small>never shown</small></span><input type="email" required maxLength="254" autoComplete="email" inputMode="email" value={f.email} onChange={set("email")} /></label>
        <label className="field field--wide"><span>Your message to KC Collective</span><textarea required minLength="2" maxLength="1200" rows="4" value={f.message} onChange={set("message")} /></label>
      </div>

      <div className="check">
        <input id="star-ai" type="checkbox" checked={f.aiOptIn} onChange={set("aiOptIn")} aria-describedby="star-ai-note" />
        <div><label htmlFor="star-ai">Shape my star from my message (uses AI)</label>
          <small id="star-ai-note">Your message is sent to Claude, an AI model made by Anthropic, which reads it once to design your star and to check it before it goes up. Email addresses, phone numbers and links are taken out first, and your name and email are never sent. Anthropic does not use it to train its models. Leave this off and you get a gold star with your first name, and nothing goes to AI.</small>
        </div>
      </div>
      <div className="check">
        <input id="star-share" type="checkbox" checked={f.shareRequested} onChange={set("shareRequested")} aria-describedby="star-share-note" />
        <div><label htmlFor="star-share">If KC Collective accepts it, show my message on the sky</label>
          <small id="star-share-note">Off unless you tick it. Your message stays between you and KC Collective unless you ask for it to be shared and they say yes.</small>
        </div>
      </div>

      <details className="sky__privacy">
        <summary>What happens to what you send</summary>
        <ul>
          <li>KC Collective keeps your first name, email, message and star.</li>
          <li>Anyone visiting sees your first name and your star. Your email is never shown or shared.</li>
          <li>We email you a keepsake of your star with a link to remove it. Removing it takes it off the sky and deletes your message.</li>
          <li>Only if you ticked the AI box does your message go to Claude, as described above.</li>
        </ul>
      </details>

      {state.error && <p className="sky__error" role="alert">{state.error}</p>}
      <div className="sky__row">
        <button type="submit" className="btn btn--light" disabled={sending}>{sending ? (f.aiOptIn ? "Shaping your star…" : "Placing your star…") : "Send and place my star"}</button>
        <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)} disabled={sending}>Not now</button>
      </div>
    </form>
  );
}

function Sky({ api }) {
  const [guests, setGuests] = useState([]);
  const [mine, setMine] = useState(loadMine);
  const [active, setActive] = useState(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [justPlaced, setJustPlaced] = useState(null);
  const [isOpenForStars, setIsOpenForStars] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const ctl = new AbortController();
    fetch(api, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b) => { setGuests(Array.isArray(b.stars) ? b.stars : []); setIsOpenForStars(true); })
      .catch((err) => { if (err.name !== "AbortError") setIsOpenForStars(false); });
    return () => ctl.abort();
  }, [api]);
  useEffect(() => { saveMine(mine); }, [mine]);

  // Server stars plus any of hers the server isn't showing (held for review).
  const mineIds = useMemo(() => new Set(mine.map((s) => s.id)), [mine]);
  const all = useMemo(() => {
    const seen = new Set(guests.map((g) => g.id));
    return [...guests, ...mine.filter((m) => !seen.has(m.id) && m.held)].filter((g) => g.star && Number.isFinite(g.star.x));
  }, [guests, mine]);

  const bg = useMemo(() => {
    const out = []; let s = 7;
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 140; i++) out.push({ x: r() * W, y: r() * H, r: 0.6 + r() * 1.3, d: (r() * 6).toFixed(1) });
    return out;
  }, []);

  const placed = useCallback((p) => {
    setMine((m) => [...m.filter((x) => x.id !== p.id), p]);
    if (!p.held) setGuests((g) => [p, ...g.filter((x) => x.id !== p.id)]);
    setJustPlaced(p.id);
    setActive(null);
  }, []);

  const onMove = useCallback((e) => {
    const r = wrapRef.current.getBoundingClientRect();
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 });
  }, []);

  return (
    <div className="sky" ref={wrapRef} onPointerMove={onMove} style={{ "--tx": tilt.x, "--ty": tilt.y }}>
      <svg className="sky__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`A night sky with thirteen named stars and ${all.length} stars left by visitors.`}>
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        </defs>
        <g className="sky__far">
          {bg.map((s, i) => <circle key={i} className="twinkle" cx={s.x} cy={s.y} r={s.r} fill="#fff" style={{ "--d": s.d + "s" }} />)}
        </g>
        <g className="sky__near">
          {NAMED.slice(0, -1).map((a, i) => <line key={a.id} className="link" x1={a.x} y1={a.y} x2={NAMED[i + 1].x} y2={NAMED[i + 1].y} />)}
          {all.map((g) => {
            const n = byName[g.star.near] || NAMED[NAMED.length - 1];
            return <line key={"l" + g.id} className={"link link--guest" + (g.id === justPlaced ? " link--new" : "")} x1={n.x} y1={n.y} x2={g.star.x} y2={g.star.y} style={{ stroke: g.star.hex }} />;
          })}
          {NAMED.map((s) => (
            <g key={s.id} className={"star star--named" + (active === s ? " star--hover" : "")} transform={`translate(${s.x} ${s.y})`} tabIndex="0"
              onMouseEnter={() => setActive(s)} onFocus={() => setActive(s)}>
              <circle className="star__glow" r="18" fill="url(#glow)" />
              <circle className="star__core" r="4" />
              <text className="star__name" y={-14} textAnchor="middle">{s.name}</text>
            </g>
          ))}
          {all.map((g) => {
            const r = RADIUS[g.star.brightness] || 6.5;
            const isMine = mineIds.has(g.id);
            return (
              <g key={g.id} className={"star star--guest" + (isMine ? " star--mine" : "") + (g.held ? " star--held" : "") + (g.id === justPlaced ? " star--last" : "") + (active && active.id === g.id ? " star--hover" : "")}
                transform={`translate(${g.star.x} ${g.star.y})`} tabIndex={isMine ? "0" : "-1"} aria-label={`${g.star.name}, ${g.firstName}'s star`}
                onMouseEnter={() => setActive(g)} onFocus={() => setActive(g)} onClick={() => setActive(g)}>
                <circle className="star__glow" r={r * 2.6} fill="url(#glow)" />
                <path className="star__shape" d={starPath(g.star.points, r)} style={{ fill: g.star.hex }} />
                <text className="star__name" y={-r - 8} textAnchor="middle">{g.firstName}</text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="sky__read" aria-live="polite"><Caption active={active} /></div>
      <ul className="sr-only" aria-label="Stars left by visitors">
        {all.slice(0, 50).map((g) => <li key={g.id}>{g.star.name}, {g.firstName}’s star{g.star.line ? `: ${g.star.line}` : ""}{g.message ? ` Message: ${g.message}` : ""}</li>)}
      </ul>
      <StarForm api={api} onPlaced={placed} isOpenForStars={isOpenForStars} />
    </div>
  );
}

const mount = document.getElementById("sky");
if (mount) createRoot(mount).render(<Sky api={mount.dataset.api || "/api/stars"} />);
