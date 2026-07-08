// Page-visit beacon receiver. The client (web/assets/visit-beacon.js) fires a
// navigator.sendBeacon POST once per browser session per high-value page; this
// function validates the path against an allowlist, filters obvious crawlers,
// persists the visit to command.public_visits, and posts a one-line note into
// the Telegram Activity topic.
//
// Best-effort and non-blocking: the beacon is fire-and-forget, so we always
// 204 quickly and never surface errors to the visitor.
//
// Env vars (Netlify dashboard, Site settings, Environment):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY                persist the visit
//   TELEGRAM_BOT_TOKEN, FORUM_GROUP_ID, ACTIVITY_TOPIC_ID  optional ping

const { notify, escapeHtml } = require('./_telegram.js');

const ALLOWED_PATHS = new Set([
  '/',
  '/donate-crypto/',
  '/deck/',
  '/governance/',
  '/sovereign-reciprocates/',
]);

const PAGE_LABELS = {
  '/': 'Foundation campaign',
  '/donate-crypto/': 'Crypto donation',
  '/deck/': 'Pitch deck',
  '/governance/': 'Governance',
  '/sovereign-reciprocates/': 'Sovereign Reciprocates',
};

const BOT_RE = /bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegrambot|preview|headless|lighthouse|pingdom|monitor|uptime/i;

function noContent() {
  return {
    statusCode: 204,
    headers: corsHeaders(),
    body: '',
  };
}

function corsHeaders() {
  return {
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function clip(input, max) {
  const value = String(input || '').trim();
  return value.length > max ? value.slice(0, max) : value;
}

function normalizePath(raw) {
  let p = String(raw || '').trim();
  if (!p.startsWith('/')) return '';
  p = p.split('?')[0].split('#')[0];
  if (p === '/foundation-campaign' || p === '/foundation-campaign/') return '/';
  if (!p.endsWith('/')) p += '/';
  return p;
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

async function persistVisit(row) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/public_visits`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'command',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('visit insert failed', { status: res.status, detail: detail.slice(0, 300) });
    }
  } catch (err) {
    console.error('visit insert error', err);
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

  const path = normalizePath(body.path);
  if (!ALLOWED_PATHS.has(path)) return noContent();

  const { city, country } = decodeGeo(headers['x-nf-geo']);
  const ip = headers['x-nf-client-connection-ip'] || headers['x-forwarded-for'] || '';
  const ref = clip(body.ref, 400);

  await persistVisit({
    page_path: path,
    page_label: PAGE_LABELS[path] || path,
    page_title: clip(body.title, 180) || null,
    referrer: ref || null,
    country: country || null,
    city: city || null,
    ua: clip(ua, 240) || null,
  });

  try {
    await notify('activity', {
      title: `👀 Visit · ${escapeHtml(PAGE_LABELS[path] || path)}`,
      lines: [
        `<code>${escapeHtml(path)}</code>`,
        city || country ? `📍 ${escapeHtml([city, country].filter(Boolean).join(', '))}` : '',
        ref ? `↩ ${escapeHtml(ref)}` : '',
        ip ? `<i>${escapeHtml(String(ip).split(',')[0].trim())}</i>` : '',
        ua ? `<i>${escapeHtml(ua.slice(0, 160))}</i>` : '',
      ].filter(Boolean),
    });
  } catch (_) {
    // Telegram is optional; never block the beacon.
  }

  return noContent();
};
