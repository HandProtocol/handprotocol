// The owner's Setup checklist: config.checklist items rendered as a Setup
// tab in /admin/ (lib/admin-page.mjs). Progress lives in the content document
// under the hidden `setup` section (one toggle per item) and is saved the
// moment an item is ticked, through PATCH /api/admin/content, so no Publish
// is needed. The rule for authoring items: the button is the step.
//
// Item shape (site/checklist.mjs, imported by site.config.mjs):
//   { id: 'domain', title: 'Point your domain at the site', why: '…',
//     actions: [{ label, kind, target }],   // buttons under the steps; kinds:
//       tab      target: home | content | media | look | payments | editors | history | setup | bookings
//                                               (look = the Looks picker screen, payments = connect Stripe)
//       section  target: '<section key>'        (Content tab, scroll + highlight)
//       field    target: '<section>.<field>'    (…and focus the input)
//       site     target: '#hash' or '/path'     (opens the live site in a new tab; '#hash' means '/#hash', never the admin page)
//       url      target: 'https://…'            (external, new tab)
//       looks    (no target)                    (jumps to the Looks picker)
//       copy     target: 'site' | 'sitemap' | any short text
//                                               (copies the site's address, its sitemap
//                                               address, or the text; the owner never types a URL)
//     check: { kind, path?, value? },         // ticks itself when true:
//       field    path non-empty   value  path equals value
//       media    a real (non-placeholder) photo exists
//       host     the admin is served on a host that is not *.netlify.app
//       booking  a booking exists from one of the editors' emails (the owner's own test)
//       stripe   Stripe is connected (config.payments; /admin/ → Payments, or keys set by HAND)
//     embed: 'looks',                          // the Looks picker inside the task
//     phone: ['step', …],                      // fallback prose, phone first
//     desktop: ['step', …],                    // optional: from a computer
//     links: [{ label, href }], ask: '…', done: '…', later: false }
//
// Steps are plain text; `**bold**` and `` `code` `` are the only inline marks.

import { config } from './config.mjs';
import { escapeHtml as e } from './html.mjs';

const ID_RE = /^[a-z][a-z0-9_]*$/;
const PATH_RE = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
const TABS = new Set(['home', 'content', 'media', 'look', 'payments', 'editors', 'history', 'setup', 'bookings']);
const ACTION_KINDS = new Set(['tab', 'section', 'field', 'site', 'url', 'looks', 'copy']);
const CHECK_KINDS = new Set(['field', 'value', 'media', 'host', 'booking', 'stripe']);

function normalizeAction(a) {
  if (!a || !ACTION_KINDS.has(a.kind) || !a.label) return null;
  let target = a.kind === 'looks' ? '' : String(a.target || '');
  // A site target is always root-relative: '#book' from /admin/ would resolve
  // to /admin/#book (the editor again), so it becomes '/#book'.
  if (a.kind === 'site' && target.startsWith('#')) target = '/' + target;
  const ok =
    a.kind === 'tab' ? TABS.has(target)
    : a.kind === 'section' ? ID_RE.test(target)
    : a.kind === 'field' ? PATH_RE.test(target)
    : a.kind === 'site' ? /^[#/]\S*$/.test(target)
    : a.kind === 'url' ? /^https?:\/\/\S+$/.test(target)
    : a.kind === 'copy' ? target.trim().length > 0 && target.length <= 200
    : true;
  return ok ? { label: String(a.label), kind: a.kind, target } : null;
}

function normalizeCheck(c) {
  if (!c || !CHECK_KINDS.has(c.kind)) return null;
  const needsPath = c.kind === 'field' || c.kind === 'value';
  if (needsPath && !PATH_RE.test(String(c.path || ''))) return null;
  return { kind: c.kind, path: needsPath ? String(c.path) : '', value: c.value === undefined ? '' : String(c.value) };
}

export function checklistItems(source = config.checklist) {
  const seen = new Set();
  return (Array.isArray(source) ? source : [])
    .filter((it) => it && ID_RE.test(String(it.id || '')) && it.title)
    .filter((it) => (seen.has(it.id) ? false : seen.add(it.id)))
    .map((it) => ({
      id: it.id,
      title: String(it.title),
      why: String(it.why || ''),
      actions: (Array.isArray(it.actions) ? it.actions : []).map(normalizeAction).filter(Boolean),
      check: normalizeCheck(it.check),
      embed: it.embed === 'looks' ? 'looks' : '',
      phone: Array.isArray(it.phone) ? it.phone.map(String) : [],
      desktop: Array.isArray(it.desktop) ? it.desktop.map(String) : [],
      links: Array.isArray(it.links) ? it.links.filter((l) => l && l.href && l.label) : [],
      ask: String(it.ask || ''),
      done: String(it.done || ''),
      later: Boolean(it.later),
    }));
}

// The hidden schema section the sanitizer and admin bind to. null when the
// site has no checklist, so packs without one are untouched.
export function checklistSection(source) {
  const items = checklistItems(source);
  if (!items.length) return null;
  return {
    key: 'setup',
    label: 'Setup checklist',
    hidden: true,
    fields: items.map((it) => ({ key: it.id, type: 'toggle', label: it.title })),
  };
}

// Inline marks only: **bold**, `code`. Everything else is escaped text.
export function inline(text) {
  return e(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// The Looks picker: one card per look (config.themes). Cards are pure CSS
// swatches driven by --look-* variables; admin.js opens the live preview and
// publishes the pick. Rendered inside a task (embed: 'looks') and cloned from
// <template id="looks-tpl"> for the Content tab.
export function looksHtml(themes = config.themes, { current = '' } = {}) {
  if (!themes || !themes.options.length) return '';
  const cards = themes.options
    .map(
      (o) => `<article class="look${o.id === current ? ' is-live' : ''}" data-look="${e(o.id)}" role="listitem" style="--look-bg:${e(o.swatch.bg)};--look-accent:${e(o.swatch.accent)};--look-ink:${e(o.swatch.ink)};--look-font:${e(o.fontDisplay || 'inherit')}">
  <button type="button" class="look__swatch" data-look-preview="${e(o.id)}" aria-label="Preview the ${e(o.label)} look"><span class="look__word">${e(o.label)}</span><b>Aa</b><i></i></button>
  <div class="look__body">
    <h4><span class="look__label">${e(o.label)}</span><span class="look__live">Live</span></h4>
    ${o.blurb ? `<p>${e(o.blurb)}</p>` : ''}
    <div class="look__tools"><button type="button" class="btn btn--ghost btn--sm" data-look-preview="${e(o.id)}">Preview</button><button type="button" class="btn btn--primary btn--sm" data-look-use="${e(o.id)}">Use this look</button></div>
  </div>
</article>`
    )
    .join('\n');
  return `<div class="looks" data-looks-field="${e(themes.field)}" role="list">\n${cards}\n</div>`;
}

function steps(list, label) {
  if (!list.length) return '';
  return `<div class="task__how"><h4>${e(label)}</h4><ol>${list.map((s) => `<li>${inline(s)}</li>`).join('')}</ol></div>`;
}

// What a copy button puts on the clipboard: the site's own address or its
// sitemap address (from config.productionUrl, so it moves with the domain),
// or the literal text.
export function copyValue(target, productionUrl = config.productionUrl) {
  if (target === 'site') return `${productionUrl}/`;
  if (target === 'sitemap') return `${productionUrl}/sitemap.xml`;
  return target;
}

function actionsHtml(list) {
  if (!list.length) return '';
  // url + site are real links (new tab, no JS needed); the rest are buttons
  // admin.js routes inside the editor.
  const btn = (a, i) =>
    a.kind === 'url' || a.kind === 'site'
      ? `<a class="btn ${i ? 'btn--ghost' : 'btn--primary'} btn--sm" href="${e(a.target)}" target="_blank" rel="noopener">${e(a.label)} ↗</a>`
      : `<button type="button" class="btn ${i ? 'btn--ghost' : 'btn--primary'} btn--sm" data-action-kind="${e(a.kind)}" data-action-target="${e(a.kind === 'copy' ? copyValue(a.target) : a.target)}">${e(a.label)}</button>`;
  return `<div class="task__actions">${list.map(btn).join('')}</div>`;
}

export function checklistHtml(source, themes = config.themes) {
  const items = checklistItems(source);
  if (!items.length) return '';
  return items
    .map((it, i) => {
      const checkAttrs = it.check
        ? ` data-check-kind="${e(it.check.kind)}"${it.check.path ? ` data-check-path="${e(it.check.path)}"` : ''}${it.check.value ? ` data-check-value="${e(it.check.value)}"` : ''}`
        : '';
      return `<article class="task" data-task="${e(it.id)}"${it.later ? ' data-later' : ''}${it.embed ? ` data-embed="${e(it.embed)}"` : ''}${checkAttrs}>
  <label class="task__check">
    <input type="checkbox" data-setup="${e(it.id)}" aria-label="Mark “${e(it.title)}” done">
    <i></i>
  </label>
  <div class="task__body">
    <header class="task__head">
      <span class="task__n">${String(i + 1).padStart(2, '0')}</span>
      <h3>${e(it.title)}</h3>
      ${it.later ? '<span class="task__later">Later</span>' : ''}
      <span class="task__auto">Done automatically</span>
    </header>
    ${it.why ? `<p class="task__why">${inline(it.why)}</p>` : ''}
    ${it.embed === 'looks' ? looksHtml(themes) : ''}
    ${actionsHtml(it.actions)}
    ${steps(it.phone, 'On your phone')}
    ${steps(it.desktop, 'On a computer')}
    ${it.links.length ? `<p class="task__links">${it.links.map((l) => `<a href="${e(l.href)}" target="_blank" rel="noopener">${e(l.label)} ↗</a>`).join('')}</p>` : ''}
    ${it.ask ? `<p class="task__ask"><strong>Rather have HAND do it?</strong> ${inline(it.ask)}</p>` : ''}
    ${it.done ? `<p class="task__done"><strong>Done when:</strong> ${inline(it.done)}</p>` : ''}
  </div>
</article>`;
    })
    .join('\n');
}
