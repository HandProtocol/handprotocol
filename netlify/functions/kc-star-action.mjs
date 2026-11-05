// KC Collective star guestbook, served from handprotocol.org while the KC site is built.
// Source and docs: kc-collective/stars/ (README.md). Table: command.kc_stars (migration 061).
// One-tap links from the star emails: approve a message, show/hide a star,
// remove it (lib/star-handler.mjs). GET shows a confirm page; POST does it.
import { handleStarAction } from '../../kc-collective/stars/lib/star-handler.mjs';
import { depsFromEnv } from '../../kc-collective/stars/lib/star-deps.mjs';

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
