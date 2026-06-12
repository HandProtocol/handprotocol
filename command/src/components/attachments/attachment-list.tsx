import { Paperclip } from "lucide-react";
import { AttachmentRow } from "./attachment-row";
import type { AttachmentWithUrl } from "@/lib/attachments/types";

/*
  The list of attachments for a grant. Server component, hands rows to
  the client `AttachmentRow` for the delete/open controls.

  Empty state follows the DESIGN.md template:
  one-line statement, one-line how-to, call-to-action.
*/

export function AttachmentList({
  slug,
  attachments,
}: {
  slug: string;
  attachments: AttachmentWithUrl[];
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <p className="eyebrow flex items-center gap-1.5">
          <Paperclip className="h-3 w-3" aria-hidden />
          ATTACHMENTS
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          {attachments.length}{" "}
          {attachments.length === 1 ? "FILE" : "FILES"}
        </span>
      </header>

      {attachments.length === 0 ? (
        <div className="panel px-4 py-6 text-center">
          <p className="text-sm text-[var(--ink)]">
            No attachments yet.
          </p>
          <p className="mt-1 text-xs text-[var(--ink-dim)]">
            Drop a file in the zone above to add the first one.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <AttachmentRow key={a.id} slug={slug} attachment={a} />
          ))}
        </ul>
      )}
    </section>
  );
}
