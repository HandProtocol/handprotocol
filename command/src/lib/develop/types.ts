/*
  HAND Command Center, business-development ("Develop" pillar) types.
  Mirrors command.biz_leads / biz_reviews / biz_touchpoints and the markdown
  frontmatter at biz/<slug>/lead.md. Markdown is canonical, these rows are the
  read replica.

  The outreach play: find a local business with no website but strong Google
  reviews, paste its real reviews, generate a free demo site from them, and use
  that as the cold-outreach hook. 33% minimum of any closed deal routes to the
  HAND pool (deferred past v1).
*/

export const BIZ_STATUSES = [
  "prospect",
  "built",
  "contacted",
  "interested",
  "closed",
  "passed",
] as const;

export type BizStatus = (typeof BIZ_STATUSES)[number];

// Kanban columns, HUD eyebrows in the same register as the grants board.
export const BIZ_KANBAN_COLUMNS: {
  status: BizStatus;
  label: string;
  eyebrow: string;
}[] = [
  { status: "prospect", label: "Prospect", eyebrow: "SIGNAL" },
  { status: "built", label: "Demo built", eyebrow: "FORGED" },
  { status: "contacted", label: "Contacted", eyebrow: "REACHED" },
  { status: "interested", label: "Interested", eyebrow: "WARM" },
  { status: "closed", label: "Closed", eyebrow: "YIELD" },
  { status: "passed", label: "Passed", eyebrow: "CLOSED" },
];

export const WEBSITE_STATUSES = ["none", "poor", "ok"] as const;
export type WebsiteStatus = (typeof WEBSITE_STATUSES)[number];

export const TOUCHPOINT_METHODS = [
  "call",
  "walk_in",
  "email",
  "text",
  "other",
] as const;
export type TouchpointMethod = (typeof TOUCHPOINT_METHODS)[number];

export type BizReview = {
  id: string;
  lead_id: string;
  author: string | null;
  rating: number | null;
  body: string;
  posted_label: string | null;
  sort: number;
  created_at: string;
};

export type BizTouchpoint = {
  id: string;
  lead_id: string;
  method: TouchpointMethod;
  note: string | null;
  occurred_at: string;
  created_at: string;
};

export type BizLead = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  address: string | null;
  google_url: string | null;
  google_rating: number | null;
  reviews_count: number | null;
  website_status: WebsiteStatus;
  status: BizStatus;
  demo_url: string | null;
  demo_generated_at: string | null;
  demo_deployed_at: string | null;
  hand_lead: string | null;
  notes: string | null;
  kanban_position: number;
  column_entered_at: string;
  markdown_path: string;
  content_checksum: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined for the kanban / detail views
  reviews?: BizReview[];
};

// Frontmatter as it appears in biz/<slug>/lead.md. All optional in the file.
export type BizFrontmatter = {
  slug?: string;
  name?: string;
  category?: string;
  city?: string;
  state?: string;
  phone?: string;
  address?: string;
  google_url?: string;
  google_rating?: number | string;
  reviews_count?: number | string;
  website_status?: WebsiteStatus | string;
  status?: BizStatus | string;
  demo_url?: string;
  hand_lead?: string;
};

// The structured copy the assistant returns (or the deterministic fallback
// builds) and the site template renders.
export type SiteCopy = {
  headline: string;
  subhead: string;
  about: string;
  services: { title: string; blurb: string }[];
  testimonials: { body: string; author: string | null }[];
  cta: string;
};

// The call script the pitch page renders. Generated from the business + its
// reviews + the demo angle.
export type PitchScript = {
  opener: string;
  hook: string;
  walkthrough: string[];
  offer: string;
  objections: { q: string; a: string }[];
  close: string;
};

// A follow-up answer captured on the pitch page (command.biz_pitch_responses).
export type PitchResponse = {
  id: string;
  lead_id: string | null;
  lead_slug: string;
  outcome: string | null;
  interest: string | null;
  budget_band: string | null;
  timeline: string | null;
  objections: string | null;
  best_contact: string | null;
  callback_at: string | null;
  other_info: string | null;
  caller: string | null;
  created_at: string;
};
