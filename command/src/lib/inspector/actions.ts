"use server";

/*
  UX Inspector server actions.

  Pins are user-generated metadata about the public site; there is no
  markdown counterpart. Every write goes through the SSR client first so
  RLS applies, but we keep an admin-client path for the rare case where a
  pin is dropped by an operator who is signed into the public site but
  not the command center (the inspector route itself is gated, so this
  is mostly defensive).

  createPin also kicks off a Telegram notification — best effort, never
  blocks the write.
*/

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/profile";
import { notifyTelegram } from "./notify";
import {
  PIN_PRIORITIES,
  PIN_STATUSES,
  type FeedbackPin,
  type PinPriority,
  type PinStatus,
  type PinBoundingBox,
  type PinElementContext,
} from "./types";

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

async function writeClient() {
  if (!configured()) {
    throw new Error("Supabase env vars are not set");
  }
  try {
    return await createServerClient();
  } catch {
    return adminClient();
  }
}

export type CreatePinInput = {
  page_url: string;
  page_title?: string | null;
  selector_primary: string;
  selector_fallback?: string[];
  element_tag?: string | null;
  element_classes?: string[];
  element_text?: string | null;
  bounding_box?: PinBoundingBox | null;
  comment: string;
  priority: PinPriority;
  element_context?: PinElementContext | null;
  viewport_width?: number | null;
  screenshot_url?: string | null;
};

export async function createPin(input: CreatePinInput): Promise<FeedbackPin> {
  if (!input.comment?.trim()) throw new Error("Comment is required");
  if (!input.selector_primary?.trim())
    throw new Error("selector_primary is required");
  if (!input.page_url?.trim()) throw new Error("page_url is required");
  if (!(PIN_PRIORITIES as readonly string[]).includes(input.priority)) {
    throw new Error(`Invalid priority: ${input.priority}`);
  }

  const profile = await getCurrentProfile();
  const user = await getCurrentUser();

  const row = {
    page_url: input.page_url,
    page_title: input.page_title ?? null,
    selector_primary: input.selector_primary,
    selector_fallback: input.selector_fallback ?? [],
    element_tag: input.element_tag ?? null,
    element_classes: input.element_classes ?? [],
    element_text: input.element_text ?? null,
    bounding_box: input.bounding_box ?? null,
    comment: input.comment.trim(),
    priority: input.priority,
    status: "open" as PinStatus,
    author_id: profile?.id ?? null,
    author_email: user?.email ?? null,
    author_name: profile?.display_name ?? user?.email ?? null,
    element_context: input.element_context ?? null,
    viewport_width: input.viewport_width ?? null,
    screenshot_url: input.screenshot_url ?? null,
  };

  const client = await writeClient();
  const { data, error } = await client
    .from("feedback_pins")
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Could not save the pin: ${error?.message ?? "no data"}`);
  }

  const pin = data as FeedbackPin;

  // Fire-and-forget Telegram broadcast. notifyTelegram handles its own
  // errors so the user-facing action is never blocked by an outage.
  notifyTelegram(pin).catch(() => {});

  revalidatePath("/pins");
  revalidatePath("/inspector");

  return pin;
}

export async function updatePinStatus(id: string, status: PinStatus) {
  if (!(PIN_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  const client = await writeClient();
  const { error } = await client
    .from("feedback_pins")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(`Could not update status: ${error.message}`);
  revalidatePath("/pins");
  revalidatePath("/inspector");
}

export async function updatePinComment(id: string, comment: string) {
  const trimmed = comment.trim();
  if (!trimmed) throw new Error("Comment cannot be empty");
  const client = await writeClient();
  const { error } = await client
    .from("feedback_pins")
    .update({ comment: trimmed })
    .eq("id", id);
  if (error) throw new Error(`Could not update comment: ${error.message}`);
  revalidatePath("/pins");
}

export async function updatePinPriority(id: string, priority: PinPriority) {
  if (!(PIN_PRIORITIES as readonly string[]).includes(priority)) {
    throw new Error(`Invalid priority: ${priority}`);
  }
  const client = await writeClient();
  const { error } = await client
    .from("feedback_pins")
    .update({ priority })
    .eq("id", id);
  if (error) throw new Error(`Could not update priority: ${error.message}`);
  revalidatePath("/pins");
}

export async function deletePin(id: string) {
  const client = await writeClient();
  const { error } = await client
    .from("feedback_pins")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Could not delete pin: ${error.message}`);
  revalidatePath("/pins");
  revalidatePath("/inspector");
}

export async function addPinReply(id: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Reply cannot be empty");

  const profile = await getCurrentProfile();
  const user = await getCurrentUser();
  const author = profile?.display_name ?? user?.email ?? "anon";

  const client = await writeClient();
  // Read current thread, append, write back. RLS gates this; in the
  // unauth fallback the admin client bypasses RLS anyway.
  const { data: existing, error: readErr } = await client
    .from("feedback_pins")
    .select("thread")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !existing) {
    throw new Error(`Could not load pin: ${readErr?.message ?? "not found"}`);
  }

  const current = Array.isArray((existing as { thread: unknown }).thread)
    ? ((existing as { thread: unknown }).thread as FeedbackPin["thread"])
    : [];
  const next = [
    ...current,
    { author, text: trimmed, time: new Date().toISOString() },
  ];

  const { error } = await client
    .from("feedback_pins")
    .update({ thread: next })
    .eq("id", id);
  if (error) throw new Error(`Could not save reply: ${error.message}`);

  revalidatePath("/pins");
  revalidatePath("/inspector");
}
