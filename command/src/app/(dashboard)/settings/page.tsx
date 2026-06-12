import Link from "next/link";
import { Settings as SettingsIcon, ExternalLink } from "lucide-react";
import { getCurrentUser, getCurrentProfile, can } from "@/lib/supabase/profile";
import { InvitesSection } from "@/components/settings/invites-section";
import { ApplicationsSection } from "@/components/settings/applications-section";
import { ReplayOrientation } from "@/components/onboarding/replay-orientation";

/*
  Settings. Operator identity + a read-only system status board.

  v1 is deliberately honest: it reports what is wired rather than offering
  controls that don't exist yet. Role and password are managed in Supabase
  (auth + command.profiles); the status board reflects the live env so the
  operator can see at a glance which integrations are active. The drafting
  assistant row never names the provider — that's a product rule.
*/

export const dynamic = "force-dynamic";

function Dot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={
        on
          ? "h-2 w-2 rounded-full bg-[var(--amber)] shadow-[0_0_8px_var(--amber-glow)]"
          : "h-2 w-2 rounded-full border border-[rgba(245,239,225,0.25)]"
      }
    />
  );
}

function StatusRow({
  label,
  on,
  onText,
  offText,
}: {
  label: string;
  on: boolean;
  onText: string;
  offText: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <Dot on={on} />
        <span className="text-sm text-[var(--ink)]">{label}</span>
      </div>
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
          on ? "text-[var(--amber-soft)]" : "text-[var(--ink-faint)]"
        }`}
      >
        {on ? onText : offText}
      </span>
    </div>
  );
}

export default async function SettingsPage() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const user = supabaseConfigured ? await getCurrentUser() : null;
  const profile = supabaseConfigured ? await getCurrentProfile() : null;

  const email = user?.email ?? "preview@handprotocol.org";
  const role = profile?.role ?? "admin";
  const displayName = profile?.display_name ?? email.split("@")[0];

  // Show Access & Invites to admins (users.manage). In the unconfigured-env
  // scaffold preview there's no profile but the dashboard renders as admin, so
  // surface it there too — the createInvite/revokeInvite actions re-check the
  // capability the moment Supabase is wired, so this is display-only gating.
  const canManageUsers = supabaseConfigured
    ? can(profile, "users.manage")
    : true;

  const assistantActive = Boolean(
    process.env.XAI_API_KEY || process.env.ANTHROPIC_API_KEY,
  );
  const inboxActive = Boolean(process.env.INBOX_CAPTURE_KEY);
  const telegramActive = Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
      process.env.FORUM_GROUP_ID &&
      process.env.INSPECTOR_TOPIC_ID,
  );

  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">ADMIN · SETTINGS</p>
        <h1 className="text-2xl font-medium tracking-tight">
          <SettingsIcon className="mr-2 -mt-1 inline-block h-5 w-5" aria-hidden />
          Settings
        </h1>
        <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
          Who&apos;s signed in, and what the bridge is wired to. Identity and
          access live in Supabase; this board reflects the live environment.
        </p>
      </header>

      {/* Operator identity */}
      <section aria-labelledby="identity-heading" className="panel p-5 space-y-4">
        <h2 id="identity-heading" className="display-eyebrow">
          OPERATOR
        </h2>
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-[rgba(217,119,6,0.35)] bg-[rgba(217,119,6,0.12)] font-mono text-lg uppercase text-[var(--amber-soft)]">
            {email.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base text-[var(--ink)]">{displayName}</p>
            <p className="truncate text-sm text-[var(--ink-dim)]">{email}</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.08)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber)]" />
            {role}
          </span>
        </div>
        <p className="border-t border-[rgba(245,239,225,0.06)] pt-3 text-xs text-[var(--ink-dim)]">
          Password and role are managed in Supabase Auth and{" "}
          <code className="font-mono text-[11px]">command.profiles</code>. Admins
          promote roles with a direct update; rotate a password from the
          Supabase dashboard or the password-reset flow.
        </p>
      </section>

      {/* Access & Invites (admins only) */}
      {canManageUsers ? <InvitesSection /> : null}

      {/* Applications review (admins only) */}
      {canManageUsers ? <ApplicationsSection /> : null}

      {/* System status */}
      <section aria-labelledby="status-heading" className="panel p-5 space-y-1">
        <h2 id="status-heading" className="display-eyebrow pb-1">
          SYSTEM · STATUS
        </h2>
        <div className="divide-y divide-[rgba(245,239,225,0.06)]">
          <StatusRow
            label="Supabase (auth + read replica)"
            on={supabaseConfigured}
            onText="CONNECTED"
            offText="PREVIEW · NO ENV"
          />
          <StatusRow
            label="Drafting assistant"
            on={assistantActive}
            onText="ACTIVE"
            offText="STUB MODE"
          />
          <StatusRow
            label="Quick-capture inbox endpoint"
            on={inboxActive}
            onText="ENABLED"
            offText="NO SHARED KEY"
          />
          <StatusRow
            label="Inspector → Telegram notifier"
            on={telegramActive}
            onText="WIRED"
            offText="OFF"
          />
        </div>
        <p className="border-t border-[rgba(245,239,225,0.06)] pt-3 text-xs text-[var(--ink-dim)]">
          Integrations are configured by environment variables. See{" "}
          <code className="font-mono text-[11px]">command/.env.example</code> for
          the full list and how each row activates.
        </p>
      </section>

      {/* Build */}
      <section aria-labelledby="build-heading" className="panel p-5 space-y-3">
        <h2 id="build-heading" className="display-eyebrow">
          BUILD
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="display-eyebrow">VERSION</dt>
            <dd className="display-stat mt-1 text-[var(--amber-soft)]">0.1.0</dd>
          </div>
          <div>
            <dt className="display-eyebrow">NODE</dt>
            <dd className="display-stat mt-1">01</dd>
          </div>
          <div>
            <dt className="display-eyebrow">CANON</dt>
            <dd className="mt-1 text-xs text-[var(--ink-dim)]">
              Markdown is canonical · Git is the audit log
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-3 border-t border-[rgba(245,239,225,0.06)] pt-3">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--amber-soft)]"
          >
            Supabase dashboard
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--amber-soft)]"
          >
            Back to dashboard
          </Link>
          <ReplayOrientation />
        </div>
      </section>
    </div>
  );
}
