/*
  Telegram notifier hook for new feedback pins.

  When a pin is created, we POST a one-line summary into a forum topic so
  the operator group sees it without polling the kanban. The Telegram
  agent (separate workstream) provisions the topic id and the bot token;
  this module just calls sendMessage when those env vars are present.

  No retries, no queue. If Telegram is down or env is misconfigured we
  log and move on — the pin still landed in Supabase, the kanban is the
  source of truth.
*/
import type { FeedbackPin } from "./types";

const COMMAND_BASE_URL =
  process.env.NEXT_PUBLIC_COMMAND_BASE_URL?.replace(/\/$/, "") ||
  "https://command.handprotocol.org";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return input.slice(0, Math.max(0, max - 1)) + "…";
}

const PRIORITY_BADGE: Record<FeedbackPin["priority"], string> = {
  low: "·",
  normal: "•",
  high: "▲",
  critical: "‼",
};

export async function notifyTelegram(pin: FeedbackPin): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.FORUM_GROUP_ID;
  const threadId = process.env.INSPECTOR_TOPIC_ID;

  if (!token || !chatId || !threadId) {
    console.warn(
      "[inspector] notifyTelegram skipped — missing TELEGRAM_BOT_TOKEN, FORUM_GROUP_ID, or INSPECTOR_TOPIC_ID",
    );
    return;
  }

  const author = pin.author_name || pin.author_email || "anon";
  const badge = PRIORITY_BADGE[pin.priority] ?? "•";
  const summary = truncate(pin.comment.replace(/\s+/g, " ").trim(), 220);
  const link = `${COMMAND_BASE_URL}/pins?pin=${pin.id}`;

  const text = [
    `<b>${badge} New pin</b> · <code>${escapeHtml(pin.page_url)}</code>`,
    `${escapeHtml(summary)}`,
    `<i>${escapeHtml(author)} · ${escapeHtml(pin.priority)}</i>`,
    `<a href="${escapeHtml(link)}">Open in kanban</a>`,
  ].join("\n");

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
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
      console.warn(
        `[inspector] Telegram sendMessage failed ${res.status}: ${body.slice(0, 200)}`,
      );
    }
  } catch (err) {
    console.warn(
      `[inspector] Telegram sendMessage threw: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
