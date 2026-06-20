import {
  Waves,
  TriangleAlert,
  Bus,
  GitBranch,
  Anchor,
  Logs,
  Droplet,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { StatReadout } from '@/components/ui/StatReadout';
import { Divider } from './Divider';
import type { ReactNode } from 'react';
import { useStore } from '@/store';
import type { GaugeReading, Hazard } from '@/types';
import { segmentById, pointById, gaugeForSegment, segmentMidpoint } from '@/lib/segments';
import { VERDICT_META } from '@/lib/verdict';
import { fmtMiles, fmtHours, fmtCfs } from '@/lib/format';
import './map.css';

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

export function SegmentDetail({ id, condition }: { id: string; condition?: GaugeReading }) {
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const seg = segmentById(id);

  if (!seg) {
    return <p className="wd-map-detail__prose">This run is no longer on the map.</p>;
  }

  const from = pointById(seg.fromPointId);
  const to = pointById(seg.toPointId);
  const gauge = gaugeForSegment(seg.id);
  const meta = condition ? VERDICT_META[condition.verdict] : null;

  return (
    <div className="wd-map-detail">
      <header className="wd-map-detail__head">
        <h2 className="wd-map-detail__route">
          <span>{from?.name ?? seg.fromPointId}</span>
          <span className="wd-map-detail__route-arrow" aria-hidden="true">
            <ArrowRight size={18} />
          </span>
          <span>{to?.name ?? seg.toPointId}</span>
        </h2>
        <div className="wd-map-difficulty">
          <span>{seg.difficulty}</span>
        </div>
      </header>

      <div className="wd-map-detail__stats">
        <StatReadout label="Distance" value={fmtMiles(seg.distanceMiles)} />
        <StatReadout label="Est. time" value={fmtHours(seg.estHours)} />
      </div>

      {seg.hazards.length > 0 && (
        <section className="wd-map-detail__section">
          <p className="wd-map-eyebrow">Hazards on this reach</p>
          <div className="wd-map-pills">
            {seg.hazards.map((h) => (
              <StatusPill key={h} tone="hazard" icon={HAZARD_META[h].icon}>
                {HAZARD_META[h].label}
              </StatusPill>
            ))}
          </div>
        </section>
      )}

      <p className="wd-map-detail__prose">{seg.description}</p>

      <Divider />

      <section className="wd-map-detail__section">
        <p className="wd-map-eyebrow">Conditions</p>
        {condition && meta ? (
          <div className="wd-map-conditions">
            <div className="wd-map-conditions__top">
              <StatusPill tone={meta.tone} icon={<Droplet size={14} />}>
                {meta.label}
              </StatusPill>
              <span className="wd-map-conditions__flow">{fmtCfs(condition.dischargeCfs)}</span>
            </div>
            {gauge && (
              <span className="wd-map-conditions__via">via {gauge.name}</span>
            )}
          </div>
        ) : (
          <p className="wd-map-conditions__muted">Live conditions load with the map.</p>
        )}
      </section>

      <Button
        variant="secondary"
        icon={<MapPin size={18} />}
        onClick={() => requestFlyTo(segmentMidpoint(seg), 14)}
      >
        Show on map
      </Button>
    </div>
  );
}
