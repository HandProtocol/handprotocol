import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../netlify/functions/lib/config.mjs';
import { confirmationText, handleSubmission, notificationHtml, notificationText, recipients, rows } from '../netlify/functions/lib/forms.mjs';
import { handler } from '../netlify/functions/submission-created.mjs';

const FORM = {
  label: 'Booking request',
  notify: ['owner@example.com', 'bad-address', 'Owner@Example.com'],
  replyField: 'email',
  nameField: 'name',
  fields: [{ key: 'name', label: 'Name' }, { key: 'vehicle', label: 'Vehicle' }, { key: 'issue', label: 'What is going on' }],
  confirm: { subject: 'Got it, {name}', body: 'Thanks {name}.\n\nWe will text you.' },
};
const DATA = { 'form-name': 'booking', 'bot-field': '', name: 'Ana <b>x</b>', vehicle: '2019 GLE', issue: 'Check engine\nlight', email: 'ana@example.com', extra_field: 'kept', empty: '' };

test('rows: configured order first, extras appended, empties and meta fields dropped', () => {
  const r = rows(FORM, DATA);
  assert.deepEqual(r.map(([l]) => l), ['Name', 'Vehicle', 'What is going on', 'email', 'extra field']);
  assert.equal(r.some(([, v]) => v === ''), false);
});

test('recipients dedupe, lowercase, and drop invalid; env override wins', () => {
  assert.deepEqual(recipients(FORM), ['owner@example.com']);
  process.env[`${config.envPrefix}_FORM_NOTIFY`] = 'a@x.io, b@y.io';
  try { assert.deepEqual(recipients(FORM), ['a@x.io', 'b@y.io']); } finally { delete process.env[`${config.envPrefix}_FORM_NOTIFY`]; }
});

test('emails escape visitor input and substitute the name', () => {
  const html = notificationHtml(FORM, DATA);
  assert.equal(html.includes('<b>x</b>'), false);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(html, /Check engine<br>light/);
  assert.match(notificationText(FORM, DATA), /Vehicle: 2019 GLE/);
  const c = confirmationText(FORM, DATA);
  assert.equal(c.subject, 'Got it, Ana <b>x</b>');
  assert.match(c.body, /Thanks Ana/);
});

test('handleSubmission: unconfigured form / unconfigured email short-circuit without throwing', async () => {
  assert.deepEqual(await handleSubmission({ formName: 'nope', data: {} }), { ok: false, reason: 'form-unconfigured', formName: 'nope' });
  const saved = { key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM };
  delete process.env.RESEND_API_KEY;
  try { assert.equal((await handleSubmission({ formName: 'booking', data: DATA, form: FORM })).reason, 'email-unconfigured'); } finally {
    if (saved.key) process.env.RESEND_API_KEY = saved.key;
  }
});

test('handleSubmission sends the owner notification (with Reply-To) and the visitor confirmation', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ id: 'em_1' }) }; };
  process.env.RESEND_API_KEY = 'test';
  process.env.EMAIL_FROM = 'Site <hello@example.com>';
  try {
    const r = await handleSubmission({ formName: 'booking', data: DATA, form: FORM });
    assert.deepEqual(r, { ok: true, notified: ['owner@example.com'], confirmed: true });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].to, ['owner@example.com']);
    assert.equal(calls[0].reply_to, 'ana@example.com');
    assert.match(calls[0].subject, /^Booking request: Ana/);
    assert.deepEqual(calls[1].to, ['ana@example.com']);
    assert.equal(calls[1].subject, 'Got it, Ana <b>x</b>');
    // the event handler unwraps Netlify's payload envelope
    const res = await handler({ body: JSON.stringify({ payload: { form_name: 'nope', data: DATA } }) });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /form-unconfigured/);
    assert.equal((await handler({ body: '{not json' })).statusCode, 400);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  }
});
