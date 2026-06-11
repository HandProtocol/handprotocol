/*
  generate-pitch: write the gated pitch page for a lead, headless.
  Reads the lead via the service-role client (the API route reads via the RLS
  SSR client and 404s for an unauthenticated call), generates the call script
  (Anthropic if ANTHROPIC_API_KEY is set, else a grounded deterministic
  fallback), and renders with the real renderPitchPage.

    npx tsx scripts/generate-pitch.mts <slug> [--price=75] [--lang=es] [--out=path] [--dry]

  Default price is a flat $75 one-time with optional add-ons. --lang=es writes
  the call script in Spanish (usted form, Mexican business register) for the
  Spanish-speaking owner-operators; the page chrome stays English for the
  caller. --out writes elsewhere (e.g. /tmp to preview without clobbering a
  hand-tuned page); --dry prints what it would do.
*/
import { admin, loadEnv } from "./_lib.mts";
import {
  buildScriptSystemPrompt,
  buildPriceFallbackScript,
  parsePitchScript,
  type PitchLang,
} from "../src/lib/develop/prompts.ts";
import { renderPitchPage } from "../src/lib/develop/pitch-template.ts";
import { writeFileAtomic } from "../src/lib/develop/markdown.ts";
import { demoPitchPath, demoPublicUrl } from "../src/lib/develop/paths.ts";
import type { BizLead, PitchScript } from "../src/lib/develop/types.ts";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const price = (args.find((a) => a.startsWith("--price=")) ?? "--price=75").split("=")[1];
const outArg = args.find((a) => a.startsWith("--out="));
const dry = args.includes("--dry");
const langArg = (args.find((a) => a.startsWith("--lang=")) ?? "--lang=en").split("=")[1];
if (langArg !== "en" && langArg !== "es") {
  console.error(`unsupported --lang=${langArg} (supported: en, es)`);
  process.exit(1);
}
const lang: PitchLang = langArg;
if (!slug) {
  console.error("usage: npx tsx scripts/generate-pitch.mts <slug> [--price=75] [--lang=es] [--out=path] [--dry]");
  process.exit(1);
}

const env = loadEnv();
const client = admin(env);
const { data: lead } = await client.from("biz_leads").select("*").eq("slug", slug).single();
if (!lead) {
  console.error("lead not found:", slug);
  process.exit(1);
}
const { data: reviews } = await client
  .from("biz_reviews")
  .select("*")
  .eq("lead_id", lead.id)
  .order("sort", { ascending: true });

const demoUrl = lead.demo_url ?? demoPublicUrl(slug);
const fullUrl = `handprotocol.org${demoUrl}`;

const fixDashes = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/--/g, ", ");
const clean = (s: PitchScript): PitchScript => ({
  opener: fixDashes(s.opener),
  hook: fixDashes(s.hook),
  walkthrough: s.walkthrough.map(fixDashes),
  offer: fixDashes(s.offer),
  objections: s.objections.map((o) => ({ q: fixDashes(o.q), a: fixDashes(o.a) })),
  close: fixDashes(s.close),
});

// The deterministic fallback lives in prompts.ts (both languages, side by
// side) so it can be smoke-tested directly without Supabase.
const fallback: PitchScript = buildPriceFallbackScript(lead as BizLead, fullUrl, price, lang);

let script = fallback;
let source = "fallback";

const userMessage = [
  `Business: ${lead.name}`,
  lead.category ? `Category: ${lead.category}` : "",
  [lead.city, lead.state].filter(Boolean).length
    ? `Location: ${[lead.city, lead.state].filter(Boolean).join(", ")}`
    : "",
  lead.google_rating != null
    ? `Google rating: ${lead.google_rating}${lead.reviews_count ? ` (${lead.reviews_count} reviews)` : ""}`
    : "",
  `Demo we built: ${fullUrl}`,
  `Offer to land: flat $${price} one-time to claim and publish, a third to the HAND pool, optional add-ons (more pages, full menu, own domain, automatic social posting, SEO, online ordering) only if they ask.`,
  lang === "es"
    ? "The owner speaks Spanish. Write the whole script in Spanish as instructed."
    : "",
  "",
  "Their reviews (lean on ones with real text, ignore rating-only ones):",
  (reviews ?? []).map((r: { body: string }) => `- ${r.body}`).join("\n") || "(none)",
  "",
  "Write the JSON script now.",
]
  .filter((l) => l !== "")
  .join("\n");

if (env.ANTHROPIC_API_KEY) {
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
        max_tokens: 1200,
        temperature: 0.55,
        system: buildScriptSystemPrompt(lang),
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (res.ok) {
      const j = (await res.json()) as { content?: { text?: string }[] };
      const parsed = parsePitchScript((j.content ?? []).map((b) => b.text ?? "").join(""));
      if (parsed) {
        script = parsed;
        source = "assistant";
      }
    } else {
      console.error("anthropic", res.status, "- using fallback");
    }
  } catch (e) {
    console.error("model call failed, using fallback:", (e as Error).message);
  }
}

script = clean(script);
const html = renderPitchPage(lead as BizLead, script, demoUrl);
const out = outArg ? outArg.split("=").slice(1).join("=") : demoPitchPath(slug);
if (dry) {
  console.log(`[dry] would write ${out} (${html.length} bytes), source=${source}`);
} else {
  await writeFileAtomic(out, html);
  console.log(`wrote ${out} (source=${source})`);
}
