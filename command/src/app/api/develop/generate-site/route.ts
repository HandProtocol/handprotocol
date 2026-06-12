/*
  POST /api/develop/generate-site

  Body: { slug }

  Loads a business lead and its pasted Google reviews, turns the reviews into
  structured site copy (assistant when a provider is configured, deterministic
  fallback otherwise), renders a self-contained static HTML page, and writes it
  to web/demos/<slug>/index.html so the main Netlify deploy serves it at
  /demos/<slug>/. Updates the lead's demo_url + demo_generated_at, and bumps a
  fresh prospect to "built". Logs the run for cost accounting.

  The fallback path means the operator always gets a usable site even with zero
  API budget, which is the whole point of the reviews-as-content approach.
*/
import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAIRouter } from "@/lib/ai-router";
import { autoFixEmDashes } from "@/lib/ai-router/voice";
import { logAssistantRun } from "@/lib/assistant/log";
import { getBizLeadBySlug } from "@/lib/develop/queries";
import {
  buildSiteSystemPrompt,
  buildSiteUserMessage,
  parseSiteCopy,
  buildFallbackCopy,
} from "@/lib/develop/prompts";
import { renderDemoSite } from "@/lib/develop/site-template";
import { demoRenderOptions } from "@/lib/develop/site-assets";
import { writeFileAtomic } from "@/lib/develop/markdown";
import { demoSitePath, demoPublicUrl } from "@/lib/develop/paths";
import type { SiteCopy } from "@/lib/develop/types";

export const runtime = "nodejs";

function configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

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

// Run every text field through the em-dash auto-fixer so the generated copy
// obeys the no-em-dash rule even if the model slips one in.
function cleanCopy(copy: SiteCopy): SiteCopy {
  return {
    headline: autoFixEmDashes(copy.headline),
    subhead: autoFixEmDashes(copy.subhead),
    about: autoFixEmDashes(copy.about),
    cta: autoFixEmDashes(copy.cta),
    services: copy.services.map((s) => ({
      title: autoFixEmDashes(s.title),
      blurb: autoFixEmDashes(s.blurb),
    })),
    testimonials: copy.testimonials.map((t) => ({
      body: autoFixEmDashes(t.body),
      author: t.author,
    })),
  };
}

export async function POST(request: NextRequest) {
  let body: { slug?: string };
  try {
    body = (await request.json()) as { slug?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = String(body.slug || "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const lead = await getBizLeadBySlug(slug);
  if (!lead) {
    return NextResponse.json({ error: `Lead not found: ${slug}` }, {
      status: 404,
    });
  }

  const reviews = lead.reviews ?? [];
  const router = getAIRouter();

  let copy: SiteCopy;
  let source: "assistant" | "fallback" = "fallback";
  let runMeta: {
    provider: string;
    modelKey: string;
    tokensIn: number;
    tokensOut: number;
    durationMs: number;
    costUsd: number;
    input: string;
    output: string;
  } | null = null;

  if (router.hasAnyProvider() && reviews.length > 0) {
    const systemPrompt = buildSiteSystemPrompt();
    const userMessage = buildSiteUserMessage(lead, reviews);
    try {
      const result = await router.chat({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.5,
        maxTokens: 1400,
      });
      const parsed = parseSiteCopy(result.text);
      if (parsed) {
        copy = cleanCopy(parsed);
        source = "assistant";
      } else {
        copy = buildFallbackCopy(lead, reviews);
      }
      runMeta = {
        provider: result.provider,
        modelKey: result.model,
        tokensIn: result.usage.promptTokens,
        tokensOut: result.usage.completionTokens,
        durationMs: result.latencyMs,
        costUsd: router.estimateCost(
          result.model,
          result.usage.promptTokens,
          result.usage.completionTokens,
        ),
        input: `${systemPrompt}\n${userMessage}`,
        output: result.text,
      };
    } catch {
      // Model failed: fall back so the operator still gets a site.
      copy = buildFallbackCopy(lead, reviews);
    }
  } else {
    copy = buildFallbackCopy(lead, reviews);
  }

  // Render and write the static site. Sample imagery + review-mention chips
  // come from the shared helper so this matches scripts/generate-site.mts
  // byte for byte for the same lead.
  const html = renderDemoSite(lead, copy, demoRenderOptions(lead, reviews));
  try {
    await writeFileAtomic(demoSitePath(slug), html);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not write the demo site: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 },
    );
  }

  const url = demoPublicUrl(slug);
  const now = new Date().toISOString();

  // Update the lead: demo_url + timestamp, and bump a fresh prospect to built.
  if (configured()) {
    const client = adminClient();
    const patch: Record<string, unknown> = {
      demo_url: url,
      demo_generated_at: now,
    };
    if (lead.status === "prospect") patch.status = "built";
    await client.from("biz_leads").update(patch).eq("id", lead.id);
  }

  // Cost accounting (only when the assistant actually ran).
  let runId: string | null = null;
  if (runMeta) {
    const logged = await logAssistantRun({
      surface: "biz-site",
      grantId: null,
      provider: runMeta.provider,
      modelKey: runMeta.modelKey,
      tokensIn: runMeta.tokensIn,
      tokensOut: runMeta.tokensOut,
      costUsd: runMeta.costUsd,
      durationMs: runMeta.durationMs,
      inputText: runMeta.input,
      outputText: runMeta.output,
    });
    runId = logged.runId;
  }

  return NextResponse.json({
    ok: true,
    source,
    demo_url: url,
    copy,
    html,
    run_id: runId,
  });
}
