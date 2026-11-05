// GET /api/content — the current document, media, the editing schema, and
// the site identity (name, logo, theme) the admin brands itself with. Read by
// the admin UI, and by anyone: the route is public. A visitor gets what the
// page shows; fields the schema marks `private: true` (an owner's day-off
// note) only go to a signed-in editor. Responses are no-store (lib/http.mjs
// json()), so an editor's copy is never replayed to a visitor.

import { loadSite, toView } from './lib/content.mjs';
import { SECTIONS, schemaForClient } from './lib/site.mjs';
import { publicContent } from './lib/sanitize.mjs';
import { currentEditor, json, handleError } from './lib/http.mjs';

// Which document this viewer reads. An editor gets the stored object as is:
// the admin PATCHes whole lists back, so a stripped copy would erase the
// private columns on the next save.
export function contentForViewer(content, editor, sections = SECTIONS) {
  return editor ? { viewer: 'editor', content } : { viewer: 'public', content: publicContent(sections, content) };
}

export default async (req) => {
  if (req.method !== 'GET') return json(405, { ok: false, error: 'GET only' });
  try {
    // No cookie → no database call. A failed lookup is not caught on purpose:
    // falling back to the public copy would hand a signed-in editor a stripped
    // document to save over the real one. A 500 is the safe answer.
    const editor = await currentEditor(req);
    const { content, media, source, updated_at, site } = await loadSite();
    return json(200, {
      ok: true,
      ...contentForViewer(content, editor),
      media: media.map((row) => ({ ...row, view: toView(row) })),
      schema: schemaForClient(),
      site,
      source,
      updated_at,
    });
  } catch (err) {
    return handleError(err);
  }
};

export const config = { path: '/api/content' };
