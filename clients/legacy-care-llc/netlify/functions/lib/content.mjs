// Loads the site document + media from Supabase, falling back to defaults so
// the page always renders (even with no database configured, e.g. local
// preview).

import { config, seedMedia } from './config.mjs';
import { CONTENT_KEY, DEFAULT_CONTENT, sanitize } from './site.mjs';
import { dbConfigured, publicObjectUrl, sb } from './db.mjs';

export const IMAGE_WIDTHS = [480, 800, 1200, 1600, 2000];

export { seedMedia };

function imageCdn(url, w) {
  return `/.netlify/images?url=${encodeURIComponent(url)}&w=${w}&q=78&fm=webp`;
}

// Adds the URLs the page needs (src, srcset, full).
export function toView(row) {
  const isLocal = row.is_placeholder || row.path.startsWith('/');
  const original = isLocal ? row.path : publicObjectUrl(row.path);
  const width = Number(row.width) || 1200;
  const height = Number(row.height) || 900;
  // SVGs are served as-is. Raster files (uploads, or photos shipped with the
  // site under public/img) go through the Image CDN, which also accepts
  // site-relative paths. SITE_STATIC_PREVIEW=1 (render-static) has no CDN.
  const resizable = !/\.svg$/i.test(row.path) && !process.env.SITE_STATIC_PREVIEW;
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
  if (resizable) {
    const widths = IMAGE_WIDTHS.filter((w) => w <= Math.max(width, 480));
    view.src = imageCdn(original, Math.min(1200, Math.max(width, 480)));
    view.srcset = widths.map((w) => `${imageCdn(original, w)} ${w}w`).join(', ');
    view.full = imageCdn(original, Math.min(2000, Math.max(width, 480)));
  }
  return view;
}

export async function loadSite() {
  if (!dbConfigured()) {
    return { content: sanitize(DEFAULT_CONTENT), media: seedMedia(), source: 'defaults', updated_at: null, site: siteInfo() };
  }
  const [rows, mediaRows] = await Promise.all([
    sb(`/{content}?key=eq.${CONTENT_KEY}&select=value,updated_at`),
    sb('/{media}?select=*&order=sort.asc,created_at.asc'),
  ]);
  const content = rows && rows[0] ? sanitize(rows[0].value) : sanitize(DEFAULT_CONTENT);
  const media = mediaRows && mediaRows.length ? mediaRows : seedMedia();
  return {
    content,
    media,
    source: rows && rows[0] ? 'db' : 'defaults',
    updated_at: rows && rows[0] ? rows[0].updated_at : null,
    site: siteInfo(),
  };
}

// What the admin needs to brand itself. Safe to expose (it is on the page).
export function siteInfo() {
  return { slug: config.slug, name: config.name, logo: config.logo, theme: config.theme, assetVersion: config.assetVersion };
}
