// GET /admin/ — the owner editor, server-rendered with the site's theme.
// (No static public/admin/index.html: a static file would win over this
// route and lose the theme injection.)

import { renderAdminPage } from './lib/admin-page.mjs';

export default async () =>
  new Response(renderAdminPage(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Frame-Options': 'DENY',
    },
  });

export const config = { path: ['/admin', '/admin/', '/admin/index.html'] };
