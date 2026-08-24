import { useEffect, useState } from 'react'
import { Clock3, Zap } from 'lucide-react'
import type { FoodAlertRecord } from './lib/foodRepository'
import { useI18n } from './i18n'

export function alertTimeLeft(expiresAt: string, now = Date.now()) {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now)
  const totalMinutes = Math.max(1, Math.round(remaining / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

/**
 * Public FOOD IS HERE signal for food seekers: newest active alert with a
 * freshness countdown toward the six-hour expiry, tappable when the alert is
 * linked to a mappable spot.
 */
export function FoodAlertBanner({ alerts, onShow }: { alerts: FoodAlertRecord[]; onShow?: (alert: FoodAlertRecord) => void }) {
  const { t } = useI18n()
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => setTick((current) => current + 1), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  if (!alerts.length) return null
  const [alert] = alerts
  const interactive = Boolean(onShow && alert.spot_id)
  const body = <>
    <span className="food-alert-banner-flag" aria-hidden="true"><Zap size={15} /></span>
    <span className="food-alert-banner-copy">
      <b>{t('alerts.foodIsHere')}</b>
      <span>{alert.title} · {alert.neighborhood}</span>
      <small>{t('alerts.confirm')}</small>
    </span>
    <span className="food-alert-banner-meta">
      <span className="food-alert-banner-count"><Clock3 size={13} /> {t('alerts.timeLeft', { time: alertTimeLeft(alert.expires_at) })}</span>
      {alerts.length > 1 && <small>{t('alerts.also', { count: alerts.length - 1 })}</small>}
      {interactive && <small className="food-alert-banner-cta">{t('alerts.showOnMap')}</small>}
    </span>
  </>

  return interactive
    ? <button className="food-alert-banner" type="button" onClick={() => onShow?.(alert)} aria-live="polite">{body}</button>
    : <div className="food-alert-banner" role="status" aria-live="polite">{body}</div>
}
