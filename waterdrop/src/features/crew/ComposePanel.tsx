import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Crosshair,
  Droplet,
  Fish,
  FlaskConical,
  Image as ImageIcon,
  MapPin,
  Minus,
  NotebookPen,
  Plus,
  X,
} from 'lucide-react';
import {
  Button,
  Chip,
  Field,
  IconButton,
  NumberField,
  SegmentedControl,
  TextInput,
  Textarea,
} from '@/components/ui';
import type {
  Contamination,
  ContaminationSeverity,
  Observation,
  Photo,
  SpeciesSighting,
  WaterTest,
} from '@/types';
import { useStore } from '@/store';
import { pointById, segmentById } from '@/lib/segments';
import { saveObservation } from './db';
import { crewName } from './passcode';
import './ComposePanel.css';

/** Default map center, mirrors RiverMap's initial center, used as GPS fallback. */
const MAP_CENTER: [number, number] = [29.74, -97.8];

/** UUID with a fallback for non-secure contexts (plain HTTP, older webviews)
    where crypto.randomUUID is unavailable, so the never-lose-data path cannot throw. */
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to the manual id */
  }
  return `obs-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

type GeoState = 'idle' | 'locating' | 'ok' | 'denied';

const SEVERITY_OPTIONS = [
  { value: 'trace', label: 'Trace' },
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

/** Section wrapper: eyebrow label + icon, generous vertical rhythm. */
function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="wd-crew-compose__section">
      <h3 className="wd-crew-compose__eyebrow eyebrow">
        <span className="wd-crew-compose__eyebrow-icon" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h3>
      <div className="wd-crew-compose__section-body">{children}</div>
    </section>
  );
}

export function ComposePanel() {
  const compose = useStore((s) => s.compose);
  const updateCompose = useStore((s) => s.updateCompose);
  const cancelCompose = useStore((s) => s.cancelCompose);

  // Local mirrors of the draft. These are the source of truth for the form and
  // are pushed into the store on every change so an accidental nav cannot wipe
  // everything (the store keeps the latest snapshot).
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notes, setNotes] = useState('');
  const [species, setSpecies] = useState<SpeciesSighting[]>([]);
  const [waterTest, setWaterTest] = useState<WaterTest>({});
  const [flagContamination, setFlagContamination] = useState(false);
  const [contamination, setContamination] = useState<Contamination>({
    severity: 'minor',
    type: '',
    description: '',
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Object URLs we created, so we can revoke them precisely.
  const urlCacheRef = useRef<Map<string, string>>(new Map());

  const open = compose != null;

  // Seed local state from the draft when the panel opens.
  useEffect(() => {
    if (!compose) return;
    setCoords(compose.coords);
    setPhotos(compose.photos);
    setNotes(compose.notes);
    setSpecies(compose.species);
    setWaterTest(compose.waterTest);
    if (compose.contamination) {
      setFlagContamination(true);
      setContamination(compose.contamination);
    } else {
      setFlagContamination(false);
    }
    setSaved(false);
    setSaving(false);
    setSaveError(false);
    // Only re-seed on open (identity of `compose` object changes per session).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Modal contract: focus the panel on open, trap Tab inside it, Escape closes,
  // and focus returns to the trigger on close (the overlay covers the whole app).
  useEffect(() => {
    if (!open) return;
    const node = panelRef.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const focusables = (): HTMLElement[] =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)
        : [];
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelCompose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node?.addEventListener('keydown', onKey);
    return () => {
      node?.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const refLabel = useMemo(() => {
    if (!compose || compose.refType === 'gps' || !compose.refId) return null;
    const found =
      compose.refType === 'point'
        ? pointById(compose.refId)
        : segmentById(compose.refId);
    if (!found) return null;
    return 'name' in found
      ? found.name
      : `${pointById(found.fromPointId)?.name ?? '?'} to ${
          pointById(found.toPointId)?.name ?? '?'
        }`;
  }, [compose]);

  // ── Geolocation: request once on open unless attached to a ref. ──────────
  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoState('denied');
      return;
    }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCoords(c);
        setGeoState('ok');
        updateCompose({ coords: c });
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, [updateCompose]);

  useEffect(() => {
    if (!open) return;
    if (compose && compose.coords) {
      setGeoState('ok');
      return;
    }
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Object URL lifecycle: build for current photos, revoke stale ones. ───
  const photoUrl = useCallback((p: Photo): string => {
    const cache = urlCacheRef.current;
    let url = cache.get(p.id);
    if (!url) {
      url = URL.createObjectURL(p.blob);
      cache.set(p.id, url);
    }
    return url;
  }, []);

  useEffect(() => {
    const cache = urlCacheRef.current;
    const live = new Set(photos.map((p) => p.id));
    for (const [id, url] of cache) {
      if (!live.has(id)) {
        URL.revokeObjectURL(url);
        cache.delete(id);
      }
    }
  }, [photos]);

  // Revoke everything on unmount to avoid blob URL leaks.
  useEffect(() => {
    return () => {
      const cache = urlCacheRef.current;
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    };
  }, []);

  if (!open || !compose) return null;

  // ── Mutators (mirror into store for resilience) ──────────────────────────
  const updatePhotos = (next: Photo[]) => {
    setPhotos(next);
    updateCompose({ photos: next });
  };
  const updateNotes = (v: string) => {
    setNotes(v);
    updateCompose({ notes: v });
  };
  const updateSpecies = (next: SpeciesSighting[]) => {
    setSpecies(next);
    updateCompose({ species: next });
  };
  const updateWater = (patch: Partial<WaterTest>) => {
    const next = { ...waterTest, ...patch };
    setWaterTest(next);
    updateCompose({ waterTest: next });
  };
  const updateContam = (patch: Partial<Contamination>) => {
    const next = { ...contamination, ...patch };
    setContamination(next);
    if (flagContamination) updateCompose({ contamination: next });
  };

  const onFilesPicked = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: Photo[] = Array.from(files).map((f) => ({
      id: newId(),
      blob: f,
      caption: '',
    }));
    updatePhotos([...photos, ...added]);
  };

  const toggleContamination = () => {
    const next = !flagContamination;
    setFlagContamination(next);
    updateCompose({ contamination: next ? contamination : null });
  };

  const useMapCenter = () => {
    setCoords(MAP_CENTER);
    setGeoState('ok');
    updateCompose({ coords: MAP_CENTER });
  };

  const switchToGps = () => {
    updateCompose({ refType: 'gps', refId: undefined });
  };

  // ── Save: build a complete Observation and persist locally (offline-safe). ─
  const handleSave = async () => {
    if (saving) return;
    setSaveError(false);
    setSaving(true);
    const finalCoords: [number, number] = coords ?? MAP_CENTER;
    const cleanSpecies = species.filter((s) => s.name.trim().length > 0);
    const hasWater = Object.values(waterTest).some((v) => v != null);

    const finalContamination = flagContamination
      ? {
          severity: contamination.severity,
          type: contamination.type.trim() || 'other',
          description: contamination.description.trim(),
        }
      : undefined;

    const obs: Observation = {
      id: newId(),
      ts: Date.now(),
      author: crewName(),
      refType: compose.refType,
      refId: compose.refType === 'gps' ? undefined : compose.refId,
      coords: finalCoords,
      photos,
      notes: notes.trim(),
      species: cleanSpecies,
      waterTest: hasWater ? waterTest : undefined,
      contamination: finalContamination,
    };

    try {
      await saveObservation(obs);
      setSaved(true);
      // Brief confirmation, then tear down the draft.
      window.setTimeout(() => {
        cancelCompose();
      }, 900);
    } catch (err) {
      // The draft stays intact (local state + store mirror) so nothing is lost.
      console.error('Save failed', err);
      setSaveError(true);
      setSaving(false);
    }
  };

  const coordText =
    coords != null
      ? `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`
      : null;

  return (
    <div
      className="wd-crew-compose"
      role="dialog"
      aria-modal="true"
      aria-label="Log observation"
      ref={panelRef}
    >
      <header className="wd-crew-compose__bar">
        <span className="wd-crew-compose__bar-title">
          <NotebookPen size={18} aria-hidden="true" />
          Log observation
        </span>
        <IconButton label="Cancel" onClick={cancelCompose}>
          <X size={20} />
        </IconButton>
      </header>

      <div className="wd-crew-compose__scroll" ref={scrollRef}>
        {/* ── Where ───────────────────────────────────────────────────── */}
        <Section icon={<MapPin size={13} />} title="Where">
          {refLabel != null && compose.refType !== 'gps' ? (
            <div className="wd-crew-compose__ref">
              <div className="wd-crew-compose__ref-main">
                <MapPin size={16} aria-hidden="true" />
                <span>
                  Attached to <strong>{refLabel}</strong>
                </span>
              </div>
              <button
                type="button"
                className="wd-crew-compose__linkbtn"
                onClick={switchToGps}
              >
                Use a GPS pin instead
              </button>
            </div>
          ) : (
            <div className="wd-crew-compose__geo">
              <div className="wd-crew-compose__geo-row">
                <span className="wd-crew-compose__geo-icon" aria-hidden="true">
                  <Crosshair size={16} />
                </span>
                <span className="wd-crew-compose__geo-text">
                  {geoState === 'locating' && 'Locating...'}
                  {geoState === 'ok' && coordText != null && (
                    <span className="tabular">{coordText}</span>
                  )}
                  {geoState === 'ok' && coordText == null && 'Location set'}
                  {geoState === 'denied' &&
                    'Location is off. Use the map center or enable GPS.'}
                  {geoState === 'idle' && 'No location yet'}
                </span>
              </div>
              <div className="wd-crew-compose__geo-actions">
                {geoState !== 'locating' && (
                  <Button
                    variant="secondary"
                    size="md"
                    icon={<Crosshair size={16} />}
                    onClick={requestLocation}
                  >
                    {geoState === 'ok' ? 'Re-locate' : 'Locate me'}
                  </Button>
                )}
                {(geoState === 'denied' || geoState === 'idle') && (
                  <Button
                    variant="ghost"
                    size="md"
                    icon={<MapPin size={16} />}
                    onClick={useMapCenter}
                  >
                    Use map center
                  </Button>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* ── Photos ──────────────────────────────────────────────────── */}
        <Section icon={<Camera size={13} />} title="Photos">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            onChange={(e) => {
              onFilesPicked(e.target.files);
              e.target.value = '';
            }}
          />
          <div className="wd-crew-compose__photos">
            <button
              type="button"
              className="wd-crew-compose__capture"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={24} aria-hidden="true" />
              <span>Add photo</span>
            </button>
            {photos.map((p) => (
              <div key={p.id} className="wd-crew-compose__thumb">
                <img
                  src={photoUrl(p)}
                  alt={p.caption || 'Observation photo'}
                  className="wd-crew-compose__thumb-img"
                />
                <button
                  type="button"
                  className="wd-crew-compose__thumb-remove"
                  aria-label="Remove photo"
                  onClick={() =>
                    updatePhotos(photos.filter((x) => x.id !== p.id))
                  }
                >
                  <X size={14} aria-hidden="true" />
                </button>
                <input
                  className="wd-crew-compose__thumb-caption"
                  type="text"
                  placeholder="Caption"
                  value={p.caption ?? ''}
                  aria-label="Photo caption"
                  onChange={(e) =>
                    updatePhotos(
                      photos.map((x) =>
                        x.id === p.id ? { ...x, caption: e.target.value } : x
                      )
                    )
                  }
                />
              </div>
            ))}
          </div>
          {photos.length === 0 && (
            <p className="wd-crew-compose__hint">
              <ImageIcon size={14} aria-hidden="true" /> Camera opens on tap; pick
              one or several.
            </p>
          )}
        </Section>

        {/* ── Notes ───────────────────────────────────────────────────── */}
        <Section icon={<NotebookPen size={13} />} title="Notes">
          <Field label="Field notes" htmlFor="wd-crew-notes">
            <Textarea
              id="wd-crew-notes"
              rows={3}
              placeholder="What you saw, conditions, anything worth recording..."
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
            />
          </Field>
        </Section>

        {/* ── Species ─────────────────────────────────────────────────── */}
        <Section icon={<Fish size={13} />} title="Species seen">
          {species.length === 0 ? (
            <p className="wd-crew-compose__hint">No species rows yet.</p>
          ) : (
            <div className="wd-crew-compose__species">
              {species.map((sp, i) => (
                <div key={i} className="wd-crew-compose__species-row">
                  <div className="wd-crew-compose__species-grid">
                    <Field label="Species" htmlFor={`wd-crew-sp-${i}`}>
                      <TextInput
                        id={`wd-crew-sp-${i}`}
                        placeholder="e.g. Guadalupe bass"
                        value={sp.name}
                        onChange={(e) =>
                          updateSpecies(
                            species.map((x, j) =>
                              j === i ? { ...x, name: e.target.value } : x
                            )
                          )
                        }
                      />
                    </Field>
                    <Field label="Count" htmlFor={`wd-crew-spc-${i}`}>
                      <NumberField
                        id={`wd-crew-spc-${i}`}
                        value={sp.count}
                        min={1}
                        onChange={(n) =>
                          updateSpecies(
                            species.map((x, j) =>
                              j === i ? { ...x, count: n } : x
                            )
                          )
                        }
                        placeholder="1"
                      />
                    </Field>
                  </div>
                  <div className="wd-crew-compose__species-foot">
                    <Field label="Notes" htmlFor={`wd-crew-spn-${i}`}>
                      <TextInput
                        id={`wd-crew-spn-${i}`}
                        placeholder="Optional"
                        value={sp.notes ?? ''}
                        onChange={(e) =>
                          updateSpecies(
                            species.map((x, j) =>
                              j === i ? { ...x, notes: e.target.value } : x
                            )
                          )
                        }
                      />
                    </Field>
                    <IconButton
                      label="Remove species row"
                      variant="ghost"
                      onClick={() =>
                        updateSpecies(species.filter((_, j) => j !== i))
                      }
                    >
                      <Minus size={18} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="secondary"
            size="md"
            icon={<Plus size={16} />}
            onClick={() =>
              updateSpecies([...species, { name: '', count: 1, notes: '' }])
            }
          >
            Add species
          </Button>
        </Section>

        {/* ── Water test ──────────────────────────────────────────────── */}
        <Section icon={<FlaskConical size={13} />} title="Water test">
          <div className="wd-crew-compose__water">
            <Field label="Temp" htmlFor="wd-crew-temp">
              <NumberField
                id="wd-crew-temp"
                value={waterTest.tempC}
                step={0.1}
                unit="°C"
                placeholder=""
                onChange={(n) => updateWater({ tempC: n })}
              />
            </Field>
            <Field label="pH" htmlFor="wd-crew-ph">
              <NumberField
                id="wd-crew-ph"
                value={waterTest.pH}
                step={0.1}
                min={0}
                max={14}
                placeholder=""
                onChange={(n) => updateWater({ pH: n })}
              />
            </Field>
            <Field label="Turbidity" htmlFor="wd-crew-turb">
              <NumberField
                id="wd-crew-turb"
                value={waterTest.turbidityNTU}
                step={0.1}
                min={0}
                unit="NTU"
                placeholder=""
                onChange={(n) => updateWater({ turbidityNTU: n })}
              />
            </Field>
            <Field label="Dissolved O2" htmlFor="wd-crew-do">
              <NumberField
                id="wd-crew-do"
                value={waterTest.dissolvedO2}
                step={0.1}
                min={0}
                unit="mg/L"
                placeholder=""
                onChange={(n) => updateWater({ dissolvedO2: n })}
              />
            </Field>
            <Field label="Conductivity" htmlFor="wd-crew-cond">
              <NumberField
                id="wd-crew-cond"
                value={waterTest.conductivity}
                step={1}
                min={0}
                unit="µS/cm"
                placeholder=""
                onChange={(n) => updateWater({ conductivity: n })}
              />
            </Field>
          </div>
          <p className="wd-crew-compose__hint">
            <Droplet size={14} aria-hidden="true" /> All fields optional. Leave
            blank what you did not measure.
          </p>
        </Section>

        {/* ── Contamination ───────────────────────────────────────────── */}
        <Section icon={<AlertTriangle size={13} />} title="Contamination">
          <Chip
            selected={flagContamination}
            icon={<AlertTriangle size={16} />}
            onClick={toggleContamination}
          >
            Flag contamination
          </Chip>

          {flagContamination && (
            <div className="wd-crew-compose__contam">
              <Field label="Severity">
                <div
                  className={`wd-crew-compose__sev wd-crew-compose__sev--${contamination.severity}`}
                >
                  <SegmentedControl
                    label="Contamination severity"
                    options={SEVERITY_OPTIONS}
                    value={contamination.severity}
                    onChange={(v) =>
                      updateContam({ severity: v as ContaminationSeverity })
                    }
                  />
                </div>
              </Field>
              <Field label="Type" htmlFor="wd-crew-contam-type">
                <TextInput
                  id="wd-crew-contam-type"
                  placeholder="sewage, trash, algae, oil, sediment..."
                  value={contamination.type}
                  onChange={(e) => updateContam({ type: e.target.value })}
                />
              </Field>
              <Field label="Description" htmlFor="wd-crew-contam-desc">
                <Textarea
                  id="wd-crew-contam-desc"
                  rows={2}
                  placeholder="What you observed and how widespread."
                  value={contamination.description}
                  onChange={(e) =>
                    updateContam({ description: e.target.value })
                  }
                />
              </Field>
            </div>
          )}
        </Section>
      </div>

      {/* ── Sticky footer ─────────────────────────────────────────────── */}
      <footer className="wd-crew-compose__footer">
        {saved ? (
          <div className="wd-crew-compose__saved" role="status">
            <Check size={18} aria-hidden="true" />
            Saved
          </div>
        ) : (
          <>
            {saveError && (
              <p className="wd-crew-compose__saveerr" role="alert">
                Could not save. Your entry is kept, tap Save to retry.
              </p>
            )}
            <div className="wd-crew-compose__footer-row">
            <Button
              variant="ghost"
              size="lg"
              onClick={cancelCompose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={saving}
              icon={<Check size={20} />}
              onClick={handleSave}
            >
              Save observation
            </Button>
            </div>
          </>
        )}
      </footer>
    </div>
  );
}
