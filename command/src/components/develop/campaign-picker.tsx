"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Layers } from "lucide-react";
import { assignBizLeadCampaign } from "@/lib/develop/actions";
import type { BizCampaign } from "@/lib/develop/types";

/*
  Assign (or clear) a lead's campaign from its detail page. Markdown-first under
  the hood: assignBizLeadCampaign writes the campaign slug to the lead's
  frontmatter, then upserts. "current" is the lead's existing campaign slug.
*/

export function CampaignPicker({
  slug,
  campaigns,
  current,
}: {
  slug: string;
  campaigns: BizCampaign[];
  current: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    setValue(next);
    startTransition(async () => {
      try {
        await assignBizLeadCampaign(slug, next || null);
        toast.success(next ? "Assigned to campaign" : "Campaign cleared");
        router.refresh();
      } catch (err) {
        setValue(current ?? "");
        toast.error(err instanceof Error ? err.message : "Could not assign");
      }
    });
  }

  return (
    <div className="panel p-4 space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
        Campaign
      </p>
      <div className="flex items-center gap-2">
        <Layers
          className="h-4 w-4 shrink-0 text-[var(--ink-faint)]"
          aria-hidden
        />
        <select
          value={value}
          onChange={(e) => change(e.target.value)}
          disabled={pending || campaigns.length === 0}
          aria-label="Assign campaign"
          className="flex-1 rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[rgba(217,119,6,0.4)] focus:outline-none disabled:opacity-50"
        >
          <option value="">No campaign</option>
          {campaigns.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        {pending && (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-[var(--amber-soft)]"
            aria-hidden
          />
        )}
      </div>
      {campaigns.length === 0 && (
        <p className="text-xs text-[var(--ink-dim)]">
          No campaigns yet. Create one on the Campaigns tab.
        </p>
      )}
    </div>
  );
}
