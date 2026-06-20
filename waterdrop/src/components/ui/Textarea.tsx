import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import './Textarea.css';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Multi-line text input. Matches TextInput styling, taller minimum. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, rows = 3, ...rest }, ref) {
    const classes = ['wd-textarea', className ?? ''].filter(Boolean).join(' ');
    return <textarea ref={ref} rows={rows} className={classes} {...rest} />;
  }
);
