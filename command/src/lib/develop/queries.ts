/*
  HAND Command Center, data fetchers for business-development leads.
  Server-side. Uses the SSR client (auth + RLS) when a session exists, falls
  back to the admin client for the local-dev preview, same trick as grants.
*/
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type {
  BizLead,
  BizReview,
  BizTouchpoint,
  BizVisit,
  PitchResponse,
  VisitStats,
} from "./types";

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

const LEAD_SELECT =
  "id, slug, name, category, city, state, phone, address, google_url, google_rating, reviews_count, website_status, status, demo_url, demo_generated_at, demo_deployed_at, hand_lead, notes, kanban_position, column_entered_at, markdown_path, content_checksum, last_synced_at, created_at, updated_at";

export async function listBizLeads(): Promise<BizLead[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("biz_leads")
    .select(LEAD_SELECT)
    .order("kanban_position", { ascending: true })
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as BizLead[];
}

export async function getBizLeadBySlug(slug: string): Promise<BizLead | null> {
  const client = await readClient();
  if (!client) return null;
  const { data, error } = await client
    .from("biz_leads")
    .select(LEAD_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  const lead = data as unknown as BizLead;
  lead.reviews = await listReviews(lead.id);
  return lead;
}

export async function listReviews(leadId: string): Promise<BizReview[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("biz_reviews")
    .select("id, lead_id, author, rating, body, posted_label, sort, created_at")
    .eq("lead_id", leadId)
    .order("sort", { ascending: true });
  if (error || !data) return [];
  return data as unknown as BizReview[];
}

export async function listTouchpoints(
  leadId: string,
): Promise<BizTouchpoint[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("biz_touchpoints")
    .select("id, lead_id, method, note, occurred_at, created_at")
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as BizTouchpoint[];
}

export async function listPitchResponses(
  leadId: string,
): Promise<PitchResponse[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("biz_pitch_responses")
    .select(
      "id, lead_id, lead_slug, outcome, interest, budget_band, timeline, objections, best_contact, callback_at, other_info, caller, created_at",
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as PitchResponse[];
}

export async function getVisitStats(leadId: string): Promise<VisitStats> {
  const client = await readClient();
  if (!client) return { total: 0, lastVisitAt: null, recent: [] };
  const { count } = await client
    .from("biz_visits")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId);
  const { data } = await client
    .from("biz_visits")
    .select(
      "id, lead_id, lead_slug, kind, path, referrer, country, city, ua, created_at",
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(10);
  const recent = (data ?? []) as unknown as BizVisit[];
  return {
    total: count ?? recent.length,
    lastVisitAt: recent[0]?.created_at ?? null,
    recent,
  };
}

// Per-slug visit counts for the kanban badges. Low volume, rolled up in JS.
export async function listVisitCounts(): Promise<Record<string, number>> {
  const client = await readClient();
  if (!client) return {};
  const { data, error } = await client.from("biz_visits").select("lead_slug");
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const r of data as { lead_slug: string }[]) {
    counts[r.lead_slug] = (counts[r.lead_slug] ?? 0) + 1;
  }
  return counts;
}

export async function getBizSlugs(): Promise<Set<string>> {
  const client = await readClient();
  if (!client) return new Set();
  const { data, error } = await client.from("biz_leads").select("slug");
  if (error || !data) return new Set();
  return new Set(data.map((d) => (d as { slug: string }).slug));
}
