import { cloneElement, isValidElement, useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import './Field.css';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  /** Associates the label with a control by id. */
  htmlFor?: string;
  children: ReactNode;
}

/**
 * Form row: label above control, hint/error below. The error message is given
 * an id and announced politely; consumers should wire the control's
 * aria-describedby / aria-invalid (or rely on htmlFor + visual cue).
 */
export function Field({ label, hint, error, htmlFor, children }: FieldProps) {
  const reactId = useId();
  const describedById = error
    ? `${reactId}-error`
    : hint
      ? `${reactId}-hint`
      : undefined;

  // Wire the hint/error association (and invalid state) onto a single control
  // child so screen readers announce it; falls back to plain children otherwise.
  let control: ReactNode = children;
  if (describedById && isValidElement(children)) {
    const extraProps: Record<string, unknown> = { 'aria-describedby': describedById };
    if (error) extraProps['aria-invalid'] = true;
    control = cloneElement(children as ReactElement<Record<string, unknown>>, extraProps);
  }

  return (
    <div className={`wd-field${error ? ' wd-field--error' : ''}`}>
      <label className="wd-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="wd-field__control">{control}</div>
      {error ? (
        <p id={describedById} className="wd-field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={describedById} className="wd-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
