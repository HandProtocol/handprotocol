"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, ClipboardPaste, ScanLine, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { pulse } from "@/lib/motion/anime";
import { writeGrantSectionFromAssistant } from "@/lib/assistant/actions";
import { checklistToMarkdown } from "@/lib/assistant/prompts";

/*
  RFP checklist modal. The operator pastes an RFP into the textarea, hits
  Extract, sees a parsed checklist preview, then hits Save to write the
  list as a new section in the grant markdown (heading "Requirements
  checklist").

  The route handler does the model call; this modal stays UI-only plus a
  single server-action call on Save.

  Two exports:
    - RfpModal: the modal itself, takes open/onClose props.
    - RfpButton: a self-contained trigger + modal pair, ready to drop
      into a server component without lifting state.
*/

type ChecklistItem = {
  title: string;
  description: string;
  attachment_needed: boolean;
};

type RfpModalProps = {
  open: boolean;
  onClose: () => void;
  slug: string;
};

const SECTION_HEADING = "Requirements checklist";

export function RfpModal({ open, onClose, slug }: RfpModalProps) {
  const router = useRouter();
  const [rfpText, setRfpText] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [stub, setStub] = useState(false);
  const [working, setWorking] = useState<"extract" | "save" | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  // Reset every time the modal opens. Allows reuse across multiple
  // sessions without state bleed.
  useEffect(() => {
    if (open) {
      setRfpText("");
      setChecklist(null);
      setNote(null);
      setStub(false);
    }
  }, [open]);

  // Escape closes the modal when nothing is mid-flight.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && working === null) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, working, onClose]);

  async function handlePasteClipboard() {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.readText === "function"
      ) {
        const text = await navigator.clipboard.readText();
        if (text) setRfpText(text);
      }
    } catch {
      toast.message("Clipboard not available, paste into the box");
    }
  }

  async function handleExtract() {
    setWorking("extract");
    setChecklist(null);
    setNote(null);
    setStub(false);
    try {
      const res = await fetch("/api/extract-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, rfp_text: rfpText }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          body.error ?? `Extraction call failed (${res.status})`,
        );
      }
      const data = (await res.json()) as {
        stub: boolean;
        checklist: ChecklistItem[];
        note?: string;
      };
      setChecklist(data.checklist ?? []);
      setStub(Boolean(data.stub));
      if (data.note) setNote(data.note);
      if (data.checklist.length === 0 && !data.stub) {
        toast.message(
          "No requirements detected. Try pasting a more complete RFP.",
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Extraction call failed",
      );
    } finally {
      setWorking(null);
    }
  }

  async function handleSave() {
    if (!checklist || checklist.length === 0) return;
    setWorking("save");
    try {
      const markdown = checklistToMarkdown(checklist);
      await writeGrantSectionFromAssistant(slug, SECTION_HEADING, markdown);
      if (previewRef.current) pulse(previewRef.current);
      toast.success(`Saved ${checklist.length} requirements to the grant`);
      router.refresh();
      setTimeout(() => onClose(), 600);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save checklist",
      );
    } finally {
      setWorking(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={() => {
          if (working === null) onClose();
        }}
        aria-hidden
      />

      {/* Modal panel */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-start justify-center px-4 pt-12 pb-6 transition-opacity",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Paste RFP and extract checklist"
      >
        <div className="panel relative w-full max-w-[44rem] bg-[var(--bg-2)] shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
          <header className="flex items-center justify-between border-b border-[rgba(245,239,225,0.06)] px-4 py-3">
            <div className="flex items-center gap-2">
              <ScanLine
                className="h-4 w-4 text-[var(--amber-soft)]"
                aria-hidden
              />
              <p className="eyebrow">PASTE RFP · EXTRACT CHECKLIST</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (working === null) onClose();
              }}
              className="rounded p-1 text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)]"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="space-y-3 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="hud-label" htmlFor="rfp-text">
                  RFP TEXT
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  disabled={working !== null}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--ink-dim)] hover:text-[var(--amber-soft)]"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  PASTE FROM CLIPBOARD
                </button>
              </div>
              <textarea
                id="rfp-text"
                value={rfpText}
                onChange={(e) => setRfpText(e.target.value)}
                placeholder="Paste the full text of the funder's RFP, application instructions, or program guidelines."
                className="hud-input hud-textarea"
                rows={8}
                disabled={working !== null}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                  {rfpText.length.toLocaleString()} CHARS
                </p>
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={working !== null || rfpText.trim().length < 40}
                  className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-3 py-1.5 text-sm font-medium text-[#1a1206] hover:bg-[var(--amber-soft)] transition-colors disabled:opacity-50"
                >
                  <ScanLine className="h-3.5 w-3.5" />
                  {working === "extract" ? "Extracting" : "Extract"}
                </button>
              </div>
            </div>

            {stub && (
              <div className="rounded-md border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-3">
                <p className="eyebrow text-[var(--amber-soft)]">
                  EXTRACTOR · OFFLINE
                </p>
                <p className="mt-1 text-xs text-[var(--ink-dim)]">
                  {note ??
                    "Set ANTHROPIC_API_KEY in .env.local to enable extraction."}
                </p>
              </div>
            )}

            {checklist && checklist.length > 0 && (
              <div ref={previewRef} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">PREVIEW · {checklist.length} ITEMS</p>
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                    SECTION · {SECTION_HEADING.toUpperCase()}
                  </p>
                </div>
                <ul className="panel max-h-[40vh] space-y-2 overflow-y-auto p-3">
                  {checklist.map((item, i) => (
                    <li
                      key={i}
                      className="border-b border-[rgba(245,239,225,0.04)] pb-2 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-[var(--amber-soft)]">
                          {item.attachment_needed ? "▣" : "□"}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-[var(--ink)]">
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="mt-0.5 text-xs text-[var(--ink-dim)]">
                              {item.description}
                            </p>
                          )}
                          {item.attachment_needed && (
                            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--amber-soft)]">
                              ATTACHMENT
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-[rgba(245,239,225,0.06)] pt-3">
              <button
                type="button"
                onClick={() => {
                  if (working === null) onClose();
                }}
                disabled={working !== null}
                className="rounded-md border border-[rgba(245,239,225,0.15)] px-3 py-1.5 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  working !== null ||
                  !checklist ||
                  checklist.length === 0
                }
                className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-3 py-1.5 text-sm font-medium text-[#1a1206] hover:bg-[var(--amber-soft)] transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {working === "save" ? "Saving" : "Save to grant"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Self-contained trigger + modal. Drop into any server component (no
// state lifting required).
export function RfpButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-[rgba(217,119,6,0.45)] bg-transparent px-3 py-1.5 text-sm text-[var(--amber-soft)] hover:bg-[rgba(217,119,6,0.08)] transition-colors"
      >
        <ScanLine className="h-3.5 w-3.5" aria-hidden />
        Paste RFP
      </button>
      <RfpModal open={open} onClose={() => setOpen(false)} slug={slug} />
    </>
  );
}
