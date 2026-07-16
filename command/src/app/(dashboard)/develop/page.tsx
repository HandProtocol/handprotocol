import Link from "next/link";
import { Plus, Building2, ScrollText, Globe, UsersRound } from "lucide-react";
import {
  listBizLeads,
  listCampaigns,
  listVisitCounts,
} from "@/lib/develop/queries";
import { BizBoard } from "@/components/develop/biz-board";
import { DevelopNav } from "@/components/develop/develop-nav";

/*
  Projects pipeline. Local-business outreach is the first populated lane, but
  this area is the umbrella for project work across HAND.
*/

export const dynamic = "force-dynamic";

export default async function DevelopPage() {
  const [leads, campaigns, visitCounts] = await Promise.all([
    listBizLeads(),
    listCampaigns(),
    listVisitCounts(),
  ]);
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="display-eyebrow">
            <span className="amber">Projects</span> across HAND
          </p>
          <h1 className="text-2xl font-medium tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
            The active project desk starts with local-business outreach,
            generated demos, and live sites. Reciprocate group work belongs here
            too as soon as those projects get their own table.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/projects/scripts"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[rgba(245,239,225,0.12)] px-3 py-2 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[rgba(217,119,6,0.35)] transition-colors sm:w-auto"
          >
            <ScrollText className="h-3.5 w-3.5" aria-hidden />
            Cold scripts
          </Link>
          <Link
            href="/projects/new"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--amber)] px-3 py-2 text-sm font-medium text-[#1a1208] hover:bg-[var(--amber-soft)] hover:shadow-[0_0_14px_var(--amber-glow)] transition-all sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New outreach lead
          </Link>
        </div>
      </header>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Project lanes"
      >
        <div className="panel p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--amber-soft)]" aria-hidden />
            <p className="display-eyebrow">Local outreach</p>
          </div>
          <p className="mt-3 text-2xl font-medium">{leads.length}</p>
          <p className="mt-1 text-xs text-[var(--ink-dim)]">
            Businesses, demos, pitch visits, and follow-up.
          </p>
        </div>
        <Link
          href="/reciprocates"
          className="panel p-4 transition-colors hover:border-[rgba(217,119,6,0.35)] hover:bg-[rgba(217,119,6,0.04)]"
        >
          <div className="flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-[var(--amber-soft)]" aria-hidden />
            <p className="display-eyebrow">Reciprocate work</p>
          </div>
          <p className="mt-3 text-sm text-[var(--ink)]">
            Group-level grants, scoped accounts, invites, and pending requests.
          </p>
          <p className="mt-2 text-xs text-[var(--amber-soft)]">
            Open Reciprocates
          </p>
        </Link>
        <Link
          href="/projects/sites"
          className="panel p-4 transition-colors hover:border-[rgba(217,119,6,0.35)] hover:bg-[rgba(217,119,6,0.04)]"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--amber-soft)]" aria-hidden />
            <p className="display-eyebrow">Live sites</p>
          </div>
          <p className="mt-3 text-sm text-[var(--ink)]">
            Production sites that have moved beyond a generated demo.
          </p>
          <p className="mt-2 text-xs text-[var(--amber-soft)]">
            Open registry
          </p>
        </Link>
      </section>

      <DevelopNav />

      {!configured && (
        <div className="panel border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-4">
          <p className="display-eyebrow text-[var(--amber-soft)]">
            Configuration pending
          </p>
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
          <p className="display-eyebrow">No outreach leads yet</p>
          <p className="text-sm text-[var(--ink-dim)] max-w-md mx-auto">
            Find a business on Google Maps with no website and strong reviews,
            then add it as the first local outreach project.
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 text-sm text-[var(--amber-soft)] hover:text-[var(--amber)]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add the first outreach lead
          </Link>
        </div>
      )}

      {leads.length > 0 && (
        <BizBoard
          leads={leads}
          campaigns={campaigns}
          visitCounts={visitCounts}
        />
      )}
    </div>
  );
}
