"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BOILERPLATE_CATEGORIES,
  CATEGORY_LABELS,
  type BoilerplateRecord,
} from "@/lib/boilerplate/types";
import {
  createBoilerplate,
  updateBoilerplate,
  deactivateBoilerplate,
  reactivateBoilerplate,
} from "@/lib/boilerplate/actions";
import { lintVoice } from "@/lib/ai-router/voice";
import { GrantMarkdown } from "@/components/grants/grant-markdown";

/*
  Snippet create/edit form. Drives the same component for both flows; the
  initial prop is null for create, present for edit. Voice rules surface
  inline as a counter, so the operator sees em dashes and forbidden
  phrases the moment they appear.
*/

export function SnippetForm({
  initial,
}: {
  initial?: BoilerplateRecord | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(
    initial?.category ?? BOILERPLATE_CATEGORIES[0],
  );
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const flags = lintVoice(content);
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      try {
        if (initial) {
          await updateBoilerplate(initial.id, fd);
          toast.success("Snippet updated");
        } else {
          await createBoilerplate(fd);
          // createBoilerplate redirects on success
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  async function handleDeactivate() {
    if (!initial) return;
    if (!confirm("Deactivate this snippet? It will be hidden from the list and the assistant.")) return;
    startTransition(async () => {
      try {
        await deactivateBoilerplate(initial.id);
        toast.success("Snippet deactivated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not deactivate");
      }
    });
  }

  async function handleReactivate() {
    if (!initial) return;
    startTransition(async () => {
      try {
        await reactivateBoilerplate(initial.id);
        toast.success("Snippet reactivated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not reactivate");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
        <div className="space-y-2">
          <label className="hud-label" htmlFor="bp-title">
            TITLE
          </label>
          <input
            id="bp-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="hud-input"
            required
            placeholder="Mission paragraph, 50 word"
          />
        </div>
        <div className="space-y-2">
          <label className="hud-label" htmlFor="bp-category">
            CATEGORY
          </label>
          <select
            id="bp-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="hud-input"
            required
          >
            {BOILERPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="hud-label" htmlFor="bp-content">
            CONTENT · MARKDOWN
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              {wordCount} word{wordCount === 1 ? "" : "s"}
            </span>
            <div className="flex items-center rounded border border-[rgba(245,239,225,0.1)] p-0.5">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={`rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                  mode === "edit"
                    ? "bg-[rgba(217,119,6,0.18)] text-[var(--amber-soft)]"
                    : "text-[var(--ink-dim)] hover:text-[var(--ink)]"
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={`rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                  mode === "preview"
                    ? "bg-[rgba(217,119,6,0.18)] text-[var(--amber-soft)]"
                    : "text-[var(--ink-dim)] hover:text-[var(--ink)]"
                }`}
              >
                Preview
              </button>
            </div>
          </div>
        </div>
        {mode === "edit" ? (
          <textarea
            id="bp-content"
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="hud-input hud-textarea"
            rows={Math.max(8, Math.min(28, content.split("\n").length + 2))}
            required
            placeholder="The snippet text. Markdown welcomed."
          />
        ) : (
          <div className="panel p-4 prose-hud">
            <GrantMarkdown content={content || "_Preview is empty._"} />
          </div>
        )}
        {flags.length > 0 && (
          <div className="rounded-md border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.04)] p-3">
            <p className="eyebrow text-[#fda4a4]">VOICE · FLAGS</p>
            <ul className="mt-2 space-y-1 text-xs text-[var(--ink-dim)]">
              {flags.slice(0, 6).map((f, i) => (
                <li key={i}>
                  <span className="font-mono uppercase tracking-[0.12em] text-[#fda4a4]">
                    {f.kind}
                  </span>{" "}
                  · &ldquo;{f.match}&rdquo;
                  {f.suggestion ? (
                    <>
                      {" "}
                      <span className="text-[var(--ink-faint)]">
                        try {`"${f.suggestion}"`}
                      </span>
                    </>
                  ) : null}
                </li>
              ))}
              {flags.length > 6 && (
                <li className="text-[var(--ink-faint)]">
                  ...and {flags.length - 6} more
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="hud-label" htmlFor="bp-tags">
            TAGS · COMMA SEPARATED
          </label>
          <input
            id="bp-tags"
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="hud-input"
            placeholder="mission, public, 50-word"
          />
        </div>
        <div className="space-y-2">
          <label className="hud-label" htmlFor="bp-notes">
            NOTES · INTERNAL
          </label>
          <input
            id="bp-notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="hud-input"
            placeholder="When to use, source doc, last reviewed"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-3 py-1.5 text-sm font-medium text-[#1a1206] hover:bg-[var(--amber-soft)] transition-colors disabled:opacity-50"
          >
            {initial ? "Save changes" : "Create snippet"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/boilerplate")}
            className="rounded-md border border-[rgba(245,239,225,0.15)] px-3 py-1.5 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)]"
          >
            Cancel
          </button>
        </div>
        {initial && (
          <div className="flex items-center gap-2">
            {initial.active ? (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={pending}
                className="rounded-md border border-[rgba(220,38,38,0.4)] px-3 py-1.5 text-sm text-[#fda4a4] hover:bg-[rgba(220,38,38,0.08)]"
              >
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReactivate}
                disabled={pending}
                className="rounded-md border border-[rgba(16,185,129,0.4)] px-3 py-1.5 text-sm text-[#7ee2c1] hover:bg-[rgba(16,185,129,0.08)]"
              >
                Reactivate
              </button>
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              v{initial.version}
            </span>
          </div>
        )}
      </div>
    </form>
  );
}
