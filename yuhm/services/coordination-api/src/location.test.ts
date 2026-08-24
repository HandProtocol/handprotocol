import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { decryptLocation, encryptLocation } from './location.js'

test('exact locations use versioned authenticated encryption',()=>{
  const key=randomBytes(32).toString('base64')
  const encrypted=encryptLocation('123 Example St, Austin, TX',key)
  assert.notEqual(encrypted,'123 Example St, Austin, TX')
  assert.equal(decryptLocation(encrypted,key),'123 Example St, Austin, TX')
  assert.throws(()=>decryptLocation(`${encrypted.slice(0,-2)}00`,key))
})
