// Three Hands Healing — what Maria can edit. Keys follow the pages top to
// bottom: the homepage first, then one section per practice page (/body,
// /mind, /pets). Keep keys stable once live.
//
// 2026-10-05 redesign: the homepage sections whose copy changed got new keys
// (welcome, hello, ways, meet) so the new wording ships by default instead of
// being masked by the stored copy of the old sections. The old keys (alone,
// intro, practices, pillar_body, pillar_mind, about) are retired; nothing
// besides the defaults had been published into them.

export const CONTENT_KEY = 'site';

const SESSION_ITEM = [
  { key: 'name', type: 'text', label: 'Session name', max: 70 },
  { key: 'length', type: 'text', label: 'Length (e.g. 60 min)', max: 30 },
  { key: 'where', type: 'text', label: 'Where (e.g. Online or in person)', max: 50 },
  { key: 'price', type: 'text', label: 'Price (e.g. $120)', max: 30 },
  { key: 'summary', type: 'textarea', label: 'First sentence (always shown)', max: 300 },
  { key: 'details', type: 'textarea', label: 'The rest of the description', max: 900 },
  { key: 'book_url', type: 'text', label: 'Calendly link for this session', max: 300, help: 'The Calendly event for this session, with Stripe payment turned on in Calendly. Empty = the main booking link.' },
];

const STEP_ITEM = [
  { key: 'title', type: 'text', label: 'Title', max: 30 },
  { key: 'body', type: 'textarea', label: 'One or two lines', max: 180 },
];

function practicePage(key, label, photoCategory) {
  return {
    key,
    label,
    help: `Its own page and its block on the homepage. Photo: set a photo’s Category to “${photoCategory}” in Media to use it here.`,
    fields: [
      { key: 'eyebrow', type: 'text', label: 'Small label', max: 60 },
      { key: 'title', type: 'text', label: 'Page heading', max: 90 },
      { key: 'tagline', type: 'textarea', label: 'Line under the heading (also on the homepage)', max: 240 },
      { key: 'home_heading', type: 'text', label: 'Homepage heading (italic)', max: 90, help: 'Empty = use the page heading.' },
      { key: 'tags', type: 'text', label: 'Practice names on the homepage (comma-separated)', max: 200 },
      { key: 'intro', type: 'textarea', label: 'Opening paragraphs (blank line = new paragraph)', max: 1200 },
      { key: 'sessions_heading', type: 'text', label: 'Sessions heading', max: 80 },
      { key: 'sessions', type: 'list', label: 'Sessions', max: 6, item: SESSION_ITEM },
      { key: 'support_heading', type: 'text', label: '“How it helps” heading', max: 80 },
      { key: 'support', type: 'list', label: 'How it helps (circles)', max: 3, item: STEP_ITEM },
      { key: 'steps_heading', type: 'text', label: 'Steps heading', max: 80 },
      { key: 'steps', type: 'list', label: 'Steps', max: 3, item: STEP_ITEM, help: 'Empty = the three homepage steps (Arrive, Experience, Integrate).' },
      { key: 'quote', type: 'textarea', label: 'Quote from Maria (optional)', max: 260 },
      { key: 'intro_call_body', type: 'textarea', label: 'Intro-call card text', max: 260 },
      { key: 'note', type: 'textarea', label: 'Small print (disclaimer)', max: 320 },
      { key: 'seo_title', type: 'text', label: 'Search title', max: 90 },
      { key: 'seo_description', type: 'textarea', label: 'Search description', max: 170 },
    ],
  };
}

export const SECTIONS = [
  {
    key: 'brand',
    label: 'Brand',
    help: 'The name shows in the browser tab, link previews, and the footer. The taglines come from the brand kit.',
    fields: [
      { key: 'name', type: 'text', label: 'Practice name', max: 40 },
      { key: 'tagline', type: 'text', label: 'Tagline above the headline', max: 60 },
    ],
  },
  {
    key: 'hero',
    label: 'Hero',
    help: 'The first screen. The Featured photo in Media sits inside the arch.',
    fields: [
      { key: 'headline', type: 'textarea', label: 'Headline (up to three lines; one line per row)', max: 140 },
      { key: 'lede', type: 'text', label: 'Line under the headline', max: 120 },
      { key: 'cta_primary', type: 'text', label: 'Main button', max: 30, help: 'Opens the booking link if set under Book & contact, otherwise calls or emails you, otherwise scrolls to Book.' },
      { key: 'cta_secondary', type: 'text', label: 'Text link (scrolls to Practices)', max: 40 },
    ],
  },
  {
    key: 'welcome',
    label: 'Welcome',
    help: 'Right under the hero. To put a photo behind it, set a photo’s Category to “Path” in Media. Leave the heading empty to hide this section.',
    fields: [
      { key: 'eyebrow', type: 'text', label: 'Small label', max: 40 },
      { key: 'heading', type: 'text', label: 'Heading', max: 80 },
      { key: 'body', type: 'textarea', label: 'Body (blank line = new paragraph)', max: 900 },
    ],
  },
  {
    key: 'hello',
    label: 'I’m Maria',
    fields: [
      { key: 'salute', type: 'text', label: 'Opening line (italic)', max: 60 },
      { key: 'body', type: 'textarea', label: 'Paragraph', max: 700 },
    ],
  },
  {
    key: 'ways',
    label: 'How we work together',
    help: 'The homepage block for the three practice pages. Each page’s own section below fills its block.',
    fields: [
      { key: 'eyebrow', type: 'text', label: 'Small label', max: 40 },
      { key: 'heading', type: 'text', label: 'Heading', max: 80 },
      { key: 'intro', type: 'textarea', label: 'Intro paragraph', max: 600 },
      { key: 'more_label', type: 'text', label: '“Read more” button', max: 30 },
      { key: 'closing', type: 'textarea', label: 'Closing line (italic)', max: 300 },
      { key: 'intro_call_eyebrow', type: 'text', label: 'Intro-call bar: small label', max: 40 },
      { key: 'intro_call_heading', type: 'text', label: 'Intro-call bar: heading', max: 80 },
      { key: 'intro_call_body', type: 'textarea', label: 'Intro-call bar: text', max: 220 },
    ],
  },
  {
    key: 'session',
    label: 'What a session feels like',
    help: 'Leave the steps empty to hide this section.',
    fields: [
      { key: 'eyebrow', type: 'text', label: 'Small label', max: 40 },
      { key: 'heading', type: 'text', label: 'Heading', max: 80 },
      { key: 'note', type: 'text', label: 'Note under the heading', max: 100 },
      {
        key: 'steps',
        type: 'list',
        label: 'Steps',
        max: 3,
        item: [
          { key: 'title', type: 'text', label: 'Title', max: 30 },
          { key: 'body', type: 'textarea', label: 'One line', max: 140 },
        ],
      },
    ],
  },
  {
    key: 'meet',
    label: 'Meet Maria',
    help: 'Photo: set a photo’s Category to “About” in Media. Facts stay hidden until you fill them.',
    fields: [
      { key: 'eyebrow', type: 'text', label: 'Small label', max: 40 },
      { key: 'heading', type: 'text', label: 'Heading', max: 80 },
      { key: 'quote', type: 'text', label: 'Short quote under the heading', max: 120 },
      { key: 'body', type: 'textarea', label: 'Body (blank line = new paragraph)', max: 1200 },
      {
        key: 'facts',
        type: 'list',
        label: 'Facts (Training, Experience, Where…)',
        max: 4,
        item: [
          { key: 'label', type: 'text', label: 'Label', max: 30 },
          { key: 'text', type: 'textarea', label: 'Text', max: 200 },
        ],
      },
    ],
  },
  {
    key: 'contact',
    label: 'Book & contact',
    help: 'The booking link becomes every general Book button. Without it, the phone, then the email, is used. Photo here: Category “Book” in Media.',
    fields: [
      { key: 'booking_url', type: 'text', label: 'Main booking link (Calendly page)', max: 300, help: 'Your Calendly page with all sessions. Each session can also have its own link on its practice page.' },
      { key: 'intro_call_url', type: 'text', label: 'Free intro call link (Calendly)', max: 300, help: 'The Calendly event for the free 15-minute intro call. Every “Book an intro call” button opens it.' },
      { key: 'intro_call_label', type: 'text', label: 'Intro call button', max: 30 },
      { key: 'intro_call_heading', type: 'text', label: 'Intro call card: heading', max: 60 },
      { key: 'intro_call_meta', type: 'text', label: 'Intro call card: length · how · price', max: 60 },
      { key: 'phone', type: 'text', label: 'Phone', max: 24 },
      { key: 'sms', type: 'toggle', label: 'Show a “Text me” button (same number)' },
      { key: 'email', type: 'text', label: 'Email', max: 80 },
      { key: 'coming_soon', type: 'textarea', label: 'Booking coming soon note', max: 200, help: 'Shown in the Book blocks until a Calendly link is set; then it disappears by itself.' },
      { key: 'eyebrow', type: 'text', label: 'Small label', max: 40 },
      { key: 'heading', type: 'text', label: 'Heading', max: 90 },
      { key: 'body', type: 'textarea', label: 'Body', max: 260 },
      { key: 'cta_label', type: 'text', label: 'Button label', max: 30 },
      { key: 'fine_1', type: 'text', label: 'Fine print, line 1', max: 90 },
      { key: 'fine_2', type: 'text', label: 'Fine print, line 2', max: 90, help: 'Placeholder until booking is live; clear it then.' },
      { key: 'cancellation', type: 'text', label: 'Cancellation line (practice pages)', max: 160 },
      { key: 'location', type: 'text', label: 'Where sessions happen', max: 80 },
      { key: 'instagram', type: 'text', label: 'Instagram handle (optional)', max: 40 },
    ],
  },
  practicePage('page_body', 'Page — Body (/body)', 'Body'),
  practicePage('page_mind', 'Page — Mind (/mind)', 'Mind'),
  practicePage('page_pets', 'Page — Pets (/pets)', 'Pets'),
  {
    key: 'seo',
    label: 'Search & sharing',
    help: 'What Google and link previews show for the homepage. The Featured photo is the preview image.',
    fields: [
      { key: 'title', type: 'text', label: 'Page title', max: 90 },
      { key: 'description', type: 'textarea', label: 'Description', max: 170 },
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    fields: [
      { key: 'tagline', type: 'text', label: 'Tagline under the badge', max: 60 },
      { key: 'disclaimer', type: 'textarea', label: 'Disclaimer', max: 400 },
      { key: 'note', type: 'text', label: 'Copyright line', max: 80, help: '{year} becomes the current year.' },
    ],
  },
];

const PAGE_DEFAULTS = { home_heading: '', tags: '', support_heading: '', support: [], steps_heading: '', steps: [], quote: '' };

export const DEFAULT_CONTENT = {
  brand: {
    name: 'Three Hands Healing',
    tagline: 'embrace transformative evolution',
  },
  hero: {
    headline: 'Feel good in your body,\nat peace in your mind,\naligned in your life.',
    lede: 'Wherever you are right now is the perfect place to start.',
    cta_primary: 'Book a session',
    cta_secondary: 'How we work together',
  },
  welcome: {
    eyebrow: 'Welcome',
    heading: 'You don’t have to walk this alone.',
    body:
      'It is so hard to blossom into who you are meant to be when you are navigating illness, destructive behavioral patterns, or invisible blocks. I have been there—and I am living proof that we can grow through our deepest challenges to find ourselves again in greater joy, strength, and purpose.\n\nHealing is a journey, and it is my absolute honor to walk alongside you, however that looks for you.',
  },
  hello: {
    salute: 'I’m Maria.',
    body:
      'I am here to help you feel good in your body, at peace in your mind, and aligned in your life, relationships, and career. My mission is simple: to share the powerful, transformative tools that changed my own life so you can move beyond pain, step past invisible blocks, and fully reclaim your life’s vitality. Wherever you are right now is the perfect place to start.',
  },
  ways: {
    eyebrow: 'Three ways in',
    heading: 'How we work together.',
    intro:
      'True, lasting healing begins with absolute safety. First and foremost, I meet you right where you are with nonjudgmental presence, compassion, and deep listening. Together, we look at what is holding you back today—and where you want to expand in the future.',
    more_label: 'Read more',
    closing:
      'Guided by empathic, intuitive, and channeling gifts, I offer a grounded partnership to help you clear the root causes of suffering and step into lasting wholeness.',
    intro_call_eyebrow: 'Not sure where to start?',
    intro_call_heading: 'Book a free 15-minute intro call.',
    intro_call_body: 'Tell me what is going on and we will find the right place to begin. No payment, no commitment.',
  },
  session: {
    eyebrow: 'Sessions',
    heading: 'What a session feels like.',
    note: 'Sessions are offered online and in person.',
    steps: [
      { title: 'Arrive', body: 'Talk about what is happening and what support you are looking for.' },
      { title: 'Experience', body: 'Explore a practice together at a comfortable pace.' },
      { title: 'Integrate', body: 'Talk about what came up and what might be useful afterward.' },
    ],
  },
  meet: {
    eyebrow: 'Meet Maria',
    heading: 'Every tool I share, I have needed myself.',
    quote: 'A guide, not a pedestal.',
    body:
      'Every tool and modality I share in my practice comes from a place of deep personal experience. I know what it feels like to seek answers, which is why I’ve devoted my life to mastering the practices that continuously restore health, peace, and joy in my own body, relationships, and career.\n\nMy practice is a space of true partnership. Guided by empathic intuition and powerful energy and behavioral modalities, I am here to hold a safe container where your pain is met with understanding, and your potential is given room to bloom.',
    facts: [],
  },
  contact: {
    booking_url: '',
    intro_call_url: '',
    intro_call_label: 'Book an intro call',
    intro_call_heading: 'A free 15-minute intro call',
    intro_call_meta: '15 minutes · phone or video · Free',
    phone: '',
    sms: false,
    email: 'maria@3handshealing.com',
    coming_soon: 'Online booking is coming soon. For now, just email me and we will find a time that works for you.',
    eyebrow: 'Begin where you are',
    heading: 'When you are ready, the next step is simple.',
    body: 'Choose a practice, find a time, and we will take it from there. No account needed.',
    cta_label: 'Book a session',
    fine_1: 'Online or in person · Sessions in Texas',
    fine_2: '',
    cancellation: '',
    location: 'Texas',
    instagram: '',
  },
  page_body: {
    ...PAGE_DEFAULTS,
    eyebrow: 'Physical & systemic health',
    title: 'Where pain lives, ease can return.',
    tagline: 'Gentle, hands-on and energetic care for tension, pain, and symptoms that haven’t budged with other care.',
    tags: 'Candace Silvers Energy Healing, Integrated Bodywork, Chakra Balancing, Somatic Movement & Qi Gong',
    intro:
      'First off, I am here to be with you right where you are, with presence and compassion, establishing safety together. We look at what is hurting you and holding you back, along with where you want to be in the future.\n\nFor the body, that means support for people living with pain, tension, or illness, through bodywork, Candace Silvers Energy Healing, chakra balancing, and Qi Gong and movement practices you can take home with you.',
    sessions_heading: 'Choose what your body needs.',
    sessions: [
      {
        name: 'Candace Silvers Energy Healing',
        length: '',
        where: '',
        price: '',
        summary: 'When conventional or traditional care hasn’t brought relief, Silvers Energy Healing provides a safe, gentle, and effective way to restore balance.',
        details:
          'By scanning your body’s subtle field, this modality locates energetic blockages and realigns your overall state. Working directly with your nervous system, spine, bones, and muscles, Silvers helps release deep-seated strain—supporting your body’s natural ability to heal everything from everyday ailments to chronic pain.',
        book_url: '',
      },
      {
        name: 'Integrated Bodywork',
        length: '',
        where: 'In person',
        price: '',
        summary: 'Restore physical ease and inner balance with tailored bodywork designed for your specific physical needs.',
        details:
          'Combining therapeutic relaxation, targeted bodywork, and specialized lymphatic drainage, every session addresses muscle tension, circulation, and joint mobility. Each session is subtly infused with energy healing to clear physical strain, soothe the nervous system, and leave you deeply rejuvenated.',
        book_url: '',
      },
      {
        name: 'Chakra Balancing',
        length: '15 min',
        where: '',
        price: '',
        summary: 'A focused 15-minute session designed to restore clarity, calm, and flow to your body’s energetic centers.',
        details:
          'Clients frequently experience improved sleep, better digestion, emotional steadiness, and an increased sense of overall well-being following a session. Whether you are feeling overwhelmed, fatigued, dysregulated, or simply want to feel more centered, this quick energetic tune-up provides targeted support.',
        book_url: '',
      },
      {
        name: 'Somatic Movement, Qi Gong & Sacred Arts',
        length: '',
        where: '',
        price: '',
        summary: 'Reconnect with your body’s wisdom, natural power, and innate joy through guided movement practices.',
        details:
          'Blending the slow energy flow of Qi Gong, the rhythmic grounding of belly dance, and the breath and awareness of Tantra meditation practices, these sessions offer a holistic approach to physical and energetic health. Learn practical, body-centered exercises that restore vitality, unleash creative energy, and awaken a deeper, more expressive connection to yourself.',
        book_url: '',
      },
    ],
    steps_heading: 'What a session feels like.',
    intro_call_body: 'Tell me what is happening in your body and what you have already tried. We will find the right place to begin. No pressure, no payment.',
    note: 'Three Hands Healing offers complementary wellness support and is not a substitute for medical care. Please keep working with your doctor on any diagnosed condition.',
    seo_title: 'Energy Healing, Bodywork & Qi Gong in Texas | Three Hands Healing',
    seo_description: 'Candace Silvers Energy Healing, bodywork, chakra balancing and Qi Gong with Maria at Three Hands Healing. Online or in person in Texas.',
  },
  page_mind: {
    ...PAGE_DEFAULTS,
    eyebrow: 'Mind, behavioral & emotional shifts',
    title: 'What the mind holds, the body can release.',
    tagline: 'Clear old patterns, trauma responses and inherited loops, so they stop running your health, relationships and work.',
    tags: 'EFT / Tapping, Systemic Constellations, Emotional Release, Spiritual Counseling',
    intro:
      'Because the mind plays a part in everything in our lives, affecting our health, relationships, and career, shifting a pattern often starts here.\n\nI use Emotional Freedom Technique (tapping), Systemic Constellations, emotional release exercises and spiritual counseling, guided by my empathic and intuitive gifts.',
    sessions_heading: 'Choose where to begin.',
    sessions: [
      {
        name: 'EFT / Tapping',
        length: '',
        where: 'Online or in person',
        price: '',
        summary: 'Emotional Freedom Technique (EFT) is a simple, gentle, and highly effective tool for clearing emotional blocks, trauma responses and unwanted habits.',
        details:
          'During a session, you tap key acupressure points on your own body while I guide you to understand, heal, and upgrade the behavioral patterns affecting your life. EFT helps dissolve negative thought loops, regulate your nervous system, and clear old conditioning—empowering you to take control of your patterns instead of letting them control you.',
        book_url: '',
      },
      {
        name: 'Systemic Constellations',
        length: '',
        where: '',
        price: '',
        summary: 'Systemic Constellations offer a creative approach to shifting deeply ingrained patterns that no longer serve you.',
        details:
          'Patterns originating from our relational systems—including family-of-origin, lineage, culture, and workplace dynamics—are gently acknowledged and integrated, opening space for lasting healing, alignment, and well-being.',
        book_url: '',
      },
      {
        name: 'Emotional Release Exercises',
        length: '',
        where: '',
        price: '',
        summary: 'Emotional release work offers a safe, body-centered space to unwind stored stress, trauma, and unspoken feelings.',
        details:
          'Using movement, conscious breath, and sound, this somatic approach addresses the root causes of chronic tension and nervous system distress—allowing trapped emotions like grief, fear, or anger to move through and out of the body naturally.',
        book_url: '',
      },
      {
        name: 'Spiritual Counseling & Practice',
        length: '',
        where: 'Online or in person',
        price: '',
        summary: 'Expand your spiritual understanding and cultivate deeper connection in your everyday life.',
        details:
          'Through personalized spiritual counseling, you will learn to bridge mind-body practices with daily living using tailored meditation techniques, intentional ritual practices, and intuitive guidance.',
        book_url: '',
      },
    ],
    steps_heading: 'What a session feels like.',
    quote: 'Every tool I share, I have needed myself. I am here to hold a safe container where your pain is met with understanding.',
    intro_call_body: 'Tell me what pattern you keep running into and where you want to be. We will find the right place to begin. No pressure, no payment.',
    note: 'Three Hands Healing offers complementary wellness support and is not a substitute for mental-health or emergency care. If you are in crisis, call or text 988.',
    seo_title: 'EFT / Tapping & Systemic Constellations in Texas | Three Hands Healing',
    seo_description: 'EFT / Tapping sessions, Systemic Constellations, emotional release and spiritual counseling with Maria. Online or in person in Texas.',
  },
  page_pets: {
    ...PAGE_DEFAULTS,
    eyebrow: 'Distance healing for pets',
    title: 'Holistic Care & Distance Healing for Pets',
    home_heading: 'Comfort and calm for your companion, right from home.',
    tagline: 'Gently supporting your companion’s physical health, emotional comfort, and behavior from afar.',
    tags: 'Silvers Energy Healing, Surrogate EFT, Done from a photo',
    intro:
      'Our beloved animal companions often absorb stress, hold physical strain, or suffer from behavioral challenges that traditional methods don’t fully resolve. Because animals are naturally sensitive to energetic shifts, distance healing works remarkably well for them in the comfort of their own home.\n\nUsing a photo of your pet, I provide targeted Silvers Energy Healing to support physical ailments, joint discomfort, and recovery, as well as Surrogate EFT (Emotional Freedom Technique) to address anxiety, fear, trauma, and behavioral issues.',
    sessions_heading: 'Book a session for your pet.',
    sessions: [
      {
        name: 'Distance healing session for your pet',
        length: '',
        where: 'Remote',
        price: '',
        summary: 'Silvers Energy Healing and Surrogate EFT, worked from a photo while your pet rests at home. Pick a time, pay securely, and send the photo after you book.',
        details: '',
        book_url: '',
      },
    ],
    support_heading: 'Body, behavior, and ease.',
    support: [
      { title: 'Physical vitality', body: 'Eases chronic discomfort, supports recovery after illness or surgery, and promotes physical healing.' },
      { title: 'Behavioral & emotional balance', body: 'Reduces anxiety (separation, storm phobias, loud noises), releases past trauma, and calms aggression or reactivity.' },
      { title: 'Stress-free care', body: 'No travel or unfamiliar environments. Healing is delivered remotely using your pet’s photo while they rest peacefully at home.' },
    ],
    steps_heading: 'Three simple steps.',
    steps: [
      { title: 'Book & share', body: 'Book a time, then send a clear, recent photo of your pet and a few lines about what you have noticed.' },
      { title: 'The session', body: 'Your pet rests at home while I work from the photo.' },
      { title: 'Afterward', body: 'I share what came up and what to watch for in the days that follow.' },
    ],
    intro_call_body: 'Tell me about your companion and what you have noticed. I will explain how a distance session works and whether it fits. No pressure, no payment.',
    note: 'Distance healing is complementary care and does not replace your veterinarian. If your pet is unwell or injured, please contact your vet first.',
    seo_title: 'Distance Energy Healing for Pets | Three Hands Healing',
    seo_description: 'Distance healing for dogs, cats and other companions: Silvers Energy Healing and Surrogate EFT from a photo, while your pet rests at home.',
  },
  seo: {
    title: 'EFT / Tapping and Energy Healing in Texas | Three Hands Healing',
    description: 'EFT / Tapping sessions, energy healing, bodywork, Qi Gong and Family Constellations with Maria at Three Hands Healing. Online or in person in Texas.',
  },
  footer: {
    tagline: 'getting healthier and happier',
    disclaimer:
      'Three Hands Healing offers complementary wellness support and is not a substitute for medical, mental-health, or emergency care. If you need urgent help, contact local emergency services or a qualified health professional.',
    note: '© {year} Three Hands Healing',
  },
};
