/*
  HAND Command Center, slug helpers.
  Slugs key the markdown file at funding/grants/<slug>.md and the
  command.grants.slug column. Generated kebab-case from the funder name
  and the grant name.
*/

export function kebabCase(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Compose a slug from funder + grant name. The funder leads because
// the operator scans the kanban funder-first.
export function composeSlug(funderName: string, grantName: string): string {
  const funder = kebabCase(funderName);
  const grant = kebabCase(grantName);
  if (!grant) return funder || "untitled";
  if (!funder) return grant;
  // Avoid double-counting when the grant name already starts with the
  // funder. E.g. "Arcee AI · Trinity Builders" + funder "Arcee AI" →
  // "arcee-ai-trinity-builders" not "arcee-ai-arcee-ai-trinity-builders".
  if (grant.startsWith(funder + "-") || grant === funder) return grant;
  return `${funder}-${grant}`;
}

export function disambiguateSlug(
  base: string,
  existing: Set<string>,
): string {
  if (!existing.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  // Fallback: append a short random suffix.
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
