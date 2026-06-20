// ─────────────────────────────────────────────────────────────────────────────
// WeatherCard — compact, calm weather readout for a corridor coordinate. Sits
// beside the river-flow conditions and reads as a sibling, never louder than the
// flow verdict: condition first, the temperature as a tabular value with a small
// "feels" beside it, then a quiet row of wind / precip / humidity.
//
// Skeletons while loading; an honest "Weather unavailable right now" line when
// the forecast is stale or empty. Never blank, never a crash.
// ─────────────────────────────────────────────────────────────────────────────

import { CloudOff } from 'lucide-react';
import { StatReadout, Skeleton, Divider } from '@/components/ui';
import { fmtClock } from '@/lib/format';
import { useWeather } from './useWeather';
import { wmoLabel, wmoIcon } from './weather';
import './WeatherCard.css';

export interface WeatherCardProps {
  coords: [number, number];
  /** Eyebrow label; defaults to "Weather". */
  label?: string;
}

/** Round-and-show a Fahrenheit temperature, or an em-free dash placeholder. */
const fmtTemp = (f?: number): string => (f == null ? '--' : `${Math.round(f)}°`);

/** Gusts are only worth surfacing when notably stronger than sustained wind. */
const GUST_THRESHOLD_MPH = 8;

export function WeatherCard({ coords, label = 'Weather' }: WeatherCardProps) {
  const { weather, loading } = useWeather(coords);

  // ── Loading: skeletons, never a spinner mid-content ──
  if (loading && weather == null) {
    return (
      <section className="wd-wx-card" aria-busy="true" aria-label="Loading weather">
        <span className="wd-wx-card__eyebrow eyebrow">{label}</span>
        <div className="wd-wx-card__skeleton-head">
          <Skeleton width={148} height={28} radius="var(--radius-sm)" />
          <Skeleton width={64} height={28} radius="var(--radius-sm)" />
        </div>
        <Divider />
        <div className="wd-wx-card__skeleton-stats">
          <Skeleton width={72} height={40} radius="var(--radius-sm)" />
          <Skeleton width={72} height={40} radius="var(--radius-sm)" />
          <Skeleton width={72} height={40} radius="var(--radius-sm)" />
        </div>
      </section>
    );
  }

  // ── Unavailable / stale: quiet, honest, never blank ──
  const unavailable = weather == null || weather.stale || weather.code == null;
  if (unavailable) {
    return (
      <section className="wd-wx-card" aria-label={label}>
        <span className="wd-wx-card__eyebrow eyebrow">{label}</span>
        <p className="wd-wx-card__unavailable">
          <CloudOff className="wd-wx-card__unavailable-icon" aria-hidden="true" />
          Weather unavailable right now
        </p>
      </section>
    );
  }

  const { code, isDay, tempF, feelsF, windMph, gustMph, precipIn, humidity, observedAt } =
    weather;
  const safeCode = code ?? 0;
  const Icon = wmoIcon(safeCode, isDay);
  const conditionLabel = wmoLabel(safeCode);

  const showFeels = feelsF != null && tempF != null && Math.abs(feelsF - tempF) >= 2;
  const showGust =
    gustMph != null && windMph != null && gustMph - windMph >= GUST_THRESHOLD_MPH;

  return (
    <section className="wd-wx-card" aria-label={label}>
      <span className="wd-wx-card__eyebrow eyebrow">{label}</span>

      <div className="wd-wx-card__head">
        <div className="wd-wx-card__condition">
          <span className="wd-wx-card__icon" aria-hidden="true">
            <Icon />
          </span>
          <span className="wd-wx-card__label">{conditionLabel}</span>
        </div>
        <div className="wd-wx-card__temp">
          <span className="wd-wx-card__temp-value">{fmtTemp(tempF)}</span>
          {showFeels && (
            <span className="wd-wx-card__feels">feels {fmtTemp(feelsF)}</span>
          )}
        </div>
      </div>

      <Divider />

      <div className="wd-wx-card__stats">
        <StatReadout
          label="Wind"
          value={
            <>
              {windMph == null ? '--' : Math.round(windMph)}
              {showGust && (
                <span className="wd-wx-card__gust"> g{Math.round(gustMph!)}</span>
              )}
            </>
          }
          unit="mph"
        />
        <StatReadout
          label="Rain"
          value={precipIn == null ? '--' : precipIn.toFixed(2)}
          unit="in"
        />
        <StatReadout
          label="Humidity"
          value={humidity == null ? '--' : Math.round(humidity)}
          unit="%"
        />
      </div>

      {observedAt && (
        <span className="wd-wx-card__updated">As of {fmtClock(observedAt)}</span>
      )}
    </section>
  );
}
