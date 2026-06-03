"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, X, AlertTriangle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateGrantStatus } from "@/lib/grants/actions";
import type { GrantFrontmatter } from "@/lib/grants/types";

/*
  Pre-submit checklist. Rendered before the status flip is confirmed.

  Derives a list of checks from the grant markdown and the current
  attachment count. Operator confirms with "Confirm and submit", which
  calls updateGrantStatus to flip the status to submitted. The status
  action runs the submission-archive snapshot first; if that fails the
  flip aborts with the underlying error.

  Required sections list is intentionally small: every grant template
  carries at least these two H2s. Extend as the template evolves.
*/

const REQUIRED_SECTIONS = ["TL;DR", "Fit assessment"] as const;

type Section = { heading: string; content: string };

export type SubmitChecklistProps = {
  slug: string;
  frontmatter: GrantFrontmatter;
  sections: Section[];
  attachmentCount: number;
  onCancel?: () => void;
  onSubmitted?: () => void;
};

type CheckItem = {
  id: string;
  label: string;
  passed: boolean;
  hint?: string;
};

function buildChecks(props: SubmitChecklistProps): CheckItem[] {
  const { frontmatter, sections, attachmentCount } = props;
  const headingMap = new Map(
    sections.map((s) => [s.heading.toLowerCase(), s.content.trim()]),
  );

  const sectionChecks: CheckItem[] = REQUIRED_SECTIONS.map((heading) => {
    const content = headingMap.get(heading.toLowerCase()) ?? "";
    return {
      id: `section-${heading}`,
      label: `${heading} section has content`,
      passed: content.length > 0,
      hint: content.length === 0 ? "Add at least one line to this section." : undefined,
    };
  });

  return [
    ...sectionChecks,
    {
      id: "attachments",
      label: "At least one attachment uploaded",
      passed: attachmentCount > 0,
      hint:
        attachmentCount === 0
          ? "Upload the application PDF or supporting documents in the vault."
          : undefined,
    },
    {
      id: "funder",
      label: "Funder field populated",
      passed: Boolean(frontmatter.funder && String(frontmatter.funder).trim()),
      hint:
        frontmatter.funder && String(frontmatter.funder).trim()
          ? undefined
          : "Edit the frontmatter form on the grant detail view.",
    },
    {
      id: "application-url",
      label: "Application URL populated",
      passed: Boolean(
        frontmatter.application_url && String(frontmatter.application_url).trim(),
      ),
      hint:
        frontmatter.application_url && String(frontmatter.application_url).trim()
          ? undefined
          : "Paste the funder's portal link into the application_url field.",
    },
  ];
}

export function SubmitChecklist(props: SubmitChecklistProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [force, setForce] = useState(false);

  const checks = useMemo(() => buildChecks(props), [props]);
  const failingCount = checks.filter((c) => !c.passed).length;
  const allPassed = failingCount === 0;
  const canSubmit = allPassed || force;

  function handleConfirm() {
    if (!canSubmit) return;
    startTransition(async () => {
      try {
        await updateGrantStatus(props.slug, "submitted");
        toast.success("Submitted. Archive snapshot written.");
        props.onSubmitted?.();
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Submit failed. The status was not changed.",
        );
      }
    });
  }

  return (
    <section className="panel space-y-4 p-5" aria-label="Submission checklist">
      <header className="space-y-1">
        <p className="eyebrow">
          PRESUBMIT · <span className="amber">CHECKLIST</span>
        </p>
        <h2 className="text-base font-medium tracking-tight">
          Confirm before flipping to submitted
        </h2>
        <p className="text-xs text-[var(--ink-dim)]">
          The status flip writes a frozen snapshot of the grant markdown
          and every attachment to {`_submissions/<slug>-<timestamp>/`} so the
          record of what was sent stays exact.
        </p>
      </header>

      <ul className="space-y-2">
        {checks.map((c) => (
          <li
            key={c.id}
            className={cn(
              "flex items-start gap-3 rounded-md border px-3 py-2",
              c.passed
                ? "border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.04)]"
                : "border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.04)]",
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                c.passed
                  ? "bg-[rgba(16,185,129,0.2)] text-[#86efac]"
                  : "bg-[rgba(220,38,38,0.2)] text-[#fda4a4]",
              )}
              aria-hidden
            >
              {c.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--ink)]">{c.label}</p>
              {!c.passed && c.hint && (
                <p className="mt-0.5 text-[11px] text-[var(--ink-dim)]">
                  {c.hint}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!allPassed && (
        <div className="flex items-start gap-2 rounded-md border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.05)] px-3 py-2 text-xs text-[var(--ink)]">
          <AlertTriangle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warn)]"
            aria-hidden
          />
          <div className="space-y-1.5">
            <p>
              {failingCount === 1
                ? "One check is failing."
                : `${failingCount} checks are failing.`}{" "}
              Fix what you can, or override if you have already submitted out of band.
            </p>
            <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)]">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="h-3 w-3 accent-[var(--amber)]"
              />
              Override and submit anyway
            </label>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={props.onCancel}
          disabled={pending}
          className="rounded-md px-3 py-1.5 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)] disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit || pending}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium",
            "bg-[var(--amber)] text-[#1a1208]",
            "hover:bg-[var(--amber-soft)] hover:shadow-[0_0_14px_var(--amber-glow)]",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none",
            "transition-all",
          )}
        >
          <Send className="h-3.5 w-3.5" aria-hidden />
          {pending ? "Submitting" : "Confirm and submit"}
        </button>
      </div>
    </section>
  );
}
