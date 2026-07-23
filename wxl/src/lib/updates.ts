const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type UpdatesSignupResult = 'subscribed' | 'already_subscribed'

export function isValidUpdatesEmail(email: string) {
  return EMAIL_RE.test(email.trim())
}

export async function subscribeForUpdates(email: string, website = ''): Promise<UpdatesSignupResult> {
  const response = await fetch('/.netlify/functions/subscribe-updates', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), website }),
  })
  const data = await response.json().catch(() => ({}))

  if (response.ok && (data.status === 'subscribed' || data.status === 'already_subscribed')) {
    return data.status
  }

  if (response.status === 422 && typeof data.message === 'string') {
    throw new Error(data.message)
  }

  throw new Error('WXL:FOOD could not save your email right now. Please try again.')
}
