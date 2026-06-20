import type { ReactNode } from 'react';
import './StatusPill.css';

export type StatusTone =
  | 'good'
  | 'low'
  | 'high'
  | 'danger'
  | 'info'
  | 'hazard'
  | 'neutral';
export type StatusPillSize = 'md' | 'sm';

export interface StatusPillProps {
  tone: StatusTone;
  icon?: ReactNode;
  size?: StatusPillSize;
  children: ReactNode;
}

/**
 * Conditions verdict / status badge. The text label is always shown; color is
 * a redundant signal, never the only one. Background uses the soft hue, text
 * uses the strong hue for AAA legibility in sunlight.
 */
export function StatusPill({ tone, icon, size = 'md', children }: StatusPillProps) {
  const classes = ['wd-pill', `wd-pill--${tone}`, `wd-pill--${size}`].join(' ');

  return (
    <span className={classes}>
      {icon != null && (
        <span className="wd-pill__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="wd-pill__label">{children}</span>
    </span>
  );
}
