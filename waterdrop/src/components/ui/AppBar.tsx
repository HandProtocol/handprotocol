import type { ReactNode } from 'react';
import './AppBar.css';

export interface AppBarProps {
  left?: ReactNode;
  title?: ReactNode;
  right?: ReactNode;
}

/**
 * Fixed top bar with three slots (left, title, right). Honours the top safe
 * area inset. Presentational only; sits above the map (z 800) and below the
 * Sheet when it is full (z 1200).
 */
export function AppBar({ left, title, right }: AppBarProps) {
  return (
    <header className="wd-appbar">
      <div className="wd-appbar__inner">
        <div className="wd-appbar__slot wd-appbar__left">{left}</div>
        {title != null && <div className="wd-appbar__title">{title}</div>}
        <div className="wd-appbar__slot wd-appbar__right">{right}</div>
      </div>
    </header>
  );
}
