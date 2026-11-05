// Renders the home page (default content + seed media) and the admin shell
// (login view) into dist-preview/ for local design review. No database.
//
//   node scripts/render-static.mjs && python3 -m http.server 8787 -d dist-preview

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
process.env.SITE_STATIC_PREVIEW = '1'; // no Image CDN in a static preview
const { seedMedia } = await import('../netlify/functions/lib/config.mjs');
const { DEFAULT_CONTENT, renderPage, sanitize } = await import('../netlify/functions/lib/site.mjs');
const { renderAdminPage } = await import('../netlify/functions/lib/admin-page.mjs');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-preview');
mkdirSync(out, { recursive: true });
cpSync(join(root, 'public'), out, { recursive: true });
const html = renderPage({ content: sanitize(DEFAULT_CONTENT), media: seedMedia(), origin: 'http://127.0.0.1:8787' });
writeFileSync(join(out, 'index.html'), html);
mkdirSync(join(out, 'admin'), { recursive: true });
writeFileSync(join(out, 'admin', 'index.html'), renderAdminPage()); // login view only (no API locally)
console.log(`preview written to ${out} — serve with: python3 -m http.server 8787 -d dist-preview`);
