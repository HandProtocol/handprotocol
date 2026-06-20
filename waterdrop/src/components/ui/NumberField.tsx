import { useId } from 'react';
import { Minus, Plus } from 'lucide-react';
import './NumberField.css';

export interface NumberFieldProps {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Unit suffix shown inside the field, e.g. "CFS", "°C", "pH". */
  unit?: string;
  placeholder?: string;
  id?: string;
  'aria-label'?: string;
  disabled?: boolean;
}

/**
 * Numeric input flanked by decrement / increment steppers, with an optional
 * unit suffix. Empty input resolves to `undefined`; values clamp to min/max.
 */
export function NumberField({
  value,
  onChange,
  step = 1,
  min,
  max,
  unit,
  placeholder,
  id,
  disabled = false,
  'aria-label': ariaLabel,
}: NumberFieldProps) {
  const reactId = useId();
  const inputId = id ?? reactId;

  const clamp = (n: number): number => {
    let out = n;
    if (min != null) out = Math.max(min, out);
    if (max != null) out = Math.min(max, out);
    return out;
  };

  const handleInput = (raw: string) => {
    if (raw.trim() === '') {
      onChange(undefined);
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onChange(parsed);
  };

  const handleBlur = () => {
    if (value == null) return;
    const clamped = clamp(value);
    if (clamped !== value) onChange(clamped);
  };

  const adjust = (dir: 1 | -1) => {
    const base = value ?? (min != null ? min : 0);
    onChange(clamp(round(base + dir * step, step)));
  };

  const atMin = value != null && min != null && value <= min;
  const atMax = value != null && max != null && value >= max;

  return (
    <div className={`wd-numberfield${disabled ? ' wd-numberfield--disabled' : ''}`}>
      <button
        type="button"
        className="wd-numberfield__step"
        aria-label="Decrease"
        onClick={() => adjust(-1)}
        disabled={disabled || atMin}
        tabIndex={-1}
      >
        <Minus size={18} aria-hidden="true" />
      </button>

      <div className="wd-numberfield__field">
        <input
          id={inputId}
          className="wd-numberfield__input"
          type="text"
          inputMode="decimal"
          value={value ?? ''}
          onChange={(e) => handleInput(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          autoComplete="off"
        />
        {unit != null && (
          <span className="wd-numberfield__unit" aria-hidden="true">
            {unit}
          </span>
        )}
      </div>

      <button
        type="button"
        className="wd-numberfield__step"
        aria-label="Increase"
        onClick={() => adjust(1)}
        disabled={disabled || atMax}
        tabIndex={-1}
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Round to the precision implied by step (avoids 0.1 + 0.2 drift). */
function round(n: number, step: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(n.toFixed(decimals));
}
