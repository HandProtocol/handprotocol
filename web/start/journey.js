// The HAND start journey, as data.
//
// Shape follows JourneyDefinition in services/onboarding/src/contracts.ts: nodes of the allowed
// types, edges with allowlisted predicates (equals, includes, exists, not). The first edge whose
// predicate matches wins; an edge with no predicate is the default.
//
// Renderer-only additions, ignored by the service:
//   node.path     which of the five paths the node belongs to
//   node.letter   the sentence this answer adds to the letter ({key} is replaced by the answer;
//                 a [bracketed part] is dropped when a key inside it is empty)
//   field.input   choice | multi | text | textarea | email | tel | hidden | check
//   option.says   how the option reads inside a sentence

window.HAND_JOURNEY = {
  key: "hand-start",
  title: "What brings you to HAND?",
  version: 1,
  siteKey: "handprotocol.org",
  startNodeId: "intent",
  privacyNoticeVersion: "2026-10-01-draft",

  paths: {
    support: {
      label: "Receive support",
      kicker: "For Reciprocates",
      reference: "R",
      note: "HAND is a small foundation. Room for new Reciprocates in the pilot cohort is roughly three to eight. If the answer is not yet, we will say so, and say what would change it.",
      links: [
        { label: "Read the research behind HAND", href: "/discovery/" },
        { label: "See what Sovereign Reciprocates means", href: "/sovereign-reciprocates/" },
        { label: "Get occasional updates", href: "/#stay-close" },
      ],
    },
    contribute: {
      label: "Contribute skills",
      kicker: "For Contributors",
      reference: "C",
      note: "HAND curates matches and tends them over time. It is not an open job board, so a match can take a while.",
      links: [
        { label: "Read the resource pool vision", href: "/discovery/skill-exchange-vision.html" },
        { label: "See how exchange models compare", href: "/discovery/skill-exchange-models.html" },
        { label: "Read the governance package", href: "/governance/" },
      ],
    },
    fund: {
      label: "Fund the work",
      kicker: "For funders",
      reference: "F",
      note: "",
      links: [
        { label: "Read the governance package", href: "/governance/" },
        { label: "See the filing raise", href: "/#funding" },
        { label: "Read the research behind HAND", href: "/discovery/" },
      ],
    },
    partner: {
      label: "Partner with HAND",
      kicker: "For collaborators",
      reference: "P",
      note: "",
      links: [
        { label: "See where HAND sits among peer organizations", href: "/discovery/impact-org-landscape.html" },
        { label: "Read the governance package", href: "/governance/" },
        { label: "Read about HAND", href: "/" },
      ],
    },
    triage: {
      label: "A note to HAND",
      kicker: "Read by a person",
      reference: "T",
      note: "A person, not a system, reads your note and decides where it belongs.",
      links: [
        { label: "Read about HAND", href: "/" },
        { label: "Read the research behind HAND", href: "/discovery/" },
        { label: "Get occasional updates", href: "/#stay-close" },
      ],
    },
  },

  nodes: [
    {
      id: "intent",
      type: "single_choice",
      title: "What brings you to HAND?",
      fields: [
        {
          key: "intent",
          label: "What brings you to HAND?",
          input: "choice",
          required: true,
          options: [
            { value: "support", label: "Receive support", tag: "For Reciprocates", description: "My business, project or group could use help." },
            { value: "contribute", label: "Contribute skills", tag: "For Contributors", description: "I have a trade or a skill to offer." },
            { value: "fund", label: "Fund the work", tag: "For funders", description: "I want to give, or talk about funding." },
            { value: "partner", label: "Partner with HAND", tag: "For collaborators", description: "My organization might work with HAND." },
            { value: "choose", label: "Help me choose", tag: "", description: "I am not sure where I fit." },
          ],
        },
        { key: "write_instead", label: "Write a note instead", input: "hidden" },
      ],
    },

    // ---------- Help me choose ----------
    {
      id: "sorter",
      type: "single_choice",
      path: "triage",
      title: "Which sounds most like you?",
      body: "This only picks the next question. You can still end up anywhere.",
      fields: [
        {
          key: "sorter",
          label: "Which sounds most like you?",
          input: "choice",
          required: true,
          options: [
            { value: "support", label: "My work or my group needs help" },
            { value: "contribute", label: "I have skills or time to offer" },
            { value: "fund", label: "I want to give money, or connect a funder" },
            { value: "partner", label: "My organization might work with HAND" },
            { value: "triage", label: "None of these. I would rather just write" },
          ],
        },
      ],
    },

    // ---------- Path 1: Receive support ----------
    {
      id: "identity",
      type: "single_choice",
      path: "support",
      title: "Which is closest to your work?",
      letter: "{identity}.",
      fields: [
        {
          key: "identity",
          label: "Closest description",
          input: "choice",
          required: true,
          options: [
            { value: "impact_entrepreneur", label: "Impact entrepreneur or social venture", says: "I am an impact entrepreneur" },
            { value: "community_business", label: "Community-rooted small business", says: "I run a community-rooted small business" },
            { value: "grassroots_org", label: "Grassroots organization", says: "I am part of a grassroots organization" },
            { value: "emerging_group", label: "A group that is just forming", says: "I am part of a group that is just forming" },
            { value: "unsure", label: "Not sure", says: "I am not sure yet how to describe what I do" },
          ],
        },
      ],
    },
    {
      id: "stage",
      type: "single_choice",
      path: "support",
      title: "Where are you right now?",
      letter: "{stage}.",
      fields: [
        {
          key: "stage",
          label: "Stage",
          input: "choice",
          required: true,
          options: [
            { value: "idea", label: "Early idea", says: "It is an early idea" },
            { value: "forming", label: "Forming", says: "It is forming" },
            { value: "operating", label: "Up and running", says: "It is up and running" },
            { value: "growing", label: "Growing or changing", says: "It is growing or changing" },
          ],
        },
      ],
    },
    {
      id: "work_description",
      type: "short_text",
      path: "support",
      title: "In a sentence or two, what is the work?",
      letter: "The work: {work_description}",
      fields: [
        {
          key: "work_description",
          label: "The work",
          input: "textarea",
          rows: 3,
          required: true,
          maxLength: 280,
          hint: "For example: a taco truck on the east side that hires from the neighborhood.",
          requiredMessage: "Tell us a little about the work. One sentence is enough.",
        },
      ],
    },
    {
      id: "support_needs",
      type: "multiple_choice",
      path: "support",
      title: "What would help most?",
      body: "Choose any that fit. Not being sure is a complete answer.",
      letter: "What would help most: {support_needs}.",
      fields: [
        {
          key: "support_needs",
          label: "What would help",
          input: "multi",
          required: true,
          requiredMessage: "Choose at least one. “I am not sure yet” counts.",
          options: [
            { value: "web", label: "A website or web presence", says: "a website or web presence" },
            { value: "brand", label: "Brand or story", says: "brand or story" },
            { value: "formation", label: "Formation or legal structure", says: "formation or legal structure" },
            { value: "operations", label: "Operations and basic systems", says: "operations and basic systems" },
            { value: "matching", label: "Being matched with skilled people", says: "being matched with skilled people" },
            { value: "funding", label: "Finding funding", says: "finding funding" },
            { value: "sovereign_ai", label: "Tools our group owns and controls", says: "tools our group owns and controls" },
            { value: "long_term", label: "Someone who stays for the long run", says: "someone who stays for the long run" },
            { value: "unsure", label: "I am not sure yet", says: "I am not sure yet" },
          ],
        },
      ],
    },
    {
      id: "obstacle",
      type: "long_text",
      path: "support",
      title: "Where are you stuck, and what have you tried?",
      body: "This is the one answer a person reads most closely. Plain words are fine.",
      letter: "Where I am stuck: {obstacle}",
      fields: [
        {
          key: "obstacle",
          label: "Where you are stuck",
          input: "textarea",
          rows: 6,
          required: true,
          maxLength: 1500,
          requiredMessage: "Write a few words about what is hard right now, so a person knows where to start.",
        },
      ],
    },
    {
      id: "timing",
      type: "single_choice",
      path: "support",
      title: "When would support help most?",
      letter: "Support would help {timing}.",
      fields: [
        {
          key: "timing",
          label: "Timing",
          input: "choice",
          required: true,
          options: [
            { value: "now", label: "Right now", says: "right now" },
            { value: "month", label: "Within a month", says: "within a month" },
            { value: "quarter", label: "This season", says: "this season" },
            { value: "exploring", label: "I am exploring", says: "whenever it fits. I am exploring" },
          ],
        },
      ],
    },
    {
      id: "location",
      type: "single_choice",
      path: "support",
      title: "Where are you based?",
      letter: "I am based {location}[ ({location_city})].",
      fields: [
        {
          key: "location",
          label: "Where you are based",
          input: "choice",
          required: true,
          requiredMessage: "Choose the closest one.",
          options: [
            { value: "austin", label: "Austin area", says: "in the Austin area" },
            { value: "texas", label: "Elsewhere in Texas", says: "elsewhere in Texas" },
            { value: "elsewhere", label: "Somewhere else", says: "outside Texas" },
          ],
        },
        { key: "location_city", label: "City or town", input: "text", maxLength: 80, autocomplete: "address-level2" },
      ],
    },

    // ---------- Path 2: Contribute skills ----------
    {
      id: "profession",
      type: "short_text",
      path: "contribute",
      title: "What is your trade or profession?",
      letter: "My trade or profession: {profession}",
      fields: [
        {
          key: "profession",
          label: "Trade or profession",
          input: "text",
          required: true,
          maxLength: 120,
          hint: "Roofer, bookkeeper, designer, bodyworker, lawyer. Whatever you would say out loud.",
          requiredMessage: "Tell us your trade or profession in a few words.",
          autocomplete: "organization-title",
        },
      ],
    },
    {
      id: "skills",
      type: "multiple_choice",
      path: "contribute",
      title: "What could you offer?",
      body: "Choose any that fit.",
      letter: "I could offer {skill_areas}[. In my words: {skills_summary}]",
      fields: [
        {
          key: "skill_areas",
          label: "What you could offer",
          input: "multi",
          required: true,
          requiredMessage: "Choose at least one. “Something else” counts.",
          options: [
            { value: "web", label: "Web and development", says: "web and development" },
            { value: "design", label: "Design and brand", says: "design and brand" },
            { value: "marketing", label: "Marketing and story", says: "marketing and story" },
            { value: "legal", label: "Legal", says: "legal help" },
            { value: "accounting", label: "Accounting and bookkeeping", says: "accounting and bookkeeping" },
            { value: "trades", label: "Building trades", says: "building trades" },
            { value: "healing", label: "Healing and bodywork", says: "healing and bodywork" },
            { value: "other", label: "Something else", says: "something else" },
          ],
        },
        { key: "skills_summary", label: "Anything to add", input: "text", maxLength: 200 },
      ],
    },
    {
      id: "availability",
      type: "single_choice",
      path: "contribute",
      title: "Where can you help?",
      letter: "I can help {availability}.",
      fields: [
        {
          key: "availability",
          label: "Where you can help",
          input: "choice",
          required: true,
          options: [
            { value: "local", label: "In person around Austin", says: "in person around Austin" },
            { value: "remote", label: "Remotely", says: "remotely" },
            { value: "both", label: "Both", says: "in person around Austin, or remotely" },
          ],
        },
      ],
    },
    {
      id: "capacity",
      type: "single_choice",
      path: "contribute",
      title: "What capacity feels right?",
      letter: "{capacity}.",
      fields: [
        {
          key: "capacity",
          label: "Capacity",
          input: "choice",
          required: true,
          options: [
            { value: "one_time", label: "One focused contribution", says: "One focused contribution feels right" },
            { value: "monthly", label: "A few hours a month", says: "A few hours a month feels right" },
            { value: "ongoing", label: "An ongoing relationship", says: "An ongoing relationship feels right" },
          ],
        },
      ],
    },
    {
      id: "contribution_mode",
      type: "single_choice",
      path: "contribute",
      title: "Would you like to donate time, or exchange?",
      letter: "{contribution_mode}.",
      fields: [
        {
          key: "contribution_mode",
          label: "Donate or exchange",
          input: "choice",
          required: true,
          options: [
            { value: "donate", label: "Donate time", description: "Offer your skills with nothing expected back.", says: "I would like to donate my time" },
            { value: "exchange", label: "Exchange", description: "Give skills and draw on other people's.", says: "I would like to exchange" },
            { value: "unsure", label: "Not sure yet", says: "I am not sure yet whether to donate or exchange" },
          ],
        },
      ],
    },
    {
      id: "exchange_note",
      type: "information",
      path: "contribute",
      title: "Exchange is still being worked out.",
      body: "The intent is settled: people who give skills should be able to draw on other people's. The mechanics are not. How exchanges are tracked, and how they are treated for tax, are open questions that HAND names in its own research. Say yes to exchange now and the reply will be straight with you about what exists today.",
    },
    {
      id: "preferred_work",
      type: "long_text",
      path: "contribute",
      title: "What kind of work would feel like a good use of your time?",
      body: "If a licence or credential matters for your trade, mention it here.",
      letter: "A good use of my time: {preferred_work}",
      fields: [
        { key: "preferred_work", label: "A good use of your time", input: "textarea", rows: 5, maxLength: 1000 },
      ],
    },

    // ---------- Path 3: Fund the work ----------
    {
      id: "funding_mode",
      type: "single_choice",
      path: "fund",
      title: "How would you like to help?",
      letter: "{funding_mode}.",
      fields: [
        {
          key: "funding_mode",
          label: "How you would like to help",
          input: "choice",
          required: true,
          options: [
            { value: "direct", label: "Make a gift now", description: "Go to the giving pages. Nothing is asked of you here.", says: "I would like to make a gift" },
            { value: "conversation", label: "Talk about a larger or institutional gift", says: "I would like to talk about a larger or institutional gift" },
            { value: "sponsorship", label: "Sponsorship or grant", says: "I would like to talk about a sponsorship or a grant" },
          ],
        },
      ],
    },
    {
      id: "gift_exit",
      type: "external_action",
      path: "fund",
      title: "Giving happens on these pages.",
      body: "This page asks nothing about a gift and keeps nothing. One thing to know first: HAND is not yet a registered 501(c)(3). If tax deductibility matters for your gift, write to us before you give and we will tell you exactly where things stand.",
      completionActions: [
        { label: "Give on Giveth", href: "https://giveth.io/project/hand-protocol", external: true },
        { label: "Give crypto directly", href: "/donate-crypto/" },
        { label: "See the giving tiers", href: "/#tiers" },
      ],
    },
    {
      id: "funding_interest",
      type: "single_choice",
      path: "fund",
      title: "What draws you to HAND?",
      letter: "What draws me to HAND: {funding_interest}.",
      fields: [
        {
          key: "funding_interest",
          label: "What draws you",
          input: "choice",
          required: true,
          options: [
            { value: "filing", label: "The 501(c)(3) filing raise", says: "the 501(c)(3) filing raise" },
            { value: "reciprocates", label: "Long-term support for Reciprocates", says: "long-term support for Reciprocates" },
            { value: "contributors", label: "The resource pool and Contributors", says: "the resource pool and Contributors" },
            { value: "sovereign_ai", label: "Sovereign Reciprocates", says: "Sovereign Reciprocates" },
            { value: "general", label: "The work as a whole", says: "the work as a whole" },
          ],
        },
      ],
    },
    {
      id: "organization",
      type: "short_text",
      path: "fund",
      title: "Is there an organization or fund we should know about?",
      letter: "I am connected to {organization}.",
      fields: [
        { key: "organization", label: "Organization or fund", input: "text", maxLength: 120, autocomplete: "organization" },
      ],
    },
    {
      id: "expected_range",
      type: "single_choice",
      path: "fund",
      title: "Is there a range you can share?",
      letter: "{expected_range}.",
      fields: [
        {
          key: "expected_range",
          label: "Range",
          input: "choice",
          required: true,
          options: [
            { value: "under_5k", label: "Under $5,000", says: "The range I have in mind is under $5,000" },
            { value: "5_25k", label: "$5,000 to $25,000", says: "The range I have in mind is $5,000 to $25,000" },
            { value: "25_100k", label: "$25,000 to $100,000", says: "The range I have in mind is $25,000 to $100,000" },
            { value: "100k_plus", label: "$100,000 or more", says: "The range I have in mind is $100,000 or more" },
            { value: "unknown", label: "Still exploring", says: "I am still exploring the amount" },
            { value: "private", label: "Prefer not to say", says: "I would rather not name a range yet" },
          ],
        },
      ],
    },
    {
      id: "funding_timing",
      type: "single_choice",
      path: "fund",
      title: "What timing are you working with?",
      letter: "Timing: {funding_timing}.",
      fields: [
        {
          key: "funding_timing",
          label: "Timing",
          input: "choice",
          required: true,
          options: [
            { value: "now", label: "Now", says: "now" },
            { value: "quarter", label: "This quarter", says: "this quarter" },
            { value: "year", label: "This year", says: "this year" },
            { value: "unknown", label: "Still exploring", says: "still exploring" },
          ],
        },
      ],
    },
    {
      id: "funding_note",
      type: "long_text",
      path: "fund",
      title: "What would you want to see from HAND before deciding?",
      letter: "Before deciding I would want to see: {funding_note}",
      fields: [
        { key: "funding_note", label: "What you would want to see", input: "textarea", rows: 5, maxLength: 1000 },
      ],
    },

    // ---------- Path 4: Partner ----------
    {
      id: "partner_type",
      type: "single_choice",
      path: "partner",
      title: "What kind of organization are you?",
      letter: "I am writing from {partner_type}.",
      fields: [
        {
          key: "partner_type",
          label: "Kind of organization",
          input: "choice",
          required: true,
          options: [
            { value: "community_org", label: "Community organization", says: "a community organization" },
            { value: "fiscal_sponsor", label: "Fiscal sponsor", says: "a fiscal sponsor" },
            { value: "funder_intermediary", label: "Funder or intermediary", says: "a funder or intermediary" },
            { value: "referral_partner", label: "Referral partner", says: "a referral partner" },
            { value: "technology_partner", label: "Technology partner", says: "a technology partner" },
            { value: "other", label: "Something else", says: "another kind of collaborator" },
          ],
        },
      ],
    },
    {
      id: "partner_org",
      type: "short_text",
      path: "partner",
      title: "What is the organization called?",
      letter: "It is called {partner_org}.",
      fields: [
        {
          key: "partner_org",
          label: "Organization name",
          input: "text",
          required: true,
          maxLength: 120,
          autocomplete: "organization",
          requiredMessage: "Add the organization's name so we know who is writing.",
        },
      ],
    },
    {
      id: "relationship",
      type: "long_text",
      path: "partner",
      title: "What do you have in mind?",
      body: "Name the first useful shape. It can change once people talk.",
      letter: "What I have in mind: {relationship}",
      fields: [
        {
          key: "relationship",
          label: "What you have in mind",
          input: "textarea",
          rows: 6,
          required: true,
          maxLength: 1500,
          requiredMessage: "A sentence or two about what you have in mind is enough.",
        },
      ],
    },
    {
      id: "mutual_value",
      type: "long_text",
      path: "partner",
      title: "What could be useful in both directions?",
      letter: "What could be useful in both directions: {mutual_value}",
      fields: [
        { key: "mutual_value", label: "Useful in both directions", input: "textarea", rows: 4, maxLength: 1000 },
      ],
    },
    {
      id: "partner_timing",
      type: "single_choice",
      path: "partner",
      title: "What is the timing?",
      letter: "{partner_timing}.",
      fields: [
        {
          key: "partner_timing",
          label: "Timing",
          input: "choice",
          required: true,
          options: [
            { value: "now", label: "A current need", says: "This is a current need" },
            { value: "quarter", label: "This quarter", says: "This quarter would be good" },
            { value: "future", label: "A future possibility", says: "It is a future possibility" },
            { value: "exploring", label: "Still exploring", says: "I am still exploring" },
          ],
        },
      ],
    },

    // ---------- The note path (human triage) ----------
    {
      id: "triage_need",
      type: "long_text",
      path: "triage",
      title: "What is happening, and what do you hope changes?",
      body: "Write it the way you would say it. A person reads this, not a system.",
      letter: "{triage_need}",
      fields: [
        {
          key: "triage_need",
          label: "Your note",
          input: "textarea",
          rows: 7,
          required: true,
          maxLength: 2000,
          requiredMessage: "Write a few words so a person knows why you are getting in touch.",
        },
      ],
    },
    {
      id: "triage_timing",
      type: "single_choice",
      path: "triage",
      title: "How soon would a reply help?",
      letter: "A reply would help {triage_timing}.",
      fields: [
        {
          key: "triage_timing",
          label: "How soon",
          input: "choice",
          required: true,
          options: [
            { value: "now", label: "Now", says: "now" },
            { value: "soon", label: "Soon", says: "soon" },
            { value: "exploring", label: "I am exploring", says: "whenever you can. I am exploring" },
          ],
        },
      ],
    },

    // ---------- Shared ending ----------
    {
      id: "contact",
      type: "email",
      title: "Where should a real person reply?",
      body: "Used only to reply to you.",
      letter: "My name is {name}. You can reply to me at {email}[, or call {phone}].[ I am with {organization_name}.]",
      fields: [
        { key: "name", label: "Your name", input: "text", required: true, maxLength: 100, autocomplete: "name", requiredMessage: "Add your name so we know what to call you." },
        { key: "email", label: "Email", input: "email", required: true, maxLength: 200, autocomplete: "email", requiredMessage: "Enter an email address so we can reply, like name@example.com." },
        { key: "phone", label: "Phone", input: "tel", maxLength: 40, autocomplete: "tel" },
        { key: "organization_name", label: "Business, group or organization", input: "text", maxLength: 120, autocomplete: "organization", prefillFrom: ["partner_org", "organization"] },
      ],
    },
    {
      id: "review",
      type: "review",
      title: "Read your note before it goes.",
      body: "This is everything that will be sent. Change anything that reads wrong.",
    },
    {
      id: "consent",
      type: "consent",
      title: "Privacy",
      body: "HAND uses what you send to reply to you and to work out a next step with you. It is not sold, and it is not used for advertising. You can ask us to delete it at any time.",
      fields: [
        { key: "privacy_ack", label: "I have read this and I am ready to send my note.", input: "check", required: true, requiredMessage: "Tick this box to send your note." },
        { key: "updates_opt_in", label: "Send me occasional HAND updates as well. Optional.", input: "check" },
      ],
    },
    {
      id: "received",
      type: "completion",
      title: "We have your note.",
    },
  ],

  edges: [
    { from: "intent", to: "triage_need", when: { field: "write_instead", operator: "equals", value: true } },
    { from: "intent", to: "identity", when: { field: "intent", operator: "equals", value: "support" } },
    { from: "intent", to: "profession", when: { field: "intent", operator: "equals", value: "contribute" } },
    { from: "intent", to: "funding_mode", when: { field: "intent", operator: "equals", value: "fund" } },
    { from: "intent", to: "partner_type", when: { field: "intent", operator: "equals", value: "partner" } },
    { from: "intent", to: "sorter" },

    { from: "sorter", to: "identity", when: { field: "sorter", operator: "equals", value: "support" } },
    { from: "sorter", to: "profession", when: { field: "sorter", operator: "equals", value: "contribute" } },
    { from: "sorter", to: "funding_mode", when: { field: "sorter", operator: "equals", value: "fund" } },
    { from: "sorter", to: "partner_type", when: { field: "sorter", operator: "equals", value: "partner" } },
    { from: "sorter", to: "triage_need" },

    { from: "identity", to: "stage" },
    { from: "stage", to: "work_description" },
    { from: "work_description", to: "support_needs" },
    { from: "support_needs", to: "obstacle" },
    { from: "obstacle", to: "timing" },
    { from: "timing", to: "location" },
    { from: "location", to: "contact" },

    { from: "profession", to: "skills" },
    { from: "skills", to: "availability" },
    { from: "availability", to: "capacity" },
    { from: "capacity", to: "contribution_mode" },
    { from: "contribution_mode", to: "exchange_note", when: { field: "contribution_mode", operator: "equals", value: "exchange" } },
    { from: "contribution_mode", to: "preferred_work" },
    { from: "exchange_note", to: "preferred_work" },
    { from: "preferred_work", to: "contact" },

    { from: "funding_mode", to: "gift_exit", when: { field: "funding_mode", operator: "equals", value: "direct" } },
    { from: "funding_mode", to: "funding_interest" },
    { from: "funding_interest", to: "organization" },
    { from: "organization", to: "expected_range" },
    { from: "expected_range", to: "funding_timing" },
    { from: "funding_timing", to: "funding_note" },
    { from: "funding_note", to: "contact" },

    { from: "partner_type", to: "partner_org" },
    { from: "partner_org", to: "relationship" },
    { from: "relationship", to: "mutual_value" },
    { from: "mutual_value", to: "partner_timing" },
    { from: "partner_timing", to: "contact" },

    { from: "triage_need", to: "triage_timing" },
    { from: "triage_timing", to: "contact" },

    { from: "contact", to: "review" },
    { from: "review", to: "consent" },
    { from: "consent", to: "received" },
  ],

  routingRules: [
    { id: "support-now", when: [{ field: "timing", operator: "equals", value: "now" }], priority: "high", destinationKey: "intake" },
    { id: "triage-now", when: [{ field: "triage_timing", operator: "equals", value: "now" }], priority: "high", destinationKey: "intake" },
    { id: "default", when: [], priority: "normal", destinationKey: "intake" },
  ],
};
