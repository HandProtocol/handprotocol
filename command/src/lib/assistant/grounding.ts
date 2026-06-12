/*
  Grounding layer for the drafting assistant.

  Pulls the canonical HAND context (hand-context.md), the founder-approved
  framing docs (ai-stance.md, mystic-hearts.md), and the top-N boilerplate
  snippets that best match the operator's question. Returns a single
  composed context block ready to be embedded into the system prompt,
  plus the list of boilerplate snippet records used so the UI can show
  the chips.

  This file runs server-side only.
*/
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { repoRoot } from "@/lib/grants/paths";
import { findRelevantBoilerplate } from "@/lib/boilerplate/queries";
import type { BoilerplateRecord } from "@/lib/boilerplate/types";

export type GroundingBundle = {
  contextBlock: string;
  snippets: BoilerplateRecord[];
  sourcesLoaded: {
    handContext: boolean;
    aiStance: boolean;
    mysticHearts: boolean;
  };
};

function safeRead(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

// hand-context.md lives in the user's claude skills tree. We resolve it
// via the home dir so the path works on any operator's machine.
function handContextPath(): string {
  return path.join(
    os.homedir(),
    ".claude",
    "skills",
    "grants",
    "references",
    "hand-context.md",
  );
}

function aiStancePath(): string {
  return path.join(repoRoot(), "funding", "framing", "ai-stance.md");
}

function mysticHeartsPath(): string {
  return path.join(repoRoot(), "funding", "framing", "mystic-hearts.md");
}

// Cap a single source document so the system prompt does not balloon
// past sensible limits. The full hand-context.md is ~107 lines, the
// framing docs are smaller. 6000 chars is generous for all three.
function clamp(text: string, max = 6000): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n\n(...trimmed for length)";
}

export async function buildGrounding(opts: {
  question: string;
  grantContext?: {
    name: string;
    funder: string | null;
    program_url: string | null;
    reciprocate_group: string | null;
  };
  snippetLimit?: number;
}): Promise<GroundingBundle> {
  const handContext = safeRead(handContextPath());
  const aiStance = safeRead(aiStancePath());
  const mysticHearts = safeRead(mysticHeartsPath());

  const snippets = await findRelevantBoilerplate(
    opts.question,
    opts.snippetLimit ?? 3,
  );

  const parts: string[] = [];

  if (opts.grantContext) {
    const g = opts.grantContext;
    parts.push(
      [
        "# Grant in scope",
        `Name: ${g.name}`,
        g.funder ? `Funder: ${g.funder}` : null,
        g.program_url ? `Program URL: ${g.program_url}` : null,
        g.reciprocate_group
          ? `Reciprocate group: ${g.reciprocate_group}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (handContext) {
    parts.push(`# HAND canonical context\n\n${clamp(handContext)}`);
  }

  if (aiStance) {
    parts.push(`# AI stance, founder-approved framing\n\n${clamp(aiStance, 3500)}`);
  }

  if (mysticHearts) {
    parts.push(
      `# Mystic Hearts, founder-approved framing\n\n${clamp(mysticHearts, 3500)}`,
    );
  }

  if (snippets.length > 0) {
    const snippetBlock = snippets
      .map(
        (s, i) =>
          `## Boilerplate ${i + 1}, "${s.title}" (category: ${s.category})\n\n${s.content}`,
      )
      .join("\n\n");
    parts.push(`# Reusable boilerplate snippets (top matches)\n\n${snippetBlock}`);
  }

  return {
    contextBlock: parts.join("\n\n---\n\n"),
    snippets,
    sourcesLoaded: {
      handContext: Boolean(handContext),
      aiStance: Boolean(aiStance),
      mysticHearts: Boolean(mysticHearts),
    },
  };
}
