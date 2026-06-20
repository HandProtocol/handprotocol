import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import './TextInput.css';

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Single-line text input. Tabular figures kick in automatically for numeric
 * input modes so digits align in the field.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, type = 'text', inputMode, ...rest }, ref) {
    const numeric = inputMode === 'numeric' || inputMode === 'decimal';
    const classes = [
      'wd-input',
      numeric ? 'wd-input--numeric' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <input
        ref={ref}
        type={type}
        inputMode={inputMode}
        className={classes}
        {...rest}
      />
    );
  }
);
