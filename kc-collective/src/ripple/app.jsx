/* Ripple: two islands. Ripples (tap the water, a word floats up) and
   Breath (a gooey blob that breathes with you). */
const React = window.React;
const { useState, useEffect, useRef, useCallback } = React;
const { createRoot } = window.ReactDOMClient;

const WORDS = ["rhythm", "intuition", "becoming", "joy", "release", "laughter", "courage", "light", "shadow", "play", "stillness", "begin again", "home"];

function Ripples() {
  const [drops, setDrops] = useState([]);
  const ref = useRef(null);
  const n = useRef(0);
  const tap = useCallback((e) => {
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    const id = ++n.current;
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    setDrops((d) => [...d, { id, x, y, word }].slice(-12));
    setTimeout(() => setDrops((d) => d.filter((k) => k.id !== id)), 2600);
  }, []);
  return (
    <div className="ripples" ref={ref} onPointerDown={tap} role="presentation">
      {drops.map((d) => (
        <span key={d.id} className="drop" style={{ left: d.x + "%", top: d.y + "%" }}>
          <i className="drop__ring" /><i className="drop__ring drop__ring--2" /><i className="drop__ring drop__ring--3" />
          <b className="drop__word">{d.word}</b>
        </span>
      ))}
      <p className="ripples__hint">Tap the water.</p>
    </div>
  );
}

const PACES = {
  gentle: { label: "Gentle", steps: [["Breathe in", 4000], ["Hold", 4000], ["Let go", 6000]] },
  slow: { label: "Slow", steps: [["Breathe in", 5000], ["Hold", 5000], ["Let go", 8000]] },
};

function Breath() {
  const [running, setRunning] = useState(false);
  const [pace, setPace] = useState("gentle");
  const [step, setStep] = useState(0);
  const [rounds, setRounds] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (!running) { clearTimeout(timer.current); return; }
    const steps = PACES[pace].steps;
    timer.current = setTimeout(() => {
      setStep((s) => {
        const next = (s + 1) % steps.length;
        if (next === 0) setRounds((r) => r + 1);
        return next;
      });
    }, steps[step][1]);
    return () => clearTimeout(timer.current);
  }, [running, step, pace]);

  function toggle() { if (running) { setRunning(false); setStep(0); } else { setStep(0); setRunning(true); } }
  const steps = PACES[pace].steps;
  const [label, dur] = steps[step];
  const phase = running ? ["in", "hold", "out"][step] : "rest";
  const style = { "--dur": dur + "ms" };

  return (
    <div className={"breath breath--" + phase} style={style}>
      <svg className="breath__goo" viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
          <radialGradient id="sea" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#8fe3e6" /><stop offset=".6" stopColor="#3aa7b3" /><stop offset="1" stopColor="#174a53" />
          </radialGradient>
        </defs>
        <g filter="url(#goo)" fill="url(#sea)">
          <circle className="blob blob--core" cx="200" cy="200" r="86" />
          <circle className="blob blob--a" cx="200" cy="200" r="46" />
          <circle className="blob blob--b" cx="200" cy="200" r="38" />
          <circle className="blob blob--c" cx="200" cy="200" r="30" />
        </g>
      </svg>
      <div className="breath__ui">
        <p className="breath__label" aria-live="polite">{running ? label : "Breathe with us"}</p>
        <p className="breath__sub">{running ? `${label.toLowerCase()} for ${dur / 1000} seconds` : "Four in, four held, six out. One minute is plenty."}</p>
        <div className="breath__btns">
          <button type="button" className="btn" onClick={toggle}>{running ? "Pause" : rounds ? "Begin again" : "Begin"}</button>
          <label className="breath__pace">
            <span>Pace</span>
            <select value={pace} onChange={(e) => { setPace(e.target.value); setStep(0); }}>
              {Object.entries(PACES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
        </div>
        {rounds > 0 && <p className="breath__rounds">{rounds === 1 ? "One round." : `${rounds} rounds.`} {rounds >= 3 ? "That is a practice." : ""}</p>}
      </div>
    </div>
  );
}

const r = document.getElementById("ripples");
if (r) createRoot(r).render(<Ripples />);
const b = document.getElementById("breath");
if (b) createRoot(b).render(<Breath />);
