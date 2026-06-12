import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBoilerplate } from "@/lib/boilerplate/queries";
import { CATEGORY_LABELS } from "@/lib/boilerplate/types";
import { SnippetForm } from "@/components/boilerplate/snippet-form";

export const dynamic = "force-dynamic";

export default async function EditBoilerplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snippet = await getBoilerplate(id);
  if (!snippet) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/boilerplate"
        className="inline-flex items-center gap-2 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to library
      </Link>
      <header className="space-y-2">
        <p className="eyebrow">
          APPROACH · BOILERPLATE ·{" "}
          <span className="amber">
            {(CATEGORY_LABELS[snippet.category] ?? snippet.category).toUpperCase()}
          </span>
        </p>
        <h1 className="text-2xl font-medium tracking-tight">{snippet.title}</h1>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          v{snippet.version} · {snippet.word_count ?? 0} words · last touched{" "}
          {new Date(snippet.updated_at).toLocaleString()}
        </p>
      </header>
      <SnippetForm initial={snippet} />
    </div>
  );
}
