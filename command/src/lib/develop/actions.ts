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

  const row = {
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
    demo_url: fm.demo_url ? String(fm.demo_url) : null,
    hand_lead: fm.hand_lead ? String(fm.hand_lead) : null,
    markdown_path: bizLeadMarkdownRelPath(slug),
    content_checksum: cs,
    last_synced_at: new Date().toISOString(),
  };

  const { data: existing } = await client
    .from("biz_leads")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

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
