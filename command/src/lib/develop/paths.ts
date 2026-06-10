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

// Cold-outreach script templates: biz/_templates/cold/*.md. One file per
// variant (email-founder, call-live, voicemail, dm, ...), each with YAML
// frontmatter and a markdown body carrying [BRACKET] placeholder tokens.
// The reps read/copy these from /develop/scripts. The dir may be empty or
// missing while the templates are still being authored; the loader codes
// defensively around that, same posture as the deadlines page.
export function coldTemplatesDir(): string {
  return path.join(bizDir(), "_templates", "cold");
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

// The pitch page (password-gated) lives one level under the demo.
export function demoPitchDir(slug: string): string {
  return path.join(demoSiteDir(slug), "pitch");
}

export function demoPitchPath(slug: string): string {
  return path.join(demoPitchDir(slug), "index.html");
}

export function pitchPublicUrl(slug: string): string {
  return `/demos/${slug}/pitch/`;
}

// ─── Production (owned) sites ───────────────────────────────────────────────
// Once a lead graduates (hand-biz-pitch Phase 6) its site is promoted out of
// web/demos into clients/<slug>/ and deployed as its OWN Netlify site on a
// custom domain. The folder lives at the repo root, OUTSIDE web/, so the main
// handprotocol deploy never publishes it. The production slug can differ from
// the lead slug (it matches the domain), so callers pass it explicitly.
export function clientsDir(): string {
  return path.join(repoRoot(), "clients");
}

export function clientSiteDir(prodSlug: string): string {
  return path.join(clientsDir(), prodSlug);
}

export function clientSitePath(prodSlug: string): string {
  return path.join(clientSiteDir(prodSlug), "index.html");
}

export function clientSiteRelPath(prodSlug: string): string {
  return `clients/${prodSlug}`;
}
