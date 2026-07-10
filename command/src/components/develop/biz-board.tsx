"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BIZ_GROUP_BY,
  BIZ_STATUSES,
  WEBSITE_STATUSES,
  isLiveSite,
  type BizCampaign,
  type BizGroupBy,
  type BizLead,
  type BizStatus,
  type WebsiteStatus,
} from "@/lib/develop/types";
import { BizKanban } from "./biz-kanban";
import { BizCard } from "./biz-card";

/*
  Board wrapper for the Develop pipeline. A thin client layer over the existing
  kanban that adds search, group-by, and filter chips. When grouped by status it
  hands the filtered set straight to <BizKanban> (drag-to-transition lives there,
  untouched). Grouped any other way it renders static, click-through columns of
  <BizCard> bucketed by campaign / city / category. All state is client-side.
*/

// Fold case, strip accents (yucatán -> yucatan), and drop apostrophes/punctuation
// so "eds" matches "Ed's" and "yucatan" matches "Yucatán".
function normSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’ʼ`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const WEBSITE_LABEL: Record<WebsiteStatus, string> = {
  none: "NO SITE",
  poor: "POOR SITE",
  ok: "HAS SITE",
};

const GROUP_LABEL: Record<BizGroupBy, string> = {
  status: "STATUS",
  campaign: "CAMPAIGN",
  city: "CITY",
  category: "CATEGORY",
};

const MISSING = "—";

function chipBase(active: boolean) {
  return cn(
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
    active
      ? "border-[rgba(217,119,6,0.5)] bg-[rgba(217,119,6,0.12)] text-[var(--amber-soft)]"
      : "border-[rgba(245,239,225,0.12)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[rgba(217,119,6,0.35)]",
  );
}

export function BizBoard({
  leads,
  campaigns,
  visitCounts,
}: {
  leads: BizLead[];
  campaigns: BizCampaign[];
  visitCounts: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<BizGroupBy>("status");
  const [statuses, setStatuses] = useState<BizStatus[]>([]);
  const [websites, setWebsites] = useState<WebsiteStatus[]>([]);
  const [liveOnly, setLiveOnly] = useState(false);
  const [campaignSlug, setCampaignSlug] = useState<string | null>(null);

  function toggleStatus(s: BizStatus) {
    setStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function toggleWebsite(w: WebsiteStatus) {
    setWebsites((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w],
    );
  }

  const filtered = useMemo(() => {
    const terms = normSearch(query).split(" ").filter(Boolean);
    return leads.filter((l) => {
      if (terms.length) {
        const haystack = normSearch(
          [l.name, l.category, l.city].filter(Boolean).join(" "),
        );
        if (!terms.every((t) => haystack.includes(t))) return false;
      }
      if (statuses.length > 0 && !statuses.includes(l.status)) return false;
      if (websites.length > 0 && !websites.includes(l.website_status))
        return false;
      if (liveOnly && !isLiveSite(l)) return false;
      if (campaignSlug && l.campaign?.slug !== campaignSlug) return false;
      return true;
    });
  }, [leads, query, statuses, websites, liveOnly, campaignSlug]);

  // Static groups for the non-status lenses. Missing values bucket under "—".
  const groups = useMemo(() => {
    if (groupBy === "status") return [];
    const keyOf = (l: BizLead): string => {
      if (groupBy === "campaign") return l.campaign?.name ?? MISSING;
      if (groupBy === "city") return l.city ?? MISSING;
      return l.category ?? MISSING; // category
    };
    const map = new Map<string, BizLead[]>();
    for (const l of filtered) {
      const k = keyOf(l);
      const arr = map.get(k);
      if (arr) arr.push(l);
      else map.set(k, [l]);
    }
    // Sort groups alphabetically, push the "—" bucket to the end.
    return [...map.entries()]
      .sort(([a], [b]) => {
        if (a === MISSING) return 1;
        if (b === MISSING) return -1;
        return a.localeCompare(b);
      })
      .map(([label, items]) => ({ label, items }));
  }, [filtered, groupBy]);

  const filtersActive =
    statuses.length > 0 ||
    websites.length > 0 ||
    liveOnly ||
    Boolean(campaignSlug) ||
    query.trim().length > 0;

  function clearFilters() {
    setQuery("");
    setStatuses([]);
    setWebsites([]);
    setLiveOnly(false);
    setCampaignSlug(null);
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="panel p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[12rem]">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, category, city"
              aria-label="Search leads"
              className="w-full rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] py-2 pl-8 pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(217,119,6,0.4)] focus:outline-none"
            />
          </div>

          {/* Group by */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              Group
            </span>
            <div className="flex items-center rounded-md border border-[rgba(245,239,225,0.12)] overflow-hidden">
              {BIZ_GROUP_BY.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroupBy(g)}
                  aria-pressed={groupBy === g}
                  className={cn(
                    "px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                    groupBy === g
                      ? "bg-[rgba(217,119,6,0.18)] text-[var(--amber-soft)]"
                      : "text-[var(--ink-dim)] hover:text-[var(--ink)]",
                  )}
                >
                  {GROUP_LABEL[g]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {BIZ_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              aria-pressed={statuses.includes(s)}
              className={chipBase(statuses.includes(s))}
            >
              {s}
            </button>
          ))}
          <span aria-hidden className="px-1 text-[var(--ink-faint)]">
            |
          </span>
          {WEBSITE_STATUSES.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => toggleWebsite(w)}
              aria-pressed={websites.includes(w)}
              className={chipBase(websites.includes(w))}
            >
              {WEBSITE_LABEL[w]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setLiveOnly((v) => !v)}
            aria-pressed={liveOnly}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
              liveOnly
                ? "border-[rgba(34,197,94,0.45)] bg-[rgba(34,197,94,0.12)] text-[#86efac]"
                : "border-[rgba(245,239,225,0.12)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[rgba(34,197,94,0.4)]",
            )}
          >
            Live
          </button>
          {campaigns.length > 0 && (
            <>
              <span aria-hidden className="px-1 text-[var(--ink-faint)]">
                |
              </span>
              <select
                value={campaignSlug ?? ""}
                onChange={(e) => setCampaignSlug(e.target.value || null)}
                aria-label="Filter by campaign"
                className="rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)] focus:border-[rgba(217,119,6,0.4)] focus:outline-none"
              >
                <option value="">All campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)] hover:text-[var(--ink)]"
            >
              <X className="h-3 w-3" aria-hidden />
              Clear
            </button>
          )}
        </div>

        <p className="display-eyebrow">
          <span className="amber">{filtered.length}</span> OF {leads.length}{" "}
          LEADS
        </p>
      </div>

      {/* Board */}
      {groupBy === "status" ? (
        <BizKanban leads={filtered} visitCounts={visitCounts} />
      ) : filtered.length === 0 ? (
        <p className="panel px-3 py-10 text-center font-mono text-xs uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          No leads match
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((g) => (
            <section
              key={g.label}
              className="panel flex flex-col min-h-[16rem]"
            >
              <header className="flex items-center justify-between border-b border-[rgba(245,239,225,0.06)] px-3 py-2.5 gap-2">
                <span className="display-eyebrow truncate">{g.label}</span>
                <span className="display-stat text-base leading-none">
                  {g.items.length}
                </span>
              </header>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {g.items.map((l) => (
                  <BizCard
                    key={l.id}
                    lead={l}
                    visits={visitCounts[l.slug] ?? 0}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
