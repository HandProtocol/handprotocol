import type { CSSProperties, ReactNode } from 'react';
import './StatReadout.css';

export interface StatReadoutProps {
  label: string;
  value: ReactNode;
  unit?: string;
  /** A CSS color or token var string (e.g. 'var(--good)') to tint the value. */
  tone?: string;
}

/**
 * Compact, honest data readout: eyebrow label + large tabular value + small
 * unit. Deliberately NOT the hero-metric template (no gradient, no stat trio,
 * no marketing-scale number).
 */
export function StatReadout({ label, value, unit, tone }: StatReadoutProps) {
  const valueStyle: CSSProperties | undefined = tone
    ? { color: tone }
    : undefined;

  return (
    <div className="wd-stat">
      <span className="wd-stat__label eyebrow">{label}</span>
      <span className="wd-stat__value tabular" style={valueStyle}>
        {value}
        {unit != null && <span className="wd-stat__unit"> {unit}</span>}
      </span>
    </div>
  );
}
