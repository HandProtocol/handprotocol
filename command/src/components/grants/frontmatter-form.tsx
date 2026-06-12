"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Save, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  updateGrantFrontmatter,
  updateGrantStatus,
  updateGrantFitScore,
} from "@/lib/grants/actions";
import {
  GRANT_STATUSES,
  type GrantFrontmatter,
  type GrantStatus,
} from "@/lib/grants/types";
import { StatusChip } from "@/components/kanban/status-chip";

/*
  Editable frontmatter form on the grant detail view. PRD H2.

  Status changes route through updateGrantStatus (stamps the right date
  field). Everything else routes through updateGrantFrontmatter which
  serializes the frontmatter back into the markdown file.

  Autosave is opt-in via the explicit Save button. The fit-score slider
  saves on change. Status changes save on change.
*/

type Props = {
  slug: string;
  initial: GrantFrontmatter;
};

export function FrontmatterForm({ slug, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<GrantFrontmatter>(initial);
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingFit, setSavingFit] = useState(false);

  function setField<K extends keyof GrantFrontmatter>(
    key: K,
    value: GrantFrontmatter[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    startTransition(async () => {
      try {
        // Exclude status from this save, it routes through its own
        // server action so the right date field is stamped.
        const { status: _status, fit_score: _fit, ...rest } = form;
        await updateGrantFrontmatter(slug, rest);
        toast.success("Frontmatter saved");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  async function handleStatusChange(next: GrantStatus) {
    setForm((prev) => ({ ...prev, status: next }));
    setSavingStatus(true);
    try {
      await updateGrantStatus(slug, next);
      toast.success(`Status: ${next}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status change failed");
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleFitChange(value: number | null) {
    setForm((prev) => ({ ...prev, fit_score: value ?? "" }));
    setSavingFit(true);
    try {
      await updateGrantFitScore(slug, value);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fit score save failed");
    } finally {
      setSavingFit(false);
    }
  }

  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[rgba(245,239,225,0.06)]">
        <div className="flex items-center gap-3">
          <p className="eyebrow">FRONTMATTER · EDITABLE</p>
          <StatusChip status={(form.status as GrantStatus) ?? "discovery"} />
          {(savingStatus || savingFit || pending) && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)]">
              SYNCING
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)]"
        >
          {open ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Collapse
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Expand
            </>
          )}
        </button>
      </header>

      {open && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="hud-label" htmlFor={`${slug}-status`}>
                Status
              </label>
              <select
                id={`${slug}-status`}
                value={(form.status as string) ?? "discovery"}
                onChange={(e) => handleStatusChange(e.target.value as GrantStatus)}
                disabled={savingStatus}
                className="hud-input"
              >
                {GRANT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="hud-label">Fit score (1 stretch, 5 perfect)</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleFitChange(n)}
                    disabled={savingFit}
                    className={cn(
                      "h-7 w-7 rounded border font-mono text-xs transition-all",
                      Number(form.fit_score) === n
                        ? "border-[rgba(217,119,6,0.5)] bg-[rgba(217,119,6,0.18)] text-[var(--amber-soft)] shadow-[0_0_10px_rgba(217,119,6,0.25)]"
                        : "border-[rgba(245,239,225,0.12)] bg-transparent text-[var(--ink-dim)] hover:border-[rgba(217,119,6,0.3)]",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleFitChange(null)}
                  disabled={savingFit}
                  className="h-7 px-2 rounded border border-[rgba(245,239,225,0.1)] font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)] hover:text-[var(--ink-dim)]"
                  title="Clear fit score"
                >
                  CLEAR
                </button>
              </div>
            </div>

            <Field
              label="Deadline"
              type="date"
              value={String(form.deadline ?? "")}
              onChange={(v) => setField("deadline", v)}
              placeholder="YYYY-MM-DD or leave blank for rolling"
            />

            <Field
              label="Amount requested"
              type="text"
              value={String(form.amount_requested ?? "")}
              onChange={(v) => setField("amount_requested", v)}
              placeholder="22777"
            />

            <Field
              label="Award type"
              type="text"
              value={String(form.award_type ?? "")}
              onChange={(v) => setField("award_type", v)}
              placeholder="credits | cash | in-kind | matching"
            />

            <Field
              label="Award size"
              type="text"
              value={String(form.award_size ?? "")}
              onChange={(v) => setField("award_size", v)}
              placeholder="range, units"
            />

            <Field
              label="Funder URL"
              type="url"
              value={String(form.funder_url ?? "")}
              onChange={(v) => setField("funder_url", v)}
            />

            <Field
              label="Program URL"
              type="url"
              value={String(form.program_url ?? "")}
              onChange={(v) => setField("program_url", v)}
            />

            <Field
              label="Application URL"
              type="url"
              value={String(form.application_url ?? "")}
              onChange={(v) => setField("application_url", v)}
            />

            <Field
              label="Contact"
              type="text"
              value={String(form.contact ?? "")}
              onChange={(v) => setField("contact", v)}
              placeholder="primary contact at funder"
            />

            <Field
              label="HAND lead"
              type="text"
              value={String(form.hand_lead ?? "")}
              onChange={(v) => setField("hand_lead", v)}
              placeholder="koH"
            />

            <Field
              label="Reciprocate group"
              type="text"
              value={String(form.reciprocate_group ?? "")}
              onChange={(v) => setField("reciprocate_group", v)}
              placeholder="mystic-hearts | mesquitos | hand-foundation"
            />

            <Field
              label="Discovered on"
              type="date"
              value={String(form.discovered_on ?? "")}
              onChange={(v) => setField("discovered_on", v)}
            />

            <Field
              label="Submitted on"
              type="date"
              value={String(form.submitted_on ?? "")}
              onChange={(v) => setField("submitted_on", v)}
            />

            <Field
              label="Decided on"
              type="date"
              value={String(form.decided_on ?? "")}
              onChange={(v) => setField("decided_on", v)}
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[rgba(245,239,225,0.06)]">
            <p className="text-[10px] text-[var(--ink-faint)] font-mono uppercase tracking-[0.18em]">
              MARKDOWN FIRST · SUPABASE MIRRORS
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md border border-[rgba(217,119,6,0.45)] bg-transparent px-3 py-1.5 text-xs text-[var(--amber-soft)] hover:bg-[rgba(217,119,6,0.08)] transition-colors disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {pending ? "Saving..." : "Save frontmatter"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: "text" | "date" | "url";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="hud-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="hud-input"
      />
    </div>
  );
}
