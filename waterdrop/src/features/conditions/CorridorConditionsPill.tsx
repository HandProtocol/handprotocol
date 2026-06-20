// ─────────────────────────────────────────────────────────────────────────────
// CorridorConditionsPill — compact AppBar control. One glance to "can I float?":
// the corridor verdict as a StatusPill (icon + label) plus the headline flow.
// Skeleton while loading, a stale dot + "offline" when the gauge is unreachable.
// Tapping opens the headline gauge detail in the sheet.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CheckCircle2,
  ArrowDownToLine,
  Waves,
  AlertTriangle,
  HelpCircle,
  WifiOff,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusPill, Skeleton } from '@/components/ui';
import type { StatusTone } from '@/components/ui';
import { useStore } from '@/store';
import { VERDICT_META } from '@/lib/verdict';
import { fmtCfs } from '@/lib/format';
import type { Verdict } from '@/types';
import { useCorridorVerdict } from './corridor';
import './CorridorConditionsPill.css';

const VERDICT_ICON: Record<Verdict, ReactNode> = {
  good: <CheckCircle2 />,
  low: <ArrowDownToLine />,
  high: <Waves />,
  danger: <AlertTriangle />,
  unknown: <HelpCircle />,
};

export function CorridorConditionsPill() {
  const select = useStore((s) => s.select);
  const { verdict, gauge, reading, loading, anyStale } = useCorridorVerdict();

  if (loading) {
    return (
      <div className="wd-cond-pill wd-cond-pill--loading" role="status" aria-live="polite">
        <Skeleton width={132} height={28} radius="var(--radius-pill)" />
        <span className="sr-only">Checking river conditions</span>
      </div>
    );
  }

  const meta = VERDICT_META[verdict];
  const tone = meta.tone as StatusTone;
  const targetGauge = gauge?.usgsId ?? reading?.usgsId;
  const cfs = reading?.dischargeCfs;
  const showFlow = cfs != null && !reading?.stale;

  const ariaLabel = [
    `River conditions: ${meta.label}`,
    showFlow ? fmtCfs(cfs) : null,
    anyStale ? 'data may be offline' : null,
    'tap for details',
  ]
    .filter(Boolean)
    .join(', ');

  const liveText = `River conditions: ${meta.label}.${
    anyStale ? ' Offline, showing last known reading.' : ''
  }`;

  return (
    <>
      <button
        type="button"
        className="wd-cond-pill"
        aria-label={ariaLabel}
        onClick={() => {
          if (targetGauge) select({ kind: 'gauge', usgsId: targetGauge });
        }}
      >
        <StatusPill tone={tone} icon={VERDICT_ICON[verdict]} size="sm">
          {meta.label}
        </StatusPill>
        {showFlow && <span className="wd-cond-pill__flow tabular">{fmtCfs(cfs)}</span>}
        {anyStale && (
          <span className="wd-cond-pill__offline" title="Showing last known reading">
            <span className="wd-cond-pill__dot" aria-hidden="true" />
            <WifiOff className="wd-cond-pill__offline-icon" aria-hidden="true" />
            <span className="wd-cond-pill__offline-text">offline</span>
          </span>
        )}
      </button>
      {/* Announce verdict / offline changes to assistive tech. */}
      <span className="sr-only" role="status" aria-live="polite">
        {liveText}
      </span>
    </>
  );
}
