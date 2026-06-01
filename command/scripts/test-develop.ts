/*
  Smoke test for the Develop (business-development) site generator.
  Exercises the real pipeline end to end without the database:
    pasted reviews -> parse -> assistant copy (live router) -> render HTML.
  Falls back to the deterministic builder if no provider answers, exactly as
  the API route does. Writes the rendered preview to /tmp for eyeballing.

  Run: cd command && npx tsx scripts/test-develop.ts
*/
import dotenv from "dotenv";
import fs from "node:fs";
dotenv.config({ path: ".env.local" });

import { getAIRouter } from "../src/lib/ai-router";
import {
  buildSiteSystemPrompt,
  buildSiteUserMessage,
  parseSiteCopy,
  buildFallbackCopy,
  buildScriptSystemPrompt,
  buildScriptUserMessage,
  parsePitchScript,
  buildFallbackScript,
} from "../src/lib/develop/prompts";
import { renderDemoSite } from "../src/lib/develop/site-template";
import { renderPitchPage } from "../src/lib/develop/pitch-template";
import { parseReviews } from "../src/lib/develop/markdown";
import type { BizLead, BizReview, SiteCopy } from "../src/lib/develop/types";

const lead: BizLead = {
  id: "test",
  slug: "joes-bbq-austin",
  name: "Joe's BBQ",
  category: "BBQ restaurant",
  city: "Austin",
  state: "TX",
  phone: "(512) 555-0142",
  address: "123 Manor Rd",
  google_url: null,
  google_rating: 4.7,
  reviews_count: 63,
  website_status: "none",
  status: "prospect",
  demo_url: null,
  demo_generated_at: null,
  demo_deployed_at: null,
  hand_lead: "koH",
  notes: null,
  kanban_position: 0,
  column_entered_at: "",
  markdown_path: "biz/joes-bbq-austin/lead.md",
  content_checksum: null,
  last_synced_at: null,
  created_at: "",
  updated_at: "",
};

const rawReviews = `Maria G (5): Best brisket in south Austin, the line moves fast and the staff are kind.
David R (5): Family run, they remember your order. Worth the drive across town.
Tasha (4): Ribs fall off the bone. Cash only but there is an ATM inside.
Luis (5): Got catering for 40 people, everything was on time and the sausage was a hit.`;

async function main() {
  const parsed = parseReviews(rawReviews);
  console.log(`Parsed ${parsed.length} reviews:`);
  for (const r of parsed) {
    console.log(`  - [${r.author ?? "?"} ${r.rating ?? "-"}/5] ${r.body.slice(0, 50)}...`);
  }

  const reviews: BizReview[] = parsed.map((r, i) => ({
    id: String(i),
    lead_id: "test",
    author: r.author,
    rating: r.rating,
    body: r.body,
    posted_label: null,
    sort: i,
    created_at: "",
  }));

  const router = getAIRouter();
  let copy: SiteCopy;
  let source = "fallback";

  if (router.hasAnyProvider()) {
    console.log("\nProvider configured, calling the assistant...");
    try {
      const result = await router.chat({
        messages: [
          { role: "system", content: buildSiteSystemPrompt() },
          { role: "user", content: buildSiteUserMessage(lead, reviews) },
        ],
        temperature: 0.5,
        maxTokens: 1400,
      });
      console.log(
        `  provider=${result.provider} model=${result.model} tokens=${result.usage.totalTokens}`,
      );
      const parsedCopy = parseSiteCopy(result.text);
      if (parsedCopy) {
        copy = parsedCopy;
        source = "assistant";
      } else {
        console.log("  parse failed, using fallback. Raw head:");
        console.log(result.text.slice(0, 300));
        copy = buildFallbackCopy(lead, reviews);
      }
    } catch (err) {
      console.log(`  router error: ${err instanceof Error ? err.message : err}`);
      copy = buildFallbackCopy(lead, reviews);
    }
  } else {
    console.log("\nNo provider configured, using deterministic fallback.");
    copy = buildFallbackCopy(lead, reviews);
  }

  console.log(`\nSOURCE: ${source}`);
  console.log(`headline: ${copy.headline}`);
  console.log(`subhead:  ${copy.subhead}`);
  console.log(`about:    ${copy.about.slice(0, 120)}...`);
  console.log(`services: ${copy.services.map((s) => s.title).join(", ") || "(none)"}`);
  console.log(`testimonials: ${copy.testimonials.length}`);

  const html = renderDemoSite(lead, copy);
  const out = "/tmp/develop-test-site.html";
  fs.writeFileSync(out, html);
  console.log(`\nRendered demo ${html.length} bytes -> ${out}`);

  // ─── Pitch script + page ────────────────────────────────────────────────
  const demoUrl = "/demos/joes-bbq-austin/";
  let script;
  let scriptSource = "fallback";
  if (router.hasAnyProvider()) {
    console.log("\nGenerating pitch script...");
    try {
      const r = await router.chat({
        messages: [
          { role: "system", content: buildScriptSystemPrompt() },
          { role: "user", content: buildScriptUserMessage(lead, reviews, demoUrl) },
        ],
        temperature: 0.55,
        maxTokens: 1200,
      });
      const parsed = parsePitchScript(r.text);
      if (parsed) {
        script = parsed;
        scriptSource = "assistant";
      } else {
        console.log("  script parse failed, fallback. head:", r.text.slice(0, 200));
        script = buildFallbackScript(lead, demoUrl);
      }
    } catch (err) {
      console.log(`  script error: ${err instanceof Error ? err.message : err}`);
      script = buildFallbackScript(lead, demoUrl);
    }
  } else {
    script = buildFallbackScript(lead, demoUrl);
  }

  console.log(`SCRIPT SOURCE: ${scriptSource}`);
  console.log(`opener: ${script.opener}`);
  console.log(`hook:   ${script.hook}`);
  console.log(`objections: ${script.objections.length}`);

  const pitchHtml = renderPitchPage(lead, script, demoUrl);
  const pitchOut = "/tmp/develop-test-pitch.html";
  fs.writeFileSync(pitchOut, pitchHtml);
  console.log(`Rendered pitch ${pitchHtml.length} bytes -> ${pitchOut}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
