"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BIZ_KANBAN_COLUMNS,
  type BizLead,
  type BizStatus,
} from "@/lib/develop/types";
import { updateBizLeadStatus } from "@/lib/develop/actions";
import { pulse, burst } from "@/lib/motion/anime";
import { BizCard } from "./biz-card";
import { BizStatusChip } from "./status-chip";

/*
  Business-development pipeline kanban. Six columns:
  prospect -> built -> contacted -> interested -> closed | passed.
  Drag-to-transition writes the lead markdown frontmatter first, then upserts
  Supabase. Pulse on every drop, burst on a closed deal.
*/

export function BizKanban({
  leads,
  visitCounts = {},
}: {
  leads: BizLead[];
  visitCounts?: Record<string, number>;
}) {
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<{
    slug: string;
    from: BizStatus;
  } | null>(null);
  const [overColumn, setOverColumn] = useState<BizStatus | null>(null);
  const [pending, startTransition] = useTransition();

  const columns = useMemo(() => {
    return BIZ_KANBAN_COLUMNS.map((col) => ({
      ...col,
      leads: leads.filter((l) => l.status === col.status),
    }));
  }, [leads]);

  const handleDragStart = useCallback(
    (slug: string) => {
      const l = leads.find((x) => x.slug === slug);
      if (l) setDragging({ slug, from: l.status });
    },
    [leads],
  );

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (toStatus: BizStatus, dropTarget: HTMLElement) => {
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
          await updateBizLeadStatus(slug, toStatus);
          toast.success(`Moved to ${toStatus}`);
          pulse(dropTarget);
          if (toStatus === "closed") burst(dropTarget, 44);
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
      <div className="flex items-center gap-3 display-eyebrow flex-wrap">
        <span>
          PIPELINE · <span className="amber">{leads.length}</span> LEADS
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
                  <span className="display-eyebrow truncate">{col.eyebrow}</span>
                  <div className="flex items-center gap-2">
                    <BizStatusChip status={col.status} />
                    <span className="display-stat text-base leading-none">
                      {col.leads.length}
                    </span>
                  </div>
                </div>
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {col.leads.length === 0 && (
                  <p className="px-3 py-8 text-center text-xs text-[var(--ink-faint)] font-mono uppercase tracking-[0.18em]">
                    {isOver ? "DROP HERE" : "EMPTY"}
                  </p>
                )}
                {col.leads.map((l) => (
                  <BizCard
                    key={l.id}
                    lead={l}
                    visits={visitCounts[l.slug] ?? 0}
                    isDragging={dragging?.slug === l.slug}
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
