// Shared Telegram notifier for Netlify Functions (Node runtime, process.env).
//
// Reuses the bot + forum group already wired for feedback.js:
//   TELEGRAM_BOT_TOKEN   — HAND bot token (provisioned via kohlabsAI/nerve "hand")
//   FORUM_GROUP_ID       — negative chat ID of the forum supergroup
//   ALERTS_TOPIC_ID      — message_thread_id of the "🔔 Alerts" topic
//   ACTIVITY_TOPIC_ID    — message_thread_id of the "📊 Activity" topic
//
// Best-effort: never throws. Underscore prefix keeps Netlify from deploying
// this helper as its own function endpoint.

const TOPIC_ENV = {
  alerts: 'ALERTS_TOPIC_ID',
  activity: 'ACTIVITY_TOPIC_ID',
};

function escapeHtml(input) {
  return String(input == null ? '' : input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(input, max) {
  const s = String(input == null ? '' : input);
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + '…';
}

async function notify(topic, { title, lines = [] }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.FORUM_GROUP_ID;
  const threadId = process.env[TOPIC_ENV[topic]];

  if (!token || !chatId || !threadId) {
    console.warn(
      `[telegram] notify(${topic}) skipped — missing TELEGRAM_BOT_TOKEN, FORUM_GROUP_ID, or ${TOPIC_ENV[topic]}`,
    );
    return { ok: false, reason: 'unconfigured' };
  }

  const text = [`<b>${escapeHtml(title)}</b>`, ...lines].join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_thread_id: Number(threadId),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[telegram] sendMessage failed ${res.status}: ${body.slice(0, 200)}`);
      return { ok: false, reason: `telegram-${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.warn(`[telegram] sendMessage threw: ${err && err.message}`);
    return { ok: false, reason: 'telegram-network' };
  }
}

module.exports = { notify, escapeHtml, truncate };
