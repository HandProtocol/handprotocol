import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { listBizLeads } from "@/lib/develop/queries";
import { BizKanban } from "@/components/develop/biz-kanban";

/*
  Business-development pipeline. The "Develop" pillar (the D in H-A-N-D).
  Local businesses with no website but strong Google reviews. The operator
  qualifies them, pastes their reviews, generates a free demo site, and works
  the lead through to a closed deal. 33% minimum of revenue routes to the pool.
*/

export const dynamic = "force-dynamic";

export default async function DevelopPage() {
  const leads = await listBizLeads();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">
            <span className="amber">D</span> · DEVELOP · EARNED REVENUE
          </p>
          <h1 className="text-2xl font-medium tracking-tight">
            Business development
          </h1>
          <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
            Local businesses with no website but a wall of happy Google reviews.
            Paste their reviews, generate a free demo site from them, work the
            lead. A third of every closed deal funds the pool.
          </p>
        </div>
        <Link
          href="/develop/new"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-3 py-2 text-sm font-medium text-[#1a1208] hover:bg-[var(--amber-soft)] hover:shadow-[0_0_14px_var(--amber-glow)] transition-all"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New lead
        </Link>
      </header>

      {!configured && (
        <div className="panel border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-4">
          <p className="eyebrow text-[var(--amber-soft)]">CONFIG · PENDING</p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Supabase env vars are not set, so the pipeline is empty in the
            preview. Apply migrations from{" "}
            <code className="font-mono text-xs">
              command/supabase/migrations/README.md
            </code>
            , including{" "}
            <code className="font-mono text-xs">016_biz_leads.sql</code>.
          </p>
        </div>
      )}

      {configured && leads.length === 0 && (
        <div className="panel p-6 text-center space-y-3">
          <Building2 className="mx-auto h-5 w-5 text-[var(--ink-faint)]" />
          <p className="eyebrow">PIPELINE · EMPTY</p>
          <p className="text-sm text-[var(--ink-dim)] max-w-md mx-auto">
            No leads yet. Find a business on Google Maps with no website and
            strong reviews, then add it.
          </p>
          <Link
            href="/develop/new"
            className="inline-flex items-center gap-2 text-sm text-[var(--amber-soft)] hover:text-[var(--amber)]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add the first lead
          </Link>
        </div>
      )}

      {leads.length > 0 && <BizKanban leads={leads} />}
    </div>
  );
}
