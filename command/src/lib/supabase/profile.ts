import { cache } from "react";
import { createClient } from "./server";

/*
  Profile helpers for the HAND Command Center.
  Adapted from noredFarms/reps/src/lib/supabase/profile.ts. The reps-specific
  `rep_profiles` table is replaced by a generic `command.profiles` table
  scoped to grant admins, contributors, and viewers (per PRD section 6).

  v1.0 note: the table doesn't exist yet. These helpers compile and return
  null when env vars are missing, so the scaffold renders cleanly without a
  live Supabase project. Phase 5 (production hardening) wires this up.
*/
export type CommandProfile = {
  id: string;
  user_id: string;
  role: "admin" | "contributor" | "viewer";
  display_name: string | null;
  reciprocate_group: string | null; // V2: scopes viewer access
};

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
      .select("id, role, display_name, reciprocate_group")
      .eq("user_id", user.id)
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
