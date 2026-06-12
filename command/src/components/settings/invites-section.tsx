import { KeyRound } from "lucide-react";

import { listInvites } from "@/lib/invites/queries";
import { InviteForm } from "./invite-form";
import { RevokeInviteButton } from "./revoke-invite-button";

/*
  Access & Invites section for /settings. Server component — renders the create
  form (client) and a live list of invites split into active vs used. The parent
  page renders this ONLY when can(profile,'users.manage'), so no extra guard
  here; the createInvite/revokeInvite actions re-check users.manage anyway.
*/

function statusOf(inv: {
  used_at: string | null;
  expires_at: string;
}): { label: string; tone: "active" | "used" | "expired" } {
  if (inv.used_at) return { label: "redeemed", tone: "used" };
  if (new Date(inv.expires_at).getTime() <= Date.now())
    return { label: "expired", tone: "expired" };
  return { label: "pending", tone: "active" };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function InvitesSection() {
  const invites = await listInvites();

  return (
    <section
      aria-labelledby="invites-heading"
      className="panel p-5 space-y-5"
    >
      <div className="space-y-1">
        <h2 id="invites-heading" className="display-eyebrow">
          <KeyRound className="mr-1.5 -mt-0.5 inline-block h-3.5 w-3.5" aria-hidden />
          ACCESS &amp; INVITES
        </h2>
        <p className="text-xs text-[var(--ink-dim)]">
          Pre-assign a role and hand off a one-time link. The redeemer signs in,
          then lands active at that role. Email is optional and dormant until
          Resend is configured — the link always works.
        </p>
      </div>

      <InviteForm />

      <div className="space-y-2 border-t border-[rgba(245,239,225,0.06)] pt-4">
        <p className="display-eyebrow">ISSUED</p>
        {invites.length === 0 ? (
          <p className="text-xs text-[var(--ink-dim)]">
            No invites yet. Create one above to onboard a teammate.
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(245,239,225,0.06)]">
            {invites.map((inv) => {
              const s = statusOf(inv);
              const toneClass =
                s.tone === "active"
                  ? "text-[var(--amber-soft)]"
                  : s.tone === "used"
                    ? "text-[#86efac]"
                    : "text-[var(--ink-faint)]";
              return (
                <li
                  key={inv.code}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink)]">
                        {inv.role}
                      </span>
                      {inv.reciprocate_group ? (
                        <span className="rounded-full border border-[rgba(245,239,225,0.12)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-dim)]">
                          {inv.reciprocate_group}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-[var(--ink-dim)]">
                      {inv.email || "no email"} · expires {fmtDate(inv.expires_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.18em] ${toneClass}`}
                    >
                      {s.label}
                    </span>
                    {s.tone !== "used" ? (
                      <RevokeInviteButton code={inv.code} />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
