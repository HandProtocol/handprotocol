// ─────────────────────────────────────────────────────────────────────────────
// TripPlanner — the core "plan a float" surface. Pick a put-in and a take-out,
// get the whole run: one plain-language verdict, total distance and time, the
// hazards and portages along the way, then a tappable leg-by-leg list. Renders
// inside the bottom sheet. Verdict first, calm and scannable (see DESIGN.md).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ArrowRight,
  ChevronRight,
  Compass,
  Map as MapIcon,
  WifiOff,
  Waves,
  TriangleAlert,
  Bus,
  GitBranch,
  Anchor,
  Logs,
  CheckCircle2,
  ArrowDownToLine,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button,
  IconButton,
  StatusPill,
  StatReadout,
  EmptyState,
  Field,
  Divider,
} from '@/components/ui';
import type { StatusTone } from '@/components/ui';
import { useStore } from '@/store';
import { accessPoints } from '@/data';
import { segmentMidpoint, pointById } from '@/lib/segments';
import { VERDICT_META } from '@/lib/verdict';
import { fmtMiles, fmtHours } from '@/lib/format';
import type { Hazard, Verdict } from '@/types';
import { planTrip, aggregateVerdict, mostNotableHazard } from './planTrip';
import './TripPlanner.css';

// Shared hazard vocabulary (matches SegmentDetail so labels never diverge).
interface HazardMeta {
  label: string;
  icon: ReactNode;
}
const HAZARD_META: Record<Hazard, HazardMeta> = {
  rapid: { label: 'Rapid', icon: <Waves size={14} /> },
  dam: { label: 'Dam portage', icon: <TriangleAlert size={14} /> },
  'low-water-bridge': { label: 'Low-water bridge', icon: <Bus size={14} /> },
  strainer: { label: 'Strainer', icon: <GitBranch size={14} /> },
  rebar: { label: 'Rebar', icon: <Anchor size={14} /> },
  'log-jam': { label: 'Log jam', icon: <Logs size={14} /> },
};

const VERDICT_ICON: Record<Verdict, ReactNode> = {
  good: <CheckCircle2 size={14} />,
  low: <ArrowDownToLine size={14} />,
  high: <Waves size={14} />,
  danger: <AlertTriangle size={14} />,
  unknown: <HelpCircle size={14} />,
};

// Access points ordered downstream for both pickers and option labels.
const orderedPoints = [...accessPoints].sort((a, b) => a.riverMile - b.riverMile);

export interface TripPlannerProps {
  initialFromId?: string;
  onClose?: () => void;
}

function optionLabel(name: string, riverMile: number): string {
  return `${name} (mi ${riverMile.toFixed(1)})`;
}

export function TripPlanner({ initialFromId, onClose }: TripPlannerProps) {
  const select = useStore((s) => s.select);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const gaugeReadings = useStore((s) => s.gaugeReadings);

  const seedFrom =
    initialFromId && pointById(initialFromId) ? initialFromId : '';
  const [fromId, setFromId] = useState<string>(seedFrom);
  const [toId, setToId] = useState<string>('');

  const bothChosen = fromId !== '' && toId !== '';

  const plan = useMemo(
    () => (bothChosen ? planTrip(fromId, toId) : null),
    [bothChosen, fromId, toId],
  );

  const conditions = useMemo(
    () => (plan && plan.valid ? aggregateVerdict(plan, gaugeReadings) : null),
    [plan, gaugeReadings],
  );

  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  function showFullRun() {
    if (!plan || !plan.valid || plan.legs.length === 0) return;
    // Fit-ish: fly to the midpoint of the geographic middle leg of the run.
    const midLeg = plan.legs[Math.floor(plan.legs.length / 2)];
    requestFlyTo(segmentMidpoint(midLeg.segment), 12);
  }

  return (
    <div className="wd-plan">
      <header className="wd-plan__head">
        <div>
          <h2 className="wd-plan__title">Plan a float</h2>
          <p className="wd-plan__subtitle">
            Choose where you put in and take out. We add up the whole run.
          </p>
        </div>
      </header>

      <div className="wd-plan-pickers">
        <Field label="Put in" htmlFor="wd-plan-from">
          <select
            id="wd-plan-from"
            className="wd-plan-select"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
          >
            <option value="">Select a put-in</option>
            {orderedPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {optionLabel(p.name, p.riverMile)}
              </option>
            ))}
          </select>
        </Field>

        <div className="wd-plan-swap">
          <span className="wd-plan-swap__rule" aria-hidden="true" />
          <IconButton
            label="Swap put-in and take-out"
            variant="secondary"
            onClick={swap}
            disabled={!fromId && !toId}
          >
            <ArrowUpDown size={18} />
          </IconButton>
          <span className="wd-plan-swap__rule" aria-hidden="true" />
        </div>

        <Field label="Take out" htmlFor="wd-plan-to">
          <select
            id="wd-plan-to"
            className="wd-plan-select"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
          >
            <option value="">Select a take-out</option>
            {orderedPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {optionLabel(p.name, p.riverMile)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Teaching empty state before both points are picked. */}
      {!bothChosen && (
        <EmptyState
          icon={<Compass size={28} />}
          title="Choose a put-in and a take-out"
        >
          <p>
            Pick two access points and we will plan your float: distance, time,
            portages, and what is runnable today.
          </p>
        </EmptyState>
      )}

      {/* Invalid (e.g. take-out upstream of put-in): calm inline note. */}
      {plan && !plan.valid && (
        <div className="wd-plan-note" role="status">
          <span className="wd-plan-note__icon" aria-hidden="true">
            <ArrowDownToLine size={18} />
          </span>
          <span>{plan.reason}</span>
        </div>
      )}

      {/* Valid plan: verdict-first summary, then the legs. */}
      {plan && plan.valid && conditions && (
        <>
          <section className="wd-plan-summary" aria-label="Trip summary">
            <div className="wd-plan-summary__verdict">
              <StatusPill
                tone={VERDICT_META[conditions.verdict].tone as StatusTone}
                icon={VERDICT_ICON[conditions.verdict]}
              >
                {VERDICT_META[conditions.verdict].label}
              </StatusPill>
              {conditions.stale && (
                <span className="wd-plan-summary__offline">
                  <span
                    className="wd-plan-summary__offline-icon"
                    aria-hidden="true"
                  >
                    <WifiOff size={13} />
                  </span>
                  offline, last known
                </span>
              )}
            </div>

            <div className="wd-plan-summary__stats">
              <StatReadout
                label="Total distance"
                value={fmtMiles(plan.totalMiles)}
              />
              <StatReadout label="Est. time" value={fmtHours(plan.totalHours)} />
            </div>

            <p className="wd-plan-summary__shape">
              <span>
                <strong>{plan.legs.length}</strong>{' '}
                {plan.legs.length === 1 ? 'leg' : 'legs'}
              </span>
              <span className="wd-plan-summary__shape-dot" aria-hidden="true" />
              <span>
                <strong>{plan.portageCount}</strong>{' '}
                {plan.portageCount === 1 ? 'portage' : 'portages'}
              </span>
              <span className="wd-plan-summary__shape-dot" aria-hidden="true" />
              <span className="wd-plan-summary__difficulty">
                {plan.difficulty}
              </span>
            </p>

            {plan.hazards.length > 0 && (
              <div className="wd-plan-hazards">
                <p className="wd-plan-eyebrow">Hazards along the way</p>
                <div className="wd-plan-hazards__row">
                  {plan.hazards.map((h) => (
                    <StatusPill key={h} tone="hazard" icon={HAZARD_META[h].icon}>
                      {HAZARD_META[h].label}
                    </StatusPill>
                  ))}
                </div>
              </div>
            )}
          </section>

          <Divider />

          <section className="wd-plan-legs" aria-label="Leg by leg">
            <p className="wd-plan-eyebrow">Leg by leg</p>
            {plan.legs.map((leg, i) => {
              const hazardForLeg = mostNotableHazard(leg.segment.hazards);
              return (
                <button
                  key={leg.segment.id}
                  type="button"
                  className="wd-plan-leg"
                  onClick={() => {
                    select({ kind: 'segment', id: leg.segment.id });
                    requestFlyTo(segmentMidpoint(leg.segment), 13);
                  }}
                >
                  <span className="wd-plan-leg__index" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="wd-plan-leg__body">
                    <span className="wd-plan-leg__route">
                      {leg.fromName} to {leg.toName}
                    </span>
                    <span className="wd-plan-leg__meta">
                      <span>{fmtMiles(leg.segment.distanceMiles)}</span>
                      <span
                        className="wd-plan-leg__meta-dot"
                        aria-hidden="true"
                      />
                      <span>{fmtHours(leg.segment.estHours)}</span>
                      {hazardForLeg && (
                        <>
                          <span
                            className="wd-plan-leg__meta-dot"
                            aria-hidden="true"
                          />
                          <span className="wd-plan-leg__hazard">
                            <span
                              className="wd-plan-leg__hazard-icon"
                              aria-hidden="true"
                            >
                              {HAZARD_META[hazardForLeg].icon}
                            </span>
                            {HAZARD_META[hazardForLeg].label}
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="wd-plan-leg__chev" aria-hidden="true">
                    <ChevronRight size={18} />
                  </span>
                </button>
              );
            })}
          </section>
        </>
      )}

      {/* Footer actions: show on map + close. Always available so the panel
          has a clear exit even before a plan is built. */}
      <div className="wd-plan-footer">
        {plan && plan.valid && (
          <Button
            variant="secondary"
            icon={<MapIcon size={18} />}
            onClick={showFullRun}
            fullWidth
          >
            Show full run on map
          </Button>
        )}
        {onClose && (
          <Button
            variant="ghost"
            icon={<ArrowRight size={18} />}
            onClick={onClose}
            fullWidth
          >
            Done planning
          </Button>
        )}
      </div>
    </div>
  );
}
