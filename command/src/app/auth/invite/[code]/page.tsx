import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KeyRound, AlertTriangle } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/profile";
import { redeemInvite } from "@/lib/invites/actions";
import type { RedeemError } from "@/lib/invites/types";

/*
  Public invite-redemption page at /auth/invite/<code>.

  Two paths:
   - Authenticated visitor → redeem now. Success redirects to /dashboard with a
     toast flag; a typed error renders a clear message below.
   - Unauthenticated visitor → stash the code in a `pending_invite` cookie and
     send them to /auth/login?next=/auth/invite/<code>. After sign-in (password
     login honors `next`; magic-link goes through /auth/callback which also
     consumes the cookie) they return here authenticated and redemption runs.

  This route is in the proxy publicPaths allowlist so unauth'd invitees reach it.
*/

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<RedeemError, { title: string; body: string }> = {
  expired: {
    title: "This invite has expired",
    body: "Invite links are time-limited. Ask an admin to issue a fresh one.",
  },
  used: {
    title: "This invite was already used",
    body: "Each invite works once. Ask an admin for a new link if you still need access.",
  },
  invalid: {
    title: "This invite link isn't valid",
    body: "The code wasn't recognized. Check the link, or ask an admin to re-send it.",
  },
  "not-authenticated": {
    title: "Sign in to accept this invite",
    body: "We couldn't confirm your session. Sign in and the invite will apply automatically.",
  },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const user = await getCurrentUser();

  if (!user) {
    // Preserve the code for the post-login hook, then route to sign-in.
    const jar = await cookies();
    jar.set("pending_invite", code, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 30, // 30 minutes to complete sign-in
    });
    redirect(`/auth/login?next=${encodeURIComponent(`/auth/invite/${code}`)}`);
  }

  const result = await redeemInvite(code);

  if (result.ok) {
    // Clear any leftover pending cookie and land on the dashboard.
    const jar = await cookies();
    jar.delete("pending_invite");
    redirect("/dashboard?invited=1");
  }

  const copy = ERROR_COPY[result.error];

  return (
    <div className="hud-surface relative min-h-screen flex items-center justify-center px-4">
      <div className="hud-bracket hud-bracket-tl" />
      <div className="hud-bracket hud-bracket-tr" />
      <div className="hud-bracket hud-bracket-bl" />
      <div className="hud-bracket hud-bracket-br" />

      <div className="relative w-full max-w-sm space-y-6">
        <header className="text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[rgba(217,119,6,0.35)] bg-[rgba(217,119,6,0.12)]">
            <KeyRound className="h-5 w-5 text-[var(--amber-soft)]" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight">
              HAND Command Center
            </h1>
            <p className="mt-1 eyebrow">Invite redemption</p>
          </div>
        </header>

        <div className="panel p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--amber-soft)]"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="text-base text-[var(--ink)]">{copy.title}</p>
              <p className="text-sm text-[var(--ink-dim)]">{copy.body}</p>
            </div>
          </div>
          <div className="flex gap-3 border-t border-[rgba(245,239,225,0.06)] pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--amber-soft)]"
            >
              Go to dashboard
            </Link>
          </div>
        </div>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
          HAND Protocol, 501(c)(3) in formation, Austin, TX
        </p>
      </div>
    </div>
  );
}
