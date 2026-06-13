/**
 * biz-photos.js — Google Places photo metadata for a business
 *
 * GET /api/biz-photos?place_id=ChIJ...              → up to 10 photo objects
 * GET /api/biz-photos?name=Taco+Trailer&city=Austin  → Find Place first, then photos
 *
 * Required env: GOOGLE_MAPS_API_KEY (Places API enabled, billing active)
 *
 * Each returned photo object:
 *   { ref, width, height, photographer, attribution_html, attribution_text }
 *
 * ref is opaque — pass it to /api/biz-photo?ref=<ref> to proxy the image.
 * attribution_html is the string from Google's html_attributions array; render
 * it verbatim on the page next to the image. It is a ToS requirement.
 */

const MAPS_BASE = 'https://maps.googleapis.com/maps/api/place';

export default async function handler(req) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not set' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url    = new URL(req.url);
  const limit  = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 10);
  let placeId  = url.searchParams.get('place_id');

  // If no place_id, try Find Place from name + city
  if (!placeId) {
    const name = url.searchParams.get('name');
    const city = url.searchParams.get('city');
    if (!name) {
      return new Response(JSON.stringify({ error: 'provide place_id or name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const input = [name, city].filter(Boolean).join(' ');
    placeId = await findPlaceId(input, key);
    if (!placeId) {
      return new Response(JSON.stringify({ error: 'place not found', input }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const photos = await fetchPlacePhotos(placeId, key, limit);

  return new Response(JSON.stringify({ place_id: placeId, photos }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // 1 h; ToS allows up to 30 days
    },
  });
}

// ── Find Place (text → place_id) ─────────────────────────────────────────────

async function findPlaceId(input, key) {
  const u = new URL(`${MAPS_BASE}/findplacefromtext/json`);
  u.searchParams.set('input', input);
  u.searchParams.set('inputtype', 'textquery');
  u.searchParams.set('fields', 'place_id');
  u.searchParams.set('key', key);

  const r = await fetch(u.toString());
  if (!r.ok) return null;
  const j = await r.json();
  return j.candidates?.[0]?.place_id ?? null;
}

// ── Place Details → photos ───────────────────────────────────────────────────

async function fetchPlacePhotos(placeId, key, limit) {
  const u = new URL(`${MAPS_BASE}/details/json`);
  u.searchParams.set('place_id', placeId);
  u.searchParams.set('fields', 'photos');
  u.searchParams.set('key', key);

  const r = await fetch(u.toString());
  if (!r.ok) return [];
  const j = await r.json();

  const raw = (j.result?.photos ?? []).slice(0, limit);
  return raw.map(function (p) {
    // html_attributions is an array of HTML strings like
    // ['<a href="...">Photographer Name</a>']
    // We expose both the raw HTML (for verbatim rendering) and a plain-text
    // fallback for alt text / aria labels.
    const attrHtml  = (p.html_attributions ?? []).join(', ');
    const attrText  = attrHtml.replace(/<[^>]+>/g, '').trim();
    const photographer = attrText || 'Google Maps contributor';

    return {
      ref:              p.photo_reference,
      width:            p.width,
      height:           p.height,
      photographer:     photographer,
      attribution_html: attrHtml,  // render verbatim next to the photo (ToS)
      attribution_text: attrText,  // for alt / aria
    };
  });
}
