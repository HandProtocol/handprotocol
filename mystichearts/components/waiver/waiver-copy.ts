// What the /waiver page says around the forms. The forms' own words live in Kohsi (published from
// waivers/forms.mjs). No em dashes.

export type ReasonKey = "fairy-ball" | "visit" | "volunteer" | "child";

export type Reason = {
  key: ReasonKey;
  label: string;
  hint: string;
  forms: string[];
  // Shown only while this form is published (the Fairy Ball addendum retires after the night).
  needs?: string;
  event?: string;
};

export const REASONS: Reason[] = [
  {
    key: "fairy-ball",
    label: "The 1111 Immaculate Fairy Ball",
    hint: "Wednesday, November 11",
    forms: ["land-release", "fairy-ball-2026", "community-agreements", "media"],
    needs: "fairy-ball-2026",
    event: "fairy-ball-2026",
  },
  { key: "visit", label: "A visit or a gathering", hint: "Open days, workshops, circles, meals and stays", forms: ["land-release", "community-agreements", "media"] },
  { key: "volunteer", label: "Volunteering on the land", hint: "Work days, building, gardening and skill exchange", forms: ["land-release", "volunteer", "community-agreements", "media"] },
  { key: "child", label: "I am bringing someone under 18", hint: "A parent or legal guardian signs for each child", forms: ["minor-consent"] },
];

export const PRIVACY = {
  title: "What we keep, and why",
  items: [
    "Your name, email, phone (if you give it), your emergency contact, any child's name and birth date, your signature, and the time, browser and internet address you signed from.",
    "We keep these so we know who has agreed to what, can reach someone if you are hurt, and can show the agreement if it is ever needed.",
    "Only the collective's organizers and HAND Protocol, which runs the collective's booking system, can see them. We never sell them or use them for marketing.",
    "Signed waivers are legal records, so we keep them for at least four years after you sign, and for a child until at least four years after they turn 18.",
    "Questions, a copy, or a correction: mysticheartshealing@gmail.com.",
  ],
};

export const STEPS = ["Why you are coming", "About you", "Read and initial", "Sign"] as const;
