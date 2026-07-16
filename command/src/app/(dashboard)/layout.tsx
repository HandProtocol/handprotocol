import {
  getCurrentProfile,
  getCurrentUser,
  type CommandRole,
} from "@/lib/supabase/profile";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileRail } from "@/components/mobile-rail";
import { NotificationBell } from "@/components/notification-bell";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/search/command-palette";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

/*
  Gated dashboard route group.
  v1.0 note: when Supabase env vars are unset (today), this layout renders
  in a "preview" role so the scaffold is visible end-to-end without a live
  project. Real auth gating runs as soon as NEXT_PUBLIC_SUPABASE_URL is set
  and the proxy starts redirecting unauth'd traffic to /auth/login.

  The CommandPalette mounts here so cmd+K opens it from any dashboard
  route. The palette renders nothing until the operator triggers it.
*/

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  let userEmail = "";
  let role: CommandRole = "admin";
  let displayName: string | null = null;
  let reciprocateGroup: string | null = null;
  // Onboarding shows for real active operators; also enabled in preview (admin
  // role) so the scaffold is demoable. localStorage gates it to run once.
  let onboardingEnabled = false;

  if (supabaseConfigured) {
    const user = await getCurrentUser();
    if (user) {
      userEmail = user.email ?? "";
      const profile = await getCurrentProfile();
      if (profile) {
        role = profile.role;
        displayName = profile.display_name;
        reciprocateGroup = profile.reciprocate_group;
        onboardingEnabled = profile.status === "active";
      }
    }
  } else {
    userEmail = "preview@handprotocol.org";
    onboardingEnabled = true;
  }

  return (
    <div className="hud-surface relative flex min-h-screen">
      <div className="hud-bracket hud-bracket-tl" />
      <div className="hud-bracket hud-bracket-tr" />
      <div className="hud-bracket hud-bracket-bl" />
      <div className="hud-bracket hud-bracket-br" />

      <Toaster />
      <CommandPalette />
      <OnboardingFlow
        enabled={onboardingEnabled}
        role={role}
        displayName={displayName}
        group={reciprocateGroup}
      />

      {/* Sidebar (desktop only) */}
      <aside className="sticky top-0 hidden h-screen w-72 flex-shrink-0 border-r border-[rgba(245,239,225,0.06)] bg-[rgba(7,9,15,0.85)] backdrop-blur-md lg:block">
        <SidebarNav role={role} email={userEmail} />
      </aside>

      {/* Collapsed icon rail + expandable drawer (mobile only) */}
      <MobileRail role={role} email={userEmail} />

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        {/* Mobile header */}
        <header className="flex h-16 items-center justify-between border-b border-[rgba(245,239,225,0.06)] px-4 lg:hidden">
          <span className="text-sm font-medium tracking-tight">
            HAND Command
          </span>
          <NotificationBell />
        </header>

        {/* Desktop top bar */}
        <div className="hidden lg:flex h-14 items-center justify-between border-b border-[rgba(245,239,225,0.06)] px-6">
          <div className="flex items-center gap-4 eyebrow">
            <span>
              Command <span className="amber">open</span>
            </span>
            <span aria-hidden className="text-[var(--ink-faint)]">
              ·
            </span>
            <span>Dashboard, feedback, projects, Reciprocates</span>
            <span aria-hidden className="text-[var(--ink-faint)]">
              ·
            </span>
            <span>
              Build <span className="amber">0.1.0</span>
            </span>
          </div>
          <NotificationBell />
        </div>

        <div className="p-6 lg:p-8">{children}</div>

        <div className="px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)] opacity-60">
          markdown is canonical, supabase mirrors, git is the audit log
        </div>
      </main>
    </div>
  );
}
