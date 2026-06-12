"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KanbanSquare, Map, Globe, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Sub-navigation for the Develop pillar. Four lenses on the same pipeline:
    Board     — the status kanban (+ group/filter/search)
    Map       — leads plotted by location
    Sites     — the registry of live owned sites
    Campaigns — the batches leads are worked in
  Kept as in-section tabs (not sidebar items) so the primary nav stays
  pillar-flat. Active tab matches on prefix, /develop matches exactly.
*/

const TABS = [
  { label: "Board", href: "/develop", icon: KanbanSquare, exact: true },
  { label: "Map", href: "/develop/map", icon: Map },
  { label: "Sites", href: "/develop/sites", icon: Globe },
  { label: "Campaigns", href: "/develop/campaigns", icon: Layers },
] as const;

export function DevelopNav() {
  const pathname = usePathname();
  const active = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      aria-label="Develop views"
      className="flex flex-wrap items-center gap-1 border-b border-[rgba(245,239,225,0.07)] pb-px"
    >
      {TABS.map((t) => {
        const on = active(t.href, "exact" in t ? Boolean(t.exact) : false);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-xs font-medium tracking-wide transition-colors -mb-px",
              on
                ? "border-[var(--amber)] text-[var(--ink)]"
                : "border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[rgba(217,119,6,0.35)]",
            )}
            aria-current={on ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
