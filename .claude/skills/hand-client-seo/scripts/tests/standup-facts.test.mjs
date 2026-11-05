import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStandup, zonedToUtc } from '../lib/standup.mjs';
import { contactFromContent, parseFact } from '../lib/facts.mjs';

test('zonedToUtc reads a wall-clock time in a named zone, across DST', () => {
  assert.equal(zonedToUtc('2026-10-07T10:00', 'America/Chicago').toISOString(), '2026-10-07T15:00:00.000Z');
  assert.equal(zonedToUtc('2026-12-07T10:00', 'America/Chicago').toISOString(), '2026-12-07T16:00:00.000Z');
  assert.throws(() => zonedToUtc('next tuesday', 'America/Chicago'), /--when/);
});

test('contact facts come only from filled-in contact fields', () => {
  assert.deepEqual(contactFromContent({ contact: { phone: '', email: 'hi@x.org', booking_url: 'not a url' }, hero: { title: 'phone' } }), { email: 'hi@x.org' });
  assert.deepEqual(contactFromContent({ contact: { phone: '(512) 555-0100', booking_url: 'https://cal.com/x' } }), { phone: '(512) 555-0100', bookingUrl: 'https://cal.com/x' });
});

test('parseFact types the value and refuses unknown keys', () => {
  assert.deepEqual(parseFact('areaServed=Austin; Round Rock'), ['areaServed', ['Austin', 'Round Rock']]);
  assert.deepEqual(parseFact('business=false'), ['business', false]);
  assert.throws(() => parseFact('hours=9-5'), /key one of/);
  assert.throws(() => parseFact('serviceMode=mobile'), /serviceMode/);
});

test('the standup asks for every missing fact and never invents one', () => {
  const state = { stages: { google: { items: {} } }, standup: { asks: ['Export the email list'], logins: ['Namecheap'] } };
  const s = buildStandup({ target: { slug: 'x', host: 'x.netlify.app', url: 'https://x.netlify.app/' }, state, facts: { name: 'X Studio' }, audit: null, when: '2026-10-07T10:00' });
  for (const q of ['Which city', 'phone number', 'Which email', 'How should people book', 'Export the email list']) assert.ok(s.owner.includes(q), q);
  assert.match(s.ics, /DTSTART:20261007T150000Z/);
  assert.match(s.agenda, /The domain move/);
  assert.ok(!/—/.test(s.owner + s.agenda + s.message), 'no em dashes in HAND copy');
});
