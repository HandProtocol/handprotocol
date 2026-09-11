// Editing API (session cookie required; see auth.mjs).
//
//   PUT    /api/admin/content                  { content } → publish copy
//   GET    /api/admin/revisions                → last 30 content snapshots
//   POST   /api/admin/revisions/:id/restore    → publish an old snapshot
//   POST   /api/admin/media/upload-url         { name, type, size } → signed upload
//   POST   /api/admin/media                    register an uploaded object
//   PATCH  /api/admin/media/:id                { alt, caption, category, featured }
//   POST   /api/admin/media/:id/replace        swap in a new uploaded object, keep the slot
//   DELETE /api/admin/media/:id
//   PUT    /api/admin/media/order              { ids }
//   POST   /api/admin/media/remove-placeholders
//   GET    /api/admin/editors                  (owner) list
//   POST   /api/admin/editors                  (owner) { email, role }
//   DELETE /api/admin/editors/:id              (owner)
//
// Every successful write purges the CDN cache for the home page.

import crypto from 'node:crypto';
import { createSignedUpload, deleteObjects, objectExists, purgeSiteCache, sb } from './lib/db.mjs';
import { CONTENT_KEY, sanitize } from './lib/site.mjs';
import { loadSite, toView } from './lib/content.mjs';
import { handleError, json, readJson, requireEditor, sameOrigin } from './lib/http.mjs';

const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' };
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UPLOAD_PATH_RE = /^uploads\/[0-9a-f-]{36}\.(jpg|png|webp|avif|gif)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clip(v, max) {
  const s = v == null ? '' : String(v).trim();
  return s.length > max ? s.slice(0, max) : s;
}

async function publishContent(editor, content, kind = 'content') {
  const stored = await sb(`/{content}?key=eq.${CONTENT_KEY}&select=value`);
  const base = stored && stored[0] ? stored[0].value : undefined;
  const clean = sanitize(content, base ? sanitize(base) : undefined);
  await sb('/{content}', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: { key: CONTENT_KEY, value: clean, updated_at: new Date().toISOString(), updated_by: editor.id },
  });
  await sb('/{revisions}', {
    method: 'POST',
    prefer: 'return=minimal',
    body: { editor_id: editor.id, kind, snapshot: clean },
  }).catch((err) => console.warn('revision insert failed:', err.message));
  return clean;
}

async function withPurge(result) {
  const purge = await purgeSiteCache();
  return { ...result, purged: purge.ok };
}

// --- media -----------------------------------------------------------------

async function uploadUrl(req) {
  const body = await readJson(req, 4096);
  const type = String(body.type || '');
  const ext = ALLOWED_TYPES[type];
  if (!ext) return json(400, { ok: false, error: 'Use a JPG, PNG, WebP, AVIF, or GIF image' });
  const size = Number(body.size) || 0;
  if (size > MAX_UPLOAD_BYTES) return json(400, { ok: false, error: 'Images must be under 15 MB' });
  const id = crypto.randomUUID();
  const path = `uploads/${id}.${ext}`;
  const signed = await createSignedUpload(path);
  return json(200, { ok: true, id, path, uploadUrl: signed.uploadUrl, token: signed.token });
}

async function registerMedia(req, editor) {
  const body = await readJson(req, 8192);
  const path = String(body.path || '');
  if (!UPLOAD_PATH_RE.test(path)) return json(400, { ok: false, error: 'Bad path' });
  if (!(await objectExists(path))) return json(400, { ok: false, error: 'The upload did not finish. Try that photo again.' });
  const existing = await sb('/{media}?select=sort&order=sort.desc&limit=1');
  const sort = existing && existing[0] ? Number(existing[0].sort) + 10 : 10;
  const rows = await sb('/{media}', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      path,
      is_placeholder: false,
      alt: clip(body.alt, 160),
      caption: clip(body.caption, 160),
      category: clip(body.category, 40),
      featured: false,
      width: Number(body.width) || null,
      height: Number(body.height) || null,
      bytes: Number(body.bytes) || null,
      mime: clip(body.mime, 40) || null,
      sort,
    },
  });
  const row = rows && rows[0];
  return json(200, await withPurge({ ok: true, media: { ...row, view: toView(row) } }));
}

// Swap a new photo into an existing slot: position, caption, category, and
// featured flag stay; the old file is removed from storage.
async function replaceMedia(req, id, editor) {
  const body = await readJson(req, 8192);
  const path = String(body.path || '');
  if (!UPLOAD_PATH_RE.test(path)) return json(400, { ok: false, error: 'Bad path' });
  if (!(await objectExists(path))) return json(400, { ok: false, error: 'The upload did not finish. Try that photo again.' });
  const current = await sb(`/{media}?id=eq.${id}&select=*`);
  const row = current && current[0];
  if (!row) return json(404, { ok: false, error: 'Image not found' });
  await snapshotMedia(editor);
  const patch = {
    path,
    is_placeholder: false,
    width: Number(body.width) || null,
    height: Number(body.height) || null,
    bytes: Number(body.bytes) || null,
    mime: clip(body.mime, 40) || null,
    updated_at: new Date().toISOString(),
  };
  if ('alt' in body) patch.alt = clip(body.alt, 160);
  const rows = await sb(`/{media}?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation', body: patch });
  const updated = rows && rows[0];
  if (!row.is_placeholder && !row.path.startsWith('/') && row.path !== path) await deleteObjects([row.path]);
  return json(200, await withPurge({ ok: true, media: { ...updated, view: toView(updated) } }));
}

async function patchMedia(req, id) {
  const body = await readJson(req, 8192);
  const patch = { updated_at: new Date().toISOString() };
  if ('alt' in body) patch.alt = clip(body.alt, 160);
  if ('caption' in body) patch.caption = clip(body.caption, 160);
  if ('category' in body) patch.category = clip(body.category, 40);
  if ('featured' in body) patch.featured = Boolean(body.featured);
  if (patch.featured) {
    await sb('/{media}?featured=eq.true', { method: 'PATCH', prefer: 'return=minimal', body: { featured: false } });
  }
  const rows = await sb(`/{media}?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation', body: patch });
  const row = rows && rows[0];
  if (!row) return json(404, { ok: false, error: 'Image not found' });
  return json(200, await withPurge({ ok: true, media: { ...row, view: toView(row) } }));
}

async function deleteMedia(id) {
  const rows = await sb(`/{media}?id=eq.${id}`, { method: 'DELETE', prefer: 'return=representation' });
  const row = rows && rows[0];
  if (!row) return json(404, { ok: false, error: 'Image not found' });
  if (!row.is_placeholder && !row.path.startsWith('/')) await deleteObjects([row.path]);
  return json(200, await withPurge({ ok: true }));
}

async function reorderMedia(req) {
  const body = await readJson(req, 64 * 1024);
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => UUID_RE.test(String(id))) : [];
  if (!ids.length) return json(400, { ok: false, error: 'No ids' });
  await Promise.all(
    ids.map((id, i) =>
      sb(`/{media}?id=eq.${id}`, { method: 'PATCH', prefer: 'return=minimal', body: { sort: (i + 1) * 10 } })
    )
  );
  return json(200, await withPurge({ ok: true }));
}

async function removePlaceholders() {
  await sb('/{media}?is_placeholder=eq.true', { method: 'DELETE', prefer: 'return=minimal' });
  return json(200, await withPurge({ ok: true }));
}

async function snapshotMedia(editor) {
  const rows = await sb('/{media}?select=*&order=sort.asc');
  await sb('/{revisions}', {
    method: 'POST',
    prefer: 'return=minimal',
    body: { editor_id: editor.id, kind: 'media', snapshot: rows || [] },
  }).catch(() => {});
}

// --- editors (owner only) --------------------------------------------------

function requireOwner(editor) {
  if (editor.role !== 'owner') throw Object.assign(new Error('Owner access required'), { status: 403 });
}

async function listEditors() {
  const rows = await sb('/{editors}?select=id,email,role,created_at,last_login_at&order=created_at.asc');
  return json(200, { ok: true, editors: rows || [] });
}

async function addEditor(req, editor) {
  const body = await readJson(req, 4096);
  const email = String(body.email || '').trim().toLowerCase();
  const role = body.role === 'owner' ? 'owner' : 'editor';
  if (!EMAIL_RE.test(email) || email.length > 120) return json(400, { ok: false, error: 'Enter a valid email' });
  const existing = await sb(`/{editors}?email=ilike.${encodeURIComponent(email)}&select=id`);
  if (existing && existing.length) return json(409, { ok: false, error: 'That email can already sign in' });
  const rows = await sb('/{editors}', {
    method: 'POST',
    prefer: 'return=representation',
    body: { email, role, invited_by: editor.id },
  });
  return json(200, { ok: true, editor: rows && rows[0] });
}

async function removeEditor(id, editor) {
  if (id === editor.id) return json(400, { ok: false, error: 'You cannot remove yourself' });
  const owners = await sb('/{editors}?role=eq.owner&select=id');
  const target = await sb(`/{editors}?id=eq.${id}&select=id,role`);
  if (!target || !target[0]) return json(404, { ok: false, error: 'Not found' });
  if (target[0].role === 'owner' && owners.length <= 1) return json(400, { ok: false, error: 'Keep at least one owner' });
  await sb(`/{editors}?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
  return json(200, { ok: true });
}

// --- router ----------------------------------------------------------------

export default async (req) => {
  try {
    const editor = await requireEditor(req);
    if (req.method !== 'GET' && !sameOrigin(req)) return json(403, { ok: false, error: 'Cross-origin request blocked' });
    const url = new URL(req.url);
    const parts = url.pathname.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean);
    const [head, second, third] = parts;
    const m = req.method;

    if (head === 'content' && m === 'PUT') {
      const body = await readJson(req);
      const content = await publishContent(editor, body.content);
      return json(200, await withPurge({ ok: true, content }));
    }
    if (head === 'revisions' && !second && m === 'GET') {
      const rows = await sb(
        '/{revisions}?kind=eq.content&select=id,created_at,editor_id,editor:{editors}(email)&order=created_at.desc&limit=30'
      );
      return json(200, { ok: true, revisions: rows || [] });
    }
    if (head === 'revisions' && second && third === 'restore' && m === 'POST') {
      const rows = await sb(`/{revisions}?id=eq.${encodeURIComponent(second)}&kind=eq.content&select=snapshot`);
      if (!rows || !rows[0]) return json(404, { ok: false, error: 'Revision not found' });
      const content = await publishContent(editor, rows[0].snapshot);
      return json(200, await withPurge({ ok: true, content }));
    }

    if (head === 'media') {
      if (second === 'upload-url' && m === 'POST') return await uploadUrl(req);
      if (!second && m === 'POST') return await registerMedia(req, editor);
      if (second === 'order' && m === 'PUT') return await reorderMedia(req);
      if (second === 'remove-placeholders' && m === 'POST') {
        await snapshotMedia(editor);
        return await removePlaceholders();
      }
      if (second && UUID_RE.test(second) && third === 'replace' && m === 'POST') return await replaceMedia(req, second, editor);
      if (second && UUID_RE.test(second) && m === 'PATCH') return await patchMedia(req, second);
      if (second && UUID_RE.test(second) && m === 'DELETE') {
        await snapshotMedia(editor);
        return await deleteMedia(second);
      }
    }

    if (head === 'editors') {
      requireOwner(editor);
      if (!second && m === 'GET') return await listEditors();
      if (!second && m === 'POST') return await addEditor(req, editor);
      if (second && UUID_RE.test(second) && m === 'DELETE') return await removeEditor(second, editor);
    }

    if (head === 'site' && m === 'GET') {
      const site = await loadSite();
      return json(200, { ok: true, ...site });
    }

    return json(404, { ok: false, error: 'Unknown endpoint' });
  } catch (err) {
    return handleError(err);
  }
};

export const config = { path: '/api/admin/*' };
