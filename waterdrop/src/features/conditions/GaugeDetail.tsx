// ─────────────────────────────────────────────────────────────────────────────
// GaugeDetail — the gauge detail card rendered in the bottom sheet.
//
// Verdict FIRST (per DESIGN.md): a plain-language StatusPill + blurb before any
// number or chart. Then honest readouts (discharge, gage height), an "updated"
// line with a refresh control, the 24h trend, and the segments this gauge
// covers as tappable rows. Loading shows skeletons, never a mid-content spinner.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import {
  CheckCircle2,
  ArrowDownToLine,
  Waves,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  ChevronRight,
  CloudOff,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  StatusPill,
  StatReadout,
  Skeleton,
  Divider,
  IconButton,
  EmptyState,
} from '@/components/ui';
import type { StatusTone } from '@/components/ui';
import { useStore } from '@/store';
import { gaugeById, segmentById, pointById } from '@/lib/segments';
import { VERDICT_META } from '@/lib/verdict';
import { fmtCfs, fmtFeet, fmtAgo } from '@/lib/format';
import type { GaugeReading, Verdict } from '@/types';
import { fetchReadings } from './usgs';
import { TrendChart } from './TrendChart';
import './GaugeDetail.css';

const VERDICT_ICON: Record<Verdict, ReactNode> = {
  good: <CheckCircle2 />,
  low: <ArrowDownToLine />,
  high: <Waves />,
  danger: <AlertTriangle />,
  unknown: <HelpCircle />,
};

/** "observedAt" is an ISO string; fall back to fetchedAt (epoch ms). */
function updatedEpoch(reading: GaugeReading): number {
  if (reading.observedAt) {
    const ms = new Date(reading.observedAt).getTime();
    if (Number.isFinite(ms)) return ms;
  }
  return reading.fetchedAt;
}

interface GaugeDetailProps {
  usgsId: string;
}

export function GaugeDetail({ usgsId }: GaugeDetailProps) {
  const gauge = gaugeById(usgsId);
  const reading = useStore((s) => s.gaugeReadings[usgsId]);
  const setGaugeReadings = useStore((s) => s.setGaugeReadings);
  const select = useStore((s) => s.select);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const prev = useStore.getState().gaugeReadings;
      const fresh = await fetchReadings([usgsId], prev);
      setGaugeReadings({ ...useStore.getState().gaugeReadings, ...fresh });
    } finally {
      setRefreshing(false);
    }
  }, [usgsId, refreshing, setGaugeReadings]);

  if (!gauge) {
    return (
      <div className="wd-cond-detail">
        <EmptyState icon={<HelpCircle />} title="Gauge not found">
          We do not have data for this gauge in the corridor.
        </EmptyState>
      </div>
    );
  }

  // ── Loading: no reading yet → skeletons, not a spinner ──
  if (!reading) {
    return (
      <div className="wd-cond-detail">
        <header className="wd-cond-detail__head">
          <div className="wd-cond-detail__heading">
            <h2 className="wd-cond-detail__name">{gauge.name}</h2>
            <span className="wd-cond-detail__site eyebrow">USGS {gauge.usgsId}</span>
          </div>
        </header>
        <Skeleton width={148} height={32} radius="var(--radius-pill)" />
        <div className="wd-cond-detail__stats">
          <Skeleton width={120} height={44} />
          <Skeleton width={120} height={44} />
        </div>
        <Skeleton width="100%" height={168} radius="var(--radius-md)" />
      </div>
    );
  }

  const meta = VERDICT_META[reading.verdict];
  const tone = meta.tone as StatusTone;
  const updatedAt = updatedEpoch(reading);
  const series = reading.series ?? [];
  const hasSeries = series.some((p) => p.cfs != null);

  return (
    <div className="wd-cond-detail">
      <header className="wd-cond-detail__head">
        <div className="wd-cond-detail__heading">
          <h2 className="wd-cond-detail__name">{gauge.name}</h2>
          <span className="wd-cond-detail__site eyebrow">USGS {gauge.usgsId}</span>
        </div>
      </header>

      {/* Verdict first: plain-language answer before any number. */}
      <div className="wd-cond-detail__verdict">
        <StatusPill tone={tone} icon={VERDICT_ICON[reading.verdict]}>
          {meta.label}
        </StatusPill>
        <p className="wd-cond-detail__blurb">{meta.blurb}</p>
      </div>

      <div className="wd-cond-detail__stats">
        {/* Value stays max-contrast for sun legibility; verdict color lives on the pill. */}
        <StatReadout label="Discharge" value={fmtCfs(reading.dischargeCfs)} />
        <StatReadout label="Gage height" value={fmtFeet(reading.gageHeightFt)} />
      </div>

      <div className="wd-cond-detail__updated">
        <span className="wd-cond-detail__updated-text">
          Updated {fmtAgo(updatedAt)}
        </span>
        <IconButton
          label="Refresh gauge data"
          variant="ghost"
          onClick={() => void refresh()}
          disabled={refreshing}
          className={refreshing ? 'wd-cond-detail__spin' : undefined}
        >
          <RefreshCw />
        </IconButton>
      </div>

      {reading.stale && (
        <div className="wd-cond-detail__stale" role="status">
          <CloudOff className="wd-cond-detail__stale-icon" aria-hidden="true" />
          <span>Showing last known reading, gauge unreachable.</span>
        </div>
      )}

      <Divider />

      <section className="wd-cond-detail__trend">
        <h3 className="wd-cond-detail__section eyebrow">Discharge, last 24h</h3>
        {hasSeries ? (
          <TrendChart series={series} gauge={gauge} />
        ) : (
          <div className="wd-cond-detail__trend-empty">
            <Skeleton width="100%" height={168} radius="var(--radius-md)" />
            <p className="wd-cond-detail__trend-note">
              {reading.stale ? 'Trend unavailable while offline.' : 'No recent trend data.'}
            </p>
          </div>
        )}
      </section>

      <Divider />

      <section className="wd-cond-detail__reach">
        <h3 className="wd-cond-detail__section eyebrow">Covers this reach</h3>
        <ul className="wd-cond-detail__segments">
          {gauge.nearestSegmentIds.map((id) => {
            const seg = segmentById(id);
            if (!seg) return null;
            const from = pointById(seg.fromPointId)?.name ?? seg.fromPointId;
            const to = pointById(seg.toPointId)?.name ?? seg.toPointId;
            return (
              <li key={id}>
                <button
                  type="button"
                  className="wd-cond-detail__segment"
                  onClick={() => select({ kind: 'segment', id })}
                >
                  <span className="wd-cond-detail__segment-label">
                    <span className="wd-cond-detail__segment-from">{from}</span>
                    <span className="wd-cond-detail__segment-arrow" aria-hidden="true">
                      {' to '}
                    </span>
                    <span className="wd-cond-detail__segment-to">{to}</span>
                  </span>
                  <ChevronRight
                    className="wd-cond-detail__segment-chevron"
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
