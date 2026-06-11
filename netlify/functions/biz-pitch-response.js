// Receives the follow-up form from a pitch page (/demos/<slug>/pitch/) and
// writes the answers into command.biz_pitch_responses in Supabase via the
// service role. The operator then triages the lead in the Command Center; we do
// NOT change the lead's status from here, because status is markdown-canonical
// and flows through the Command Center, not this function.
//
// Env vars (Netlify dashboard → Site settings → Environment):
//   SUPABASE_URL                — the project URL, e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   — service role key (server-side only, bypasses RLS)

const { notify, escapeHtml } = require('./_telegram.js');

const OUTCOMES = ['reached', 'no_answer', 'voicemail', 'callback', 'other'];
const INTERESTS = ['interested', 'not_now', 'not_interested', 'unknown'];
const CHANNELS = ['call', 'in_person'];

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function clip(s, max) {
  const v = (s == null ? '' : String(s)).trim();
  return v.length > max ? v.slice(0, max) : v;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return json(400, { error: 'Invalid JSON' });
  }

  // Honeypot — return fake success so bots do not learn the form failed.
  if (payload.website && String(payload.website).trim().length > 0) {
    return json(200, { status: 'ok' });
  }

  const slug = clip(payload.slug, 120);
  if (!slug) {
    return json(422, { field: 'slug', message: 'Missing business slug.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var');
    return json(500, { error: 'Server is missing config. We have been notified.' });
  }

  const restBase = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  const baseHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  };

  // Resolve the lead id from the slug (best effort; the row is still recorded
  // with lead_slug even if the lookup misses).
  let leadId = null;
  try {
    const lookup = await fetch(
      `${restBase}/biz_leads?slug=eq.${encodeURIComponent(slug)}&select=id`,
      { headers: { ...baseHeaders, 'Accept-Profile': 'command' } }
    );
    if (lookup.ok) {
      const rows = await lookup.json().catch(() => []);
      if (Array.isArray(rows) && rows[0] && rows[0].id) leadId = rows[0].id;
    }
  } catch (err) {
    console.error('Lead lookup failed', err);
  }

  const outcome = OUTCOMES.includes(payload.outcome) ? payload.outcome : null;
  const interest = INTERESTS.includes(payload.interest) ? payload.interest : null;
  const channel = CHANNELS.includes(payload.channel) ? payload.channel : 'call';

  const row = {
    channel,
    lead_id: leadId,
    lead_slug: slug,
    outcome,
    interest,
    budget_band: clip(payload.budget_band, 120) || null,
    timeline: clip(payload.timeline, 120) || null,
    objections: clip(payload.objections, 2000) || null,
    best_contact: clip(payload.best_contact, 240) || null,
    callback_at: clip(payload.callback_at, 120) || null,
    other_info: clip(payload.other_info, 4000) || null,
    caller: clip(payload.caller, 120) || null
  };

  try {
    const insert = (body) =>
      fetch(`${restBase}/biz_pitch_responses`, {
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Content-Profile': 'command',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(body)
      });

    let res = await insert(row);

    // Tolerate the channel column not existing yet (migration 020 not applied):
    // PostgREST 400s with the column name in the message; retry without it.
    if (!res.ok && res.status === 400) {
      const detail = await res.text().catch(() => '');
      if (/channel/i.test(detail)) {
        console.warn('channel column missing, retrying insert without it');
        const { channel: _omit, ...legacyRow } = row;
        res = await insert(legacyRow);
      } else {
        console.error('Supabase insert failed', { status: res.status, detail });
        return json(502, { error: 'Could not save the response.' });
      }
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Supabase insert failed', { status: res.status, detail });
      return json(502, { error: 'Could not save the response.' });
    }

    await notify('activity', {
      title: '📞 Pitch follow-up',
      lines: [
        `<b>${escapeHtml(slug)}</b>`,
        channel === 'in_person' ? 'channel: <i>in person</i>' : '',
        outcome ? `outcome: <i>${escapeHtml(outcome)}</i>` : '',
        interest ? `interest: <i>${escapeHtml(interest)}</i>` : '',
        row.caller ? `by ${escapeHtml(row.caller)}` : '',
      ].filter(Boolean),
    });

    return json(200, { status: 'ok' });
  } catch (err) {
    console.error('Pitch response insert error', err);
    return json(502, { error: 'Could not reach the database.' });
  }
};
