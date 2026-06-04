/*
  register-lead: sync a canonical biz/<slug>/lead.md into Supabase
  (command.biz_leads + biz_reviews). Markdown is the source of truth; this
  upserts the read replica. Idempotent. Mirrors upsertBizLeadRow + replaceReviews
  in src/lib/develop/actions.ts.

    npx tsx scripts/register-lead.mts <slug>
*/
import fs from "node:fs";
import { admin, loadEnv, parseReviewsBody } from "./_lib.mts";
import { readBizFile } from "../src/lib/develop/markdown.ts";
import { bizLeadMarkdownPath, bizLeadMarkdownRelPath } from "../src/lib/develop/paths.ts";
import { BIZ_STATUSES, WEBSITE_STATUSES } from "../src/lib/develop/types.ts";

const slug = process.argv[2];
if (!slug) {
  console.error("usage: npx tsx scripts/register-lead.mts <slug>");
  process.exit(1);
}

const file = bizLeadMarkdownPath(slug);
if (!fs.existsSync(file)) {
  console.error("no lead.md at", file);
  process.exit(1);
}

const { frontmatter: fm, body, checksum: cs } = readBizFile(file);
const client = admin(loadEnv());

const websiteStatus = (WEBSITE_STATUSES as readonly string[]).includes(String(fm.website_status))
  ? fm.website_status
  : "none";
const status = (BIZ_STATUSES as readonly string[]).includes(String(fm.status))
  ? fm.status
  : "prospect";

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
    fm.google_rating != null && fm.google_rating !== "" ? Number(fm.google_rating) : null,
  reviews_count:
    fm.reviews_count != null && fm.reviews_count !== "" ? Math.round(Number(fm.reviews_count)) : null,
  website_status: websiteStatus,
  status,
  demo_url: fm.demo_url ? String(fm.demo_url) : null,
  hand_lead: fm.hand_lead ? String(fm.hand_lead) : null,
  markdown_path: bizLeadMarkdownRelPath(slug),
  content_checksum: cs,
  last_synced_at: new Date().toISOString(),
};

const { data: existing } = await client.from("biz_leads").select("id").eq("slug", slug).maybeSingle();
let leadId: string;
if (existing) {
  await client.from("biz_leads").update(row).eq("id", existing.id);
  leadId = existing.id as string;
  console.log("updated lead", slug, leadId);
} else {
  const { data, error } = await client.from("biz_leads").insert(row).select("id").single();
  if (error) {
    console.error("insert failed:", error.message);
    process.exit(1);
  }
  leadId = data!.id as string;
  console.log("inserted lead", slug, leadId);
}

const reviews = parseReviewsBody(body);
await client.from("biz_reviews").delete().eq("lead_id", leadId);
if (reviews.length) {
  const { error } = await client
    .from("biz_reviews")
    .insert(reviews.map((r, i) => ({ lead_id: leadId, ...r, sort: i })));
  if (error) {
    console.error("reviews failed:", error.message);
    process.exit(1);
  }
}
console.log("synced", reviews.length, "reviews");
