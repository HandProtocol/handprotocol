import { createHmac, timingSafeEqual } from 'node:crypto'
import { HttpError } from './types.js'

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character)
}

export function verifyTwilioRequest(authToken: string, url: string, params: URLSearchParams, signature: string | undefined): void {
  if (!signature) throw new HttpError(403, 'Twilio signature is required', 'invalid_signature')
  let payload = url
  for (const key of [...new Set(params.keys())].sort()) payload += `${key}${params.get(key) ?? ''}`
  const expected = createHmac('sha1', authToken).update(payload).digest('base64')
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new HttpError(403, 'Twilio signature is invalid', 'invalid_signature')
}

export function intakePrompt(language: 'en' | 'es', action: string): string {
  const prompt = language === 'es'
    ? 'Diga qué comida necesita, cuánto, para cuándo, y si puede recogerla. También puede usar el teclado. Para hablar con una coordinadora, oprima cero.'
    : 'Say what food you need, how much, when you need it, and whether you can pick it up. You may also use the keypad. To reach a coordinator, press zero.'
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech dtmf" action="${escapeXml(action)}" method="POST" language="${language === 'es' ? 'es-US' : 'en-US'}" speechTimeout="auto" timeout="6" numDigits="1"><Say language="${language === 'es' ? 'es-US' : 'en-US'}">${escapeXml(prompt)}</Say></Gather><Redirect method="POST">${escapeXml(action)}</Redirect></Response>`
}

export function confirmationPrompt(language: 'en' | 'es', summary: string, action: string): string {
  const instruction = language === 'es' ? 'Oprima uno para confirmar, dos para repetir, o cero para hablar con coordinación.' : 'Press one to confirm, two to repeat, or zero to speak with a coordinator.'
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="dtmf" action="${escapeXml(action)}" method="POST" numDigits="1" timeout="8"><Say language="${language === 'es' ? 'es-US' : 'en-US'}">${escapeXml(summary)} ${escapeXml(instruction)}</Say></Gather></Response>`
}
