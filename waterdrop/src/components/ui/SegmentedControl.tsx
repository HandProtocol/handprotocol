import { useRef } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import './SegmentedControl.css';

export interface SegmentOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

/**
 * Single-select segmented control (radiogroup). The selected segment is a
 * lifted surface pill on a recessed track. Arrow / Home / End keys move
 * selection roving-tabindex style.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    const opt = options[index];
    if (!opt) return;
    onChange(opt.value);
    refs.current[index]?.focus();
  };

  const move = (delta: number, fromIndex: number) => {
    const count = options.length;
    if (count === 0) return;
    select((fromIndex + delta + count) % count);
  };

  const handleKeyDown = (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        move(1, index);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        move(-1, index);
        break;
      case 'Home':
        e.preventDefault();
        select(0);
        break;
      case 'End':
        e.preventDefault();
        select(options.length - 1);
        break;
    }
  };

  const trackStyle = { '--wd-seg-count': options.length } as CSSProperties;

  return (
    <div
      className="wd-segmented"
      role="radiogroup"
      aria-label={label}
      style={trackStyle}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`wd-segmented__seg${selected ? ' wd-segmented__seg--selected' : ''}`}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {opt.icon != null && (
              <span className="wd-segmented__icon" aria-hidden="true">
                {opt.icon}
              </span>
            )}
            <span className="wd-segmented__label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
