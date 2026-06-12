/*
  HAND Command Center, markdown read/write helpers.
  Markdown is canonical. Every server action that mutates a grant writes
  the markdown file FIRST, then upserts the Supabase row. The write is
  atomic (temp file + fsync + rename) so a process crash mid-write never
  corrupts the canonical source.
*/
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import matter from "gray-matter";
import type { GrantFrontmatter } from "./types";

export function checksum(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Parse a markdown file with YAML frontmatter. Returns frontmatter and
// the body. Throws if the file does not exist.
export function readGrantFile(filePath: string): {
  frontmatter: GrantFrontmatter;
  body: string;
  raw: string;
  checksum: string;
} {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  return {
    frontmatter: parsed.data as GrantFrontmatter,
    body: parsed.content,
    raw,
    checksum: checksum(raw),
  };
}

// Serialize frontmatter + body back to a markdown string. Stable key
// order so git diffs stay tight.
const FRONTMATTER_KEY_ORDER: (keyof GrantFrontmatter)[] = [
  "slug",
  "name",
  "funder",
  "funder_url",
  "program_url",
  "application_url",
  "status",
  "award_type",
  "award_size",
  "amount_requested",
  "amount_awarded",
  "match_required",
  "reporting",
  "deadline",
  "discovered_on",
  "submitted_on",
  "decided_on",
  "contact",
  "hand_lead",
  "fit_score",
  "reciprocate_group",
];

export function serializeGrant(
  frontmatter: GrantFrontmatter,
  body: string,
): string {
  // Deterministic key order, then any extras (in their original order
  // from the input).
  const ordered: Record<string, unknown> = {};
  for (const key of FRONTMATTER_KEY_ORDER) {
    if (frontmatter[key] !== undefined && frontmatter[key] !== null && frontmatter[key] !== "") {
      ordered[key] = frontmatter[key];
    }
  }
  for (const [k, v] of Object.entries(frontmatter)) {
    if (!(k in ordered) && v !== undefined && v !== null && v !== "") {
      ordered[k] = v;
    }
  }

  return matter.stringify(body, ordered, {
    // Force forward-slash-friendly yaml with single-line scalars where
    // possible. gray-matter delegates to js-yaml under the hood.
    language: "yaml",
  });
}

// Atomic write: temp file in the same directory, fsync, rename.
// Caller must compute the new content first; we never touch the body.
export async function writeGrantFileAtomic(
  filePath: string,
  content: string,
): Promise<{ checksum: string }> {
  const dir = path.dirname(filePath);
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  await fs.promises.mkdir(dir, { recursive: true });

  const fd = await fs.promises.open(tmp, "w");
  try {
    await fd.writeFile(content, "utf8");
    await fd.sync();
  } finally {
    await fd.close();
  }

  await fs.promises.rename(tmp, filePath);
  return { checksum: checksum(content) };
}

// Replace a single H2 section in the markdown body. The section
// identifier is the heading text after `## `. If the section is not
// present, append it. Used by the section autosave flow.
export function replaceMarkdownSection(
  body: string,
  sectionHeading: string,
  newContent: string,
): string {
  const target = sectionHeading.trim();
  const lines = body.split("\n");
  const sectionStartRegex = /^##\s+(.+?)\s*$/;

  let startIdx = -1;
  let endIdx = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(sectionStartRegex);
    if (m && m[1].trim() === target) {
      startIdx = i;
      for (let j = i + 1; j < lines.length; j++) {
        if (/^##\s+/.test(lines[j])) {
          endIdx = j;
          break;
        }
      }
      break;
    }
  }

  const trimmed = newContent.replace(/\s+$/, "");
  if (startIdx === -1) {
    // Append section at the end.
    const suffix = body.endsWith("\n") ? "" : "\n";
    return `${body}${suffix}\n## ${target}\n\n${trimmed}\n`;
  }

  const before = lines.slice(0, startIdx + 1).join("\n");
  const after = lines.slice(endIdx).join("\n");
  return `${before}\n\n${trimmed}\n\n${after.replace(/^\n+/, "")}`;
}

// Extract H2 sections from a markdown body. Used by the detail view to
// render editable tabs and by the autosave flow.
export type MarkdownSection = {
  heading: string;
  content: string;
  order: number;
};

export function extractSections(body: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = body.split("\n");
  let current: MarkdownSection | null = null;
  let order = 0;

  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1].trim(), content: "", order: order++ };
    } else if (current) {
      current.content += (current.content ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  // Trim trailing whitespace on each section.
  return sections.map((s) => ({ ...s, content: s.content.replace(/\s+$/, "") }));
}
