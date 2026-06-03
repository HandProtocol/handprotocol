/*
  Generic Telegram notifier for the Command Center (server-side only).

  Reuses the same bot + forum group as the inspector pin notifier and the
  static-site functions:
    TELEGRAM_BOT_TOKEN   — HAND bot token
    FORUM_GROUP_ID       — negative chat ID of the forum supergroup
    ALERTS_TOPIC_ID      — message_thread_id of the "🔔 Alerts" topic
    ACTIVITY_TOPIC_ID    — message_thread_id of the "📊 Activity" topic

  Best-effort: never throws. Callers should not await this on the hot path
  if latency matters — a missed notification must never break a sign-in.
*/

type Topic = "alerts" | "activity";

const TOPIC_ENV: Record<Topic, string> = {
  alerts: "ALERTS_TOPIC_ID",
  activity: "ACTIVITY_TOPIC_ID",
};

export function escapeHtml(input: string): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function notify(
  topic: Topic,
  { title, lines = [] }: { title: string; lines?: string[] },
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.FORUM_GROUP_ID;
  const threadId = process.env[TOPIC_ENV[topic]];

  if (!token || !chatId || !threadId) {
    console.warn(
      `[notify] ${topic} skipped — missing TELEGRAM_BOT_TOKEN, FORUM_GROUP_ID, or ${TOPIC_ENV[topic]}`,
    );
    return;
  }

  const text = [`<b>${escapeHtml(title)}</b>`, ...lines].join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
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
      console.warn(`[notify] sendMessage failed ${res.status}: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn(
      `[notify] sendMessage threw: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
