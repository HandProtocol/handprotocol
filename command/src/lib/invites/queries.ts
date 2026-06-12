/*
  HAND Command Center — invite data fetchers (admin view).
  Server-side. Uses the SSR client (auth + RLS, invites_admin_all policy) when a
  session exists, falls back to the admin client for the local-dev preview, the
  same trick as develop/queries.ts and grants.
*/
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Invite } from "./types";

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

const INVITE_SELECT =
  "code, email, role, reciprocate_group, expires_at, used_at, used_by, created_by, created_at";

// All invites, newest first. Admin-only at the call site (the page guards on
// can(profile,'users.manage') before rendering this).
export async function listInvites(): Promise<Invite[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("invites")
    .select(INVITE_SELECT)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as Invite[];
}
