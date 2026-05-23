import { PinsKanban } from "@/components/pins/pins-kanban";
import { listPins } from "@/lib/inspector/queries";

/*
  Pins triage kanban. Three columns matching the schema status enum:
  Open / In progress / Resolved.

  Click a card to jump back to the inspector with that pin preselected
  (?page=<page_url>&pin=<id>). Drag to a column to update its status
  via the server action.

  PRD pillar: D (Develop). Pairs with /inspector — capture in inspector,
  triage here.
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
        <p className="eyebrow">
          DEVELOP · PINS · D<span className="amber">2</span>
        </p>
        <h1 className="text-2xl font-medium tracking-tight">Feedback pins</h1>
        <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
          Pins captured from the UX inspector across every HAND surface.
          Drag a card across columns to change its triage status. Click
          a card to jump back to the inspector with that pin selected.
        </p>
      </header>

      {!configured && (
        <div className="panel border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-4">
          <p className="eyebrow text-[var(--amber-soft)]">CONFIG · PENDING</p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Supabase env vars are not set. Pins live in{" "}
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
