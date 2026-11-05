// Loads the site document + media from Supabase, falling back to defaults so
// the page always renders (even with no database configured, e.g. local
// preview).

import { CONTENT_KEY, DEFAULT_CONTENT, sanitizeContent } from './schema.mjs';
import { dbConfigured, publicObjectUrl, sb } from './db.mjs';

export const IMAGE_WIDTHS = [480, 800, 1200, 1600, 2000];

// Mirrors the 15 seeded placeholder rows in migration 043 so a database-less
// render shows the same gallery.
const PLACEHOLDER_DIMS = [
  [1200, 1500, 'Portraits'], [1600, 1000, 'Events'], [1200, 1200, 'Portraits'], [1200, 1600, 'Brand'],
  [1600, 1200, 'Events'], [1200, 1500, 'Portraits'], [1600, 900, 'Brand'], [1200, 1200, 'Portraits'],
  [1200, 1600, 'Events'], [1600, 1200, 'Brand'], [1200, 1500, 'Portraits'], [1200, 1200, 'Events'],
  [1600, 1000, 'Brand'], [1200, 1600, 'Portraits'], [1600, 1200, 'Events'],
];

export function placeholderMedia() {
  return PLACEHOLDER_DIMS.map(([width, height, category], i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      id: `00000000-0000-4000-8000-0000000000${n}`,
      sort: (i + 1) * 10,
      path: `/img/placeholder/ph-${n}.svg`,
      is_placeholder: true,
      alt: `Placeholder image ${i + 1}`,
      caption: '',
      category,
      featured: i === 0,
      width,
      height,
      mime: 'image/svg+xml',
    };
  });
}

function imageCdn(url, w) {
  return `/.netlify/images?url=${encodeURIComponent(url)}&w=${w}&q=78&fm=webp`;
}

// Adds the URLs the page needs. Placeholders are site-relative SVGs (no
// resizing); uploads are served through the Netlify Image CDN.
export function toView(row) {
  const isLocal = row.is_placeholder || row.path.startsWith('/');
  const original = isLocal ? row.path : publicObjectUrl(row.path);
  const width = Number(row.width) || 1200;
  const height = Number(row.height) || 900;
  const view = {
    id: row.id,
    alt: row.alt || '',
    caption: row.caption || '',
    category: row.category || '',
    featured: Boolean(row.featured),
    is_placeholder: Boolean(row.is_placeholder),
    width,
    height,
    original,
    src: original,
    srcset: '',
    full: original,
  };
  if (!isLocal) {
    const widths = IMAGE_WIDTHS.filter((w) => w <= Math.max(width, 480));
    view.src = imageCdn(original, 1200);
    view.srcset = widths.map((w) => `${imageCdn(original, w)} ${w}w`).join(', ');
    view.full = imageCdn(original, 2000);
  }
  return view;
}

export async function loadSite() {
  if (!dbConfigured()) {
    return { content: sanitizeContent(DEFAULT_CONTENT), media: placeholderMedia(), source: 'defaults' };
  }
  const [rows, mediaRows] = await Promise.all([
    sb(`/zeroblur_content?key=eq.${CONTENT_KEY}&select=value,updated_at`),
    sb('/zeroblur_media?select=*&order=sort.asc,created_at.asc'),
  ]);
  const content = rows && rows[0] ? sanitizeContent(rows[0].value) : sanitizeContent(DEFAULT_CONTENT);
  const media = mediaRows && mediaRows.length ? mediaRows : placeholderMedia();
  return { content, media, source: rows && rows[0] ? 'db' : 'defaults', updated_at: rows && rows[0] ? rows[0].updated_at : null };
}
