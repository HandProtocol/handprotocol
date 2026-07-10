import { MapPin, MapPinOff } from "lucide-react";
import { listBizLeads } from "@/lib/develop/queries";
import { DevelopNav } from "@/components/develop/develop-nav";
import { LeadsMap } from "@/components/develop/leads-map";

/*
  Projects map lens. The same pipeline as the board, plotted by
  location. Only leads with both lat and lng get a pin; the page is honest
  about coverage by counting the ones that don't. MapLibre runs token-free on
  the CARTO dark basemap, so there's no API-key dependency to manage.
*/

export const dynamic = "force-dynamic";

export default async function DevelopMapPage() {
  const leads = await listBizLeads();
  const pinned = leads.filter((l) => l.lat != null && l.lng != null);
  const unpinned = leads.length - pinned.length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="display-eyebrow">
          <span className="amber">Projects</span> by location
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          Outreach map
        </h1>
        <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
          Every outreach lead with a known location, plotted on a token-free
          basemap. Color reads the pipeline status; live owned sites carry a brighter
          ring. Click a pin for the business and a jump into its lead.
        </p>
      </header>

      <DevelopNav />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-dim)]">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-[var(--amber-soft)]" aria-hidden />
          {pinned.length} {pinned.length === 1 ? "lead" : "leads"} pinned
        </span>
        {unpinned > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[var(--ink-faint)]">
            <MapPinOff className="h-3.5 w-3.5" aria-hidden />
            {unpinned} without coordinates (not shown)
          </span>
        )}
      </div>

      {pinned.length === 0 ? (
        <div className="panel p-6 text-center space-y-3">
          <MapPinOff className="mx-auto h-5 w-5 text-[var(--ink-faint)]" aria-hidden />
          <p className="display-eyebrow">No mapped projects yet</p>
          <p className="text-sm text-[var(--ink-dim)] max-w-md mx-auto">
            {leads.length === 0
              ? "No leads yet. Add one from the board and set its location to see it here."
              : `${leads.length} ${
                  leads.length === 1 ? "lead has" : "leads have"
                } no coordinates yet, so there is nothing to plot. Add lat and lng to a lead's frontmatter to drop a pin.`}
          </p>
        </div>
      ) : (
        <LeadsMap leads={pinned} />
      )}
    </div>
  );
}
