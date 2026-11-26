// GET / — server-renders the home page from the database. Cached at the CDN
// (tag = config.cacheTag) and purged whenever the owner publishes. The whole
// pipeline is lib/render.mjs; page.mjs serves a multi-page pack's other routes.

import { renderRoute } from './lib/render.mjs';

export default (req) => renderRoute(req);

export const config = { path: ['/', '/index.html'] };
