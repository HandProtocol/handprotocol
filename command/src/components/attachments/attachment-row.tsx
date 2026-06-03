"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteAttachment } from "@/lib/attachments/actions";
import { formatBytes } from "@/lib/attachments/types";
import type { AttachmentWithUrl } from "@/lib/attachments/types";

/*
  One row in the attachment list. Renders filename, mime, byte size,
  uploaded_at, an Open link (signed URL) and a Delete control.

  Delete is a two-step: first click arms the button, second click runs
  the action. No modal needed for this surface.
*/

export function AttachmentRow({
  slug,
  attachment,
}: {
  slug: string;
  attachment: AttachmentWithUrl;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!armed) {
      setArmed(true);
      // Disarm after 4 seconds if the operator does not confirm.
      window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    startTransition(async () => {
      try {
        await deleteAttachment(slug, attachment.id);
        toast.success(`Deleted ${attachment.filename}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setArmed(false);
      }
    });
  }

  const uploadedAt = new Date(attachment.uploaded_at);
  const dateLabel = uploadedAt.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="panel flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--ink)]">
          {attachment.filename}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          <span>{attachment.mime_type || "UNKNOWN TYPE"}</span>
          <span aria-hidden>·</span>
          <span>{formatBytes(attachment.byte_size)}</span>
          <span aria-hidden>·</span>
          <span>{dateLabel}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {attachment.signed_url ? (
          <a
            href={attachment.signed_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-[rgba(217,119,6,0.45)] px-2.5 py-1 text-xs text-[var(--amber-soft)] hover:bg-[rgba(217,119,6,0.08)]"
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            Open
          </a>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            NO SIGNED URL
          </span>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
            armed
              ? "border-[rgba(220,38,38,0.6)] bg-[rgba(220,38,38,0.1)] text-[#fda4a4]"
              : "border-[rgba(220,38,38,0.5)] text-[#fda4a4] hover:bg-[rgba(220,38,38,0.08)]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
          aria-label={armed ? "Confirm delete" : "Delete"}
        >
          <Trash2 className="h-3 w-3" aria-hidden />
          {pending ? "Deleting" : armed ? "Confirm" : "Delete"}
        </button>
      </div>
    </li>
  );
}
