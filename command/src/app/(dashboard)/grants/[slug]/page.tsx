import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getGrantBySlug } from "@/lib/grants/queries";
import { readGrantFromDisk } from "@/lib/grants/file-read";
import { getGrantActivity } from "@/lib/grants/activity";
import { FrontmatterForm } from "@/components/grants/frontmatter-form";
import { SectionEditor } from "@/components/grants/section-editor";
import { ActivityPanel } from "@/components/grants/activity-panel";
import { RfpButton } from "@/components/grants/rfp-modal";
import { StatusChip } from "@/components/kanban/status-chip";
import { FitScoreChip } from "@/components/kanban/fit-score-chip";
import { DeadlineChip } from "@/components/kanban/deadline-chip";
import type { GrantRecord, GrantStatus } from "@/lib/grants/types";

/*
  Grant detail view. PRD section 7.1 H2.

  Markdown is canonical. The page reads the file directly so the view
  works even when Supabase is unreachable (preview mode). When Supabase
  has the row, we enrich with the funder name and the activity feed.

  Phase 2 adds the Paste RFP button at the top right. The button opens
  a modal that posts the pasted RFP to /api/extract-checklist and writes
  the parsed requirements as a new section in the markdown.
*/

export const dynamic = "force-dynamic";

export default async function GrantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const file = readGrantFromDisk(slug);
  if (!file.exists) notFound();

  const supaRow = await getGrantBySlug(slug);

  // Synthesize a minimal record for the chrome when Supabase doesn't
  // have the row yet (e.g. before the operator has run the ingest).
  const grant: GrantRecord =
    supaRow ?? {
      id: `local-${slug}`,
      slug,
      name: String(file.frontmatter.name ?? slug),
      funder_id: null,
      status: ((file.frontmatter.status as GrantStatus) ?? "discovery"),
      award_type: file.frontmatter.award_type ?? null,
      award_size: file.frontmatter.award_size ?? null,
      amount_requested:
        file.frontmatter.amount_requested != null
          ? Number(file.frontmatter.amount_requested)
          : null,
      amount_awarded:
        file.frontmatter.amount_awarded != null
          ? Number(file.frontmatter.amount_awarded)
          : null,
      match_required: file.frontmatter.match_required ?? null,
      reporting: file.frontmatter.reporting ?? null,
      deadline:
        file.frontmatter.deadline && /^\d{4}-\d{2}-\d{2}$/.test(String(file.frontmatter.deadline))
          ? String(file.frontmatter.deadline)
          : null,
      discovered_on: (file.frontmatter.discovered_on as string) ?? null,
      submitted_on: (file.frontmatter.submitted_on as string) ?? null,
      decided_on: (file.frontmatter.decided_on as string) ?? null,
      reciprocate_group: file.frontmatter.reciprocate_group ?? null,
      fit_score:
        file.frontmatter.fit_score != null
          ? Number(file.frontmatter.fit_score)
          : null,
      hand_lead: file.frontmatter.hand_lead ?? null,
      contact: file.frontmatter.contact ?? null,
      funder_url: file.frontmatter.funder_url ?? null,
      program_url: file.frontmatter.program_url ?? null,
      application_url: file.frontmatter.application_url ?? null,
      kanban_position: 0,
      column_entered_at: new Date().toISOString(),
      markdown_path: `funding/grants/${slug}.md`,
      content_checksum: file.checksum,
      last_synced_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      funder_name: file.frontmatter.funder ?? null,
    };

  const activity = supaRow ? await getGrantActivity(grant) : [];

  return (
    <div className="space-y-6">
      {/* Eyebrow + breadcrumbs */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/grants"
          className="inline-flex items-center gap-2 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to pipeline
        </Link>
        <p className="eyebrow">
          STATE · <span className="amber">{grant.status.toUpperCase()}</span>
        </p>
      </div>

      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="eyebrow">
              {grant.funder_name ?? "Unknown funder"}
            </p>
            <h1 className="text-2xl md:text-3xl font-medium tracking-tight">
              {grant.name}
            </h1>
          </div>
          <RfpButton slug={slug} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={grant.status} size="md" />
          <FitScoreChip score={grant.fit_score} />
          <DeadlineChip deadline={grant.deadline} />
          {grant.reciprocate_group && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)] border border-[rgba(245,239,225,0.1)] rounded px-1.5 py-0.5">
              GROUP · {grant.reciprocate_group}
            </span>
          )}
          {grant.program_url && (
            <a
              href={grant.program_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)] hover:underline"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              PROGRAM URL
            </a>
          )}
        </div>
      </header>

      {!supaRow && (
        <div className="panel border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-4">
          <p className="eyebrow text-[var(--amber-soft)]">SYNC · PENDING</p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Reading from the canonical markdown file. The Supabase row is
            either missing or unreachable. Run <code className="font-mono text-xs">npm run ingest:grants</code>{" "}
            to sync.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          <FrontmatterForm slug={slug} initial={file.frontmatter} />
          <SectionEditor slug={slug} sections={file.sections} />
        </div>
        <div className="space-y-4">
          <ActivityPanel entries={activity} />

          <aside className="panel p-4 space-y-2">
            <p className="eyebrow">FILE · CANONICAL</p>
            <code className="block font-mono text-[11px] text-[var(--ink-dim)] break-all">
              funding/grants/{slug}.md
            </code>
            <p className="text-[10px] text-[var(--ink-faint)] font-mono uppercase tracking-[0.18em]">
              CHECKSUM · {file.checksum.slice(0, 12)}
            </p>
            {supaRow?.last_synced_at && (
              <p className="text-[10px] text-[var(--ink-faint)] font-mono uppercase tracking-[0.18em]">
                LAST SYNCED · {new Date(supaRow.last_synced_at).toLocaleString()}
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
