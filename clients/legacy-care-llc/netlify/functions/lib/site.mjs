// The bridge between the engine and the site pack. Engine code imports the
// pack ONLY through here, so a pack is exactly three files:
//   site.config.mjs   identity + theme      (via ./config.mjs)
//   site/schema.mjs   SECTIONS + DEFAULT_CONTENT + CONTENT_KEY
//   site/page.mjs     renderPage({ content, media, origin })

import { CONTENT_KEY, DEFAULT_CONTENT, SECTIONS } from '../../../site/schema.mjs';
import { renderPage } from '../../../site/page.mjs';
import { assertSections, sanitizeContent } from './sanitize.mjs';

assertSections(SECTIONS);

export { CONTENT_KEY, DEFAULT_CONTENT, SECTIONS, renderPage };

// sanitize(input) → complete document, falling back to the defaults.
// sanitize(input, base) → falling back to `base` (the stored document).
export function sanitize(input, base = DEFAULT_CONTENT) {
  return sanitizeContent(SECTIONS, input, base);
}

// Public description of the schema for the admin UI.
export function schemaForClient() {
  return SECTIONS;
}
