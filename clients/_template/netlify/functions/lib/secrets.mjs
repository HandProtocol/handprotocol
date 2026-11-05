// Owner-supplied secrets (today: the Stripe keys pasted in /admin/ → Payments),
// in their own table, sealed, never in the content document. The content
// document is served whole to every editor, kept in 30 revisions and cached in
// the admin's localStorage draft, so a key must never go near it.
//
// Table <prefix>_secrets (scripts/gen-migration.mjs secretsTableSql()):
//   name   'stripe'
//   value  AES-256-GCM sealed JSON, "v1.<iv>.<tag>.<ciphertext>" (base64url)
//   meta   plain, non-secret facts the admin may show (account name, mode, last 4 …)
//
// The sealing key is HKDF(<PREFIX>_SESSION_SECRET, slug, 'hand-secrets:v1'), so
// a copy of the database alone does not open a key. Rotating the session
// secret signs everyone out AND makes the stored keys unreadable: the
// Payments screen then says "reconnect Stripe" (open() returns null).
//
// Env: <PREFIX>_SESSION_SECRET, or SUPABASE_SERVICE_ROLE_KEY as the fallback
// (same order as lib/session.mjs). Neither set = nothing is stored.

import crypto from 'node:crypto';
import { config, siteEnv } from './config.mjs';
import { dbConfigured, sb } from './db.mjs';

const NAME_RE = /^[a-z][a-z0-9_]{0,39}$/;

function rootSecret() {
  return siteEnv('SESSION_SECRET') || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function secretsAvailable() {
  return Boolean(config.tables.secrets && dbConfigured() && rootSecret());
}

function sealingKey(root = rootSecret()) {
  return Buffer.from(crypto.hkdfSync('sha256', root, config.slug, 'hand-secrets:v1', 32));
}

export function seal(value, root = rootSecret()) {
  if (!root) throw Object.assign(new Error('This site has no session secret, so it cannot store keys. Ask HAND.'), { status: 503 });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sealingKey(root), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}

// null when the box does not open (tampered, or the session secret changed).
export function open(sealed, root = rootSecret()) {
  const parts = String(sealed || '').split('.');
  if (parts.length !== 4 || parts[0] !== 'v1' || !root) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', sealingKey(root), Buffer.from(parts[1], 'base64url'));
    decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));
    const text = Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function checkName(name) {
  if (!NAME_RE.test(String(name || ''))) throw new Error(`secrets: bad name ${JSON.stringify(name)}`);
  return name;
}

// { value, meta, updated_at } | { value: null, meta, unreadable: true } | null
export async function readSecret(name) {
  if (!secretsAvailable()) return null;
  const rows = await sb(`/{secrets}?name=eq.${checkName(name)}&select=value,meta,updated_at`);
  const row = rows && rows[0];
  if (!row) return null;
  const value = open(row.value);
  return value === null ? { value: null, meta: row.meta || {}, updated_at: row.updated_at, unreadable: true } : { value, meta: row.meta || {}, updated_at: row.updated_at };
}

export async function writeSecret(name, value, meta = {}, editor = null) {
  if (!secretsAvailable()) throw Object.assign(new Error('Keys cannot be stored on this site yet. Ask HAND to finish its setup.'), { status: 503 });
  await sb('/{secrets}', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: { name: checkName(name), value: seal(value), meta, updated_at: new Date().toISOString(), updated_by: editor ? editor.id : null },
  });
}

export async function deleteSecret(name) {
  if (!secretsAvailable()) return;
  await sb(`/{secrets}?name=eq.${checkName(name)}`, { method: 'DELETE', prefer: 'return=minimal' });
}
