import assert from 'node:assert/strict'
import test from 'node:test'
import { idempotencyKey, objectBody, requestHash } from './policy.js'
import { HttpError } from './types.js'

test('idempotency keys are mandatory and bounded', () => {
  assert.equal(idempotencyKey({ 'idempotency-key': 'request-123' }), 'request-123')
  assert.throws(() => idempotencyKey({}), (error: unknown) => error instanceof HttpError && error.code === 'idempotency_key_required')
})

test('request hashes are deterministic', () => {
  assert.equal(requestHash({ lane: 'aid', quantity: 2 }), requestHash({ lane: 'aid', quantity: 2 }))
  assert.notEqual(requestHash({ quantity: 2 }), requestHash({ quantity: 3 }))
})

test('command bodies must be objects', () => {
  assert.deepEqual(objectBody({ lane: 'potluck' }), { lane: 'potluck' })
  assert.throws(() => objectBody(['potluck']))
})
