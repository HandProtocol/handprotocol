"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import { createBizLead } from "@/lib/develop/actions";
import { WEBSITE_STATUSES } from "@/lib/develop/types";

/*
  New-lead intake. The operator qualifies a business on Google Maps, then pastes
  the basics plus the best reviews here. The reviews textarea is the content
  seed for the demo site, so it carries the most weight.

  createBizLead writes biz/<slug>/lead.md first (canonical), upserts the
  Supabase rows, then redirects to the detail view.
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
      {pending ? "Saving" : "Add lead"}
    </button>
  );
}

export function IntakeForm() {
  return (
    <form action={createBizLead} className="space-y-6 max-w-2xl">
      <div className="panel p-5 space-y-4">
        <p className="eyebrow">BUSINESS</p>
        <div>
          <label className={label} htmlFor="name">
            Name *
          </label>
          <input id="name" name="name" required className={field} placeholder="Joe's BBQ" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="category">
              Category
            </label>
            <input id="category" name="category" className={field} placeholder="BBQ restaurant" />
          </div>
          <div>
            <label className={label} htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" className={field} placeholder="(512) 555-0142" />
          </div>
          <div>
            <label className={label} htmlFor="city">
              City
            </label>
            <input id="city" name="city" className={field} placeholder="Austin" />
          </div>
          <div>
            <label className={label} htmlFor="state">
              State
            </label>
            <input id="state" name="state" defaultValue="TX" className={field} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="address">
            Address
          </label>
          <input id="address" name="address" className={field} placeholder="123 Manor Rd" />
        </div>
      </div>

      <div className="panel p-5 space-y-4">
        <p className="eyebrow">SIGNAL</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={label} htmlFor="google_rating">
              Google rating
            </label>
            <input
              id="google_rating"
              name="google_rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              className={field}
              placeholder="4.7"
            />
          </div>
          <div>
            <label className={label} htmlFor="reviews_count">
              Review count
            </label>
            <input
              id="reviews_count"
              name="reviews_count"
              type="number"
              min="0"
              className={field}
              placeholder="63"
            />
          </div>
          <div>
            <label className={label} htmlFor="website_status">
              Website
            </label>
            <select id="website_status" name="website_status" defaultValue="none" className={field}>
              {WEBSITE_STATUSES.map((w) => (
                <option key={w} value={w}>
                  {w === "none" ? "no website" : w === "poor" ? "poor / dated" : "has a site"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="google_url">
            Google Maps URL
          </label>
          <input id="google_url" name="google_url" className={field} placeholder="https://maps.google.com/..." />
        </div>
      </div>

      <div className="panel p-5 space-y-3">
        <p className="eyebrow">REVIEWS · CONTENT SEED</p>
        <p className="text-xs text-[var(--ink-dim)]">
          Paste the best Google reviews, one per line. Optional format:
          {" "}
          <code className="font-mono text-[var(--amber-soft)]">Maria G (5): Best brisket in town.</code>
          {" "}
          The author and rating are optional; the review text is what matters.
          These become the testimonials and ground the generated copy.
        </p>
        <textarea
          id="reviews"
          name="reviews"
          rows={8}
          className={`${field} font-mono text-xs leading-relaxed`}
          placeholder={"Maria G (5): Best brisket in south Austin, the line moves fast.\nDavid R (5): Family run, they remember your order. Worth the drive.\nThe ribs fall off the bone. Cash only but there is an ATM."}
        />
      </div>

      <SubmitButton />
    </form>
  );
}
