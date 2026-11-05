// GET /api/content — the current document, media, and the editing schema.
// Read by the admin UI. Safe to expose: it is exactly what the page shows.

import { loadSite, toView } from './lib/content.mjs';
import { schemaForClient } from './lib/schema.mjs';
import { json, handleError } from './lib/http.mjs';

export default async (req) => {
  if (req.method !== 'GET') return json(405, { ok: false, error: 'GET only' });
  try {
    const { content, media, source, updated_at } = await loadSite();
    return json(200, {
      ok: true,
      content,
      media: media.map((row) => ({ ...row, view: toView(row) })),
      schema: schemaForClient(),
      source,
      updated_at,
    });
  } catch (err) {
    return handleError(err);
  }
};

export const config = { path: '/api/content' };
