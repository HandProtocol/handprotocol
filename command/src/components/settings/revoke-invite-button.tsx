"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { revokeInvite } from "@/lib/invites/actions";

/*
  Revoke (hard-delete) a pending invite. Admin only — the parent section gates
  on can(profile,'users.manage') before rendering it.
*/
export function RevokeInviteButton({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onRevoke() {
    setBusy(true);
    try {
      await revokeInvite(code);
      toast.success("Invite revoked");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onRevoke}
      disabled={busy}
      aria-label="Revoke invite"
      className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(245,239,225,0.12)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)] transition-colors hover:border-[rgba(220,38,38,0.4)] hover:text-[#f87171] disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      )}
      Revoke
    </button>
  );
}
