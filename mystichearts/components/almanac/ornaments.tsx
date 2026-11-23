// The almanac's drawn ornaments (design/sheet-styles/b3-almanac-nav.html), as one hidden SVG of
// symbols the sheet renders once, and small pieces that <use> them. Ids carry an "al-" prefix.

export function AlmanacDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="al-corner" viewBox="0 0 40 40">
          <path d="M3 37V10Q3 3 10 3H37" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9 31V14Q9 9 14 9H31" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".7" />
          <path d="M15 11.5 16.2 14.8 19.5 16 16.2 17.2 15 20.5 13.8 17.2 10.5 16 13.8 14.8Z" fill="currentColor" />
          <circle cx="37" cy="3" r="1.4" fill="currentColor" />
          <circle cx="3" cy="37" r="1.4" fill="currentColor" />
        </symbol>
        <symbol id="al-star4" viewBox="-10 -10 20 20">
          <path d="M0-10 2.2-2.2 10 0 2.2 2.2 0 10-2.2 2.2-10 0-2.2-2.2Z" fill="currentColor" />
        </symbol>
        <symbol id="al-flameheart" viewBox="0 0 100 110">
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M53 2C61 18 74 23 80 40C88 62 79 84 64 95L50 108L36 95C21 84 12 62 20 42C24 32 30 28 34 19C36 29 40 34 45 36C40 24 45 12 53 2ZM50 87C40 79 32 72 32 63C32 56 37 52 42 52C46 52 49 55 50 58C51 55 54 52 58 52C63 52 68 56 68 63C68 72 60 79 50 87Z"
          />
        </symbol>
        <symbol id="al-circle-of" viewBox="-20 -20 40 40">
          <g fill="currentColor">
            <circle r="3.2" />
            <circle cy="-13" r="2.6" />
            <circle cx="11.3" cy="-6.5" r="2.6" />
            <circle cx="11.3" cy="6.5" r="2.6" />
            <circle cy="13" r="2.6" />
            <circle cx="-11.3" cy="6.5" r="2.6" />
            <circle cx="-11.3" cy="-6.5" r="2.6" />
          </g>
          <circle r="13" fill="none" stroke="currentColor" strokeWidth=".9" opacity=".6" />
        </symbol>
        <symbol id="al-sunrise" viewBox="-20 -20 40 40">
          <path d="M-11 6A11 11 0 0 1 11 6Z" fill="currentColor" />
          <path d="M-18 9H18M-13 13H13" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M0-9V-15" />
            <path d="M8-6 12-11" />
            <path d="M-8-6-12-11" />
            <path d="M14 1 19-1" />
            <path d="M-14 1-19-1" />
          </g>
        </symbol>
        <symbol id="al-mesquite" viewBox="0 0 80 30">
          <path d="M2 24Q30 22 78 6" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <g fill="currentColor">
            <ellipse cx="14" cy="20" rx="4.6" ry="1.5" transform="rotate(-50 14 20)" />
            <ellipse cx="17" cy="26" rx="4.6" ry="1.5" transform="rotate(30 17 26)" />
            <ellipse cx="25" cy="17" rx="4.6" ry="1.5" transform="rotate(-55 25 17)" />
            <ellipse cx="29" cy="24" rx="4.6" ry="1.5" transform="rotate(25 29 24)" />
            <ellipse cx="37" cy="14" rx="4.6" ry="1.5" transform="rotate(-58 37 14)" />
            <ellipse cx="41" cy="21" rx="4.6" ry="1.5" transform="rotate(20 41 21)" />
            <ellipse cx="49" cy="10" rx="4.6" ry="1.5" transform="rotate(-60 49 10)" />
            <ellipse cx="53" cy="17" rx="4.6" ry="1.5" transform="rotate(15 53 17)" />
            <ellipse cx="61" cy="7" rx="4.2" ry="1.4" transform="rotate(-62 61 7)" />
            <ellipse cx="65" cy="13" rx="4.2" ry="1.4" transform="rotate(10 65 13)" />
            <ellipse cx="74" cy="6" rx="3.6" ry="1.3" transform="rotate(-20 74 6)" />
          </g>
        </symbol>
        <symbol id="al-moon-new" viewBox="-12 -12 24 24">
          <circle r="9" fill="none" stroke="currentColor" strokeWidth="1" />
        </symbol>
        <symbol id="al-moon-crescent" viewBox="-12 -12 24 24">
          <circle r="9" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M0-9A9 9 0 0 1 0 9A5.4 9 0 0 0 0-9Z" fill="#a87526" />
        </symbol>
        <symbol id="al-moon-quarter" viewBox="-12 -12 24 24">
          <circle r="9" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M0-9A9 9 0 0 1 0 9Z" fill="#a87526" />
        </symbol>
        <symbol id="al-moon-gibbous" viewBox="-12 -12 24 24">
          <circle r="9" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M0-9A9 9 0 0 1 0 9A5.4 9 0 0 1 0-9Z" fill="#a87526" />
        </symbol>
        <symbol id="al-moon-full" viewBox="-12 -12 24 24">
          <circle r="9" fill="#a87526" stroke="currentColor" strokeWidth="1" />
        </symbol>
        <symbol id="al-g-healing" viewBox="0 0 30 30">
          <path d="M5 14 15 5l10 9v11H5Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M15 22c-2.6-2-4.2-3.4-4.2-5.2 0-1.3 1-2.2 2.1-2.2.9 0 1.6.5 2.1 1.3.5-.8 1.2-1.3 2.1-1.3 1.1 0 2.1.9 2.1 2.2 0 1.8-1.6 3.2-4.2 5.2Z" fill="#9c1f4b" />
        </symbol>
        <symbol id="al-g-main" viewBox="0 0 30 30">
          <path d="M3 14 15 4l12 10v12H3Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M12.5 26v-7h5v7M7 17h3v3H7zM20 17h3v3h-3z" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </symbol>
        <symbol id="al-g-yurt" viewBox="0 0 30 30">
          <path d="M3 24Q3 11 15 7q12 4 12 17Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M15 7V4M9 24l3-11M21 24l-3-11M3 24h24" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <path d="M13 24v-5h4v5" fill="none" stroke="#9c1f4b" strokeWidth="1.3" />
        </symbol>
        <symbol id="al-g-yurts" viewBox="0 0 30 30">
          <path d="M2 23Q2 15 9 13q7 2 7 10ZM14 23q0-8 7-10 7 2 7 10Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M1 23h28" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="23" cy="6" r="1.2" fill="#9c1f4b" />
        </symbol>
        <symbol id="al-g-pool" viewBox="0 0 30 30">
          <path d="M3 12q3-3 6 0t6 0 6 0 6 0M3 18q3-3 6 0t6 0 6 0 6 0M3 24q3-3 6 0t6 0 6 0 6 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M11 8q-1.5-2 0-4M15 8q-1.5-2 0-4M19 8q-1.5-2 0-4" fill="none" stroke="#9c1f4b" strokeWidth="1.1" strokeLinecap="round" />
        </symbol>
        <symbol id="al-g-bath" viewBox="0 0 30 30">
          <path d="M15 3s-8 9-8 14a8 8 0 0 0 16 0c0-5-8-14-8-14Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M11 17a4 4 0 0 0 4 4" fill="none" stroke="#9c1f4b" strokeWidth="1.3" strokeLinecap="round" />
        </symbol>
        <symbol id="al-g-lawn" viewBox="0 0 30 30">
          <path d="M2 25h26" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6 25v-6M6 25l-2.5-4.5M6 25l2.5-4.5M15 25v-8M15 25l-3-5.5M15 25l3-5.5M24 25v-6M24 25l-2.5-4.5M24 25l2.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M15 4.5 16 8l3.5 1-3.5 1-1 3.5-1-3.5-3.5-1 3.5-1Z" fill="#9c1f4b" />
        </symbol>
        <symbol id="al-mk-moon" viewBox="0 0 24 24">
          <path d="M13.8 3.4a8.6 8.6 0 1 0 6.9 12.4A7 7 0 0 1 13.8 3.4Z" fill="currentColor" />
          <path d="M18.6 3.2l.55 1.5 1.5.55-1.5.55-.55 1.5-.55-1.5-1.5-.55 1.5-.55Z" fill="currentColor" />
          <circle cx="21.2" cy="9.4" r=".75" fill="currentColor" />
        </symbol>
        <symbol id="al-mk-compass" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="12" cy="12" r="7.6" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".7" />
          <path d="M12 3.2 14.2 12 12 20.8 9.8 12Z" fill="currentColor" />
          <path d="M3.2 12 12 10.7 20.8 12 12 13.3Z" fill="currentColor" opacity=".55" />
          <path d="M12 .6v1.6M12 21.8v1.6M.6 12h1.6M21.8 12h1.6" stroke="currentColor" strokeWidth="1.1" />
        </symbol>
        <mask id="al-crescent-mask">
          <rect x="-60" y="-60" width="120" height="120" fill="#fff" />
          <circle cx="11" cy="-7" r="24" fill="#000" />
        </mask>
      </defs>
    </svg>
  );
}

export type Glyph =
  | "corner" | "star4" | "flameheart" | "circle-of" | "sunrise" | "mesquite"
  | "g-healing" | "g-main" | "g-yurt" | "g-yurts" | "g-pool" | "g-bath" | "g-lawn"
  | "mk-moon" | "mk-compass";

export function Mark({ id, className }: { id: Glyph; className?: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={`#al-${id}`} />
    </svg>
  );
}

// The double hairline frame with its four drawn corners, and the paper caps that let a leaf's
// words slip under the frame as it scrolls. One per page; it never scrolls.
export function Frame({ side }: { side: "verso" | "recto" }) {
  return (
    <div className={`al-frame al-frame--${side}`} aria-hidden="true">
      <i className="al-cap al-cap--t" />
      <i className="al-cap al-cap--b" />
      <i className="al-rule al-rule--outer" />
      <i className="al-rule al-rule--inner" />
      <Mark id="corner" className="al-corner tl" />
      <Mark id="corner" className="al-corner tr" />
      <Mark id="corner" className="al-corner bl" />
      <Mark id="corner" className="al-corner br" />
    </div>
  );
}

const MOONS = ["new", "crescent", "quarter", "gibbous", "full", "gibbous", "quarter", "crescent", "new"] as const;

// The phases across the head of an almanac leaf; the waning half is the waxing half mirrored.
export function MoonBand() {
  return (
    <div className="al-moonband" aria-hidden="true">
      {MOONS.map((phase, i) => (
        <span key={i} className="al-moonband-item">
          {i === 1 || i === MOONS.length - 1 ? <svg className="al-dot"><use href="#al-star4" /></svg> : null}
          <svg style={i > 4 ? { transform: "scaleX(-1)" } : undefined}>
            <use href={`#al-moon-${phase}`} />
          </svg>
        </span>
      ))}
    </div>
  );
}

// The nine principles around one flame-heart.
export function PrinciplesWheel() {
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  return (
    <svg className="al-wheel" viewBox="-130 -130 260 260" role="img" aria-label="A wheel of the nine principles, numbered one to nine around a flame-heart">
      <circle r="122" fill="none" stroke="#a87526" strokeWidth=".8" />
      <circle r="117" fill="none" stroke="#a87526" strokeWidth=".5" opacity=".6" />
      <circle r="78" fill="none" stroke="#a87526" strokeWidth=".6" opacity=".7" />
      <polygon points="0.0,-78.0 26.7,73.3 -50.1,-59.8 67.5,39.0 -76.8,-13.5 76.8,-13.5 -67.5,39.0 50.1,-59.8 -26.7,73.3" fill="none" stroke="#9c1f4b" strokeWidth=".9" opacity=".75" />
      <g fill="#9c1f4b">
        {numerals.map((_, i) => {
          const a = (i * 40 - 90) * (Math.PI / 180);
          return <circle key={i} cx={(78 * Math.cos(a)).toFixed(1)} cy={(78 * Math.sin(a)).toFixed(1)} r="3" />;
        })}
      </g>
      <g className="al-wheel-num" textAnchor="middle" dominantBaseline="central">
        {numerals.map((n, i) => {
          const a = (i * 40 - 90) * (Math.PI / 180);
          return (
            <text key={n} x={(100 * Math.cos(a)).toFixed(1)} y={(100 * Math.sin(a)).toFixed(1)}>
              {n}
            </text>
          );
        })}
      </g>
      <use href="#al-flameheart" x="-19" y="-22" width="38" height="42" style={{ color: "#9c1f4b" }} />
    </svg>
  );
}

// The wheel of the seasons, fall marked: the first gatherings open in fall 2027.
export function SeasonsWheel() {
  return (
    <svg className="al-seasons-wheel" viewBox="-130 -130 260 260" role="img" aria-label="A wheel of the four seasons with fall marked">
      <circle r="124" fill="none" stroke="#a87526" strokeWidth=".8" />
      <g stroke="#2b1621" strokeWidth="1">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} y1="-110" y2="-118" transform={`rotate(${i * 30})`} />
        ))}
      </g>
      <g fill="none" stroke="#2b1621" strokeWidth="1">
        <path d="M0-108A108 108 0 0 1 108 0L72 0A72 72 0 0 0 0-72Z" />
        <path d="M108 0A108 108 0 0 1 0 108L0 72A72 72 0 0 0 72 0Z" />
        <path d="M0 108A108 108 0 0 1-108 0L-72 0A72 72 0 0 0 0 72Z" fill="rgba(156,31,75,.16)" stroke="#9c1f4b" strokeWidth="1.6" />
        <path d="M-108 0A108 108 0 0 1 0-108L0-72A72 72 0 0 0-72 0Z" />
      </g>
      <g textAnchor="middle" dominantBaseline="central">
        <text className="al-season" x="63.6" y="-63.6">SPRING</text>
        <text className="al-season" x="63.6" y="63.6">SUMMER</text>
        <text className="al-season lit" x="-63.6" y="63.6">FALL</text>
        <text className="al-season" x="-63.6" y="-63.6">WINTER</text>
      </g>
      <use href="#al-star4" x="-101" y="85" width="16" height="16" style={{ color: "#9c1f4b" }} />
      <circle r="44" fill="none" stroke="#a87526" strokeWidth=".7" />
      <g mask="url(#al-crescent-mask)">
        <circle r="30" fill="#a87526" />
      </g>
      <use href="#al-star4" x="10" y="-4" width="10" height="10" style={{ color: "#a87526" }} />
      <use href="#al-star4" x="18" y="12" width="7" height="7" style={{ color: "#a87526" }} />
    </svg>
  );
}

// The compass rose from the site plan's plate, on its own.
export function CompassRose() {
  return (
    <svg className="al-compass" viewBox="-200 -250 400 450" role="img" aria-label="A compass rose, north at the top">
      <text y="-212" textAnchor="middle" fontFamily="var(--font-display), serif" fontSize="56" fill="#2b1621">N</text>
      <circle r="190" fill="none" stroke="#2b1621" strokeWidth="4" />
      <circle r="172" fill="none" stroke="#a87526" strokeWidth="3" />
      <g fill="#2b1621">
        <path d="M0-160 22-22 0 0Z" />
        <path d="M0-160-22-22 0 0Z" fill="#f3e8d3" stroke="#2b1621" strokeWidth="3" />
        <path d="M160 0 22 22 0 0Z" />
        <path d="M160 0 22-22 0 0Z" fill="#f3e8d3" stroke="#2b1621" strokeWidth="3" />
        <path d="M0 160-22 22 0 0Z" />
        <path d="M0 160 22 22 0 0Z" fill="#f3e8d3" stroke="#2b1621" strokeWidth="3" />
        <path d="M-160 0-22-22 0 0Z" />
        <path d="M-160 0-22 22 0 0Z" fill="#f3e8d3" stroke="#2b1621" strokeWidth="3" />
      </g>
      <g fill="#9c1f4b" transform="rotate(45)">
        <path d="M0-100 12-12 0 0-12-12Z" />
        <path d="M100 0 12 12 0 0 12-12Z" />
        <path d="M0 100-12 12 0 0 12 12Z" />
        <path d="M-100 0-12-12 0 0-12 12Z" />
      </g>
      <circle r="10" fill="#f3e8d3" stroke="#2b1621" strokeWidth="3" />
    </svg>
  );
}
