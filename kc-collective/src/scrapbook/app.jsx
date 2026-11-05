/* Scrapbook: a corkboard you can rearrange. Polaroids, notes and stickers are
   draggable (pointer or arrow keys); the layout is kept in this browser. */
const React = window.React;
const { useState, useEffect, useRef, useCallback } = React;
const { createRoot } = window.ReactDOMClient;

const KEY = "kc-board-v1";
const PHOTOS = [
  { id: "p1", src: "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=600&q=75&auto=format&fit=crop", cap: "the circle, laughing", x: 4, y: 6, rot: -4 },
  { id: "p2", src: "https://images.unsplash.com/photo-1556073654-aa3823f47f07?w=600&q=75&auto=format&fit=crop", cap: "tea first, always", x: 30, y: 40, rot: 3 },
  { id: "p3", src: "https://images.unsplash.com/photo-1673890659788-e1fa46754690?w=600&q=75&auto=format&fit=crop", cap: "soulful outing no. 4", x: 62, y: 8, rot: 5 },
  { id: "p4", src: "https://images.unsplash.com/photo-1758272959819-130bd04f231c?w=600&q=75&auto=format&fit=crop", cap: "we stayed late", x: 70, y: 52, rot: -3 },
];
const NOTES = [
  { id: "n1", text: "creativity is not a talent but a birthright", x: 36, y: 4, rot: 2, tone: "lemon" },
  { id: "n2", text: "some moments call us inward; others invite movement, creation, and play", x: 6, y: 58, rot: -2, tone: "pink" },
  { id: "n3", text: "walking each other home", x: 48, y: 70, rot: 4, tone: "aqua" },
];
const STICKERS = {
  star: { label: "star", el: (<svg viewBox="0 0 48 48"><path d="M24 3l6.4 13.6L45 18.6l-10.8 10 2.8 14.7L24 36.2 11 43.3l2.8-14.7L3 18.6l14.6-2z" fill="#ffd34d" stroke="#1b1b1b" strokeWidth="2.5" strokeLinejoin="round"/></svg>) },
  flower: { label: "flower", el: (<svg viewBox="0 0 48 48"><g fill="#f7a8c4" stroke="#1b1b1b" strokeWidth="2.5"><circle cx="24" cy="10" r="8"/><circle cx="37" cy="19" r="8"/><circle cx="33" cy="35" r="8"/><circle cx="15" cy="35" r="8"/><circle cx="11" cy="19" r="8"/></g><circle cx="24" cy="24" r="7" fill="#ffd34d" stroke="#1b1b1b" strokeWidth="2.5"/></svg>) },
  heart: { label: "heart", el: (<svg viewBox="0 0 48 48"><path d="M24 43C10 32 4 25 4 16a10 10 0 0 1 20-3 10 10 0 0 1 20 3c0 9-6 16-20 27z" fill="#ff8a80" stroke="#1b1b1b" strokeWidth="2.5" strokeLinejoin="round"/></svg>) },
  sun: { label: "sun", el: (<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="10" fill="#ffd34d" stroke="#1b1b1b" strokeWidth="2.5"/><g stroke="#1b1b1b" strokeWidth="2.5" strokeLinecap="round"><path d="M24 3v7M24 38v7M3 24h7M38 24h7M9 9l5 5M34 34l5 5M9 39l5-5M34 14l5-5"/></g></svg>) },
  xiii: { label: "XIII badge", el: (<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#9edcd8" stroke="#1b1b1b" strokeWidth="2.5"/><text x="24" y="30" textAnchor="middle" fontFamily="Special Elite, monospace" fontSize="15" fill="#1b1b1b">XIII</text></svg>) },
};

function initial() {
  return [
    ...PHOTOS.map((p) => ({ ...p, kind: "photo" })),
    ...NOTES.map((n) => ({ ...n, kind: "note" })),
    { id: "s1", kind: "sticker", shape: "star", x: 26, y: 30, rot: 10 },
    { id: "s2", kind: "sticker", shape: "flower", x: 58, y: 44, rot: -12 },
  ];
}
function load() { try { const v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v) && v.length) return v; } catch (e) {} return initial(); }
function save(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }

function Item({ it, onMove, onFront, z }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const board = ref.current.parentElement.getBoundingClientRect();
    drag.current = { sx: e.clientX, sy: e.clientY, x: it.x, y: it.y, bw: board.width, bh: board.height };
    ref.current.setPointerCapture(e.pointerId);
    ref.current.classList.add("is-drag");
    onFront(it.id);
  };
  const onMovePtr = (e) => {
    const d = drag.current; if (!d) return;
    const nx = d.x + ((e.clientX - d.sx) / d.bw) * 100;
    const ny = d.y + ((e.clientY - d.sy) / d.bh) * 100;
    onMove(it.id, Math.max(-5, Math.min(90, nx)), Math.max(-5, Math.min(88, ny)));
  };
  const onUp = () => { drag.current = null; ref.current && ref.current.classList.remove("is-drag"); };
  const onKey = (e) => {
    const step = e.shiftKey ? 5 : 1;
    const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (map[e.key]) { e.preventDefault(); onFront(it.id); onMove(it.id, it.x + map[e.key][0], it.y + map[e.key][1]); }
  };
  const style = { left: it.x + "%", top: it.y + "%", "--rot": it.rot + "deg", zIndex: z };
  const label = it.kind === "photo" ? `Photo: ${it.cap}` : it.kind === "note" ? `Note: ${it.text}` : `Sticker: ${STICKERS[it.shape].label}`;
  return (
    <div ref={ref} className={"item item--" + it.kind + (it.tone ? " item--" + it.tone : "")} style={style} tabIndex="0" role="button"
      aria-label={label + ". Drag or use arrow keys to move."} onPointerDown={onDown} onPointerMove={onMovePtr} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}>
      {it.kind === "photo" && (<><span className="tape" aria-hidden="true" /><span className="item__img"><img src={it.src} alt="" draggable="false" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} /></span><span className="item__cap">{it.cap}</span></>)}
      {it.kind === "note" && (<><span className="pin" aria-hidden="true" /><span className="item__text">{it.text}</span></>)}
      {it.kind === "sticker" && (<span className="item__sticker">{STICKERS[it.shape].el}</span>)}
    </div>
  );
}

function Board() {
  const [items, setItems] = useState(load);
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  useEffect(() => { save(items); }, [items]);

  const move = useCallback((id, x, y) => setItems((is) => is.map((i) => (i.id === id ? { ...i, x, y } : i))), []);
  const front = useCallback((id) => setOrder((o) => [...o.filter((k) => k !== id), id]), []);
  function shuffle() {
    setItems((is) => is.map((i) => ({ ...i, x: 4 + Math.random() * 78, y: 4 + Math.random() * 70, rot: Math.round((Math.random() - 0.5) * 20) })));
  }
  function tidy() { const s = initial(); setItems(s); setOrder(s.map((i) => i.id)); }
  function peel(shape) {
    const id = "s-" + Date.now().toString(36);
    const it = { id, kind: "sticker", shape, x: 20 + Math.random() * 55, y: 15 + Math.random() * 55, rot: Math.round((Math.random() - 0.5) * 40) };
    setItems((is) => [...is, it].slice(-40)); setOrder((o) => [...o, id]);
  }
  const z = (id) => order.indexOf(id) + 1;

  return (
    <div className="boardwrap">
      <div className="board" aria-label="Corkboard. Items can be dragged.">
        {items.map((it) => <Item key={it.id} it={it} onMove={move} onFront={front} z={z(it.id)} />)}
      </div>
      <div className="sheet">
        <p className="sheet__label">Sticker sheet, peel one:</p>
        <div className="sheet__row">
          {Object.entries(STICKERS).map(([k, s]) => (
            <button key={k} type="button" className="sheet__btn" onClick={() => peel(k)} aria-label={`Add a ${s.label} sticker`}>{s.el}</button>
          ))}
        </div>
        <div className="sheet__btns">
          <button type="button" className="btn btn--small" onClick={shuffle}>Shuffle the board</button>
          <button type="button" className="btn btn--small btn--ghost" onClick={tidy}>Tidy up</button>
        </div>
      </div>
    </div>
  );
}

const mount = document.getElementById("board");
if (mount) createRoot(mount).render(<Board />);
