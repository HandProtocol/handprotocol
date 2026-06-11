/*
  POST /api/develop/generate-pitch

  Body: { slug }

  Generates the password-gated pitch page for a lead and writes it to
  web/demos/<slug>/pitch/index.html. The page carries the call script (assistant
  when a provider is configured, deterministic fallback otherwise), the business
  facts, a live preview of the demo, and the follow-up form that POSTs to the
  biz-pitch-response Netlify function.

  The demo site should be generated first (so the preview has something to show),
  but this route does not require it.
*/
import { NextResponse, type NextRequest } from "next/server";
import { getAIRouter } from "@/lib/ai-router";
import { autoFixEmDashes } from "@/lib/ai-router/voice";
import { logAssistantRun } from "@/lib/assistant/log";
import { getBizLeadBySlug } from "@/lib/develop/queries";
import {
  buildScriptSystemPrompt,
  buildScriptUserMessage,
  parsePitchScript,
  buildFallbackScript,
} from "@/lib/develop/prompts";
import { renderPitchPage } from "@/lib/develop/pitch-template";
import { loadPitchPhotos } from "@/lib/develop/site-assets";
import { writeFileAtomic } from "@/lib/develop/markdown";
import { demoPitchPath, pitchPublicUrl, demoPublicUrl } from "@/lib/develop/paths";
import type { PitchScript } from "@/lib/develop/types";

export const runtime = "nodejs";

function cleanScript(s: PitchScript): PitchScript {
  return {
    opener: autoFixEmDashes(s.opener),
    hook: autoFixEmDashes(s.hook),
    walkthrough: s.walkthrough.map(autoFixEmDashes),
    offer: autoFixEmDashes(s.offer),
    objections: s.objections.map((o) => ({
      q: autoFixEmDashes(o.q),
      a: autoFixEmDashes(o.a),
    })),
    close: autoFixEmDashes(s.close),
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
    return NextResponse.json({ error: `Lead not found: ${slug}` }, { status: 404 });
  }

  const reviews = lead.reviews ?? [];
  const demoUrl = lead.demo_url ?? demoPublicUrl(slug);
  const router = getAIRouter();

  let script: PitchScript;
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

  if (router.hasAnyProvider()) {
    const systemPrompt = buildScriptSystemPrompt();
    const userMessage = buildScriptUserMessage(lead, reviews, demoUrl);
    try {
      const result = await router.chat({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.55,
        maxTokens: 1200,
      });
      const parsed = parsePitchScript(result.text);
      script = parsed ? cleanScript(parsed) : buildFallbackScript(lead, demoUrl);
      if (parsed) source = "assistant";
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
      script = buildFallbackScript(lead, demoUrl);
    }
  } else {
    script = buildFallbackScript(lead, demoUrl);
  }

  // Scraped Maps photos for the gated page, via the shared loader so this
  // matches scripts/generate-pitch.mts for the same lead.
  const html = renderPitchPage(lead, script, demoUrl, loadPitchPhotos(slug));
  try {
    await writeFileAtomic(demoPitchPath(slug), html);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not write the pitch page: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 },
    );
  }

  let runId: string | null = null;
  if (runMeta) {
    const logged = await logAssistantRun({
      surface: "biz-pitch",
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
    pitch_url: pitchPublicUrl(slug),
    script,
    html,
    run_id: runId,
  });
}
