/* The two emails a new star sends, via Resend.

     visitorMail  her keepsake: the star, what is public, and a link to remove
                  it all. It never quotes her message back: anyone can type any
                  address into the form, and the keepsake must not become a way
                  to mail someone else your own words from KC Collective.
     adminMail    KC Collective's notice: who, what, the screening, and one-tap
                  buttons (each opens a confirm page; nothing changes on a GET,
                  so inbox link scanners can't approve or delete anything)

   sendMail never throws: { ok, id } or { ok:false, reason }. */

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const paras = (text) => esc(text).split(/\n{2,}/).map((p) => p.replace(/\n/g, '<br>')).join('</p><p style="margin:0 0 12px">');

const C = { paper: '#f7f1e7', ink: '#48213e', soft: '#7a6372', gold: '#b88a44', night: '#2e1a3f', line: '#e6dccd' };

function shell(inner, { preheader = '' } = {}) {
  return `<!doctype html><html><body style="margin:0;background:${C.paper};font-family:Georgia,'Times New Roman',serif;color:${C.ink}">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border:1px solid ${C.line};border-radius:14px">
<tr><td style="padding:28px 28px 8px;font:600 12px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${C.gold}">KC Collective</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:16px;line-height:1.6">${inner}</td></tr>
</table></td></tr></table></body></html>`;
}

function starBlock(star) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:${C.night};border-radius:12px;width:100%"><tr>
<td style="padding:22px 24px;width:44px;vertical-align:middle"><div style="width:22px;height:22px;border-radius:50%;background:${esc(star.hex)};box-shadow:0 0 18px ${esc(star.hex)}"></div></td>
<td style="padding:22px 24px 22px 0;color:#f6f1f7;vertical-align:middle">
<div style="font-size:22px;font-style:italic">${esc(star.name)}</div>
${star.line ? `<div style="font:15px/1.5 Arial,sans-serif;color:#dcd2e6;margin-top:4px">${esc(star.line)}</div>` : ''}
<div style="font:12px/1.4 Arial,sans-serif;color:#b9aac8;margin-top:8px">Beside ${esc(star.near)}</div>
</td></tr></table>`;
}

const button = (href, label, tone = 'ink') => `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 10px 0;padding:11px 18px;border-radius:999px;font:600 14px/1 Arial,sans-serif;text-decoration:none;${tone === 'ink' ? `background:${C.ink};color:#fff` : `border:1px solid ${C.ink};color:${C.ink}`}">${esc(label)}</a>`;

// row: the stored star row · links: { sky, remove }
export function visitorMail(row, links) {
  const star = row.star;
  const publicNote = row.share_requested
    ? 'You asked for your message to appear on the sky too. It will once KC Collective has read it; until then only your first name and your star are public.'
    : 'Your message stays between you and KC Collective. Only your first name and your star are public.';
  const aiNote = star.ai
    ? 'You chose to let AI shape your star: your message (without your name, email, numbers or links) was read once by Claude, an AI model made by Anthropic, to design it.'
    : 'Your message was not sent to any AI.';
  const inner = `<h1 style="font-weight:400;font-size:28px;line-height:1.2;margin:0 0 12px">${esc(row.first_name)}, your star is in the sky.</h1>
${starBlock(star)}
<p style="margin:0 0 12px">${row.status === 'held' ? 'It will appear on the sky as soon as KC Collective has had a look. ' : ''}${esc(publicNote)}</p>
<p style="margin:0 0 20px;color:${C.soft};font-size:14px">${esc(aiNote)}</p>
${button(links.sky, 'See the sky')}
<div style="border-top:1px solid ${C.line};margin:20px 0 14px"></div>
<p style="margin:16px 0 0;font:13px/1.5 Arial,sans-serif;color:${C.soft}">Changed your mind? <a href="${esc(links.remove)}" style="color:${C.ink}">Remove my star and message</a>. It takes it off the sky and deletes what you wrote.</p>`;
  return {
    subject: `Your star, ${star.name}, is in the KC Collective sky`,
    html: shell(inner, { preheader: star.line || 'Your star is in the sky.' }),
    text: [
      `${row.first_name}, your star is in the sky.`,
      '',
      `${star.name}${star.line ? ` — ${star.line}` : ''}`,
      `Beside ${star.near}`,
      '',
      publicNote,
      aiNote,
      '',
      `See the sky: ${links.sky}`,
      '',
      `Remove my star and message: ${links.remove}`,
    ].join('\n'),
  };
}

const FLAG_WORDS = {
  spam: 'Looks like spam',
  abuse: 'Possible harassment or hate',
  sexual: 'Sexual content',
  distress: 'She may need someone to reach out',
  other: 'Worth a look before it goes up',
};

// links: { approve?, hide?, show?, remove, sky }
export function adminMail(row, links) {
  const star = row.star;
  const care = row.flag === 'distress';
  const held = row.status === 'held';
  const lead = care
    ? `<p style="margin:0 0 14px;padding:12px 14px;border-radius:10px;background:#fbe9ec;color:#7a1f3a"><strong>Please reach out to her.</strong> ${esc(row.flag_note || FLAG_WORDS.distress)}</p>`
    : held
      ? `<p style="margin:0 0 14px;padding:12px 14px;border-radius:10px;background:#f6efe0"><strong>Held, not on the sky yet.</strong> ${esc(FLAG_WORDS[row.flag] || '')}${row.flag_note ? `: ${esc(row.flag_note)}` : ''}</p>`
      : '';
  const meta = [
    ['From', `${esc(row.first_name)} &lt;<a href="mailto:${esc(row.email)}" style="color:${C.ink}">${esc(row.email)}</a>&gt;`],
    ['Star', `${esc(star.name)}${star.ai ? ' (designed by AI)' : ' (plain, no AI)'}`],
    ['On the sky', held ? 'Held for you' : 'Yes'],
    ['Message public', row.share_requested ? 'She asked for it; waiting for your yes' : 'No, private to you'],
  ].map(([k, v]) => `<tr><td style="padding:3px 14px 3px 0;font:13px Arial,sans-serif;color:${C.soft};white-space:nowrap;vertical-align:top">${k}</td><td style="padding:3px 0;font:14px Arial,sans-serif">${v}</td></tr>`).join('');
  const buttons = [
    links.approve && button(links.approve, 'Show her message on the sky'),
    links.show && button(links.show, 'Put the star on the sky'),
    links.hide && button(links.hide, 'Hide the star', 'line'),
    button(links.remove, 'Delete it', 'line'),
  ].filter(Boolean).join('');
  const inner = `<h1 style="font-weight:400;font-size:24px;line-height:1.25;margin:0 0 14px">${care ? 'A message that needs care' : 'A new message and a new star'}</h1>
${lead}
<blockquote style="margin:0 0 16px;padding:0 0 0 14px;border-left:2px solid ${C.gold};font-style:italic"><p style="margin:0 0 12px">${paras(row.message)}</p></blockquote>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px">${meta}</table>
${starBlock(star)}
${buttons}
<p style="margin:14px 0 0;font:13px/1.5 Arial,sans-serif;color:${C.soft}">Reply to this email to write back to her. <a href="${esc(links.sky)}" style="color:${C.ink}">See the sky</a></p>`;
  const subject = care ? `Please reach out: a note from ${row.first_name}` : held ? `Held for you: a note from ${row.first_name}` : `New star: ${row.first_name}, ${star.name}`;
  return {
    subject,
    html: shell(inner, { preheader: row.message.slice(0, 120) }),
    text: [
      subject,
      '',
      row.message,
      '',
      `From: ${row.first_name} <${row.email}>`,
      `Star: ${star.name}${star.line ? ` — ${star.line}` : ''}`,
      row.flag !== 'none' ? `Screening: ${FLAG_WORDS[row.flag] || row.flag}${row.flag_note ? ` (${row.flag_note})` : ''}` : '',
      '',
      links.approve ? `Show her message on the sky: ${links.approve}` : '',
      links.show ? `Put the star on the sky: ${links.show}` : '',
      links.hide ? `Hide the star: ${links.hide}` : '',
      `Delete it: ${links.remove}`,
    ].filter((l, i, a) => l || a[i - 1]).join('\n'),
    replyTo: row.email,
  };
}

// One Resend call. env: { RESEND_API_KEY, from }
export async function sendMail({ apiKey, from, to, subject, html, text, replyTo }) {
  if (!apiKey || !from || !to) return { ok: false, reason: 'email-unconfigured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[stars] resend ${res.status}: ${body.slice(0, 200)}`);
      return { ok: false, reason: `email-${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, id: data.id };
  } catch (err) {
    console.warn('[stars] resend threw:', err && err.message);
    return { ok: false, reason: 'email-network' };
  }
}
