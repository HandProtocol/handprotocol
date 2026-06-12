/*
  HAND Command Center — invite types. Mirrors command.invites (012_invites.sql,
  role enum widened in 022_pillar_roles.sql). One-time-use codes that pre-assign
  a role (+ optional reciprocate_group) and land the redeemer at status='active'.
*/
import type { CommandRole } from "@/lib/supabase/profile";

export type Invite = {
  code: string;
  email: string | null;
  role: CommandRole;
  reciprocate_group: string | null;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_by: string | null;
  created_at: string;
};

// The typed failure modes a redemption can hit. Anything else is a thrown
// error (misconfig / unexpected), surfaced as a generic message at the route.
export type RedeemError =
  | "expired"
  | "used"
  | "invalid"
  | "not-authenticated";

export type RedeemResult =
  | { ok: true; role: CommandRole; reciprocate_group: string | null }
  | { ok: false; error: RedeemError };

export type CreateInviteResult = {
  code: string;
  link: string;
  emailed: boolean;
};
