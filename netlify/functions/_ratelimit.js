// Durable rate limiter for Netlify Functions, backed by command.rate_take
// (migration 057). One hit per call; returns whether the caller is under the
// limit for (bucket, key) over the last `windowSeconds`.
//
//   const { take, hashKey } = require('./_ratelimit.js');
//   const r = await take('feedback:ip', hashKey(ip), 600, 5);
//   if (r.ok && !r.allowed) → over the limit
//   if (!r.ok)              → limiter unreachable; caller decides open/closed
//
// Keys should be hashed (hashKey) so raw IPs / text never land in the table.
// Never throws. Underscore prefix keeps Netlify from deploying it as an endpoint.

const crypto = require('crypto');

function hashKey(input) {
  return crypto.createHash('sha256').update(String(input == null ? '' : input)).digest('hex').slice(0, 40);
}

async function take(bucket, key, windowSeconds, limit) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { ok: false, reason: 'ratelimit-unconfigured' };

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/rate_take`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'command',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        p_bucket: bucket,
        p_key: key,
        p_window_seconds: windowSeconds,
        p_limit: limit,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn('[ratelimit] rate_take failed', res.status, body.slice(0, 200));
      return { ok: false, reason: `ratelimit-${res.status}` };
    }
    const allowed = await res.json();
    return { ok: true, allowed: allowed === true };
  } catch (err) {
    console.warn('[ratelimit] rate_take threw', err && err.message);
    return { ok: false, reason: 'ratelimit-network' };
  }
}

module.exports = { take, hashKey };
