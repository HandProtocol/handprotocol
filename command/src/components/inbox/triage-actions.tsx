"use client";

/*
  Inline triage panel for a single inbox item. Three outcomes:
  becomes grant, becomes funder, or discard with a reason. Each
  outcome reveals a small inline form so the operator does not
  context-switch to a separate page.
*/

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  triageInboxToGrant,
  triageInboxToFunder,
  discardInboxItem,
  reopenInboxItem,
} from "@/lib/inbox/actions";
import type { InboxItem } from "@/lib/inbox/types";

type Outcome = "grant" | "funder" | "discard" | null;

export function TriageActions({ item }: { item: InboxItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<Outcome>(null);

  // Defaults for the inline forms, prefilled from the captured item.
  const seedTitle = item.title ?? "";
  const seedUrl = item.url ?? "";

  const [grantName, setGrantName] = useState(seedTitle);
  const [grantFunder, setGrantFunder] = useState("");
  const [grantUrl, setGrantUrl] = useState(seedUrl);

  const [funderName, setFunderName] = useState(seedTitle);
  const [funderUrl, setFunderUrl] = useState(seedUrl);
  const [funderNotes, setFunderNotes] = useState("");

  const [reason, setReason] = useState("");

  function reset() {
    setOutcome(null);
  }

  function handleGrant() {
    if (!grantName.trim() || !grantFunder.trim()) {
      toast.error("Grant name and funder are required");
      return;
    }
    startTransition(async () => {
      try {
        const res = await triageInboxToGrant(item.id, {
          name: grantName,
          funder: grantFunder,
          program_url: grantUrl || undefined,
        });
        toast.success(`Grant ${res.slug} created`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not promote");
      }
    });
  }

  function handleFunder() {
    if (!funderName.trim()) {
      toast.error("Funder name is required");
      return;
    }
    startTransition(async () => {
      try {
        const res = await triageInboxToFunder(item.id, {
          name: funderName,
          funder_url: funderUrl || undefined,
          notes: funderNotes || undefined,
        });
        toast.success(`Funder ${res.slug} added`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add funder");
      }
    });
  }

  function handleDiscard() {
    if (!reason.trim()) {
      toast.error("Add a one-line reason");
      return;
    }
    startTransition(async () => {
      try {
        await discardInboxItem(item.id, reason);
        toast.success("Discarded");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not discard");
      }
    });
  }

  function handleReopen() {
    startTransition(async () => {
      try {
        await reopenInboxItem(item.id);
        toast.success("Returned to triage");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not reopen");
      }
    });
  }

  // Already triaged: offer a reopen action and show resolution.
  if (item.status !== "needs_triage") {
    return (
      <div className="space-y-2 border-t border-[rgba(245,239,225,0.06)] pt-3">
        <p className="text-xs text-[var(--ink-dim)]">
          {item.resolution_notes ?? "No resolution note."}
          {item.resolved_slug && (
            <>
              {" "}
              <span className="font-mono text-[var(--amber-soft)]">
                {item.resolved_slug}
              </span>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={handleReopen}
          disabled={pending}
          className="rounded-md border border-[rgba(245,239,225,0.15)] px-2.5 py-1 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)]"
        >
          Return to triage
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-[rgba(245,239,225,0.06)] pt-3">
      {outcome === null && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOutcome("grant")}
            className="rounded-md border border-[rgba(217,119,6,0.4)] bg-[rgba(217,119,6,0.08)] px-3 py-1.5 text-xs font-medium text-[var(--amber-soft)] hover:bg-[rgba(217,119,6,0.16)] transition-colors"
          >
            Becomes grant
          </button>
          <button
            type="button"
            onClick={() => setOutcome("funder")}
            className="rounded-md border border-[rgba(217,119,6,0.4)] bg-[rgba(217,119,6,0.08)] px-3 py-1.5 text-xs font-medium text-[var(--amber-soft)] hover:bg-[rgba(217,119,6,0.16)] transition-colors"
          >
            Becomes funder
          </button>
          <button
            type="button"
            onClick={() => setOutcome("discard")}
            className="rounded-md border border-[rgba(220,38,38,0.4)] px-3 py-1.5 text-xs text-[#fda4a4] hover:bg-[rgba(220,38,38,0.08)]"
          >
            Discard
          </button>
        </div>
      )}

      {outcome === "grant" && (
        <div className="space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <label className="hud-label" htmlFor={`grant-name-${item.id}`}>
                GRANT · NAME
              </label>
              <input
                id={`grant-name-${item.id}`}
                value={grantName}
                onChange={(e) => setGrantName(e.target.value)}
                className="hud-input"
                placeholder="e.g. Trinity Builders"
              />
            </div>
            <div className="space-y-1">
              <label className="hud-label" htmlFor={`grant-funder-${item.id}`}>
                FUNDER
              </label>
              <input
                id={`grant-funder-${item.id}`}
                value={grantFunder}
                onChange={(e) => setGrantFunder(e.target.value)}
                className="hud-input"
                placeholder="e.g. Arcee AI"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="hud-label" htmlFor={`grant-url-${item.id}`}>
              PROGRAM · URL · OPTIONAL
            </label>
            <input
              id={`grant-url-${item.id}`}
              value={grantUrl}
              onChange={(e) => setGrantUrl(e.target.value)}
              className="hud-input"
              placeholder="https://funder.org/program"
            />
          </div>
          <ConfirmRow
            pending={pending}
            onCancel={reset}
            onConfirm={handleGrant}
            label="Create grant"
          />
        </div>
      )}

      {outcome === "funder" && (
        <div className="space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <label className="hud-label" htmlFor={`funder-name-${item.id}`}>
                FUNDER · NAME
              </label>
              <input
                id={`funder-name-${item.id}`}
                value={funderName}
                onChange={(e) => setFunderName(e.target.value)}
                className="hud-input"
                placeholder="e.g. Ford Foundation"
              />
            </div>
            <div className="space-y-1">
              <label className="hud-label" htmlFor={`funder-url-${item.id}`}>
                FUNDER · URL · OPTIONAL
              </label>
              <input
                id={`funder-url-${item.id}`}
                value={funderUrl}
                onChange={(e) => setFunderUrl(e.target.value)}
                className="hud-input"
                placeholder="https://funder.org"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="hud-label" htmlFor={`funder-notes-${item.id}`}>
              NOTES · OPTIONAL
            </label>
            <input
              id={`funder-notes-${item.id}`}
              value={funderNotes}
              onChange={(e) => setFunderNotes(e.target.value)}
              className="hud-input"
              placeholder="Why this funder fits, when to look again"
            />
          </div>
          <ConfirmRow
            pending={pending}
            onCancel={reset}
            onConfirm={handleFunder}
            label="Add funder"
          />
        </div>
      )}

      {outcome === "discard" && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="hud-label" htmlFor={`reason-${item.id}`}>
              REASON · ONE LINE
            </label>
            <input
              id={`reason-${item.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="hud-input"
              placeholder="Not a fit, wrong geography, deadline passed, etc."
              autoFocus
            />
          </div>
          <ConfirmRow
            pending={pending}
            onCancel={reset}
            onConfirm={handleDiscard}
            label="Discard"
            tone="danger"
          />
        </div>
      )}
    </div>
  );
}

function ConfirmRow({
  pending,
  onCancel,
  onConfirm,
  label,
  tone = "amber",
}: {
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  label: string;
  tone?: "amber" | "danger";
}) {
  const confirmClass =
    tone === "danger"
      ? "border-[rgba(220,38,38,0.5)] bg-[rgba(220,38,38,0.1)] text-[#fda4a4] hover:bg-[rgba(220,38,38,0.18)]"
      : "border-[rgba(217,119,6,0.45)] bg-[rgba(217,119,6,0.14)] text-[var(--amber-soft)] hover:bg-[rgba(217,119,6,0.22)]";
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-md border border-[rgba(245,239,225,0.15)] px-2.5 py-1 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)]"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className={`rounded-md border px-3 py-1 text-xs font-medium ${confirmClass} disabled:opacity-50`}
      >
        {pending ? "Working" : label}
      </button>
    </div>
  );
}
