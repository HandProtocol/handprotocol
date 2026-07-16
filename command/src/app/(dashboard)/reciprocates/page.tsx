import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, UsersRound } from "lucide-react";
import { listReciprocateGroups } from "@/lib/reciprocates/queries";
import { StatusChip } from "@/components/kanban/status-chip";

export const dynamic = "force-dynamic";

function money(value: number): string {
  if (!value) return "$0";
  return `$${Math.round(value).toLocaleString()}`;
}

export default async function ReciprocatesPage() {
  const groups = await listReciprocateGroups();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const activeGroups = groups.filter(
    (group) =>
      group.activeGrantCount > 0 ||
      group.activeProfileCount > 0 ||
      group.pendingApplicationCount > 0,
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="display-eyebrow">
          <span className="amber">Reciprocates</span> in Command Center
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          Reciprocate groups
        </h1>
        <p className="max-w-2xl text-sm text-[var(--ink-dim)]">
          Groups are rolled up from grants, scoped profiles, invites, and access
          applications. This is the first-class area until a dedicated group
          table carries notes, stages, needs, and project ownership.
        </p>
      </header>

      {!configured && (
        <div className="panel border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-4">
          <p className="display-eyebrow text-[var(--amber-soft)]">
            Configuration pending
          </p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Supabase env vars are not set, so Reciprocate group rollups are
            empty in preview.
          </p>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4" aria-label="Group summary">
        <div className="panel p-5">
          <p className="display-eyebrow">Groups</p>
          <p className="mt-3 text-3xl font-medium">{groups.length}</p>
        </div>
        <div className="panel p-5">
          <p className="display-eyebrow">Active groups</p>
          <p className="mt-3 text-3xl font-medium">{activeGroups.length}</p>
        </div>
        <div className="panel p-5">
          <p className="display-eyebrow">Pending requests</p>
          <p className="mt-3 text-3xl font-medium">
            {groups.reduce((sum, group) => sum + group.pendingApplicationCount, 0)}
          </p>
        </div>
        <div className="panel p-5">
          <p className="display-eyebrow">Scoped accounts</p>
          <p className="mt-3 text-3xl font-medium">
            {groups.reduce((sum, group) => sum + group.activeProfileCount, 0)}
          </p>
        </div>
      </section>

      {groups.length === 0 ? (
        <div className="panel p-6 text-center">
          <UsersRound className="mx-auto h-5 w-5 text-[var(--ink-faint)]" />
          <p className="mt-3 display-eyebrow">No Reciprocate groups yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-dim)]">
            Add `reciprocate_group` to a grant, invite, profile, or access
            application to make the group visible here.
          </p>
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {groups.map((group) => (
            <article key={group.name} className="panel p-5">
              <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-medium tracking-tight">
                    {group.name}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--ink-dim)]">
                    {group.lastSignalAt
                      ? `Last signal ${formatDistanceToNow(
                          new Date(group.lastSignalAt),
                          { addSuffix: true },
                        )}`
                      : "No dated signal yet"}
                  </p>
                </div>
                <Link
                  href={`/grants?group=${encodeURIComponent(group.name)}`}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-[rgba(217,119,6,0.35)] px-3 py-2 text-xs text-[var(--amber-soft)] hover:bg-[rgba(217,119,6,0.08)] hover:no-underline sm:w-auto"
                >
                  Grants
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </header>

              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <dt className="display-eyebrow">Active grants</dt>
                  <dd className="mt-1 text-xl text-[var(--ink)]">
                    {group.activeGrantCount}
                  </dd>
                </div>
                <div>
                  <dt className="display-eyebrow">Requested</dt>
                  <dd className="mt-1 text-xl text-[var(--ink)]">
                    {money(group.requestedTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="display-eyebrow">Awarded</dt>
                  <dd className="mt-1 text-xl text-[#bef0d0]">
                    {money(group.awardedTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="display-eyebrow">Access</dt>
                  <dd className="mt-1 text-xl text-[var(--ink)]">
                    {group.activeProfileCount}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 border-t border-[rgba(245,239,225,0.06)] pt-4">
                <p className="display-eyebrow">Current grant work</p>
                {group.grants.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--ink-dim)]">
                    No grant rows are tagged to this group yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {group.grants.slice(0, 4).map((grant) => (
                      <li key={grant.id}>
                        <Link
                          href={`/grants/${grant.slug}`}
                          className="flex items-center justify-between gap-3 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-[rgba(217,119,6,0.25)] hover:bg-[rgba(217,119,6,0.04)]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm">
                              {grant.name}
                            </span>
                            <span className="block truncate text-xs text-[var(--ink-dim)]">
                              {grant.funder_name ?? "Unattached"}
                            </span>
                          </span>
                          <StatusChip status={grant.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
