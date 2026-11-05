/* Garden: tap the meadow to plant a flower. Each flower is drawn procedurally
   (petal count, colors, height, lean) and the garden is kept in this browser. */
const React = window.React;
const { useState, useEffect, useRef, useMemo } = React;
const { createRoot } = window.ReactDOMClient;

const PETALS = ["#ffb3c7", "#ffd1dc", "#ffe08a", "#fff4c2", "#b8ecf0", "#cdb9f4", "#ff9aa2", "#ffffff", "#ffc6a5"];
const CENTERS = ["#f6b73c", "#f28c38", "#8a5a2b", "#e86d8a", "#ffffff"];
const KEY = "kc-garden-v1";
const W = 1200, H = 420, GROUND = 360;

function rand(seed) {
  // small deterministic PRNG so the seed garden is the same for everyone
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function makeFlower(x, r, id) {
  const petals = 5 + Math.floor(r() * 5);
  const color = PETALS[Math.floor(r() * PETALS.length)];
  let color2 = PETALS[Math.floor(r() * PETALS.length)];
  if (color2 === color) color2 = "#ffffff";
  return {
    id,
    x: Math.round(x),
    h: 90 + Math.round(r() * 150),
    petals,
    size: 14 + Math.round(r() * 14),
    color, color2,
    center: CENTERS[Math.floor(r() * CENTERS.length)],
    lean: Math.round((r() - 0.5) * 24),
    sway: (2.4 + r() * 2.6).toFixed(2),
    delay: (r() * -4).toFixed(2),
    leaf: r() > 0.3,
    born: Date.now(),
  };
}

function seedGarden() {
  const r = rand(13);
  const xs = [120, 300, 470, 640, 790, 960, 1100];
  return xs.map((x, i) => makeFlower(x + (r() - 0.5) * 40, r, "seed-" + i));
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const v = JSON.parse(raw); if (Array.isArray(v) && v.length) return v; }
  } catch (e) {}
  return seedGarden();
}
function save(flowers) { try { localStorage.setItem(KEY, JSON.stringify(flowers)); } catch (e) {} }

function Flower({ f, fresh }) {
  const top = GROUND - f.h;
  const petalEls = [];
  for (let i = 0; i < f.petals; i++) {
    const a = (360 / f.petals) * i;
    petalEls.push(
      <ellipse key={i} cx="0" cy={-f.size * 0.9} rx={f.size * 0.55} ry={f.size} fill={i % 2 ? f.color2 : f.color}
        transform={`rotate(${a})`} opacity=".95" />
    );
  }
  const style = { "--sway": f.sway + "s", "--delay": f.delay + "s" };
  return (
    <g className={"flower" + (fresh ? " flower--new" : "")} style={style} transform={`translate(${f.x} ${GROUND})`}>
      <g className="flower__sway">
        <path className="stem" d={`M0 0 C ${f.lean * 0.3} ${-f.h * 0.4}, ${f.lean} ${-f.h * 0.7}, ${f.lean} ${-f.h}`} fill="none" stroke="#4e9a6a" strokeWidth="4" strokeLinecap="round" />
        {f.leaf && <path className="leaf" d={`M${f.lean * 0.4} ${-f.h * 0.45} q 26 -18 40 4 q -26 14 -40 -4 z`} fill="#7cc48f" />}
        <g className="bloom" transform={`translate(${f.lean} ${-f.h})`}>
          {petalEls}
          <circle r={f.size * 0.42} fill={f.center} />
          <circle r={f.size * 0.18} cx={-f.size * 0.12} cy={-f.size * 0.12} fill="#fff" opacity=".5" />
        </g>
      </g>
    </g>
  );
}

function Garden() {
  const [flowers, setFlowers] = useState(load);
  const [gust, setGust] = useState(false);
  const [lastId, setLastId] = useState(null);
  const svgRef = useRef(null);
  useEffect(() => { save(flowers); }, [flowers]);

  const planted = flowers.filter((f) => !String(f.id).startsWith("seed-")).length;

  function plant(e) {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const x = Math.max(30, Math.min(W - 30, px));
    const r = rand(Math.floor(Math.random() * 1e9));
    const id = "f-" + Date.now().toString(36);
    const f = makeFlower(x, r, id);
    setFlowers((fs) => [...fs, f].slice(-60));
    setLastId(id);
  }
  function wind() { setGust(true); setTimeout(() => setGust(false), 2400); }
  function reset() { const s = seedGarden(); setFlowers(s); setLastId(null); }

  return (
    <div className={"garden" + (gust ? " garden--gust" : "")}>
      <svg ref={svgRef} className="garden__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice"
        role="img" aria-label={`A meadow with ${flowers.length} flowers. Tap to plant one.`} onClick={plant}>
        <defs>
          <linearGradient id="g-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bfe9c6" /><stop offset="1" stopColor="#8fd3a0" />
          </linearGradient>
        </defs>
        <path d={`M0 ${GROUND - 24} Q ${W / 4} ${GROUND - 54} ${W / 2} ${GROUND - 30} T ${W} ${GROUND - 36} L ${W} ${H} L 0 ${H} Z`} fill="url(#g-ground)" />
        {flowers.map((f) => <Flower key={f.id} f={f} fresh={f.id === lastId} />)}
      </svg>
      <div className="garden__bar">
        <p className="garden__count" aria-live="polite">
          {planted === 0 ? "Tap the meadow to plant something." : planted === 1 ? "You planted one flower. It stays here for you." : `You planted ${planted} flowers. They stay here for you.`}
        </p>
        <div className="garden__btns">
          <button type="button" className="chip" onClick={wind}>Let the wind through</button>
          <button type="button" className="chip chip--quiet" onClick={reset}>Start over</button>
        </div>
      </div>
    </div>
  );
}

const mount = document.getElementById("garden");
if (mount) createRoot(mount).render(<Garden />);
