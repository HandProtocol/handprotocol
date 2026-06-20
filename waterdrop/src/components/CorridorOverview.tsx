import { Lock, ChevronRight, Droplets, Route, Star } from 'lucide-react';
import type { AccessPoint } from '@/types';
import {
  segments,
  regions,
  regionById,
  pointsInRegion,
  waterwaysInRegion,
} from '@/data';
import { useStore } from '@/store';
import { StatusPill, Divider, Button, Chip } from '@/components/ui';
import { useCorridorVerdict } from '@/features/conditions';
import { WeatherCard } from '@/features/weather';
import { VERDICT_META } from '@/lib/verdict';
import './CorridorOverview.css';

const ACCESS_TYPE_LABEL: Record<string, string> = {
  park: 'Park',
  ramp: 'Boat ramp',
  'dam-portage': 'Dam portage',
  campground: 'Campground',
  crossing: 'Crossing',
  outfitter: 'Outfitter',
};

interface Group {
  label: string;
  points: AccessPoint[];
}

/** The sheet's resting content: pick a region, see how it reads right now, and
    browse every drop-in spot grouped by waterway. */
export function CorridorOverview() {
  const select = useStore((s) => s.select);
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const openTrip = useStore((s) => s.openTrip);
  const activeRegion = useStore((s) => s.activeRegion);
  const setActiveRegion = useStore((s) => s.setActiveRegion);
  const { verdict, reading, loading } = useCorridorVerdict();
  const meta = VERDICT_META[verdict];

  const region = regionById(activeRegion) ?? regions[0];
  const points = pointsInRegion(region.id);
  const waterways = waterwaysInRegion(region.id);
  const hasSegments = segments.some((s) => s.region === region.id);
  const featuredCount = points.filter((p) => p.featured).length;

  const groups: Group[] =
    waterways.length > 0
      ? waterways.map((w) => ({
          label: w,
          points: points
            .filter((p) => p.waterway === w)
            .sort((a, b) => a.riverMile - b.riverMile),
        }))
      : [{ label: 'Put-ins & take-outs', points }];
  const ungrouped =
    waterways.length > 0 ? points.filter((p) => !p.waterway) : [];
  if (ungrouped.length) groups.push({ label: 'Other access', points: ungrouped });

  const openPoint = (p: AccessPoint) => {
    select({ kind: 'point', id: p.id });
    requestFlyTo(p.coords, 14);
  };

  return (
    <div className="wd-overview">
      <div className="wd-overview__regions" role="tablist" aria-label="Paddling regions">
        {regions.map((r) => (
          <Chip
            key={r.id}
            role="tab"
            aria-selected={r.id === region.id}
            selected={r.id === region.id}
            onClick={() => setActiveRegion(r.id)}
          >
            {r.shortName}
          </Chip>
        ))}
      </div>

      <div className="wd-overview__head">
        <p className="eyebrow">Central Texas paddling</p>
        <h2 className="display wd-overview__title">{region.name}</h2>
        <p className="wd-overview__sub">{region.blurb}</p>
        <p className="wd-overview__count">
          {points.length} drop-ins
          {waterways.length > 1 ? ` · ${waterways.length} waterways` : ''}
          {featuredCount ? ` · ${featuredCount} top spots` : ''}
        </p>
      </div>

      <div className="wd-overview__conditions">
        {loading && !reading ? (
          <StatusPill tone="neutral" icon={<Droplets size={15} />}>
            Checking conditions
          </StatusPill>
        ) : (
          <StatusPill tone={meta.tone} icon={<Droplets size={15} />}>
            {meta.label}
          </StatusPill>
        )}
        <span className="wd-overview__blurb">{meta.blurb}</span>
      </div>

      <WeatherCard coords={region.center} label={`Weather · ${region.shortName}`} />

      {hasSegments && (
        <div className="wd-overview__plan">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Route size={18} />}
            onClick={() => openTrip()}
          >
            Plan a trip
          </Button>
        </div>
      )}

      <Divider />

      {groups.map((g) => (
        <section key={g.label} className="wd-overview__group">
          <p className="eyebrow wd-overview__listlabel">{g.label}</p>
          <ul className="wd-overview__list">
            {g.points.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="wd-overview__row"
                  onClick={() => openPoint(p)}
                >
                  <span className="wd-overview__mile tabular">
                    {p.riverMile > 0 ? p.riverMile.toFixed(1) : ''}
                  </span>
                  <span className="wd-overview__rowtext">
                    <span className="wd-overview__name">
                      {p.featured && (
                        <Star
                          size={13}
                          className="wd-overview__star"
                          aria-label="top spot"
                        />
                      )}
                      {p.name}
                      {!p.public && (
                        <Lock
                          size={12}
                          className="wd-overview__lock"
                          aria-label="private access"
                        />
                      )}
                    </span>
                    <span className="wd-overview__type">
                      {ACCESS_TYPE_LABEL[p.type] ?? p.type}
                    </span>
                  </span>
                  <ChevronRight
                    size={18}
                    className="wd-overview__chev"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
