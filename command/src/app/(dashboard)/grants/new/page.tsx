import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createGrant } from "@/lib/grants/actions";
import { listFunders } from "@/lib/grants/queries";

/*
  New grant scaffold. PRD section 7.1 H3.

  Operator inputs the minimum to start (name, funder, optional URLs,
  discovered_on). The server action copies funding/grants/_template.md,
  writes the new markdown file with the chosen slug, upserts Supabase,
  and redirects to the detail view.
*/

export const dynamic = "force-dynamic";

export default async function NewGrantPage() {
  const funders = await listFunders();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">
          <span className="amber">H</span> · NEW GRANT · SIGNAL
        </p>
        <h1 className="text-2xl font-medium tracking-tight">Scaffold a grant</h1>
        <p className="text-sm text-[var(--ink-dim)]">
          A new markdown file at <code className="font-mono text-xs">funding/grants/&lt;slug&gt;.md</code>{" "}
          with the standard template, plus a row in the pipeline. Status
          defaults to discovery, the rest is editable on the detail view.
        </p>
      </header>

      <Link
        href="/grants"
        className="inline-flex items-center gap-2 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to pipeline
      </Link>

      <form
        action={createGrant}
        className="panel p-5 space-y-4"
      >
        <div>
          <label htmlFor="name" className="hud-label">
            Grant name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Arcee AI · Trinity Builders Program"
            className="hud-input"
          />
          <p className="mt-1 text-[10px] text-[var(--ink-faint)] font-mono uppercase tracking-[0.18em]">
            FUNDER · PROGRAM
          </p>
        </div>

        <div>
          <label htmlFor="funder" className="hud-label">
            Funder
          </label>
          <input
            id="funder"
            name="funder"
            type="text"
            required
            list="known-funders"
            placeholder="Arcee AI"
            className="hud-input"
          />
          <datalist id="known-funders">
            {funders.map((f) => (
              <option key={f.id} value={f.name} />
            ))}
          </datalist>
          <p className="mt-1 text-[10px] text-[var(--ink-faint)] font-mono uppercase tracking-[0.18em]">
            EXISTING OR NEW · WILL UPSERT INTO COMMAND.FUNDERS
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="program_url" className="hud-label">
              Program URL
            </label>
            <input
              id="program_url"
              name="program_url"
              type="url"
              placeholder="https://..."
              className="hud-input"
            />
          </div>
          <div>
            <label htmlFor="funder_url" className="hud-label">
              Funder URL
            </label>
            <input
              id="funder_url"
              name="funder_url"
              type="url"
              placeholder="https://..."
              className="hud-input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="discovered_on" className="hud-label">
            Discovered on
          </label>
          <input
            id="discovered_on"
            name="discovered_on"
            type="date"
            defaultValue={today}
            className="hud-input"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[rgba(245,239,225,0.06)]">
          <p className="text-[10px] text-[var(--ink-faint)] font-mono uppercase tracking-[0.18em]">
            CANONICAL · MARKDOWN FIRST
          </p>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-4 py-2 text-sm font-medium text-[#1a1208] hover:bg-[var(--amber-soft)] hover:shadow-[0_0_14px_var(--amber-glow)] transition-all"
          >
            Create grant
          </button>
        </div>
      </form>
    </div>
  );
}
