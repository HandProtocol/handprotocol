import { loadConfig } from './config.js'
import { serviceInsert, serviceRpc, serviceSelect, serviceUpdate } from './database.js'
import { capturePaymentIntent, createDonationIntent, createPaymentIntent, createProviderTopup } from './stripe.js'
import { HttpError, type JsonObject } from './types.js'

const config = loadConfig()
const worker = `payments:${process.pid}`
const topics = ['food.payment.authorization_requested','food.donation.authorization_requested','food.payment.settlement_ready']

async function one(table: string, query: URLSearchParams): Promise<JsonObject> {
  const rows = await serviceSelect(config, table, query)
  if (!Array.isArray(rows) || !rows[0] || typeof rows[0] !== 'object') throw new HttpError(404, `${table} record was not found`, 'not_found')
  return rows[0] as JsonObject
}

async function processJob(job: JsonObject): Promise<void> {
  const topic = String(job.topic)
  const payload = job.payload as JsonObject
  if (topic === 'food.payment.authorization_requested') {
    const order = await one('food_payment_orders', new URLSearchParams({ id: `eq.${String(payload.payment_order_id)}`, select: '*' }))
    const provider = await one('food_participants', new URLSearchParams({ id: `eq.${String(order.provider_participant_id)}`, select: 'stripe_account_id' }))
    if (typeof provider.stripe_account_id !== 'string') throw new HttpError(409, 'Provider payout verification is incomplete', 'provider_not_ready')
    const intent = await createPaymentIntent(config, order as { id: string; total_cents: number; hand_fee_cents: number; subsidy_cents: number }, provider.stripe_account_id, `payment-order:${String(order.id)}`)
    await serviceUpdate(config, 'food_payment_orders', `id=eq.${encodeURIComponent(String(order.id))}`, { stripe_payment_intent_id: intent.id, status: 'authorization_pending' })
  } else if (topic === 'food.donation.authorization_requested') {
    const donation = await one('food_donations', new URLSearchParams({ id: `eq.${String(payload.donation_id)}`, select: '*' }))
    const intent = await createDonationIntent(config, donation as { id: string; amount_cents: number }, `donation:${String(donation.id)}`)
    await serviceUpdate(config, 'food_donations', `id=eq.${encodeURIComponent(String(donation.id))}`, { stripe_payment_intent_id: intent.id })
  } else if (topic === 'food.payment.settlement_ready') {
    const order = await one('food_payment_orders', new URLSearchParams({ commitment_id: `eq.${String(payload.commitment_id)}`, select: '*' }))
    if (typeof order.stripe_payment_intent_id !== 'string') throw new HttpError(409, 'Payment authorization is missing', 'payment_not_ready')
    await capturePaymentIntent(config, order.stripe_payment_intent_id, `capture:${String(order.id)}`)
    const topup = Number(order.provider_topup_cents ?? 0)
    if (topup > 0) {
      const provider = await one('food_participants', new URLSearchParams({ id: `eq.${String(order.provider_participant_id)}`, select: 'stripe_account_id' }))
      if (typeof provider.stripe_account_id !== 'string') throw new HttpError(409, 'Provider payout verification is incomplete', 'provider_not_ready')
      const transfer = await createProviderTopup(config, provider.stripe_account_id, topup, String(order.id), `provider-topup:${String(order.id)}`)
      await serviceInsert(config, 'food_transfers', { payment_order_id: order.id, transfer_type: 'provider_payout', amount_cents: topup, stripe_transfer_id: transfer.id, status: 'submitted', reason: 'Subsidized delivery provider top-up', idempotency_key: `provider-topup:${String(order.id)}` })
    }
  }
}

async function loop(): Promise<void> {
  for (;;) {
    const jobs = await serviceRpc(config, 'lease_food_outbox', { p_worker: worker, p_topics: topics, p_limit: 10, p_lease_seconds: 60 })
    if (!Array.isArray(jobs) || jobs.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 5_000))
      continue
    }
    for (const raw of jobs) {
      const job = raw as JsonObject
      try {
        await processJob(job)
        await serviceRpc(config, 'complete_food_outbox', { p_id: job.id, p_worker: worker, p_error: null })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown payment worker error'
        await serviceRpc(config, 'complete_food_outbox', { p_id: job.id, p_worker: worker, p_error: message })
      }
    }
  }
}

void loop()
