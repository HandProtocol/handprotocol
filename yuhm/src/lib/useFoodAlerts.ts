import { useEffect, useRef, useState } from 'react'
import { foodDb, foodDbConfigured, loadFoodAlerts, type FoodAlertRecord } from './foodRepository'

const activeOnly = (alerts: FoodAlertRecord[]) => alerts.filter((alert) => new Date(alert.expires_at).getTime() > Date.now())

/**
 * Live FOOD IS HERE alerts: initial load, realtime inserts, and a
 * one-minute expiry sweep. `surface` keeps realtime channel names unique
 * when several views subscribe at once.
 */
export function useFoodAlerts(surface: string, onInsert?: (alert: FoodAlertRecord) => void) {
  const [alerts, setAlerts] = useState<FoodAlertRecord[]>([])
  const onInsertRef = useRef(onInsert)
  useEffect(() => { onInsertRef.current = onInsert }, [onInsert])

  useEffect(() => {
    const sweep = () => setAlerts((current) => activeOnly(current))
    const interval = window.setInterval(sweep, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!foodDbConfigured) return
    void loadFoodAlerts().then(({ data }) => setAlerts(activeOnly(data ?? [])))
    if (!foodDb) return
    const db = foodDb
    const channel = db.channel(`yuhm-network-alerts-${surface}`).on('postgres_changes', { event: 'INSERT', schema: 'command', table: 'food_alerts' }, (payload) => {
      const alert = payload.new as FoodAlertRecord
      setAlerts((current) => activeOnly([alert, ...current.filter((item) => item.id !== alert.id)]))
      onInsertRef.current?.(alert)
    }).subscribe()
    return () => { void db.removeChannel(channel) }
  }, [surface])

  return { alerts, setAlerts }
}
