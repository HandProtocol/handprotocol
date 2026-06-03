"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Sparkles, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { pulse } from "@/lib/motion/anime";
import { GrantMarkdown } from "./grant-markdown";
import {
  setAssistantRunAccepted,
  writeGrantSectionFromAssistant,
} from "@/lib/assistant/actions";
import { lintVoice } from "@/lib/ai-router/voice";

/*
  Slide-out drawer for the drafting assistant. Opens from the right when
  the operator clicks Assist on a section in section-editor.tsx.

  Flow:
    1. Drawer opens with a textarea for the operator's question.
    2. On Run, POST to /api/draft-answer with { slug, section, question }.
    3. Render the draft as markdown with the grounding snippet chips.
    4. Accept replaces the section content in the markdown via a server
       action, fires the amber pulse, marks the run accepted.
    5. Reject closes the drawer and marks the run rejected. The drawer
       also exits on the close button or the Escape key.

  Voice rules are linted on the draft text; flags surface as inline chips
  so the operator sees voice violations before accepting.
*/

type SnippetUsed = {
  slug: string;
  title: string;
  category: string;
};

type DraftResponse = {
  stub: boolean;
  draft: string;
  snippets_used: SnippetUsed[];
  run_id: string | null;
};

type AssistDrawerProps = {
  open: boolean;
  onClose: () => void;
  slug: string;
  section: string;
  // Called when the operator accepts a draft. Parent updates its local
  // state so the textarea reflects the new content right away.
  onAccept: (newContent: string) => void;
};

export function AssistDrawer({
  open,
  onClose,
  slug,
  section,
  onAccept,
}: AssistDrawerProps) {
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [snippets, setSnippets] = useState<SnippetUsed[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [stub, setStub] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  // Reset state every time the drawer opens fresh. Also focus the
  // textarea so the operator can start typing immediately.
  useEffect(() => {
    if (open) {
      setQuestion("");
      setDraft(null);
      setSnippets([]);
      setRunId(null);
      setStub(false);
    }
  }, [open, section]);

  // Close on Escape, but only when no async work is mid-flight.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading && !accepting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, accepting, onClose]);

  async function handleRun() {
    setLoading(true);
    setDraft(null);
    try {
      const res = await fetch("/api/draft-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, section, question: question.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `Drafting call failed (${res.status})`);
      }
      const data = (await res.json()) as DraftResponse;
      setDraft(data.draft);
      setSnippets(data.snippets_used);
      setRunId(data.run_id);
      setStub(data.stub);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Drafting call failed",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!draft || stub) return;
    setAccepting(true);
    try {
      await writeGrantSectionFromAssistant(slug, section, draft);
      await setAssistantRunAccepted(runId, true);
      onAccept(draft);
      if (previewRef.current) pulse(previewRef.current);
      toast.success(`Accepted draft for ${section}`);
      // Brief dwell so the operator sees the pulse, then close.
      setTimeout(() => onClose(), 600);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not accept draft",
      );
    } finally {
      setAccepting(false);
    }
  }

  async function handleReject() {
    if (runId) {
      try {
        await setAssistantRunAccepted(runId, false);
      } catch {
        // The cost dashboard does not collapse over a single missed
        // rejection flag, so we swallow this quietly.
      }
    }
    onClose();
  }

  const voiceFlags = draft ? lintVoice(draft) : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={() => {
          if (!loading && !accepting) onClose();
        }}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-[100dvh] w-full max-w-[28rem] border-l border-[rgba(245,239,225,0.08)] bg-[var(--bg-2)] shadow-[-12px_0_40px_rgba(0,0,0,0.45)] transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="Drafting assistant"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-[rgba(245,239,225,0.06)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--amber-soft)]" aria-hidden />
            <p className="eyebrow">
              ASSIST · <span className="text-[var(--amber-soft)]">{section.toUpperCase()}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!loading && !accepting) onClose();
            }}
            className="rounded p-1 text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)]"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex h-[calc(100dvh-3.25rem)] flex-col gap-3 overflow-y-auto p-4">
          <div className="space-y-2">
            <label className="hud-label" htmlFor="assist-question">
              QUESTION · OPTIONAL
            </label>
            <textarea
              id="assist-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask the assistant for a ${section.toLowerCase()} draft. Leave empty for a default first pass.`}
              className="hud-input hud-textarea"
              rows={3}
              disabled={loading || accepting}
            />
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[var(--ink-faint)] font-mono uppercase tracking-[0.18em]">
                {loading ? "WORKING" : draft ? "READY" : "IDLE"}
              </p>
              <button
                type="button"
                onClick={handleRun}
                disabled={loading || accepting}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-3 py-1.5 text-sm font-medium text-[#1a1206] hover:bg-[var(--amber-soft)] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                    Drafting
                  </>
                ) : draft ? (
                  "Run again"
                ) : (
                  "Run"
                )}
              </button>
            </div>
          </div>

          {stub && draft && (
            <div className="rounded-md border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-3">
              <p className="eyebrow text-[var(--amber-soft)]">
                ASSISTANT · OFFLINE
              </p>
              <p className="mt-1 text-xs text-[var(--ink-dim)]">
                The drafting key is not set. Below is the grounding the
                assistant would have used.
              </p>
            </div>
          )}

          {draft && (
            <>
              <div
                ref={previewRef}
                className="panel prose-hud max-h-[58vh] overflow-y-auto p-4"
              >
                <GrantMarkdown content={draft} />
              </div>

              {snippets.length > 0 && (
                <div className="space-y-1.5">
                  <p className="eyebrow">GROUNDED · SNIPPETS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {snippets.map((s) => (
                      <span
                        key={s.slug}
                        className="inline-flex items-center gap-1 rounded border border-[rgba(245,239,225,0.1)] bg-[rgba(245,239,225,0.03)] px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--ink-dim)]"
                        title={s.title}
                      >
                        <span className="text-[var(--amber-soft)]">
                          {s.category}
                        </span>
                        <span>·</span>
                        <span>{s.title}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {voiceFlags.length > 0 && (
                <div className="rounded-md border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.04)] p-3">
                  <p className="eyebrow text-[#fda4a4]">VOICE · FLAGS</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-[var(--ink-dim)]">
                    {voiceFlags.slice(0, 5).map((f, i) => (
                      <li key={i}>
                        <span className="font-mono uppercase tracking-[0.12em] text-[#fda4a4]">
                          {f.kind}
                        </span>{" "}
                        · &ldquo;{f.match}&rdquo;
                      </li>
                    ))}
                    {voiceFlags.length > 5 && (
                      <li className="text-[var(--ink-faint)]">
                        ...and {voiceFlags.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="mt-auto flex items-center justify-end gap-2 border-t border-[rgba(245,239,225,0.06)] pt-3">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={accepting}
                  className="rounded-md border border-[rgba(245,239,225,0.15)] px-3 py-1.5 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)] disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={accepting || stub}
                  className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-3 py-1.5 text-sm font-medium text-[#1a1206] hover:bg-[var(--amber-soft)] transition-colors disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  {accepting ? "Accepting" : "Accept"}
                </button>
              </div>
            </>
          )}

          {!draft && !loading && (
            <p className="text-xs text-[var(--ink-faint)]">
              The assistant grounds every draft on HAND's canonical context,
              the AI stance, the Mystic Hearts framing, and the top
              boilerplate snippets that match your question.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
