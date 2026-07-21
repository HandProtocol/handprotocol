import assert from 'node:assert/strict'
import test from 'node:test'
import { orderBreakdown } from './money.js'

test('HAND fee is five percent of food subtotal and capped at three dollars',()=>{
  assert.equal(orderBreakdown(1_000,0,0,0,0).handFeeCents,50)
  assert.equal(orderBreakdown(10_000,0,0,0,0).handFeeCents,300)
})

test('tax, tip, and donations never increase the HAND fee',()=>{
  const order=orderBreakdown(2_000,500,0,165,900)
  assert.equal(order.handFeeCents,100)
  assert.equal(order.providerAmountCents,3_565)
  assert.equal(order.totalCents,3_665)
})

test('delivery subsidy preserves provider payout through a top-up',()=>{
  const order=orderBreakdown(2_000,500,400,165,0)
  assert.equal(order.handFeeCents,100)
  assert.equal(order.providerTopupCents,300)
  assert.equal(order.totalCents,2_365)
  assert.equal(order.providerAmountCents,2_665)
})

test('subsidy cannot exceed HAND fee and delivery',()=>{
  assert.throws(()=>orderBreakdown(1_000,100,151,0,0))
})
