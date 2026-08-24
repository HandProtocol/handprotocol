import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { verifyStripeSignature } from './stripe.js'

test('Stripe signatures verify only within tolerance', () => {
  const body = Buffer.from('{"id":"evt_test"}')
  const timestamp = 1_700_000_000
  const secret = 'whsec_test'
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  assert.doesNotThrow(() => verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret, timestamp + 60))
  assert.throws(() => verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret, timestamp + 301))
  assert.throws(() => verifyStripeSignature(Buffer.from('changed'), `t=${timestamp},v1=${signature}`, secret, timestamp))
})
