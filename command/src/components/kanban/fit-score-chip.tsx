import { cn } from "@/lib/utils";

/*
  Fit-score chip. PRD section 7.2 A1.
  1-2: muted (stretch fits)
  3:   neutral
  4-5: amber glow (high-fit, the operator's "queue this fast" signal)
*/

export function FitScoreChip({
  score,
  className,
}: {
  score: number | null | undefined;
  className?: string;
}) {
  if (score == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded border border-[rgba(245,239,225,0.12)] bg-transparent px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]",
          className,
        )}
        title="No fit score yet"
      >
        FIT · ·
      </span>
    );
  }

  const tone =
    score >= 4
      ? "border-[rgba(217,119,6,0.45)] bg-[rgba(217,119,6,0.12)] text-[var(--amber-soft)] shadow-[0_0_10px_rgba(217,119,6,0.25)]"
      : score === 3
        ? "border-[rgba(245,239,225,0.18)] bg-[rgba(245,239,225,0.04)] text-[var(--ink)]"
        : "border-[rgba(142,138,126,0.25)] bg-transparent text-[var(--ink-dim)]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
        tone,
        className,
      )}
      title={`Fit score: ${score} of 5`}
    >
      FIT · {score}
    </span>
  );
}
