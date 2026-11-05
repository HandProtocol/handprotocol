// Renders the home page with default content + placeholders into
// dist-preview/ (no database needed) for local design review.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage } from '../netlify/functions/lib/page.mjs';
import { placeholderMedia } from '../netlify/functions/lib/content.mjs';
import { DEFAULT_CONTENT, sanitizeContent } from '../netlify/functions/lib/schema.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-preview');
mkdirSync(out, { recursive: true });
cpSync(join(root, 'public'), out, { recursive: true });
const html = renderPage({ content: sanitizeContent(DEFAULT_CONTENT), media: placeholderMedia(), origin: 'http://127.0.0.1:8787' });
writeFileSync(join(out, 'index.html'), html);
console.log(`preview written to ${out} — serve with: python3 -m http.server 8787 -d dist-preview`);
