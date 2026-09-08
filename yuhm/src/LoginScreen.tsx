import { useEffect, useState } from 'react'
import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { foodDb } from './lib/foodRepository'
import { getRecoveryRedirectUrl, resolveReturnPath, updatePasswordAndSignOut } from './lib/auth'
import { isValidUpdatesEmail, subscribeForUpdates } from './lib/updates'
import { EmailContinueForm, readField } from './AuthForm'
import { AppLink, useRoute } from './router'
import { LanguageToggle, useI18n } from './i18n'
import { YuhmBrand } from './YuhmBrand'

type Screen = 'continue' | 'reset' | 'recovery' | 'updates'

/**
 * One sign-in step (email + password + Continue) that signs a member in or
 * creates the account, then returns the person to the exact place they were
 * headed. Reset, recovery, and email-updates stay as secondary screens.
 */
export function LoginScreen() {
  const { t } = useI18n()
  const { params, navigate } = useRoute()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [screen, setScreen] = useState<Screen>('continue')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const signupHint = params.get('signup') === '1'

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (params.get('mode') === 'recovery' || hashParams.get('type') === 'recovery') setScreen('recovery')
    else if (params.get('mode') === 'reset') setScreen('reset')
    else if (params.get('updates') === '1') setScreen('updates')
  }, [params])

  const switchTo = (next: Screen) => { setScreen(next); setError(''); setNotice('') }
  const finishSignIn = () => navigate(resolveReturnPath(params.get('return')), { replace: true })

  const sendReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const address = readField(event.currentTarget, 'email')
    setError('')
    setNotice('')
    if (!address) { setError(t('login.missingFields')); return }
    if (!foodDb) { setError('Login is not configured on this deployment yet.'); return }
    setBusy(true)
    const { error: authError } = await foodDb.auth.resetPasswordForEmail(address, { redirectTo: getRecoveryRedirectUrl(window.location.origin) })
    setBusy(false)
    if (authError) setError(authError.message)
    else setNotice('If an account exists for that email, you will receive a password reset link.')
  }

  const joinUpdates = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const address = readField(event.currentTarget, 'updates-email')
    const website = String(new FormData(event.currentTarget).get('website') || '')
    setError('')
    setNotice('')
    if (!isValidUpdatesEmail(address)) { setError('Please enter a valid email address.'); return }
    setBusy(true)
    try {
      const result = await subscribeForUpdates(address, website)
      setNotice(result === 'already_subscribed'
        ? 'That email is already on the yuhm updates list.'
        : 'You are on the list. We will email when there is meaningful platform progress or a future offering.')
      setEmail('')
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'yuhm could not save your email right now.')
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

  const isRecovery = screen === 'recovery'
  const isReset = screen === 'reset'
  const isUpdates = screen === 'updates'
  return <div className="login-page"><div className="login-card"><div className="login-card-top"><YuhmBrand /><LanguageToggle /></div>
    <p className="eyebrow">{isRecovery ? 'Choose a new password' : isReset ? 'Account recovery' : isUpdates ? 'Stay in the loop' : t('login.enterNetwork')}</p>
    <h1>{isRecovery ? 'Set a new password.' : isReset ? 'Reset your password.' : isUpdates ? 'Get yuhm updates.' : signupHint ? t('login.createAccount') : t('login.title')}</h1>
    {isRecovery ? <form onSubmit={updatePassword}><p className="login-copy">Choose a new password for your yuhm account.</p><label>New password<input type="password" name="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={6} /></label><label className="login-field-spaced">Confirm new password<input type="password" name="confirm-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} /></label>{error && <p className="login-error">{error}</p>}{notice && <p className="login-success"><CheckCircle2 size={20} /><span>{notice}</span></p>}<button className="login-submit" type="submit" disabled={busy || !newPassword || !confirmPassword}>{busy ? 'Updating password…' : 'Update password'} <ArrowUpRight size={15} /></button></form> : isReset ? <form onSubmit={sendReset}><p className="login-copy">Enter your email and we will send a secure link to choose a new password.</p><label>{t('login.emailLabel')}<input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" autoComplete="email" required /></label>{error && <p className="login-error">{error}</p>}{notice && <p className="login-success"><CheckCircle2 size={20} /><span>{notice}</span></p>}<button className="login-submit" type="submit" disabled={busy}>{busy ? 'Sending reset link…' : 'Send reset link'} <ArrowUpRight size={15} /></button><button className="login-switch" type="button" onClick={() => switchTo('continue')}>Back to sign in</button></form> : isUpdates ? <form onSubmit={joinUpdates}><p className="login-copy">Hear about meaningful platform progress and future yuhm offerings. This only joins the email list. It does not create an account.</p><label>{t('login.emailLabel')}<input type="email" name="updates-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" autoComplete="email" required /></label><div className="updates-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>{error && <p className="login-error" role="alert">{error}</p>}{notice && <p className="login-success" role="status"><CheckCircle2 size={20} /><span>{notice}</span></p>}<p className="login-privacy">We will only use this email for yuhm updates. Unsubscribe in any message.</p><button className="login-submit" type="submit" disabled={busy}>{busy ? 'Joining the list…' : 'Get email updates'} <ArrowUpRight size={15} /></button><button className="login-switch" type="button" onClick={() => switchTo('continue')}>Back to sign in</button></form> : <>
      <p className="login-copy">{signupHint ? t('login.signupCopy') : t('login.continueCopy')}</p>
      <EmailContinueForm
        hint={signupHint ? 'signup' : 'continue'}
        onSuccess={finishSignIn}
        footer={<>
          <button className="login-switch" type="button" onClick={() => switchTo('reset')}>{t('login.forgot')}</button>
          <button className="login-switch login-updates-switch" type="button" onClick={() => switchTo('updates')}>{t('login.updatesSwitch')}</button>
        </>}
      />
    </>}
    {!isRecovery && <AppLink className="login-anonymous" href="/app/?mode=anonymous&intent=food">{t('login.browseAnonymously')} <ArrowUpRight size={15} /></AppLink>}
  </div></div>
}
