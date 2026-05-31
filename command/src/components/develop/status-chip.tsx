import { cn } from "@/lib/utils";
import type { BizStatus } from "@/lib/develop/types";

/*
  Status chip for business-development leads. Mono, uppercase, the same HUD
  register as the grants StatusChip. Colour leans amber through the pipeline,
  green at closed, dim at passed.
*/

const STYLES: Record<BizStatus, string> = {
  prospect: "text-[var(--ink-dim)] border-[rgba(245,239,225,0.16)]",
  built: "text-[var(--amber-soft)] border-[rgba(217,119,6,0.4)]",
  contacted: "text-[var(--amber-soft)] border-[rgba(217,119,6,0.4)]",
  interested: "text-[#fbbf24] border-[rgba(251,191,36,0.45)]",
  closed: "text-[#86efac] border-[rgba(34,197,94,0.45)]",
  passed: "text-[var(--ink-faint)] border-[rgba(245,239,225,0.1)]",
};

export function BizStatusChip({ status }: { status: BizStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
        STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
