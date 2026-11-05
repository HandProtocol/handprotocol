// Maria's Setup tab in /admin/: the steps that get Three Hands Healing found
// on Google, in order. Every step is a button; steps tick themselves where
// the site can tell. Item shape and kinds: netlify/functions/lib/checklist.mjs.
// Rules: one verb per line, the button is the step, every item says how you
// know it is done, never make the owner type a URL or hunt for a section.

const SITE = 'Three Hands Healing';
const DOMAIN = '3handshealing.com';

const booking = {
  id: 'booking',
  title: 'Add your booking link',
  why: 'Right now the Book buttons only scroll the page, so nobody can reach you from the site. Once your calendar page exists, paste its link and every Book button opens it.',
  actions: [
    { label: 'Paste your booking link', kind: 'field', target: 'contact.booking_url' },
    { label: 'Check it on the site', kind: 'site', target: '#book' },
  ],
  check: { kind: 'field', path: 'contact.booking_url' },
  phone: [
    'Open your calendar page (GoHighLevel, or any booking page) and copy its address.',
    'Tap **Paste your booking link**, paste it, and tap **Publish changes**.',
    'Tap **Check it on the site** and press **Book a session**: it should open your calendar.',
  ],
  ask: 'No calendar yet? Tell HAND how you want people to book and we will set it up with you.',
  done: 'Every Book button on the site opens your calendar.',
};

const contact = {
  id: 'contact',
  title: 'Add the email (and phone) people can reach you on',
  why: 'Google and visitors both look for a way to reach a real person. An email is enough; a phone is optional and only if you want calls or texts.',
  actions: [
    { label: 'Add your email', kind: 'field', target: 'contact.email' },
    { label: 'Add a phone (optional)', kind: 'field', target: 'contact.phone' },
  ],
  check: { kind: 'field', path: 'contact.email' },
  phone: [
    'Tap **Add your email** and type the address you want enquiries to go to.',
    'Only if you want calls or texts: tap **Add a phone** and type the number, digit by digit.',
    'Tap **Publish changes**.',
  ],
  done: 'The Book block on the site shows your email.',
};

const fineprint = {
  id: 'fineprint',
  title: 'Remove the "details will be added at launch" line',
  why: 'Once your booking link and email are in, that line tells visitors something that is no longer true.',
  actions: [{ label: 'Open the fine print', kind: 'field', target: 'contact.fine_2' }],
  check: { kind: 'value', path: 'contact.fine_2', value: '' },
  phone: ['Do this after the two steps above.', 'Tap **Open the fine print**, clear the line (or write something true), and tap **Publish changes**.'],
  done: 'The line is gone from the Book block.',
};

const searchConsole = {
  id: 'search_console',
  title: 'Tell Google the site exists (Search Console)',
  why: 'Search Console is how Google learns about your site and shows you which searches bring people to you.',
  actions: [
    { label: 'Copy your site address', kind: 'copy', target: 'site' },
    { label: 'Open Search Console', kind: 'url', target: 'https://search.google.com/search-console' },
    { label: 'Paste the code here', kind: 'field', target: 'seo.google_verification' },
    { label: 'Copy the sitemap address', kind: 'copy', target: 'sitemap' },
  ],
  check: { kind: 'field', path: 'seo.google_verification' },
  phone: [
    'Tap **Copy your site address**, then **Open Search Console** and sign in with the Google account you want to keep for the practice.',
    'Choose **URL prefix**, paste, and tap **Continue**.',
    'Pick the **HTML tag** method and copy only the long code between the quotes after `content=`.',
    'Come back, tap **Paste the code here**, paste it, and tap **Publish changes**. Then tap **Verify** in Search Console.',
    'In Search Console open **Sitemaps**, tap **Copy the sitemap address** here, paste it there, and tap **Submit**.',
  ],
  ask: 'We can do this together at the standup, or add HAND as a user in Search Console and we will finish it.',
  done: 'Search Console says ownership verified, and the sitemap shows Success.',
};

const googleBusiness = {
  id: 'google_business',
  title: 'Claim your Google Business Profile',
  why: 'When someone searches for EFT or energy healing near them, the map results come from Business Profiles, not websites. It is the biggest free way to be found.',
  actions: [{ label: 'Open Google Business', kind: 'url', target: 'https://business.google.com' }],
  phone: [
    'Tap **Open Google Business**, then **Manage now**, with the same Google account.',
    'Enter **' + SITE + '** and the category HAND suggests.',
    'If clients do not come to a public address, choose to **hide your address** and list the areas you serve. Add online sessions in the description.',
    'Add the website: use the address from **Copy your site address** in the step above.',
    'Verify when Google asks. It is usually a short video: where you work, something that shows the practice, and you opening the door or a sign. One take is fine.',
    'Tap **Ask for reviews**, then **Copy link**, and send the link to HAND for the site.',
  ],
  ask: 'We will do this one together at the standup. HAND can also be added as a manager and fill in the details.',
  done: 'Searching "Three Hands Healing" on Google shows your profile with the website.',
};

const bing = {
  id: 'bing',
  title: 'Tell Bing too (two minutes)',
  why: 'Bing also feeds DuckDuckGo, Yahoo and several AI assistants. It copies everything from Search Console in one step.',
  actions: [{ label: 'Open Bing Webmaster Tools', kind: 'url', target: 'https://www.bing.com/webmasters' }],
  phone: [
    'Do this after Search Console says your site is verified.',
    'Tap **Open Bing Webmaster Tools** and sign in with the same Google account.',
    'Next to **Import your sites from GSC**, tap **Import**, then **Continue**.',
  ],
  ask: 'HAND can do this with you in a minute.',
  done: 'Your site shows in the Bing Webmaster Tools list.',
};

const domain = {
  id: 'domain',
  title: 'Move the site to ' + DOMAIN,
  why: 'Your own domain is the address people remember and the one Google should credit. Your email list lives on the old page there, so it gets saved first.',
  actions: [{ label: 'Open Namecheap', kind: 'url', target: 'https://ap.www.namecheap.com/domains/list/' }],
  check: { kind: 'host' },
  later: true,
  phone: [
    'First, with HAND: export your email list from systeme.io (it holds everyone who signed up on the old page).',
    'HAND sends you **four nameserver addresses** (they look like `dns1.p03.nsone.net`).',
    'Tap **Open Namecheap**, sign in, and tap **Manage** next to ' + DOMAIN + '.',
    'Find **Nameservers**, switch to **Custom DNS**, paste the four addresses, and tap the green check.',
    'Wait. Usually under an hour, sometimes up to a day.',
  ],
  ask: 'We will do this together, after the email list is safe.',
  done: DOMAIN + ' opens this site with a padlock, and so does the www. version.',
};

export const CHECKLIST = [booking, contact, fineprint, searchConsole, googleBusiness, bing, domain];
