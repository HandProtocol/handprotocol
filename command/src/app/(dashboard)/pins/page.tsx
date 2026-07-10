import { PinsKanban } from "@/components/pins/pins-kanban";
import { listPins } from "@/lib/inspector/queries";

/*
  Feedback triage kanban. Three columns matching the schema status enum:
  Open / In progress / Resolved.

  Click a card to jump back to page review with that note preselected
  (?page=<page_url>&pin=<id>). Drag to a column to update its status
  via the server action.

  Pairs with /review for capture, triage here.
*/

export const dynamic = "force-dynamic";

export default async function PinsPage() {
  const pins = await listPins();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="display-eyebrow">
          <span className="amber">Feedback</span> from public surfaces
        </p>
        <h1 className="text-2xl font-medium tracking-tight">Feedback</h1>
        <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
          Notes captured across HAND surfaces. Drag a card across columns to
          change its triage status. Click a card to jump back to page review
          with that note selected.
        </p>
      </header>

      {!configured && (
        <div className="panel border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-4">
          <p className="display-eyebrow text-[var(--amber-soft)]">
            Configuration pending
          </p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Supabase env vars are not set. Feedback lives in{" "}
            <code className="font-mono text-xs">command.feedback_pins</code> once
            migration <code className="font-mono text-xs">015_feedback_pins.sql</code>{" "}
            is applied.
          </p>
        </div>
      )}

      <PinsKanban pins={pins} />
    </div>
  );
}
