import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REVIEWS, config, normalizeReviews } from '../netlify/functions/lib/config.mjs';
import { buildPrompt, checkPin, handleReview, normalizeBusiness, validateDraftRequest } from '../netlify/functions/lib/review-core.mjs';
import { renderReviewPage } from '../netlify/functions/lib/review-page.mjs';

// A fixture so these tests do not depend on the site pack.
const FIX = normalizeReviews({
  pin: '4417',
  about: 'A mobile mechanic who comes to you.',
  links: [{ label: 'Google', url: 'https://g.page/r/abc/review', how: 'Tap the stars.' }, { label: 'Bad', url: 'http://plain.example' }],
  chips: ['What I came in for: '],
  page: { gateTitle: 'Code <b>please</b>' },
});
const BUSINESS = normalizeBusiness({ name: 'Fixture Garage', about: FIX.about, links: FIX.links, chips: FIX.chips });
const NOTES = 'Alex came to my office and had the brakes done in an hour';

// Mimics client.beta.messages.stream(): .on('text'), .finalMessage(), .abort().
function fakeClient(chunks) {
  const calls = [];
  return {
    calls,
    beta: { messages: { stream(params) {
      calls.push(params);
      let onText = () => {};
      return { on(ev, cb) { if (ev === 'text') onText = cb; return this; }, abort() {}, async finalMessage() { chunks.forEach((c) => onText(c)); return { stop_reason: 'end_turn' }; } };
    } } },
  };
}
const post = (body, headers = {}) => new Request('https://site.test/api/review', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const events = async (res) => (await res.text()).split('\n').filter(Boolean).map((l) => JSON.parse(l));

test('normalizeReviews: null when absent; PIN and links are validated', () => {
  assert.equal(normalizeReviews(undefined), null);
  assert.equal(REVIEWS, config.reviews, 'REVIEWS mirrors the pack (the template ships with the review page off)');
  assert.throws(() => normalizeReviews({ pin: '2', links: [{ label: 'G', url: 'https://x.io' }] }), /2 to 8 digits/);
  assert.throws(() => normalizeReviews({ pin: 'abcd', links: [{ label: 'G', url: 'https://x.io' }] }), /2 to 8 digits/);
  assert.throws(() => normalizeReviews({ pin: '22', links: [{ label: 'G', url: 'http://x.io' }] }), /https url/);
  assert.deepEqual(FIX.links.map((l) => l.label), ['Google']);
  assert.equal(normalizeReviews({ pin: 22, links: [{ label: 'G', url: 'https://x.io' }] }).pin, '22');
});

test('renderReviewPage: themed, noindex, escaped, and carries nothing the PIN protects', () => {
  const html = renderReviewPage({ reviews: FIX });
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /data-review data-api="\/api\/review" data-pin-length="4"/);
  assert.match(html, /--rv-accent:var\(--accent\)/);
  assert.match(html, /\/review\/review\.css\?v=/);
  assert.match(html, /\/review\/review\.js\?v=/);
  assert.match(html, /Code &lt;b&gt;please&lt;\/b&gt;/);
  assert.doesNotMatch(html, /g\.page/);
  assert.doesNotMatch(html, /4417/);
  assert.equal((html.match(/data-key="/g) || []).length, 11);
});

test('core: PIN, request validation and the prompt', () => {
  assert.equal(checkPin('4417', FIX.pin), true);
  assert.equal(checkPin('4418', FIX.pin), false);
  assert.throws(() => validateDraftRequest({ notes: 'good' }), /little more/);
  const { system, user } = buildPrompt({ business: BUSINESS, request: validateDraftRequest({ notes: NOTES, tone: 'plain' }), rng: () => 0 });
  assert.match(system, /Fixture Garage/);
  assert.match(system, /Do not add specifics they did not mention/);
  assert.match(system, /language the guest wrote/);
  assert.match(user, /<guest_notes>\nAlex came to my office/);
  assert.match(user, /plain and to the point/);
});

test('handleReview: gate first, then links on unlock and an NDJSON draft', async () => {
  const client = fakeClient(['Alex showed up ', 'on time.']);
  const opts = { business: BUSINESS, pin: FIX.pin, client };
  assert.equal((await handleReview(post({ action: 'unlock', pin: '0000' }), opts)).status, 401);
  assert.equal((await handleReview(post({ action: 'unlock', pin: '4417' }, { origin: 'https://evil.test' }), opts)).status, 403);
  const unlocked = await (await handleReview(post({ action: 'unlock', pin: '4417' }), opts)).json();
  assert.equal(unlocked.business.links[0].url, 'https://g.page/r/abc/review');
  const ev = await events(await handleReview(post({ action: 'draft', pin: '4417', notes: NOTES }), opts));
  assert.equal(ev.filter((x) => x.t === 'text').map((x) => x.v).join(''), 'Alex showed up on time.');
  assert.deepEqual(ev.at(-1), { t: 'done' });
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].model, 'claude-opus-5');
});

test('review function: 404 while the pack has not opted in', async () => {
  const { default: handler, config: fn } = await import('../netlify/functions/review.mjs');
  assert.deepEqual(fn.path, ['/review', '/api/review']);
  assert.equal(fn.rateLimit.aggregateBy.includes('ip'), true);
  const res = await handler(new Request('https://site.test/review'));
  assert.equal(res.status, REVIEWS ? 200 : 404);
});

test('review links may be a function of the content document (the owner pastes them in the editor)', async () => {
  const r = normalizeReviews({ pin: '22', links: (c) => [{ label: 'Google', url: c.reviews.google_url, how: 'Tap the stars.' }], tokens: { 'btn-case': 'uppercase', hairline: '0.35' } });
  assert.equal(typeof r.links, 'function');
  assert.deepEqual(r.tokens, { 'btn-case': 'uppercase', hairline: '0.35' });
  assert.throws(() => normalizeReviews({ pin: '22', links: () => [], tokens: { 'bad key': 'x' } }), /tokens/);
  assert.throws(() => normalizeReviews({ pin: '22', links: () => [], tokens: { ok: 'a}b' } }), /tokens/);
  const html = renderReviewPage({ reviews: r });
  assert.match(html, /--rv-hairline:0;--rv-btn-case:uppercase;--rv-hairline:0\.35\}/);
  // the function version resolves against the loaded document on each unlock
  const { businessFor } = await import('../netlify/functions/review.mjs');
  if (REVIEWS && typeof REVIEWS.links === 'function') {
    const b = await businessFor(async () => ({ content: { reviews: { google_url: 'https://g.page/r/x/review', viator_url: '' } } }));
    assert.ok(Array.isArray(b.links));
  }
});
