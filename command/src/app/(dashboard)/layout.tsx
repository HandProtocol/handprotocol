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
import { CommandSearchTrigger } from "@/components/search/command-search-trigger";
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
    <div className="command-shell hud-surface relative flex min-h-screen">
      <Toaster />
      <CommandPalette />
      <OnboardingFlow
        enabled={onboardingEnabled}
        role={role}
        displayName={displayName}
        group={reciprocateGroup}
      />

      {/* Persistent icon rail with an expandable labeled drawer */}
      <MobileRail role={role} email={userEmail} />

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <header className="command-topbar">
          <div className="command-crumbs" aria-label="Current workspace">
            <strong>HAND Protocol</strong>
            <span aria-hidden>/</span>
            <span>Command Center</span>
            <span aria-hidden>/</span>
            <b>main</b>
            <em>PRODUCTION</em>
          </div>
          <div className="command-topbar-actions">
            <CommandSearchTrigger />
            <NotificationBell />
          </div>
        </header>

        <div className="command-page">{children}</div>

        <div className="px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)] opacity-60">
          markdown is canonical, supabase mirrors, git is the audit log
        </div>
      </main>
    </div>
  );
}
