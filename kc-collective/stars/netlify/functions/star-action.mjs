// One-tap links from the star emails: approve a message, show/hide a star,
// remove it (lib/star-handler.mjs). GET shows a confirm page; POST does it.
import { handleStarAction } from '../../lib/star-handler.mjs';
import { depsFromEnv } from '../../lib/star-deps.mjs';

export default async (req) => {
  let deps;
  try {
    deps = depsFromEnv();
  } catch (err) {
    console.error('[stars]', err.message);
    return new Response('Not open yet.', { status: 503, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
  }
  return handleStarAction(req, deps);
};

export const config = {
  path: '/stars/act',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
