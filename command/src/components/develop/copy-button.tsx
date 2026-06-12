"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Copy-to-clipboard control for the cold-script bodies on /develop/scripts.
  Minimal: writes the passed text to the clipboard, flips to a confirmed state
  for a beat, and toasts. Falls back to a toast nudge when the Clipboard API is
  unavailable (older browsers, non-secure contexts), same defensive posture as
  the grants RFP modal's clipboard read.
*/

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied to clipboard");
        window.setTimeout(() => setCopied(false), 1600);
      } else {
        toast.message("Clipboard not available, select the text to copy");
      }
    } catch {
      toast.error("Couldn't copy, select the text manually");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${label} script`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-[rgba(245,239,225,0.12)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)] transition-colors hover:border-[rgba(217,119,6,0.35)] hover:text-[var(--ink)]",
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[#86efac]" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
