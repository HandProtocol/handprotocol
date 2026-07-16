// Public feedback handler. Receives anonymous-by-default feedback from
// /deck AND from any presentation page running /assets/feedback-widget.js
// (mosquitos, airstream, governance, …) and pins it into the same kanban
// the operator inspector uses, so public notes and operator notes
// converge in one triage view.
//
// The optional `source` field labels provenance (e.g. "mosquitos",
// "airstream studio"). It defaults to "deck" so the original /deck client
// keeps working unchanged.
//
// Three side effects, all best-effort:
//   1. Insert a row into command.feedback_pins (Supabase) so it shows
//      up in /pins and /inspector
//   2. POST a one-line summary into the Telegram "🎯 Inspector" topic
//      so a human is paged within seconds
//   3. Send a transactional email to EMAIL_TO_OPS via Resend (best-effort;
//      no-op until the Resend sending domain is verified — see _email.js)
//
// Any one failing alone does NOT fail the request — the client also
// keeps the note in localStorage, and we want public feedback to feel
// frictionless. We only 5xx when ALL THREE paths fail.
//
// Env vars (Netlify dashboard → Site settings → Environment):
//   SUPABASE_URL                  — e.g. https://xxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY     — service role key (server-only)
//   TELEGRAM_BOT_TOKEN            — HAND bot token
//   FORUM_GROUP_ID                — negative chat ID of the forum group
//   INSPECTOR_TOPIC_ID            — message_thread_id of "🎯 Inspector"
//   COMMAND_BASE_URL              — defaults to https://command.handprotocol.org
//   RESEND_API_KEY / EMAIL_FROM / EMAIL_TO_OPS  — transactional email (see _email.js)

import { sendEmail } from './_email.js';

const MAX_TEXT = 2000;
const MAX_NAME = 80;
const MAX_TAGS = 12;
const MAX_SOURCE = 48;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(input, max) {
  const s = String(input || '');
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + '…';
}

async function insertPin(payload) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { ok: false, reason: 'supabase-unconfigured' };
  }

  const source = payload.source || 'deck';
  const row = {
    page_url: payload.path,
    page_title: payload.title || null,
    // synthetic selector — public feedback is page-level, not element-level
    selector_primary: `${source}:page`,
    selector_fallback: ['body'],
    element_tag: 'body',
    comment: payload.text,
    priority: 'normal',
    status: 'open',
    author_name: payload.name || `anonymous (${source})`,
    author_email: null,
    element_context: {
      source,
      tags: payload.tags || [],
      scroll_pct: typeof payload.scroll === 'number' ? payload.scroll : null,
      viewport: { w: payload.vw || null, h: payload.vh || null },
      ua: truncate(payload.ua || '', 200),
      client_ts: payload.ts || Date.now(),
    },
    viewport_width: payload.vw || null,
  };

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/feedback_pins`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'command',
        Accept: 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn('[feedback] supabase insert failed', res.status, body.slice(0, 300));
      return { ok: false, reason: `supabase-${res.status}` };
    }
    const data = await res.json().catch(() => []);
    const pin = Array.isArray(data) ? data[0] : data;
    return { ok: true, pin };
  } catch (err) {
    console.warn('[feedback] supabase fetch threw', err && err.message);
    return { ok: false, reason: 'supabase-network' };
  }
}

async function notifyTelegram(payload, pin) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.FORUM_GROUP_ID;
  const threadId = process.env.INSPECTOR_TOPIC_ID;
  if (!token || !chatId || !threadId) {
    return { ok: false, reason: 'telegram-unconfigured' };
  }

  const base = (process.env.COMMAND_BASE_URL || 'https://command.handprotocol.org').replace(/\/$/, '');
  const summary = truncate(payload.text.replace(/\s+/g, ' ').trim(), 280);
  const author = payload.name || 'anon';
  const tagBadge = (payload.tags && payload.tags.length) ? ` · ${payload.tags.join(' ')}` : '';
  const link = pin && pin.id ? `${base}/pins?pin=${pin.id}` : `${base}/pins`;
  const sourceLabel = payload.source ? `${payload.source} note` : 'Deck note';

  const lines = [
    `<b>🪶 ${escapeHtml(sourceLabel)}</b> · <code>${escapeHtml(payload.path)}</code>`,
    `${escapeHtml(summary)}`,
    `<i>${escapeHtml(author)}${escapeHtml(tagBadge)}</i>`,
    `<a href="${escapeHtml(link)}">Open in kanban</a>`,
  ];

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_thread_id: Number(threadId),
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn('[feedback] telegram failed', res.status, body.slice(0, 200));
      return { ok: false, reason: `telegram-${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[feedback] telegram fetch threw', err && err.message);
    return { ok: false, reason: 'telegram-network' };
  }
}

async function notifyEmail(payload, pin) {
  const base = (process.env.COMMAND_BASE_URL || 'https://command.handprotocol.org').replace(/\/$/, '');
  const summary = truncate(payload.text.replace(/\s+/g, ' ').trim(), 280);
  const author = payload.name || 'anon';
  const sourceLabel = payload.source || 'deck';
  const tagLine = (payload.tags && payload.tags.length) ? payload.tags.join(' ') : '—';
  const link = pin && pin.id ? `${base}/pins?pin=${pin.id}` : `${base}/pins`;

  const subject = truncate(`🪶 Feedback · ${sourceLabel} · ${payload.path}`, 160);

  const html = [
    `<p style="font-size:15px;line-height:1.5;margin:0 0 16px;white-space:pre-wrap;">${escapeHtml(summary)}</p>`,
    '<table style="font-size:13px;color:#555;border-collapse:collapse;">',
    `<tr><td style="padding:2px 12px 2px 0;"><b>Author</b></td><td>${escapeHtml(author)}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;"><b>Source</b></td><td>${escapeHtml(sourceLabel)}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;"><b>Tags</b></td><td>${escapeHtml(tagLine)}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;"><b>Path</b></td><td><code>${escapeHtml(payload.path)}</code></td></tr>`,
    '</table>',
    `<p style="margin:16px 0 0;"><a href="${escapeHtml(link)}">Open in kanban →</a></p>`,
  ].join('');

  const text = [
    summary,
    '',
    `Author: ${author}`,
    `Source: ${sourceLabel}`,
    `Tags:   ${tagLine}`,
    `Path:   ${payload.path}`,
    '',
    `Open in kanban: ${link}`,
  ].join('\n');

  return sendEmail({
    to: [
      process.env.EMAIL_TO_OPS,
      process.env.CONTACT_NOTIFY_TO,
      process.env.RESEND_FORWARD_TO,
    ],
    subject,
    html,
    text,
  });
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json(400, { error: 'Invalid JSON' });
  }

  // honeypot
  if (body.website && String(body.website).trim().length > 0) {
    return json(200, { status: 'received' });
  }

  const text = String(body.text || '').trim();
  const path = String(body.path || '').trim();
  if (!text || text.length < 2) {
    return json(422, { field: 'text', error: 'Add a note before sending.' });
  }
  if (text.length > MAX_TEXT) {
    return json(422, { field: 'text', error: `Keep it under ${MAX_TEXT} characters.` });
  }
  if (!path || !path.startsWith('/')) {
    return json(422, { field: 'path', error: 'Missing page path.' });
  }

  // source labels provenance ("mosquitos", "airstream studio", …). Strip
  // control chars / markup so it is safe to interpolate into selectors and
  // the Telegram HTML message; empty → server defaults to "deck".
  const source = truncate(
    String(body.source || '').replace(/[<>\n\r]/g, '').trim(),
    MAX_SOURCE,
  );

  const normalized = {
    text: truncate(text, MAX_TEXT),
    path,
    title: truncate(String(body.title || '').trim(), 160),
    name: truncate(String(body.name || '').trim(), MAX_NAME),
    source: source || null,
    tags: Array.isArray(body.tags) ? body.tags.slice(0, MAX_TAGS).map((t) => truncate(String(t), 32)) : [],
    scroll: typeof body.scroll === 'number' ? body.scroll : null,
    vw: Number.isFinite(body.vw) ? body.vw : null,
    vh: Number.isFinite(body.vh) ? body.vh : null,
    ua: String(body.ua || '').slice(0, 240),
    ts: Number.isFinite(body.ts) ? body.ts : Date.now(),
  };

  // Insert first so the Telegram message and email can link to the pin row.
  const pinResult = await insertPin(normalized);
  const tgResult = await notifyTelegram(normalized, pinResult.pin);
  // Third best-effort sink. No-op ('email-unconfigured') until Resend is set
  // up; pin + telegram succeeding must still yield 200.
  const emailResult = await notifyEmail(normalized, pinResult.pin);

  if (!pinResult.ok && !tgResult.ok && !emailResult.ok) {
    return json(502, {
      status: 'failed',
      pin: pinResult.reason,
      telegram: tgResult.reason,
      email: emailResult.reason,
      error: 'Could not sync. Your note is saved locally; retry will run automatically.',
    });
  }

  return json(200, {
    status: 'synced',
    pin: pinResult.ok ? { id: pinResult.pin && pinResult.pin.id } : { error: pinResult.reason },
    telegram: tgResult.ok ? 'pinned' : tgResult.reason,
    email: emailResult.ok ? 'sent' : emailResult.reason,
  });
};
