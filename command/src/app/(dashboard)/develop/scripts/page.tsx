import Link from "next/link";
import { ArrowLeft, ScrollText, Mail } from "lucide-react";
import { listColdTemplates } from "@/lib/develop/templates";
import { GrantMarkdown } from "@/components/grants/grant-markdown";
import { CopyButton } from "@/components/develop/copy-button";
import type { ColdScriptSurface } from "@/lib/develop/types";

/*
  Cold-outreach scripts. A read/copy surface under the Develop pillar so reps
  have the canonical cold templates in front of them while working the phones
  and inbox. The templates are pure markdown at biz/_templates/cold/*.md, with
  YAML frontmatter parsed by gray-matter in the loader. No Supabase mirror,
  the files are the source.

  Codes defensively for a missing/empty template dir, same posture as the
  deadlines page: an empty loader return renders a quiet "nothing yet" state.
*/

export const dynamic = "force-dynamic";

// Human label + HUD eyebrow per surface, in the same register as the kanban
// column eyebrows.
const SURFACE_META: Record<
  ColdScriptSurface,
  { label: string; eyebrow: string }
> = {
  email: { label: "Email", eyebrow: "INBOX" },
  call: { label: "Call", eyebrow: "LIVE" },
  voicemail: { label: "Voicemail", eyebrow: "VM" },
  dm: { label: "DM", eyebrow: "SOCIAL" },
};

export default async function ColdScriptsPage() {
  const templates = await listColdTemplates();

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          href="/develop"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to Develop
        </Link>
        <div className="space-y-2">
          <p className="eyebrow">
            <span className="amber">D</span> · DEVELOP · COLD SCRIPTS
          </p>
          <h1 className="text-2xl font-medium tracking-tight">
            <ScrollText className="mr-2 -mt-1 inline-block h-5 w-5" aria-hidden />
            Cold outreach scripts
          </h1>
          <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
            The canonical cold templates, ready to read and copy. Swap the{" "}
            <code className="font-mono text-xs text-[var(--amber-soft)]">
              [BRACKET]
            </code>{" "}
            tokens for the lead&apos;s details before you send.
            {templates.length > 0 && (
              <>
                {" "}
                {templates.length} script{templates.length === 1 ? "" : "s"} on
                file.
              </>
            )}
          </p>
        </div>
      </header>

      {templates.length === 0 && (
        <div className="panel p-6 text-center space-y-2">
          <ScrollText className="mx-auto h-5 w-5 text-[var(--ink-faint)]" aria-hidden />
          <p className="eyebrow">SCRIPTS · EMPTY</p>
          <p className="text-sm text-[var(--ink-dim)] max-w-md mx-auto">
            No cold scripts yet. They live as markdown at{" "}
            <code className="font-mono text-xs">biz/_templates/cold/</code> and
            show up here once authored.
          </p>
        </div>
      )}

      {templates.map((tpl) => {
        const meta = SURFACE_META[tpl.surface];
        return (
          <section
            key={tpl.slug}
            aria-labelledby={`script-${tpl.slug}`}
            className="panel overflow-hidden p-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(245,239,225,0.06)] px-4 py-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-[rgba(217,119,6,0.4)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)]">
                    {meta.label}
                  </span>
                  {tpl.status && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                      {tpl.status}
                    </span>
                  )}
                </div>
                <h2
                  id={`script-${tpl.slug}`}
                  className="text-sm font-medium text-[var(--ink)]"
                >
                  {tpl.title}
                </h2>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                  {meta.eyebrow} · {tpl.variant}
                  {tpl.updated ? ` · ${tpl.updated}` : ""}
                </p>
              </div>
              <CopyButton text={tpl.body} label="Copy script" />
            </div>

            {tpl.subjectOptions.length > 0 && (
              <div className="border-b border-[rgba(245,239,225,0.06)] px-4 py-3 space-y-2">
                <p className="display-eyebrow">
                  <Mail className="mr-1.5 -mt-0.5 inline-block h-3 w-3" aria-hidden />
                  Subject options
                </p>
                <ul className="space-y-1.5">
                  {tpl.subjectOptions.map((subject, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink)]">
                        {subject}
                      </span>
                      <CopyButton text={subject} label="Copy" />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="prose-hud px-4 py-4">
              <GrantMarkdown content={tpl.body} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
