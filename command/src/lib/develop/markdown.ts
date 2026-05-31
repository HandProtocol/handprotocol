/*
  HAND Command Center, business-development markdown helpers.
  The lead's canonical source is biz/<slug>/lead.md: YAML frontmatter with the
  business fields, then a "## Reviews" body that carries the pasted Google
  reviews verbatim as blockquotes. Markdown is written first (atomic), then the
  Supabase rows are upserted, same posture as grants.
*/
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import matter from "gray-matter";
import type { BizFrontmatter } from "./types";

export function checksum(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function kebabCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Compose a slug from the business name plus an optional city qualifier, then
// disambiguate against slugs already on disk.
export function composeBizSlug(
  name: string,
  city: string | undefined,
  existing: Set<string>,
): string {
  const base = [name, city]
    .filter((v): v is string => Boolean(v))
    .map(kebabCase)
    .filter(Boolean)
    .join("-");
  let slug = base || "lead";
  let n = 2;
  while (existing.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export type ParsedReview = {
  author: string | null;
  rating: number | null;
  body: string;
};

/*
  Parse a pasted block of reviews. One review per non-empty line. Accepted
  shapes, tried in order:
    Maria G (5): Best tacos in south Austin, hands down.
    Maria G | 5 | Best tacos in south Austin, hands down.
    Best tacos in south Austin, hands down.
  Author and rating are optional; the body is always required.
*/
export function parseReviews(raw: string): ParsedReview[] {
  const out: ParsedReview[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const paren = trimmed.match(/^(.+?)\s*\((\d)\)\s*:\s*(.+)$/);
    if (paren) {
      out.push({
        author: paren[1].trim() || null,
        rating: clampRating(Number(paren[2])),
        body: paren[3].trim(),
      });
      continue;
    }

    const piped = trimmed.split("|").map((s) => s.trim());
    if (piped.length === 3 && /^\d$/.test(piped[1])) {
      out.push({
        author: piped[0] || null,
        rating: clampRating(Number(piped[1])),
        body: piped[2],
      });
      continue;
    }

    out.push({ author: null, rating: null, body: trimmed });
  }
  return out;
}

function clampRating(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(1, Math.round(n)));
}

const FRONTMATTER_KEY_ORDER: (keyof BizFrontmatter)[] = [
  "slug",
  "name",
  "category",
  "city",
  "state",
  "phone",
  "address",
  "google_url",
  "google_rating",
  "reviews_count",
  "website_status",
  "status",
  "demo_url",
  "hand_lead",
];

// Render the reviews section of the body from parsed reviews.
export function reviewsToBody(reviews: ParsedReview[]): string {
  if (reviews.length === 0) {
    return "## Reviews\n\nNo reviews captured yet.\n";
  }
  const blocks = reviews.map((r) => {
    const attribution = [r.author, r.rating ? `${r.rating}/5` : null]
      .filter(Boolean)
      .join(", ");
    const quote = r.body
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    return attribution ? `${quote}\n>\n> ${attribution}` : quote;
  });
  return `## Reviews\n\n${blocks.join("\n\n")}\n`;
}

export function serializeBizLead(
  frontmatter: BizFrontmatter,
  body: string,
): string {
  const ordered: Record<string, unknown> = {};
  for (const key of FRONTMATTER_KEY_ORDER) {
    const v = frontmatter[key];
    if (v !== undefined && v !== null && v !== "") ordered[key] = v;
  }
  for (const [k, v] of Object.entries(frontmatter)) {
    if (!(k in ordered) && v !== undefined && v !== null && v !== "") {
      ordered[k] = v;
    }
  }
  return matter.stringify(body, ordered, { language: "yaml" });
}

export function readBizFile(filePath: string): {
  frontmatter: BizFrontmatter;
  body: string;
  raw: string;
  checksum: string;
} {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  return {
    frontmatter: parsed.data as BizFrontmatter,
    body: parsed.content,
    raw,
    checksum: checksum(raw),
  };
}

// Atomic write: temp file in the same directory, fsync, rename.
export async function writeFileAtomic(
  filePath: string,
  content: string,
): Promise<{ checksum: string }> {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
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
