/*
  HAND Command Center — access-application types. Mirrors
  command.access_applications (020_access_applications.sql): the pre-account
  queue fed by the public "Apply for Command Center" form. An applicant has no
  command.profiles row until they redeem the invite issued on approval.

  desired_role at the DB level allows the full role set so an admin override can
  land any value, but the PUBLIC form only offers the self-service subset below
  — 'admin' is never selectable; admins are made only by existing admins.
*/
import type { CommandRole } from "@/lib/supabase/profile";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export type AccessApplication = {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  desired_role: CommandRole;
  reciprocate_group: string | null;
  message: string | null;
  status: ApplicationStatus;
  invite_code: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
};

// Roles a member of the public may request for themselves. Deliberately
// excludes 'admin' — that role is only ever granted by an existing admin. The
// submit action server-side rejects 'admin' regardless of what's posted.
export const SELF_SERVICE_ROLES = [
  "contributor",
  "develop_rep",
  "funding_lead",
  "viewer",
] as const;

export type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

export function isSelfServiceRole(value: unknown): value is SelfServiceRole {
  return (
    typeof value === "string" &&
    (SELF_SERVICE_ROLES as readonly string[]).includes(value)
  );
}

// Labels for the public apply select. Kept user-facing and jargon-light; the
// role keys still map 1:1 to CommandRole / the invite role set.
export const SELF_SERVICE_ROLE_OPTIONS: {
  value: SelfServiceRole;
  label: string;
}[] = [
  { value: "contributor", label: "Contributor — read everything + comment" },
  { value: "develop_rep", label: "Develop rep — business-outreach pipeline" },
  { value: "funding_lead", label: "Funding lead — grants & funders" },
  { value: "viewer", label: "Viewer — scoped read access" },
];

// Field length caps. The public submit action is service-role and unauthed, so
// every field is bounded server-side before it ever touches the table.
export const APPLICATION_LIMITS = {
  email: 254,
  name: 120,
  organization: 160,
  reciprocate_group: 80,
  message: 2000,
  source: 80,
  user_agent: 512,
} as const;

// The typed validation failure the PUBLIC submit action can return. Anything
// unexpected is swallowed (the visitor still sees a generic success) so the
// service-role endpoint never leaks internals.
export type SubmitFieldError = "email" | "name" | "desired_role" | "message";

export type SubmitApplicationResult =
  | { ok: true }
  | { ok: false; error: "validation"; fields: SubmitFieldError[] };

export type SubmitApplicationInput = {
  email: string;
  name?: string;
  organization?: string;
  desired_role: string;
  reciprocate_group?: string;
  message?: string;
  // Honeypot: a hidden field real users never fill. Bots that auto-complete it
  // get a silent success (no row written).
  company_website?: string;
  // Provenance, captured client-side. Never trusted for anything but display.
  source?: string;
};
