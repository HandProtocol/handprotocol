"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, Edit3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateGrantSection } from "@/lib/grants/actions";
import { GrantMarkdown } from "./grant-markdown";
import { AssistDrawer } from "./assist-drawer";

/*
  Editable section tab. Each H2 in the markdown body shows as a tab; the
  active tab renders an editor (textarea) and a preview. Autosave fires
  on a 1s debounce after the last keystroke.

  Phase 2 adds an Assist button per section that opens the drafting
  assistant drawer. The drawer writes accepted drafts back via a server
  action and updates this component's local state so the textarea
  reflects the new content immediately.

  This is intentionally a textarea, not a rich editor. The markdown stays
  human-readable in git, the operator can drop in lists and headings via
  plain Markdown syntax.
*/

type Section = { heading: string; content: string };

export function SectionEditor({
  slug,
  sections,
}: {
  slug: string;
  sections: Section[];
}) {
  const [active, setActive] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of sections) initial[s.heading] = s.content;
    return initial;
  });
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistSection, setAssistSection] = useState<string | null>(null);
  const [_pending, startTransition] = useTransition();

  // One timer per section so switching tabs doesn't drop a pending save.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  function scheduleSave(heading: string, content: string) {
    if (timers.current[heading]) clearTimeout(timers.current[heading]!);
    timers.current[heading] = setTimeout(() => {
      startTransition(async () => {
        try {
          await updateGrantSection(slug, heading, content);
          setSavedAt(new Date().toLocaleTimeString());
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : `Save failed for "${heading}"`,
          );
        }
      });
    }, 1000);
  }

  useEffect(() => {
    return () => {
      for (const t of Object.values(timers.current)) {
        if (t) clearTimeout(t);
      }
    };
  }, []);

  if (sections.length === 0) {
    return (
      <section className="panel p-5">
        <p className="eyebrow">DRAFT · EMPTY</p>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          This grant has no H2 sections yet. Edit the markdown file at
          <code className="font-mono text-xs ml-1">funding/grants/{slug}.md</code>{" "}
          to add them.
        </p>
      </section>
    );
  }

  const current = sections[active];
  const draft = drafts[current.heading] ?? "";

  function openAssist(heading: string) {
    setAssistSection(heading);
    setAssistOpen(true);
  }

  function handleAssistAccept(newContent: string) {
    if (!assistSection) return;
    setDrafts((prev) => ({ ...prev, [assistSection]: newContent }));
    // The drawer's accept action already wrote the markdown via the
    // dedicated server-action helper, so we skip the autosave timer
    // here and just stamp the save indicator.
    setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <section className="panel overflow-hidden">
      <header className="border-b border-[rgba(245,239,225,0.06)]">
        <div className="flex items-center justify-between px-4 py-2.5">
          <p className="eyebrow">DRAFT · SECTIONS · AUTOSAVE 1s</p>
          <div className="flex items-center gap-2">
            {savedAt && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                SAVED · {savedAt}
              </span>
            )}
            <div className="flex items-center rounded border border-[rgba(245,239,225,0.1)] p-0.5">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                  mode === "edit"
                    ? "bg-[rgba(217,119,6,0.18)] text-[var(--amber-soft)]"
                    : "text-[var(--ink-dim)] hover:text-[var(--ink)]",
                )}
              >
                <Edit3 className="h-3 w-3" /> EDIT
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                  mode === "preview"
                    ? "bg-[rgba(217,119,6,0.18)] text-[var(--amber-soft)]"
                    : "text-[var(--ink-dim)] hover:text-[var(--ink)]",
                )}
              >
                <Eye className="h-3 w-3" /> PREVIEW
              </button>
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1 px-3 pb-2">
          {sections.map((s, i) => (
            <div key={s.heading} className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs transition-colors",
                  i === active
                    ? "bg-[rgba(217,119,6,0.18)] text-[var(--amber-soft)]"
                    : "text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)]",
                )}
              >
                {s.heading}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActive(i);
                  openAssist(s.heading);
                }}
                title={`Open the drafting assistant for "${s.heading}"`}
                aria-label={`Assist on ${s.heading}`}
                className={cn(
                  "rounded p-1 transition-colors",
                  i === active
                    ? "text-[var(--amber-soft)] hover:bg-[rgba(217,119,6,0.12)]"
                    : "text-[var(--ink-faint)] hover:text-[var(--amber-soft)] hover:bg-[rgba(245,239,225,0.04)]",
                )}
              >
                <Sparkles className="h-3 w-3" />
              </button>
            </div>
          ))}
        </nav>
      </header>

      <div className="p-4">
        {mode === "edit" ? (
          <textarea
            value={draft}
            onChange={(e) => {
              const v = e.target.value;
              setDrafts((prev) => ({ ...prev, [current.heading]: v }));
              scheduleSave(current.heading, v);
            }}
            className="hud-input hud-textarea"
            placeholder={`Write the ${current.heading} section here. Markdown welcomed: lists, links, headings.`}
            rows={Math.max(10, Math.min(40, draft.split("\n").length + 2))}
          />
        ) : (
          <div className="prose-hud">
            <GrantMarkdown content={draft || current.content} />
          </div>
        )}
      </div>

      <AssistDrawer
        open={assistOpen && assistSection !== null}
        onClose={() => setAssistOpen(false)}
        slug={slug}
        section={assistSection ?? ""}
        onAccept={handleAssistAccept}
      />
    </section>
  );
}
