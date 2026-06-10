"use server";

/*
  HAND Command Center, business-development server actions.
  Write flow mirrors grants: markdown file first (atomic), then Supabase upsert.
  If the Supabase write fails after a good markdown write, last_synced_at is set
  null so a future reconciler can pick it up. Markdown stays canonical.
*/
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  bizLeadMarkdownPath,
  bizLeadMarkdownRelPath,
} from "./paths";
import {
  composeBizSlug,
  kebabCase,
  parseReviews,
  reviewsToBody,
  serializeBizLead,
  readBizFile,
  writeFileAtomic,
} from "./markdown";
import { getBizSlugs } from "./queries";
import {
  BIZ_STATUSES,
  WEBSITE_STATUSES,
  TOUCHPOINT_METHODS,
  type BizFrontmatter,
  type BizStatus,
  type TouchpointMethod,
  type WebsiteStatus,
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

function num(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(raw: FormDataEntryValue | null): string {
  return String(raw ?? "").trim();
}

// Resolve a campaign slug (as it appears in frontmatter) to its row id.
async function resolveCampaignId(
  client: ReturnType<typeof adminClient>,
  campaignSlug: string | undefined,
): Promise<string | null> {
  const s = (campaignSlug ?? "").trim();
  if (!s) return null;
  const { data } = await client
    .from("biz_campaigns")
    .select("id")
    .eq("slug", s)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

// Upsert the read-replica row from frontmatter. Returns the row id, or null
// when Supabase is not configured.
async function upsertBizLeadRow(
  slug: string,
  fm: BizFrontmatter,
  cs: string,
): Promise<string | null> {
  if (!configured()) return null;
  const client = adminClient();

  const websiteStatus = (
    (WEBSITE_STATUSES as readonly string[]).includes(String(fm.website_status))
      ? fm.website_status
      : "none"
  ) as WebsiteStatus;

  const status = (
    (BIZ_STATUSES as readonly string[]).includes(String(fm.status))
      ? fm.status
      : "prospect"
  ) as BizStatus;

  const campaignId = await resolveCampaignId(client, fm.campaign);
  const liveDomain = fm.live_domain ? String(fm.live_domain) : null;

  const row: Record<string, unknown> = {
    slug,
    name: String(fm.name ?? slug),
    category: fm.category ? String(fm.category) : null,
    city: fm.city ? String(fm.city) : null,
    state: fm.state ? String(fm.state) : "TX",
    phone: fm.phone ? String(fm.phone) : null,
    address: fm.address ? String(fm.address) : null,
    google_url: fm.google_url ? String(fm.google_url) : null,
    google_rating:
      fm.google_rating != null && fm.google_rating !== ""
        ? Number(fm.google_rating)
        : null,
    reviews_count:
      fm.reviews_count != null && fm.reviews_count !== ""
        ? Math.round(Number(fm.reviews_count))
        : null,
    website_status: websiteStatus,
    status,
    campaign_id: campaignId,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    lat: fm.lat != null && fm.lat !== "" ? Number(fm.lat) : null,
    lng: fm.lng != null && fm.lng !== "" ? Number(fm.lng) : null,
    demo_url: fm.demo_url ? String(fm.demo_url) : null,
    production_url: fm.production_url ? String(fm.production_url) : null,
    live_domain: liveDomain,
    netlify_site_id: fm.netlify_site_id ? String(fm.netlify_site_id) : null,
    dns_zone_id: fm.dns_zone_id ? String(fm.dns_zone_id) : null,
    ssl_state: fm.ssl_state ? String(fm.ssl_state) : null,
    hand_lead: fm.hand_lead ? String(fm.hand_lead) : null,
    markdown_path: bizLeadMarkdownRelPath(slug),
    content_checksum: cs,
    last_synced_at: new Date().toISOString(),
  };

  const { data: existing } = await client
    .from("biz_leads")
    .select("id, live_at")
    .eq("slug", slug)
    .maybeSingle();

  // Stamp live_at the first time a live_domain appears.
  if (liveDomain && !existing?.live_at) {
    row.live_at = new Date().toISOString();
  }

  if (existing) {
    await client.from("biz_leads").update(row).eq("id", existing.id);
    return existing.id as string;
  }
  const { data: inserted } = await client
    .from("biz_leads")
    .insert(row)
    .select("id")
    .single();
  return (inserted?.id as string) ?? null;
}

async function markStaleSync(slug: string) {
  if (!configured()) return;
  await adminClient()
    .from("biz_leads")
    .update({ last_synced_at: null })
    .eq("slug", slug);
}

// Replace the review set for a lead with the freshly parsed ones.
async function replaceReviews(
  leadId: string,
  parsed: ReturnType<typeof parseReviews>,
) {
  if (!configured()) return;
  const client = adminClient();
  await client.from("biz_reviews").delete().eq("lead_id", leadId);
  if (parsed.length === 0) return;
  const rows = parsed.map((r, i) => ({
    lead_id: leadId,
    author: r.author,
    rating: r.rating,
    body: r.body,
    sort: i,
  }));
  await client.from("biz_reviews").insert(rows);
}

// ─── New lead ─────────────────────────────────────────────────────────────
export async function createBizLead(formData: FormData) {
  const name = str(formData.get("name"));
  if (!name) throw new Error("Business name is required");

  const city = str(formData.get("city"));
  const existing = await getBizSlugs();
  const slug = composeBizSlug(name, city || undefined, existing);

  const websiteStatusRaw = str(formData.get("website_status")) || "none";
  const fm: BizFrontmatter = {
    slug,
    name,
    category: str(formData.get("category")) || undefined,
    city: city || undefined,
    state: str(formData.get("state")) || "TX",
    phone: str(formData.get("phone")) || undefined,
    address: str(formData.get("address")) || undefined,
    google_url: str(formData.get("google_url")) || undefined,
    google_rating: num(formData.get("google_rating")) ?? undefined,
    reviews_count: num(formData.get("reviews_count")) ?? undefined,
    website_status: (WEBSITE_STATUSES as readonly string[]).includes(
      websiteStatusRaw,
    )
      ? (websiteStatusRaw as WebsiteStatus)
      : "none",
    status: "prospect",
    hand_lead: str(formData.get("hand_lead")) || "koH",
  };

  const parsed = parseReviews(str(formData.get("reviews")));
  const body = reviewsToBody(parsed);
  const content = serializeBizLead(fm, body);
  const { checksum } = await writeFileAtomic(bizLeadMarkdownPath(slug), content);

  try {
    const leadId = await upsertBizLeadRow(slug, fm, checksum);
    if (leadId) await replaceReviews(leadId, parsed);
  } catch {
    await markStaleSync(slug);
  }

  revalidatePath("/develop");
  redirect(`/develop/${slug}`);
}

// ─── Status change (kanban drag + detail) ──────────────────────────────────
export async function updateBizLeadStatus(slug: string, status: BizStatus) {
  if (!(BIZ_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  const filePath = bizLeadMarkdownPath(slug);
  const { frontmatter, body } = readBizFile(filePath);
  if (frontmatter.status === status) {
    revalidatePath("/develop");
    revalidatePath(`/develop/${slug}`);
    return;
  }
  const next: BizFrontmatter = { ...frontmatter, status };
  const content = serializeBizLead(next, body);
  let cs = "";
  try {
    cs = (await writeFileAtomic(filePath, content)).checksum;
  } catch (err) {
    throw new Error(
      `Markdown write failed for ${slug}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  try {
    await upsertBizLeadRow(slug, next, cs);
  } catch {
    await markStaleSync(slug);
  }
  revalidatePath("/develop");
  revalidatePath(`/develop/${slug}`);
}

// ─── Touchpoint log ─────────────────────────────────────────────────────────
export async function logBizTouchpoint(
  slug: string,
  method: TouchpointMethod,
  note: string,
) {
  if (!configured()) return;
  const safeMethod = (TOUCHPOINT_METHODS as readonly string[]).includes(method)
    ? method
    : "other";
  const client = adminClient();
  const { data: lead } = await client
    .from("biz_leads")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!lead) throw new Error(`Lead not found: ${slug}`);

  await client.from("biz_touchpoints").insert({
    lead_id: lead.id,
    method: safeMethod,
    note: note.trim() || null,
  });

  // First real outreach bumps a prospect/built lead to contacted.
  const isOutreach = safeMethod !== "other";
  if (isOutreach && (lead.status === "prospect" || lead.status === "built")) {
    await updateBizLeadStatus(slug, "contacted");
  }

  revalidatePath(`/develop/${slug}`);
  revalidatePath("/develop");
}

// ─── Campaigns ──────────────────────────────────────────────────────────────
// Campaigns are command-only (no markdown canonical). Create + assign.
export async function createBizCampaign(formData: FormData) {
  if (!configured()) throw new Error("Supabase not configured");
  const name = str(formData.get("name"));
  if (!name) throw new Error("Campaign name is required");
  const client = adminClient();

  // Disambiguate the slug against existing campaigns.
  const base = kebabCase(name) || "campaign";
  let slug = base;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await client
      .from("biz_campaigns")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    slug = `${base}-${n}`;
    n += 1;
  }

  const goalRaw = num(formData.get("goal"));
  await client.from("biz_campaigns").insert({
    slug,
    name,
    region: str(formData.get("region")) || null,
    color: str(formData.get("color")) || null,
    goal: goalRaw != null ? Math.round(goalRaw) : null,
    notes: str(formData.get("notes")) || null,
  });

  revalidatePath("/develop/campaigns");
  revalidatePath("/develop");
  redirect(`/develop/campaigns`);
}

// Assign (or clear) a lead's campaign. Markdown-first: write the campaign slug
// to lead.md frontmatter, then upsert (which resolves the slug to an id).
export async function assignBizLeadCampaign(
  slug: string,
  campaignSlug: string | null,
) {
  const filePath = bizLeadMarkdownPath(slug);
  const { frontmatter, body } = readBizFile(filePath);
  const next: BizFrontmatter = { ...frontmatter };
  if (campaignSlug) next.campaign = campaignSlug;
  else delete next.campaign;
  const content = serializeBizLead(next, body);
  const { checksum } = await writeFileAtomic(filePath, content);
  try {
    await upsertBizLeadRow(slug, next, checksum);
  } catch {
    await markStaleSync(slug);
  }
  revalidatePath("/develop");
  revalidatePath(`/develop/${slug}`);
  revalidatePath("/develop/campaigns");
}

// ─── Production lifecycle ─────────────────────────────────────────────────────
// Record (or update) the owned-site facts once a lead graduates (Phase 6).
// Markdown-first, then upsert. live_at is stamped on first live_domain by the
// upsert. Pass empty strings to leave a field unchanged is NOT supported here;
// pass the full set you want persisted.
export async function setBizProductionInfo(
  slug: string,
  info: {
    production_url?: string;
    live_domain?: string;
    netlify_site_id?: string;
    dns_zone_id?: string;
    ssl_state?: string;
  },
) {
  const filePath = bizLeadMarkdownPath(slug);
  const { frontmatter, body } = readBizFile(filePath);
  const next: BizFrontmatter = { ...frontmatter };
  for (const [k, v] of Object.entries(info)) {
    const key = k as keyof BizFrontmatter;
    if (v && String(v).trim()) {
      (next as Record<string, unknown>)[key] = String(v).trim();
    }
  }
  const content = serializeBizLead(next, body);
  const { checksum } = await writeFileAtomic(filePath, content);
  try {
    await upsertBizLeadRow(slug, next, checksum);
  } catch {
    await markStaleSync(slug);
  }
  revalidatePath("/develop");
  revalidatePath(`/develop/${slug}`);
  revalidatePath("/develop/sites");
}
