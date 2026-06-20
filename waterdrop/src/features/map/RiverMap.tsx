import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Locate, Maximize, Plus, Minus } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useStore } from '@/store';
import type { Verdict } from '@/types';
import { accessPoints, segments, gauges, regionById } from '@/data';
import { gaugeForSegment } from '@/lib/segments';
import {
  accessIcon,
  gaugeIcon,
  observationIcon,
  locationIcon,
  VERDICT_HEX,
  RIVER_CASING_HEX,
} from './markers';
import './map.css';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Bounds framing the whole corridor (all segment geometry + access points). */
function corridorBounds(): L.LatLngBounds {
  const pts: [number, number][] = [];
  for (const s of segments) for (const c of s.geometry) pts.push(c);
  for (const p of accessPoints) pts.push(p.coords);
  for (const g of gauges) pts.push(g.coords);
  return L.latLngBounds(pts.map(([lat, lng]) => L.latLng(lat, lng)));
}

const FIT_PADDING: L.FitBoundsOptions = { padding: [40, 40] };

// ── Frames the active region once on mount (region switches fly via the store) ─
function FitOnMount() {
  const map = useMap();
  const activeRegion = useStore.getState().activeRegion;
  useEffect(() => {
    const r = regionById(activeRegion);
    if (r) {
      map.setView(r.center, r.zoom);
    } else {
      map.fitBounds(corridorBounds(), FIT_PADDING);
    }
    // Allow zooming out far enough to see all of Central Texas, but not lose it.
    map.setMinZoom(7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ── Subscribes to store.flyTo and animates the map ───────────────────────────
function FlyToBridge() {
  const map = useMap();
  const flyTo = useStore((s) => s.flyTo);
  const lastNonce = useRef<number>(-1);

  useEffect(() => {
    if (!flyTo || flyTo.nonce === lastNonce.current) return;
    lastNonce.current = flyTo.nonce;
    map.flyTo(flyTo.center, flyTo.zoom ?? map.getZoom(), {
      animate: !prefersReducedMotion(),
    });
  }, [flyTo, map]);

  return null;
}

// ── Empty-water tap clears selection (forgiving) ─────────────────────────────
function MapClickClear() {
  const clearSelection = useStore((s) => s.clearSelection);
  useMapEvents({
    click() {
      clearSelection();
    },
  });
  return null;
}

// ── River segments: casing + verdict-tinted top line ─────────────────────────
function RiverLines() {
  const select = useStore((s) => s.select);
  const setDetent = useStore((s) => s.setDetent);
  const selection = useStore((s) => s.selection);
  const gaugeReadings = useStore((s) => s.gaugeReadings);

  const selectedSegId = selection.kind === 'segment' ? selection.id : null;

  return (
    <>
      {segments.map((seg) => {
        const gauge = gaugeForSegment(seg.id);
        const verdict: Verdict =
          (gauge && gaugeReadings[gauge.usgsId]?.verdict) || 'unknown';
        const color = VERDICT_HEX[verdict];
        const isSelected = seg.id === selectedSegId;

        const onSelect = () => {
          select({ kind: 'segment', id: seg.id });
          setDetent('half');
        };

        return (
          <Fragment key={seg.id}>
            {/* Casing for legibility over busy tiles. */}
            <Polyline
              positions={seg.geometry}
              interactive={false}
              pathOptions={{
                color: RIVER_CASING_HEX,
                weight: isSelected ? 11 : 9,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Selected glow halo. */}
            {isSelected && (
              <Polyline
                positions={seg.geometry}
                interactive={false}
                pathOptions={{
                  color,
                  weight: 13,
                  opacity: 0.22,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}
            {/* The river line itself. */}
            <Polyline
              positions={seg.geometry}
              pathOptions={{
                color,
                weight: isSelected ? 7 : 5,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
              eventHandlers={{ click: onSelect }}
            />
          </Fragment>
        );
      })}
    </>
  );
}

// ── Access point markers ─────────────────────────────────────────────────────
function AccessMarkers() {
  const select = useStore((s) => s.select);
  const setDetent = useStore((s) => s.setDetent);
  const selection = useStore((s) => s.selection);
  const selectedId = selection.kind === 'point' ? selection.id : null;

  return (
    <>
      {accessPoints.map((p) => {
        const selected = p.id === selectedId;
        return (
          <Marker
            key={p.id}
            position={p.coords}
            icon={accessIcon({
              type: p.type,
              selected,
              isPublic: p.public,
            })}
            zIndexOffset={selected ? 1000 : 0}
            keyboard
            title={p.name}
            alt={p.name}
            eventHandlers={{
              click() {
                select({ kind: 'point', id: p.id });
                setDetent('half');
              },
            }}
          />
        );
      })}
    </>
  );
}

// ── Gauge markers ────────────────────────────────────────────────────────────
function GaugeMarkers() {
  const select = useStore((s) => s.select);
  const setDetent = useStore((s) => s.setDetent);
  const selection = useStore((s) => s.selection);
  const gaugeReadings = useStore((s) => s.gaugeReadings);
  const selectedId = selection.kind === 'gauge' ? selection.usgsId : null;

  return (
    <>
      {gauges.map((g) => {
        const verdict: Verdict = gaugeReadings[g.usgsId]?.verdict ?? 'unknown';
        const selected = g.usgsId === selectedId;
        return (
          <Marker
            key={g.usgsId}
            position={g.coords}
            icon={gaugeIcon(verdict, selected)}
            zIndexOffset={selected ? 1000 : 0}
            keyboard
            title={g.name}
            alt={`Gauge: ${g.name}`}
            eventHandlers={{
              click() {
                select({ kind: 'gauge', usgsId: g.usgsId });
                setDetent('half');
              },
            }}
          />
        );
      })}
    </>
  );
}

// ── Observation markers (crew; array may be empty) ───────────────────────────
function ObservationMarkers() {
  const select = useStore((s) => s.select);
  const setDetent = useStore((s) => s.setDetent);
  const selection = useStore((s) => s.selection);
  const observations = useStore((s) => s.observations);
  const selectedId = selection.kind === 'observation' ? selection.id : null;

  return (
    <>
      {observations.map((o) => {
        const selected = o.id === selectedId;
        return (
          <Marker
            key={o.id}
            position={o.coords}
            icon={observationIcon(o, selected)}
            zIndexOffset={selected ? 1000 : 0}
            keyboard
            title="Crew observation"
            alt="Crew observation"
            eventHandlers={{
              click() {
                select({ kind: 'observation', id: o.id });
                setDetent('half');
              },
            }}
          />
        );
      })}
    </>
  );
}

// ── Transient "you are here" marker ──────────────────────────────────────────
function YouAreHere({ pos }: { pos: [number, number] | null }) {
  const icon = useMemo(() => locationIcon(), []);
  if (!pos) return null;
  return <Marker position={pos} icon={icon} interactive={false} zIndexOffset={500} />;
}

// ── Custom controls: zoom, fit corridor, locate ──────────────────────────────
type LocateState = 'idle' | 'loading' | 'denied' | 'error';

function MapControls({
  onLocate,
  locateState,
}: {
  onLocate: () => void;
  locateState: LocateState;
}) {
  const map = useMap();
  const ref = useRef<HTMLDivElement | null>(null);

  // Keep map drag/scroll from firing when interacting with the controls.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  const fit = useCallback(() => {
    map.fitBounds(corridorBounds(), {
      ...FIT_PADDING,
      animate: !prefersReducedMotion(),
    });
  }, [map]);

  const msg =
    locateState === 'denied'
      ? 'Location access is off. Enable it in your browser to center on your position.'
      : locateState === 'error'
        ? "Couldn't find your location. Try again with a clear sky view."
        : null;

  return (
    <div className="wd-map-controls" ref={ref}>
      {msg && (
        <div className="wd-map-locate-msg wd-map-locate-msg--err" role="status">
          {msg}
        </div>
      )}

      <IconButton
        label="Locate me"
        variant="secondary"
        className="wd-map-ctrl-solo"
        onClick={onLocate}
        disabled={locateState === 'loading'}
        aria-busy={locateState === 'loading' || undefined}
      >
        <Locate size={20} />
      </IconButton>

      <IconButton
        label="Fit corridor"
        variant="secondary"
        className="wd-map-ctrl-solo"
        onClick={fit}
      >
        <Maximize size={20} />
      </IconButton>

      <div className="wd-map-controls__group" role="group" aria-label="Zoom">
        <IconButton
          label="Zoom in"
          variant="secondary"
          onClick={() => map.zoomIn()}
        >
          <Plus size={20} />
        </IconButton>
        <IconButton
          label="Zoom out"
          variant="secondary"
          onClick={() => map.zoomOut()}
        >
          <Minus size={20} />
        </IconButton>
      </div>
    </div>
  );
}

// ── Glue: geolocation lives at this level so the marker persists across renders */
function MapInner() {
  const requestFlyTo = useStore((s) => s.requestFlyTo);
  const [here, setHere] = useState<[number, number] | null>(null);
  const [locateState, setLocateState] = useState<LocateState>('idle');
  const clearTimer = useRef<number | null>(null);

  const onLocate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocateState('error');
      return;
    }
    setLocateState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setHere(c);
        setLocateState('idle');
        requestFlyTo(c, 14);
        if (clearTimer.current) window.clearTimeout(clearTimer.current);
        clearTimer.current = window.setTimeout(() => setHere(null), 30000);
      },
      (err) => {
        setLocateState(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [requestFlyTo]);

  useEffect(
    () => () => {
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    },
    [],
  );

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={18}
      />
      <FitOnMount />
      <FlyToBridge />
      <MapClickClear />
      <RiverLines />
      <AccessMarkers />
      <GaugeMarkers />
      <ObservationMarkers />
      <YouAreHere pos={here} />
      <MapControls onLocate={onLocate} locateState={locateState} />
    </>
  );
}

export default function RiverMap() {
  const initialCenter = useMemo<[number, number]>(() => [29.74, -97.8], []);

  return (
    <div className="wd-map-root">
      <MapContainer
        center={initialCenter}
        zoom={11}
        minZoom={8}
        maxZoom={18}
        zoomControl={false}
        attributionControl
        style={{ width: '100%', height: '100%' }}
      >
        <MapInner />
      </MapContainer>
    </div>
  );
}
