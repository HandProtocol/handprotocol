/*
  register-lead: sync a canonical biz/<slug>/lead.md into Supabase
  (command.biz_leads + biz_reviews). Markdown is the source of truth; this
  upserts the read replica. Idempotent. Mirrors upsertBizLeadRow + replaceReviews
  in src/lib/develop/actions.ts.

    npx tsx scripts/register-lead.mts <slug>
*/
import fs from "node:fs";
import { admin, loadEnv, parseReviewsBody, readWithRetry } from "./_lib.mts";
import { readBizFile } from "../src/lib/develop/markdown.ts";
import {
  bizLeadMarkdownPath,
  bizLeadMarkdownRelPath,
  demoSitePath,
} from "../src/lib/develop/paths.ts";
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

// Resolve the campaign slug (frontmatter) to its id, if any.
let campaignId: string | null = null;
if (fm.campaign) {
  // .maybeSingle(): an empty row is a real answer (no such campaign), so no
  // expectRow; only network/5xx failures retry.
  const { data: camp } = await readWithRetry(
    () => client.from("biz_campaigns").select("id").eq("slug", String(fm.campaign)).maybeSingle(),
    { label: `campaign ${fm.campaign}` },
  );
  campaignId = (camp?.id as string) ?? null;
}

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
    fm.google_rating != null && fm.google_rating !== "" ? Number(fm.google_rating) : null,
  reviews_count:
    fm.reviews_count != null && fm.reviews_count !== "" ? Math.round(Number(fm.reviews_count)) : null,
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

// Stamp the build time once, the first time the demo index.html exists.
const demoExists = fs.existsSync(demoSitePath(slug));
// A transient failure here would mis-route an existing lead into the insert
// branch (and trip the unique slug constraint), so retry network/5xx. An
// empty row is a real answer (first registration), so no expectRow.
const { data: existing, error: existingErr } = await readWithRetry(
  () => client.from("biz_leads").select("id, demo_generated_at, live_at").eq("slug", slug).maybeSingle(),
  { label: `lead ${slug}` },
);
if (existingErr) {
  console.error("lead lookup failed:", existingErr.message);
  process.exit(1);
}
let leadId: string;
if (existing) {
  const patch: Record<string, unknown> = { ...row };
  const stampBuilt = demoExists && !existing.demo_generated_at;
  if (stampBuilt) patch.demo_generated_at = new Date().toISOString();
  // Stamp live_at the first time a live_domain appears.
  if (liveDomain && !existing.live_at) patch.live_at = new Date().toISOString();
  await client.from("biz_leads").update(patch).eq("id", existing.id);
  leadId = existing.id as string;
  console.log("updated lead", slug, leadId, stampBuilt ? "(stamped built)" : "");
} else {
  const insertRow: Record<string, unknown> = { ...row };
  if (demoExists) insertRow.demo_generated_at = new Date().toISOString();
  if (liveDomain) insertRow.live_at = new Date().toISOString();
  const { data, error } = await client.from("biz_leads").insert(insertRow).select("id").single();
  if (error) {
    console.error("insert failed:", error.message);
    process.exit(1);
  }
  leadId = data!.id as string;
  console.log("inserted lead", slug, leadId, demoExists ? "(stamped built)" : "");
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
