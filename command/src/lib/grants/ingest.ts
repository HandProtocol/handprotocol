/*
  HAND Command Center, grant ingest.
  Walks funding/grants/*.md, parses frontmatter, upserts into
  command.grants. Funders are upserted by slug derived from the funder
  display name in the frontmatter. Files starting with `_` are skipped
  (templates, research, scoping docs).

  Runs in two contexts:
    - CLI:  `npm run ingest:grants`   (scripts/ingest-grants.ts)
    - App:  imported from server actions to reconcile after a write

  Either way, the ingest uses the Supabase admin client (service role)
  because the script may run before a Supabase Auth session exists.
*/
import fs from "node:fs";
import path from "node:path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { grantsDir, grantMarkdownRelPath } from "./paths";
import { readGrantFile } from "./markdown";
import { kebabCase } from "./slug";
import type { IngestSummary, GrantFrontmatter, GrantStatus } from "./types";
import { GRANT_STATUSES } from "./types";

type AdminClient = ReturnType<typeof createAdminClient>;

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars are not set. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in command/.env.local.",
    );
  }
  return createSupabaseClient(url, key, {
    db: { schema: "command" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// supabase-js errors are PostgrestError objects, not Error instances.
// Extract a useful message from any error-ish thing.
function describeError(err: unknown): string {
  if (!err) return "unknown error";
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts: string[] = [];
    if (e.message) parts.push(e.message);
    if (e.details) parts.push(`details: ${e.details}`);
    if (e.hint) parts.push(`hint: ${e.hint}`);
    if (e.code) parts.push(`code: ${e.code}`);
    if (parts.length) return parts.join(" | ");
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function normalizeStatus(raw: unknown): GrantStatus {
  const v = String(raw ?? "").trim().toLowerCase();
  return (GRANT_STATUSES as readonly string[]).includes(v)
    ? (v as GrantStatus)
    : "discovery";
}

function normalizeDate(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === "rolling") return null;
  // Accept YYYY-MM-DD as-is. Reject any other shape rather than guess.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function normalizeAmount(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/[\$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeFitScore(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(String(raw).match(/\d+/)?.[0] ?? "");
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 5) return null;
  return Math.round(n);
}

async function upsertFunder(
  client: AdminClient,
  funderName: string,
  funderUrl: string | null,
  summary: IngestSummary,
): Promise<string | null> {
  const slug = kebabCase(funderName);
  if (!slug) return null;

  const { data: existing, error: selectErr } = await client
    .from("funders")
    .select("id, name, funder_url")
    .eq("slug", slug)
    .maybeSingle();

  if (selectErr) {
    summary.errors.push({
      file: `funder:${slug}`,
      message: describeError(selectErr),
    });
    return null;
  }

  if (existing) {
    if (funderUrl && existing.funder_url !== funderUrl) {
      const { error } = await client
        .from("funders")
        .update({ funder_url: funderUrl })
        .eq("id", existing.id);
      if (!error) summary.fundersUpdated += 1;
    }
    return existing.id as string;
  }

  const { data: inserted, error } = await client
    .from("funders")
    .insert({ slug, name: funderName, funder_url: funderUrl })
    .select("id")
    .single();

  if (error || !inserted) {
    summary.errors.push({
      file: `funder:${slug}`,
      message: describeError(error),
    });
    return null;
  }
  summary.fundersCreated += 1;
  return inserted.id as string;
}

export async function ingestGrants(options?: {
  dir?: string;
  // If true, log progress to stdout. CLI usage sets this. Server-action
  // usage leaves it off.
  verbose?: boolean;
}): Promise<IngestSummary> {
  const dir = options?.dir ?? grantsDir();
  const verbose = options?.verbose ?? false;
  const client = createAdminClient();

  const summary: IngestSummary = {
    scanned: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    fundersCreated: 0,
    fundersUpdated: 0,
    errors: [],
  };

  if (!fs.existsSync(dir)) {
    summary.errors.push({ file: dir, message: "grants directory not found" });
    return summary;
  }

  const entries = await fs.promises.readdir(dir);
  const files = entries
    .filter((f) => f.endsWith(".md"))
    .filter((f) => !f.startsWith("_"))
    .sort();

  for (const filename of files) {
    summary.scanned += 1;
    const filePath = path.join(dir, filename);
    const slugFromFilename = filename.replace(/\.md$/, "");

    try {
      const { frontmatter, checksum: cs } = readGrantFile(filePath);
      const fm = frontmatter as GrantFrontmatter;

      const slug = (fm.slug ? String(fm.slug) : slugFromFilename).trim();
      const name = fm.name ? String(fm.name) : slug;
      const funderName = fm.funder ? String(fm.funder).trim() : null;
      const funderUrl = fm.funder_url ? String(fm.funder_url).trim() : null;

      let funder_id: string | null = null;
      if (funderName) {
        funder_id = await upsertFunder(client, funderName, funderUrl, summary);
      }

      const row = {
        slug,
        name,
        funder_id,
        status: normalizeStatus(fm.status),
        award_type: fm.award_type ? String(fm.award_type) : null,
        award_size: fm.award_size ? String(fm.award_size) : null,
        amount_requested: normalizeAmount(fm.amount_requested),
        amount_awarded: normalizeAmount(fm.amount_awarded),
        match_required: fm.match_required ? String(fm.match_required) : null,
        reporting: fm.reporting ? String(fm.reporting) : null,
        deadline: normalizeDate(fm.deadline),
        discovered_on: normalizeDate(fm.discovered_on),
        submitted_on: normalizeDate(fm.submitted_on),
        decided_on: normalizeDate(fm.decided_on),
        reciprocate_group: fm.reciprocate_group
          ? String(fm.reciprocate_group)
          : null,
        fit_score: normalizeFitScore(fm.fit_score),
        hand_lead: fm.hand_lead ? String(fm.hand_lead) : null,
        contact: fm.contact ? String(fm.contact) : null,
        funder_url: funderUrl,
        program_url: fm.program_url ? String(fm.program_url) : null,
        application_url: fm.application_url ? String(fm.application_url) : null,
        markdown_path: grantMarkdownRelPath(slug),
        content_checksum: cs,
        last_synced_at: new Date().toISOString(),
      };

      const { data: existing, error: selectErr } = await client
        .from("grants")
        .select("id, content_checksum")
        .eq("slug", slug)
        .maybeSingle();

      if (selectErr) throw selectErr;

      if (!existing) {
        const { error } = await client.from("grants").insert(row);
        if (error) throw error;
        summary.inserted += 1;
        if (verbose) console.log(`  + inserted ${slug}`);
      } else if (existing.content_checksum === cs) {
        const { error } = await client
          .from("grants")
          .update({ last_synced_at: row.last_synced_at })
          .eq("id", existing.id);
        if (error) throw error;
        summary.unchanged += 1;
        if (verbose) console.log(`  · unchanged ${slug}`);
      } else {
        const { error } = await client
          .from("grants")
          .update(row)
          .eq("id", existing.id);
        if (error) throw error;
        summary.updated += 1;
        if (verbose) console.log(`  ~ updated ${slug}`);
      }
    } catch (err) {
      const message = describeError(err);
      summary.errors.push({ file: filename, message });
      if (verbose) console.error(`  ! error ${filename}: ${message}`);
    }
  }

  return summary;
}
