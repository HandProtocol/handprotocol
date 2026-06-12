/*
  Inbox library, server-side reads. Same pattern as
  src/lib/grants/queries.ts: prefer the SSR client (RLS-honoring),
  fall back to the admin client when env vars are present but no
  session exists.
*/
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { InboxItem, InboxStatus } from "./types";

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

const SELECT =
  "id, title, url, body, source, status, resolution_notes, resolved_slug, captured_by, captured_at, resolved_at";

export async function listInboxItems(opts?: {
  status?: InboxStatus;
  limit?: number;
}): Promise<InboxItem[]> {
  const client = await readClient();
  if (!client) return [];

  let query = client.from("inbox_items").select(SELECT);
  if (opts?.status) query = query.eq("status", opts.status);
  query = query
    .order("captured_at", { ascending: false })
    .limit(opts?.limit ?? 100);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as InboxItem[];
}

export async function getInboxCounts(): Promise<Record<InboxStatus, number>> {
  const counts: Record<InboxStatus, number> = {
    needs_triage: 0,
    becomes_grant: 0,
    becomes_funder: 0,
    discarded: 0,
  };
  const client = await readClient();
  if (!client) return counts;
  // One round trip per status keeps the query simple and obvious. The
  // table is small (operator-scale, hundreds of rows at most), so the
  // cost is negligible.
  const statuses = Object.keys(counts) as InboxStatus[];
  await Promise.all(
    statuses.map(async (s) => {
      const { count } = await client
        .from("inbox_items")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      counts[s] = count ?? 0;
    }),
  );
  return counts;
}
