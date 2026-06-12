"use client";

/*
  Inbox list view. Filter chips above, expandable rows below.
  Each row collapses to a single-line summary; clicking expands
  the triage panel inline. Filter state lives in the URL via
  useRouter.replace so a back-button works the way the operator
  expects.
*/

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Inbox, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

import type { InboxItem, InboxStatus } from "@/lib/inbox/types";
import { INBOX_STATUS_LABELS } from "@/lib/inbox/types";
import { TriageActions } from "./triage-actions";

type Counts = Record<InboxStatus, number>;

const FILTERS: { value: InboxStatus; label: string }[] = [
  { value: "needs_triage", label: "Needs triage" },
  { value: "becomes_grant", label: "Became grant" },
  { value: "becomes_funder", label: "Became funder" },
  { value: "discarded", label: "Discarded" },
];

export function InboxList({
  items,
  counts,
  activeStatus,
}: {
  items: InboxItem[];
  counts: Counts;
  activeStatus: InboxStatus;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(() => items, [items]);

  function applyStatus(status: InboxStatus) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("status", status);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = f.value === activeStatus;
          const count = counts[f.value] ?? 0;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => applyStatus(f.value)}
              className={
                active
                  ? "inline-flex items-center gap-2 rounded-full border border-[rgba(217,119,6,0.45)] bg-[rgba(217,119,6,0.16)] px-3 py-1 text-xs text-[var(--amber-soft)]"
                  : "inline-flex items-center gap-2 rounded-full border border-[rgba(245,239,225,0.1)] bg-transparent px-3 py-1 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)] transition-colors"
              }
              aria-pressed={active}
            >
              <span>{f.label}</span>
              <span className="font-mono text-[10px] tracking-[0.18em] text-[var(--ink-faint)]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <EmptyState status={activeStatus} />
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.id} className="panel p-3">
              <Row
                item={item}
                open={openId === item.id}
                onToggle={() =>
                  setOpenId((prev) => (prev === item.id ? null : item.id))
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  item,
  open,
  onToggle,
}: {
  item: InboxItem;
  open: boolean;
  onToggle: () => void;
}) {
  const captured = (() => {
    try {
      return formatDistanceToNow(parseISO(item.captured_at), { addSuffix: true });
    } catch {
      return item.captured_at;
    }
  })();

  const label =
    item.title?.trim() ||
    (item.url ? prettyUrl(item.url) : null) ||
    (item.body?.trim().slice(0, 80) ?? "Untitled capture");

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={open}
      >
        <span
          className="mt-0.5 text-[var(--ink-faint)]"
          aria-hidden
        >
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-[var(--ink)]">{label}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            <span>{captured}</span>
            <span className="text-[var(--ink-faint)]">·</span>
            <span>SRC {item.source}</span>
            <span className="text-[var(--ink-faint)]">·</span>
            <StatusChip status={item.status} />
            {item.url && (
              <>
                <span className="text-[var(--ink-faint)]">·</span>
                <Link
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[var(--ink-dim)] hover:text-[var(--amber-soft)]"
                >
                  <ExternalLink className="h-3 w-3" /> Open
                </Link>
              </>
            )}
            {item.resolved_slug && (
              <>
                <span className="text-[var(--ink-faint)]">·</span>
                <span className="text-[var(--amber-soft)]">
                  {item.resolved_slug}
                </span>
              </>
            )}
          </p>
        </div>
      </button>

      {open && (
        <div className="space-y-3">
          {item.body && (
            <p className="whitespace-pre-wrap rounded-md bg-[rgba(7,9,15,0.4)] p-3 text-sm text-[var(--ink-dim)]">
              {item.body}
            </p>
          )}
          <TriageActions item={item} />
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: InboxStatus }) {
  const tone =
    status === "needs_triage"
      ? "border-[rgba(255,186,73,0.4)] text-[var(--amber-soft)] bg-[rgba(255,186,73,0.08)]"
      : status === "becomes_grant"
        ? "border-[rgba(74,222,128,0.35)] text-[#9ee9ba] bg-[rgba(74,222,128,0.06)]"
        : status === "becomes_funder"
          ? "border-[rgba(107,142,255,0.35)] text-[#a8bcff] bg-[rgba(107,142,255,0.06)]"
          : "border-[rgba(142,138,126,0.3)] text-[var(--ink-dim)] bg-[rgba(245,239,225,0.04)]";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${tone}`}
    >
      {INBOX_STATUS_LABELS[status]}
    </span>
  );
}

function EmptyState({ status }: { status: InboxStatus }) {
  const messages: Record<InboxStatus, { line1: string; line2: string }> = {
    needs_triage: {
      line1: "Nothing waiting in triage.",
      line2: "Paste a URL or notes above. The browser extension and email forward land here too.",
    },
    becomes_grant: {
      line1: "No items promoted to a grant yet.",
      line2: "Triage a captured lead to see it here.",
    },
    becomes_funder: {
      line1: "No items added to the funder library yet.",
      line2: "Triage a captured lead to see it here.",
    },
    discarded: {
      line1: "Nothing discarded.",
      line2: "Discards keep their reason for the retrospective.",
    },
  };
  const m = messages[status];
  return (
    <div className="panel p-6 text-sm">
      <p className="eyebrow">
        <Inbox className="inline-block h-3 w-3 mr-2 -mt-0.5" aria-hidden />
        INBOX · EMPTY
      </p>
      <p className="mt-2 text-[var(--ink)]">{m.line1}</p>
      <p className="mt-1 text-[var(--ink-dim)]">{m.line2}</p>
    </div>
  );
}

function prettyUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.hostname}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return raw;
  }
}
