"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createInvite } from "@/lib/invites/actions";
import { CopyButton } from "@/components/develop/copy-button";
import type { CommandRole } from "@/lib/supabase/profile";

/*
  Invite creation form (admin only — the parent section renders this only when
  can(profile,'users.manage')). Calls the createInvite server action directly,
  then surfaces the generated redemption LINK with a copy button so the operator
  can hand it off even when email is dormant.
*/

const field =
  "w-full rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(217,119,6,0.4)] focus:outline-none";
const label =
  "block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)] mb-1.5";

const ROLE_OPTIONS: { value: CommandRole; label: string }[] = [
  { value: "admin", label: "Admin — full access" },
  { value: "funding_lead", label: "Funding lead — grants & funders" },
  { value: "develop_rep", label: "Develop rep — biz pipeline" },
  { value: "contributor", label: "Contributor — read + comment" },
  { value: "viewer", label: "Viewer — scoped read" },
];

export function InviteForm() {
  const router = useRouter();
  const [role, setRole] = useState<CommandRole>("contributor");
  const [email, setEmail] = useState("");
  const [group, setGroup] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [emailInvitee, setEmailInvitee] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ link: string; emailed: boolean } | null>(
    null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await createInvite({
        role,
        email: email.trim() || undefined,
        reciprocate_group: group.trim() || undefined,
        expiresInDays,
        sendEmail: emailInvitee,
      });
      setResult({ link: res.link, emailed: res.emailed });
      if (emailInvitee && email.trim()) {
        toast.success(
          res.emailed ? "Invite created and emailed" : "Invite created — email is dormant, copy the link",
        );
      } else {
        toast.success("Invite created — copy the link to share");
      }
      // Refresh the server-rendered invite list below the form.
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create invite",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="invite-role">
              Role *
            </label>
            <select
              id="invite-role"
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
            <label className={label} htmlFor="invite-expiry">
              Expires (days)
            </label>
            <input
              id="invite-expiry"
              type="number"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value) || 14)}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="invite-email">
              Email (optional)
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
              placeholder="invitee@example.org"
            />
          </div>
          <div>
            <label className={label} htmlFor="invite-group">
              Reciprocate group (optional)
            </label>
            <input
              id="invite-group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className={field}
              placeholder="mystic-hearts"
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-[var(--ink-dim)]">
          <input
            type="checkbox"
            checked={emailInvitee}
            onChange={(e) => setEmailInvitee(e.target.checked)}
            className="h-4 w-4 accent-[var(--amber)]"
          />
          Email the invitee the link
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            (dormant until Resend is configured)
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-4 py-2 text-sm font-medium text-[#1a1208] hover:bg-[var(--amber-soft)] hover:shadow-[0_0_14px_var(--amber-glow)] transition-all disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden />
          )}
          {submitting ? "Creating" : "Create invite"}
        </button>
      </form>

      {result ? (
        <div className="rounded-md border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.06)] p-4 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)]">
            INVITE LINK{result.emailed ? " · EMAILED" : ""}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 break-all font-mono text-xs text-[var(--ink)]">
              {result.link}
            </code>
            <CopyButton text={result.link} label="Copy link" />
          </div>
          <p className="text-xs text-[var(--ink-dim)]">
            One-time use. The invitee signs in, then this link assigns their role
            and activates their account.
          </p>
        </div>
      ) : null}
    </div>
  );
}
