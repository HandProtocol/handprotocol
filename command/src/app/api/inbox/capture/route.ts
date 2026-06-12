import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { INBOX_SOURCES, type InboxSource } from "@/lib/inbox/types";

/*
  External capture endpoint. Used by the browser extension and the
  email-forward worker. Authenticated by a shared secret header,
  x-hand-capture-key, checked against the INBOX_CAPTURE_KEY env var.
  No cookies, no Supabase session; the admin client writes the row.

  POST body shape:
    { url?: string, title?: string, body?: string, source: "api" | "email" | "extension" }

  Responses:
    201 created  on success
    401          when the secret header is missing or wrong
    400          when the payload is invalid
    503          when INBOX_CAPTURE_KEY or Supabase env vars are not set
*/

export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
  const expected = process.env.INBOX_CAPTURE_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Capture endpoint is not configured" },
      { status: 503 },
    );
  }
  if (!configured()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const presented = request.headers.get("x-hand-capture-key");
  if (!presented || presented !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body must be JSON" },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const p = payload as Record<string, unknown>;
  const url = typeof p.url === "string" ? p.url.trim() : "";
  const title = typeof p.title === "string" ? p.title.trim() : "";
  const body = typeof p.body === "string" ? p.body.trim() : "";
  const sourceRaw = typeof p.source === "string" ? p.source.trim() : "api";

  if (!url && !title && !body) {
    return NextResponse.json(
      { error: "At least one of url, title, or body is required" },
      { status: 400 },
    );
  }

  const source: InboxSource = (INBOX_SOURCES as readonly string[]).includes(
    sourceRaw,
  )
    ? (sourceRaw as InboxSource)
    : "api";
  // The endpoint is meant for external integrations; force the source
  // off of "manual" so the audit trail stays honest.
  const finalSource: InboxSource = source === "manual" ? "api" : source;

  const client = adminClient();
  const { data, error } = await client
    .from("inbox_items")
    .insert({
      title: title || null,
      url: url || null,
      body: body || null,
      source: finalSource,
      status: "needs_triage",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Could not save: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { id: data?.id, status: "needs_triage", source: finalSource },
    { status: 201 },
  );
}

export async function GET() {
  return NextResponse.json(
    {
      endpoint: "/api/inbox/capture",
      method: "POST",
      header: "x-hand-capture-key",
      body: { url: "string?", title: "string?", body: "string?", source: "api | email | extension" },
    },
    { status: 200 },
  );
}
