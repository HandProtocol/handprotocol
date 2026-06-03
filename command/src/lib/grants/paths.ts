/*
  HAND Command Center, grant filesystem helpers.
  The markdown source-of-truth lives at funding/grants/<slug>.md relative
  to the repo root, which is one directory above the command/ project.
*/
import path from "node:path";

// Resolve the repo root from the command/ Next.js project. process.cwd()
// is the project root during `next dev`, `next build`, and `tsx scripts/`.
export function repoRoot(): string {
  return path.resolve(process.cwd(), "..");
}

export function grantsDir(): string {
  return path.join(repoRoot(), "funding", "grants");
}

export function grantMarkdownPath(slug: string): string {
  return path.join(grantsDir(), `${slug}.md`);
}

// Relative path stored on command.grants.markdown_path. Always uses
// forward slashes, even on Windows, so the value is portable.
export function grantMarkdownRelPath(slug: string): string {
  return `funding/grants/${slug}.md`;
}
