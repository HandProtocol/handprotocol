"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, ExternalLink } from "lucide-react";
import type { SiteCopy } from "@/lib/develop/types";

/*
  Demo-site generator + preview. Calls /api/develop/generate-site, which turns
  the lead's reviews into a static one-pager and writes it to web/demos/<slug>/.
  The response carries the rendered HTML so we can preview it inline via an
  iframe srcDoc (the file itself lives in the public-site repo, not this app).
*/

type GenResult = {
  source: "assistant" | "fallback";
  demo_url: string;
  html: string;
  copy: SiteCopy;
};

export function GeneratePanel({
  slug,
  initialDemoUrl,
  hasReviews,
}: {
  slug: string;
  initialDemoUrl: string | null;
  hasReviews: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const demoUrl = result?.demo_url ?? initialDemoUrl;

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/develop/generate-site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult(data as GenResult);
      toast.success(
        data.source === "assistant"
          ? "Site generated from reviews"
          : "Site built (assistant offline, used reviews directly)",
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
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          {busy ? "Building" : demoUrl ? "Regenerate site" : "Generate site"}
        </button>

        {demoUrl && (
          <a
            href={demoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[rgba(245,239,225,0.12)] px-3 py-2 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[rgba(217,119,6,0.35)] transition-colors"
            title="Live after the public site deploys"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="font-mono">{demoUrl}</span>
          </a>
        )}
      </div>

      {!hasReviews && (
        <p className="text-xs text-[var(--amber-soft)]">
          No reviews captured yet. The site will use a plain template. Add
          reviews for a stronger result.
        </p>
      )}

      {result?.source && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          SOURCE ·{" "}
          <span className="text-[var(--amber-soft)]">
            {result.source === "assistant" ? "ASSISTANT" : "FALLBACK"}
          </span>
          {" · "}LIVE URL GOES PUBLIC ON NEXT DEPLOY
        </p>
      )}

      {result?.html && (
        <div className="panel overflow-hidden p-0">
          <div className="border-b border-[rgba(245,239,225,0.06)] px-3 py-2">
            <span className="display-eyebrow">PREVIEW</span>
          </div>
          <iframe
            title="Demo site preview"
            srcDoc={result.html}
            className="h-[600px] w-full bg-white"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
