import { useEffect, useState } from 'react'
import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { foodDb } from './lib/foodRepository'
import { createAccountAndSession, getAuthErrorMessage, getRecoveryRedirectUrl, updatePasswordAndSignOut } from './lib/auth'
import { isValidUpdatesEmail, subscribeForUpdates } from './lib/updates'
import { notifyWxlAccountSignup } from './lib/feedback'
import { AppLink } from './router'
import { LanguageToggle, useI18n } from './i18n'

export function LoginScreen() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset' | 'recovery' | 'updates'>('login')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (params.get('mode') === 'recovery' || hashParams.get('type') === 'recovery') setAuthMode('recovery')
    else if (params.get('updates') === '1') setAuthMode('updates')
    else if (params.get('signup') === '1') setAuthMode('signup')
  }, [])

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!foodDb) { setError('Login is not configured on this deployment yet. You can still browse anonymously.'); return }
    setBusy(true)
    const result = authMode === 'signup'
      ? await createAccountAndSession(foodDb.auth, email.trim(), password)
      : await foodDb.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (result.error) setError(getAuthErrorMessage(result.error, authMode === 'signup' ? 'signup' : 'login'))
    else if (!result.data.session) setError('Your account was created, but WXL:FOOD could not log you in. Please try logging in.')
    else {
      if (authMode === 'signup') void notifyWxlAccountSignup(email)
      const returnIntent = new URLSearchParams(window.location.search).get('return')
      const destination = returnIntent === 'food' || returnIntent === 'contribute' || returnIntent === 'gather' || returnIntent === 'request'
        ? `/app/?intent=${returnIntent}`
        : '/app/?intent=food'
      window.location.assign(destination)
    }
  }

  const sendReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!foodDb) { setError('Login is not configured on this deployment yet.'); return }
    setBusy(true)
    const { error: authError } = await foodDb.auth.resetPasswordForEmail(email.trim(), { redirectTo: getRecoveryRedirectUrl(window.location.origin) })
    setBusy(false)
    if (authError) setError(authError.message)
    else setNotice('If an account exists for that email, you will receive a password reset link.')
  }

  const joinUpdates = async (event: React.FormEvent) => {
    event.preventDefault()
    const website = String(new FormData(event.currentTarget as HTMLFormElement).get('website') || '')
    setError('')
    setNotice('')
    if (!isValidUpdatesEmail(email)) { setError('Please enter a valid email address.'); return }
    setBusy(true)
    try {
      const result = await subscribeForUpdates(email, website)
      setNotice(result === 'already_subscribed'
        ? 'That email is already on the WXL updates list.'
        : 'You are on the list. We will email when there is meaningful platform progress or a future offering.')
      setEmail('')
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'WXL:FOOD could not save your email right now.')
    } finally {
      setBusy(false)
    }
  }

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (newPassword.length < 6) { setError('Your new password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Your passwords do not match.'); return }
    if (!foodDb) { setError('Login is not configured on this deployment yet.'); return }
    setBusy(true)
    const { error: authError } = await updatePasswordAndSignOut(foodDb.auth, newPassword)
    setBusy(false)
    if (authError) setError(authError.message)
    else window.location.assign('/app/?mode=login')
  }

  const isRecovery = authMode === 'recovery'
  const isReset = authMode === 'reset'
  const isUpdates = authMode === 'updates'
  return <div className="login-page"><div className="login-card"><div className="login-card-top"><a className="login-wordmark" href="/">WXL <small>/WITH XTRA LOVE ♥</small></a><LanguageToggle /></div>
    <p className="eyebrow">{isRecovery ? 'Choose a new password' : isReset ? 'Account recovery' : isUpdates ? 'Stay in the loop' : t('login.enterNetwork')}</p>
    <h1>{isRecovery ? 'Set a new password.' : isReset ? 'Reset your password.' : isUpdates ? 'Get WXL updates.' : authMode === 'signup' ? t('login.createAccount') : t('login.welcomeBack')}</h1>
    {isRecovery ? <form onSubmit={updatePassword}><p className="login-copy">Choose a new password for your WXL:FOOD account.</p><label>New password<input type="password" name="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={6} /></label><label className="login-field-spaced">Confirm new password<input type="password" name="confirm-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} /></label>{error && <p className="login-error">{error}</p>}{notice && <p className="login-success"><CheckCircle2 size={20} /><span>{notice}</span></p>}<button className="login-submit" type="submit" disabled={busy || !newPassword || !confirmPassword}>{busy ? 'Updating password…' : 'Update password'} <ArrowUpRight size={15} /></button></form> : isReset ? <form onSubmit={sendReset}><p className="login-copy">Enter your email and we will send a secure link to choose a new password.</p><label>{t('login.emailLabel')}<input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" autoComplete="email" required /></label>{error && <p className="login-error">{error}</p>}{notice && <p className="login-success"><CheckCircle2 size={20} /><span>{notice}</span></p>}<button className="login-submit" type="submit" disabled={busy || !email.trim()}>{busy ? 'Sending reset link…' : 'Send reset link'} <ArrowUpRight size={15} /></button><button className="login-switch" type="button" onClick={() => { setAuthMode('login'); setError(''); setNotice('') }}>Back to log in</button></form> : isUpdates ? <form onSubmit={joinUpdates}><p className="login-copy">Hear about meaningful platform progress and future WXL offerings. This only joins the email list. It does not create an account.</p><label>{t('login.emailLabel')}<input type="email" name="updates-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" autoComplete="email" required /></label><div className="updates-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>{error && <p className="login-error" role="alert">{error}</p>}{notice && <p className="login-success" role="status"><CheckCircle2 size={20} /><span>{notice}</span></p>}<p className="login-privacy">We will only use this email for WXL updates. Unsubscribe in any message.</p><button className="login-submit" type="submit" disabled={busy || !email.trim()}>{busy ? 'Joining the list…' : 'Get email updates'} <ArrowUpRight size={15} /></button><button className="login-switch" type="button" onClick={() => { setAuthMode('login'); setError(''); setNotice('') }}>Back to log in</button></form> : <form onSubmit={submitAuth}><p className="login-copy">{authMode === 'signup' ? t('login.signupCopy') : t('login.loginCopy')}</p><label>{t('login.emailLabel')}<input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" autoComplete="username" required /></label><label className="login-field-spaced">{t('login.passwordLabel')}<input type="password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required /></label>{error && <p className="login-error">{error}</p>}{notice && <p className="login-success"><CheckCircle2 size={20} /><span>{notice}</span></p>}<button className="login-submit" type="submit" disabled={busy || !email.trim() || !password}>{busy ? t('login.wait') : authMode === 'signup' ? t('login.create') : t('login.logIn')} <ArrowUpRight size={15} /></button>{authMode === 'login' && <button className="login-switch" type="button" onClick={() => { setAuthMode('reset'); setError(''); setNotice('') }}>{t('login.forgot')}</button>}<button className="login-switch" type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setError(''); setNotice('') }}>{authMode === 'signup' ? t('login.switchToLogin') : t('login.switchToSignup')}</button><button className="login-switch login-updates-switch" type="button" onClick={() => { setAuthMode('updates'); setError(''); setNotice('') }}>{t('login.updatesSwitch')}</button></form>}
    {!isRecovery && <AppLink className="login-anonymous" href="/app/?mode=anonymous&intent=food">{t('login.browseAnonymously')} <ArrowUpRight size={15} /></AppLink>}
  </div></div>
}
