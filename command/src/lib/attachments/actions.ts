"use server";

/*
  HAND Command Center, attachment server actions.
  Upload and delete attachments via Supabase Storage. Metadata rows in
  command.attachments are inserted on upload, removed on delete.

  Both actions write an entry to command.activity_log so the timeline
  on the grant detail view picks them up.
*/
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  BUCKET,
  MAX_BYTES,
  validateFile,
  type AttachmentRow,
} from "./types";
import { getGrantIdBySlug } from "./queries";

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

// Normalize a filename for safe storage paths. Keeps the extension,
// strips path separators and exotic characters.
function safeFilename(name: string): string {
  const cleaned = name.replace(/[\\/]+/g, "_").replace(/\s+/g, "_");
  return cleaned.replace(/[^A-Za-z0-9._-]/g, "");
}

async function logActivity(
  grantId: string,
  action: string,
  metadata: Record<string, unknown>,
) {
  if (!configured()) return;
  const client = adminClient();
  // The schema is set to `command`, so RPC names are unqualified.
  try {
    await client.rpc("log_activity", {
      p_actor_id: null,
      p_entity_type: "grant",
      p_entity_id: grantId,
      p_action: action,
      p_before: null,
      p_after: null,
      p_metadata: metadata,
    });
  } catch {
    // Activity log is best-effort. Never block the user action on it.
  }
}

// ─── Upload ──────────────────────────────────────────────────────────────
// Called from the client with a FormData containing one or more files.
// Returns a summary so the UI can show per-file success/error.
export async function uploadAttachments(slug: string, formData: FormData) {
  if (!configured()) {
    throw new Error("Storage is not configured. Set Supabase env vars.");
  }
  const grantId = await getGrantIdBySlug(slug);
  if (!grantId) {
    throw new Error(
      `No Supabase row for ${slug}. Run npm run ingest:grants first.`,
    );
  }

  const client = adminClient();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    throw new Error("No files received.");
  }

  const results: Array<
    | { ok: true; row: AttachmentRow }
    | { ok: false; error: string; filename: string }
  > = [];

  for (const file of files) {
    const validationError = validateFile(file.name, file.size, file.type);
    if (validationError) {
      results.push({ ok: false, error: validationError, filename: file.name });
      continue;
    }

    // Defensive double-check on size.
    if (file.size > MAX_BYTES) {
      results.push({
        ok: false,
        error: `${file.name} is over 25MB.`,
        filename: file.name,
      });
      continue;
    }

    const cleanName = safeFilename(file.name) || "file";
    const id = randomUUID();
    const storagePath = `${slug}/${id}-${cleanName}`;

    const bytes = await file.arrayBuffer();

    const { error: upErr } = await client.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (upErr) {
      results.push({
        ok: false,
        error: upErr.message || "Upload failed.",
        filename: file.name,
      });
      continue;
    }

    const { data: inserted, error: insertErr } = await client
      .from("attachments")
      .insert({
        grant_id: grantId,
        storage_path: storagePath,
        filename: file.name,
        mime_type: file.type || null,
        byte_size: file.size,
      })
      .select(
        "id, grant_id, funder_id, storage_path, filename, mime_type, byte_size, uploaded_by, uploaded_at",
      )
      .single();

    if (insertErr || !inserted) {
      // Roll back the storage upload on metadata failure.
      await client.storage.from(BUCKET).remove([storagePath]);
      results.push({
        ok: false,
        error: insertErr?.message || "Metadata write failed.",
        filename: file.name,
      });
      continue;
    }

    const row = inserted as AttachmentRow;
    await logActivity(grantId, "attachment_uploaded", {
      filename: row.filename,
      byte_size: row.byte_size,
      storage_path: row.storage_path,
    });
    results.push({ ok: true, row });
  }

  revalidatePath(`/grants/${slug}/attachments`);
  revalidatePath(`/grants/${slug}`);
  return { results };
}

// ─── Delete ──────────────────────────────────────────────────────────────
export async function deleteAttachment(slug: string, attachmentId: string) {
  if (!configured()) {
    throw new Error("Storage is not configured.");
  }
  const client = adminClient();

  const { data: existing, error: findErr } = await client
    .from("attachments")
    .select(
      "id, grant_id, storage_path, filename, byte_size",
    )
    .eq("id", attachmentId)
    .maybeSingle();
  if (findErr || !existing) {
    throw new Error("Attachment not found.");
  }

  const row = existing as Pick<
    AttachmentRow,
    "id" | "grant_id" | "storage_path" | "filename" | "byte_size"
  >;

  // Remove from Storage first. If it fails, leave the row so the
  // operator can retry. If it succeeds, remove the row.
  const { error: rmErr } = await client.storage
    .from(BUCKET)
    .remove([row.storage_path]);
  if (rmErr) {
    throw new Error(`Storage delete failed: ${rmErr.message}`);
  }

  const { error: delErr } = await client
    .from("attachments")
    .delete()
    .eq("id", attachmentId);
  if (delErr) {
    throw new Error(`Metadata delete failed: ${delErr.message}`);
  }

  if (row.grant_id) {
    await logActivity(row.grant_id, "attachment_deleted", {
      filename: row.filename,
      storage_path: row.storage_path,
    });
  }

  revalidatePath(`/grants/${slug}/attachments`);
  revalidatePath(`/grants/${slug}`);
  return { ok: true };
}
