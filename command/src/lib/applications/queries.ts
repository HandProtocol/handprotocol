/*
  HAND Command Center — access-application data fetchers (admin review view).
  Server-side. Uses the SSR client (auth + RLS, access_applications_admin_all
  policy) when a session exists, falls back to the admin client for the
  local-dev preview — the same trick as develop/queries.ts and invites/queries.ts.

  Call sites gate on can(profile,'users.manage') before rendering; these readers
  add no guard of their own (RLS denies non-admins on the live read path anyway).
*/
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { AccessApplication, ApplicationStatus } from "./types";

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "command" },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function readClient() {
  if (!configured()) return null;
  try {
    return await createServerClient();
  } catch {
    return adminClient();
  }
}

const APPLICATION_SELECT =
  "id, email, name, organization, desired_role, reciprocate_group, message, status, invite_code, reviewed_by, reviewed_at, source, user_agent, ip_hash, created_at";

// Applications, newest first. Optionally filter by status. Admin-only at the
// call site (the section guards on can(profile,'users.manage')).
export async function listApplications(
  status?: ApplicationStatus,
): Promise<AccessApplication[]> {
  const client = await readClient();
  if (!client) return [];
  let query = client
    .from("access_applications")
    .select(APPLICATION_SELECT)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as AccessApplication[];
}
