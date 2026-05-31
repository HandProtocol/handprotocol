"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { logBizTouchpoint } from "@/lib/develop/actions";
import { TOUCHPOINT_METHODS, type TouchpointMethod } from "@/lib/develop/types";

/*
  Log an outreach touchpoint against a lead. The first real outreach (call,
  walk-in, email, text) bumps a prospect/built lead to "contacted" server-side.
*/

const METHOD_LABEL: Record<TouchpointMethod, string> = {
  call: "Call",
  walk_in: "Walk-in",
  email: "Email",
  text: "Text",
  other: "Note",
};

const field =
  "rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(217,119,6,0.4)] focus:outline-none";

export function TouchpointForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<TouchpointMethod>("call");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await logBizTouchpoint(slug, method, note);
        toast.success("Touchpoint logged");
        setNote("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not log");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as TouchpointMethod)}
          className={field}
          aria-label="Method"
        >
          {TOUCHPOINT_METHODS.map((m) => (
            <option key={m} value={m}>
              {METHOD_LABEL[m]}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What happened?"
          className={`${field} flex-1`}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-[rgba(217,119,6,0.15)] border border-[rgba(217,119,6,0.35)] px-3 py-2 text-sm text-[var(--amber-soft)] hover:bg-[rgba(217,119,6,0.25)] transition-colors disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          Log
        </button>
      </div>
    </div>
  );
}
