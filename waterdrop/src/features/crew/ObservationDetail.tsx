import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Fish,
  MapPin,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Divider,
  StatReadout,
  StatusPill,
} from '@/components/ui';
import type { ContaminationSeverity, Observation } from '@/types';
import type { StatusPillProps } from '@/components/ui';
import { useStore } from '@/store';
import { pointById, segmentById } from '@/lib/segments';
import { fmtAgo } from '@/lib/format';
import { deleteObservation } from './db';
import './ObservationDetail.css';

export interface ObservationDetailProps {
  id: string;
}

const SEVERITY_TONE: Record<ContaminationSeverity, StatusPillProps['tone']> = {
  trace: 'info',
  minor: 'low',
  moderate: 'high',
  severe: 'danger',
};

const SEVERITY_LABEL: Record<ContaminationSeverity, string> = {
  trace: 'Trace',
  minor: 'Minor',
  moderate: 'Moderate',
  severe: 'Severe',
};

function refDescription(o: Observation): string {
  if (o.refType === 'point' && o.refId) {
    const p = pointById(o.refId);
    if (p) return `at ${p.name}`;
  }
  if (o.refType === 'segment' && o.refId) {
    const s = segmentById(o.refId);
    if (s) {
      const from = pointById(s.fromPointId)?.name ?? '?';
      const to = pointById(s.toPointId)?.name ?? '?';
      return `on ${from} to ${to}`;
    }
  }
  return 'GPS pin';
}

export function ObservationDetail({ id }: ObservationDetailProps) {
  const obs = useStore((s) => s.observations.find((o) => o.id === id));
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const clearSelection = useStore((s) => s.clearSelection);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Object URLs for the photo gallery. Created in an effect (never in render) and
  // revoked in cleanup, keyed on the photo ids so a store refresh after a save or
  // delete cannot revoke URLs the committed <img> tags still point at.
  const photoKey = obs ? obs.photos.map((p) => p.id).join(',') : '';
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    if (!obs) {
      setUrls([]);
      return;
    }
    const created = obs.photos.map((p) => URL.createObjectURL(p.blob));
    setUrls(created);
    return () => created.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey]);

  if (!obs) {
    return (
      <div className="wd-crew-detail">
        <p className="wd-crew-detail__missing">This observation is no longer available.</p>
      </div>
    );
  }

  const wt = obs.waterTest;
  const hasWater =
    wt != null && Object.values(wt).some((v) => v != null);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteObservation(obs.id);
      clearSelection();
    } catch (err) {
      console.error('Delete failed', err);
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="wd-crew-detail">
      <header className="wd-crew-detail__head">
        <h2 className="wd-crew-detail__author">{obs.author}</h2>
        <div className="wd-crew-detail__meta">
          <span className="tabular">{fmtAgo(obs.ts)}</span>
          <span aria-hidden="true">·</span>
          <span className="wd-crew-detail__ref">
            <MapPin size={14} aria-hidden="true" />
            {refDescription(obs)}
          </span>
        </div>
      </header>

      {obs.contamination && (
        <div className="wd-crew-detail__contam">
          <StatusPill
            tone={SEVERITY_TONE[obs.contamination.severity]}
            icon={<AlertTriangle size={14} />}
          >
            {SEVERITY_LABEL[obs.contamination.severity]} contamination
          </StatusPill>
          <div className="wd-crew-detail__contam-body">
            {obs.contamination.type && (
              <p className="wd-crew-detail__contam-type">
                {obs.contamination.type}
              </p>
            )}
            {obs.contamination.description && (
              <p className="wd-crew-detail__contam-desc">
                {obs.contamination.description}
              </p>
            )}
          </div>
        </div>
      )}

      {urls.length > 0 && (
        <div className="wd-crew-detail__gallery">
          {urls.map((url, i) => (
            <figure key={obs.photos[i].id} className="wd-crew-detail__photo">
              <img src={url} alt={obs.photos[i].caption || 'Observation photo'} />
              {obs.photos[i].caption && (
                <figcaption>{obs.photos[i].caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {obs.notes && <p className="wd-crew-detail__notes">{obs.notes}</p>}

      {obs.species.length > 0 && (
        <>
          <Divider />
          <section className="wd-crew-detail__block">
            <h3 className="wd-crew-detail__eyebrow eyebrow">
              <Fish size={13} aria-hidden="true" /> Species seen
            </h3>
            <ul className="wd-crew-detail__species">
              {obs.species.map((sp, i) => (
                <li key={i} className="wd-crew-detail__species-item">
                  <span className="wd-crew-detail__species-name">{sp.name}</span>
                  {sp.count != null && (
                    <span className="wd-crew-detail__species-count tabular">
                      ×{sp.count}
                    </span>
                  )}
                  {sp.notes && (
                    <span className="wd-crew-detail__species-notes">
                      {sp.notes}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {hasWater && wt && (
        <>
          <Divider />
          <section className="wd-crew-detail__block">
            <h3 className="wd-crew-detail__eyebrow eyebrow">Water test</h3>
            <div className="wd-crew-detail__stats">
              {wt.tempC != null && (
                <StatReadout label="Temp" value={wt.tempC} unit="°C" />
              )}
              {wt.pH != null && <StatReadout label="pH" value={wt.pH} />}
              {wt.turbidityNTU != null && (
                <StatReadout label="Turbidity" value={wt.turbidityNTU} unit="NTU" />
              )}
              {wt.dissolvedO2 != null && (
                <StatReadout label="Diss. O2" value={wt.dissolvedO2} unit="mg/L" />
              )}
              {wt.conductivity != null && (
                <StatReadout
                  label="Conductivity"
                  value={wt.conductivity}
                  unit="µS/cm"
                />
              )}
            </div>
          </section>
        </>
      )}

      <Divider />

      <div className="wd-crew-detail__actions">
        <Button
          variant="secondary"
          icon={<MapPin size={16} />}
          onClick={() => requestFlyTo(obs.coords, 15)}
        >
          Show on map
        </Button>

        {confirming ? (
          <div className="wd-crew-detail__confirm">
            <span className="wd-crew-detail__confirm-q">Delete this observation?</span>
            <div className="wd-crew-detail__confirm-actions">
              <Button
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Keep
              </Button>
              <Button
                variant="danger"
                loading={deleting}
                icon={<Trash2 size={16} />}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="danger"
            icon={<Trash2 size={16} />}
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
