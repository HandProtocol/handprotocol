/*
  POST /api/extract-checklist

  Body: { slug, rfp_text }

  Calls the AI router with a tight prompt that asks for a JSON checklist
  of requirements extracted from the pasted RFP text. Logs the call to
  command.assistant_runs. Returns the parsed checklist for the modal to
  preview before the operator saves.

  Saving the checklist into the grant markdown is the modal's
  responsibility (it calls the existing updateGrantSection server action),
  so this route stays pure: input pasted RFP, output structured list.

  If no provider is configured, the route returns a stub with an empty
  checklist and a friendly note.
*/
import { NextResponse, type NextRequest } from "next/server";
import { getAIRouter } from "@/lib/ai-router";
import { getGrantBySlug } from "@/lib/grants/queries";
import { buildGrounding } from "@/lib/assistant/grounding";
import { buildChecklistSystemPrompt } from "@/lib/assistant/prompts";
import { logAssistantRun } from "@/lib/assistant/log";

export const runtime = "nodejs";

type ChecklistItem = {
  title: string;
  description: string;
  attachment_needed: boolean;
};

type ChecklistRequestBody = {
  slug?: string;
  rfp_text?: string;
};

// Tolerant JSON extractor. The model sometimes wraps JSON in a code
// fence even when told not to; the regex strips common fence forms.
function tryParseChecklist(raw: string): ChecklistItem[] | null {
  const text = raw.trim();
  let candidate = text;

  // Strip ```json ... ``` or ``` ... ``` fences.
  const fenceMatch = candidate.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) candidate = fenceMatch[1];

  // If the model returned a JSON object with surrounding chatter, find
  // the first { and last }.
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace > 0 && lastBrace > firstBrace) {
    candidate = candidate.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(candidate) as {
      checklist?: ChecklistItem[];
    };
    if (!parsed || !Array.isArray(parsed.checklist)) return null;
    return parsed.checklist
      .filter(
        (item) =>
          item &&
          typeof item.title === "string" &&
          item.title.trim().length > 0,
      )
      .map((item) => ({
        title: String(item.title).trim(),
        description: String(item.description ?? "").trim(),
        attachment_needed: Boolean(item.attachment_needed),
      }));
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: ChecklistRequestBody;
  try {
    body = (await request.json()) as ChecklistRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const slug = String(body.slug || "").trim();
  const rfpText = String(body.rfp_text || "").trim();

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  if (rfpText.length < 40) {
    return NextResponse.json(
      { error: "RFP text is too short to extract requirements" },
      { status: 400 },
    );
  }

  const grant = await getGrantBySlug(slug);
  const router = getAIRouter();

  if (!router.hasAnyProvider()) {
    return NextResponse.json({
      stub: true,
      checklist: [],
      note: "RFP extractor offline. Set XAI_API_KEY (or ANTHROPIC_API_KEY) in .env.local to enable extraction. The pasted RFP text was not sent anywhere.",
      run_id: null,
    });
  }

  // Lightweight grounding here. We do not need the full HAND context for
  // requirement extraction, but a small framing block helps the model
  // skip funder-mission paragraphs.
  const grounding = await buildGrounding({
    question: "extract grant requirements checklist",
    grantContext: grant
      ? {
          name: grant.name,
          funder: grant.funder_name ?? null,
          program_url: grant.program_url,
          reciprocate_group: grant.reciprocate_group,
        }
      : undefined,
    snippetLimit: 0,
  });

  const systemPrompt = buildChecklistSystemPrompt({
    contextBlock: grounding.contextBlock,
  });

  // Cap the RFP text we send. 40k chars is a safe upper bound for a
  // typical RFP. Beyond that we ask the operator to paste in chunks.
  const cappedRfp =
    rfpText.length > 40000
      ? rfpText.slice(0, 40000) + "\n\n(...trimmed at 40,000 characters)"
      : rfpText;

  const userMessage = [
    "RFP text follows. Extract the requirements checklist. Return only the JSON object.",
    "",
    "---",
    cappedRfp,
    "---",
  ].join("\n");

  let raw = "";
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
      temperature: 0.2,
      maxTokens: 2400,
    });
    raw = result.text;
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
            : "Extraction call failed",
      },
      { status: 502 },
    );
  }

  const checklist = tryParseChecklist(raw) ?? [];
  const costUsd = router.estimateCost(modelKey, tokensIn, tokensOut);

  const { runId } = await logAssistantRun({
    surface: "rfp-extract",
    grantId: grant?.id ?? null,
    provider,
    modelKey,
    tokensIn,
    tokensOut,
    costUsd,
    durationMs,
    inputText: cappedRfp,
    outputText: raw,
  });

  return NextResponse.json({
    stub: false,
    checklist,
    run_id: runId,
  });
}
