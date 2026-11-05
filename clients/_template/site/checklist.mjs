// The owner's Setup checklist, shown as the Setup tab in /admin/. Every step
// is a button (actions) and steps tick themselves where the site can tell
// (check); prose steps are the fallback for a phone. Ticks save on the spot.
// Item shape and kinds: netlify/functions/lib/checklist.mjs.
//
// Per client: set the consts, cut items that do not apply, add the client's
// own (photos of the shop, a menu, a price list…). Keep the rules: one verb
// per line, the button is the step, every item says how you know it is done,
// never make the owner type a URL or hunt for a section.

export const SITE = 'Studio Name'; // scaffold.mjs stamps the client name here
export const DOMAIN = 'your domain'; // e.g. 'studioname.com' once known (scaffold --domain=)
export const OLD_SITE = ''; // e.g. 'https://old-site.example' if one should be retired (scaffold --old-site=)
export const CODE_ACCESS = false; // true when the owner will edit code from a phone via Claude Code (scaffold --code-access)
export const HAS_LOOKS = false; // true when site.config.mjs defines `themes` (the Looks picker)
export const HAS_BOOKING = false; // true when site.config.mjs defines `booking` in request mode (the calendar)
export const HAS_PAYMENTS = false; // true when site.config.mjs defines `payments` (/admin/ → Payments, the owner's Stripe)

const looks = {
  id: 'theme',
  title: 'Pick the look of your site',
  embed: 'looks',
  why: 'The site ships with several complete looks. Tap one to see your real site in it; tap Use this look and it is live. Change your mind any time.',
  actions: [{ label: 'See the looks', kind: 'looks' }],
  done: 'The site opens in the look you chose.',
};

const copy = {
  id: 'copy',
  title: 'Read every line, and check your phone number',
  why: 'Everything on the page is yours to change. The phone number is the one thing that must be exactly right before the site goes on your domain.',
  actions: [
    { label: 'Check the phone number', kind: 'field', target: 'contact.phone' },
    { label: 'Open the copy', kind: 'section', target: 'hero' },
    { label: 'Read the live site', kind: 'site', target: '/' },
  ],
  check: { kind: 'field', path: 'contact.phone' },
  phone: [
    'Tap **Check the phone number** and confirm it digit by digit.',
    'Tap **Open the copy** and go section by section; fix anything that sounds off.',
    'Tap **Publish changes** at the bottom, then **Read the live site** on your phone.',
  ],
  done: 'You have read the live site top to bottom and the number dials you.',
};

const photos = {
  id: 'photos',
  title: 'Add your own photos',
  why: 'Real photos of your work beat placeholders every time, and the featured photo is the first thing people see.',
  actions: [{ label: 'Open Media', kind: 'tab', target: 'media' }],
  check: { kind: 'media' },
  phone: [
    'Tap **Open Media**, then **Add photos**. Pick straight from your camera roll; big files are fine, they are resized on your phone.',
    'Tap **Set featured** on the photo you want at the top of the page.',
    'Use the arrows to order the rest, and **Replace** to swap any photo without losing its spot.',
  ],
  done: 'The page shows your photos, with the one you chose up top.',
};

// With the booking calendar (HAS_BOOKING): hours, the owner's own test
// request (ticks itself once a booking carries an editor's email), and the
// phone calendar feed. Replaces contactTest.
const hours = {
  id: 'hours',
  title: 'Set your hours and days off',
  why: 'Customers pick a day and a time from these hours. Days without a row are closed; a day off blocks the whole day.',
  actions: [
    { label: 'Set my hours', kind: 'field', target: 'calendar.hours' },
    { label: 'Add a day off', kind: 'field', target: 'calendar.blackouts' },
  ],
  phone: [
    'Tap **Set my hours**: one row per working day, with a from and a to. Remove the days you do not work.',
    'Scroll down the same section: the time windows customers choose from, how much notice you need, and how far ahead people can book.',
    'Tap **Publish changes**.',
  ],
  done: 'Your real hours are in and the booking form only offers days you work.',
};

const bookingTest = {
  id: 'booking_test',
  title: 'Send yourself a test booking',
  why: 'Requests land in the Bookings tab and email you with one-tap Confirm and Decline links. Prove the whole loop works before a real customer finds it.',
  actions: [
    { label: 'Open the booking form', kind: 'site', target: '#book' },
    { label: 'Open Bookings', kind: 'tab', target: 'bookings' },
  ],
  check: { kind: 'booking' },
  phone: [
    'Tap **Open the booking form**, pick a service, a day and a time, and fill it with your own details and email.',
    'Tap **Request this time**. You should see the thank-you message with your request summary.',
    'Within a minute, check your inbox: one email titled **Booking request: <your name>** with **Confirm** and **Decline** buttons, and one "got your request" email addressed to you as the customer.',
    'Tap **Confirm** in the email, or tap **Open Bookings** and confirm it there.',
  ],
  ask: 'If nothing arrives within five minutes, tell HAND. We will check the mail logs.',
  done: 'Your test request shows under Confirmed in the Bookings tab and both emails arrived.',
};

const calendarPhone = {
  id: 'calendar_phone',
  title: 'Put your bookings on your phone\'s calendar',
  why: 'Every confirmed booking also lives in a calendar feed. Subscribe once and new ones appear on your phone by themselves; each confirmation email carries the booking as a calendar file too.',
  actions: [{ label: 'Open Bookings', kind: 'tab', target: 'bookings' }],
  phone: [
    'Tap **Open Bookings**, then **Add to my phone\'s calendar** at the top.',
    'Your phone asks to subscribe to a calendar. Say yes. On iPhone it may take a few minutes to refresh; that is normal.',
  ],
  done: 'A confirmed booking shows up in your phone\'s calendar app.',
};

const contactTest = {
  id: 'contact_test',
  title: 'Send yourself a test message',
  why: 'Prove the Book or Contact button reaches you before a real customer finds it.',
  actions: [{ label: 'Open the site', kind: 'site', target: '#book' }],
  phone: [
    'Tap **Open the site**, then the main button, and go through it as a customer would.',
    'Check that the call, text, email, or booking lands where you expect.',
  ],
  ask: 'If nothing arrives, tell HAND. We check the logs.',
  done: 'You received your own test.',
};

const github = {
  id: 'github',
  title: 'Create your GitHub account',
  why: 'Your site\'s code lives in a GitHub repository. That is what Claude Code on your phone edits, and every change you approve goes live.',
  actions: [{ label: 'Sign up at GitHub', kind: 'url', target: 'https://github.com/signup' }],
  phone: [
    'Tap **Sign up at GitHub** (the free plan is all you need).',
    'Pick a username you are happy to keep and confirm your email.',
    'Send HAND your username. You will get an invitation email: open it and tap **Accept invitation**.',
  ],
  ask: 'Send us the email you want to use and we will walk you through it on a call.',
  done: 'You can open your site\'s repository on github.com and see its files.',
};

const claudeCode = {
  id: 'claude_code',
  title: 'Connect Claude Code to the site',
  why: 'Once Claude Code can see the repository you can change anything about the site by describing it, from your phone.',
  actions: [{ label: 'Open Claude Code', kind: 'url', target: 'https://claude.ai/code' }],
  phone: [
    'Tap **Open Claude Code**, then **Connect GitHub**, and choose your site\'s repository.',
    'Try something small, for example: "Make the services section two columns on desktop".',
    'Claude opens a pull request. Open it on github.com and tap **Merge**.',
  ],
  ask: 'HAND can make any change for you the same way. Just describe it.',
  done: 'You have merged one change and seen it live.',
};

const supabase = {
  id: 'supabase',
  title: 'Create your Supabase account',
  why: 'Everything you edit here lives in a database. Today HAND hosts it inside a shared project. With your own free Supabase account, HAND can move your data into a project that belongs to you.',
  actions: [{ label: 'Sign up at Supabase', kind: 'url', target: 'https://supabase.com/dashboard/sign-up' }],
  phone: [
    'Tap **Sign up at Supabase** and sign up with your GitHub account (fastest).',
    'Name the organization after your business and keep the free plan.',
    'Send HAND the email you signed up with. HAND sets the project up and adds you as its owner.',
  ],
  ask: 'HAND can walk you through it on a call, or create it with you and hand over the keys.',
  done: 'You can sign in at supabase.com/dashboard and see your organization.',
};

const domain = {
  id: 'domain',
  title: 'Point ' + DOMAIN + ' at the new site',
  why: 'Two settings at your registrar send your domain to this site, with HTTPS handled automatically.',
  actions: [{ label: 'Open your registrar', kind: 'url', target: 'https://www.namecheap.com/myaccount/login/' }],
  check: { kind: 'host' },
  phone: [
    'HAND sends you **four nameserver addresses** (they look like `dns1.p03.nsone.net`).',
    'At your registrar find **Nameservers**, switch to **Custom DNS**, and paste the four addresses.',
    'Save. It usually takes under an hour, sometimes up to a day. Then open your domain.',
  ],
  ask: 'Tell HAND the domain name and we will set the nameservers with you on a call, or do it for you if you share access.',
  done: 'Your domain opens the new site with a padlock, and so does the `www.` version.',
};

const searchConsole = {
  id: 'search_console',
  title: 'Tell Google the site exists (Search Console)',
  why: 'Search Console is how Google learns about your site and shows you which searches bring people in.',
  actions: [
    { label: 'Copy your site address', kind: 'copy', target: 'site' },
    { label: 'Open Search Console', kind: 'url', target: 'https://search.google.com/search-console' },
    { label: 'Paste the code here', kind: 'field', target: 'seo.google_verification' },
    { label: 'Copy the sitemap address', kind: 'copy', target: 'sitemap' },
  ],
  check: { kind: 'field', path: 'seo.google_verification' },
  phone: [
    'Tap **Copy your site address**, then **Open Search Console**, choose **URL prefix**, paste, and pick the **HTML tag** method.',
    'Copy only the long code between the quotes after `content=`.',
    'Tap **Paste the code here**, paste it, tap **Publish changes**, then **Verify** in Search Console.',
    'In Search Console open **Sitemaps**, tap **Copy the sitemap address** here, paste it there, and tap **Submit**.',
  ],
  ask: 'Add HAND\'s email as a user in Search Console and we will finish it.',
  done: 'Search Console shows the property as verified and the sitemap as Success.',
};

const googleBusiness = {
  id: 'google_business',
  title: 'Claim your Google Business Profile',
  why: 'When someone searches for what you do "near me", the map results come from Business Profiles, not websites. This is the biggest free source of calls.',
  actions: [{ label: 'Open Google Business', kind: 'url', target: 'https://business.google.com' }],
  phone: [
    'Tap **Open Google Business**, then **Manage now**, and enter **' + SITE + '**.',
    'Add your phone number, hours, and the website address.',
    'Verify the business when Google asks, add photos, and ask two or three recent customers for a review.',
    'Tap **Ask for reviews**, then **Copy link**, and send the link to HAND for the site.',
  ],
  ask: 'HAND can be added as a manager on the profile and fill in the details for you.',
  done: 'Searching your business name on Google shows the profile with your phone, website, and hours.',
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
  ask: 'HAND can do this with you in a minute on a call.',
  done: 'Your site shows in the Bing Webmaster Tools list.',
};

const oldSite = {
  id: 'old_site',
  title: 'Retire the old site',
  why: 'Once your domain opens the new site, the old page should go away so nobody finds two versions.',
  actions: OLD_SITE ? [{ label: 'Open the old site', kind: 'url', target: OLD_SITE }] : [],
  phone: [
    'Only do this after the domain step above is done.',
    'Sign in where the old site is hosted and delete it, or ask HAND to point it at the new site.',
  ],
  ask: 'HAND can redirect the old address to the new site instead.',
  done: 'The old address no longer loads the old page.',
};

// Ticks itself once Stripe is connected (check kind `stripe`).
const payments = {
  id: 'payments',
  title: 'Connect Stripe so customers can pay online',
  why: 'The money goes straight to your own Stripe account and your bank; HAND never touches it. Until Stripe is connected nobody is asked to pay online.',
  actions: [
    { label: 'Connect Stripe', kind: 'tab', target: 'payments' },
    { label: 'Create a Stripe account', kind: 'url', target: 'https://dashboard.stripe.com/register' },
  ],
  check: { kind: 'stripe' },
  phone: [
    'Tap **Connect Stripe**. The Payments screen walks you through it in three steps.',
    'In Stripe, make a restricted key for the website, copy it, and paste it there. The site sets up the rest.',
  ],
  ask: 'Make the key, then send it to HAND in a private message (never by email), and HAND connects it for you.',
  done: 'Ticks itself: the Payments screen says "Stripe is connected".',
};

export const CHECKLIST = [
  ...(HAS_LOOKS ? [looks] : []),
  copy,
  photos,
  ...(HAS_BOOKING ? [hours, bookingTest, calendarPhone] : [contactTest]),
  ...(HAS_PAYMENTS ? [payments] : []),
  ...(CODE_ACCESS ? [github, claudeCode, supabase] : []),
  domain,
  searchConsole,
  googleBusiness,
  bing,
  ...(OLD_SITE ? [oldSite] : []),
];
