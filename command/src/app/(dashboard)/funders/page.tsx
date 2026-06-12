import Link from "next/link";
import { ArrowRight, Building2, ExternalLink } from "lucide-react";
import { listFunders, listGrants } from "@/lib/grants/queries";
import { FitScoreChip } from "@/components/kanban/fit-score-chip";

/*
  Funder library. PRD section 7.3 N1 (Nurture pillar).

  Curated funders from command.funders, each card carrying the type,
  fit-score, geography + focus tags, and a live count of grants attached
  to that funder. Cards link to /funders/<slug> for the touchpoint log
  and the relationship view. Relationships outlive single grants.
*/

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  foundation: "Foundation",
  government: "Government",
  corporate: "Corporate",
  community: "Community",
  individual: "Individual",
  dao: "DAO",
  program: "Program",
};

export default async function FundersPage() {
  const [funders, grants] = await Promise.all([listFunders(), listGrants()]);
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Count grants per funder for the relationship signal on each card.
  const grantCounts = new Map<string, number>();
  for (const g of grants) {
    if (!g.funder_id) continue;
    grantCounts.set(g.funder_id, (grantCounts.get(g.funder_id) ?? 0) + 1);
  }

  // High-fit funders surface first, then alphabetical (listFunders already
  // sorts by name, so a stable sort by fit preserves that within tiers).
  const sorted = [...funders].sort(
    (a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0),
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">
            <span className="amber">N</span> · NURTURE · RELATIONSHIPS &amp; VOICE
          </p>
          <h1 className="text-2xl font-medium tracking-tight">Funder library</h1>
          <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
            The curated list of who funds the work. Touchpoints tie to the
            funder, not the grant, so the relationship history carries across
            every application. Highest-fit funders sit up top.
          </p>
        </div>
        <Link
          href="/grants/new"
          className="inline-flex items-center gap-2 rounded-md border border-[rgba(245,239,225,0.12)] px-3 py-2 text-sm text-[var(--ink-dim)] hover:border-[rgba(217,119,6,0.35)] hover:text-[var(--ink)] transition-colors"
        >
          New grant
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>

      {!configured && (
        <div className="panel border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-4">
          <p className="eyebrow text-[var(--amber-soft)]">CONFIG · PENDING</p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Supabase env vars are not set, so the library is empty in the
            preview. Funders are curated directly in{" "}
            <code className="font-mono text-xs">command.funders</code>, or
            auto-created the first time a grant names them on{" "}
            <code className="font-mono text-xs">/grants/new</code>.
          </p>
        </div>
      )}

      {configured && sorted.length === 0 && (
        <div className="panel p-6 text-center space-y-3">
          <Building2 className="mx-auto h-5 w-5 text-[var(--ink-faint)]" />
          <p className="eyebrow">LIBRARY · EMPTY</p>
          <p className="text-sm text-[var(--ink-dim)] max-w-md mx-auto">
            No funders yet. They populate as you scaffold grants, or curate
            them directly in the funders table.
          </p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((f) => {
            const count = grantCounts.get(f.id) ?? 0;
            const tags = [
              ...(f.focus_areas ?? []).slice(0, 3),
              ...(f.geography ?? []).slice(0, 2),
            ];
            return (
              <Link
                key={f.id}
                href={`/funders/${f.slug}`}
                className="panel group flex flex-col gap-3 p-5 transition-colors hover:border-[rgba(217,119,6,0.3)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-medium tracking-tight text-[var(--ink)] group-hover:text-[var(--amber-soft)] transition-colors">
                      {f.name}
                    </h2>
                    {f.type && (
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                        {TYPE_LABEL[f.type] ?? f.type}
                      </p>
                    )}
                  </div>
                  <FitScoreChip score={f.fit_score} className="shrink-0" />
                </div>

                {f.mission_alignment_notes && (
                  <p className="line-clamp-3 text-sm leading-relaxed text-[var(--ink-dim)]">
                    {f.mission_alignment_notes}
                  </p>
                )}

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-[rgba(245,239,225,0.1)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-dim)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-[rgba(245,239,225,0.06)] pt-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                    {count === 0
                      ? "NO GRANTS YET"
                      : `${count} GRANT${count === 1 ? "" : "S"}`}
                  </span>
                  {f.annual_cycle && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                      {f.annual_cycle}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
