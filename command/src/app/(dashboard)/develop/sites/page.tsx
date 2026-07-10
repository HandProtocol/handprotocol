import { Globe } from "lucide-react";
import { listLiveSites, listVisitCounts } from "@/lib/develop/queries";
import { DevelopNav } from "@/components/develop/develop-nav";
import { SitesTable } from "@/components/develop/sites-table";

/*
  Live owned-sites registry. A lead earns a row here the moment it has a
  live_domain.
*/

export const dynamic = "force-dynamic";

export default async function DevelopSitesPage() {
  const [sites, visitCounts] = await Promise.all([
    listLiveSites(),
    listVisitCounts(),
  ]);

  const totalVisits = sites.reduce(
    (sum, lead) => sum + (visitCounts[lead.slug] ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="display-eyebrow">
          <span className="amber">Projects</span> with production sites
        </p>
        <h1 className="text-2xl font-medium tracking-tight">Live sites</h1>
        <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
          Projects that moved beyond a generated demo into an owned production
          site.
        </p>
      </header>

      <DevelopNav />

      {sites.length === 0 ? (
        <div className="panel p-6 text-center space-y-3">
          <Globe className="mx-auto h-5 w-5 text-[var(--ink-faint)]" />
          <p className="display-eyebrow">No live sites yet</p>
          <p className="text-sm text-[var(--ink-dim)] max-w-md mx-auto">
            A project appears here once a lead graduates to its own owned
            domain.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <div className="space-y-1">
              <p className="display-eyebrow">
                <span className="amber">{sites.length}</span> LIVE{" "}
                {sites.length === 1 ? "SITE" : "SITES"}
              </p>
              <p className="display-stat text-2xl">{sites.length}</p>
            </div>
            <div className="space-y-1">
              <p className="display-eyebrow">
                <span className="amber">{totalVisits}</span> TOTAL{" "}
                {totalVisits === 1 ? "VISIT" : "VISITS"}
              </p>
              <p className="display-stat text-2xl">{totalVisits}</p>
            </div>
          </div>

          <SitesTable sites={sites} visitCounts={visitCounts} />
        </>
      )}
    </div>
  );
}
