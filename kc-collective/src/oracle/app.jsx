/* Oracle: thirteen cards fanned in an arc. Draw one and it rises and flips. */
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
  { t: "Birthright", line: "Creativity is not a talent but a birthright.", offer: "Make something small this week, with your hands.", href: "#suits" },
  { t: "Light and shadow", line: "We hold space for both light and shadow.", offer: "A circle of reflection: speak honestly, be listened to.", href: "#suits" },
  { t: "Release", line: "For joy and unraveling, laughter and release.", offer: "A soulful outing. Long walk, no agenda.", href: "#suits" },
  { t: "Sacred art", line: "We honor healing as a sacred art.", offer: "The Gratitude Workshop: an evening of reflection and thanks.", href: "#gatherings" },
  { t: "The ending that begins", line: "What feels like an ending is often the beginning of deeper becoming.", offer: "Write to us about what is ending. We will hold it with you.", href: "#join" },
  { t: "Under the same sky", line: "We gather under the same sky, both online and in person.", offer: "Join online if you are far. Join in person if you are near.", href: "#join" },
  { t: "Inward and outward", line: "Some moments call us inward; others invite movement, creation, and play.", offer: "Pick one of each this season: a circle and an outing.", href: "#suits" },
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
