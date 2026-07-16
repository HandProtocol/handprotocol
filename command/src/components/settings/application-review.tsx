"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

import {
  approveApplication,
  rejectApplication,
} from "@/lib/applications/actions";
import { CopyButton } from "@/components/develop/copy-button";
import type { AccessApplication } from "@/lib/applications/types";
import type { CommandRole } from "@/lib/supabase/profile";

/*
  Per-row review controls for a pending access application (admin only — the
  parent section renders this only when can(profile,'users.manage'), and the
  approve/reject actions re-check users.manage anyway).

  Approve issues an invite at the chosen role (defaulting to the requested one,
  overridable) with optional group / expiry / email, then surfaces the
  redemption link via the shared CopyButton. Reject marks the row rejected.
*/

const field =
  "w-full rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-2.5 py-1.5 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(217,119,6,0.4)] focus:outline-none";
const microLabel =
  "block font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-faint)] mb-1";

// Admins may grant any role at approval — including admin, since they already
// hold users.manage. The default is seeded from the application's request.
const ROLE_OPTIONS: { value: CommandRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "funding_lead", label: "Funding lead" },
  { value: "develop_rep", label: "Develop rep" },
  { value: "contributor", label: "Contributor" },
  { value: "viewer", label: "Viewer" },
];

export function ApplicationReview({ app }: { app: AccessApplication }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<CommandRole>(app.desired_role);
  const [group, setGroup] = useState(app.reciprocate_group ?? "");
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [emailInvitee, setEmailInvitee] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function onApprove() {
    setBusy("approve");
    try {
      const res = await approveApplication(app.id, {
        role,
        reciprocate_group: group.trim() || undefined,
        expiresInDays,
        sendEmail: emailInvitee,
      });
      setInviteLink(res.inviteLink);
      toast.success("Approved — invite issued");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve");
    } finally {
      setBusy(null);
    }
  }

  async function onReject() {
    setBusy("reject");
    try {
      await rejectApplication(app.id);
      toast.success("Application rejected");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reject");
    } finally {
      setBusy(null);
    }
  }

  // Once approved this row shows the issued link instead of the controls.
  if (inviteLink) {
    return (
      <div className="rounded-md border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.06)] p-3 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)]">
          INVITE LINK · {app.email}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="min-w-0 flex-1 break-all font-mono text-xs text-[var(--ink)]">
            {inviteLink}
          </code>
          <CopyButton text={inviteLink} label="Copy link" className="w-full sm:w-auto" />
        </div>
        <p className="text-xs text-[var(--ink-dim)]">
          One-time use. The applicant signs in, then this link activates their
          account at the chosen role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        {open ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)] hover:text-[var(--ink)]"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--amber)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#1a1208] transition-all hover:bg-[var(--amber-soft)] hover:shadow-[0_0_12px_var(--amber-glow)] sm:w-auto"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Approve
          </button>
        )}
        <button
          type="button"
          onClick={onReject}
          disabled={busy !== null}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[rgba(245,239,225,0.12)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)] transition-colors hover:border-[rgba(220,38,38,0.4)] hover:text-[#f87171] disabled:opacity-50 sm:w-auto"
        >
          {busy === "reject" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <X className="h-3.5 w-3.5" aria-hidden />
          )}
          Reject
        </button>
      </div>

      {open ? (
        <div className="rounded-md border border-[rgba(245,239,225,0.1)] bg-[rgba(7,9,15,0.4)] p-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={microLabel} htmlFor={`role-${app.id}`}>
                Grant role
              </label>
              <select
                id={`role-${app.id}`}
                value={role}
                onChange={(e) => setRole(e.target.value as CommandRole)}
                className={field}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={microLabel} htmlFor={`expiry-${app.id}`}>
                Expires (days)
              </label>
              <input
                id={`expiry-${app.id}`}
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) =>
                  setExpiresInDays(Number(e.target.value) || 14)
                }
                className={field}
              />
            </div>
            <div className="col-span-2">
              <label className={microLabel} htmlFor={`group-${app.id}`}>
                Reciprocate group (optional)
              </label>
              <input
                id={`group-${app.id}`}
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className={field}
                placeholder="mystic-hearts"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-[var(--ink-dim)]">
            <input
              type="checkbox"
              checked={emailInvitee}
              onChange={(e) => setEmailInvitee(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--amber)]"
            />
            Email the invite to {app.email}
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              (dormant until Resend)
            </span>
          </label>

          <button
            type="button"
            onClick={onApprove}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-3 py-1.5 text-xs font-medium text-[#1a1208] transition-all hover:bg-[var(--amber-soft)] hover:shadow-[0_0_12px_var(--amber-glow)] disabled:opacity-50"
          >
            {busy === "approve" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            {busy === "approve" ? "Issuing invite" : "Approve & issue invite"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
