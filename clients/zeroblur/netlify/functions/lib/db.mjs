// Supabase REST + Storage helpers for the ZeroBlur functions. Service role
// only; these never run in the browser.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export const BUCKET = 'zeroblur';
const SCHEMA = 'command';

function env(name) {
  return process.env[name] || '';
}

export function supabaseUrl() {
  return env('SUPABASE_URL').replace(/\/$/, '');
}

export function dbConfigured() {
  return Boolean(env('SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY'));
}

function authHeaders(extra = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

export async function sb(path, { method = 'GET', body, prefer } = {}) {
  const headers = authHeaders({
    'Content-Type': 'application/json',
    'Accept-Profile': SCHEMA,
    'Content-Profile': SCHEMA,
  });
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${supabaseUrl()}/rest/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`supabase ${method} ${path} → ${res.status}: ${detail.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

// --- storage -------------------------------------------------------------

export function publicObjectUrl(path) {
  return `${supabaseUrl()}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

// Mints a signed upload URL the browser can PUT the file to directly, so big
// photos never pass through the function's 6 MB body limit.
export async function createSignedUpload(path) {
  const res = await fetch(`${supabaseUrl()}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: '{}',
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`storage sign ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  // data.url is relative to the storage API root, e.g.
  // /object/upload/sign/zeroblur/uploads/x.jpg?token=… — concatenate, do not
  // URL-resolve (a leading slash would discard the /storage/v1 prefix).
  const url = `${supabaseUrl()}/storage/v1${data.url.startsWith('/') ? '' : '/'}${data.url}`;
  const token = new URL(url).searchParams.get('token');
  return { uploadUrl: url, token };
}

// True when the object is actually in the bucket (used before registering a
// media row so a failed browser upload never leaves a broken gallery tile).
export async function objectExists(path) {
  const res = await fetch(publicObjectUrl(path), { method: 'HEAD' });
  return res.ok;
}

export async function deleteObjects(paths) {
  if (!paths.length) return;
  const res = await fetch(`${supabaseUrl()}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.warn(`storage delete ${res.status}: ${detail.slice(0, 200)}`);
  }
}

// --- cache purge -----------------------------------------------------------

// Netlify injects NETLIFY_PURGE_API_TOKEN + SITE_ID into the functions
// runtime. Best effort: the CDN entry also expires on its own (s-maxage).
export async function purgeSiteCache() {
  const token = env('NETLIFY_PURGE_API_TOKEN');
  const siteId = env('SITE_ID');
  if (!token || !siteId) return { ok: false, reason: 'purge-unconfigured' };
  try {
    const res = await fetch('https://api.netlify.com/api/v1/purge', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, cache_tags: ['zeroblur'] }),
    });
    if (!res.ok) {
      console.warn(`purge failed ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
      return { ok: false, reason: `purge-${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.warn('purge threw:', err && err.message);
    return { ok: false, reason: 'purge-network' };
  }
}
