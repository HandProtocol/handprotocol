import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SnippetForm } from "@/components/boilerplate/snippet-form";

export const dynamic = "force-dynamic";

export default function NewBoilerplatePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/boilerplate"
        className="inline-flex items-center gap-2 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to library
      </Link>
      <header className="space-y-1">
        <p className="eyebrow">
          APPROACH · BOILERPLATE · <span className="amber">NEW</span>
        </p>
        <h1 className="text-2xl font-medium tracking-tight">New snippet</h1>
        <p className="text-sm text-[var(--ink-dim)]">
          One paragraph or list, ready to insert into any grant draft. The
          voice linter watches as you type.
        </p>
      </header>
      <SnippetForm />
    </div>
  );
}
