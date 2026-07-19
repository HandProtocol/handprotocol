import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { confirmationPrompt, intakePrompt, verifyTwilioRequest } from './voice.js'

test('Twilio voice signatures use sorted form parameters', () => {
  const token = 'twilio-test'
  const url = 'https://food.example/webhooks/twilio/voice/intake'
  const params = new URLSearchParams({ SpeechResult: 'Need rice', CallSid: 'CA123' })
  const payload = `${url}CallSidCA123SpeechResultNeed rice`
  const signature = createHmac('sha1', token).update(payload).digest('base64')
  assert.doesNotThrow(() => verifyTwilioRequest(token, url, params, signature))
  assert.throws(() => verifyTwilioRequest(token, url, params, 'invalid'))
})

test('voice prompts support English, Spanish, speech, and keypad', () => {
  const english = intakePrompt('en', 'https://food.example/intake')
  const spanish = intakePrompt('es', 'https://food.example/intake')
  assert.match(english, /input="speech dtmf"/)
  assert.match(spanish, /language="es-US"/)
  assert.match(confirmationPrompt('en', 'Two bags of rice', '/confirm'), /Press one to confirm/)
})
