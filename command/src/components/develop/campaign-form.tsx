"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import { createBizCampaign } from "@/lib/develop/actions";

/*
  New-campaign intake. Campaigns are the batch a set of leads is worked in
  (a neighborhood sweep, a vertical, a week's outreach). Command-only, no
  markdown canonical. createBizCampaign disambiguates the slug, inserts the
  row, then redirects back to the campaigns index.
*/

const field =
  "w-full rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(217,119,6,0.4)] focus:outline-none";
const label =
  "block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)] mb-1.5";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-4 py-2 text-sm font-medium text-[#1a1208] hover:bg-[var(--amber-soft)] hover:shadow-[0_0_14px_var(--amber-glow)] transition-all disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Plus className="h-4 w-4" aria-hidden />
      )}
      {pending ? "Saving" : "New campaign"}
    </button>
  );
}

export function CampaignForm() {
  return (
    <form action={createBizCampaign} className="panel p-5 space-y-4">
      <p className="eyebrow">NEW CAMPAIGN</p>
      <div>
        <label className={label} htmlFor="name">
          Name *
        </label>
        <input
          id="name"
          name="name"
          required
          className={field}
          placeholder="East Austin sweep"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="region">
            Region
          </label>
          <input
            id="region"
            name="region"
            className={field}
            placeholder="78702"
          />
        </div>
        <div>
          <label className={label} htmlFor="goal">
            Goal (leads)
          </label>
          <input
            id="goal"
            name="goal"
            type="number"
            min="0"
            className={field}
            placeholder="20"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-4 items-end">
        <div>
          <label className={label} htmlFor="color">
            Color
          </label>
          <input
            id="color"
            name="color"
            type="color"
            defaultValue="#d97706"
            className="h-10 w-full rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-1 py-1 focus:border-[rgba(217,119,6,0.4)] focus:outline-none"
            aria-label="Campaign color"
          />
        </div>
        <div>
          <label className={label} htmlFor="notes">
            Notes
          </label>
          <input
            id="notes"
            name="notes"
            className={field}
            placeholder="Door-knock follow-up after the farmers market"
          />
        </div>
      </div>
      <SubmitButton />
    </form>
  );
}
