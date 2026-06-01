/*
  Assistant-run logging. Writes to command.assistant_runs. Phase 2
  surfaces (drafting assistant, RFP extractor) call this on every
  completed model call so the monthly cost dashboard has the data.

  Provider and model_key are stored for engineering accounting. Neither
  appears in operator-facing copy.
*/
import crypto from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/supabase/profile";

function configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

// Assistant logging is operational telemetry, written for every model
// call regardless of whether the operator was authenticated at the
// moment of invocation (the route may be triggered by a webhook, a
// scheduled job, or a curl smoke-test). Service-role bypasses RLS, so
// we always use the admin client for writes here. The actor_id field
// is still populated from getCurrentUser when a session exists.
function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "command" },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function writeClient() {
  if (!configured()) return null;
  return adminClient();
}

export type LogAssistantRunInput = {
  surface: "draft" | "rfp-extract" | "biz-site" | "biz-pitch";
  grantId?: string | null;
  provider: string;
  modelKey: string;
  tokensIn?: number | null;
  tokensOut?: number | null;
  costUsd?: number | null;
  durationMs?: number | null;
  inputText: string;
  outputText: string;
};

export type LogAssistantRunResult = {
  runId: string | null;
};

function hashInput(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 32);
}

function clipPreview(text: string, max = 600): string {
  if (text.length <= max) return text;
  return text.slice(0, max);
}

export async function logAssistantRun(
  input: LogAssistantRunInput,
): Promise<LogAssistantRunResult> {
  if (!configured()) return { runId: null };
  const client = writeClient();
  if (!client) return { runId: null };

  const user = await getCurrentUser().catch(() => null);

  const row = {
    actor_id: user?.id ?? null,
    surface: input.surface,
    grant_id: input.grantId ?? null,
    provider: input.provider,
    model_key: input.modelKey,
    tokens_in: input.tokensIn ?? null,
    tokens_out: input.tokensOut ?? null,
    cost_usd: input.costUsd ?? null,
    duration_ms: input.durationMs ?? null,
    input_hash: hashInput(input.inputText),
    output_preview: clipPreview(input.outputText),
    accepted: null as boolean | null,
  };

  const { data, error } = await client
    .from("assistant_runs")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) return { runId: null };
  return { runId: (data as { id: string }).id };
}

// Operator clicked Accept or Reject in the drawer. Updates the matching
// run so the cost dashboard can report acceptance rate.
export async function markAssistantRunAccepted(
  runId: string,
  accepted: boolean,
): Promise<void> {
  if (!configured()) return;
  const client = writeClient();
  if (!client) return;
  await client
    .from("assistant_runs")
    .update({ accepted })
    .eq("id", runId);
}
