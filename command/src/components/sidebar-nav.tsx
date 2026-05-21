"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  LayoutGrid,
  FileText,
  Users,
  BookOpen,
  CalendarClock,
  Settings,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";

/*
  Sidebar for the HAND Command Center.
  Nav entries match the H-A-N-D pillars in PRD section 1 / 7:
   - Dashboard       (Holistic, overview)
   - Grants          (Holistic, the pipeline view)
   - Funders         (Nurture, funder library)
   - Boilerplate     (Approach, snippet library)
   - Deadlines       (Develop, deadline radar)
   - Settings        (admin)
*/

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  // Pillar tag is H, A, N, D, or a centered dot for Settings.
  pillar: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid, pillar: "H" },
  { label: "Grants", href: "/grants", icon: FileText, pillar: "H" },
  { label: "Funders", href: "/funders", icon: Users, pillar: "N" },
  { label: "Boilerplate", href: "/boilerplate", icon: BookOpen, pillar: "A" },
  { label: "Deadlines", href: "/deadlines", icon: CalendarClock, pillar: "D" },
  { label: "Settings", href: "/settings", icon: Settings, pillar: "·" },
];

export function SidebarNav({
  role,
  email,
  onNavigate,
}: {
  role: "admin" | "contributor" | "viewer";
  email: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Signed out");
      router.push("/auth/login");
    } catch {
      toast.error("Could not sign out");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Brand mark */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-[rgba(245,239,225,0.06)]">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-[rgba(217,119,6,0.18)] border border-[rgba(217,119,6,0.35)]">
          <span className="font-mono text-xs text-[var(--amber-soft)] font-semibold">
            H
          </span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium tracking-tight">
            HAND Command
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
            Holistic · Approach · Nurture · Develop
          </span>
        </div>
      </div>

      {/* Role indicator */}
      <div className="px-5 pt-4 pb-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.08)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber)]" />
          {role}
        </span>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[rgba(217,119,6,0.1)] text-[var(--ink)]"
                      : "text-[var(--ink-dim)] hover:bg-[rgba(245,239,225,0.04)] hover:text-[var(--ink)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  <span
                    className={cn(
                      "font-mono text-[10px] tracking-[0.2em]",
                      active
                        ? "text-[var(--amber-soft)]"
                        : "text-[var(--ink-faint)]",
                    )}
                  >
                    {item.pillar}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: account */}
      <div className="border-t border-[rgba(245,239,225,0.06)] p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-[rgba(245,239,225,0.06)] text-[10px] font-mono uppercase">
            {email?.charAt(0) || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs">{email || "no session"}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              {role}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut || !email}
            aria-label="Sign out"
            className="rounded-md p-1.5 text-[var(--ink-dim)] hover:bg-[rgba(220,38,38,0.08)] hover:text-[#fda4a4] transition-colors disabled:opacity-40"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
