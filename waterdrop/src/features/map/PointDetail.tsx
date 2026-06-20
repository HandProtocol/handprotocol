import {
  TreePine,
  Anchor,
  TriangleAlert,
  Tent,
  Milestone,
  Store,
  Lock,
  Globe,
  ChevronRight,
  Crosshair,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import type { ReactNode } from 'react';
import { useStore } from '@/store';
import type { AccessType } from '@/types';
import { pointById, segmentsFromPoint } from '@/lib/segments';
import { fmtMiles, fmtHours } from '@/lib/format';
import './map.css';

const TYPE_LABEL: Record<AccessType, string> = {
  park: 'Park',
  ramp: 'Boat ramp',
  'dam-portage': 'Dam portage',
  campground: 'Campground',
  crossing: 'Road crossing',
  outfitter: 'Outfitter',
};

const TYPE_GLYPH: Record<AccessType, ReactNode> = {
  park: <TreePine size={14} />,
  ramp: <Anchor size={14} />,
  'dam-portage': <TriangleAlert size={14} />,
  campground: <Tent size={14} />,
  crossing: <Milestone size={14} />,
  outfitter: <Store size={14} />,
};

export function PointDetail({ id }: { id: string }) {
  const select = useStore((s) => s.select);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const point = pointById(id);

  if (!point) {
    return <p className="wd-map-detail__prose">This access point is no longer on the map.</p>;
  }

  const runs = segmentsFromPoint(id);

  return (
    <div className="wd-map-detail">
      <header className="wd-map-detail__head">
        <h2 className="wd-map-detail__title">{point.name}</h2>
        <div className="wd-map-detail__tags">
          <span className="wd-map-detail__type">
            <span className="wd-map-detail__type-glyph" aria-hidden="true">
              {TYPE_GLYPH[point.type]}
            </span>
            {TYPE_LABEL[point.type]}
          </span>
          <span
            className={`wd-map-detail__access${point.public ? ' wd-map-detail__access--public' : ''}`}
          >
            {point.public ? <Globe size={12} /> : <Lock size={12} />}
            {point.public ? 'Public access' : 'Private access'}
          </span>
        </div>
        <p className="wd-map-detail__mile">
          <span>
            River mile <strong>{point.riverMile.toFixed(1)}</strong>
          </span>
          {point.riverMile > 0 && <span>{fmtMiles(point.riverMile)} downstream</span>}
        </p>
      </header>

      {point.amenities.length > 0 && (
        <section className="wd-map-detail__section">
          <p className="wd-map-eyebrow">Amenities</p>
          <div className="wd-map-chips">
            {point.amenities.map((a) => (
              <Chip key={a}>{a}</Chip>
            ))}
          </div>
        </section>
      )}

      <p className="wd-map-detail__prose">{point.notes}</p>

      {runs.length > 0 && (
        <section className="wd-map-detail__section">
          <p className="wd-map-eyebrow">Plan a run</p>
          <div className="wd-map-runs">
            {runs.map((seg) => {
              const from = pointById(seg.fromPointId);
              const to = pointById(seg.toPointId);
              return (
                <button
                  key={seg.id}
                  type="button"
                  className="wd-map-run"
                  onClick={() => select({ kind: 'segment', id: seg.id })}
                >
                  <span className="wd-map-run__body">
                    <span className="wd-map-run__route">
                      {from?.name ?? seg.fromPointId} to {to?.name ?? seg.toPointId}
                    </span>
                    <span className="wd-map-run__meta">
                      <span>{fmtMiles(seg.distanceMiles)}</span>
                      <span className="wd-map-run__meta-dot" aria-hidden="true" />
                      <span>{fmtHours(seg.estHours)}</span>
                    </span>
                  </span>
                  <span className="wd-map-run__chev" aria-hidden="true">
                    <ChevronRight size={18} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <Button
        variant="secondary"
        icon={<Crosshair size={18} />}
        onClick={() => requestFlyTo(point.coords, 15)}
      >
        Center on map
      </Button>
    </div>
  );
}
