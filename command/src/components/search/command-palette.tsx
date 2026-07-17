"use client";

/*
  Universal search palette. Cmd+K or Ctrl+K from anywhere in the
  dashboard route group opens a centered modal with a single input and
  a grouped result list. Arrow keys navigate, Enter selects, Esc
  closes.

  Empty query state shows recents pulled from localStorage. Each time
  the operator opens a result, we push its href onto the recents list
  so the palette starts useful on the next visit.
*/

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  Building2,
  BookOpen,
  Inbox,
  Clock,
} from "lucide-react";

import { universalSearch } from "@/lib/search/queries";
import type {
  SearchResult,
  SearchResultType,
  UniversalSearchResults,
} from "@/lib/search/types";

const RECENTS_KEY = "hand:command:recents";
const RECENTS_MAX = 8;

type FlatResult = SearchResult & { group: SearchResultType };

const GROUP_ORDER: SearchResultType[] = [
  "grant",
  "funder",
  "boilerplate",
  "inbox",
];

const GROUP_LABEL: Record<SearchResultType, string> = {
  grant: "Grants",
  funder: "Funders",
  boilerplate: "Boilerplate",
  inbox: "Inbox",
};

function iconFor(type: SearchResultType) {
  if (type === "grant") return FileText;
  if (type === "funder") return Building2;
  if (type === "boilerplate") return BookOpen;
  return Inbox;
}

type RecentEntry = {
  href: string;
  title: string;
  type: SearchResultType;
};

function readRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, RECENTS_MAX);
  } catch {
    return [];
  }
}

function pushRecent(entry: RecentEntry) {
  if (typeof window === "undefined") return;
  try {
    const existing = readRecents().filter((e) => e.href !== entry.href);
    const next = [entry, ...existing].slice(0, RECENTS_MAX);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota or parse errors. Recents are a convenience.
  }
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UniversalSearchResults>({
    grants: [],
    funders: [],
    boilerplate: [],
    inbox: [],
  });
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searching, setSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global cmd+K / ctrl+K listener. Also closes on esc when open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function onOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("hand:command-search", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hand:command-search", onOpenRequest);
    };
  }, []);

  // Reset and focus when the palette opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    setRecents(readRecents());
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  // Debounced search. 140ms is brisk but lets typing settle.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults({ grants: [], funders: [], boilerplate: [], inbox: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await universalSearch(q);
        setResults(res);
      } catch {
        setResults({ grants: [], funders: [], boilerplate: [], inbox: [] });
      } finally {
        setSearching(false);
      }
    }, 140);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const flat: FlatResult[] = useMemo(() => {
    const list: FlatResult[] = [];
    for (const g of GROUP_ORDER) {
      const bucket =
        g === "grant"
          ? results.grants
          : g === "funder"
            ? results.funders
            : g === "boilerplate"
              ? results.boilerplate
              : results.inbox;
      for (const r of bucket) {
        list.push({ ...r, group: g });
      }
    }
    return list;
  }, [results]);

  const hasQuery = query.trim().length > 0;
  const showRecents = !hasQuery && recents.length > 0;

  const navList: { href: string; label: string; subtitle: string | null; type: SearchResultType }[] = useMemo(() => {
    if (showRecents) {
      return recents.map((r) => ({
        href: r.href,
        label: r.title,
        subtitle: null,
        type: r.type,
      }));
    }
    return flat.map((r) => ({
      href: r.href,
      label: r.title,
      subtitle: r.subtitle,
      type: r.group,
    }));
  }, [showRecents, recents, flat]);

  // Clamp selectedIndex when the result list shrinks.
  useEffect(() => {
    if (selectedIndex >= navList.length) {
      setSelectedIndex(Math.max(0, navList.length - 1));
    }
  }, [navList.length, selectedIndex]);

  // Scroll the active item into view as the operator arrows through.
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-row-index="${selectedIndex}"]`);
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  function select(idx: number) {
    const target = navList[idx];
    if (!target) return;
    pushRecent({
      href: target.href,
      title: target.label,
      type: target.type,
    });
    setOpen(false);
    router.push(target.href);
  }

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, navList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(selectedIndex);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Universal search"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[rgba(7,9,15,0.72)] backdrop-blur-sm"
      />

      <div
        onKeyDown={handleKey}
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-[rgba(245,239,225,0.1)] bg-[rgba(12,18,32,0.92)] shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
      >
        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-[rgba(245,239,225,0.06)] px-4">
          <Search className="h-4 w-4 shrink-0 text-[var(--ink-faint)]" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search grants, funders, boilerplate, inbox"
            className="h-12 flex-1 bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none"
            aria-label="Search query"
          />
          <kbd className="hidden md:inline rounded border border-[rgba(245,239,225,0.15)] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.18em] text-[var(--ink-faint)]">
            ESC
          </kbd>
        </div>

        {/* Result list */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2"
          role="listbox"
          aria-label="Search results"
        >
          {showRecents ? (
            <Group label="Recent" Icon={Clock}>
              {recents.map((r, i) => (
                <Row
                  key={`recent-${r.href}-${i}`}
                  index={i}
                  selected={selectedIndex === i}
                  label={r.title}
                  subtitle={GROUP_LABEL[r.type]}
                  type={r.type}
                  onSelect={() => select(i)}
                  onHover={() => setSelectedIndex(i)}
                />
              ))}
            </Group>
          ) : !hasQuery ? (
            <Empty
              line1="Search the bridge."
              line2="Grants by name or slug. Funders by name. Boilerplate by title. Inbox by note."
            />
          ) : navList.length === 0 ? (
            <Empty
              line1={searching ? "Searching" : "Nothing matches."}
              line2={
                searching
                  ? "One moment."
                  : "Try a shorter query, or a slug fragment."
              }
            />
          ) : (
            <>
              {GROUP_ORDER.map((g) => {
                const bucket =
                  g === "grant"
                    ? results.grants
                    : g === "funder"
                      ? results.funders
                      : g === "boilerplate"
                        ? results.boilerplate
                        : results.inbox;
                if (bucket.length === 0) return null;
                const startIndex = navList.findIndex((r) => r.type === g);
                const Icon = iconFor(g);
                return (
                  <Group key={g} label={GROUP_LABEL[g]} Icon={Icon}>
                    {bucket.map((r, i) => {
                      const idx = startIndex + i;
                      return (
                        <Row
                          key={r.id}
                          index={idx}
                          selected={selectedIndex === idx}
                          label={r.title}
                          subtitle={r.subtitle}
                          type={g}
                          onSelect={() => select(idx)}
                          onHover={() => setSelectedIndex(idx)}
                        />
                      );
                    })}
                  </Group>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="hidden md:flex items-center justify-between border-t border-[rgba(245,239,225,0.06)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="rounded border border-[rgba(245,239,225,0.15)] px-1">ENTER</kbd>{" "}
              open
            </span>
            <span>
              <kbd className="rounded border border-[rgba(245,239,225,0.15)] px-1">↑ ↓</kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="rounded border border-[rgba(245,239,225,0.15)] px-1">ESC</kbd>{" "}
              close
            </span>
          </div>
          <span>universal search · cmd+K</span>
        </div>
      </div>
    </div>
  );
}

function Group({
  label,
  Icon,
  children,
}: {
  label: string;
  Icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="px-1 py-1">
      <div className="flex items-center gap-2 px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
        <Icon className="h-3 w-3" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  index,
  selected,
  label,
  subtitle,
  type,
  onSelect,
  onHover,
}: {
  index: number;
  selected: boolean;
  label: string;
  subtitle: string | null;
  type: SearchResultType;
  onSelect: () => void;
  onHover: () => void;
}) {
  const Icon = iconFor(type);
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      data-row-index={index}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={
        selected
          ? "flex w-full items-center gap-3 rounded-md bg-[rgba(217,119,6,0.14)] px-3 py-2 text-left text-sm text-[var(--ink)]"
          : "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-[var(--ink-dim)] hover:bg-[rgba(245,239,225,0.04)] hover:text-[var(--ink)]"
      }
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${selected ? "text-[var(--amber-soft)]" : "text-[var(--ink-faint)]"}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {subtitle && (
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          {subtitle}
        </span>
      )}
    </button>
  );
}

function Empty({ line1, line2 }: { line1: string; line2: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm text-[var(--ink)]">{line1}</p>
      <p className="mt-1 text-xs text-[var(--ink-dim)]">{line2}</p>
    </div>
  );
}
