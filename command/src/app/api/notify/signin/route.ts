import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { notify, escapeHtml } from "@/lib/notify/telegram";

/*
  Sign-in alert. The login page POSTs here right after a successful
  signInWithPassword. We do NOT trust the client for identity — we read the
  authenticated user from the Supabase session cookie, so this endpoint can't
  be used to forge sign-in notifications. No session → 401, no notification.

  Fires into the Telegram "🔔 Alerts" topic. Best-effort: a Telegram failure
  still returns 200 so the client redirect is never affected.
*/

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const who = user.email || user.id;
  const when = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

  await notify("alerts", {
    title: "🔐 Command sign-in",
    lines: [`<code>${escapeHtml(who)}</code>`, `<i>${escapeHtml(when)}</i>`],
  });

  return NextResponse.json({ status: "notified" });
}
