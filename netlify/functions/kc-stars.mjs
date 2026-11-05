// KC Collective star guestbook, served from handprotocol.org while the KC site is built.
// Source and docs: kc-collective/stars/ (README.md). Table: command.kc_stars (migration 061).
// The shared star sky: GET the stars, POST a new one (lib/star-handler.mjs).
import { handleStars } from '../../kc-collective/stars/lib/star-handler.mjs';
import { depsFromEnv } from '../../kc-collective/stars/lib/star-deps.mjs';

export default async (req) => {
  let deps;
  try {
    deps = depsFromEnv();
  } catch (err) {
    console.error('[stars]', err.message);
    return new Response(JSON.stringify({ ok: false, error: 'The sky is not open yet.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  return handleStars(req, deps);
};

export const config = {
  path: '/api/stars',
  // Per IP, before any of our own counting: reading the sky is cheap, but this caps a hammering script.
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
