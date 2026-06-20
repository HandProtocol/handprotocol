// ─────────────────────────────────────────────────────────────────────────────
// TrendChart — quiet, honest 24h discharge area chart. Spring-green stroke with
// a soft low-opacity fill, minimal axes (hours on X, cfs on Y), thin limestone
// grid, and faint dashed threshold lines for the gauge's low/high cfs. Recharts
// needs concrete colors (no CSS vars), so we use the hex set from usgs.ts.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { Gauge, TrendPoint } from '@/types';
import { fmtClock, fmtCfs } from '@/lib/format';
import { VERDICT_COLORS } from './usgs';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const RIVER = VERDICT_COLORS.good; // #2f9e7a — spring green
const GRID = '#e3e7df';
const AXIS_TEXT = '#7c8a7e';
const LOW_LINE = VERDICT_COLORS.low; // #c79a2a
const HIGH_LINE = VERDICT_COLORS.high; // #c8702f

interface TrendChartProps {
  series: TrendPoint[];
  gauge?: Gauge;
}

interface ChartDatum {
  ms: number;
  t: string;
  cfs: number;
}

const hourTick = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: 'numeric' });

interface TooltipPayloadItem {
  payload: ChartDatum;
}
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="wd-cond-tooltip">
      <span className="wd-cond-tooltip__value tabular">{fmtCfs(d.cfs)}</span>
      <span className="wd-cond-tooltip__time tabular">{fmtClock(d.t)}</span>
    </div>
  );
}

export function TrendChart({ series, gauge }: TrendChartProps) {
  const reduced = usePrefersReducedMotion();

  // Only points with a discharge value belong on a cfs chart.
  const data: ChartDatum[] = series
    .filter((p) => p.cfs != null)
    .map((p) => ({ ms: new Date(p.t).getTime(), t: p.t, cfs: p.cfs as number }))
    .filter((p) => Number.isFinite(p.ms));

  const low = gauge?.flowLowCfs;
  const high = gauge?.flowHighCfs;

  return (
    <div className="wd-cond-chart" role="img" aria-label="Discharge over the last 24 hours">
      <ResponsiveContainer width="100%" height={168}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="wd-cond-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={RIVER} stopOpacity={0.22} />
              <stop offset="100%" stopColor={RIVER} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />

          <XAxis
            dataKey="ms"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={hourTick}
            tick={{ fill: AXIS_TEXT, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            minTickGap={28}
          />
          <YAxis
            width={40}
            tick={{ fill: AXIS_TEXT, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${Math.round(v)}`}
            domain={['auto', 'auto']}
          />

          {low != null && (
            <ReferenceLine
              y={low}
              stroke={LOW_LINE}
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: 'low', position: 'insideTopLeft', fill: LOW_LINE, fontSize: 10 }}
            />
          )}
          {high != null && (
            <ReferenceLine
              y={high}
              stroke={HIGH_LINE}
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: 'high', position: 'insideTopLeft', fill: HIGH_LINE, fontSize: 10 }}
            />
          )}

          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: AXIS_TEXT, strokeWidth: 1, strokeDasharray: '3 3' }}
          />

          <Area
            type="monotone"
            dataKey="cfs"
            stroke={RIVER}
            strokeWidth={2}
            fill="url(#wd-cond-fill)"
            dot={false}
            activeDot={{ r: 3, fill: RIVER, stroke: '#ffffff', strokeWidth: 1 }}
            isAnimationActive={!reduced}
            animationDuration={280}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
