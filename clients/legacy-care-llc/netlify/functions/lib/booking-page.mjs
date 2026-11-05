// The customer's manage page (/booking/manage?t=…): the booking as it stands,
// Cancel, and Ask for another time (cancel + back to the site's #book).
// Server-rendered in the site's palette, no JS, no owner data.

import { config, siteName } from './config.mjs';
import { escapeHtml as e } from './html.mjs';
import { siteThemeVars } from './theme.mjs';
import { bookingRows } from './booking-email.mjs';

const T = {
  en: {
    title: 'Your booking', sent: 'Request sent. You will hear back to confirm.',
    status: { requested: 'Waiting for confirmation', confirmed: 'Confirmed', declined: 'Not confirmed', cancelled: 'Cancelled', completed: 'Done', no_show: 'Closed' },
    cancel: 'Cancel this booking', another: 'Ask for another time', back: 'Back to the site', book: 'Book again',
    cancelled_now: 'Cancelled. Book again any time.', confirm: 'Are you sure?',
  },
  es: {
    title: 'Tu reserva', sent: 'Solicitud enviada. Te confirmamos pronto.',
    status: { requested: 'Esperando confirmación', confirmed: 'Confirmada', declined: 'No confirmada', cancelled: 'Cancelada', completed: 'Terminada', no_show: 'Cerrada' },
    cancel: 'Cancelar esta reserva', another: 'Pedir otra hora', back: 'Volver al sitio', book: 'Reservar de nuevo',
    cancelled_now: 'Cancelada. Puedes reservar de nuevo cuando quieras.', confirm: '¿Seguro?',
  },
};

export function renderManagePage({ booking: b, token, intake = [], settings = null, sent = false, justCancelled = false, error = '' }) {
  const lang = b && b.lang === 'es' ? 'es' : 'en';
  const s = T[lang];
  const t = config.theme;
  const fonts = config.fonts;
  const active = b && (b.status === 'requested' || b.status === 'confirmed');
  const rows = b ? bookingRows(b, { lang, intake, settings }) : [];
  const body = !b
    ? `<h1>${e(s.title)}</h1><p class="muted">${e(error || (lang === 'es' ? 'Este enlace ya no es válido.' : 'This link is not valid any more.'))}</p><p><a class="btn" href="/#book">${e(s.book)}</a></p>`
    : `${sent ? `<p class="banner">${e(s.sent)}</p>` : ''}${justCancelled ? `<p class="banner">${e(s.cancelled_now)}</p>` : ''}
<h1>${e(s.title)}</h1>
<p class="status status--${e(b.status)}">${e(s.status[b.status] || b.status)}</p>
<dl>${rows.map(([l, v]) => `<div><dt>${e(l)}</dt><dd>${e(v).replace(/\n/g, '<br>')}</dd></div>`).join('')}</dl>
${
  active
    ? `<form method="POST" action="/api/booking/manage?t=${encodeURIComponent(token)}" class="actions" onsubmit="return confirm(${JSON.stringify(s.confirm)})">
  <input type="hidden" name="lang" value="${lang}">
  <button class="btn btn--ghost" type="submit" name="action" value="cancel">${e(s.cancel)}</button>
  <button class="btn" type="submit" name="action" value="rebook">${e(s.another)}</button>
</form>`
    : `<p><a class="btn" href="/#book">${e(s.book)}</a></p>`
}
<p class="tiny"><a href="/">${e(s.back)}</a></p>`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(s.title)} · ${e(siteName())}</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="${e(t.bg)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
${fonts.googleCss ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${e(fonts.googleCss)}" rel="stylesheet">` : ''}
<style>
:root{${siteThemeVars()}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:var(--font-body);line-height:1.55;min-height:100vh;display:grid;place-items:center;padding:1.5rem}
main{width:min(560px,100%);background:var(--bg-2,var(--bg));border:1px solid var(--line,rgb(128 128 128 / .3));border-radius:16px;padding:1.6rem;display:grid;gap:1rem}
.brand{display:flex;align-items:center;gap:.5rem;font-family:var(--font-display);font-size:1.05rem}
.brand svg{width:26px;height:26px;color:var(--accent)}
h1{font-family:var(--font-display);font-size:1.6rem;line-height:1.1}
.muted,.tiny{color:var(--ink-3,var(--ink));font-size:.9rem}
.banner{padding:.7rem .9rem;border-radius:10px;background:rgb(var(--accent-rgb) / .12);border-left:3px solid var(--accent);font-weight:600}
.status{display:inline-block;font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.3rem .7rem;border-radius:999px;border:1px solid var(--line-2,var(--accent));justify-self:start}
.status--confirmed{background:var(--accent);color:var(--on-accent,#fff);border-color:var(--accent)}
dl{display:grid;gap:.4rem}
dl div{display:grid;grid-template-columns:7rem minmax(0,1fr);gap:.8rem;padding:.5rem 0;border-top:1px solid var(--line,rgb(128 128 128 / .3))}
dt{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3,var(--ink));padding-top:.2rem}
.actions{display:flex;gap:.6rem;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:.8rem 1.2rem;border-radius:999px;border:1px solid var(--accent);background:var(--accent);color:var(--on-accent,#fff);font:inherit;font-weight:700;cursor:pointer;text-decoration:none}
.btn--ghost{background:transparent;color:var(--ink)}
a{color:var(--accent)}
@media (max-width:480px){dl div{grid-template-columns:1fr;gap:.1rem}.actions .btn{flex:1 1 100%}}
</style>
</head>
<body>
<main>
<p class="brand">${config.logo}<span>${e(siteName())}</span></p>
${body}
</main>
</body>
</html>`;
}
