import type { CSSProperties } from 'react';
import './Skeleton.css';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
}

const toCss = (v: string | number | undefined): string | undefined =>
  v == null ? undefined : typeof v === 'number' ? `${v}px` : v;

/**
 * Loading placeholder with a subtle limestone shimmer. Shimmer is suppressed
 * under reduced motion (a static tint remains). Used for sheet content and
 * charts instead of mid-content spinners.
 */
export function Skeleton({ width, height, radius }: SkeletonProps) {
  const style: CSSProperties = {
    width: toCss(width),
    height: toCss(height) ?? '1em',
    borderRadius: toCss(radius) ?? 'var(--radius-sm)',
  };
  return <span className="wd-skeleton" style={style} aria-hidden="true" />;
}
