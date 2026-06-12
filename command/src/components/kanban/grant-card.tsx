"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { GrantRecord } from "@/lib/grants/types";
import { cardPop, dragGlow } from "@/lib/motion/anime";
import { FitScoreChip } from "./fit-score-chip";
import { DeadlineChip } from "./deadline-chip";

/*
  Kanban card. Drag-to-transition is wired by the parent column via the
  native HTML5 drag-and-drop API. Click navigates to the detail view.

  Motion:
  - cardPop on pointer enter
  - dragGlow continuous while isDragging is true
  - Corner brackets appear on hover via CSS, no JS needed for that
*/

export function GrantCard({
  grant,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  grant: GrantRecord;
  isDragging?: boolean;
  onDragStart?: (slug: string) => void;
  onDragEnd?: () => void;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);

  // Drag glow continuous while dragging
  useEffect(() => {
    if (!isDragging || !ref.current) return;
    return dragGlow(ref.current);
  }, [isDragging]);

  const daysSinceDiscovery = grant.discovered_on
    ? differenceInDays(new Date(), parseISO(grant.discovered_on))
    : null;

  return (
    <Link
      ref={ref}
      href={`/grants/${grant.slug}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", grant.slug);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(grant.slug);
      }}
      onDragEnd={() => onDragEnd?.()}
      onPointerEnter={() => {
        if (ref.current && !isDragging) cardPop(ref.current);
      }}
      className={cn(
        "grant-card group relative block rounded-lg border bg-[rgba(7,9,15,0.7)] p-3 transition-colors",
        "border-[rgba(245,239,225,0.07)]",
        "hover:border-[rgba(217,119,6,0.35)]",
        isDragging && "opacity-40",
      )}
      data-status={grant.status}
    >
      {/* Corner brackets, show on hover */}
      <span aria-hidden className="grant-card__bracket grant-card__bracket--tl" />
      <span aria-hidden className="grant-card__bracket grant-card__bracket--tr" />
      <span aria-hidden className="grant-card__bracket grant-card__bracket--bl" />
      <span aria-hidden className="grant-card__bracket grant-card__bracket--br" />

      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug text-[var(--ink)] line-clamp-2">
          {grant.name}
        </h3>
        <FitScoreChip score={grant.fit_score} />
      </div>

      {grant.funder_name && (
        <p className="mt-1 text-xs text-[var(--ink-dim)] line-clamp-1">
          {grant.funder_name}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <DeadlineChip deadline={grant.deadline} />
        {daysSinceDiscovery != null && daysSinceDiscovery >= 0 && (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]"
            title={`Discovered ${grant.discovered_on}`}
          >
            DISC · {daysSinceDiscovery}d
          </span>
        )}
        {grant.reciprocate_group && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            · {grant.reciprocate_group}
          </span>
        )}
      </div>
    </Link>
  );
}
