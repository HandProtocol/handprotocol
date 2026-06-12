/*
  HAND Command Center, data fetchers for grants and funders.
  Runs on the server. Uses the Supabase SSR client when an auth session
  exists (so RLS applies), otherwise falls back to the admin client for
  the local-dev preview mode. Same trick as the dashboard layout.
*/
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { GrantRecord, FunderRecord, TouchpointRecord } from "./types";

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

// Use the SSR client when possible (auth + RLS). Fall back to the admin
// client when no env vars are set, so the preview dashboard renders.
async function readClient() {
  if (!configured()) return null;
  try {
    // SSR client honors the operator's session and RLS.
    return await createServerClient();
  } catch {
    return adminClient();
  }
}

const GRANT_SELECT =
  "id, slug, name, funder_id, status, award_type, award_size, amount_requested, amount_awarded, match_required, reporting, deadline, discovered_on, submitted_on, decided_on, reciprocate_group, fit_score, hand_lead, contact, funder_url, program_url, application_url, kanban_position, column_entered_at, markdown_path, content_checksum, last_synced_at, created_at, updated_at, funders(name)";

type GrantRow = Omit<GrantRecord, "funder_name"> & {
  funders: { name: string | null } | null;
};

function flatten(row: GrantRow): GrantRecord {
  const { funders, ...rest } = row;
  return { ...rest, funder_name: funders?.name ?? null };
}

export async function listGrants(): Promise<GrantRecord[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("grants")
    .select(GRANT_SELECT)
    .order("kanban_position", { ascending: true })
    .order("deadline", { ascending: true, nullsFirst: false });
  if (error || !data) return [];
  return (data as unknown as GrantRow[]).map(flatten);
}

export async function getGrantBySlug(slug: string): Promise<GrantRecord | null> {
  const client = await readClient();
  if (!client) return null;
  const { data, error } = await client
    .from("grants")
    .select(GRANT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return flatten(data as unknown as GrantRow);
}

export async function listFunders(): Promise<FunderRecord[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("funders")
    .select(
      "id, slug, name, funder_url, type, geography, focus_areas, mission_alignment_notes, fit_score, annual_cycle",
    )
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as FunderRecord[];
}

export async function getFunderBySlug(
  slug: string,
): Promise<FunderRecord | null> {
  const client = await readClient();
  if (!client) return null;
  const { data, error } = await client
    .from("funders")
    .select(
      "id, slug, name, funder_url, type, geography, focus_areas, mission_alignment_notes, fit_score, annual_cycle",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as FunderRecord;
}

// Touchpoint log for a single funder, newest first. Relationships outlive
// single grants (PRD section 7.3, Nurture pillar).
export async function listFunderTouchpoints(
  funderId: string,
): Promise<TouchpointRecord[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("touchpoints")
    .select(
      "id, funder_id, grant_id, occurred_on, channel, direction, summary, notes, follow_up_on, created_at",
    )
    .eq("funder_id", funderId)
    .order("occurred_on", { ascending: false });
  if (error || !data) return [];
  return data as TouchpointRecord[];
}

export async function getGrantSlugs(): Promise<Set<string>> {
  const client = await readClient();
  if (!client) return new Set();
  const { data, error } = await client.from("grants").select("slug");
  if (error || !data) return new Set();
  return new Set(data.map((d) => (d as { slug: string }).slug));
}
