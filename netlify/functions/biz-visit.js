// Receives the demo-site visit beacon (web/assets/demo-visit.js) and persists it
// to command.biz_visits via the service role, so the Command Center and the
// gated /demos portfolio can show who viewed a generated site. Best-effort and
// fire-and-forget: the client uses navigator.sendBeacon, so we always 204 fast
// and never surface errors to the visitor.
//
// Env vars (Netlify dashboard → Site settings → Environment):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY                — persist the visit
//   TELEGRAM_BOT_TOKEN, FORUM_GROUP_ID, ACTIVITY_TOPIC_ID  — optional ping

const { notify, escapeHtml } = require('./_telegram.js');

const BOT_RE = /bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegrambot|preview|headless|lighthouse|pingdom|monitor|uptime/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/i;

function noContent() {
  return {
    statusCode: 204,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: '',
  };
}

function clip(s, max) {
  const v = (s == null ? '' : String(s)).trim();
  return v.length > max ? v.slice(0, max) : v;
}

function decodeGeo(header) {
  if (!header) return { city: '', country: '' };
  try {
    const geo = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
    return {
      city: geo.city || '',
      country: (geo.country && (geo.country.name || geo.country.code)) || '',
    };
  } catch (_) {
    return { city: '', country: '' };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return noContent();
  if (event.httpMethod !== 'POST') return noContent();

  const headers = event.headers || {};
  const ua = headers['user-agent'] || '';
  if (BOT_RE.test(ua)) return noContent();

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return noContent();
  }

  const slug = clip(body.slug, 120);
  if (!slug || !SLUG_RE.test(slug)) return noContent();
  const kind = body.kind === 'pitch' ? 'pitch' : 'demo';

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('biz-visit: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return noContent();
  }

  const restBase = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  const baseHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  const { city, country } = decodeGeo(headers['x-nf-geo']);

  // Resolve the lead id + name from the slug (best effort).
  let leadId = null;
  let leadName = slug;
  try {
    const lookup = await fetch(
      `${restBase}/biz_leads?slug=eq.${encodeURIComponent(slug)}&select=id,name`,
      { headers: { ...baseHeaders, 'Accept-Profile': 'command' } }
    );
    if (lookup.ok) {
      const rows = await lookup.json().catch(() => []);
      if (Array.isArray(rows) && rows[0]) {
        leadId = rows[0].id || null;
        leadName = rows[0].name || slug;
      }
    }
  } catch (err) {
    console.error('biz-visit lead lookup failed', err);
  }

  const row = {
    lead_id: leadId,
    lead_slug: slug,
    kind,
    path: clip(body.path, 240) || `/demos/${slug}/`,
    referrer: clip(body.ref, 400) || null,
    country: country || null,
    city: city || null,
    ua: clip(ua, 240) || null,
  };

  try {
    const res = await fetch(`${restBase}/biz_visits`, {
      method: 'POST',
      headers: { ...baseHeaders, 'Content-Profile': 'command', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('biz-visit insert failed', { status: res.status, detail });
      return noContent();
    }
  } catch (err) {
    console.error('biz-visit insert error', err);
    return noContent();
  }

  // Best-effort real-time ping. The client dedups per session, so this fires
  // once per new viewer, not on every page event.
  try {
    await notify('activity', {
      title: `👀 Demo visit · ${escapeHtml(leadName)}`,
      lines: [
        `<code>/demos/${escapeHtml(slug)}/</code>`,
        city || country ? `📍 ${escapeHtml([city, country].filter(Boolean).join(', '))}` : '',
        row.referrer ? `↩ ${escapeHtml(row.referrer)}` : '',
      ].filter(Boolean),
    });
  } catch (_) {
    // Telegram is optional; never block the beacon.
  }

  return noContent();
};
