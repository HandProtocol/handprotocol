/*
  POST /api/draft-answer

  Body: { slug, section, question }

  Pulls the grant by slug, builds the grounding context (HAND canonical
  context, framing docs, top-3 boilerplate snippets matching the
  question), composes a voice-rules-enforcing system prompt, calls the
  AI router, logs the run to command.assistant_runs, and returns the
  draft for the assist drawer.

  If no provider is configured (no XAI_API_KEY or ANTHROPIC_API_KEY),
  the route returns a stub instead of failing. The grounding work still
  runs so the operator can see which snippets would have been used.
*/
import { NextResponse, type NextRequest } from "next/server";
import { getAIRouter } from "@/lib/ai-router";
import { autoFixEmDashes } from "@/lib/ai-router/voice";
import { getGrantBySlug } from "@/lib/grants/queries";
import { buildGrounding } from "@/lib/assistant/grounding";
import { buildDraftSystemPrompt } from "@/lib/assistant/prompts";
import { logAssistantRun } from "@/lib/assistant/log";

export const runtime = "nodejs";

type DraftRequestBody = {
  slug?: string;
  section?: string;
  question?: string;
};

export async function POST(request: NextRequest) {
  let body: DraftRequestBody;
  try {
    body = (await request.json()) as DraftRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const slug = String(body.slug || "").trim();
  const section = String(body.section || "").trim();
  const question = String(body.question || "").trim();

  if (!slug || !section) {
    return NextResponse.json(
      { error: "slug and section are required" },
      { status: 400 },
    );
  }

  const effectiveQuestion =
    question ||
    `Write a strong first-pass draft of the "${section}" section for this grant. Use the HAND context and the boilerplate snippets to ground the content.`;

  const grant = await getGrantBySlug(slug);

  const grounding = await buildGrounding({
    question: `${section} ${effectiveQuestion}`,
    grantContext: grant
      ? {
          name: grant.name,
          funder: grant.funder_name ?? null,
          program_url: grant.program_url,
          reciprocate_group: grant.reciprocate_group,
        }
      : undefined,
    snippetLimit: 3,
  });

  const router = getAIRouter();

  // No provider configured: return a stub. The grounding snippet list
  // still travels back so the operator sees what would have grounded
  // the call.
  if (!router.hasAnyProvider()) {
    const stubDraft = [
      "Drafting assistant offline. Set `XAI_API_KEY` (or `ANTHROPIC_API_KEY`) in `.env.local` to enable.",
      "",
      "Grounded snippets that would have been used:",
      ...grounding.snippets.map((s) => `- ${s.title} (${s.category})`),
    ].join("\n");

    return NextResponse.json({
      stub: true,
      draft: stubDraft,
      snippets_used: grounding.snippets.map((s) => ({
        slug: s.slug,
        title: s.title,
        category: s.category,
      })),
      run_id: null,
    });
  }

  const systemPrompt = buildDraftSystemPrompt({
    section,
    question: effectiveQuestion,
    contextBlock: grounding.contextBlock,
  });

  const userMessage = [
    `Section: ${section}`,
    `Operator question: ${effectiveQuestion}`,
    "",
    "Write the draft now. Follow every voice rule above.",
  ].join("\n");

  let draftText = "";
  let provider = "unknown";
  let modelKey = "unknown";
  let tokensIn = 0;
  let tokensOut = 0;
  let durationMs = 0;
  try {
    const result = await router.chat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.6,
      maxTokens: 1600,
    });
    draftText = autoFixEmDashes(result.text);
    provider = result.provider;
    modelKey = result.model;
    tokensIn = result.usage.promptTokens;
    tokensOut = result.usage.completionTokens;
    durationMs = result.latencyMs;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Drafting call failed",
      },
      { status: 502 },
    );
  }

  const costUsd = router.estimateCost(modelKey, tokensIn, tokensOut);

  const { runId } = await logAssistantRun({
    surface: "draft",
    grantId: grant?.id ?? null,
    provider,
    modelKey,
    tokensIn,
    tokensOut,
    costUsd,
    durationMs,
    inputText: `${systemPrompt}\n${userMessage}`,
    outputText: draftText,
  });

  return NextResponse.json({
    stub: false,
    draft: draftText,
    snippets_used: grounding.snippets.map((s) => ({
      slug: s.slug,
      title: s.title,
      category: s.category,
    })),
    run_id: runId,
  });
}
