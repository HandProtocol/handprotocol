import { cache } from "react";
import { createClient } from "./server";

/*
  Profile + access-control helpers for the HAND Command Center.

  Identity is Supabase Auth (auth.users); command.profiles extends it with a
  pillar role + access status (see migration 022_pillar_roles.sql):

    admin         full access, manages users/invites/settings, all pillars
    funding_lead  manages Grants/Funders/Deadlines/Boilerplate; reads Develop;
                  triages feedback ("fund roles")
    develop_rep   manages the Develop/biz pipeline; reads Grants/Funders
    contributor   reads everything + comment/suggest
    viewer        read, scoped to a reciprocate_group

  status gates access independent of role: 'pending' (un-invited signup, no
  access) / 'active' / 'suspended'. current_role() in the DB returns 'pending'
  for non-active accounts so RLS denies them; can() mirrors that here.

  IMPORTANT: server actions use the service_role client (createAdminClient),
  which BYPASSES RLS. So mutations MUST gate on requireCapability()/requireRole()
  in app code — RLS alone does not protect writes.

  When env vars are missing (local scaffold preview) these helpers return null
  so pages still render; auth/role enforcement starts as soon as the vars are set.
*/

export type CommandRole =
  | "admin"
  | "funding_lead"
  | "develop_rep"
  | "contributor"
  | "viewer";

export type CommandStatus = "active" | "pending" | "suspended";

export type CommandProfile = {
  id: string;
  user_id: string; // alias of id (profiles PK === auth.users.id)
  role: CommandRole;
  status: CommandStatus;
  display_name: string | null;
  reciprocate_group: string | null; // scopes viewer access
};

// ─── Capability model ────────────────────────────────────────────────────
// One vocabulary the whole app gates on: server actions, nav visibility, and
// page guards. Keep in lockstep with the RLS policies in 022_pillar_roles.sql.
export type Capability =
  | "users.manage" // create/promote/suspend profiles, manage invites
  | "settings.manage"
  | "grants.manage"
  | "grants.read"
  | "funders.manage"
  | "funders.read"
  | "boilerplate.manage"
  | "develop.manage" // biz leads, demos, pitch, touchpoints
  | "develop.read"
  | "feedback.triage" // change pin status
  | "feedback.read"
  | "comment";

const CAPABILITIES: Record<CommandRole, Capability[] | ["*"]> = {
  admin: ["*"],
  funding_lead: [
    "grants.manage",
    "grants.read",
    "funders.manage",
    "funders.read",
    "boilerplate.manage",
    "develop.read",
    "feedback.triage",
    "feedback.read",
    "comment",
  ],
  develop_rep: [
    "develop.manage",
    "develop.read",
    "grants.read",
    "funders.read",
    "feedback.read",
  ],
  contributor: [
    "grants.read",
    "funders.read",
    "develop.read",
    "feedback.read",
    "comment",
  ],
  viewer: ["grants.read", "funders.read", "develop.read"],
};

/** True if the profile is active and its role grants `cap`. */
export function can(
  profile: CommandProfile | null,
  cap: Capability,
): boolean {
  if (!profile || profile.status !== "active") return false;
  const grants = CAPABILITIES[profile.role];
  return grants[0] === "*" || (grants as Capability[]).includes(cap);
}

export const getCurrentUser = cache(async () => {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});

export const getCurrentProfile = cache(
  async (): Promise<CommandProfile | null> => {
    const user = await getCurrentUser();
    if (!user) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      // profiles PK `id` === auth.users.id (NOT a separate user_id column)
      .select("id, role, status, display_name, reciprocate_group")
      .eq("id", user.id)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    return { ...data, user_id: user.id } as CommandProfile;
  },
);

export async function requireProfile(): Promise<CommandProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No command profile found");
  return profile;
}

/** Throws unless the current user is active AND holds `cap`. Use in actions. */
export async function requireCapability(
  cap: Capability,
): Promise<CommandProfile> {
  const profile = await requireProfile();
  if (!can(profile, cap)) {
    throw new Error(`Forbidden: requires capability "${cap}"`);
  }
  return profile;
}

/** Throws unless the current user is active AND in one of `roles`. */
export async function requireRole(
  ...roles: CommandRole[]
): Promise<CommandProfile> {
  const profile = await requireProfile();
  if (profile.status !== "active" || !roles.includes(profile.role)) {
    throw new Error(`Forbidden: requires role ${roles.join(" | ")}`);
  }
  return profile;
}

export { CAPABILITIES };
