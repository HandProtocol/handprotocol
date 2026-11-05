// Content schema for THIS site — the single source of truth for what the
// owner can edit. The admin builds its forms from SECTIONS, the save endpoint
// sanitizes against it, and site/page.mjs reads DEFAULT_CONTENT's shape.
//
// Field types: text | textarea | toggle | list (of fields). Every text field
// needs a max. Lists cannot nest. Keys are [a-z0-9_].
//
// This is the generic "single-page local business" schema: brand, hero,
// about (+stats), gallery, services, process, testimonials, contact, seo,
// footer. Rename labels for the client's vocabulary, drop what they do not
// need, add fields the layout wants. Keep keys stable once the site is live
// (renaming a key orphans the owner's saved copy).

export const CONTENT_KEY = 'site';

export const SECTIONS = [
  {
    key: 'brand',
    label: 'Brand',
    help: 'The name and one-liner that show in the header, footer, and browser tab.',
    fields: [
      { key: 'name', type: 'text', label: 'Business name', max: 40 },
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
      { key: 'cta_primary', type: 'text', label: 'Primary button', max: 30, help: 'Opens your booking link, or calls your phone, or emails you — whichever you have filled in under Contact.' },
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
    help: 'Leave the list empty to hide the section.',
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
    help: 'Leave the steps empty to hide the section.',
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
    help: 'The primary button uses the booking link if set, otherwise the phone, otherwise the email.',
    fields: [
      { key: 'booking_url', type: 'text', label: 'Online booking link (optional)', max: 200, help: 'A calendar or booking page URL. Leave empty to book by phone.' },
      { key: 'phone', type: 'text', label: 'Phone number', max: 24, help: 'Placeholder until you change it.' },
      { key: 'sms', type: 'toggle', label: 'Show a “Text us” button (same number)' },
      { key: 'email', type: 'text', label: 'Email', max: 80, help: 'Placeholder until you change it.' },
      { key: 'heading', type: 'text', label: 'Heading', max: 60 },
      { key: 'body', type: 'textarea', label: 'Body', max: 260 },
      { key: 'cta_label', type: 'text', label: 'Button label', max: 30 },
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

// Default copy. Written so the site looks finished on day one and every line
// is obviously the owner's to change. scaffold.mjs swaps the business name in.
export const DEFAULT_CONTENT = {
  brand: {
    name: 'Studio Name',
    tagline: 'Good work, done with care.',
  },
  hero: {
    eyebrow: 'Local studio',
    headline: 'Work you will be glad you booked.',
    subhead: 'A short promise to the visitor: what you do, who it is for, and why one call is all it takes to get started.',
    cta_primary: 'Book now',
    cta_secondary: 'See the work',
  },
  about: {
    heading: 'Small team. Real craft. Clear communication.',
    body:
      'Two or three grounded sentences about who you are and how you work. Say what a client can expect from the first call to the finished result. Keep it in your own voice.',
    stats: [
      { value: '250+', label: 'projects delivered' },
      { value: '48h', label: 'first reply' },
      { value: '5.0', label: 'average rating' },
    ],
  },
  work: {
    heading: 'Selected work',
    subhead: 'A rolling edit of recent projects. Tap any image to see it full-screen.',
  },
  services: {
    heading: 'What we do',
    subhead: 'Clear packages, no surprise fees.',
    items: [
      { title: 'Service one', description: 'One or two sentences on what this includes and who it suits.', price: 'from $250' },
      { title: 'Service two', description: 'One or two sentences on what this includes and who it suits.', price: 'from $600' },
      { title: 'Service three', description: 'One or two sentences on what this includes and who it suits.', price: 'from $900' },
    ],
  },
  process: {
    heading: 'How it works',
    steps: [
      { title: 'Reach out', body: 'Tell us the date, the place, and what you are after. We confirm availability on the spot.' },
      { title: 'We do the work', body: 'We show up prepared and keep it easy on your side.' },
      { title: 'Delivered', body: 'You get the finished result fast, with everything you need to use it.' },
    ],
  },
  testimonials: {
    heading: 'Kind words',
    items: [
      { quote: 'Calm, fast, and every detail was right. We booked them again the same week.', name: 'A. Rivera', role: 'Placeholder review' },
      { quote: 'They made the whole thing easy. The result landed the next morning.', name: 'Jordan M.', role: 'Placeholder review' },
    ],
  },
  contact: {
    booking_url: '',
    phone: '(512) 555-0100',
    sms: true,
    email: 'hello@example.com',
    heading: 'Ready when you are.',
    body: 'One call locks your date. Prefer text? Send a message and we will reply within the hour during business hours.',
    cta_label: 'Book now',
    hours: 'Mon–Sat, 9am–7pm',
    location: 'Austin, TX',
    instagram: '',
  },
  seo: {
    title: 'Studio Name — Local Studio',
    description: 'A one-line description for search results and link previews.',
  },
  footer: {
    note: '© {year} Studio Name. All images © their owners.',
  },
};
