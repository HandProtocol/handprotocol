import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import './Sheet.css';

export type SheetDetent = 'peek' | 'half' | 'full';

export interface SheetProps {
  detent: SheetDetent;
  onDetentChange: (d: SheetDetent) => void;
  children: ReactNode;
  label?: string;
}

const PEEK_PX = 128;
const ORDER: SheetDetent[] = ['peek', 'half', 'full'];

/** Travel (px) past which a slow drag commits to the nearest detent. */
const COMMIT_DISTANCE = 56;
/** Flick velocity (px/ms) that commits to the neighbouring detent. */
const COMMIT_VELOCITY = 0.45;
/** Movement below this (px) on release counts as a tap, not a drag. */
const TAP_SLOP = 6;

interface DragState {
  startY: number;
  startOffset: number;
  lastY: number;
  lastT: number;
  velocity: number;
  pointerId: number;
}

/**
 * Bottom sheet with three detents (peek / half / full). A full-height panel is
 * translated on the Y axis so motion stays on transform (GPU-smooth); the
 * visible height for each detent is masked by translating the panel down.
 *
 * The grab handle is a real button: click/tap or an upward pointer drag expands
 * one or more detents, while a separate control collapses one detent. Keeping
 * downward pulls out of the resize gesture avoids competing with mobile browser
 * refresh gestures. Arrow keys continue to step through every detent. A scrim
 * renders only at `full`; tapping it returns to `half`.
 */
export function Sheet({ detent, onDetentChange, children, label }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [viewportH, setViewportH] = useState<number>(() =>
    typeof window === 'undefined' ? 800 : window.innerHeight
  );

  const dragRef = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);

  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cssVar = (name: string, fallback: number): number => {
    if (typeof window === 'undefined' || !panelRef.current) return fallback;
    const raw = getComputedStyle(panelRef.current).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  const heightFor = useCallback(
    (d: SheetDetent): number => {
      const appbar = cssVar('--appbar-h', 56);
      const safeTop = cssVar('--safe-top', 0);
      const fullH = viewportH - appbar - safeTop;
      switch (d) {
        case 'peek':
          return PEEK_PX;
        case 'half':
          return Math.round(viewportH * 0.52);
        case 'full':
          return fullH;
      }
    },
    [viewportH]
  );

  const panelHeight = heightFor('full');
  const maxOffset = panelHeight - PEEK_PX;

  // translateY = how far the full-height panel is pushed down so only the
  // current detent's height remains visible. Live drag overrides the base.
  const baseOffset = panelHeight - heightFor(detent);
  const effectiveOffset =
    dragOffset != null ? clamp(dragOffset, 0, maxOffset) : baseOffset;

  const commitFromDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;

    const upwardTravel = Math.min(drag.lastY - drag.startY, 0);
    const releasedOffset = clamp(drag.startOffset + upwardTravel, 0, maxOffset);
    const releasedVisible = panelHeight - releasedOffset;
    const v = drag.velocity;

    let target = detent;
    if (v <= -COMMIT_VELOCITY) {
      const idx = ORDER.indexOf(detent);
      if (idx < ORDER.length - 1) target = ORDER[idx + 1];
    } else if (-upwardTravel >= COMMIT_DISTANCE) {
      const nearest = nearestDetent(releasedVisible, heightFor);
      if (ORDER.indexOf(nearest) > ORDER.indexOf(detent)) target = nearest;
    }

    if (target !== detent) onDetentChange(target);
  }, [detent, heightFor, maxOffset, onDetentChange, panelHeight]);

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      startOffset: baseOffset,
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
      pointerId: e.pointerId,
    };
    setDragging(true);
    setDragOffset(baseOffset);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const now = performance.now();
    const dt = now - drag.lastT;
    if (dt > 0) drag.velocity = (e.clientY - drag.lastY) / dt;
    drag.lastY = e.clientY;
    drag.lastT = now;
    const upwardTravel = Math.min(e.clientY - drag.startY, 0);
    setDragOffset(clamp(drag.startOffset + upwardTravel, 0, maxOffset));
  };

  const endDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const moved = Math.abs(drag.lastY - drag.startY);
    if (moved < TAP_SLOP) {
      const idx = ORDER.indexOf(detent);
      if (idx < ORDER.length - 1) onDetentChange(ORDER[idx + 1]);
    } else {
      commitFromDrag();
    }
    dragRef.current = null;
    setDragging(false);
    setDragOffset(null);
  };

  const cancelDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    setDragOffset(null);
  };

  const collapse = () => {
    const idx = ORDER.indexOf(detent);
    if (idx > 0) onDetentChange(ORDER[idx - 1]);
  };

  const handleHandleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const idx = ORDER.indexOf(detent);
    if (e.key === 'ArrowUp' && idx < ORDER.length - 1) {
      e.preventDefault();
      onDetentChange(ORDER[idx + 1]);
    } else if (e.key === 'ArrowDown' && idx > 0) {
      e.preventDefault();
      onDetentChange(ORDER[idx - 1]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (idx < ORDER.length - 1) onDetentChange(ORDER[idx + 1]);
    }
  };

  const expandLabel =
    detent === 'peek'
      ? 'Expand panel to half height'
      : detent === 'half'
        ? 'Expand panel to full height'
        : 'Panel fully expanded';

  const panelStyle: CSSProperties = {
    height: 'var(--wd-sheet-full)',
    transform: `translateY(${effectiveOffset}px)`,
  };

  return (
    <>
      {detent === 'full' && (
        <div
          className="wd-sheet__scrim"
          onClick={() => onDetentChange('half')}
          aria-hidden="true"
        />
      )}
      <div
        ref={panelRef}
        className={`wd-sheet${dragging ? ' wd-sheet--dragging' : ''}`}
        role="region"
        aria-label={label ?? 'Panel'}
        style={panelStyle}
      >
        <div className="wd-sheet__toolbar">
          <button
            type="button"
            className="wd-sheet__handle"
            aria-label={expandLabel}
            aria-expanded={detent !== 'peek'}
            aria-disabled={detent === 'full'}
            tabIndex={detent === 'full' ? -1 : 0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={cancelDrag}
            onKeyDown={handleHandleKeyDown}
          >
            <span className="wd-sheet__grip" aria-hidden="true" />
          </button>
          {detent !== 'peek' && (
            <button
              type="button"
              className="wd-sheet__collapse"
              aria-label={
                detent === 'full'
                  ? 'Collapse panel to half height'
                  : 'Collapse panel to preview'
              }
              onClick={collapse}
            >
              <ChevronDown size={20} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="wd-sheet__content">{children}</div>
      </div>
    </>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function nearestDetent(
  visible: number,
  heightFor: (d: SheetDetent) => number
): SheetDetent {
  let best: SheetDetent = 'peek';
  let bestDist = Infinity;
  for (const d of ORDER) {
    const dist = Math.abs(heightFor(d) - visible);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}
