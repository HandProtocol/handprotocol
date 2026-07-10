"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Star, Globe, MonitorCheck, Eye, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLiveSite, type BizLead } from "@/lib/develop/types";
import { cardPop, dragGlow } from "@/lib/motion/anime";

/*
  Kanban card for a business lead. Drag-to-transition is wired by the parent
  column via the native HTML5 DnD API; click navigates to the detail view.
  Shows the rating + review count (the qualification signal), the website
  status, and whether a demo has been generated.
*/

const WEBSITE_LABEL: Record<string, string> = {
  none: "NO SITE",
  poor: "POOR SITE",
  ok: "HAS SITE",
};

export function BizCard({
  lead,
  visits = 0,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  lead: BizLead;
  visits?: number;
  isDragging?: boolean;
  onDragStart?: (slug: string) => void;
  onDragEnd?: () => void;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!isDragging || !ref.current) return;
    return dragGlow(ref.current);
  }, [isDragging]);

  const live = isLiveSite(lead);

  return (
    <Link
      ref={ref}
      href={`/projects/${lead.slug}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.slug);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(lead.slug);
      }}
      onDragEnd={() => onDragEnd?.()}
      onPointerEnter={() => {
        if (ref.current && !isDragging) cardPop(ref.current);
      }}
      className={cn(
        "grant-card group relative block rounded-lg border bg-[rgba(7,9,15,0.7)] p-3 transition-colors",
        "border-[rgba(245,239,225,0.07)] hover:border-[rgba(217,119,6,0.35)]",
        isDragging && "opacity-40",
      )}
      data-status={lead.status}
    >
      <span aria-hidden className="grant-card__bracket grant-card__bracket--tl" />
      <span aria-hidden className="grant-card__bracket grant-card__bracket--tr" />
      <span aria-hidden className="grant-card__bracket grant-card__bracket--bl" />
      <span aria-hidden className="grant-card__bracket grant-card__bracket--br" />

      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug text-[var(--ink)] line-clamp-2">
          {lead.name}
        </h3>
        {lead.google_rating != null && (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-[var(--amber-soft)]">
            <Star className="h-3 w-3 fill-current" aria-hidden />
            {lead.google_rating}
          </span>
        )}
      </div>

      {(lead.category || lead.city) && (
        <p className="mt-1 text-xs text-[var(--ink-dim)] line-clamp-1">
          {[lead.category, lead.city].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em]",
            lead.website_status === "none"
              ? "text-[var(--amber-soft)]"
              : "text-[var(--ink-faint)]",
          )}
        >
          <Globe className="h-3 w-3" aria-hidden />
          {WEBSITE_LABEL[lead.website_status] ?? lead.website_status}
        </span>
        {lead.reviews_count != null && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            {lead.reviews_count} REV
          </span>
        )}
        {lead.demo_url && (
          <span
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#86efac]"
            title="Demo site generated"
          >
            <MonitorCheck className="h-3 w-3" aria-hidden />
            DEMO
          </span>
        )}
        {live && (
          <span
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#86efac]"
            title={lead.live_domain ?? "Live owned site"}
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[#86efac]"
            />
            LIVE
          </span>
        )}
        {visits > 0 && (
          <span
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)]"
            title={`${visits} demo ${visits === 1 ? "visit" : "visits"}`}
          >
            <Eye className="h-3 w-3" aria-hidden />
            {visits}
          </span>
        )}
        {lead.campaign && (
          <span
            className="inline-flex max-w-[10rem] items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)]"
            title={lead.campaign.name}
          >
            {lead.campaign.color ? (
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: lead.campaign.color }}
              />
            ) : (
              <Layers className="h-3 w-3 shrink-0" aria-hidden />
            )}
            <span className="truncate">{lead.campaign.name}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
