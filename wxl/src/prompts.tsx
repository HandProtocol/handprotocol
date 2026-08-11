import { useState } from 'react'
import { ArrowUpRight, MapPin, ShieldCheck, X } from 'lucide-react'
import type { DialogMotionControls } from './useDialogMotion'
import { AppLink } from './router'
import { useI18n } from './i18n'

export function AuthPrompt({ motion }: { motion: DialogMotionControls }) {
  return <div className="access-backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd} role="dialog" aria-modal="true" aria-labelledby="auth-prompt-title" onClick={() => motion.requestClose()}><div className="access-card" onClick={(event) => event.stopPropagation()}><button className="access-close" onClick={() => motion.requestClose()} aria-label="Close sign-in prompt"><X size={17} /></button><span className="access-heart">♥</span><p className="eyebrow">Account needed</p><h2 id="auth-prompt-title">Join the network to take action.</h2><p>Anonymous browsing is open to everyone. Create an account or log in to post rescues, reply to requests, offer help, and nominate food sources.</p><div className="access-actions"><AppLink className="access-login" href="/app/?mode=login">Log in <ArrowUpRight size={15} /></AppLink><AppLink className="access-anonymous" href="/app/?mode=login&signup=1">Create an account <ArrowUpRight size={15} /></AppLink><AppLink className="access-updates" href="/app/?mode=login&updates=1">Email me WXL updates <ArrowUpRight size={15} /></AppLink></div><small>Updates do not create an account or unlock posting.</small></div></div>
}

export function LocationPrompt({ motion, onLocated, onSkip }: { motion: DialogMotionControls; onLocated: (latitude: number, longitude: number) => void; onSkip: () => void }) {
  const { t } = useI18n()
  const [state, setState] = useState<'idle' | 'locating' | 'error'>('idle')
  const [error, setError] = useState('')
  const requestLocation = () => {
    if (!navigator.geolocation) { setState('error'); setError(t('location.unavailable')); return }
    setState('locating')
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => motion.requestClose(() => onLocated(position.coords.latitude, position.coords.longitude)),
      (locationError) => {
        setState('error')
        setError(locationError.code === 1 ? t('location.denied') : t('location.failed'))
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }
  return <div className="access-backdrop location-backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd} role="dialog" aria-modal="true" aria-labelledby="location-prompt-title"><div className="access-card location-consent"><span className="location-consent-icon" aria-hidden="true"><MapPin size={23} /></span><p className="eyebrow">{t('location.eyebrow')}</p><h2 id="location-prompt-title">{t('location.title')}</h2><p>{t('location.copy')}</p><div className="location-privacy"><ShieldCheck size={16} /><span>{t('location.privacy')}</span></div>{error && <p className="location-error" role="alert">{error}</p>}<div className="location-actions"><button className="location-allow" type="button" onClick={requestLocation} disabled={state === 'locating'}>{state === 'locating' ? t('location.locating') : t('location.allow')} <ArrowUpRight size={15} /></button><button className="location-skip" type="button" onClick={() => motion.requestClose(onSkip)}>{t('location.skip')}</button></div></div></div>
}
