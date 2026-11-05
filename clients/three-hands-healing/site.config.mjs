// Three Hands Healing — site pack config. Cathedral design (candlelit stone,
// gold on the brand teals) on the owner-editable engine. See README.md.
import { MARK } from './site/brand.mjs';
import { CHECKLIST } from './site/checklist.mjs';

export default {
  slug: 'three-hands-healing',
  name: 'Three Hands Healing',

  // Production domain is 3handshealing.com (currently a systeme.io coming-soon
  // page holding Maria's email list — export before repointing). Until then:
  productionUrl: 'https://three-hands-healing.netlify.app',
  netlifySiteId: '5d0bc794-27d0-4af8-b1b1-1116b34e6350',

  supabase: { projectRef: 'vconmgerblqbworcqkvr', schema: 'command' },

  assetVersion: '20261006d',

  fonts: {
    googleCss:
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500&family=STIX+Two+Text:ital,wght@0,400;0,600;1,400;1,600&display=swap',
    display: '"STIX Two Text", "Times New Roman", "Tinos", Georgia, serif',
    body: '"Montserrat", "Helvetica Neue", Arial, system-ui, sans-serif',
  },

  // Brand kit (THH Logo Draft 1): gold #D8C971 on the brand teals. The
  // cathedral's stone is the deep teal taken down to candlelight. Every key
  // is a CSS variable (--gold, --soot …); hex keys also get --key-rgb.
  theme: {
    // engine-required roles
    bg: '#082625',
    ink: '#ECEBE3', // bone: headings + primary text (the editor's text, too)
    'ink-2': '#CBD3CD', // reading text on soot, ~11:1
    'ink-3': '#A6BAB6', // captions
    accent: '#D8C971',
    'accent-2': '#E4D88A',
    'on-accent': '#082625',
    // the kit
    gold: '#D8C971',
    'gold-hi': '#E4D88A',
    teal: '#169999',
    'teal-2': '#15B7B3',
    aqua: '#2BE2D8',
    deep: '#117575',
    'deep-2': '#0E5F5F',
    // the stone
    soot: '#082625',
    smoke: '#0D3A39',
    bone: '#ECEBE3',
    'bone-2': '#A6BAB6', // captions on soot, ~7.5:1
    paper: '#F4F5F0', // text on the deep-teal block, ~5:1
    'gold-35': 'rgba(216, 201, 113, .35)',
    'gold-6': 'rgba(216, 201, 113, .6)',
    // The owner editor in the Cathedral's own vocabulary: square, one gold
    // hairline weight, uppercase tracked labels, STIX at book weight, a flat
    // gold primary button, candlelight instead of a neon glow.
    admin: {
      r: '0',
      'r-lg': '0',
      'r-btn': '0',
      'r-pill': '0',
      line: 'var(--gold-35)',
      'line-2': 'var(--gold-6)',
      'label-transform': 'uppercase',
      'label-spacing': '0.18em',
      'display-weight': '400',
      'display-spacing': '-0.01em',
      'btn-weight': '500',
      'btn-primary-bg': 'var(--gold)',
      'btn-primary-shadow': 'none',
      'glow-opacity': '0.45',
    },
  },

  logo: MARK,

  // Header links; the Book action is rendered from the contact fields.
  // (site/page.mjs draws the header itself so links work from every page.)
  nav: [
    { id: 'practices', label: 'Practices' },
    { id: 'session', label: 'Sessions' },
    { id: 'about', label: 'About' },
  ],
  labels: {},

  media: {
    // Maria's licensed finals (Aneta Hayne, 2026-09-04), shipped with the
    // site. The Featured photo is the hero arch; every other spot picks its
    // photo by Category (Path, About, Book, Body, Mind, Pets, Quote; see
    // site/page.mjs), falling back to a shipped photo. The owner sets
    // categories in /admin/ Media.
    seed: [
      photo('maria-arch-laughing', 1066, 1600, 'Maria laughing beneath a limestone archway, a red wooden door behind her', 'Arch', true),
      photo('maria-arch-red-door', 1066, 1600, 'Maria standing barefoot in an open red door inside a stone archway, smiling', 'Arch'),
      photo('maria-arch-open-hand', 1066, 1600, 'Maria under a wide stone arch, reaching one open hand toward you', 'Arch'),
      photo('maria-eft-tapping', 1066, 1600, 'Maria tapping the side of her hand, eyes closed', 'EFT'),
      photo('maria-arch-door-hand', 1600, 1066, 'Maria resting a hand on the red door of the archway', 'Arch'),
      photo('maria-arch-leaning', 1066, 1600, 'Maria leaning against the stone arch', 'Arch'),
      photo('maria-arch-palms', 1600, 1066, 'Maria with both palms open under the arch', 'Arch'),
      photo('maria-forest-kimono', 1600, 1066, 'Maria in a kimono among the trees', 'Forest'),
      photo('maria-meadow-arms-wide', 1600, 1066, 'Maria in a meadow, arms wide', 'Meadow'),
      photo('maria-meadow-smile', 1600, 1066, 'Maria smiling in a meadow', 'Meadow'),
      // 2026-10-05: the Pets page photo (stock, supplied by koH). Production
      // falls back to this file until a Media photo has Category "Pets".
      photo('pets-dog-cat', 1328, 1184, 'A dog and a tabby cat asleep together on a soft blanket', 'Pets'),
    ],
    placeholderPalette: ['#D8C971', '#169999', '#15B7B3', '#117575', '#0D3A39'],
  },

  madeBy: { label: 'Made by HAND', href: 'https://handprotocol.org' },

  // Maria's Setup tab in /admin/ (site/checklist.mjs): booking link, contact,
  // Search Console, Business Profile, Bing, then the domain move.
  checklist: CHECKLIST,

  // Search facts (lib/config.mjs normalizeSeo). Only what Maria confirmed:
  // she works online or in person in Texas; her city is not confirmed yet,
  // so no address and no city. Add them once she gives them.
  seo: {
    type: 'HealthAndBeautyBusiness',
    areaServed: ['Texas'],
    // ogPosition stays 'center': checked on 2026-10-01, 'top' crops to the arch and cuts her face.
  },

  // Once productionUrl becomes https://3handshealing.com, the generated
  // netlify.toml forces a 301 from three-hands-healing.netlify.app.
  netlify: { siteName: 'three-hands-healing' },
};

function photo(file, width, height, alt, category, featured = false) {
  return { path: `/img/photos/${file}.jpg`, width, height, alt, category, featured, placeholder: false };
}
