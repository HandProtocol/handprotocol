/*
  HAND Command Center grant types.
  Source of truth: PRD section 6.3 + the markdown frontmatter contract in
  funding/grants/_template.md. These types mirror command.grants and
  command.funders, with the optional fields the markdown carries.
*/

export const GRANT_STATUSES = [
  "discovery",
  "drafting",
  "submitted",
  "awarded",
  "declined",
  "withdrawn",
  "closed",
] as const;

export type GrantStatus = (typeof GRANT_STATUSES)[number];

// Six kanban columns from the PRD section 7.1. `closed` is a terminal
// archive status (e.g. funder cancelled the program) and lives outside
// the board.
export const KANBAN_COLUMNS: { status: GrantStatus; label: string; eyebrow: string }[] = [
  { status: "discovery", label: "Discovery", eyebrow: "SIGNAL" },
  { status: "drafting", label: "Drafting", eyebrow: "WEAVE" },
  { status: "submitted", label: "Submitted", eyebrow: "BLOOM" },
  { status: "awarded", label: "Awarded", eyebrow: "BLOOM · YIELD" },
  { status: "declined", label: "Declined", eyebrow: "BLOOM · CLOSED" },
  { status: "withdrawn", label: "Withdrawn", eyebrow: "WITHDRAWN" },
];

export type GrantRecord = {
  id: string;
  slug: string;
  name: string;
  funder_id: string | null;
  status: GrantStatus;
  award_type: string | null;
  award_size: string | null;
  amount_requested: number | null;
  amount_awarded: number | null;
  match_required: string | null;
  reporting: string | null;
  deadline: string | null;
  discovered_on: string | null;
  submitted_on: string | null;
  decided_on: string | null;
  reciprocate_group: string | null;
  fit_score: number | null;
  hand_lead: string | null;
  contact: string | null;
  funder_url: string | null;
  program_url: string | null;
  application_url: string | null;
  kanban_position: number;
  column_entered_at: string;
  markdown_path: string;
  content_checksum: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined for kanban / list views
  funder_name?: string | null;
};

export type FunderRecord = {
  id: string;
  slug: string;
  name: string;
  funder_url: string | null;
  type: string | null;
  geography: string[] | null;
  focus_areas: string[] | null;
  mission_alignment_notes: string | null;
  fit_score: number | null;
  annual_cycle: string | null;
};

// One funder interaction from command.touchpoints (005). Tied to the
// funder, optionally to a grant. Powers the Nurture log on /funders/<slug>.
export type TouchpointRecord = {
  id: string;
  funder_id: string;
  grant_id: string | null;
  occurred_on: string;
  channel: string | null;
  direction: string | null;
  summary: string;
  notes: string | null;
  follow_up_on: string | null;
  created_at: string;
};

// Frontmatter as it appears in funding/grants/<slug>.md. All fields are
// optional in the file even if the table requires them; the ingest layer
// fills defaults. The `funder` field in the markdown is the funder's
// display name, used to upsert into command.funders.
export type GrantFrontmatter = {
  slug?: string;
  name?: string;
  funder?: string;
  funder_url?: string;
  program_url?: string;
  application_url?: string;
  status?: GrantStatus | string;
  award_type?: string;
  award_size?: string;
  amount_requested?: number | string;
  amount_awarded?: number | string;
  match_required?: string;
  reporting?: string;
  deadline?: string;
  discovered_on?: string;
  submitted_on?: string;
  decided_on?: string;
  contact?: string;
  hand_lead?: string;
  fit_score?: number | string;
  reciprocate_group?: string;
};

export type IngestSummary = {
  scanned: number;
  inserted: number;
  updated: number;
  unchanged: number;
  fundersCreated: number;
  fundersUpdated: number;
  errors: { file: string; message: string }[];
};
