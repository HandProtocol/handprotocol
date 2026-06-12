import { Layers, Target } from "lucide-react";
import { listCampaignsWithRollups } from "@/lib/develop/queries";
import { DevelopNav } from "@/components/develop/develop-nav";
import { CampaignForm } from "@/components/develop/campaign-form";

/*
  Campaigns index. A campaign is the batch a set of leads is worked in. This
  page is the create form plus a roster of campaigns with lead/closed/live
  rollups. Assignment happens on each lead's detail page.
*/

export const dynamic = "force-dynamic";

export default async function DevelopCampaignsPage() {
  const campaigns = await listCampaignsWithRollups();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">
          <span className="amber">D</span> · DEVELOP · CAMPAIGNS
        </p>
        <h1 className="text-2xl font-medium tracking-tight">Campaigns</h1>
        <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
          Group leads into the batch you work them in: a neighborhood sweep, a
          vertical, a week of outreach. Set a goal, give it a color, then assign
          leads from their detail page.
        </p>
      </header>

      <DevelopNav />

      {!configured && (
        <div className="panel border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-4">
          <p className="eyebrow text-[var(--amber-soft)]">CONFIG · PENDING</p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Supabase env vars are not set, so campaigns cannot be created or
            listed in the preview.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[24rem_1fr] items-start">
        <CampaignForm />

        <section className="space-y-3">
          <p className="display-eyebrow">
            ROSTER · <span className="amber">{campaigns.length}</span>
          </p>
          {campaigns.length === 0 ? (
            <div className="panel p-6 text-center space-y-3">
              <Layers className="mx-auto h-5 w-5 text-[var(--ink-faint)]" />
              <p className="eyebrow">CAMPAIGNS · EMPTY</p>
              <p className="text-sm text-[var(--ink-dim)] max-w-md mx-auto">
                No campaigns yet. Create one on the left, then assign leads to
                it from the board or a lead's detail page.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {campaigns.map((c) => (
                <li key={c.id} className="panel p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        aria-hidden
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: c.color ?? "var(--ink-faint)",
                        }}
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium leading-snug text-[var(--ink)] truncate">
                          {c.name}
                        </h3>
                        {c.region && (
                          <p className="text-xs text-[var(--ink-dim)] truncate">
                            {c.region}
                          </p>
                        )}
                      </div>
                    </div>
                    {c.archived && (
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                        Archived
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                    <span>
                      <span className="text-[var(--ink-dim)]">
                        {c.lead_count ?? 0}
                      </span>{" "}
                      leads
                    </span>
                    <span>
                      <span className="text-[#86efac]">
                        {c.closed_count ?? 0}
                      </span>{" "}
                      closed
                    </span>
                    <span>
                      <span className="text-[#86efac]">
                        {c.live_count ?? 0}
                      </span>{" "}
                      live
                    </span>
                    {c.goal != null && (
                      <span className="inline-flex items-center gap-1 text-[var(--amber-soft)]">
                        <Target className="h-3 w-3" aria-hidden />
                        {c.goal} goal
                      </span>
                    )}
                  </div>

                  {c.notes && (
                    <p className="text-xs text-[var(--ink-dim)] line-clamp-2">
                      {c.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
