/* Where stars live. Two stores with one shape:

     supabaseStore({ url, key, table })   the real one (service role, server only)
     memoryStore()                        tests and scripts/dev.mjs

   store.insert(row) → row        store.get(id) → row | null
   store.listVisible(limit) → rows (newest first)
   store.update(id, patch) → row | null
   store.remove(id) → boolean
   store.count({ ipHash?, emailHash?, since }) → number   (rows since an ISO time)

   The table is created by command/supabase/migrations/061_kc_stars.sql
   (schema command on the HAND project; supabase/001_kc_stars.sql is the same
   table in public, for a project of KC Collective's own: pass schema 'public'). */

import crypto from 'node:crypto';

const VISIBLE_COLUMNS = 'id,created_at,first_name,star,share_requested,message_public,message';

export function supabaseStore({ url, key, table = 'kc_stars', schema = 'command' } = {}) {
  if (!url || !key) throw new Error('stars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  const base = `${url.replace(/\/$/, '')}/rest/v1/${table}`;
  const headers = (extra = {}) => ({
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Accept-Profile': schema,
    'Content-Profile': schema,
    ...extra,
  });

  async function call(query, { method = 'GET', body, prefer } = {}) {
    const res = await fetch(`${base}${query}`, {
      method,
      headers: headers(prefer ? { Prefer: prefer } : {}),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      // Never pass the database's words to the visitor; they name columns and hints.
      throw Object.assign(new Error(`supabase ${method} ${table} → ${res.status}: ${detail.slice(0, 300)}`), { status: 500 });
    }
    return res;
  }
  const eq = (v) => `eq.${encodeURIComponent(v)}`;

  return {
    async insert(row) {
      const res = await call('', { method: 'POST', body: row, prefer: 'return=representation' });
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    },
    async get(id) {
      const res = await call(`?id=${eq(id)}&select=*&limit=1`);
      const data = await res.json();
      return data[0] || null;
    },
    async listVisible(limit = 300) {
      const res = await call(`?status=eq.visible&select=${VISIBLE_COLUMNS}&order=created_at.desc&limit=${Math.max(1, Math.min(1000, limit))}`);
      return res.json();
    },
    async update(id, patch) {
      const res = await call(`?id=${eq(id)}`, { method: 'PATCH', body: patch, prefer: 'return=representation' });
      const data = await res.json();
      return data[0] || null;
    },
    async remove(id) {
      const res = await call(`?id=${eq(id)}`, { method: 'DELETE', prefer: 'return=representation' });
      const data = await res.json();
      return data.length > 0;
    },
    async count({ ipHash, emailHash, since }) {
      let q = `?select=id&created_at=gte.${encodeURIComponent(since)}&limit=1`;
      if (ipHash) q += `&ip_hash=${eq(ipHash)}`;
      if (emailHash) q += `&email_hash=${eq(emailHash)}`;
      const res = await call(q, { prefer: 'count=exact' });
      // Content-Range: "0-0/7" or "*/0"
      const total = Number(String(res.headers.get('content-range') || '').split('/')[1]);
      return Number.isFinite(total) ? total : 0;
    },
  };
}

export function memoryStore(seed = []) {
  let rows = seed.map((r) => ({ ...r }));
  const copy = (r) => (r ? JSON.parse(JSON.stringify(r)) : null);
  return {
    rows: () => rows.map(copy),
    async insert(row) {
      const full = { id: crypto.randomUUID(), created_at: new Date().toISOString(), status: 'visible', message_public: false, ...row };
      rows = [...rows, full];
      return copy(full);
    },
    async get(id) {
      return copy(rows.find((r) => r.id === id));
    },
    async listVisible(limit = 300) {
      return rows.filter((r) => r.status === 'visible').sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, limit).map(copy);
    },
    async update(id, patch) {
      let out = null;
      rows = rows.map((r) => (r.id === id ? (out = { ...r, ...patch }) : r));
      return copy(out);
    },
    async remove(id) {
      const before = rows.length;
      rows = rows.filter((r) => r.id !== id);
      return rows.length < before;
    },
    async count({ ipHash, emailHash, since }) {
      return rows.filter((r) => r.created_at >= since && (!ipHash || r.ip_hash === ipHash) && (!emailHash || r.email_hash === emailHash)).length;
    },
  };
}
