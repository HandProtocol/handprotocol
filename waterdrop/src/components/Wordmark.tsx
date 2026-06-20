import './Wordmark.css';

/** The WaterDrop wordmark: a river-bend drop mark + the display-face name.
    The display face is permitted here (wordmark), not in UI labels or data. */
export function Wordmark() {
  return (
    <span className="wd-wordmark">
      <svg
        className="wd-wordmark__mark"
        viewBox="0 0 64 64"
        width="26"
        height="26"
        role="img"
        aria-label="WaterDrop"
      >
        <path
          d="M32 5 C32 5 53 30 53 42 a21 21 0 1 1 -42 0 C11 30 32 5 32 5 Z"
          fill="var(--spring-600)"
        />
        <path
          d="M20 41 C26 35 33 47 44 38"
          fill="none"
          stroke="var(--stone-0)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="wd-wordmark__text display">WaterDrop</span>
    </span>
  );
}
