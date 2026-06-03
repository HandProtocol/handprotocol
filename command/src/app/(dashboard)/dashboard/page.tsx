import Link from "next/link";
import { differenceInDays, parseISO } from "date-fns";
import { listGrants } from "@/lib/grants/queries";
import { PillarGrid, type PillarStats } from "@/components/dashboard/pillar-grid";
import { StatusChip } from "@/components/kanban/status-chip";
import { ArrowRight, Calendar } from "lucide-react";

/*
  Dashboard, polished pass.

  Live data from Supabase. Four H-A-N-D pillar tiles each show one
  primary stat tied to that pillar's scope. Below, two-up panel:
  upcoming deadlines on the left, recent activity placeholder on
  the right.

  Reveal cascade on the tiles via the PillarGrid client component.
*/

function formatValue(n: number): string {
  if (!n) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

export default async function DashboardPage() {
  const grants = await listGrants();

  const inFlight = grants.filter(
    (g) => g.status === "drafting" || g.status === "submitted",
  );
  const decided = grants.filter(
    (g) =>
      g.status === "awarded" ||
      g.status === "declined" ||
      g.status === "withdrawn",
  );
  const awarded = grants.filter((g) => g.status === "awarded");

  const totalExpected = inFlight.reduce(
    (sum, g) =>
      sum + (g.amount_requested ?? 0) * ((g.fit_score ?? 3) / 5),
    0,
  );
  const totalAwarded = awarded.reduce(
    (sum, g) => sum + (g.amount_awarded ?? g.amount_requested ?? 0),
    0,
  );

  // Pillar stats: each tile tells a different story
  const pillars: PillarStats[] = [
    {
      letter: "H",
      word: "Holistic",
      line: "One source of truth",
      detail:
        "Every grant in one bridge. Markdown stays canonical. Supabase mirrors for fast reads. Git is the audit log.",
      primaryStat: `${grants.length}`,
      primaryStatLabel: "GRANTS · TOTAL",
      href: "/grants",
    },
    {
      letter: "A",
      word: "Approach",
      line: "The operator's methodology",
      detail:
        "Fit-score, kanban, boilerplate library, drafting assistant. The way HAND chooses to work.",
      primaryStat: `${inFlight.length}`,
      primaryStatLabel: "IN · FLIGHT",
      href: "/grants",
    },
    {
      letter: "N",
      word: "Nurture",
      line: "Relationships and voice",
      detail:
        "Touchpoint log tied to the funder. Boilerplate carries voice across applications.",
      primaryStat: `${new Set(grants.map((g) => g.funder_id).filter(Boolean)).size}`,
      primaryStatLabel: "FUNDERS",
      href: "/funders",
    },
    {
      letter: "D",
      word: "Develop",
      line: "Pipeline growth, learning",
      detail:
        "Expected value, cycle time, concentration. The pipeline gets smarter every quarter.",
      primaryStat: formatValue(totalExpected),
      primaryStatLabel: "EXPECTED · VALUE",
      href: "/deadlines",
    },
  ];

  // Deadline radar: next 5 with deadlines
  const today = new Date();
  const upcoming = grants
    .filter((g) => g.deadline && g.status !== "withdrawn" && g.status !== "declined")
    .map((g) => ({
      ...g,
      daysOut: differenceInDays(parseISO(g.deadline!), today),
    }))
    .filter((g) => g.daysOut >= -7) // include 1 week past for visibility
    .sort((a, b) => a.daysOut - b.daysOut)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="display-eyebrow">
          <span className="amber">BRIDGE ONLINE</span> · {grants.length} GRANTS · {decided.length} DECIDED
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          The chair where the work happens
        </h1>
        <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
          {inFlight.length} in flight. {formatValue(totalExpected)} expected.
          {totalAwarded > 0 && ` ${formatValue(totalAwarded)} awarded to date.`}
        </p>
      </header>

      <section aria-labelledby="pillars-heading" className="space-y-3">
        <h2 id="pillars-heading" className="display-eyebrow">
          THE FOUR PILLARS
        </h2>
        <PillarGrid pillars={pillars} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="deadline-heading"
          className="panel p-5 space-y-3"
        >
          <header className="flex items-center justify-between">
            <h2 id="deadline-heading" className="display-eyebrow">
              <Calendar
                className="inline-block h-3 w-3 mr-2 -mt-0.5"
                aria-hidden
              />
              DEADLINE · RADAR
            </h2>
            <Link
              href="/deadlines"
              className="text-[10px] uppercase tracking-[0.22em] font-mono text-[var(--ink-faint)] hover:text-[var(--amber-soft)] transition-colors inline-flex items-center gap-1"
            >
              FULL · CALENDAR
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </header>
          {upcoming.length === 0 ? (
            <p className="text-sm text-[var(--ink-dim)] py-6 text-center">
              Nothing on the radar in the next month.
              <br />
              <Link
                href="/grants/new"
                className="text-[var(--amber-soft)] hover:underline"
              >
                Add a grant
              </Link>{" "}
              or trust the quiet.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((g) => {
                const tone =
                  g.daysOut < 0
                    ? "text-[var(--ink-faint)] line-through"
                    : g.daysOut <= 7
                      ? "text-[var(--danger)]"
                      : g.daysOut <= 30
                        ? "text-[var(--amber-soft)]"
                        : "text-[var(--ink-dim)]";
                const label =
                  g.daysOut < 0
                    ? `${Math.abs(g.daysOut)}d past`
                    : g.daysOut === 0
                      ? "TODAY"
                      : `${g.daysOut}d`;
                return (
                  <li key={g.id}>
                    <Link
                      href={`/grants/${g.slug}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-transparent hover:border-[rgba(217,119,6,0.25)] hover:bg-[rgba(217,119,6,0.04)] px-2 py-2 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[var(--ink)] truncate">
                          {g.name}
                        </p>
                        <p className="text-xs text-[var(--ink-dim)] truncate">
                          {g.funder_name ?? "Unattached"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusChip status={g.status} />
                        <span
                          className={`font-mono text-[10px] uppercase tracking-[0.18em] ${tone}`}
                        >
                          {label}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="stats-heading"
          className="panel p-5 space-y-4"
        >
          <h2 id="stats-heading" className="display-eyebrow">
            PIPELINE · STATE
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="display-eyebrow">DRAFTING</dt>
              <dd className="display-stat text-3xl mt-1">
                {grants.filter((g) => g.status === "drafting").length}
              </dd>
            </div>
            <div>
              <dt className="display-eyebrow">SUBMITTED</dt>
              <dd className="display-stat text-3xl mt-1">
                {grants.filter((g) => g.status === "submitted").length}
              </dd>
            </div>
            <div>
              <dt className="display-eyebrow">AWARDED</dt>
              <dd className="display-stat text-3xl mt-1 text-[#bef0d0]">
                {awarded.length}
              </dd>
            </div>
            <div>
              <dt className="display-eyebrow">DECIDED · TOTAL</dt>
              <dd className="display-stat text-3xl mt-1">{decided.length}</dd>
            </div>
          </dl>
          <div className="pt-3 border-t border-[rgba(245,239,225,0.06)]">
            <p className="text-xs text-[var(--ink-dim)]">
              Win rate{" "}
              <span className="display-stat text-[var(--amber-soft)]">
                {decided.length > 0
                  ? `${Math.round((awarded.length / decided.length) * 100)}%`
                  : "pending"}
              </span>{" "}
              across {decided.length} decided grants.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
