"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownAZ, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  KANBAN_COLUMNS,
  type GrantRecord,
  type GrantStatus,
} from "@/lib/grants/types";
import { updateGrantStatus } from "@/lib/grants/actions";
import { pulse, burst } from "@/lib/motion/anime";
import { GrantCard } from "./grant-card";
import { StatusChip } from "./status-chip";

/*
  Pipeline kanban. Phase 1 feature H1 plus the polish pass.

  Six columns matching the PRD's transition states. Drag-to-transition
  fires the server action, which writes the markdown frontmatter first
  and then upserts the Supabase row.

  Sort toggle switches between default (deadline-ascending) and fit-
  score-descending.

  Polish pass:
  - Pulse on successful drop
  - Burst particles on awarded transition
  - Column headers show count and total expected value
  - HUD eyebrow uses display font
*/

type SortMode = "deadline" | "fit";

function formatTotalValue(amount: number): string {
  if (amount === 0) return "·";
  if (amount >= 1_000_000)
    return `$${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
  if (amount >= 10_000)
    return `$${Math.round(amount / 1_000).toLocaleString()}K`;
  return `$${amount.toLocaleString()}`;
}

function expectedValue(g: GrantRecord): number {
  const ask = g.amount_requested ?? 0;
  if (g.status === "awarded") return g.amount_awarded ?? ask;
  if (g.status === "declined" || g.status === "withdrawn") return 0;
  // For in-flight grants, weight ask by fit-score / 5 as a crude proxy
  const fit = g.fit_score ?? 3;
  return ask * (fit / 5);
}

export function KanbanBoard({ grants }: { grants: GrantRecord[] }) {
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<{
    slug: string;
    from: GrantStatus;
  } | null>(null);
  const [overColumn, setOverColumn] = useState<GrantStatus | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("deadline");
  const [pending, startTransition] = useTransition();

  const sorter = useCallback(
    (a: GrantRecord, b: GrantRecord) => {
      if (sortMode === "fit") {
        const fa = a.fit_score ?? -1;
        const fb = b.fit_score ?? -1;
        if (fa !== fb) return fb - fa;
      }
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      return a.kanban_position - b.kanban_position;
    },
    [sortMode],
  );

  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map((col) => {
      const colGrants = grants.filter((g) => g.status === col.status).sort(sorter);
      const totalValue = colGrants.reduce((sum, g) => sum + expectedValue(g), 0);
      return { ...col, grants: colGrants, totalValue };
    });
  }, [grants, sorter]);

  const totalPipelineValue = useMemo(
    () => grants.reduce((sum, g) => sum + expectedValue(g), 0),
    [grants],
  );

  const handleDragStart = useCallback(
    (slug: string) => {
      const g = grants.find((x) => x.slug === slug);
      if (g) setDragging({ slug, from: g.status });
    },
    [grants],
  );

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (toStatus: GrantStatus, dropTarget: HTMLElement) => {
      if (!dragging) return;
      if (dragging.from === toStatus) {
        setDragging(null);
        setOverColumn(null);
        return;
      }
      const slug = dragging.slug;
      setDragging(null);
      setOverColumn(null);
      startTransition(async () => {
        try {
          await updateGrantStatus(slug, toStatus);
          toast.success(`Moved to ${toStatus}`);
          // Motion: pulse on every transition, burst on awarded
          pulse(dropTarget);
          if (toStatus === "awarded") burst(dropTarget, 44);
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Move failed");
        }
      });
    },
    [dragging, router],
  );

  return (
    <div className="space-y-4" ref={boardRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 display-eyebrow">
          <span>
            PIPELINE · <span className="amber">{grants.length}</span> ACTIVE
          </span>
          <span aria-hidden className="text-[var(--ink-faint)]">·</span>
          <span>
            EXPECTED · <span className="amber">{formatTotalValue(totalPipelineValue)}</span>
          </span>
          <span aria-hidden className="text-[var(--ink-faint)]">·</span>
          <span>DRAG · TO · TRANSITION</span>
          {pending && (
            <>
              <span aria-hidden className="text-[var(--ink-faint)]">·</span>
              <span className="amber">SYNCING</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setSortMode((m) => (m === "deadline" ? "fit" : "deadline"))
          }
          className="inline-flex items-center gap-2 rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-3 py-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[rgba(217,119,6,0.35)] transition-colors"
          title="Toggle sort"
        >
          {sortMode === "fit" ? (
            <ArrowDownAZ className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="font-mono uppercase tracking-[0.18em]">
            SORT · {sortMode === "fit" ? "FIT" : "DEADLINE"}
          </span>
        </button>
      </div>

      {/* Columns */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {columns.map((col) => {
          const isOver = overColumn === col.status;
          return (
            <section
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overColumn !== col.status) setOverColumn(col.status);
              }}
              onDragLeave={(e) => {
                const related = e.relatedTarget as HTMLElement | null;
                if (!related || !e.currentTarget.contains(related)) {
                  if (overColumn === col.status) setOverColumn(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(col.status, e.currentTarget as HTMLElement);
              }}
              className={cn(
                "kanban-column panel flex flex-col min-h-[24rem] relative",
                isOver &&
                  "border-[rgba(217,119,6,0.45)] shadow-[0_0_24px_rgba(217,119,6,0.15)]",
              )}
              data-status={col.status}
            >
              <header className="flex items-start justify-between border-b border-[rgba(245,239,225,0.06)] px-3 py-2.5 gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="display-eyebrow truncate">
                    {col.eyebrow}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusChip status={col.status} />
                    <span className="display-stat text-base leading-none">
                      {col.grants.length}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                    EXPECTED
                  </span>
                  <span className="block display-stat text-xs text-[var(--amber-soft)]">
                    {formatTotalValue(col.totalValue)}
                  </span>
                </div>
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {col.grants.length === 0 && (
                  <p className="px-3 py-8 text-center text-xs text-[var(--ink-faint)] font-mono uppercase tracking-[0.18em]">
                    {isOver ? "DROP HERE" : "EMPTY"}
                  </p>
                )}
                {col.grants.map((g) => (
                  <GrantCard
                    key={g.id}
                    grant={g}
                    isDragging={dragging?.slug === g.slug}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
