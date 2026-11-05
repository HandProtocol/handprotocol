import test from 'node:test';
import assert from 'node:assert/strict';
import { claudeClient } from '../lib/claude-client.mjs';

test('claude client: betas go in the header, not the body; key and version are sent', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, init };
    return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{}' }] }), { status: 200 });
  };
  const client = claudeClient({ apiKey: 'k-test', fetchImpl });
  const ctl = new AbortController();
  const res = await client.beta.messages.create({ model: 'm', max_tokens: 5, betas: ['a-1', 'b-2'], messages: [] }, { signal: ctl.signal });
  assert.equal(res.stop_reason, 'end_turn');
  assert.equal(seen.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(seen.init.headers['x-api-key'], 'k-test');
  assert.equal(seen.init.headers['anthropic-version'], '2023-06-01');
  assert.equal(seen.init.headers['anthropic-beta'], 'a-1,b-2');
  assert.equal(seen.init.signal, ctl.signal);
  const body = JSON.parse(seen.init.body);
  assert.equal(body.betas, undefined);
  assert.equal(body.model, 'm');
});

test('claude client: a non-2xx answer throws (the handler falls back to a plain star)', async () => {
  const client = claudeClient({ apiKey: 'k', fetchImpl: async () => new Response('overloaded', { status: 529 }) });
  await assert.rejects(client.beta.messages.create({ messages: [] }), /anthropic 529/);
});

test('claude client: no key is a configuration error', () => {
  assert.throws(() => claudeClient({}), /ANTHROPIC_API_KEY/);
});
