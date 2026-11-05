// Guest review page (config.reviews):
//
//   GET  /review        → the PIN pad + review links + writing helper (lib/review-page.mjs)
//   POST /api/review    → { action:'unlock', pin } | { action:'draft', pin, mode, notes, draft, tone, length }
//                         (lib/review-core.mjs: PIN check, same-origin, streamed Claude draft)
//
// The customer gets the code from the owner in person. Nothing reaches Claude
// without the right code, and the route is rate limited per IP by Netlify (below);
// the real ceiling on spend is the monthly limit on the API key's workspace.
//
// Env: ANTHROPIC_API_KEY (shared across HAND client sites or one per client),
//      <PREFIX>_REVIEW_PIN (optional, overrides reviews.pin).

import { REVIEWS, config as site, siteEnv, siteName } from './lib/config.mjs';
import { loadSite } from './lib/content.mjs';
import { handleReview, normalizeBusiness } from './lib/review-core.mjs';
import { renderReviewPage } from './lib/review-page.mjs';

const business = (links) => normalizeBusiness({ name: siteName(), about: REVIEWS.about, links, chips: REVIEWS.chips });
// Static links are normalized once; links that are a function of the content
// document (the owner pastes them in the editor) are read on each unlock.
const STATIC_BUSINESS = REVIEWS && typeof REVIEWS.links !== 'function' ? business(REVIEWS.links) : null;
export async function businessFor(load = loadSite) {
  if (STATIC_BUSINESS) return STATIC_BUSINESS;
  const { content } = await load();
  return business(REVIEWS.links(content));
}

function html(status, body) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex, nofollow', 'X-Frame-Options': 'DENY' } });
}

export default async (req) => {
  if (!REVIEWS) return new Response('Not found', { status: 404 });
  const { pathname } = new URL(req.url);
  if (pathname === '/api/review') {
    let biz;
    try {
      biz = await businessFor();
    } catch (err) {
      console.error(`[${site.slug}] review links failed:`, err && err.message);
      return new Response(JSON.stringify({ ok: false, error: 'Back in a moment.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '30' } });
    }
    return handleReview(req, { business: biz, pin: siteEnv('REVIEW_PIN') || REVIEWS.pin });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  try {
    return html(200, renderReviewPage({ reviews: REVIEWS }));
  } catch (err) {
    console.error(`[${site.slug}] review page failed:`, err && (err.stack || err.message));
    return html(500, 'Something went wrong.');
  }
};

export const config = {
  path: ['/review', '/api/review'],
  // Per IP: enough for a customer who rewrites a few times, not enough to run up a bill.
  rateLimit: { windowLimit: 15, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
