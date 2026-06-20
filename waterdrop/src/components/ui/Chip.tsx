import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Chip.css';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
}

/**
 * Filter / tag chip, used in clusters. Selection state is conveyed by fill,
 * border, and text weight, plus aria-pressed for assistive tech.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected = false, icon, type = 'button', className, children, ...rest },
  ref
) {
  const classes = [
    'wd-chip',
    selected ? 'wd-chip--selected' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      aria-pressed={selected}
      {...rest}
    >
      {icon != null && (
        <span className="wd-chip__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="wd-chip__label">{children}</span>
    </button>
  );
});
