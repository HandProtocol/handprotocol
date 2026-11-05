// Every email the booking calendar sends, EN/ES by the customer's language,
// themed like the sign-in mail. Owner mails carry one-tap signed links;
// customer mails carry the manage link and, on confirmation, a .ics.
// Nothing here goes to Telegram (decision: customer data stays between the
// customer, the owner, and the site).

import { BOOKING, config, siteEnv, siteName } from './config.mjs';
import { emailShell, sendEmail } from './email.mjs';
import { escapeHtml as e } from './html.mjs';
import { fmtWhen, icsCalendar, icsEvent } from './booking.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// <PREFIX>_BOOKING_NOTIFY → <PREFIX>_FORM_NOTIFY (so a site that moved from
// a Netlify form keeps its recipients) → config.booking.notify → <PREFIX>_OWNER_EMAILS.
export function ownerRecipients() {
  const env = siteEnv('BOOKING_NOTIFY') || siteEnv('FORM_NOTIFY');
  const list = env ? env.split(',') : BOOKING && BOOKING.notify.length ? BOOKING.notify : (siteEnv('OWNER_EMAILS') || '').split(',');
  return [...new Set(list.map((s) => String(s).trim().toLowerCase()).filter((s) => EMAIL_RE.test(s)))];
}

const T = {
  en: {
    when: 'When', service: 'Service', where: 'Where', notes: 'Notes', who: 'Who', contact: 'Reach them by', reachYou: 'We reach you by',
    text: 'text', call: 'call', email: 'email',
    received_subject: (n) => `${siteName()} got your request, ${n}`,
    received_title: 'Request received',
    received_body: (n) => `Thanks, ${n}. Here is what you asked for. Nothing is booked yet: you will hear back to confirm.`,
    manage: 'Cancel or ask for another time',
    confirmed_subject: (w) => `Confirmed: ${w}`,
    confirmed_title: 'You are booked',
    confirmed_body: (n) => `${n}, your visit is confirmed. A calendar file is attached so it lands on your phone.`,
    expect: 'What to expect',
    proposed_subject: (w) => `New time proposed: ${w}`,
    proposed_title: 'A different time',
    proposed_body: (n, asked) => `${n}, the time you asked for (${asked}) does not work, so here is the closest one. It is confirmed unless you cancel below.`,
    declined_subject: 'About your request',
    declined_title: 'We could not take this one',
    declined_body: (n) => `${n}, sorry: your request could not be confirmed.`,
    reason: 'Reason',
    book_again: 'Ask for another time',
    cancelled_subject: 'Your booking was cancelled',
    cancelled_title: 'Cancelled',
    cancelled_body: (n) => `${n}, this booking is cancelled. Book again any time.`,
    reminder_subject: (w) => `Tomorrow: ${w}`,
    reminder_title: 'See you tomorrow',
    reminder_body: (n) => `${n}, a reminder of your visit.`,
    // the 2-hour one: "today", never a clock promise (a window booking may be hours into its window)
    reminder_soon_subject: (w) => `Today: ${w}`,
    reminder_soon_title: 'See you today',
    reminder_soon_body: (n) => `${n}, a reminder of your visit today.`,
    owner_new_subject: (b) => `Booking request: ${b.name} · ${b.service_label}`,
    owner_new_title: 'New booking request',
    owner_new_body: 'Confirm or decline with one tap. The customer is emailed either way.',
    overlap_req: (n) => `${n} other ${n === 1 ? 'person' : 'people'} asked for this time`,
    overlap_conf: (name) => `Already confirmed then: ${name}`,
    confirm: 'Confirm', decline: 'Decline', open: 'Open in the editor',
    owner_cancelled_subject: (b) => `Cancelled by the customer: ${b.name} · ${b.service_label}`,
    owner_cancelled_title: 'The customer cancelled',
    owner_cancelled_body: 'This time is free again.',
    reply_note: 'Reply to this email to answer them directly.',
  },
  es: {
    when: 'Cuándo', service: 'Servicio', where: 'Dónde', notes: 'Notas', who: 'Quién', contact: 'Contactar por', reachYou: 'Te contactamos por',
    text: 'texto', call: 'llamada', email: 'correo',
    received_subject: (n) => `${siteName()} recibió tu solicitud, ${n}`,
    received_title: 'Solicitud recibida',
    received_body: (n) => `Gracias, ${n}. Esto es lo que pediste. Todavía no está reservado: te confirmamos pronto.`,
    manage: 'Cancelar o pedir otra hora',
    confirmed_subject: (w) => `Confirmado: ${w}`,
    confirmed_title: 'Tu visita está confirmada',
    confirmed_body: (n) => `${n}, tu visita está confirmada. Va un archivo de calendario para que quede en tu teléfono.`,
    expect: 'Qué esperar',
    proposed_subject: (w) => `Nueva hora propuesta: ${w}`,
    proposed_title: 'Otra hora',
    proposed_body: (n, asked) => `${n}, la hora que pediste (${asked}) no es posible, así que va la más cercana. Queda confirmada a menos que la canceles abajo.`,
    declined_subject: 'Sobre tu solicitud',
    declined_title: 'No pudimos tomar esta',
    declined_body: (n) => `${n}, lo sentimos: no pudimos confirmar tu solicitud.`,
    reason: 'Motivo',
    book_again: 'Pedir otra hora',
    cancelled_subject: 'Tu reserva fue cancelada',
    cancelled_title: 'Cancelada',
    cancelled_body: (n) => `${n}, esta reserva quedó cancelada. Puedes reservar de nuevo cuando quieras.`,
    reminder_subject: (w) => `Mañana: ${w}`,
    reminder_title: 'Nos vemos mañana',
    reminder_body: (n) => `${n}, un recordatorio de tu visita.`,
    reminder_soon_subject: (w) => `Hoy: ${w}`,
    reminder_soon_title: 'Nos vemos hoy',
    reminder_soon_body: (n) => `${n}, un recordatorio de tu visita de hoy.`,
    owner_new_subject: (b) => `Booking request: ${b.name} · ${b.service_label}`,
    owner_new_title: 'New booking request',
    owner_new_body: 'Confirm or decline with one tap. The customer is emailed either way.',
    overlap_req: (n) => `${n} other ${n === 1 ? 'person' : 'people'} asked for this time`,
    overlap_conf: (name) => `Already confirmed then: ${name}`,
    confirm: 'Confirm', decline: 'Decline', open: 'Open in the editor',
    owner_cancelled_subject: (b) => `Cancelled by the customer: ${b.name} · ${b.service_label}`,
    owner_cancelled_title: 'The customer cancelled',
    owner_cancelled_body: 'This time is free again.',
    reply_note: 'Reply to this email to answer them directly.',
  },
};

function t(lang) {
  return T[lang === 'es' ? 'es' : 'en'];
}
function lbl(field, lang) {
  return (lang === 'es' && field.label_es) || field.label;
}
function optLabel(field, value, lang) {
  const o = (field.options || []).find((x) => x.value === value);
  return o ? (lang === 'es' && o.label_es) || o.label : value;
}

// The windows' Spanish names live in the content doc; the row only carries
// the English label. Looked up by label so a renamed window still reads.
export function windowLabelFor(b, lang, settings) {
  if (lang !== 'es' || !b.window || !settings) return b.window || '';
  const w = settings.windows.find((x) => x.label === b.window);
  return (w && w.label_es) || b.window;
}

export function whenText(b, lang, settings) {
  return fmtWhen(b, b.tz || (BOOKING && BOOKING.tz) || 'America/Chicago', lang, { windowLabel: windowLabelFor(b, lang, settings) });
}

// [label, value] rows describing a booking, in the reader's language.
// `intake` is the pack's field list (labels); `settings` gives window names.
export function bookingRows(b, { lang = 'en', intake = [], settings = null, forOwner = false } = {}) {
  const s = t(lang);
  const rows = [[s.when, whenText(b, lang, settings)], [s.service, b.service_label]];
  if (b.address || b.city) rows.push([s.where, [b.address, b.city].filter(Boolean).join(', ')]);
  for (const f of intake) {
    const v = b.intake && b.intake[f.key];
    if (v) rows.push([lbl(f, lang), f.type === 'select' ? optLabel(f, String(v), lang) : String(v)]);
  }
  if (b.notes) rows.push([s.notes, b.notes]);
  if (forOwner) {
    rows.push([s.who, [b.name, b.phone, b.email].filter(Boolean).join(' · ')]);
    rows.push([s.contact, `${s[b.contact_pref] || b.contact_pref}${b.lang === 'es' ? ' · Spanish' : ''}`]);
  } else if (b.contact_pref) rows.push([s.reachYou, s[b.contact_pref] || b.contact_pref]);
  return rows;
}

function table(rows, theme = config.theme) {
  const ink = theme.ink, muted = theme['ink-3'] || theme['ink-2'] || theme.ink;
  return `<table role="presentation" style="border-collapse:collapse;width:100%;margin:14px 0 0;">${rows
    .map(([l, v]) => `<tr><td style="padding:7px 12px 7px 0;vertical-align:top;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${muted};white-space:nowrap;">${e(l)}</td><td style="padding:7px 0;vertical-align:top;font-size:15px;line-height:1.5;color:${ink};">${e(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('')}</table>`;
}
function button(href, label, { ghost = false } = {}) {
  const th = config.theme;
  const accent = th.accent, on = th['on-accent'] || '#ffffff', ink = th.ink;
  const style = ghost
    ? `display:inline-block;border:1px solid ${accent};color:${ink};text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;margin:0 8px 8px 0;`
    : `display:inline-block;background:${accent};color:${on};text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;margin:0 8px 8px 0;`;
  return `<a href="${e(href)}" style="${style}">${e(label)}</a>`;
}
function para(text) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${e(text).replace(/\n/g, '<br>')}</p>`;
}
function h1(text) {
  return `<h1 style="margin:0 0 14px;font-size:22px;line-height:1.2;">${e(text)}</h1>`;
}
function tiny(text) {
  const muted = config.theme['ink-3'] || config.theme['ink-2'] || config.theme.ink;
  return `<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${muted};">${text}</p>`;
}
function textOf(rows, ...paras) {
  return `${paras.filter(Boolean).join('\n\n')}\n\n${rows.map(([l, v]) => `${l}: ${v}`).join('\n')}\n`;
}

// --- builders: { subject, html, text, attachments? } -------------------------

export function ownerNewRequestEmail({ booking: b, links, overlap = { requested: 0, confirmed: [] }, intake = [], settings = null }) {
  const s = t('en');
  const rows = bookingRows(b, { lang: 'en', intake, settings, forOwner: true });
  const chips = [];
  if (overlap.requested) chips.push(s.overlap_req(overlap.requested));
  for (const c of overlap.confirmed || []) chips.push(s.overlap_conf(c.name));
  const warn = chips.length ? `<p style="margin:12px 0 0;padding:10px 12px;border-radius:10px;background:${config.theme['bg-3'] || config.theme.bg};font-size:13px;">${chips.map(e).join('<br>')}</p>` : '';
  const html = emailShell(`${h1(s.owner_new_title)}${para(s.owner_new_body)}${table(rows)}${warn}
    <p style="margin:22px 0 0;">${button(links.confirm, s.confirm)}${button(links.decline, s.decline, { ghost: true })}${button(links.open, s.open, { ghost: true })}</p>
    ${tiny(e(s.reply_note))}`);
  return { subject: s.owner_new_subject(b), html, text: textOf(rows, s.owner_new_title, s.owner_new_body, chips.join('\n'), `${s.confirm}: ${links.confirm}\n${s.decline}: ${links.decline}\n${s.open}: ${links.open}`) };
}

export function ownerCancelledEmail({ booking: b, links, intake = [], settings = null }) {
  const s = t('en');
  const rows = bookingRows(b, { lang: 'en', intake, settings, forOwner: true });
  const html = emailShell(`${h1(s.owner_cancelled_title)}${para(s.owner_cancelled_body)}${table(rows)}<p style="margin:22px 0 0;">${button(links.open, s.open, { ghost: true })}</p>`);
  return { subject: s.owner_cancelled_subject(b), html, text: textOf(rows, s.owner_cancelled_title, s.owner_cancelled_body, `${s.open}: ${links.open}`) };
}

export function customerReceivedEmail({ booking: b, manageUrl, confirmWithin = '', intake = [], settings = null }) {
  const lang = b.lang, s = t(lang);
  const rows = bookingRows(b, { lang, intake, settings });
  const html = emailShell(`${h1(s.received_title)}${para(s.received_body(b.name))}${confirmWithin ? para(confirmWithin) : ''}${table(rows)}<p style="margin:22px 0 0;">${button(manageUrl, s.manage, { ghost: true })}</p>`);
  return { subject: s.received_subject(b.name), html, text: textOf(rows, s.received_title, s.received_body(b.name), confirmWithin, `${s.manage}: ${manageUrl}`) };
}

export function customerConfirmedEmail({ booking: b, manageUrl, expect = '', intake = [], settings = null, ics = '', proposed = false, askedFor = '' }) {
  const lang = b.lang, s = t(lang);
  const rows = bookingRows(b, { lang, intake, settings });
  const title = proposed ? s.proposed_title : s.confirmed_title;
  const body = proposed ? s.proposed_body(b.name, askedFor) : s.confirmed_body(b.name);
  const html = emailShell(`${h1(title)}${para(body)}${table(rows)}${expect ? `<p style="margin:18px 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">${e(s.expect)}</p>${para(expect)}` : ''}<p style="margin:22px 0 0;">${button(manageUrl, s.manage, { ghost: true })}</p>`);
  const when = whenText(b, lang, settings);
  return {
    subject: proposed ? s.proposed_subject(when) : s.confirmed_subject(when),
    html,
    text: textOf(rows, title, body, expect ? `${s.expect}: ${expect}` : '', `${s.manage}: ${manageUrl}`),
    attachments: ics ? [{ filename: 'booking.ics', content: Buffer.from(ics, 'utf8').toString('base64') }] : [],
  };
}

export function customerDeclinedEmail({ booking: b, bookUrl, reason = '', intake = [], settings = null }) {
  const lang = b.lang, s = t(lang);
  const rows = bookingRows(b, { lang, intake, settings });
  const html = emailShell(`${h1(s.declined_title)}${para(s.declined_body(b.name))}${reason ? para(`${s.reason}: ${reason}`) : ''}${table(rows)}<p style="margin:22px 0 0;">${button(bookUrl, s.book_again)}</p>`);
  return { subject: s.declined_subject, html, text: textOf(rows, s.declined_title, s.declined_body(b.name), reason ? `${s.reason}: ${reason}` : '', `${s.book_again}: ${bookUrl}`) };
}

export function customerCancelledEmail({ booking: b, bookUrl, intake = [], settings = null }) {
  const lang = b.lang, s = t(lang);
  const rows = bookingRows(b, { lang, intake, settings });
  const html = emailShell(`${h1(s.cancelled_title)}${para(s.cancelled_body(b.name))}${table(rows)}<p style="margin:22px 0 0;">${button(bookUrl, s.book_again)}</p>`);
  return { subject: s.cancelled_subject, html, text: textOf(rows, s.cancelled_title, s.cancelled_body(b.name), `${s.book_again}: ${bookUrl}`) };
}

// `soon`: the about-2-hours-before reminder; otherwise the day-before one.
export function customerReminderEmail({ booking: b, manageUrl, expect = '', intake = [], settings = null, soon = false }) {
  const lang = b.lang, all = t(lang);
  const s = soon ? { ...all, reminder_subject: all.reminder_soon_subject, reminder_title: all.reminder_soon_title, reminder_body: all.reminder_soon_body } : all;
  const rows = bookingRows(b, { lang, intake, settings });
  const html = emailShell(`${h1(s.reminder_title)}${para(s.reminder_body(b.name))}${table(rows)}${expect ? `<p style="margin:18px 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">${e(s.expect)}</p>${para(expect)}` : ''}<p style="margin:22px 0 0;">${button(manageUrl, s.manage, { ghost: true })}</p>`);
  return { subject: s.reminder_subject(whenText(b, lang, settings)), html, text: textOf(rows, s.reminder_title, s.reminder_body(b.name), expect, `${s.manage}: ${manageUrl}`) };
}

// The .ics for a confirmed booking (customer attachment + the owner feed).
export function bookingIcs(b, { origin = config.productionUrl, forOwner = false, intake = [], settings = null } = {}) {
  const lang = forOwner ? 'en' : b.lang;
  const rows = bookingRows(b, { lang, intake, settings, forOwner });
  return icsEvent({
    uid: `${b.id}@${config.slug}`,
    start: b.starts_at,
    end: b.ends_at,
    stamp: b.updated_at || b.created_at || new Date().toISOString(),
    summary: forOwner ? `${b.name} · ${b.service_label}` : `${siteName()} · ${b.service_label}`,
    description: rows.map(([l, v]) => `${l}: ${v}`).join('\n'),
    location: [b.address, b.city].filter(Boolean).join(', '),
    url: forOwner ? `${origin}/admin/#bookings` : '',
    status: b.status === 'cancelled' || b.status === 'declined' ? 'CANCELLED' : 'CONFIRMED',
  });
}

export function bookingIcsFile(b, opts) {
  return icsCalendar([bookingIcs(b, opts)], { name: siteName() });
}
export function icsCalendarFor(events) {
  return icsCalendar(events, { name: `${siteName()} bookings` });
}

// --- sending ------------------------------------------------------------------

function customerOk(b) {
  return EMAIL_RE.test(String(b.email || ''));
}

// kind: owner_new | owner_cancelled | received | confirmed | proposed | declined | cancelled | reminder
export async function sendBookingEmail(kind, ctx) {
  const b = ctx.booking;
  const origin = ctx.origin || config.productionUrl;
  const bookUrl = `${origin}/#book`;
  if (kind === 'owner_new' || kind === 'owner_cancelled') {
    const to = ownerRecipients();
    if (!to.length) {
      console.warn(`[booking] no owner recipients: set ${config.envPrefix}_BOOKING_NOTIFY or booking.notify`);
      return { ok: false, reason: 'no-recipients' };
    }
    const mail = kind === 'owner_new' ? ownerNewRequestEmail(ctx) : ownerCancelledEmail(ctx);
    return sendEmail({ to, ...mail, ...(customerOk(b) ? { reply_to: b.email } : {}) });
  }
  if (!customerOk(b)) return { ok: false, reason: 'no-customer-email' };
  const mail =
    kind === 'received' ? customerReceivedEmail(ctx)
    : kind === 'confirmed' ? customerConfirmedEmail({ ...ctx, ics: ctx.ics === undefined ? bookingIcsFile(b, { origin, intake: ctx.intake, settings: ctx.settings }) : ctx.ics })
    : kind === 'proposed' ? customerConfirmedEmail({ ...ctx, proposed: true, ics: ctx.ics === undefined ? bookingIcsFile(b, { origin, intake: ctx.intake, settings: ctx.settings }) : ctx.ics })
    : kind === 'declined' ? customerDeclinedEmail({ ...ctx, bookUrl })
    : kind === 'cancelled' ? customerCancelledEmail({ ...ctx, bookUrl })
    : kind === 'reminder' ? customerReminderEmail(ctx)
    : null;
  if (!mail) return { ok: false, reason: 'unknown-kind' };
  const { attachments, ...rest } = mail;
  return sendEmail({ to: [b.email.toLowerCase()], ...rest, ...(attachments && attachments.length ? { attachments } : {}) });
}
