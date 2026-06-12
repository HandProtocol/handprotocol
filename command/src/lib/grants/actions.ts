"use server";

/*
  HAND Command Center, grant server actions.
  Writes flow: markdown file first (atomic), then Supabase upsert. If the
  Supabase write fails after a successful markdown write, we set
  last_synced_at = null so the reconciler picks it up. The markdown
  remains canonical either way.
*/
import fs from "node:fs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  grantMarkdownPath,
  grantMarkdownRelPath,
  grantsDir,
} from "./paths";
import {
  readGrantFile,
  writeGrantFileAtomic,
  serializeGrant,
  replaceMarkdownSection,
} from "./markdown";
import { composeSlug, disambiguateSlug, kebabCase } from "./slug";
import { GRANT_STATUSES, type GrantFrontmatter, type GrantStatus } from "./types";
import { snapshotForSubmission } from "./submission-archive";
import path from "node:path";

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "command" },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function ensureFunder(name: string | null | undefined, url: string | null) {
  if (!configured() || !name) return null;
  const client = adminClient();
  const slug = kebabCase(name);
  if (!slug) return null;

  const { data: existing } = await client
    .from("funders")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: inserted } = await client
    .from("funders")
    .insert({ slug, name, funder_url: url })
    .select("id")
    .single();
  return (inserted?.id as string) ?? null;
}

async function upsertGrantRow(
  slug: string,
  fm: GrantFrontmatter,
  cs: string,
): Promise<void> {
  if (!configured()) return;
  const client = adminClient();

  const funder_id = await ensureFunder(
    fm.funder ?? null,
    fm.funder_url ?? null,
  );

  const row = {
    slug,
    name: String(fm.name ?? slug),
    funder_id,
    status: ((GRANT_STATUSES as readonly string[]).includes(String(fm.status))
      ? (fm.status as GrantStatus)
      : "discovery") as GrantStatus,
    award_type: fm.award_type ? String(fm.award_type) : null,
    award_size: fm.award_size ? String(fm.award_size) : null,
    amount_requested:
      fm.amount_requested != null && fm.amount_requested !== ""
        ? Number(fm.amount_requested)
        : null,
    amount_awarded:
      fm.amount_awarded != null && fm.amount_awarded !== ""
        ? Number(fm.amount_awarded)
        : null,
    match_required: fm.match_required ? String(fm.match_required) : null,
    reporting: fm.reporting ? String(fm.reporting) : null,
    deadline: normalizeDate(fm.deadline),
    discovered_on: normalizeDate(fm.discovered_on),
    submitted_on: normalizeDate(fm.submitted_on),
    decided_on: normalizeDate(fm.decided_on),
    reciprocate_group: fm.reciprocate_group
      ? String(fm.reciprocate_group)
      : null,
    fit_score:
      fm.fit_score != null && fm.fit_score !== ""
        ? Math.min(5, Math.max(1, Math.round(Number(fm.fit_score))))
        : null,
    hand_lead: fm.hand_lead ? String(fm.hand_lead) : null,
    contact: fm.contact ? String(fm.contact) : null,
    funder_url: fm.funder_url ? String(fm.funder_url) : null,
    program_url: fm.program_url ? String(fm.program_url) : null,
    application_url: fm.application_url ? String(fm.application_url) : null,
    markdown_path: grantMarkdownRelPath(slug),
    content_checksum: cs,
    last_synced_at: new Date().toISOString(),
  };

  const { data: existing } = await client
    .from("grants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    await client.from("grants").update(row).eq("id", existing.id);
  } else {
    await client.from("grants").insert(row);
  }
}

function normalizeDate(raw: unknown): string | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === "rolling") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

async function markStaleSync(slug: string) {
  if (!configured()) return;
  const client = adminClient();
  await client
    .from("grants")
    .update({ last_synced_at: null })
    .eq("slug", slug);
}

// ─── Status change ───────────────────────────────────────────────────────
export async function updateGrantStatus(slug: string, status: GrantStatus) {
  if (!(GRANT_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  const filePath = grantMarkdownPath(slug);
  const { frontmatter, body, checksum } = readGrantFile(filePath);
  if (frontmatter.status === status) {
    // No-op writeback, but still revalidate views.
    revalidatePath("/grants");
    revalidatePath(`/grants/${slug}`);
    return;
  }

  // Snapshot the canonical state before any mutation when this is a
  // fresh transition into `submitted`. The snapshot captures the
  // markdown plus every attachment so the record of what was sent
  // stays exact. A snapshot failure aborts the status flip.
  if (status === "submitted" && frontmatter.status !== "submitted") {
    try {
      await snapshotForSubmission(slug);
    } catch (err) {
      throw new Error(
        `Submission archive failed for ${slug}, status not changed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const next: GrantFrontmatter = { ...frontmatter, status };
  // Stamp the right date field on terminal/intermediate transitions.
  if (status === "submitted" && !next.submitted_on) next.submitted_on = today;
  if ((status === "awarded" || status === "declined") && !next.decided_on)
    next.decided_on = today;

  const newContent = serializeGrant(next, body);
  let newChecksum = checksum;
  try {
    const w = await writeGrantFileAtomic(filePath, newContent);
    newChecksum = w.checksum;
  } catch (err) {
    throw new Error(
      `Markdown write failed for ${slug}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    await upsertGrantRow(slug, next, newChecksum);
  } catch {
    await markStaleSync(slug);
  }

  revalidatePath("/grants");
  revalidatePath(`/grants/${slug}`);
}

// ─── Frontmatter form save ──────────────────────────────────────────────
export async function updateGrantFrontmatter(
  slug: string,
  patch: Partial<GrantFrontmatter>,
) {
  const filePath = grantMarkdownPath(slug);
  const { frontmatter, body, checksum } = readGrantFile(filePath);

  const cleanPatch: GrantFrontmatter = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === "" || v === undefined) {
      // Allow clearing a field by passing null
      (cleanPatch as Record<string, unknown>)[k] = undefined;
      continue;
    }
    (cleanPatch as Record<string, unknown>)[k] = v;
  }

  const next: GrantFrontmatter = { ...frontmatter, ...cleanPatch };
  const newContent = serializeGrant(next, body);

  let newChecksum = checksum;
  try {
    const w = await writeGrantFileAtomic(filePath, newContent);
    newChecksum = w.checksum;
  } catch (err) {
    throw new Error(
      `Markdown write failed for ${slug}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    await upsertGrantRow(slug, next, newChecksum);
  } catch {
    await markStaleSync(slug);
  }

  revalidatePath("/grants");
  revalidatePath(`/grants/${slug}`);
}

// ─── Section autosave ────────────────────────────────────────────────────
export async function updateGrantSection(
  slug: string,
  sectionHeading: string,
  newContent: string,
) {
  const filePath = grantMarkdownPath(slug);
  const { frontmatter, body, checksum } = readGrantFile(filePath);

  const newBody = replaceMarkdownSection(body, sectionHeading, newContent);
  const serialized = serializeGrant(frontmatter, newBody);

  let newChecksum = checksum;
  try {
    const w = await writeGrantFileAtomic(filePath, serialized);
    newChecksum = w.checksum;
  } catch (err) {
    throw new Error(
      `Markdown write failed for ${slug}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Body changes do not change Supabase fields, but the checksum and
  // last_synced_at must update so the reconciler sees the fresh state.
  try {
    await upsertGrantRow(slug, frontmatter, newChecksum);
  } catch {
    await markStaleSync(slug);
  }

  revalidatePath(`/grants/${slug}`);
}

// ─── Fit-score (slider on kanban + detail) ──────────────────────────────
export async function updateGrantFitScore(slug: string, score: number | null) {
  const next = score == null ? null : Math.min(5, Math.max(1, Math.round(score)));
  await updateGrantFrontmatter(slug, { fit_score: next ?? "" });
}

// ─── New grant scaffold ─────────────────────────────────────────────────
export async function createGrant(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const funder = String(formData.get("funder") ?? "").trim();
  const program_url = String(formData.get("program_url") ?? "").trim();
  const funder_url = String(formData.get("funder_url") ?? "").trim();
  const discovered_on =
    String(formData.get("discovered_on") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!name) throw new Error("Grant name is required");
  if (!funder) throw new Error("Funder is required");

  // Compose a slug from funder + name, then disambiguate against existing
  // files on disk (canonical source).
  const baseSlug = composeSlug(funder, name);
  const dir = grantsDir();
  const existingFiles = new Set<string>();
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".md")) existingFiles.add(f.replace(/\.md$/, ""));
    }
  }
  const slug = disambiguateSlug(baseSlug, existingFiles);

  // Read the template (canonical structure) and replace the placeholder
  // frontmatter with real values.
  const templatePath = path.join(dir, "_template.md");
  let templateBody = "";
  try {
    const tpl = readGrantFile(templatePath);
    templateBody = tpl.body;
  } catch {
    templateBody = "## TL;DR\n\nOne paragraph: what the program funds, what HAND would request, why it is a fit.\n\n## Fit assessment\n\nWhy HAND should (or should not) pursue this.\n";
  }

  const fm: GrantFrontmatter = {
    slug,
    name,
    funder,
    funder_url: funder_url || undefined,
    program_url: program_url || undefined,
    status: "discovery",
    discovered_on,
    hand_lead: "koH",
  };

  const content = serializeGrant(fm, templateBody);
  const filePath = grantMarkdownPath(slug);
  const { checksum } = await writeGrantFileAtomic(filePath, content);

  try {
    await upsertGrantRow(slug, fm, checksum);
  } catch {
    await markStaleSync(slug);
  }

  revalidatePath("/grants");
  redirect(`/grants/${slug}`);
}
