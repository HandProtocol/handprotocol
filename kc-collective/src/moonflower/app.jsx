/* Moonflower: two islands on one page. The deck of thirteen (from Oracle) and
   the sky you can join (from Constellation), each wrapped so they share nothing
   but React. */
(function deckIsland() {
const React = window.React;
const { useState, useRef, useCallback, useMemo } = React;
const { createRoot } = window.ReactDOMClient;

const NUM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];
const CARDS = [
  { t: "Rhythm", line: "A space to return to your rhythm.", offer: "Sit in a circle of reflection this month.", href: "#gatherings" },
  { t: "Intuition", line: "Your intuition, and the quiet knowing of who you are becoming.", offer: "Bring a question to the Akashic Record Circle.", href: "#gatherings" },
  { t: "Becoming", line: "The quiet knowing of who you are becoming.", offer: "Start a page in your journal tonight. Just one.", href: "#journal" },
  { t: "Cycles", line: "Rooted in the sacred cycles of transformation.", offer: "Notice which season you are in. Then come as you are.", href: "#about" },
  { t: "Beginning again", line: "Simply the courage to begin again.", offer: "Arrive alone at the next Coffee Shop Social. Leave with new friends.", href: "#gatherings" },
  { t: "Birthright", line: "Creativity is not a talent but a birthright.", offer: "Make something small this week, with your hands.", href: "#offerings" },
  { t: "Light and shadow", line: "We hold space for both light and shadow.", offer: "A circle of reflection: speak honestly, be listened to.", href: "#offerings" },
  { t: "Release", line: "For joy and unraveling, laughter and release.", offer: "A soulful outing. Long walk, no agenda.", href: "#offerings" },
  { t: "Sacred art", line: "We honor healing as a sacred art.", offer: "The Gratitude Workshop: an evening of reflection and thanks.", href: "#gatherings" },
  { t: "The ending that begins", line: "What feels like an ending is often the beginning of deeper becoming.", offer: "Write to us about what is ending. We will hold it with you.", href: "#join" },
  { t: "Under the same sky", line: "We gather under the same sky, both online and in person.", offer: "Join online if you are far. Join in person if you are near.", href: "#join" },
  { t: "Inward and outward", line: "Some moments call us inward; others invite movement, creation, and play.", offer: "Pick one of each this season: a circle and an outing.", href: "#offerings" },
  { t: "Walking each other home", line: "A constellation of women walking each other home.", offer: "Join the community. That is the whole invitation.", href: "#join" },
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function Card({ k, idx, n, drawn, onDraw }) {
  const isDrawn = drawn === k;
  const away = drawn !== null && !isDrawn;
  const mid = (n - 1) / 2;
  const rot = (idx - mid) * 7;
  const lift = 0;
  const style = { "--rot": rot + "deg", "--lift": lift + "px", "--i": idx };
  const data = CARDS[k];
  return (
    <li className={"card" + (isDrawn ? " card--drawn" : "") + (away ? " card--away" : "")} style={style}>
      <button type="button" className="card__btn" onClick={() => onDraw(k)} aria-label={isDrawn ? `${data.t}, card ${NUM[k]}` : "Draw a card"} disabled={away}>
        <span className="card__inner">
          <span className="card__face card__back" aria-hidden="true">
            <span className="card__ornament" />
            <span className="card__sigil">XIII</span>
          </span>
          <span className="card__face card__front">
            <span className="card__num">{NUM[k]}</span>
            <span className="card__title">{data.t}</span>
            <span className="card__line">{data.line}</span>
            <span className="card__offer">{data.offer}</span>
          </span>
        </span>
      </button>
    </li>
  );
}

function Deck() {
  const [order, setOrder] = useState(() => shuffle(CARDS.map((_, i) => i)));
  const [drawn, setDrawn] = useState(null);
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
    el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
  }, []);

  function draw(k) {
    if (drawn === k) return;
    setDrawn(k); setCount((c) => c + 1);
  }
  function again() { setDrawn(null); }
  function reshuffle() { setDrawn(null); setOrder(shuffle(CARDS.map((_, i) => i))); }

  const d = drawn === null ? null : CARDS[drawn];
  return (
    <div className={"deck" + (drawn !== null ? " deck--open" : "")} ref={ref} onPointerMove={onMove}>
      <ul className="deck__fan">
        {order.map((k, idx) => <Card key={k} k={k} idx={idx} n={order.length} drawn={drawn} onDraw={draw} />)}
      </ul>
      <div className="deck__reading" aria-live="polite">
        {d ? (
          <>
            <p className="deck__hint">Card {NUM[drawn]} of XIII. {count === 1 ? "Your first draw." : `Draw ${count}.`}</p>
            <div className="deck__btns">
              <a className="btn" href={d.href}>{d.href === "#join" ? "Join the community" : "Follow this card"}</a>
              <button type="button" className="btn btn--ghost" onClick={again}>Draw another</button>
              <button type="button" className="btn btn--ghost" onClick={reshuffle}>Shuffle</button>
            </div>
          </>
        ) : (
          <p className="deck__hint">Thirteen cards, one for each phase. Draw one.</p>
        )}
      </div>
    </div>
  );
}

const mount = document.getElementById("deck");
if (mount) createRoot(mount).render(<Deck />);
})();

(function skyIsland() {
const React = window.React;
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const { createRoot } = window.ReactDOMClient;

const KEY = "kc-stars-v1";
const W = 1200, H = 640;
const NAMED = [
  ["Rhythm", 120, 180], ["Intuition", 260, 90], ["Becoming", 410, 160], ["Courage", 540, 70], ["Birthright", 690, 150],
  ["Light", 860, 80], ["Shadow", 1010, 170], ["Joy", 1120, 300], ["Release", 980, 420], ["Healing", 820, 330],
  ["Play", 640, 420], ["Stillness", 430, 360], ["Home", 240, 440],
].map(([name, x, y], i) => ({ id: "n" + i, name, x, y, named: true }));

function load() { try { const v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v)) return v; } catch (e) {} return []; }
function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
function nearest(star, pool) {
  let best = null, bd = Infinity;
  for (const s of pool) { if (s.id === star.id) continue; const d = Math.hypot(s.x - star.x, s.y - star.y); if (d < bd) { bd = d; best = s; } }
  return best;
}

function Sky() {
  const [mine, setMine] = useState(load);
  const [name, setName] = useState("");
  const [hover, setHover] = useState(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const wrapRef = useRef(null);
  useEffect(() => { save(mine); }, [mine]);

  const all = useMemo(() => [...NAMED, ...mine], [mine]);
  const links = useMemo(() => {
    const L = [];
    for (let i = 0; i < NAMED.length - 1; i++) L.push([NAMED[i], NAMED[i + 1]]);
    mine.forEach((s, i) => {
      const prev = i > 0 ? mine[i - 1] : nearest(s, NAMED);
      if (prev) L.push([prev, s]);
      if (i > 0) { const n = nearest(s, NAMED); if (n) L.push([n, s]); }
    });
    return L;
  }, [mine]);

  const bg = useMemo(() => {
    const out = []; let s = 7;
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 140; i++) out.push({ x: r() * W, y: r() * H, r: 0.6 + r() * 1.3, d: (r() * 6).toFixed(1) });
    return out;
  }, []);

  function add(e) {
    e.preventDefault();
    const n = name.trim().slice(0, 24);
    if (!n) return;
    const x = 90 + Math.random() * (W - 180), y = 60 + Math.random() * (H - 140);
    setMine((m) => [...m, { id: "m" + Date.now().toString(36), name: n, x: Math.round(x), y: Math.round(y) }].slice(-30));
    setName("");
  }
  function clear() { setMine([]); }
  const onMove = useCallback((e) => {
    const r = wrapRef.current.getBoundingClientRect();
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 });
  }, []);

  const last = mine[mine.length - 1];
  return (
    <div className="sky" ref={wrapRef} onPointerMove={onMove} style={{ "--tx": tilt.x, "--ty": tilt.y }}>
      <svg className="sky__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`A night sky with ${all.length} named stars joined by lines.`}>
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        </defs>
        <g className="sky__far">
          {bg.map((s, i) => <circle key={i} className="twinkle" cx={s.x} cy={s.y} r={s.r} fill="#fff" style={{ "--d": s.d + "s" }} />)}
        </g>
        <g className="sky__near">
          {links.map(([a, b], i) => <line key={i} className={"link" + (b.named ? "" : " link--mine")} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />)}
          {all.map((s) => (
            <g key={s.id} className={"star" + (s.named ? " star--named" : " star--mine") + (last && s.id === last.id ? " star--last" : "") + (hover === s.id ? " star--hover" : "")}
              transform={`translate(${s.x} ${s.y})`} tabIndex="0" onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(s.id)} onBlur={() => setHover(null)}>
              <circle className="star__glow" r="18" fill="url(#glow)" />
              <circle className="star__core" r={s.named ? 4 : 5} />
              <text className="star__name" y={-14} textAnchor="middle">{s.name}</text>
            </g>
          ))}
        </g>
      </svg>
      <form className="sky__form" onSubmit={add}>
        <label htmlFor="star-name">Add your star</label>
        <div className="sky__row">
          <input id="star-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" maxLength="24" autoComplete="given-name" />
          <button type="submit" className="btn">Place it</button>
          {mine.length > 0 && <button type="button" className="btn btn--ghost" onClick={clear}>Clear mine</button>}
        </div>
        <p className="sky__hint" aria-live="polite">
          {mine.length === 0 ? "Thirteen stars already. Yours joins the line." : mine.length === 1 ? `${last.name} is in the sky, joined to ${nearest(last, NAMED).name}.` : `${mine.length} stars of yours, each joined to the one before. Walking each other home.`}
        </p>
      </form>
    </div>
  );
}

const mount = document.getElementById("sky");
if (mount) createRoot(mount).render(<Sky />);
})();
