"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, FileText, ExternalLink } from "lucide-react";

/*
  Generate the password-gated pitch page (call script + demo preview + follow-up
  form) and preview it inline. The page is written to web/demos/<slug>/pitch/
  and goes live, behind the "handme" gate, on the next public-site deploy.
*/

export function PitchPanel({
  slug,
  initialPitchUrl,
}: {
  slug: string;
  initialPitchUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [pitchUrl, setPitchUrl] = useState<string | null>(initialPitchUrl);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/develop/generate-pitch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setHtml(data.html);
      setPitchUrl(data.pitch_url);
      toast.success(
        data.source === "assistant"
          ? "Pitch page + script generated"
          : "Pitch page built (assistant offline, used the default script)",
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-4 py-2 text-sm font-medium text-[#1a1208] hover:bg-[var(--amber-soft)] hover:shadow-[0_0_14px_var(--amber-glow)] transition-all disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileText className="h-4 w-4" aria-hidden />
          )}
          {busy ? "Building" : pitchUrl ? "Regenerate pitch" : "Generate pitch page"}
        </button>

        {pitchUrl && (
          <a
            href={pitchUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[rgba(245,239,225,0.12)] px-3 py-2 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[rgba(217,119,6,0.35)] transition-colors"
            title="Gated by the handme password, live on next deploy"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="font-mono">{pitchUrl}</span>
          </a>
        )}
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
        PASSWORD · <span className="text-[var(--amber-soft)]">handme</span> · HAND THIS
        URL TO ANY CALLER
      </p>

      {html && (
        <div className="panel overflow-hidden p-0">
          <div className="border-b border-[rgba(245,239,225,0.06)] px-3 py-2">
            <span className="display-eyebrow">PITCH PREVIEW</span>
          </div>
          <iframe
            title="Pitch page preview"
            srcDoc={html}
            className="h-[600px] w-full bg-white"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      )}
    </div>
  );
}
