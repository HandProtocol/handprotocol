import { Suspense, lazy } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@/store';
import { Sheet, IconButton, Skeleton } from '@/components/ui';
import { PointDetail } from '@/features/map/PointDetail';
import { SegmentDetail } from '@/features/map/SegmentDetail';
import { useSegmentCondition } from '@/features/conditions';
import { ObservationDetail } from '@/features/crew';
import { TripPlanner } from '@/features/plan';
import { CorridorOverview } from './CorridorOverview';
import './DetailSheet.css';

// Chart-heavy (pulls recharts) — load only when a gauge is opened.
const GaugeDetail = lazy(() =>
  import('@/features/conditions/GaugeDetail').then((m) => ({ default: m.GaugeDetail })),
);

function DetailFallback() {
  return (
    <div style={{ padding: '0 var(--s5)', display: 'grid', gap: 'var(--s3)' }}>
      <Skeleton height={28} width="60%" />
      <Skeleton height={44} radius="var(--radius-pill)" width={160} />
      <Skeleton height={140} radius="var(--radius-lg)" />
    </div>
  );
}

const LABELS: Record<string, string> = {
  none: 'River corridor',
  point: 'Access point',
  segment: 'River segment',
  gauge: 'Gauge conditions',
  observation: 'Observation',
};

/** Persistent bottom sheet that routes the current selection to its detail
    surface. At rest it shows the corridor overview. */
export function DetailSheet() {
  const selection = useStore((s) => s.selection);
  const detent = useStore((s) => s.sheetDetent);
  const setDetent = useStore((s) => s.setDetent);
  const clearSelection = useStore((s) => s.clearSelection);
  const tripOpen = useStore((s) => s.tripOpen);
  const tripFromId = useStore((s) => s.tripFromId);
  const closeTrip = useStore((s) => s.closeTrip);

  // Hooks must run unconditionally; '' yields undefined for non-segment views.
  const segId = selection.kind === 'segment' ? selection.id : '';
  const condition = useSegmentCondition(segId);

  const label = tripOpen ? 'Plan a trip' : LABELS[selection.kind];

  return (
    <Sheet detent={detent} onDetentChange={setDetent} label={label}>
      {tripOpen ? (
        <TripPlanner initialFromId={tripFromId} onClose={closeTrip} />
      ) : (
        <>
          {selection.kind !== 'none' && (
            <div className="wd-sheet-back">
              <IconButton label="Back to corridor" variant="ghost" onClick={clearSelection}>
                <ArrowLeft size={20} />
              </IconButton>
              <span className="wd-sheet-back__label eyebrow">{LABELS[selection.kind]}</span>
            </div>
          )}

          {selection.kind === 'none' && <CorridorOverview />}
          {selection.kind === 'point' && <PointDetail id={selection.id} />}
          {selection.kind === 'segment' && (
            <SegmentDetail id={selection.id} condition={condition} />
          )}
          {selection.kind === 'gauge' && (
            <Suspense fallback={<DetailFallback />}>
              <GaugeDetail usgsId={selection.usgsId} />
            </Suspense>
          )}
          {selection.kind === 'observation' && <ObservationDetail id={selection.id} />}
        </>
      )}
    </Sheet>
  );
}
