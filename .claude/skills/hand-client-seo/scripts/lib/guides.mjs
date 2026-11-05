// The step lists the stages print and the standup draws on. Owner-facing
// lines follow the Setup-tab rule: one verb per line, the button in bold,
// a "done" line. HAND voice: no em dashes, plain words.
import { GOOGLE_ITEMS } from './state.mjs';

// What "our basic SEO setup" means: the on-site work HAND does for every
// client, proven by an audit. Each line names the checks that prove it.
export const BASELINE = [
  { item: 'Crawlable: robots.txt allows search, names the sitemap', checks: ['robots-txt-reachable', 'robots-txt-blocks-site', 'robots-txt-sitemap-line'] },
  { item: 'Sitemap lists every real page and nothing else', checks: ['sitemap-exists', 'sitemap-valid', 'sitemap-urls', 'sitemap-coverage'] },
  { item: 'One address per page: https, canonical tags, no /index.html twin', checks: ['https-redirect', 'canonical-present', 'canonical-valid', 'index-html-duplicate', 'duplicate-hosts'] },
  { item: 'Real 404s for missing pages', checks: ['not-found-status'] },
  { item: 'Title and description written for searchers, with the place and the name', checks: ['title-present', 'title-length', 'title-brand', 'description-present', 'description-length'] },
  { item: 'One clear main heading; language declared; works on phones', checks: ['h1', 'lang', 'viewport'] },
  { item: 'Structured data describes the business (true facts only)', checks: ['jsonld-parse', 'jsonld-present', 'jsonld-business', 'jsonld-site-name', 'jsonld-matches-page'] },
  { item: 'Link previews: title, description, 1200×630 image', checks: ['og-basics', 'og-image', 'og-url', 'og-extras'] },
  { item: 'Favicon search results can show', checks: ['favicon'] },
  { item: 'Photos: alt text, sizes, sane weight, hero loads first', checks: ['img-alt', 'img-dimensions', 'img-broken', 'img-weight', 'img-lcp'] },
  { item: 'No broken links; contact links that work', checks: ['links-broken-internal', 'links-fragments', 'links-crawlable', 'links-contact-format'] },
  { item: 'A visitor can reach the business', checks: ['local-contact-path', 'local-phone', 'local-area'] },
  { item: 'Nothing left from the demo, no placeholder copy', checks: ['demo-leftovers', 'placeholder-text', 'unfinished-copy'] },
];

// The owner's Google steps. `owner` lines are what the owner does; `hand`
// lines are what HAND does around them.
export const GOOGLE_STEPS = {
  'search-console': {
    why: 'Search Console is how Google tells the owner what it found, what is broken, and what people searched to find them.',
    owner: ['Sign in to Google with the business account (or make one).', 'Open search.google.com/search-console and press **Add property**.', 'Choose **URL prefix**, paste the site address HAND gives you, press **Continue**.', 'Choose **HTML tag**, press **Copy**, and send HAND the code (or paste it into the Setup tab).', 'After HAND publishes it, press **Verify**.', 'Open **Sitemaps**, type sitemap.xml, press **Submit**.', 'Done when it says "Ownership verified" and the sitemap shows "Success".'],
    hand: ['Publish the verification code (engine sites: /admin/ → Search & sharing → Google verification).', 'Re-run the audit after the sitemap is submitted.', 'Once the domain moves, add the new domain as a property too and use **Change of address** if the old one was ever indexed.'],
  },
  'business-profile': {
    why: 'The Business Profile is the map listing and the panel on the right of Google results. For a local business it brings more calls than the website does.',
    owner: ['Open business.google.com and press **Manage now**.', 'Search for the business name. If it exists, press **Claim**; if not, press **Add your business**.', 'Pick the closest category (HAND will suggest one).', 'For a business that visits clients or works by appointment only, choose to **hide the address** and list the service area.', 'Add the phone and the website address.', 'Verify. Google usually asks for a short video: the outside of the place, the sign or tools of the trade, and something only the owner can open. Record it in one take.', 'Done when the profile says "Verified".'],
    hand: ['Prepare the category, service area, description and photos before the session.', 'Keep the name, phone and city exactly the same as on the website.', 'After verification, copy the profile link and the review link for the site.'],
  },
  'review-link': {
    why: 'Reviews on the Business Profile are the strongest local ranking signal a small business controls.',
    owner: ['In the Business Profile, press **Ask for reviews**, then **Copy link**.', 'Send the link to HAND.', 'Done when the link opens the review box.'],
    hand: ['Put the review link on the site (a "Leave a review" link near the contact block).', 'Add the profile to the structured data sameAs list.', 'Never mark up the business\'s own reviews as stars on its site: Google ignores self-serving reviews.'],
  },
  bing: {
    why: 'Bing feeds Bing, DuckDuckGo, Yahoo and several AI answer engines. Importing from Search Console takes two minutes.',
    owner: ['Open bing.com/webmasters and sign in with the same Google account.', 'Press **Import** next to "Import your sites from GSC".', 'Done when the site shows in the list.'],
    hand: ['If import is not possible, publish the msvalidate.01 code instead.'],
  },
  analytics: {
    why: 'A visit count tells the owner whether the work is paying off. It is optional.',
    owner: ['Decide with HAND: no analytics, a privacy-friendly counter, or Google Analytics.', 'Done when the choice is written down.'],
    hand: ['Install the chosen tool; never add a tracker the owner did not choose.'],
  },
};

export const CUTOVER_STEPS = [
  { who: 'owner', step: 'Export anything the old site holds before DNS changes (email list, form entries, blog posts).' },
  { who: 'owner', step: 'Share access to the domain registrar (or log in together at the standup).' },
  { who: 'hand', step: 'Point the domain at Netlify (zone first, so DNS propagation overlaps the rest of the work).' },
  { who: 'hand', step: 'Add the domain and its www twin to the Netlify site; wait for the certificate.' },
  { who: 'hand', step: 'Set productionUrl in site.config.mjs to the new domain; sync and deploy so canonical, sitemap, structured data and og:url all move together.' },
  { who: 'hand', step: 'Force a 301 from <site>.netlify.app and from any old copy to the new domain.' },
  { who: 'hand', step: 'Run the launch gate against the new domain: seo.mjs test <slug> --gate --psi --lab.' },
  { who: 'owner', step: 'Add the new domain in Search Console and submit its sitemap (HAND publishes the new verification code).' },
  { who: 'owner', step: 'Update the website link on the Business Profile and every social profile.' },
  { who: 'hand', step: 'Re-audit after a week and compare: seo.mjs audit <slug> --compare.' },
];

export { GOOGLE_ITEMS };
