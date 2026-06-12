"use server";

/*
  HAND Command Center, inbox server actions. Capture + triage.

  Triage outcomes:
   - "Becomes grant" writes a new funding/grants/<slug>.md, upserts the
     mirror row, then stamps the inbox item with becomes_grant +
     resolved_slug. Same markdown-first contract as createGrant in
     src/lib/grants/actions.ts, but without the redirect, so the inbox
     UI can update inline.
   - "Becomes funder" inserts a new funders row, then stamps the inbox
     item with becomes_funder + resolved_slug.
   - "Discard" sets status to discarded with the operator's reason.

  All paths use the admin client. RLS on the table allows admins; the
  capture API route also uses the admin client behind a shared-secret
  header so external integrations (browser extension, email forward)
  can land items without an auth session.
*/

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { grantsDir, grantMarkdownPath, grantMarkdownRelPath } from "@/lib/grants/paths";
import {
  readGrantFile,
  serializeGrant,
  writeGrantFileAtomic,
} from "@/lib/grants/markdown";
import { composeSlug, disambiguateSlug, kebabCase } from "@/lib/grants/slug";
import type { GrantFrontmatter } from "@/lib/grants/types";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { InboxSource } from "./types";

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

/* ─── Capture ─────────────────────────────────────────────────────────── */

export async function captureInboxItem(formData: FormData) {
  if (!configured()) throw new Error("Supabase env vars are not set");

  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const sourceRaw = String(formData.get("source") ?? "manual").trim();

  if (!title && !url && !body) {
    throw new Error("Paste a URL, a title, or notes before saving");
  }

  const source: InboxSource =
    sourceRaw === "api" || sourceRaw === "email" || sourceRaw === "extension"
      ? (sourceRaw as InboxSource)
      : "manual";

  const profile = await getCurrentProfile();

  const client = adminClient();
  const { error } = await client.from("inbox_items").insert({
    title: title || null,
    url: url || null,
    body: body || null,
    source,
    status: "needs_triage",
    captured_by: profile?.id ?? null,
  });
  if (error) throw new Error(`Could not save the capture: ${error.message}`);

  revalidatePath("/inbox");
}

/* ─── Triage: becomes grant ───────────────────────────────────────────── */

export async function triageInboxToGrant(
  itemId: string,
  input: { name: string; funder: string; program_url?: string },
) {
  if (!configured()) throw new Error("Supabase env vars are not set");

  const name = input.name.trim();
  const funder = input.funder.trim();
  if (!name) throw new Error("Grant name is required");
  if (!funder) throw new Error("Funder is required");

  const baseSlug = composeSlug(funder, name);
  const dir = grantsDir();
  const existingFiles = new Set<string>();
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".md")) existingFiles.add(f.replace(/\.md$/, ""));
    }
  }
  const slug = disambiguateSlug(baseSlug, existingFiles);

  // Try to copy the template body; fall back to a minimal scaffold.
  const templatePath = path.join(dir, "_template.md");
  let templateBody = "";
  try {
    const tpl = readGrantFile(templatePath);
    templateBody = tpl.body;
  } catch {
    templateBody =
      "## TL;DR\n\nOne paragraph: what the program funds, what HAND would request, why it is a fit.\n\n## Fit assessment\n\nWhy HAND should (or should not) pursue this.\n";
  }

  const today = new Date().toISOString().slice(0, 10);
  const fm: GrantFrontmatter = {
    slug,
    name,
    funder,
    program_url: input.program_url?.trim() || undefined,
    status: "discovery",
    discovered_on: today,
    hand_lead: "koH",
  };

  const content = serializeGrant(fm, templateBody);
  const filePath = grantMarkdownPath(slug);
  const { checksum } = await writeGrantFileAtomic(filePath, content);

  // Upsert the funder + grant rows. We mirror the minimal shape so the
  // kanban picks the new card up immediately.
  const client = adminClient();

  const funderSlug = kebabCase(funder);
  let funderId: string | null = null;
  if (funderSlug) {
    const { data: existing } = await client
      .from("funders")
      .select("id")
      .eq("slug", funderSlug)
      .maybeSingle();
    if (existing) {
      funderId = existing.id as string;
    } else {
      const { data: inserted } = await client
        .from("funders")
        .insert({ slug: funderSlug, name: funder })
        .select("id")
        .single();
      funderId = (inserted?.id as string) ?? null;
    }
  }

  await client.from("grants").insert({
    slug,
    name,
    funder_id: funderId,
    status: "discovery",
    discovered_on: today,
    program_url: input.program_url?.trim() || null,
    hand_lead: "koH",
    markdown_path: grantMarkdownRelPath(slug),
    content_checksum: checksum,
    last_synced_at: new Date().toISOString(),
  });

  // Stamp the inbox item.
  await client
    .from("inbox_items")
    .update({
      status: "becomes_grant",
      resolved_slug: slug,
      resolution_notes: `Promoted to grant ${slug}`,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  revalidatePath("/inbox");
  revalidatePath("/grants");

  return { slug };
}

/* ─── Triage: becomes funder ──────────────────────────────────────────── */

export async function triageInboxToFunder(
  itemId: string,
  input: { name: string; funder_url?: string; notes?: string },
) {
  if (!configured()) throw new Error("Supabase env vars are not set");

  const name = input.name.trim();
  if (!name) throw new Error("Funder name is required");

  const client = adminClient();

  const baseSlug = kebabCase(name);
  if (!baseSlug) throw new Error("Could not generate a slug from that name");

  // Disambiguate against existing funder slugs.
  let slug = baseSlug;
  let n = 1;
  for (;;) {
    const { data } = await client
      .from("funders")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const { error: insertErr } = await client.from("funders").insert({
    slug,
    name,
    funder_url: input.funder_url?.trim() || null,
    mission_alignment_notes: input.notes?.trim() || null,
  });
  if (insertErr) {
    throw new Error(`Could not save funder: ${insertErr.message}`);
  }

  await client
    .from("inbox_items")
    .update({
      status: "becomes_funder",
      resolved_slug: slug,
      resolution_notes: `Promoted to funder ${slug}`,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  revalidatePath("/inbox");
  revalidatePath("/funders");

  return { slug };
}

/* ─── Triage: discard ─────────────────────────────────────────────────── */

export async function discardInboxItem(itemId: string, reason: string) {
  if (!configured()) throw new Error("Supabase env vars are not set");

  const note = reason.trim();
  if (!note) throw new Error("Add a one-line reason before discarding");

  const client = adminClient();
  const { error } = await client
    .from("inbox_items")
    .update({
      status: "discarded",
      resolution_notes: note,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) throw new Error(`Could not discard: ${error.message}`);

  revalidatePath("/inbox");
}

/* ─── Reopen (return a triaged item to the queue) ─────────────────────── */

export async function reopenInboxItem(itemId: string) {
  if (!configured()) throw new Error("Supabase env vars are not set");
  const client = adminClient();
  const { error } = await client
    .from("inbox_items")
    .update({
      status: "needs_triage",
      resolution_notes: null,
      resolved_slug: null,
      resolved_at: null,
    })
    .eq("id", itemId);
  if (error) throw new Error(`Could not reopen: ${error.message}`);
  revalidatePath("/inbox");
}
