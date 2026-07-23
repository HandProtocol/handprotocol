/*
  Voice rules, encoded for the drafting assistant's system prompt.
  Reference: ~/.claude/skills/grants/references/hand-context.md and
  funding/framing/ai-stance.md. The same rules apply to every operator
  surface, including the assistant's drafts.

  Two consumers:
    1) buildVoiceRulesPrompt() -- embedded into the system message
    2) lintVoice() -- a cheap post-pass that fixes the easy violations
       (em dashes mostly) and surfaces the rest as warnings.
*/

export const VOICE_RULES_PROMPT = `Voice rules for HAND Protocol Foundation grant writing. Follow strictly:

- No em dashes anywhere. Use commas, periods, parentheses, or "and" instead.
- No AI tells. Banned phrases: furthermore, leverage, robust, ecosystem, delve into, navigate the complexities, in conclusion, it is worth noting, game-changing, best-in-class, revolutionary, supercharge, unleash, unlock potential.
- Never name a specific AI vendor or model in the output. Refer to "the assistant" if needed.
- Mission terms exactly as written: Reciprocates (people HAND serves), Contributors (skill donors), Sovereign Reciprocates (the AI workstream), 501(c)(3) in formation. Do not substitute "clients" or "beneficiaries" for Reciprocates when describing HAND's own program.
- Dollar amounts with commas, no rounding, no abbreviation: $22,777 not $22K, $222,222 not 222000.
- Evidence-first, warm-editorial. Concrete numbers over adjectives. Lead with what HAND is doing, not what HAND believes.
- No marketing puffery. No hype.
- Status verbs in present tense.

HAND identity, one paragraph: HAND Protocol Foundation is a 501(c)(3) in formation in Austin, Texas. The mission is a pool-of-resources skill-exchange model. Contributors donate services, web, design, healing modalities, organizing, infrastructure. Reciprocates receive and give back in kind, expanding mutual aid beyond crypto-native populations. The differentiator is sustained accompaniment, "we don't build and bounce."

Three communities served: impact entrepreneurs (mission-driven founders), community-rooted small businesses (owner-operated ventures that create local value), and grassroots organizations (mutual aid, food access, land stewardship).

Sovereign Reciprocates is HAND's AI workstream. Custom open-source agent systems per Reciprocate group, group-owned, eight sovereignty principles. The stance is "bleeding edge and sovereign." HAND uses leading frontier models where capability is decisive, experimental and open-source models where sovereignty matters most. Do not name specific models in grant prose.

Foundation campaign tiers: $22,777 filing floor, $77,444 operating minimum, $222,222 first goal. Sovereign Reciprocates tiers: $11,113 POC, $99,777 one-year pilot, $333,223 production layer.`;

// Forbidden phrases the linter flags. Lower-case match.
const FORBIDDEN_PHRASES = [
  "furthermore",
  "leverage",
  "robust",
  "ecosystem",
  "delve into",
  "navigate the complexities",
  "in conclusion",
  "it is worth noting",
  "game-changing",
  "best-in-class",
  "revolutionary",
  "supercharge",
  "unleash",
  "unlock potential",
  "moreover",
  "in summary",
];

// AI-vendor names that should never appear in operator-facing prose.
const VENDOR_NAMES = [
  "claude",
  "anthropic",
  "openai",
  "gpt-4",
  "gpt-3",
  "chatgpt",
  "gemini",
  "llama",
  "mistral",
];

export type VoiceFlag = {
  kind: "em-dash" | "forbidden-phrase" | "vendor-name" | "ai-tell";
  match: string;
  start: number;
  end: number;
  suggestion?: string;
};

export function lintVoice(text: string): VoiceFlag[] {
  const flags: VoiceFlag[] = [];
  const lower = text.toLowerCase();

  // Em dashes. The linter catches both U+2014 and the " -- " ASCII
  // surrogate. Suggestion is a comma.
  const emDashRe = /(—|–|\s--\s)/g;
  let m: RegExpExecArray | null;
  while ((m = emDashRe.exec(text)) !== null) {
    flags.push({
      kind: "em-dash",
      match: m[0],
      start: m.index,
      end: m.index + m[0].length,
      suggestion: ", ",
    });
  }

  for (const phrase of FORBIDDEN_PHRASES) {
    let idx = 0;
    while ((idx = lower.indexOf(phrase, idx)) !== -1) {
      flags.push({
        kind: "forbidden-phrase",
        match: text.slice(idx, idx + phrase.length),
        start: idx,
        end: idx + phrase.length,
      });
      idx += phrase.length;
    }
  }

  for (const name of VENDOR_NAMES) {
    let idx = 0;
    while ((idx = lower.indexOf(name, idx)) !== -1) {
      // Only flag whole-word matches.
      const before = idx === 0 ? " " : lower[idx - 1];
      const after = lower[idx + name.length] ?? " ";
      if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) {
        idx += name.length;
        continue;
      }
      flags.push({
        kind: "vendor-name",
        match: text.slice(idx, idx + name.length),
        start: idx,
        end: idx + name.length,
        suggestion: "the assistant",
      });
      idx += name.length;
    }
  }

  return flags;
}

// Strip the cheap violations (em dashes mostly) before showing a draft.
// We do not strip vendor names; that requires editorial judgment.
export function autoFixEmDashes(text: string): string {
  return text.replace(/—|–/g, ", ").replace(/\s--\s/g, ", ");
}
