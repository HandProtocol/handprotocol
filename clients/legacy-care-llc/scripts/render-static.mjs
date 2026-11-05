// Renders the home page (default content + seed media) and the admin shell
// (login view) into dist-preview/ for local design review. No database.
//
//   node scripts/render-static.mjs && python3 -m http.server 8787 -d dist-preview
//   node scripts/render-static.mjs --theme=<id>        # packs with runtime themes: render ?theme=<id> into dist-preview/<id>/
//   node scripts/render-static.mjs --out=<dir>

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
process.env.SITE_STATIC_PREVIEW = '1'; // no Image CDN in a static preview
const { seedMedia } = await import('../netlify/functions/lib/config.mjs');
const { DEFAULT_CONTENT, renderPage, sanitize } = await import('../netlify/functions/lib/site.mjs');
const { renderAdminPage } = await import('../netlify/functions/lib/admin-page.mjs');

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const theme = arg('theme');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = arg('out') ? join(root, arg('out')) : join(root, 'dist-preview');
const origin = 'http://127.0.0.1:8787';
mkdirSync(out, { recursive: true });
cpSync(join(root, 'public'), out, { recursive: true });
const html = renderPage({ content: sanitize(DEFAULT_CONTENT), media: seedMedia(), origin, url: theme ? `${origin}/?theme=${encodeURIComponent(theme)}` : undefined });
const target = theme ? join(out, theme) : out;
mkdirSync(target, { recursive: true });
writeFileSync(join(target, 'index.html'), html);
mkdirSync(join(out, 'admin'), { recursive: true });
writeFileSync(join(out, 'admin', 'index.html'), renderAdminPage()); // login view only (no API locally)
console.log(`preview written to ${target} — serve with: python3 -m http.server 8787 -d ${out}`);
