/*
  HAND Command Center, inbox types.
  Mirrors command.inbox_items (migration 014). Phase 2 H4 in the PRD.
  Raw funder leads land here from manual paste, the future browser
  extension, or an email forward. Operator triages each into a grant,
  a funder, or discards with a reason.
*/

export const INBOX_SOURCES = ["manual", "api", "email", "extension"] as const;
export type InboxSource = (typeof INBOX_SOURCES)[number];

export const INBOX_STATUSES = [
  "needs_triage",
  "becomes_grant",
  "becomes_funder",
  "discarded",
] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];

export const INBOX_STATUS_LABELS: Record<InboxStatus, string> = {
  needs_triage: "Needs triage",
  becomes_grant: "Became grant",
  becomes_funder: "Became funder",
  discarded: "Discarded",
};

export type InboxItem = {
  id: string;
  title: string | null;
  url: string | null;
  body: string | null;
  source: InboxSource;
  status: InboxStatus;
  resolution_notes: string | null;
  resolved_slug: string | null;
  captured_by: string | null;
  captured_at: string;
  resolved_at: string | null;
};
