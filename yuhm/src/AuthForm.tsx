import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { foodDb } from './lib/foodRepository'
import { continueWithEmail } from './lib/auth'
import { notifyYuhmAccountSignup } from './lib/feedback'
import { useI18n } from './i18n'

type EmailContinueFormProps = {
  /** `signup` asks the browser for a new password and labels the button "Create account"; the logic is the same either way. */
  hint?: 'continue' | 'signup'
  onSuccess: (status: 'signed_in' | 'created') => void
  /** Rendered inside the form after the submit button (forgot-password, updates links). */
  footer?: ReactNode
  className?: string
}

/** Reads a text field straight from the submitted form, so browser autofill counts even when no change event fired. */
export function readField(form: HTMLFormElement, name: string) {
  return String(new FormData(form).get(name) ?? '').trim()
}

/**
 * The one sign-in step used everywhere: email + password + Continue. It signs
 * a member in, or creates the account when none matches, so nobody has to pick
 * "log in" versus "sign up" before they can act.
 *
 * The fields are uncontrolled on purpose: password managers fill them without
 * firing React change events, so the button must never depend on React state
 * to become clickable.
 */
export function EmailContinueForm({ hint = 'continue', onSuccess, footer, className = '' }: EmailContinueFormProps) {
  const { t } = useI18n()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const email = readField(form, 'email')
    const password = String(new FormData(form).get('password') ?? '')
    setError('')
    if (!email || !password) { setError(t('login.missingFields')); return }
    if (!foodDb) { setError(t('login.notConfigured')); return }
    setBusy(true)
    const result = await continueWithEmail(foodDb.auth, email, password)
    setBusy(false)
    if (result.status === 'error') {
      setError(result.reason === 'existing_account' ? t('login.existingAccount') : result.message)
      return
    }
    if (result.status === 'created') void notifyYuhmAccountSignup(email)
    onSuccess(result.status)
  }

  return <form className={`auth-form ${className}`} onSubmit={submit}>
    <label>{t('login.emailLabel')}<input type="email" name="email" placeholder="you@example.org" autoComplete="username" inputMode="email" required /></label>
    <label className="login-field-spaced">{t('login.passwordLabel')}<input type="password" name="password" autoComplete={hint === 'signup' ? 'new-password' : 'current-password'} minLength={6} required /></label>
    {error && <p className="login-error" role="alert">{error}</p>}
    <button className="login-submit" type="submit" disabled={busy}>{busy ? t('login.wait') : hint === 'signup' ? t('login.create') : t('login.continue')} <ArrowUpRight size={15} /></button>
    {footer}
  </form>
}
