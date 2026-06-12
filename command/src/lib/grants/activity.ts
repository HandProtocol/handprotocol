import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { GrantRecord } from "./types";

/*
  Activity feed for the detail view. Phase 1 sources:
   1. command.activity_log rows for entity_type='grant', entity_id=<id>
   2. Operational timestamps stored on the row (discovered_on,
      submitted_on, decided_on, column_entered_at) so the timeline
      reads correctly even before any status changes are logged.

  Phase 3 (D2 / N3) will add git history (commits touching the markdown
  file) as a third source.
*/

export type ActivityEntry = {
  id: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurred_at: string;
  source: "log" | "row";
};

function adminOrSsr() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  try {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: { schema: "command" },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  } catch {
    return null;
  }
}

export async function getGrantActivity(
  grant: GrantRecord,
): Promise<ActivityEntry[]> {
  const fromRow: ActivityEntry[] = [];

  if (grant.discovered_on) {
    fromRow.push({
      id: `row-discovered-${grant.id}`,
      action: "Discovered",
      before: null,
      after: { discovered_on: grant.discovered_on },
      occurred_at: new Date(`${grant.discovered_on}T12:00:00Z`).toISOString(),
      source: "row",
    });
  }
  if (grant.submitted_on) {
    fromRow.push({
      id: `row-submitted-${grant.id}`,
      action: "Submitted",
      before: null,
      after: { submitted_on: grant.submitted_on },
      occurred_at: new Date(`${grant.submitted_on}T12:00:00Z`).toISOString(),
      source: "row",
    });
  }
  if (grant.decided_on) {
    fromRow.push({
      id: `row-decided-${grant.id}`,
      action: `Decision: ${grant.status}`,
      before: null,
      after: { decided_on: grant.decided_on, status: grant.status },
      occurred_at: new Date(`${grant.decided_on}T12:00:00Z`).toISOString(),
      source: "row",
    });
  }

  let fromLog: ActivityEntry[] = [];
  const client = adminOrSsr();
  if (client) {
    try {
      const { data } = await client
        .from("activity_log")
        .select("id, action, before, after, occurred_at")
        .eq("entity_type", "grant")
        .eq("entity_id", grant.id)
        .order("occurred_at", { ascending: false })
        .limit(50);
      fromLog = ((data ?? []) as unknown[]).map((row) => {
        const r = row as {
          id: string;
          action: string;
          before: Record<string, unknown> | null;
          after: Record<string, unknown> | null;
          occurred_at: string;
        };
        return {
          id: r.id,
          action: r.action,
          before: r.before,
          after: r.after,
          occurred_at: r.occurred_at,
          source: "log",
        };
      });
    } catch {
      // Table may not exist yet (migrations not applied). Fall through
      // to the row-derived entries only.
    }
  }

  // Merge, log entries first within the same second (more specific).
  const merged = [...fromLog, ...fromRow].sort((a, b) =>
    b.occurred_at.localeCompare(a.occurred_at),
  );
  return merged;
}
