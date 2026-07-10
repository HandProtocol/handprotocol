import { Suspense } from "react";
import Link from "next/link";
import { differenceInDays, formatDistanceToNow, parseISO } from "date-fns";
import {
  ArrowRight,
  Calendar,
  MessageSquareText,
  Radio,
  UsersRound,
} from "lucide-react";
import { listBizLeads } from "@/lib/develop/queries";
import { listGrants } from "@/lib/grants/queries";
import { listPins } from "@/lib/inspector/queries";
import { listPublicVisits } from "@/lib/public/queries";
import { listReciprocateGroups } from "@/lib/reciprocates/queries";
import { StatusChip } from "@/components/kanban/status-chip";
import { InviteRedeemedToast } from "@/components/settings/invite-redeemed-toast";

export const dynamic = "force-dynamic";

function money(value: number): string {
  if (!value) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

function dayLabel(daysOut: number): string {
  if (daysOut < 0) return `${Math.abs(daysOut)}d past`;
  if (daysOut === 0) return "Today";
  return `${daysOut}d`;
}

function pageHref(path: string): string {
  return path === "/"
    ? "https://handprotocol.org/"
    : `https://handprotocol.org${path}`;
}

export default async function DashboardPage() {
  const [grants, projects, pins, publicVisits, reciprocateGroups] =
    await Promise.all([
      listGrants(),
      listBizLeads(),
      listPins(),
      listPublicVisits(24),
      listReciprocateGroups(),
    ]);

  const today = new Date();
  const activeGrants = grants.filter((grant) =>
    ["discovery", "drafting", "submitted"].includes(grant.status),
  );
  const awarded = grants.filter((grant) => grant.status === "awarded");
  const expected = activeGrants.reduce(
    (sum, grant) =>
      sum + (grant.amount_requested ?? 0) * ((grant.fit_score ?? 3) / 5),
    0,
  );
  const totalAwarded = awarded.reduce(
    (sum, grant) => sum + (grant.amount_awarded ?? grant.amount_requested ?? 0),
    0,
  );
  const openPins = pins.filter((pin) => pin.status !== "resolved");
  const activeProjects = projects.filter(
    (project) => project.status !== "passed" && project.status !== "closed",
  );
  const liveSites = projects.filter((project) => project.live_domain);
  const activeReciprocates = reciprocateGroups.filter(
    (group) =>
      group.activeGrantCount > 0 ||
      group.activeProfileCount > 0 ||
      group.pendingApplicationCount > 0,
  );

  const upcoming = grants
    .filter(
      (grant) =>
        grant.deadline &&
        grant.status !== "withdrawn" &&
        grant.status !== "declined" &&
        grant.status !== "closed",
    )
    .map((grant) => ({
      ...grant,
      daysOut: differenceInDays(parseISO(grant.deadline!), today),
    }))
    .filter((grant) => grant.daysOut >= -7)
    .sort((a, b) => a.daysOut - b.daysOut)
    .slice(0, 5);

  const recentProjects = projects
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <InviteRedeemedToast />
      </Suspense>

      <header className="space-y-2">
        <p className="display-eyebrow">
          <span className="amber">Home desk</span> for HAND operations
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          What needs attention now
        </h1>
        <p className="max-w-2xl text-sm text-[var(--ink-dim)]">
          Feedback, projects, funding deadlines, public interest, and
          Reciprocate groups in one view. The dark operator surface stays, the
          work is easier to read.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/feedback"
          className="panel group p-5 transition-colors hover:border-[rgba(217,119,6,0.35)] hover:bg-[rgba(217,119,6,0.04)]"
        >
          <div className="flex items-center justify-between">
            <p className="display-eyebrow">Feedback waiting</p>
            <MessageSquareText className="h-4 w-4 text-[var(--amber-soft)]" />
          </div>
          <p className="mt-4 text-3xl font-medium">{openPins.length}</p>
          <p className="mt-1 text-xs text-[var(--ink-dim)]">
            {pins.length} total notes captured
          </p>
        </Link>

        <Link
          href="/projects"
          className="panel group p-5 transition-colors hover:border-[rgba(217,119,6,0.35)] hover:bg-[rgba(217,119,6,0.04)]"
        >
          <div className="flex items-center justify-between">
            <p className="display-eyebrow">Projects moving</p>
            <ArrowRight className="h-4 w-4 text-[var(--amber-soft)]" />
          </div>
          <p className="mt-4 text-3xl font-medium">{activeProjects.length}</p>
          <p className="mt-1 text-xs text-[var(--ink-dim)]">
            {liveSites.length} live site{liveSites.length === 1 ? "" : "s"}
          </p>
        </Link>

        <Link
          href="/reciprocates"
          className="panel group p-5 transition-colors hover:border-[rgba(217,119,6,0.35)] hover:bg-[rgba(217,119,6,0.04)]"
        >
          <div className="flex items-center justify-between">
            <p className="display-eyebrow">Reciprocates active</p>
            <UsersRound className="h-4 w-4 text-[var(--amber-soft)]" />
          </div>
          <p className="mt-4 text-3xl font-medium">
            {activeReciprocates.length}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-dim)]">
            {reciprocateGroups.length} group
            {reciprocateGroups.length === 1 ? "" : "s"} tracked
          </p>
        </Link>

        <Link
          href="/public"
          className="panel group p-5 transition-colors hover:border-[rgba(217,119,6,0.35)] hover:bg-[rgba(217,119,6,0.04)]"
        >
          <div className="flex items-center justify-between">
            <p className="display-eyebrow">Public interest</p>
            <Radio className="h-4 w-4 text-[var(--amber-soft)]" />
          </div>
          <p className="mt-4 text-3xl font-medium">{publicVisits.length}</p>
          <p className="mt-1 text-xs text-[var(--ink-dim)]">
            Recent high-value visits
          </p>
        </Link>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section
          aria-labelledby="deadline-heading"
          className="panel p-5 space-y-4"
        >
          <header className="flex items-center justify-between gap-4">
            <h2 id="deadline-heading" className="display-eyebrow">
              <Calendar
                className="mr-2 inline-block h-3 w-3 -mt-0.5"
                aria-hidden
              />
              Deadlines due
            </h2>
            <Link
              href="/deadlines"
              className="inline-flex items-center gap-1 text-xs text-[var(--amber-soft)] hover:underline"
            >
              Full calendar
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </header>

          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--ink-dim)]">
              Nothing due soon.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((grant) => {
                const urgent = grant.daysOut <= 7;
                return (
                  <li key={grant.id}>
                    <Link
                      href={`/grants/${grant.slug}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-[rgba(217,119,6,0.25)] hover:bg-[rgba(217,119,6,0.04)]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-[var(--ink)]">
                          {grant.name}
                        </span>
                        <span className="block truncate text-xs text-[var(--ink-dim)]">
                          {grant.funder_name ?? "Unattached"}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <StatusChip status={grant.status} />
                        <span
                          className={
                            urgent
                              ? "text-xs text-[var(--amber-soft)]"
                              : "text-xs text-[var(--ink-dim)]"
                          }
                        >
                          {dayLabel(grant.daysOut)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="funding-heading" className="panel p-5">
          <h2 id="funding-heading" className="display-eyebrow">
            Funding picture
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="display-eyebrow">Active grants</dt>
              <dd className="mt-1 text-3xl font-medium">
                {activeGrants.length}
              </dd>
            </div>
            <div>
              <dt className="display-eyebrow">Expected</dt>
              <dd className="mt-1 text-3xl font-medium">{money(expected)}</dd>
            </div>
            <div>
              <dt className="display-eyebrow">Awarded</dt>
              <dd className="mt-1 text-3xl font-medium text-[#bef0d0]">
                {money(totalAwarded)}
              </dd>
            </div>
            <div>
              <dt className="display-eyebrow">Funders</dt>
              <dd className="mt-1 text-3xl font-medium">
                {new Set(grants.map((grant) => grant.funder_id).filter(Boolean)).size}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section aria-labelledby="feedback-heading" className="panel p-5">
          <header className="flex items-center justify-between gap-4">
            <h2 id="feedback-heading" className="display-eyebrow">
              Recent feedback
            </h2>
            <Link
              href="/feedback"
              className="text-xs text-[var(--amber-soft)] hover:underline"
            >
              Triage
            </Link>
          </header>
          {pins.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--ink-dim)]">
              No public notes yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pins.slice(0, 4).map((pin) => (
                <li key={pin.id}>
                  <Link
                    href={`/feedback`}
                    className="block rounded-md border border-transparent px-2 py-2 transition-colors hover:border-[rgba(217,119,6,0.25)] hover:bg-[rgba(217,119,6,0.04)]"
                  >
                    <p className="line-clamp-2 text-sm text-[var(--ink)]">
                      {pin.comment}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--ink-dim)]">
                      {pin.page_title ?? pin.page_url}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="projects-heading" className="panel p-5">
          <header className="flex items-center justify-between gap-4">
            <h2 id="projects-heading" className="display-eyebrow">
              Recent projects
            </h2>
            <Link
              href="/projects"
              className="text-xs text-[var(--amber-soft)] hover:underline"
            >
              Open projects
            </Link>
          </header>
          {recentProjects.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--ink-dim)]">
              No projects are tracked yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.slug}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-[rgba(217,119,6,0.25)] hover:bg-[rgba(217,119,6,0.04)]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        {project.name}
                      </span>
                      <span className="block truncate text-xs text-[var(--ink-dim)]">
                        {project.campaign?.name ??
                          ([project.city, project.category]
                            .filter(Boolean)
                            .join(" · ") ||
                            "Project")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--amber-soft)]">
                      {project.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="public-heading" className="panel p-5">
          <header className="flex items-center justify-between gap-4">
            <h2 id="public-heading" className="display-eyebrow">
              Public signals
            </h2>
            <Link
              href="/public"
              className="text-xs text-[var(--amber-soft)] hover:underline"
            >
              Details
            </Link>
          </header>
          {publicVisits.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--ink-dim)]">
              No public visits captured yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {publicVisits.slice(0, 5).map((visit) => (
                <li key={visit.id}>
                  <a
                    href={pageHref(visit.page_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border border-transparent px-2 py-2 transition-colors hover:border-[rgba(217,119,6,0.25)] hover:bg-[rgba(217,119,6,0.04)]"
                  >
                    <p className="truncate text-sm text-[var(--ink)]">
                      {visit.page_label}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-dim)]">
                      {formatDistanceToNow(new Date(visit.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
