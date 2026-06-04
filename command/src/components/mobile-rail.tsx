"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { navItems, isActivePath } from "@/components/nav-items";
import { SidebarNav } from "@/components/sidebar-nav";

/*
  Mobile navigation, two states:

  - Collapsed (default): a slim, always-visible vertical icon rail pinned to
    the left edge. Each icon links straight to its route, so quick navigation
    is one tap. The active route gets an amber bar + tint.
  - Expanded: the ">" button at the foot of the rail opens the full labeled
    menu (the same SidebarNav the desktop uses) as a slide-over drawer, with
    pillar tags, cmd+K hint, and the account footer.

  Desktop (lg+) hides this entirely and shows the full SidebarNav in the
  static sidebar. The collapsed rail is in normal flow (a flex sibling of
  <main>), so the content offsets beside it without manual padding.
*/
export function MobileRail({
  role,
  email,
}: {
  role: "admin" | "contributor" | "viewer";
  email: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Collapsed icon rail */}
      <aside
        aria-label="Quick navigation"
        className="sticky top-0 z-30 flex h-screen w-14 flex-shrink-0 flex-col border-r border-[rgba(245,239,225,0.06)] bg-[rgba(7,9,15,0.85)] backdrop-blur-md lg:hidden"
      >
        <Link
          href="/dashboard"
          aria-label="Dashboard"
          className="flex h-16 items-center justify-center border-b border-[rgba(245,239,225,0.06)]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md border border-[rgba(217,119,6,0.35)] bg-[rgba(217,119,6,0.18)] font-mono text-xs font-semibold text-[var(--amber-soft)]">
            H
          </span>
        </Link>

        <nav aria-label="Primary" className="flex-1 overflow-y-auto py-2">
          <ul className="flex flex-col items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative grid h-10 w-10 place-items-center rounded-md transition-colors",
                      active
                        ? "bg-[rgba(217,119,6,0.14)] text-[var(--amber-soft)]"
                        : "text-[var(--ink-dim)] hover:bg-[rgba(245,239,225,0.04)] hover:text-[var(--ink)]",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[var(--amber)]"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[rgba(245,239,225,0.06)] p-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Show all navigation"
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-md text-[var(--ink-dim)] transition-colors hover:bg-[rgba(217,119,6,0.1)] hover:text-[var(--amber-soft)]"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </aside>

      {/* Expanded drawer (full labeled menu) */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[rgba(7,9,15,0.7)] backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-[rgba(245,239,225,0.06)] bg-[var(--bg-2)] shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse navigation"
              className="absolute right-3 top-4 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--ink-dim)] hover:bg-[rgba(245,239,225,0.06)]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <SidebarNav
              role={role}
              email={email}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
