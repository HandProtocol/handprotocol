/* The one Anthropic call the stars need, over plain fetch, so the functions
   bundle with no npm install (handprotocol.org's site has no package.json).

   Same shape as the SDK's `client.beta.messages.create(params, { signal })`,
   so star-core.mjs and the tests don't care which one they get. No retries:
   a slow or failed answer falls back to a plain star. */

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export function claudeClient({ apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('stars: ANTHROPIC_API_KEY is required for the Claude client');
  return {
    beta: {
      messages: {
        async create(params, { signal } = {}) {
          const { betas = [], ...body } = params;
          const res = await fetchImpl(API_URL, {
            method: 'POST',
            signal,
            headers: {
              'content-type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': API_VERSION,
              ...(betas.length ? { 'anthropic-beta': betas.join(',') } : {}),
            },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(`anthropic ${res.status}: ${detail.slice(0, 300)}`);
          }
          return res.json();
        },
      },
    },
  };
}
