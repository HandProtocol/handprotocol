import { Inspector } from "@/components/inspector/inspector";
import { listPins } from "@/lib/inspector/queries";

/*
  UX Inspector route. Server component shell that loads the operator's
  pin set, then hands off to the client <Inspector /> component which
  owns the iframe, the bridge, and the pin overlay.

  URL query params:
   ?page=/foundation-campaign/        — preselect a HAND surface
   ?pin=<uuid>                         — deep-link to a specific pin

  The page list comes from INSPECTOR_PAGES in lib/inspector/types.ts.
  The iframe loads via the same-origin /proxy/web rewrite configured in
  next.config.ts so the bridge can read the DOM.
*/

export const dynamic = "force-dynamic";

export default async function InspectorPage() {
  const pins = await listPins();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="eyebrow">
          DEVELOP · INSPECTOR · D<span className="amber">1</span>
        </p>
        <h1 className="text-2xl font-medium tracking-tight">UX inspector</h1>
        <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
          Load a HAND surface in the iframe, click an element to drop a
          pin with a comment and priority. Pins land in Supabase and
          show in the /pins kanban for triage. The Telegram notifier
          posts a one-line summary when a new pin is created.
        </p>
      </header>

      {!configured && (
        <div className="panel border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.04)] p-4">
          <p className="eyebrow text-[var(--amber-soft)]">CONFIG · PENDING</p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            Supabase env vars are not set. The inspector is read-only
            until <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            land in <code className="font-mono text-xs">.env.local</code> and
            migration <code className="font-mono text-xs">015_feedback_pins.sql</code>{" "}
            is applied.
          </p>
        </div>
      )}

      <Inspector initialPins={pins} />
    </div>
  );
}
