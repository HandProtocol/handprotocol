/*
  Inspector / feedback-pin reads. Same SSR-first, admin-fallback pattern
  as grants/queries.ts: prefer the cookie-bearing client so RLS applies,
  fall back to the service-role client only when there is no session.
*/
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { FeedbackPin } from "./types";

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

function configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function readClient() {
  if (!configured()) return null;
  try {
    return await createServerClient();
  } catch {
    return adminClient();
  }
}

const SELECT =
  "id, created_at, updated_at, page_url, page_title, selector_primary, selector_fallback, element_tag, element_classes, element_text, bounding_box, comment, priority, status, author_id, author_email, author_name, thread, element_context, css_overrides, screenshot_url, viewport_width";

function normalize(row: unknown): FeedbackPin {
  const r = row as Record<string, unknown>;
  return {
    ...r,
    selector_fallback: Array.isArray(r.selector_fallback)
      ? (r.selector_fallback as string[])
      : [],
    element_classes: Array.isArray(r.element_classes)
      ? (r.element_classes as string[])
      : [],
    thread: Array.isArray(r.thread)
      ? (r.thread as FeedbackPin["thread"])
      : [],
    css_overrides:
      r.css_overrides && typeof r.css_overrides === "object"
        ? (r.css_overrides as Record<string, string>)
        : {},
  } as FeedbackPin;
}

export async function listPins(): Promise<FeedbackPin[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("feedback_pins")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(normalize);
}

export async function listPinsForPage(pageUrl: string): Promise<FeedbackPin[]> {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("feedback_pins")
    .select(SELECT)
    .eq("page_url", pageUrl)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(normalize);
}

export async function getPin(id: string): Promise<FeedbackPin | null> {
  const client = await readClient();
  if (!client) return null;
  const { data, error } = await client
    .from("feedback_pins")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalize(data);
}
