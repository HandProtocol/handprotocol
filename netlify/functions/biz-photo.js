/**
 * biz-photo.js — Google Places photo image proxy
 *
 * GET /api/biz-photo?ref=<photo_reference>&maxwidth=800
 *
 * Proxies a single Google Places photo through our server so:
 * - The API key never appears in browser HTML
 * - CORS is satisfied (same origin as the demo site)
 * - We can set a sensible Cache-Control (1 day; ToS permits up to 30 days)
 *
 * Required env: GOOGLE_MAPS_API_KEY
 *
 * Call biz-photos.js first to get `ref` values + attributions.
 * Render attribution_html beside every image served through this endpoint.
 */

const PHOTO_URL = 'https://maps.googleapis.com/maps/api/place/photo';

const MAX_WIDTH_LIMIT = 1600; // never let a caller request a giant image

export default async function handler(req) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return new Response('GOOGLE_MAPS_API_KEY not configured', { status: 503 });
  }

  const url      = new URL(req.url);
  const ref      = url.searchParams.get('ref');
  const maxwidth = Math.min(
    parseInt(url.searchParams.get('maxwidth') || '800', 10),
    MAX_WIDTH_LIMIT
  );

  if (!ref) {
    return new Response('missing ref param', { status: 400 });
  }

  const photoUrl = new URL(PHOTO_URL);
  photoUrl.searchParams.set('photo_reference', ref);
  photoUrl.searchParams.set('maxwidth', String(maxwidth));
  photoUrl.searchParams.set('key', key);

  // Google returns a 302 to the actual image CDN URL; fetch follows redirects.
  const upstream = await fetch(photoUrl.toString());

  if (!upstream.ok) {
    return new Response('upstream error ' + upstream.status, {
      status: upstream.status,
    });
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  const body        = await upstream.arrayBuffer();

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // 1 day in browser + CDN; ToS max is 30 days. Keep conservative.
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      // Needed so the demo page (same origin) can read the image in a canvas
      // if we ever want to do client-side color extraction.
      'Access-Control-Allow-Origin': '*',
    },
  });
}
