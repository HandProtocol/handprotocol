"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PIN_STATUSES,
  PIN_STATUS_LABELS,
  PIN_PRIORITIES,
  INSPECTOR_PAGES,
  type FeedbackPin,
  type PinStatus,
  type PinPriority,
} from "@/lib/inspector/types";
import { updatePinStatus } from "@/lib/inspector/actions";

/*
  Pins kanban. Three columns: open / in-progress / resolved.

  Drag is HTML5 native, matching the grants kanban so the operator
  doesn't have to relearn the gesture. Pin click navigates back to the
  inspector with a deep-link so the operator lands on exactly the same
  page + element.

  Filter chips (page, priority, author) live above the board. Filters
  apply to all three columns simultaneously.
*/

const COLUMNS: { status: PinStatus; eyebrow: string; label: string }[] = [
  { status: "open", eyebrow: "OPEN", label: PIN_STATUS_LABELS.open },
  { status: "in-progress", eyebrow: "WIP", label: PIN_STATUS_LABELS["in-progress"] },
  { status: "resolved", eyebrow: "DONE", label: PIN_STATUS_LABELS.resolved },
];

const PRIORITY_COLOR: Record<PinPriority, string> = {
  low: "text-[var(--ink-dim)] border-[rgba(245,239,225,0.1)]",
  normal: "text-[var(--ink)] border-[rgba(245,239,225,0.15)]",
  high: "text-[var(--amber-soft)] border-[rgba(217,119,6,0.35)]",
  critical: "text-[#fda4a4] border-[rgba(220,38,38,0.5)]",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function PinsKanban({ pins }: { pins: FeedbackPin[] }) {
  const router = useRouter();
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | PinPriority>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [dragging, setDragging] = useState<{
    id: string;
    from: PinStatus;
  } | null>(null);
  const [overColumn, setOverColumn] = useState<PinStatus | null>(null);
  const [pending, startTransition] = useTransition();

  // Distinct page + author values for filter chips. We compute these off
  // the live pin set so brand-new pages appear without redeploying.
  const pageOptions = useMemo(() => {
    const set = new Set<string>();
    pins.forEach((p) => set.add(p.page_url));
    return Array.from(set).sort();
  }, [pins]);

  const authorOptions = useMemo(() => {
    const set = new Set<string>();
    pins.forEach((p) => {
      const a = p.author_email || p.author_name;
      if (a) set.add(a);
    });
    return Array.from(set).sort();
  }, [pins]);

  const filtered = useMemo(() => {
    return pins.filter((p) => {
      if (pageFilter !== "all" && p.page_url !== pageFilter) return false;
      if (priorityFilter !== "all" && p.priority !== priorityFilter) return false;
      if (authorFilter !== "all") {
        const a = p.author_email || p.author_name;
        if (a !== authorFilter) return false;
      }
      return true;
    });
  }, [pins, pageFilter, priorityFilter, authorFilter]);

  const columns = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      pins: filtered
        .filter((p) => p.status === col.status)
        .sort((a, b) => {
          // Critical first, then high, then by recency.
          const order: PinPriority[] = ["critical", "high", "normal", "low"];
          const ai = order.indexOf(a.priority);
          const bi = order.indexOf(b.priority);
          if (ai !== bi) return ai - bi;
          return b.created_at.localeCompare(a.created_at);
        }),
    }));
  }, [filtered]);

  const handleDrop = useCallback(
    (toStatus: PinStatus) => {
      if (!dragging) return;
      if (dragging.from === toStatus) {
        setDragging(null);
        setOverColumn(null);
        return;
      }
      const id = dragging.id;
      setDragging(null);
      setOverColumn(null);
      startTransition(async () => {
        try {
          await updatePinStatus(id, toStatus);
          toast.success(`Moved to ${toStatus}`);
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Move failed");
        }
      });
    },
    [dragging, router],
  );

  function pageLabel(path: string): string {
    return INSPECTOR_PAGES.find((p) => p.path === path)?.label ?? path;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar / filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="display-eyebrow">
          <span>
            PIPELINE · <span className="amber">{filtered.length}</span> PINS
          </span>
          {pending && (
            <>
              <span aria-hidden className="mx-2 text-[var(--ink-faint)]">·</span>
              <span className="amber">SYNCING</span>
            </>
          )}
        </div>

        <div className="h-5 w-px bg-[rgba(245,239,225,0.1)]" />

        <label className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)]">
          Page
          <select
            value={pageFilter}
            onChange={(e) => setPageFilter(e.target.value)}
            className="rounded border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-2 py-0.5 text-xs text-[var(--ink)] focus:outline-none"
          >
            <option value="all">all</option>
            {pageOptions.map((p) => (
              <option key={p} value={p}>
                {pageLabel(p)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)]">
            Priority
          </span>
          {(["all", ...PIN_PRIORITIES] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={cn(
                "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                priorityFilter === p
                  ? "border border-[rgba(217,119,6,0.45)] bg-[rgba(217,119,6,0.16)] text-[var(--amber-soft)]"
                  : "border border-[rgba(245,239,225,0.1)] text-[var(--ink-dim)] hover:text-[var(--ink)]",
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {authorOptions.length > 0 && (
          <label className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)]">
            Author
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="rounded border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-2 py-0.5 text-xs text-[var(--ink)] focus:outline-none"
            >
              <option value="all">all</option>
              {authorOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Columns */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
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
                handleDrop(col.status);
              }}
              className={cn(
                "panel flex flex-col min-h-[28rem]",
                isOver &&
                  "border-[rgba(217,119,6,0.45)] shadow-[0_0_24px_rgba(217,119,6,0.15)]",
              )}
            >
              <header className="flex items-center justify-between border-b border-[rgba(245,239,225,0.06)] px-3 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="display-eyebrow">{col.eyebrow}</span>
                  <span className="text-sm text-[var(--ink)]">{col.label}</span>
                </div>
                <span className="display-stat text-base leading-none text-[var(--amber-soft)]">
                  {col.pins.length}
                </span>
              </header>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {col.pins.length === 0 && (
                  <p className="px-3 py-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                    {isOver ? "DROP HERE" : "EMPTY"}
                  </p>
                )}
                {col.pins.map((pin) => (
                  <PinCard
                    key={pin.id}
                    pin={pin}
                    isDragging={dragging?.id === pin.id}
                    onDragStart={() =>
                      setDragging({ id: pin.id, from: pin.status })
                    }
                    onDragEnd={() => {
                      setDragging(null);
                      setOverColumn(null);
                    }}
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

function PinCard({
  pin,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  pin: FeedbackPin;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const href = `/inspector?page=${encodeURIComponent(pin.page_url)}&pin=${pin.id}`;
  return (
    <Link
      href={href}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", pin.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "block rounded-md border bg-[rgba(7,9,15,0.7)] p-2.5 transition-colors",
        "border-[rgba(245,239,225,0.07)] hover:border-[rgba(217,119,6,0.35)]",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <code className="break-all rounded bg-[rgba(245,239,225,0.04)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-dim)]">
          {pin.page_url}
        </code>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-0 font-mono text-[10px] uppercase tracking-[0.18em]",
            PRIORITY_COLOR[pin.priority],
          )}
        >
          {pin.priority}
        </span>
      </div>

      {pin.screenshot_url && (
        <div className="mt-2 overflow-hidden rounded border border-[rgba(245,239,225,0.08)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pin.screenshot_url}
            alt="Element screenshot"
            loading="lazy"
            className="block h-24 w-full object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
            }}
          />
        </div>
      )}
      {!pin.screenshot_url && (
        <div className="mt-2 grid h-12 place-items-center rounded border border-dashed border-[rgba(245,239,225,0.08)] text-[var(--ink-faint)]">
          <ImageOff className="h-3.5 w-3.5" />
        </div>
      )}

      <p className="mt-2 text-xs text-[var(--ink)] line-clamp-3">{pin.comment}</p>

      <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
        {(pin.author_email || pin.author_name) && (
          <span className="truncate">{pin.author_email || pin.author_name}</span>
        )}
        <span aria-hidden>·</span>
        <span>{timeAgo(pin.created_at)}</span>
      </div>
    </Link>
  );
}
