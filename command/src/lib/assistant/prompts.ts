/*
  System prompt builder for the drafting assistant.

  Two surfaces share this file:
    1) /api/draft-answer, which writes a draft answer for one grant
       section based on the operator's question.
    2) /api/extract-checklist, which parses pasted RFP text into a
       structured requirements checklist.

  Both prompts enforce the same voice rules. The rules are encoded in
  src/lib/ai-router/voice.ts (VOICE_RULES_PROMPT). We layer a task brief
  on top.
*/
import { VOICE_RULES_PROMPT } from "@/lib/ai-router/voice";

export type DraftPromptInput = {
  section: string;
  question: string;
  contextBlock: string;
};

export function buildDraftSystemPrompt(input: DraftPromptInput): string {
  return [
    "You are the drafting assistant for the HAND Protocol Foundation grant program. The operator is writing a grant application section and has asked for a first-pass draft. Use the grounding context below to write the draft. Stay close to what HAND actually is and does. Concrete numbers, present-tense verbs, no hype.",
    "",
    "Output format:",
    "- Plain Markdown body only, no preamble like \"Here is a draft\".",
    "- Headings inside the draft are H3 or smaller (the section already has an H2).",
    "- Length: match the question. If the operator asks for a 200-word mission statement, return roughly 200 words. If no length is implied, aim for 150 to 300 words.",
    "- Cite no sources inline. The grounding context is for your understanding, not for quotation.",
    "",
    "Task brief for this call:",
    `- Section heading: ${input.section}`,
    `- The operator's question: ${input.question}`,
    "",
    VOICE_RULES_PROMPT,
    "",
    "Grounding context (do not quote verbatim, use as background):",
    "",
    input.contextBlock,
  ].join("\n");
}

export type ChecklistPromptInput = {
  contextBlock: string;
};

export function buildChecklistSystemPrompt(_input: ChecklistPromptInput): string {
  return [
    "You are the RFP parsing assistant for the HAND Protocol Foundation grant program. The operator has pasted the text of a grant request-for-proposals, application instructions, or program guidelines. Your job is to extract the requirements as a structured checklist the operator can work against.",
    "",
    "Output format, STRICT:",
    "- Return ONLY a JSON object with this shape:",
    '  {"checklist": [{"title": "...", "description": "...", "attachment_needed": true|false}]}',
    "- No markdown code fences. No prose before or after the JSON.",
    "- Each item title is short (a phrase, not a paragraph).",
    "- description carries the operative detail (page limits, word counts, deadlines, eligibility constraints).",
    "- attachment_needed is true if the item asks for a file upload, an attached document, a budget spreadsheet, a 990, a board roster, an org chart, or similar artifact.",
    "- Group similar items: a single \"Narrative\" line is better than five sub-bullets if the RFP lists them together.",
    "- Aim for 6 to 20 items. Skip filler (the funder's mission statement, the program's history paragraph). Keep only what HAND must do to apply.",
    "",
    VOICE_RULES_PROMPT,
    "",
    "If the input is empty, garbled, or does not contain extractable requirements, return:",
    '  {"checklist": []}',
  ].join("\n");
}

// Wrap the model's checklist output into a markdown section the operator
// can drop into the grant body. Used by the RFP modal's Save flow.
export function checklistToMarkdown(
  checklist: Array<{
    title: string;
    description: string;
    attachment_needed: boolean;
  }>,
): string {
  if (checklist.length === 0) {
    return "_No requirements extracted yet. Paste the RFP text and run extraction again._\n";
  }
  const lines: string[] = [];
  for (const item of checklist) {
    const marker = item.attachment_needed ? "[ ] (attachment)" : "[ ]";
    lines.push(`- ${marker} **${item.title}**`);
    if (item.description) {
      lines.push(`  ${item.description}`);
    }
  }
  return lines.join("\n") + "\n";
}
