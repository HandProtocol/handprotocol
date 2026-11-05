// ZeroBlur content schema — the single source of truth for what the owner can
// edit. The renderer reads it for defaults, the admin builds its forms from it
// (served via /api/content), and the save endpoint sanitizes against it.
//
// Field types: text | textarea | toggle | list (of fields)

export const CONTENT_KEY = 'site';

export const SECTIONS = [
  {
    key: 'brand',
    label: 'Brand',
    help: 'The name and one-liner that show in the header, footer, and browser tab.',
    fields: [
      { key: 'name', type: 'text', label: 'Studio name', max: 40 },
      { key: 'tagline', type: 'text', label: 'Tagline', max: 90 },
    ],
  },
  {
    key: 'hero',
    label: 'Hero',
    help: 'The first screen. The featured image from Media sits behind it.',
    fields: [
      { key: 'eyebrow', type: 'text', label: 'Eyebrow (small line above the headline)', max: 60 },
      { key: 'headline', type: 'text', label: 'Headline', max: 70 },
      { key: 'subhead', type: 'textarea', label: 'Subhead', max: 240 },
      { key: 'cta_primary', type: 'text', label: 'Primary button (calls your phone)', max: 30 },
      { key: 'cta_secondary', type: 'text', label: 'Secondary button (scrolls to the work)', max: 30 },
    ],
  },
  {
    key: 'about',
    label: 'About',
    fields: [
      { key: 'heading', type: 'text', label: 'Heading', max: 80 },
      { key: 'body', type: 'textarea', label: 'Body', max: 700 },
      {
        key: 'stats',
        type: 'list',
        label: 'Stats',
        help: 'Up to four short numbers with a label each. Leave empty to hide.',
        max: 4,
        item: [
          { key: 'value', type: 'text', label: 'Value', max: 12 },
          { key: 'label', type: 'text', label: 'Label', max: 40 },
        ],
      },
    ],
  },
  {
    key: 'work',
    label: 'Work (gallery)',
    help: 'Images themselves are managed in the Media tab.',
    fields: [
      { key: 'heading', type: 'text', label: 'Heading', max: 60 },
      { key: 'subhead', type: 'text', label: 'Subhead', max: 140 },
    ],
  },
  {
    key: 'services',
    label: 'Services',
    fields: [
      { key: 'heading', type: 'text', label: 'Heading', max: 60 },
      { key: 'subhead', type: 'text', label: 'Subhead', max: 160 },
      {
        key: 'items',
        type: 'list',
        label: 'Services',
        max: 8,
        item: [
          { key: 'title', type: 'text', label: 'Title', max: 40 },
          { key: 'description', type: 'textarea', label: 'Description', max: 220 },
          { key: 'price', type: 'text', label: 'Price note (e.g. “from $250”)', max: 24 },
        ],
      },
    ],
  },
  {
    key: 'process',
    label: 'How it works',
    fields: [
      { key: 'heading', type: 'text', label: 'Heading', max: 60 },
      {
        key: 'steps',
        type: 'list',
        label: 'Steps',
        max: 5,
        item: [
          { key: 'title', type: 'text', label: 'Title', max: 30 },
          { key: 'body', type: 'textarea', label: 'Body', max: 200 },
        ],
      },
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimonials',
    fields: [
      { key: 'heading', type: 'text', label: 'Heading', max: 60 },
      {
        key: 'items',
        type: 'list',
        label: 'Quotes',
        help: 'Leave empty to hide the section.',
        max: 8,
        item: [
          { key: 'quote', type: 'textarea', label: 'Quote', max: 320 },
          { key: 'name', type: 'text', label: 'Name', max: 40 },
          { key: 'role', type: 'text', label: 'Role or context', max: 60 },
        ],
      },
    ],
  },
  {
    key: 'contact',
    label: 'Contact & booking',
    help: 'The phone number powers every “call now” button on the site.',
    fields: [
      { key: 'phone', type: 'text', label: 'Phone number', max: 24, help: 'Placeholder until you change it.' },
      { key: 'sms', type: 'toggle', label: 'Show a “Text us” button (same number)' },
      { key: 'email', type: 'text', label: 'Email', max: 80, help: 'Placeholder until you change it.' },
      { key: 'heading', type: 'text', label: 'Heading', max: 60 },
      { key: 'body', type: 'textarea', label: 'Body', max: 260 },
      { key: 'cta_label', type: 'text', label: 'Call button label', max: 30 },
      { key: 'hours', type: 'text', label: 'Hours', max: 60 },
      { key: 'location', type: 'text', label: 'Location', max: 80 },
      { key: 'instagram', type: 'text', label: 'Instagram handle (with or without @)', max: 40 },
    ],
  },
  {
    key: 'seo',
    label: 'Search & sharing',
    help: 'What Google and link previews show. The featured image is used for previews.',
    fields: [
      { key: 'title', type: 'text', label: 'Page title', max: 70 },
      { key: 'description', type: 'textarea', label: 'Description', max: 160 },
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    fields: [{ key: 'note', type: 'text', label: 'Footer note', max: 120, help: '{year} becomes the current year.' }],
  },
];

export const DEFAULT_CONTENT = {
  brand: {
    name: 'ZeroBlur',
    tagline: 'Photo & video, sharp as the moment.',
  },
  hero: {
    eyebrow: 'Photography & film studio',
    headline: 'Every frame in focus.',
    subhead:
      'Portraits, events, and brand stories shot with intent and delivered fast. One call holds your date.',
    cta_primary: 'Call now to book',
    cta_secondary: 'See the work',
  },
  about: {
    heading: 'Sharp eyes. Calm sets. Images you’ll keep.',
    body:
      'ZeroBlur is a working studio, not a content mill. We plan the light, direct with care, and edit every frame by hand so your photos look like the best version of that day. Book by phone and you talk to the person who shoots it.',
    stats: [
      { value: '250+', label: 'sessions delivered' },
      { value: '48h', label: 'preview turnaround' },
      { value: '5.0', label: 'average rating' },
    ],
  },
  work: {
    heading: 'Selected work',
    subhead: 'A rolling edit of recent sessions. Tap any frame to see it full-screen.',
  },
  services: {
    heading: 'What we shoot',
    subhead: 'Clear packages, no surprise fees. Every session includes edited, print-ready files.',
    items: [
      {
        title: 'Portraits',
        description: 'Headshots, creative portraits, and family sessions. In the studio or on location.',
        price: 'from $250',
      },
      {
        title: 'Events',
        description: 'Weddings, launches, live shows. Two shooters available, full-day coverage.',
        price: 'from $1,200',
      },
      {
        title: 'Brand & product',
        description: 'Campaign imagery, lookbooks, menus, and product on clean or styled sets.',
        price: 'from $600',
      },
      {
        title: 'Video',
        description: 'Short films, reels, and interviews. 4K capture, color graded, delivered in every format you need.',
        price: 'from $900',
      },
    ],
  },
  process: {
    heading: 'How it works',
    steps: [
      { title: 'Call', body: 'Tell us the date, the place, and the feeling you’re after. We confirm availability on the spot.' },
      { title: 'Shoot', body: 'We arrive early, light it right, and keep the set easy. You just show up.' },
      { title: 'Deliver', body: 'Previews within 48 hours, the full gallery within two weeks, print-ready and web-ready.' },
    ],
  },
  testimonials: {
    heading: 'Kind words',
    items: [
      {
        quote: 'They made a nervous team look like a magazine spread in under an hour. The previews landed the next morning.',
        name: 'A. Rivera',
        role: 'Founder, placeholder review',
      },
      {
        quote: 'Calm, fast, and every single frame was sharp. Our whole family actually enjoyed the shoot.',
        name: 'Jordan M.',
        role: 'Family session, placeholder review',
      },
      {
        quote: 'The launch video did more for us than the launch. We booked them again the same week.',
        name: 'The Lumen Team',
        role: 'Brand film, placeholder review',
      },
    ],
  },
  contact: {
    phone: '(512) 555-0100',
    sms: true,
    email: 'hello@zeroblur.studio',
    heading: 'Ready when you are.',
    body: 'One call locks your date. Prefer text? Send a message and we’ll reply within the hour during business hours.',
    cta_label: 'Call now to book',
    hours: 'Mon–Sat, 9am–7pm',
    location: 'Austin, TX · travel available',
    instagram: '@zeroblur',
  },
  seo: {
    title: 'ZeroBlur — Photo & Video Studio',
    description:
      'Portraits, events, and brand photography and film, shot with intent and delivered fast. Call now to book your date.',
  },
  footer: {
    note: '© {year} ZeroBlur. All images © their owners.',
  },
};

const TEXT_TYPES = new Set(['text', 'textarea']);

function clipText(value, max) {
  const v = value == null ? '' : String(value);
  const trimmed = v.replace(/\r\n?/g, '\n').trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function sanitizeField(field, value, fallback) {
  if (TEXT_TYPES.has(field.type)) {
    return value === undefined ? clipText(fallback, field.max) : clipText(value, field.max);
  }
  if (field.type === 'toggle') {
    return value === undefined ? Boolean(fallback) : Boolean(value);
  }
  if (field.type === 'list') {
    const source = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];
    return source
      .slice(0, field.max)
      .map((item) => {
        const row = {};
        for (const sub of field.item) row[sub.key] = sanitizeField(sub, item && item[sub.key], '');
        return row;
      })
      .filter((row) => Object.values(row).some((v) => v !== '' && v !== false));
  }
  return fallback;
}

// Builds a complete, safe content document from arbitrary input. Missing
// keys fall back to `base` (defaults, or the stored document when merging).
export function sanitizeContent(input, base = DEFAULT_CONTENT) {
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  for (const section of SECTIONS) {
    const inSec = src[section.key] && typeof src[section.key] === 'object' ? src[section.key] : {};
    const baseSec = (base && base[section.key]) || {};
    out[section.key] = {};
    for (const field of section.fields) {
      out[section.key][field.key] = sanitizeField(field, inSec[field.key], baseSec[field.key]);
    }
  }
  return out;
}

// Public description of the schema for the admin UI (no functions inside).
export function schemaForClient() {
  return SECTIONS;
}
