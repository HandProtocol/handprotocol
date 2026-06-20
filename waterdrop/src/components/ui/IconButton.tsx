import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import './IconButton.css';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type IconButtonSize = 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required accessible name (becomes aria-label and title tooltip). */
  label: string;
  variant?: IconButtonVariant;
  /** `md` = 44px, `lg` = 56px. */
  size?: IconButtonSize;
}

/**
 * Square button wrapping a single icon child. Always carries an accessible
 * label since it has no visible text.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      variant = 'ghost',
      size = 'md',
      type = 'button',
      className,
      children,
      ...rest
    },
    ref
  ) {
    const classes = [
      'wd-iconbtn',
      `wd-iconbtn--${variant}`,
      `wd-iconbtn--${size}`,
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        aria-label={label}
        title={label}
        {...rest}
      >
        <span className="wd-iconbtn__icon" aria-hidden="true">
          {children}
        </span>
      </button>
    );
  }
);
