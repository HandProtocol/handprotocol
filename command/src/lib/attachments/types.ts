/*
  HAND Command Center, attachment types.
  Mirrors command.attachments (migration 007). Files live in the
  Supabase Storage bucket `command-attachments`, metadata lives here.
*/

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/markdown",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const ALLOWED_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "md",
  "markdown",
  "txt",
  "docx",
  "xlsx",
] as const;

export const MAX_BYTES = 25 * 1024 * 1024; // 25MB per file

export const BUCKET = "command-attachments";

export type AttachmentRow = {
  id: string;
  grant_id: string | null;
  funder_id: string | null;
  storage_path: string;
  filename: string;
  mime_type: string | null;
  byte_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type AttachmentWithUrl = AttachmentRow & {
  signed_url: string | null;
};

export type UploadResult =
  | { ok: true; row: AttachmentRow }
  | { ok: false; error: string; filename: string };

// Validate file metadata before reading any bytes. Returns null if OK,
// otherwise a friendly error string for the operator.
export function validateFile(
  filename: string,
  size: number,
  mimeType: string,
): string | null {
  if (size <= 0) {
    return `${filename} is empty.`;
  }
  if (size > MAX_BYTES) {
    return `${filename} is over 25MB. Split it or compress and try again.`;
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const mimeOk = (ALLOWED_MIME_TYPES as readonly string[]).includes(
    mimeType.toLowerCase(),
  );
  const extOk = (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
  if (!mimeOk && !extOk) {
    return `${filename} is not an allowed file type. Use PDF, images, markdown, plain text, docx, or xlsx.`;
  }
  return null;
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  const formatted = value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1);
  return `${formatted} ${units[i]}`;
}
