import { formatDistanceToNow, parseISO } from "date-fns";
import { Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Append-only activity timeline. Phase 1 reads command.activity_log for
  this grant, plus the operational timestamps that live in the row.
  Phase 3 will add git history (commits touching the markdown file).
*/

type Entry = {
  id: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurred_at: string;
  source: "log" | "row";
};

function describe(entry: Entry): string {
  if (entry.source === "row") return entry.action;
  if (entry.action === "status_changed") {
    const from = entry.before?.status as string | undefined;
    const to = entry.after?.status as string | undefined;
    if (from && to) return `Status: ${from} → ${to}`;
    if (to) return `Status set to ${to}`;
  }
  if (entry.action === "created") {
    const status = entry.after?.status as string | undefined;
    return `Created${status ? ` in ${status}` : ""}`;
  }
  return entry.action;
}

export function ActivityPanel({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <aside className="panel p-4">
        <header className="flex items-center justify-between mb-3">
          <p className="eyebrow flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> ACTIVITY
          </p>
        </header>
        <p className="text-xs text-[var(--ink-faint)] font-mono uppercase tracking-[0.18em]">
          NO ENTRIES YET
        </p>
      </aside>
    );
  }

  return (
    <aside className="panel p-4">
      <header className="flex items-center justify-between mb-3">
        <p className="eyebrow flex items-center gap-1.5">
          <Activity className="h-3 w-3" /> ACTIVITY
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          {entries.length} ENTRIES
        </span>
      </header>

      <ol className="space-y-3 max-h-[28rem] overflow-y-auto">
        {entries.map((e) => {
          const date = parseISO(e.occurred_at);
          return (
            <li
              key={e.id}
              className={cn(
                "relative pl-4 border-l text-xs",
                e.source === "log"
                  ? "border-[rgba(217,119,6,0.35)]"
                  : "border-[rgba(245,239,225,0.15)]",
              )}
            >
              <span
                className={cn(
                  "absolute -left-1 top-1 h-1.5 w-1.5 rounded-full",
                  e.source === "log"
                    ? "bg-[var(--amber)]"
                    : "bg-[var(--ink-faint)]",
                )}
                aria-hidden
              />
              <p className="text-[var(--ink)]">{describe(e)}</p>
              <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                <Clock className="h-2.5 w-2.5" />
                {formatDistanceToNow(date, { addSuffix: true })}
              </p>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
