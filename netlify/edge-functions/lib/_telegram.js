// Shared Telegram notifier for edge functions (Deno runtime, Netlify.env).
//
// Reuses the bot + forum group already wired for netlify/functions/feedback.js:
//   TELEGRAM_BOT_TOKEN   — HAND bot token (provisioned via kohlabsAI/nerve "hand")
//   FORUM_GROUP_ID       — negative chat ID of the forum supergroup
//   ALERTS_TOPIC_ID      — message_thread_id of the "🔔 Alerts" topic
//   ACTIVITY_TOPIC_ID    — message_thread_id of the "📊 Activity" topic
//
// Best-effort: never throws, never blocks the gate. If Telegram is down or env
// is unset we log and move on. The underscore prefix keeps Netlify from trying
// to register this file as its own edge route.

const TOPIC_ENV = {
  alerts: "ALERTS_TOPIC_ID",
  activity: "ACTIVITY_TOPIC_ID",
};

export function escapeHtml(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build a one-line "from" descriptor from the edge request context (geo + IP + UA).
export function describeVisitor(request, context) {
  const geo = context?.geo || {};
  const city = geo.city || "";
  const country = (geo.country && (geo.country.name || geo.country.code)) || "";
  const place = [city, country].filter(Boolean).join(", ");
  const ip = context?.ip || request.headers.get("x-nf-client-connection-ip") || "";
  const ua = request.headers.get("user-agent") || "";
  return { place, ip, ua };
}

export async function notify(topic, { title, lines = [] }) {
  const token = Netlify.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Netlify.env.get("FORUM_GROUP_ID");
  const threadId = Netlify.env.get(TOPIC_ENV[topic]);

  if (!token || !chatId || !threadId) {
    console.warn(
      `[telegram] notify(${topic}) skipped — missing TELEGRAM_BOT_TOKEN, FORUM_GROUP_ID, or ${TOPIC_ENV[topic]}`,
    );
    return;
  }

  const text = [`<b>${escapeHtml(title)}</b>`, ...lines].join("\n");

  // Cap how long Telegram can stall the response.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        chat_id: chatId,
        message_thread_id: Number(threadId),
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[telegram] sendMessage failed ${res.status}: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn(`[telegram] sendMessage threw: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}
