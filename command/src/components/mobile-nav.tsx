"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { SidebarNav } from "@/components/sidebar-nav";

/*
  Mobile slide-over. Plain state-driven panel (no base-ui Sheet dependency)
  to keep the surface area small for v1. Closes on route change because
  SidebarNav fires onNavigate after every Link click.
*/
export function MobileNav({
  role,
  email,
}: {
  role: "admin" | "contributor" | "viewer";
  email: string;
}) {
  const [open, setOpen] = useState(false);

  // Lock scroll while open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--ink-dim)] hover:bg-[rgba(245,239,225,0.04)] hover:text-[var(--ink)] transition-colors"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="fixed inset-0 z-40"
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[rgba(7,9,15,0.7)] backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-[var(--bg-2)] border-r border-[rgba(245,239,225,0.06)] shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute top-4 right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--ink-dim)] hover:bg-[rgba(245,239,225,0.06)]"
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
