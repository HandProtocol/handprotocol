import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { listGrants } from "@/lib/grants/queries";
import { KanbanBoard } from "@/components/kanban/kanban-board";

/*
  Pipeline kanban. PRD section 7.1 H1.
  Renders the six-column kanban from Supabase. Drag-to-transition writes
  the markdown frontmatter first, then upserts Supabase. The grant cards
  link to /grants/<slug> for the detail view.
*/

export const dynamic = "force-dynamic";

export default async function GrantsPage() {
  const grants = await listGrants();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">
            <span className="amber">H</span> · HOLISTIC · ONE SOURCE OF TRUTH
          </p>
          <h1 className="text-2xl font-medium tracking-tight">Grant pipeline</h1>
          <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
            Markdown is canonical. Drag a card to change status, the
            frontmatter and Supabase row stay in sync. Sort by deadline or by
            fit score.
          </p>
        </div>
        <Link
          href="/grants/new"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-3 py-2 text-sm font-medium text-[#1a1208] hover:bg-[var(--amber-soft)] hover:shadow-[0_0_14px_var(--amber-glow)] transition-all"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New grant
        </Link>
      </header>

      {!configured && (
        <div className="panel border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-4">
          <p className="eyebrow text-[var(--amber-soft)]">CONFIG · PENDING</p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Supabase env vars are not set, so the pipeline is empty in the
            preview. Apply migrations from <code className="font-mono text-xs">command/supabase/migrations/README.md</code>,
            then run <code className="font-mono text-xs">npm run ingest:grants</code> to load every
            file under <code className="font-mono text-xs">funding/grants/*.md</code>.
          </p>
        </div>
      )}

      {configured && grants.length === 0 && (
        <div className="panel p-6 text-center space-y-3">
          <RefreshCw className="mx-auto h-5 w-5 text-[var(--ink-faint)]" />
          <p className="eyebrow">PIPELINE · EMPTY</p>
          <p className="text-sm text-[var(--ink-dim)] max-w-md mx-auto">
            No grants in the read replica yet. Run the ingest to populate
            from the canonical markdown files.
          </p>
          <code className="inline-block font-mono text-xs text-[var(--amber-soft)] bg-[rgba(217,119,6,0.08)] border border-[rgba(217,119,6,0.3)] px-2 py-1 rounded">
            npm run ingest:grants
          </code>
        </div>
      )}

      {grants.length > 0 && <KanbanBoard grants={grants} />}
    </div>
  );
}
