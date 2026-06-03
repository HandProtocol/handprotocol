/*
  HAND Command Center, attachment queries.
  Server-only. Reads the metadata rows from command.attachments and
  mints signed URLs for the Storage objects (24h expiry).
*/
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "./types";
import type { AttachmentRow, AttachmentWithUrl } from "./types";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24 hours

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

async function findGrantId(slug: string): Promise<string | null> {
  if (!configured()) return null;
  const client = adminClient();
  const { data } = await client
    .from("grants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

// List attachments for a grant slug. Each row gets a signed URL valid
// for 24h. If Supabase is unreachable, returns an empty list and lets
// the caller render the empty state.
export async function listAttachmentsForGrant(
  slug: string,
): Promise<AttachmentWithUrl[]> {
  if (!configured()) return [];
  const client = adminClient();

  const grantId = await findGrantId(slug);
  if (!grantId) return [];

  const { data, error } = await client
    .from("attachments")
    .select(
      "id, grant_id, funder_id, storage_path, filename, mime_type, byte_size, uploaded_by, uploaded_at",
    )
    .eq("grant_id", grantId)
    .order("uploaded_at", { ascending: false });
  if (error || !data) return [];

  const rows = data as AttachmentRow[];
  const withUrls: AttachmentWithUrl[] = await Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await client.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
      return { ...row, signed_url: signed?.signedUrl ?? null };
    }),
  );
  return withUrls;
}

// List storage paths only. Used by the submission-archive snapshot.
export async function listAttachmentPathsForGrant(
  slug: string,
): Promise<AttachmentRow[]> {
  if (!configured()) return [];
  const client = adminClient();

  const grantId = await findGrantId(slug);
  if (!grantId) return [];

  const { data, error } = await client
    .from("attachments")
    .select(
      "id, grant_id, funder_id, storage_path, filename, mime_type, byte_size, uploaded_by, uploaded_at",
    )
    .eq("grant_id", grantId);
  if (error || !data) return [];
  return data as AttachmentRow[];
}

export async function getGrantIdBySlug(slug: string): Promise<string | null> {
  return findGrantId(slug);
}
