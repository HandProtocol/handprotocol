import { cn } from "@/lib/utils";
import type { GrantStatus } from "@/lib/grants/types";

/*
  Status chip for the grant pipeline. Reuses the public tracker's class
  names (`--discovery`, `--drafting`, etc) but in the HUD-dark palette
  via the CSS vars in globals.css.
*/

const LABELS: Record<GrantStatus, string> = {
  discovery: "Discovery",
  drafting: "Drafting",
  submitted: "Submitted",
  awarded: "Awarded",
  declined: "Declined",
  withdrawn: "Withdrawn",
  closed: "Closed",
};

export function StatusChip({
  status,
  size = "sm",
  className,
}: {
  status: GrantStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-[0.18em]",
        size === "sm"
          ? "px-2 py-0.5 text-[10px]"
          : "px-2.5 py-1 text-[11px]",
        "status-chip",
        className,
      )}
    >
      <span className="status-dot" aria-hidden />
      {LABELS[status]}
    </span>
  );
}
