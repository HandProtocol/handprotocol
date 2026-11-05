// The bridge between the engine and the site pack. Engine code imports the
// pack ONLY through here, so a pack is exactly three files:
//   site.config.mjs   identity + theme      (via ./config.mjs)
//   site/schema.mjs   SECTIONS + DEFAULT_CONTENT + CONTENT_KEY
//   site/page.mjs     renderPage({ content, media, origin })

import { CONTENT_KEY, DEFAULT_CONTENT as PACK_DEFAULTS, SECTIONS as PACK_SECTIONS } from '../../../site/schema.mjs';
import { renderPage } from '../../../site/page.mjs';
import { assertSections, sanitizeContent } from './sanitize.mjs';
import { checklistSection } from './checklist.mjs';
import { BOOKING } from './config.mjs';
import { SECTION_KEY as BOOKING_SECTION, bookingDefaults, bookingSection } from './booking.mjs';

// The pack's sections plus the engine's own: the booking calendar settings
// (config.booking in request mode; visible in the Content tab, engine keys)
// and the Setup checklist (one toggle per item in config.checklist, hidden
// from the Content tab, ticked from the Setup tab). Both live in the content
// document, so they follow the owner across phone and desktop.
const setup = checklistSection();
const calendar = BOOKING ? bookingSection() : null;
export const SECTIONS = [...PACK_SECTIONS, ...(calendar ? [calendar] : []), ...(setup ? [setup] : [])];
assertSections(SECTIONS);

// The pack's defaults plus the calendar's (engine defaults, then
// config.booking.defaults). A pack never carries engine keys.
export const DEFAULT_CONTENT = calendar ? { ...PACK_DEFAULTS, [BOOKING_SECTION]: bookingDefaults(BOOKING.defaults) } : PACK_DEFAULTS;

export { CONTENT_KEY, renderPage };

// sanitize(input) → complete document, falling back to the defaults.
// sanitize(input, base) → falling back to `base` (the stored document).
export function sanitize(input, base = DEFAULT_CONTENT) {
  return sanitizeContent(SECTIONS, input, base);
}

// Public description of the schema for the admin UI.
export function schemaForClient() {
  return SECTIONS;
}
