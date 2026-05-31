/*
  HAND Command Center, business-development filesystem helpers.
  Two roots, both relative to the repo root (one dir above command/):
    - biz/<slug>/lead.md          the canonical lead source (frontmatter + reviews)
    - web/demos/<slug>/index.html the generated demo site, served by the main
                                  Netlify deploy at /demos/<slug>/

  A per-business subdomain (e.g. joes-bbq.handprotocol.org) can be layered on
  later via wildcard DNS + a _redirects rule; v1 ships the live path URL.
*/
import path from "node:path";

export function repoRoot(): string {
  return path.resolve(process.cwd(), "..");
}

export function bizDir(): string {
  return path.join(repoRoot(), "biz");
}

export function bizLeadDir(slug: string): string {
  return path.join(bizDir(), slug);
}

export function bizLeadMarkdownPath(slug: string): string {
  return path.join(bizLeadDir(slug), "lead.md");
}

// Relative path stored on command.biz_leads.markdown_path. Forward slashes.
export function bizLeadMarkdownRelPath(slug: string): string {
  return `biz/${slug}/lead.md`;
}

export function demosDir(): string {
  return path.join(repoRoot(), "web", "demos");
}

export function demoSiteDir(slug: string): string {
  return path.join(demosDir(), slug);
}

export function demoSitePath(slug: string): string {
  return path.join(demoSiteDir(slug), "index.html");
}

// The public URL the generated site resolves to once the main site deploys.
export function demoPublicUrl(slug: string): string {
  return `/demos/${slug}/`;
}
