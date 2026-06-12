/*
  HAND Command Center, cold-outreach script loader.
  Reads the markdown templates at biz/_templates/cold/*.md, parses the YAML
  frontmatter with gray-matter (the same parser the grant/lead markdown
  helpers use, via matter()), and returns typed ColdTemplate objects sorted by
  the frontmatter `order`. Unlike the leads, these are pure filesystem reads,
  there is no Supabase mirror; the markdown is the only source.

  Coded defensively: if biz/_templates/cold/ is missing or empty (the files
  may still be in flight while the templates are authored), the loader returns
  [] rather than throwing, same posture as the deadlines page when its config
  is absent.
*/
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { coldTemplatesDir } from "./paths";
import {
  COLD_SCRIPT_SURFACES,
  type ColdScriptSurface,
  type ColdTemplate,
  type ColdTemplateFrontmatter,
} from "./types";

function coerceSurface(value: unknown): ColdScriptSurface {
  return (COLD_SCRIPT_SURFACES as readonly string[]).includes(value as string)
    ? (value as ColdScriptSurface)
    : "email";
}

function coerceOrder(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function coerceSubjectOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v : String(v)))
    .map((v) => v.trim())
    .filter(Boolean);
}

function toTemplate(slug: string, raw: string): ColdTemplate {
  const parsed = matter(raw);
  const data = parsed.data as ColdTemplateFrontmatter;
  return {
    slug,
    title: data.title?.trim() || slug,
    variant: data.variant?.trim() || slug,
    surface: coerceSurface(data.surface),
    order: coerceOrder(data.order),
    subjectOptions: coerceSubjectOptions(data.subject_options),
    status: data.status?.trim() || null,
    updated: data.updated ? String(data.updated).trim() : null,
    body: parsed.content.trim(),
  };
}

// Read every *.md template in biz/_templates/cold/, parse it, and return the
// list sorted by `order` (then title as a tiebreaker). Returns [] when the
// dir is missing or holds no markdown files. Hidden/underscore-prefixed files
// (e.g. README.md is fine, but dotfiles and temp writes are skipped).
export async function listColdTemplates(): Promise<ColdTemplate[]> {
  const dir = coldTemplatesDir();

  let entries: string[];
  try {
    entries = await fs.promises.readdir(dir);
  } catch {
    // Missing dir (ENOENT) or unreadable; treat as no templates yet.
    return [];
  }

  const files = entries.filter(
    (name) =>
      name.toLowerCase().endsWith(".md") &&
      name.toLowerCase() !== "readme.md" &&
      !name.startsWith("."),
  );

  const templates: ColdTemplate[] = [];
  for (const file of files) {
    try {
      const raw = await fs.promises.readFile(path.join(dir, file), "utf8");
      templates.push(toTemplate(file.replace(/\.md$/i, ""), raw));
    } catch {
      // Skip an individual unreadable/half-written file rather than failing
      // the whole surface.
      continue;
    }
  }

  return templates.sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title),
  );
}
