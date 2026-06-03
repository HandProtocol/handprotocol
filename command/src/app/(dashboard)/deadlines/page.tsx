import Link from "next/link";
import { differenceInDays, parseISO, format } from "date-fns";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { listGrants } from "@/lib/grants/queries";
import { StatusChip } from "@/components/kanban/status-chip";
import { FitScoreChip } from "@/components/kanban/fit-score-chip";
import type { GrantRecord } from "@/lib/grants/types";

/*
  Deadline radar, full calendar. The dashboard tile links here.

  Every grant with a deadline that is still live (not withdrawn/declined),
  grouped by urgency band: overdue, this week, this month, later. Within a
  band, soonest first. Rolling / no-deadline grants get their own quiet
  section at the bottom so nothing falls off the radar.
*/

export const dynamic = "force-dynamic";

type Dated = GrantRecord & { daysOut: number };

type Band = {
  key: string;
  label: string;
  eyebrow: string;
  tone: string;
  items: Dated[];
};

function dayLabel(daysOut: number): string {
  if (daysOut < 0) return `${Math.abs(daysOut)}d past`;
  if (daysOut === 0) return "TODAY";
  return `${daysOut}d out`;
}

export default async function DeadlinesPage() {
  const grants = await listGrants();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const today = new Date();
  const live = grants.filter(
    (g) => g.status !== "withdrawn" && g.status !== "declined" && g.status !== "closed",
  );

  const dated: Dated[] = live
    .filter((g) => g.deadline)
    .map((g) => ({ ...g, daysOut: differenceInDays(parseISO(g.deadline!), today) }))
    .sort((a, b) => a.daysOut - b.daysOut);

  const rolling = live.filter((g) => !g.deadline);

  const bands: Band[] = [
    {
      key: "overdue",
      label: "Overdue",
      eyebrow: "PAST · DUE",
      tone: "text-[#fda4a4]",
      items: dated.filter((g) => g.daysOut < 0),
    },
    {
      key: "week",
      label: "This week",
      eyebrow: "0 – 7 DAYS",
      tone: "text-[var(--amber-soft)]",
      items: dated.filter((g) => g.daysOut >= 0 && g.daysOut <= 7),
    },
    {
      key: "month",
      label: "This month",
      eyebrow: "8 – 30 DAYS",
      tone: "text-[var(--amber-soft)]",
      items: dated.filter((g) => g.daysOut > 7 && g.daysOut <= 30),
    },
    {
      key: "later",
      label: "Later",
      eyebrow: "31+ DAYS",
      tone: "text-[var(--ink-dim)]",
      items: dated.filter((g) => g.daysOut > 30),
    },
  ];

  const nonEmpty = bands.filter((b) => b.items.length > 0);
  const nextUp = dated.find((g) => g.daysOut >= 0);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Dashboard
        </Link>
        <div className="space-y-2">
          <p className="eyebrow">
            <span className="amber">D</span> · DEVELOP · DEADLINE RADAR
          </p>
          <h1 className="text-2xl font-medium tracking-tight">
            <CalendarClock className="mr-2 -mt-1 inline-block h-5 w-5" aria-hidden />
            Full calendar
          </h1>
          <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
            {dated.length} grant{dated.length === 1 ? "" : "s"} with a live
            deadline.
            {nextUp
              ? ` Next up: ${nextUp.name} in ${nextUp.daysOut}d.`
              : " Nothing pending on the clock."}
          </p>
        </div>
      </header>

      {!configured && (
        <div className="panel border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-4">
          <p className="eyebrow text-[var(--amber-soft)]">CONFIG · PENDING</p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Supabase env vars are not set, so the radar is empty in the
            preview. Run <code className="font-mono text-xs">npm run ingest:grants</code>{" "}
            once the migrations are applied.
          </p>
        </div>
      )}

      {configured && dated.length === 0 && rolling.length === 0 && (
        <div className="panel p-6 text-center space-y-2">
          <p className="eyebrow">RADAR · CLEAR</p>
          <p className="text-sm text-[var(--ink-dim)]">
            Nothing on the clock.{" "}
            <Link href="/grants/new" className="text-[var(--amber-soft)] hover:underline">
              Add a grant
            </Link>{" "}
            or trust the quiet.
          </p>
        </div>
      )}

      {nonEmpty.map((band) => (
        <section key={band.key} aria-labelledby={`band-${band.key}`} className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 id={`band-${band.key}`} className="display-eyebrow">
              {band.label}
            </h2>
            <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${band.tone}`}>
              {band.eyebrow} · {band.items.length}
            </span>
          </div>
          <ul className="panel divide-y divide-[rgba(245,239,225,0.06)] p-0">
            {band.items.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/grants/${g.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[rgba(217,119,6,0.04)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--ink)]">{g.name}</p>
                    <p className="truncate text-xs text-[var(--ink-dim)]">
                      {g.funder_name ?? "Unattached"} ·{" "}
                      {format(parseISO(g.deadline!), "EEE, MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <FitScoreChip score={g.fit_score} />
                    <StatusChip status={g.status} />
                    <span
                      className={`w-20 text-right font-mono text-[10px] uppercase tracking-[0.18em] ${band.tone}`}
                    >
                      {dayLabel(g.daysOut)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {rolling.length > 0 && (
        <section aria-labelledby="band-rolling" className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 id="band-rolling" className="display-eyebrow">
              Rolling / no deadline
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
              OPEN · {rolling.length}
            </span>
          </div>
          <ul className="panel divide-y divide-[rgba(245,239,225,0.06)] p-0">
            {rolling.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/grants/${g.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[rgba(217,119,6,0.04)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--ink)]">{g.name}</p>
                    <p className="truncate text-xs text-[var(--ink-dim)]">
                      {g.funder_name ?? "Unattached"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <FitScoreChip score={g.fit_score} />
                    <StatusChip status={g.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
