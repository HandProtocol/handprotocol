import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { listBoilerplate } from "@/lib/boilerplate/queries";
import {
  BOILERPLATE_CATEGORIES,
  CATEGORY_LABELS,
} from "@/lib/boilerplate/types";

/*
  Boilerplate library, list view. PRD section 7.2 A2.
  Filter by category, search by title or content, sort by category then
  title. Click a row to edit. Each snippet shows word count and version.
*/

export const dynamic = "force-dynamic";

export default async function BoilerplatePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; all?: string }>;
}) {
  const params = await searchParams;
  const category = params.category;
  const q = params.q?.trim() || undefined;
  const showAll = params.all === "1";

  const snippets = await listBoilerplate({
    category,
    q,
    activeOnly: !showAll,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">
            APPROACH · BOILERPLATE · A<span className="amber">2</span>
          </p>
          <h1 className="text-2xl font-medium tracking-tight">
            Boilerplate library
          </h1>
          <p className="text-sm text-[var(--ink-dim)] max-w-prose">
            Curated snippets the drafting assistant pulls from. The mission
            paragraph, the three communities, the foundation tiers, the
            voice cheat-sheet. Version controlled. Insert into any grant
            draft.
          </p>
        </div>
        <Link
          href="/boilerplate/new"
          className="inline-flex items-center gap-2 self-start rounded-md border border-[rgba(217,119,6,0.4)] bg-[rgba(217,119,6,0.08)] px-3 py-1.5 text-sm text-[var(--amber-soft)] hover:bg-[rgba(217,119,6,0.16)] transition-colors"
        >
          <Plus className="h-4 w-4" /> New snippet
        </Link>
      </header>

      {/* Filters */}
      <form
        method="get"
        className="panel flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-2"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]"
            aria-hidden
          />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by title or content"
            className="hud-input pl-8"
          />
        </div>
        <select
          name="category"
          defaultValue={category ?? ""}
          className="hud-input md:w-56"
        >
          <option value="">All categories</option>
          {BOILERPLATE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-[var(--ink-dim)] md:w-32">
          <input
            type="checkbox"
            name="all"
            value="1"
            defaultChecked={showAll}
            className="accent-[var(--amber)]"
          />
          Show inactive
        </label>
        <button
          type="submit"
          className="rounded-md border border-[rgba(245,239,225,0.15)] px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] text-[var(--ink)] hover:bg-[rgba(245,239,225,0.04)]"
        >
          Filter
        </button>
      </form>

      {/* Results */}
      {snippets.length === 0 ? (
        <div className="panel p-6 text-sm">
          <p className="eyebrow">LIBRARY · EMPTY</p>
          <p className="mt-2 text-[var(--ink)]">
            No snippets match the filters.
          </p>
          <p className="mt-1 text-[var(--ink-dim)]">
            Adjust the search, or create the first snippet for this
            category.
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(245,239,225,0.06)] text-left font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 hidden md:table-cell">Category</th>
                <th className="px-4 py-3 hidden md:table-cell">Words</th>
                <th className="px-4 py-3 hidden md:table-cell">Version</th>
                <th className="px-4 py-3 hidden md:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody>
              {snippets.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[rgba(245,239,225,0.04)] hover:bg-[rgba(245,239,225,0.03)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/boilerplate/${s.id}`}
                      className="block text-[var(--ink)] hover:text-[var(--amber-soft)]"
                    >
                      {s.title}
                      {!s.active && (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                          INACTIVE
                        </span>
                      )}
                    </Link>
                    <p className="text-xs text-[var(--ink-dim)] line-clamp-1">
                      {s.content.slice(0, 120)}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)]">
                      {CATEGORY_LABELS[s.category] ?? s.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-[var(--ink-dim)]">
                    {s.word_count ?? 0}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-[var(--ink-dim)]">
                    v{s.version}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                    {new Date(s.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
        {snippets.length} snippet{snippets.length === 1 ? "" : "s"} ·
        canonical in supabase, mirrored to git
      </p>
    </div>
  );
}
