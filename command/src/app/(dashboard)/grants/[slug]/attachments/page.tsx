import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { readGrantFromDisk } from "@/lib/grants/file-read";
import { listAttachmentsForGrant } from "@/lib/attachments/queries";
import { UploadZone } from "@/components/attachments/upload-zone";
import { AttachmentList } from "@/components/attachments/attachment-list";

/*
  Attachment vault for a single grant. PRD H6.

  Reads the grant markdown to validate the slug (so a missing file
  shows the 404 path that matches the detail view), then lists the
  attachment rows from Supabase with signed URLs. The upload zone is
  always present, even when the grant has no rows in Supabase yet.
*/

export const dynamic = "force-dynamic";

export default async function AttachmentVaultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const file = readGrantFromDisk(slug);
  if (!file.exists) notFound();

  const attachments = await listAttachmentsForGrant(slug);
  const grantName = String(file.frontmatter.name ?? slug);
  const funderName = file.frontmatter.funder ?? "Unknown funder";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/grants/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to grant
        </Link>
        <p className="eyebrow">
          VAULT · <span className="amber">ATTACHMENTS</span>
        </p>
      </div>

      <header className="space-y-2">
        <p className="eyebrow">{funderName}</p>
        <h1 className="text-2xl md:text-3xl font-medium tracking-tight">
          {grantName}
        </h1>
        <p className="text-sm text-[var(--ink-dim)]">
          Files attached to this grant. PDFs, screenshots, supporting
          documents, award letters. Stored in Supabase, signed URLs
          expire after 24 hours.
        </p>
      </header>

      <UploadZone slug={slug} />
      <AttachmentList slug={slug} attachments={attachments} />

      <aside className="panel p-4">
        <p className="eyebrow">FILE · CANONICAL</p>
        <code className="mt-2 block font-mono text-[11px] text-[var(--ink-dim)] break-all">
          funding/grants/{slug}.md
        </code>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          STORAGE · command-attachments/{slug}/
        </p>
      </aside>
    </div>
  );
}
