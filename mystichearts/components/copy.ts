// The collective's own words, from the pasted text and the Raspberry Night design
// (design/HANDOFF.md, "Copy decisions already made"). No em dashes. Edit here, not in the views.

export type ChapterKey = "vision" | "principles" | "land" | "gatherings";

export const CHAPTERS: { key: ChapterKey; label: string }[] = [
  { key: "vision", label: "Our vision" },
  { key: "principles", label: "How we live" },
  { key: "land", label: "The land" },
  { key: "gatherings", label: "Gatherings" },
];

export const VISION = {
  kicker: "Our vision",
  title: ["People. Land. Healing.", "A more connected world."],
  body: [
    "Mystic Hearts Healing Collective is a 10-acre sanctuary in East Austin devoted to collective healing, embodied living, and a more compassionate, connected world.",
    "We hold space for individuals and communities to gather, grow, and remember, through nature, meaningful gatherings, and the wisdom of a diverse community of healers.",
  ],
  quote: "A sanctuary for a kinder, more connected tomorrow.",
  tagline: ["Healing people.", "Healthier communities.", "A brighter tomorrow."],
  footnote: "An interfaith, sober sanctuary. East Austin, Texas. Address provided upon booking or a scheduled visit.",
};

export const PRINCIPLES = {
  kicker: "Community principles",
  title: "How we live together",
  lede: "Our principles guide how we show up, with care for ourselves, for each other, and for the land. They create the foundation for a safe, inclusive, and thriving community.",
  items: [
    ["Acceptance and inclusivity", "Meeting every background, perspective, and spiritual tradition with an open heart."],
    ["Sobriety and presence", "Honoring full, clear presence in our mind, body, and interactions."],
    ["Dedication to healing", "Committing continuously to personal growth, self-healing, and honoring the sanctity of life."],
    ["Non-violent communication", "Expressing needs and resolving conflicts through compassionate, respectful, and peaceful dialogue."],
    ["Reverence for land and community", "Tending with care to our 10 acres of East Austin soil, our animal kin, and one another."],
    ["Self-responsibility", "Owning our emotional impact, personal boundaries, triggers, feelings, and inner state."],
    ["Stewardship", "Ensuring our actions leave a sustainable, harmonious mark on the environment and surrounding neighborhood."],
    ["Reciprocity", "Energy, compensation, care, and labor flow mutually between resident healers, visitors, and the land."],
    ["Confidentiality", "What is shared in session or ceremony stays within the circle, honoring the privacy of every participant."],
  ] as const,
};

export const LAND = {
  kicker: "Grounds and sanctuary spaces",
  title: "A sacred home on 10 acres",
  lede: "Our land offers a variety of spaces for healing, gathering, resting, and creating. From intimate rooms to open ground, every corner is an invitation to slow down and reconnect.",
  spaces: [
    ["The Healing House", "Private sessions, bodywork, and small group offerings."],
    ["Main House", "A welcoming home for community meals, gatherings, and collaboration."],
    ["Large Gathering Yurt", "A spacious ceremonial space for workshops, events, and community."],
    ["Short-Term Stay Yurts", "Cozy, nature-immersed stays for visitors and community members."],
    ["Pool and Hot Tub", "A place to relax, refresh, and connect under the Texas sky."],
    ["Bathhouse", "Beautiful and eco-conscious facilities to support our community."],
    ["Event Lawn", "Wide open ground for festivals, ceremonies, movement, and celebration."],
  ] as const,
};

export const GATHERINGS = {
  kicker: "Gatherings and offerings",
  title: "Spiritual and practical integration for real life",
  lede: "We host workshops, classes, retreats, and community gatherings that support embodied living, personal and collective healing, and life transitions. Our offerings weave together the spiritual and the practical, helping you bring what you learn into everyday life.",
  kinds: [
    "Workshops and classes",
    "Retreats and gatherings",
    "Embodied living",
    "Life transitions",
    "Community meals",
    "Healing arts and modalities",
    "Integration and ongoing support",
  ],
  hosts: {
    title: "Host a gathering on the land",
    body: "Request the Gathering Yurt, Healing House, or Event Lawn for your workshop, circle, or session. We confirm every request personally.",
  },
  note: "First gatherings open fall 2027. The calendar fills from bookings on the land.",
};

// The What's on tab of the get-in-touch sheet, led by Kohsi's breathing calendar.
export const WHATS_ON = {
  lede: "Days that glow gold hold a gathering; softly lit days are open to walk the land. Tap one to see it.",
  ways: {
    calendar: { label: "The calendar", hint: "Gatherings and open days, as they come." },
    visit: { label: "Come out to the land", hint: "A walk and a conversation, on a day of your own." },
  },
  calendar: {
    title: "Gatherings and open days",
    intro: "Loading the Mystic Hearts Healing Collective event registry",
    visit: "Come out to the land",
    empty: "Nothing on the calendar yet. First gatherings open fall 2027.",
    host: "Host a gathering here",
  },
  // The note the Say hello door opens with when the calendar's host button is pressed.
  hostNote: "I would like to host a gathering on the land. ",
  hello: "Something else in mind?",
  helloLink: "Say hello",
  back: "Back to the calendar",
};
