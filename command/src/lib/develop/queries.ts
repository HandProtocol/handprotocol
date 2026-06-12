/*
  HAND Command Center, data fetchers for business-development leads.
  Server-side. Uses the SSR client (auth + RLS) when a session exists, falls
  back to the admin client for the local-dev preview, same trick as grants.
*/
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type {
  BizCampaign,
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
  "id, slug, name, category, city, state, phone, address, google_url, google_rating, reviews_count, website_status, status, demo_url, demo_generated_at, demo_deployed_at, hand_lead, notes, kanban_position, column_entered_at, markdown_path, content_checksum, last_synced_at, created_at, updated_at, campaign_id, tags, lat, lng, production_url, live_domain, netlify_site_id, dns_zone_id, ssl_state, live_at";

// Attach the joined campaign summary onto leads from a campaign map. Joining in
// JS (rather than a PostgREST embed) keeps us off the auto-generated FK-name
// dependency; volume is low enough that one extra campaigns read is free.
function attachCampaigns(leads: BizLead[], campaigns: BizCampaign[]): BizLead[] {
  if (campaigns.length === 0) return leads;
  const byId = new Map(campaigns.map((c) => [c.id, c]));
  for (const l of leads) {
    const c = l.campaign_id ? byId.get(l.campaign_id) : null;
    l.campaign = c ? { slug: c.slug, name: c.name, color: c.color } : null;
  }
  return leads;
}

export async function listBizLeads(): Promise<BizLead[]> {
  const client = await readClient();
  if (!client) return [];
  const [{ data, error }, campaigns] = await Promise.all([
    client
      .from("biz_leads")
      .select(LEAD_SELECT)
      .order("kanban_position", { ascending: true })
      .order("created_at", { ascending: false }),
    listCampaigns(),
  ]);
  if (error || !data) return [];
  return attachCampaigns(data as unknown as BizLead[], campaigns);
}

// ─── Campaigns ──────────────────────────────────────────────────────────────
const CAMPAIGN_SELECT =
  "id, slug, name, region, color, goal, notes, archived, created_at, updated_at";

export async function listCampaigns(): Promise<BizCampaign[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("biz_campaigns")
    .select(CAMPAIGN_SELECT)
    .order("archived", { ascending: true })
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as BizCampaign[];
}

// Campaigns with lead/closed/live rollups, for the campaigns index.
export async function listCampaignsWithRollups(): Promise<BizCampaign[]> {
  const [campaigns, leads] = await Promise.all([listCampaigns(), rawLeads()]);
  for (const c of campaigns) {
    const mine = leads.filter((l) => l.campaign_id === c.id);
    c.lead_count = mine.length;
    c.closed_count = mine.filter((l) => l.status === "closed").length;
    c.live_count = mine.filter((l) => Boolean(l.live_domain)).length;
  }
  return campaigns;
}

export async function getCampaignBySlug(
  slug: string,
): Promise<BizCampaign | null> {
  const client = await readClient();
  if (!client) return null;
  const { data, error } = await client
    .from("biz_campaigns")
    .select(CAMPAIGN_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as BizCampaign;
}

// Raw leads (no campaign attach) — internal helper for rollups.
async function rawLeads(): Promise<BizLead[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client.from("biz_leads").select(LEAD_SELECT);
  if (error || !data) return [];
  return data as unknown as BizLead[];
}

// ─── Live owned sites (the /develop/sites registry) ─────────────────────────
// A lead with a live_domain has graduated to its own production site.
export async function listLiveSites(): Promise<BizLead[]> {
  const client = await readClient();
  if (!client) return [];
  const [{ data, error }, campaigns] = await Promise.all([
    client
      .from("biz_leads")
      .select(LEAD_SELECT)
      .not("live_domain", "is", null)
      .order("live_at", { ascending: false }),
    listCampaigns(),
  ]);
  if (error || !data) return [];
  return attachCampaigns(data as unknown as BizLead[], campaigns);
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
