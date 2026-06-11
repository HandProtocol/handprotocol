/*
  generate-site: build the demo site for a lead, headless.

    npx tsx scripts/generate-site.mts <slug> [--out=path] [--dry]

  Mirrors POST /api/develop/generate-site, but reads the lead via the service-
  role client (the API route reads through the RLS SSR client and 404s for an
  unauthenticated call). Turns the lead + its reviews into structured site copy
  (Anthropic when ANTHROPIC_API_KEY is set, else the grounded deterministic
  fallback), renders the self-contained page with the real renderDemoSite (which
  injects the /assets/demo-visit.js beacon), writes web/demos/<slug>/index.html,
  and stamps demo_url + demo_generated_at (which is what the agent's develop-leads
  poll turns into the "demo built" Telegram post).

  This is the QUICK template path — a zero-effort baseline good enough to ship and
  to drive the fully-automated drop-a-link flow. The premium path is still
  /impeccable by hand; overwrite index.html with that when the lead is worth it.

  --out writes elsewhere (preview) and skips the DB stamp; --dry just reports.
*/
import fs from "node:fs";
import path from "node:path";
import { admin, loadEnv } from "./_lib.mts";
import {
  buildSiteSystemPrompt,
  buildSiteUserMessage,
  parseSiteCopy,
  buildFallbackCopy,
} from "../src/lib/develop/prompts.ts";
import {
  renderDemoSite,
  pickSampleImages,
  deriveMentions,
  type SampleImages,
} from "../src/lib/develop/site-template.ts";
import { writeFileAtomic } from "../src/lib/develop/markdown.ts";
import { demoSitePath, demoPublicUrl, repoRoot } from "../src/lib/develop/paths.ts";
import type { BizLead, BizReview, SiteCopy } from "../src/lib/develop/types.ts";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const outArg = args.find((a) => a.startsWith("--out="));
const dry = args.includes("--dry");
if (!slug) {
  console.error("usage: npx tsx scripts/generate-site.mts <slug> [--out=path] [--dry]");
  process.exit(1);
}

const env = loadEnv();
const client = admin(env);
const { data: lead } = await client.from("biz_leads").select("*").eq("slug", slug).single();
if (!lead) {
  console.error("lead not found:", slug, "(run register-lead first)");
  process.exit(1);
}
const { data: reviewRows } = await client
  .from("biz_reviews")
  .select("*")
  .eq("lead_id", lead.id)
  .order("sort", { ascending: true });
const reviews = (reviewRows ?? []) as BizReview[];

// Fix em dashes in the GENERATED narrative only; testimonials stay verbatim
// (they are the customer's own words).
const fixDashes = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/--/g, ", ");
const clean = (c: SiteCopy): SiteCopy => ({
  headline: fixDashes(c.headline),
  subhead: fixDashes(c.subhead),
  about: fixDashes(c.about),
  cta: fixDashes(c.cta),
  services: c.services.map((s) => ({ title: fixDashes(s.title), blurb: fixDashes(s.blurb) })),
  testimonials: c.testimonials,
});

let copy: SiteCopy = buildFallbackCopy(lead as BizLead, reviews);
let source = "fallback";

if (env.ANTHROPIC_API_KEY && reviews.length > 0) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1400,
        temperature: 0.5,
        system: buildSiteSystemPrompt(),
        messages: [{ role: "user", content: buildSiteUserMessage(lead as BizLead, reviews) }],
      }),
    });
    if (res.ok) {
      const j = (await res.json()) as { content?: { text?: string }[] };
      const parsed = parseSiteCopy((j.content ?? []).map((b) => b.text ?? "").join(""));
      if (parsed) {
        copy = parsed;
        source = "assistant";
      }
    } else {
      console.error("anthropic", res.status, "- using fallback");
    }
  } catch (e) {
    console.error("model call failed, using fallback:", (e as Error).message);
  }
}

// Ambient sample imagery, image policy: the public page never shows the
// business's scraped Maps photos (those live only on the gated pitch page).
// It may use the curated free-license library at web/assets/biz-samples/,
// keyed by category. No manifest (or no category match) means no images and
// the type+color system carries the page.
let samples: SampleImages = {};
try {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot(), "web", "assets", "biz-samples", "manifest.json"),
      "utf8",
    ),
  ) as unknown;
  samples = pickSampleImages(manifest, lead.category, slug);
} catch {
  /* no sample library yet */
}

// Dish/service words actually present in the reviews (grounded chips).
const mentions = deriveMentions(reviews.map((r) => r.body));

copy = clean(copy);
const html = renderDemoSite(lead as BizLead, copy, { samples, mentions });
const out = outArg ? outArg.split("=").slice(1).join("=") : demoSitePath(slug);

if (dry) {
  console.log(`[dry] would write ${out} (${html.length} bytes), source=${source}, reviews=${reviews.length}`);
  process.exit(0);
}

await writeFileAtomic(out, html);
console.log(`wrote ${out} (source=${source}, reviews=${reviews.length})`);

// Stamp the lead so the demo shows as built (and the Telegram poll fires).
// Only when writing the canonical path, not a --out preview.
if (!outArg) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { demo_url: demoPublicUrl(slug), demo_generated_at: now };
  if (lead.status === "prospect") patch.status = "built";
  if (!lead.demo_generated_at) {
    await client.from("biz_leads").update(patch).eq("id", lead.id);
    console.log("stamped demo_generated_at + status=built");
  } else {
    // Already built once: refresh demo_url but keep the original build time.
    await client.from("biz_leads").update({ demo_url: demoPublicUrl(slug) }).eq("id", lead.id);
    console.log("refreshed demo_url (build time preserved)");
  }
}
