import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** `md` = 44px height, `lg` = 56px (wet-hand field actions). */
  size?: ButtonSize;
  /** Show inline spinner, set aria-busy, and disable interaction. */
  loading?: boolean;
  /** Leading icon node. */
  icon?: ReactNode;
  /** Trailing icon node. */
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconRight,
    fullWidth = false,
    disabled,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;

  const classes = [
    'wd-btn',
    `wd-btn--${variant}`,
    `wd-btn--${size}`,
    fullWidth ? 'wd-btn--full' : '',
    loading ? 'wd-btn--loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="wd-btn__spinner" aria-hidden="true">
          <Spinner size={size === 'lg' ? 20 : 18} />
        </span>
      ) : (
        icon != null && (
          <span className="wd-btn__icon" aria-hidden="true">
            {icon}
          </span>
        )
      )}
      {children != null && <span className="wd-btn__label">{children}</span>}
      {iconRight != null && !loading && (
        <span className="wd-btn__icon wd-btn__icon--right" aria-hidden="true">
          {iconRight}
        </span>
      )}
    </button>
  );
});
