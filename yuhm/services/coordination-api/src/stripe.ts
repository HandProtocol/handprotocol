import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Config } from './config.js'
import { HttpError, type JsonObject } from './types.js'

export function verifyStripeSignature(rawBody: Buffer, header: string | undefined, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): void {
  if (!header) throw new HttpError(400, 'Stripe-Signature is required', 'invalid_signature')
  const parts = header.split(',').map((part) => part.split('=', 2))
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1])
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value ?? '')
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300) throw new HttpError(400, 'Stripe signature timestamp is outside tolerance', 'invalid_signature')
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex')
  const valid = signatures.some((signature) => signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
  if (!valid) throw new HttpError(400, 'Stripe signature is invalid', 'invalid_signature')
}

async function stripeRequest(config: Config, path: string, form: URLSearchParams, idempotencyKey: string): Promise<JsonObject> {
  if (!config.stripeSecretKey) throw new HttpError(503, 'Stripe is not configured', 'provider_unavailable')
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${config.stripeSecretKey}`, 'content-type': 'application/x-www-form-urlencoded', 'idempotency-key': idempotencyKey },
    body: form,
  })
  const body = await response.json() as JsonObject
  if (!response.ok) throw new HttpError(502, 'Stripe could not complete the requested operation', 'stripe_error')
  return body
}

export async function createPaymentIntent(config: Config, order: { id: string; total_cents: number; hand_fee_cents: number; subsidy_cents: number }, providerAccount: string, idempotencyKey: string): Promise<JsonObject> {
  const form = new URLSearchParams({
    amount: String(order.total_cents), currency: 'usd', 'metadata[food_payment_order_id]': order.id,
    'transfer_data[destination]': providerAccount, capture_method: 'manual',
    application_fee_amount: String(Math.max(0, order.hand_fee_cents - order.subsidy_cents)),
    'automatic_payment_methods[enabled]': 'true',
  })
  return stripeRequest(config, 'payment_intents', form, idempotencyKey)
}

export async function createDonationIntent(config: Config, donation: { id: string; amount_cents: number }, idempotencyKey: string): Promise<JsonObject> {
  return stripeRequest(config, 'payment_intents', new URLSearchParams({ amount: String(donation.amount_cents), currency: 'usd', 'metadata[food_donation_id]': donation.id, 'automatic_payment_methods[enabled]': 'true' }), idempotencyKey)
}

export async function capturePaymentIntent(config: Config, paymentIntentId: string, idempotencyKey: string): Promise<JsonObject> {
  return stripeRequest(config, `payment_intents/${encodeURIComponent(paymentIntentId)}/capture`, new URLSearchParams(), idempotencyKey)
}

export async function createProviderTopup(config: Config, providerAccount: string, amountCents: number, orderId: string, idempotencyKey: string): Promise<JsonObject> {
  return stripeRequest(config, 'transfers', new URLSearchParams({ amount: String(amountCents), currency: 'usd', destination: providerAccount, 'metadata[food_payment_order_id]': orderId }), idempotencyKey)
}
