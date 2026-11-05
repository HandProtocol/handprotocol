// Guest review page for this site: opt in from site.config.mjs with
// `reviews: REVIEWS`. The customer opens /review (print the link or a QR code on
// the invoice, the counter, the thank-you text), types the code the owner gave
// them, and gets the places to leave a review plus a writing helper: they type a
// few notes about their own visit, Claude turns ONLY those notes into a draft, and
// they edit it and post it under their own name. Engine: netlify/functions/review.mjs,
// lib/review-core.mjs, lib/review-page.mjs, public/review/.
//
// Needs ANTHROPIC_API_KEY on the Netlify site (put the key in its own Anthropic
// workspace with a monthly spend limit). Without it the page and the links still
// work and the helper says it is not set up.
// Reference instance: longhornwinetours (review.longhornwinetours.com).

export const REVIEWS = {
  // A courtesy gate the owner says out loud, 2 to 8 digits. Not a secret.
  // <PREFIX>_REVIEW_PIN on the Netlify site overrides it without a code change.
  pin: '22',

  // One or two sentences on what a customer experiences. Claude uses it only to
  // follow what the customer's notes refer to, never as material for the review.
  about: '',

  // Where reviews go, in the order to ask. https only. `how` = one short line on
  // what to tap once they land; `note` = a smaller second line (optional).
  // Google: Business Profile → "Ask for reviews" gives the https://g.page/r/…/review link.
  links: [
    // { label: 'Google', url: 'https://g.page/r/XXXXXXXX/review', how: 'Tap the stars, paste or type your review, then Post.' },
    // { label: 'Yelp', url: 'https://www.yelp.com/writeareview/biz/XXXXXXXX', how: 'Pick your stars, paste your review, then Post.' },
  ],

  // Lead-ins the customer taps to start a line of notes. They finish the sentence:
  // what comes after the colon is theirs, which is what keeps every review different.
  chips: ['What I came in for: ', 'Who helped me: ', 'How it turned out: ', 'What surprised me: ', 'I would tell a friend: '],

  // Optional copy overrides: gateEyebrow, gateTitle, eyebrow, title, lede,
  // helperEyebrow, helperTitle, helperSub, placeholder.
  page: {},
};
