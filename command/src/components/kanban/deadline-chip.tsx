import { cn } from "@/lib/utils";
import { parseISO, isPast, isToday, differenceInDays } from "date-fns";

/*
  Deadline display for the kanban card. Color tracks urgency.
  - overdue:    danger red
  - today:      amber-soft
  - <=14 days:  amber
  - else:       ink-dim
  - none:       "ROLLING" in mono, no color
*/

export function DeadlineChip({
  deadline,
  className,
}: {
  deadline: string | null;
  className?: string;
}) {
  if (!deadline) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)] border border-[rgba(245,239,225,0.1)]",
          className,
        )}
      >
        ROLLING
      </span>
    );
  }

  const date = parseISO(deadline);
  const daysOut = differenceInDays(date, new Date());
  const overdue = isPast(date) && !isToday(date);

  let tone = "text-[var(--ink-dim)] border-[rgba(245,239,225,0.1)]";
  let label = `${daysOut}d`;

  if (overdue) {
    tone =
      "text-[#fda4a4] border-[rgba(220,38,38,0.4)] bg-[rgba(220,38,38,0.08)]";
    label = `${Math.abs(daysOut)}d overdue`;
  } else if (isToday(date)) {
    tone =
      "text-[var(--amber-soft)] border-[rgba(255,186,73,0.4)] bg-[rgba(255,186,73,0.08)]";
    label = "Today";
  } else if (daysOut <= 14) {
    tone =
      "text-[var(--amber-soft)] border-[rgba(217,119,6,0.35)] bg-[rgba(217,119,6,0.06)]";
    label = `${daysOut}d`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] border",
        tone,
        className,
      )}
      title={deadline}
    >
      {label}
    </span>
  );
}
