/*
  HAND Command Center, submission archive.

  When a grant status flips to `submitted`, snapshot the current state
  so the record of what was sent stays exact:

  1. Copy the canonical markdown to
     funding/grants/_submissions/<slug>-<YYYYMMDD-HHmm>/grant.md
  2. Copy every attachment from Supabase Storage into the same
     archive directory, under attachments/.
  3. Write a metadata.json next to them with the timestamp, content
     checksum, and attachment count.
  4. Append a row to command.activity_log with
     action = 'submitted_archive' and metadata pointing at the archive.

  Returns the archive directory path (relative to the repo root) so the
  caller can surface it in the toast or the audit timeline.

  The snapshot runs server-side. It uses the same atomic-write pattern
  as the markdown layer so a process crash during snapshot never leaves
  a half-written grant.md.
*/
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { grantMarkdownPath, grantsDir } from "./paths";
import { readGrantFile, writeGrantFileAtomic } from "./markdown";
import { BUCKET } from "@/lib/attachments/types";
import {
  getGrantIdBySlug,
  listAttachmentPathsForGrant,
} from "@/lib/attachments/queries";

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

// Produce a YYYYMMDD-HHmm timestamp in UTC. Stable, sortable, no
// locale surprises in the directory listing.
function timestamp(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  return `${y}${m}${d}-${hh}${mm}`;
}

// Make a safe-on-disk filename. Keeps extension, strips path separators.
function safeFilename(name: string): string {
  const cleaned = name.replace(/[\\/]+/g, "_").replace(/\s+/g, "_");
  return cleaned.replace(/[^A-Za-z0-9._-]/g, "") || "file";
}

// Write a binary file atomically (temp + rename, same dir).
async function writeBinaryAtomic(filePath: string, bytes: Buffer): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  const fd = await fs.promises.open(tmp, "w");
  try {
    await fd.writeFile(bytes);
    await fd.sync();
  } finally {
    await fd.close();
  }
  await fs.promises.rename(tmp, filePath);
}

export type SnapshotResult = {
  archive_path: string;
  attachment_count: number;
  content_checksum: string;
};

export async function snapshotForSubmission(
  slug: string,
): Promise<SnapshotResult> {
  // Read the canonical markdown. If the file does not exist, abort
  // before touching disk or Supabase.
  const grantPath = grantMarkdownPath(slug);
  if (!fs.existsSync(grantPath)) {
    throw new Error(
      `Snapshot aborted: markdown file not found at ${grantPath}`,
    );
  }
  const { raw, checksum } = readGrantFile(grantPath);

  // Build the archive directory under funding/grants/_submissions/.
  const stamp = timestamp();
  const archiveDirName = `${slug}-${stamp}`;
  const archiveDir = path.join(grantsDir(), "_submissions", archiveDirName);
  await fs.promises.mkdir(archiveDir, { recursive: true });
  const attachmentsDir = path.join(archiveDir, "attachments");
  await fs.promises.mkdir(attachmentsDir, { recursive: true });

  // Copy the markdown to grant.md inside the archive directory.
  const archiveGrantPath = path.join(archiveDir, "grant.md");
  await writeGrantFileAtomic(archiveGrantPath, raw);

  // Pull every attachment from Supabase Storage. Best effort: if a
  // download fails for one file, we record the error in metadata but
  // continue so the operator still gets the markdown snapshot.
  const attachmentRows = await listAttachmentPathsForGrant(slug);
  const copied: Array<{
    filename: string;
    storage_path: string;
    byte_size: number;
    sha256: string;
  }> = [];
  const failed: Array<{ filename: string; storage_path: string; error: string }> = [];

  if (attachmentRows.length > 0 && configured()) {
    const client = adminClient();
    for (const row of attachmentRows) {
      try {
        const { data, error } = await client.storage
          .from(BUCKET)
          .download(row.storage_path);
        if (error || !data) {
          failed.push({
            filename: row.filename,
            storage_path: row.storage_path,
            error: error?.message ?? "no data returned",
          });
          continue;
        }
        const arrayBuffer = await data.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        const cleanName = safeFilename(row.filename);
        // Prefix with the attachment id so duplicate filenames do not
        // collide inside the archive directory.
        const localName = `${row.id.slice(0, 8)}-${cleanName}`;
        const localPath = path.join(attachmentsDir, localName);
        await writeBinaryAtomic(localPath, buf);
        copied.push({
          filename: row.filename,
          storage_path: row.storage_path,
          byte_size: buf.byteLength,
          sha256: crypto.createHash("sha256").update(buf).digest("hex"),
        });
      } catch (err) {
        failed.push({
          filename: row.filename,
          storage_path: row.storage_path,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Write metadata.json next to the markdown.
  const metadata = {
    slug,
    snapshotted_at: new Date().toISOString(),
    timestamp_utc: stamp,
    content_checksum: checksum,
    attachment_count: copied.length,
    attachments: copied,
    attachments_failed: failed,
  };
  const metadataPath = path.join(archiveDir, "metadata.json");
  const metadataContent = JSON.stringify(metadata, null, 2) + "\n";
  await writeGrantFileAtomic(metadataPath, metadataContent);

  // Log to activity_log. Best effort; the snapshot is the load-bearing
  // artifact, the log is the breadcrumb.
  if (configured()) {
    try {
      const grantId = await getGrantIdBySlug(slug);
      if (grantId) {
        const client = adminClient();
        await client.rpc("log_activity", {
          p_actor_id: null,
          p_entity_type: "grant",
          p_entity_id: grantId,
          p_action: "submitted_archive",
          p_before: null,
          p_after: null,
          p_metadata: {
            archive_path: `funding/grants/_submissions/${archiveDirName}`,
            content_checksum: checksum,
            attachment_count: copied.length,
            attachments_failed: failed.length,
          },
        });
      }
    } catch {
      // Snapshot artifacts are already on disk. A logging failure is
      // not a reason to abort the status flip.
    }
  }

  const relPath = `funding/grants/_submissions/${archiveDirName}`;
  return {
    archive_path: relPath,
    attachment_count: copied.length,
    content_checksum: checksum,
  };
}
