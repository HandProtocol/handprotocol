import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ExternalLink, MessageSquare, CalendarClock } from "lucide-react";
import {
  getFunderBySlug,
  listGrants,
  listFunderTouchpoints,
} from "@/lib/grants/queries";
import { StatusChip } from "@/components/kanban/status-chip";
import { DeadlineChip } from "@/components/kanban/deadline-chip";
import { FitScoreChip } from "@/components/kanban/fit-score-chip";

/*
  Funder detail. PRD section 7.3 N2 (Nurture pillar).

  The relationship view for a single funder: who they are, the grants
  attached to them, and the touchpoint log that carries across every
  application. Touchpoints tie to the funder, not the grant.
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

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  conference: "Conference",
  intro: "Intro",
  letter: "Letter",
  social: "Social",
  other: "Note",
};

function fmt(date: string | null): string {
  if (!date) return "";
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

export default async function FunderDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const funder = await getFunderBySlug(slug);
  if (!funder) notFound();

  const [grants, touchpoints] = await Promise.all([
    listGrants(),
    listFunderTouchpoints(funder.id),
  ]);

  const attached = grants.filter((g) => g.funder_id === funder.id);
  const tags = [...(funder.focus_areas ?? []), ...(funder.geography ?? [])];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          href="/funders"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Funder library
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="eyebrow">
              <span className="amber">N</span> · NURTURE ·{" "}
              {funder.type ? (TYPE_LABEL[funder.type] ?? funder.type) : "FUNDER"}
            </p>
            <h1 className="text-2xl font-medium tracking-tight">{funder.name}</h1>
            {funder.funder_url && (
              <a
                href={funder.funder_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--amber-soft)] hover:underline"
              >
                {funder.funder_url.replace(/^https?:\/\//, "")}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <FitScoreChip score={funder.fit_score} />
            {funder.annual_cycle && (
              <span className="inline-flex items-center gap-1 rounded border border-[rgba(245,239,225,0.12)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)]">
                <CalendarClock className="h-3 w-3" aria-hidden />
                {funder.annual_cycle}
              </span>
            )}
          </div>
        </div>

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
      </header>

      {funder.mission_alignment_notes && (
        <section className="panel p-5 space-y-2">
          <h2 className="display-eyebrow">MISSION · ALIGNMENT</h2>
          <p className="text-sm leading-relaxed text-[var(--ink-dim)] whitespace-pre-line">
            {funder.mission_alignment_notes}
          </p>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Attached grants */}
        <section aria-labelledby="grants-heading" className="panel p-5 space-y-3">
          <h2 id="grants-heading" className="display-eyebrow">
            GRANTS · {attached.length}
          </h2>
          {attached.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--ink-dim)]">
              No grants attached to this funder yet.{" "}
              <Link
                href="/grants/new"
                className="text-[var(--amber-soft)] hover:underline"
              >
                Scaffold one
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {attached.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/grants/${g.slug}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-[rgba(217,119,6,0.25)] hover:bg-[rgba(217,119,6,0.04)]"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink)]">
                      {g.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <DeadlineChip deadline={g.deadline} />
                      <StatusChip status={g.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Touchpoint log */}
        <section aria-labelledby="touch-heading" className="panel p-5 space-y-3">
          <h2 id="touch-heading" className="display-eyebrow">
            <MessageSquare className="mr-2 -mt-0.5 inline-block h-3 w-3" aria-hidden />
            TOUCHPOINT · LOG
          </h2>
          {touchpoints.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--ink-dim)]">
              No touchpoints logged. The relationship history starts the first
              time you reach out.
            </p>
          ) : (
            <ul className="space-y-3">
              {touchpoints.map((t) => (
                <li
                  key={t.id}
                  className="border-l border-[rgba(217,119,6,0.3)] pl-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)]">
                      {t.channel ? (CHANNEL_LABEL[t.channel] ?? t.channel) : "Note"}
                      {t.direction ? ` · ${t.direction}` : ""}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                      {fmt(t.occurred_on)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--ink)]">{t.summary}</p>
                  {t.notes && (
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-dim)]">
                      {t.notes}
                    </p>
                  )}
                  {t.follow_up_on && (
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                      FOLLOW UP · {fmt(t.follow_up_on)}
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
