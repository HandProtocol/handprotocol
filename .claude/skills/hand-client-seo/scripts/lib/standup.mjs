// The standup: one working session between the owner and HAND for every
// SEO step that needs the owner. Writes four files under seo/standup/:
//   agenda.md      for the HAND operator: order, timings, what to prepare
//   owner.html     for the owner: what we will do, what to have ready
//   invite.ics     a calendar invite (no attendees; the operator adds them)
//   message.md     a short note to send with the invite (a draft; never sent)
import { join } from 'node:path';
import { CUTOVER_STEPS, GOOGLE_ITEMS, GOOGLE_STEPS } from './guides.mjs';
import { escapeHtml, writeFileEnsured } from './util.mjs';
import { seoDir } from './state.mjs';

// The facts every local listing needs. Missing ones become questions.
const ASK_FACTS = [
  { key: 'locality', ask: 'Which city (or cities) do you work in? Do clients come to you, do you go to them, or both (or online)?', has: (f) => f.locality || (f.areaServed && f.areaServed.length) },
  { key: 'phone', ask: 'Do you want a phone number on the site? If yes, which number, and is it OK for texts?', has: (f) => f.phone },
  { key: 'email', ask: 'Which email should enquiries go to?', has: (f) => f.email },
  { key: 'bookingUrl', ask: 'How should people book: a calendar link, a call, a text, or an email?', has: (f) => f.bookingUrl },
];

// 2026-10-07T10:00 in America/Chicago → a Date in UTC.
export function zonedToUtc(local, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/.exec(local || '');
  if (!m) throw new Error('--when must look like 2026-10-07T10:00');
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const asIfUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return new Date(guess - (asIfUtc - guess));
}

const icsDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function buildStandup({ target, state, facts, audit, when = null, tz = 'America/Chicago', minutes = 60, channel = null }) {
  const name = facts.name || target.slug || target.host;
  const ownerFindings = audit ? [...new Map(audit.findings.filter((f) => f.who === 'owner' && f.severity !== 'info').map((f) => [f.id + f.message, f])).values()] : [];
  const missingFacts = ASK_FACTS.filter((q) => !q.has(facts));
  const googleTodo = GOOGLE_ITEMS.filter((i) => (state.stages.google.items[i.key] || 'todo') !== 'done');
  const onTempHost = /\.netlify\.app$/i.test(target.host || '');
  const asks = (state.standup && state.standup.asks) || [];
  const logins = (state.standup && state.standup.logins) || [];
  const start = when ? zonedToUtc(when, tz) : null;
  const human = start ? new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(start) : 'date to be set';

  // agenda.md (operator)
  const blocks = [];
  let clock = 0;
  const block = (mins, title, lines) => {
    blocks.push(`### ${clock}–${clock + mins} min · ${title}`, '', ...lines.map((l) => `- ${l}`), '');
    clock += mins;
  };
  block(5, 'Hello and the plan', ['Say what the session is for: the steps only the owner can do, done together, so the site can be found.', `Show the current audit score${audit ? ` (${audit.score.total}/100, launch gate ${audit.score.gate.pass ? 'passing' : 'blocked'})` : ''} and what HAND already fixed.`]);
  if (missingFacts.length || asks.length) block(10, 'Facts for the site and the listings', [...missingFacts.map((q) => q.ask), ...asks, 'Write each answer down with the exact spelling; record it with: seo.mjs facts <slug> set key=value']);
  for (const item of googleTodo.filter((i) => i.key !== 'analytics')) block(item.key === 'business-profile' ? 20 : 8, item.label, [...GOOGLE_STEPS[item.key].owner.map((s) => `Owner: ${s.replace(/\*\*/g, '')}`), ...GOOGLE_STEPS[item.key].hand.map((s) => `HAND: ${s}`)]);
  if (onTempHost) block(10, 'The domain move', [...CUTOVER_STEPS.filter((s) => s.who === 'owner').map((s) => `Owner: ${s.step}`), ...logins.map((l) => `Login needed: ${l}`)]);
  if (ownerFindings.length) block(5, 'Audit items only the owner can settle', ownerFindings.map((f) => `${f.message}${f.fix ? ` (${f.fix})` : ''}`));
  block(5, 'Wrap up', ['Read back every fact collected and every account created.', 'Agree who does what next, and by when.', 'After the session: record facts, tick Google items (seo.mjs google <slug> --done=<item>), re-run the audit.']);

  const agenda = [
    `# SEO standup: ${name}`,
    '',
    `- **When:** ${human}${channel ? ` · ${channel}` : ''} · about ${clock} minutes`,
    `- **Site:** ${target.url}`,
    audit ? `- **Last audit:** ${audit.finishedAt.slice(0, 10)}, ${audit.score.total}/100, launch gate ${audit.score.gate.pass ? 'pass' : 'blocked'}` : '- **Last audit:** none yet; run one first',
    '',
    '## Prepare before the session',
    '',
    '- Re-run the audit the day before; fix every finding marked "HAND can fix now".',
    '- Have the verification-code field open in /admin/ (Search & sharing) so the code goes live in the session.',
    '- Draft the Business Profile category, service-area list and a 750-character description for the owner to approve.',
    ...logins.map((l) => `- Ask the owner to have this login ready: ${l}`),
    '',
    '## Agenda',
    '',
    ...blocks,
  ].join('\n');

  // owner.html (owner)
  const e = escapeHtml;
  const li = (items) => `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const ready = [
    'Your Google account password (and your phone, for the sign-in code).',
    ...logins.map((l) => e(l)),
    googleTodo.some((i) => i.key === 'business-profile') ? 'Your phone with the camera, near your workspace or your tools: Google may ask for a short video to confirm the business is real.' : null,
    'About an hour without interruptions.',
  ].filter(Boolean);
  const together = [
    ...(missingFacts.length || asks.length ? ['Settle a few facts about your business, so the site and Google say the same thing everywhere.'] : []),
    ...googleTodo.filter((i) => i.key !== 'analytics').map((i) => e(GOOGLE_STEPS[i.key].why)),
    ...(onTempHost ? [`Plan the move of the site to your own domain.`] : []),
  ];
  const questions = [...missingFacts.map((q) => e(q.ask)), ...asks.map((a) => e(a))];
  const owner = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Getting found on Google</title>
<style>
:root{--bg:#f8f7f3;--ink:#1f2321;--ink2:#56605b;--line:#dedbd2;--card:#fff;--accent:#1f6b5c}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#131615;--ink:#ecebe3;--ink2:#a9b2ad;--line:#2d3230;--card:#1b1f1d;--accent:#7fcfbd}}
:root[data-theme="dark"]{--bg:#131615;--ink:#ecebe3;--ink2:#a9b2ad;--line:#2d3230;--card:#1b1f1d;--accent:#7fcfbd}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 Georgia,"Times New Roman",serif}
main{max-width:680px;margin:0 auto;padding:40px 16px 64px}h1{font-size:2rem;line-height:1.2;margin:0 0 8px}h2{font:600 1rem/1.3 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);margin:36px 0 10px}
.when{font:500 1rem system-ui,sans-serif;color:var(--ink2);margin:0 0 24px}section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:4px 20px 12px;margin:16px 0}
ul{padding-left:20px}li{margin:8px 0}p{margin:12px 0}.small{font:14px/1.5 system-ui,sans-serif;color:var(--ink2)}
</style></head><body><main>
<h1>Getting ${e(name)} found on Google</h1>
<p class="when">${e(human)}${channel ? ` · ${e(channel)}` : ''} · about an hour, together with HAND</p>
<p>Your website is built and HAND has done the technical setup. A few steps can only be done by you, because Google needs the business owner to confirm who they are. We will do them together, one at a time. Nothing to prepare beyond the list below.</p>
<section><h2>What we will do</h2>${li(together)}</section>
${questions.length ? `<section><h2>Questions we will ask</h2><p>No need to answer in advance. Have a think, and if you are not sure, we will work it out together.</p>${li(questions)}</section>` : ''}
<section><h2>Have these ready</h2>${li(ready)}</section>
<p class="small">Questions before then? Reply to the message this came with.</p>
</main></body></html>
`;

  // invite.ics
  let ics = null;
  if (start) {
    const end = new Date(start.getTime() + minutes * 60_000);
    ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HAND Protocol//hand-client-seo//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:seo-standup-${target.slug || target.host}-${icsDate(start)}@handprotocol.org`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsText(`${name} + HAND: getting found on Google`)}`,
      `DESCRIPTION:${icsText(`A working session to set up Google Search Console and the Business Profile, settle a few facts about the business, and plan the domain move.${channel ? `\nWhere: ${channel}` : ''}`)}`,
      ...(channel ? [`LOCATION:${icsText(channel)}`] : []),
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }

  // message.md
  const firstName = facts.contactName || null;
  const message = [
    `Hi${firstName ? ` ${firstName}` : ''},`,
    '',
    `Your site is ready for the next step: getting it in front of people who search for what you do. A few parts of that need you, because Google asks the business owner to confirm who they are.`,
    '',
    `Could we do them together${start ? ` on ${human}` : ''}? It takes about an hour. Here is what we will cover and what to have ready: <link to the owner page>`,
    '',
    'Nothing to prepare beyond that list.',
    '',
    'HAND',
    '',
  ].join('\n');

  return { agenda, owner, ics, message, minutes: clock, start };
}

export function writeStandup(target, files) {
  const dir = join(seoDir(target), 'standup');
  const written = [writeFileEnsured(join(dir, 'agenda.md'), `${files.agenda}\n`), writeFileEnsured(join(dir, 'owner.html'), files.owner), writeFileEnsured(join(dir, 'message.md'), files.message)];
  if (files.ics) written.push(writeFileEnsured(join(dir, 'invite.ics'), files.ics));
  return { dir, written };
}
