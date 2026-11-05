/* Booking calendar widget. Progressive: the server-rendered form works with
   a date input + a time dropdown; this swaps in a month calendar and time
   pills fed by /api/booking/days, and submits as JSON. Bilingual through
   the page's <html lang> (the site's EN / ES switch sets it). No deps. */
(function () {
  'use strict';

  /* ---- month helpers: pure, also read by the engine tests (window.HandBookingCal) ---- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(y, m, day) { return y + '-' + pad(m) + '-' + pad(day); }
  function shiftMonth(ym, n) {
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + n;
    var dt = new Date(Date.UTC(y, m, 1));
    return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1);
  }
  function addDays(date, n) {
    var dt = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8)) + n));
    return dt.toISOString().slice(0, 10);
  }
  function lastOfMonth(ym) { var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)); return ymd(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate()); }
  // The month of the first open day (days come sorted, open days only), else `fallback`.
  function firstOpenMonth(days, fallback) {
    for (var i = 0; i < (days || []).length; i++) if (days[i] && days[i].date) return days[i].date.slice(0, 7);
    return fallback;
  }
  // The months, from today's on, that a call answered through `fetchedEnd` covers whole
  // (up to the horizon `last`); a month cut off by the server's range cap is left out.
  function coveredMonths(today, last, fetchedEnd) {
    var out = [];
    for (var ym = today.slice(0, 7); ym <= last.slice(0, 7); ym = shiftMonth(ym, 1)) {
      var need = lastOfMonth(ym) < last ? lastOfMonth(ym) : last;
      if (need > fetchedEnd) break;
      out.push(ym);
    }
    return out;
  }
  // A loaded month with no open day: { key, next } for "Nothing open in <month>" (+ "See <next>").
  function emptyNote(open, view, canNext) {
    if (!open) return null;
    for (var k in open) if (k.slice(0, 7) === view && open[k] && open[k].length) return null;
    return { key: canNext ? 'none_month' : 'none_left', next: canNext ? shiftMonth(view, 1) : '' };
  }
  function fill(tpl, month) { return String(tpl || '').replace('{month}', month); }
  window.HandBookingCal = { firstOpenMonth: firstOpenMonth, coveredMonths: coveredMonths, emptyNote: emptyNote, fill: fill, shiftMonth: shiftMonth };

  var MAX_RANGE_DAYS = 62; // the days API answers at most this many days per call
  var d = document, root = d.documentElement;
  var form = d.querySelector('[data-booking]');
  if (!form || !window.fetch) return;
  var cfg = {};
  try { cfg = JSON.parse((d.getElementById('booking-config') || {}).textContent || '{}'); } catch (_) { return; }
  var $ = function (s, r) { return (r || form).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || form).querySelectorAll(s)); };
  var dateInput = $('[name=date]'), slotInput = $('[name=slot]'), cal = $('[data-booking-cal]'), times = $('[data-booking-times]'), hint = $('[data-booking-hint]');
  var status = $('.form__status'), done = $('.form__done'), submitBtn = $('.form__submit');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var months = {}, pending = {};
  var view = cfg.today.slice(0, 7), selected = '', selectedSlot = '';

  function lang() { return root.lang === 'es' ? 'es' : 'en'; }
  function str(k) { return (cfg.strings[lang()] || cfg.strings.en)[k] || ''; }
  function locale() { return lang() === 'es' ? 'es-MX' : 'en-US'; }
  function monthName(ym) { return new Intl.DateTimeFormat(locale(), { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1))); }
  function el(tag, attrs, kids) {
    var n = d.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) n.setAttribute(k, '');
      else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? d.createTextNode(c) : c); });
    return n;
  }
  function scrollTo(node) { if (!node) return; try { node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); } catch (_) {} }

  /* hide the fallbacks, show the widgets */
  $$('.booking__fallback').forEach(function (f) { f.hidden = true; });
  dateInput.required = false; slotInput.required = false;
  cal.hidden = false; times.hidden = false;

  /* ---- month data ---- */
  function monthRange(ym) {
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
    var last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { y: y, m: m, first: ymd(y, m, 1), last: ymd(y, m, last), days: last };
  }
  function load(ym) {
    if (months[ym]) return Promise.resolve(months[ym]);
    if (pending[ym]) return pending[ym];
    var r = monthRange(ym);
    pending[ym] = fetch('/api/booking/days?from=' + r.first + '&to=' + r.last, { credentials: 'same-origin' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var map = {};
        (data && data.days || []).forEach(function (day) { map[day.date] = day.times; });
        months[ym] = map; delete pending[ym];
        return map;
      })
      .catch(function () { delete pending[ym]; return {}; });
    return pending[ym];
  }
  // First paint: one call from today to the horizon (capped by the API), then open
  // on the first month that has an open day, not on a dead end-of-month.
  function start() {
    renderCal();
    var from = cfg.today, to = cfg.last;
    fetch('/api/booking/days?from=' + from + '&to=' + to, { credentials: 'same-origin' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.today) { cfg.today = data.today; if (data.last) cfg.last = data.last; } // the page itself may be a cached copy
        var days = (data && data.days) || [];
        var end = addDays(cfg.today, MAX_RANGE_DAYS);
        if (end > cfg.last) end = cfg.last;
        coveredMonths(cfg.today, cfg.last, end).forEach(function (ym) { months[ym] = {}; });
        days.forEach(function (day) { var ym = day.date.slice(0, 7); if (months[ym]) months[ym][day.date] = day.times; });
        view = firstOpenMonth(days, cfg.today.slice(0, 7));
        refresh();
      })
      .catch(function () { refresh(); });
  }

  /* ---- calendar ---- */
  function renderCal() {
    var r = monthRange(view), open = months[view] || null;
    cal.innerHTML = '';
    var title = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(r.y, r.m - 1, 1)));
    var canPrev = view > cfg.today.slice(0, 7), canNext = view < cfg.last.slice(0, 7);
    cal.appendChild(el('div', { class: 'cal__head' }, [
      el('button', { type: 'button', class: 'cal__nav', 'aria-label': str('prev'), disabled: !canPrev, onclick: function () { view = shiftMonth(view, -1); refresh(); } }, ['‹']),
      el('strong', { class: 'cal__title', text: title.charAt(0).toUpperCase() + title.slice(1) }),
      el('button', { type: 'button', class: 'cal__nav', 'aria-label': str('next'), disabled: !canNext, onclick: function () { view = shiftMonth(view, 1); refresh(); } }, ['›']),
    ]));
    var grid = el('div', { class: 'cal__grid', role: 'grid' });
    var wd = new Intl.DateTimeFormat(locale(), { weekday: 'narrow', timeZone: 'UTC' });
    for (var i = 0; i < 7; i++) grid.appendChild(el('span', { class: 'cal__wd', text: wd.format(new Date(Date.UTC(2023, 0, 1 + i))) })); // 2023-01-01 is a Sunday
    var firstDow = new Date(Date.UTC(r.y, r.m - 1, 1)).getUTCDay();
    for (var b = 0; b < firstDow; b++) grid.appendChild(el('span', { class: 'cal__blank' }));
    for (var day = 1; day <= r.days; day++) {
      (function (date) {
        var isOpen = open && open[date] && open[date].length > 0;
        var cls = 'cal__day' + (isOpen ? ' is-open' : '') + (date === selected ? ' is-selected' : '') + (date === cfg.today ? ' is-today' : '') + (!open ? ' is-loading' : '');
        grid.appendChild(el('button', { type: 'button', class: cls, disabled: !isOpen, 'aria-pressed': date === selected ? 'true' : 'false', 'aria-label': new Intl.DateTimeFormat(locale(), { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z')), onclick: function () { pick(date); } }, [String(Number(date.slice(8)))]));
      })(ymd(r.y, r.m, day));
    }
    cal.appendChild(grid);
    if (!open) cal.appendChild(el('p', { class: 'booking__hint', text: str('loading') }));
    var note = emptyNote(open, view, canNext);
    if (note) cal.appendChild(el('div', { class: 'booking__empty', role: 'status' }, [
      el('p', { class: 'booking__hint', text: fill(str(note.key), monthName(view)) }),
      note.next ? el('button', { type: 'button', class: 'booking__see', onclick: function () { view = note.next; refresh(); } }, [fill(str('see_month'), monthName(note.next))]) : null,
    ]));
  }
  function refresh() { renderCal(); load(view).then(renderCal); }

  /* ---- times ---- */
  function renderTimes() {
    times.innerHTML = '';
    var list = selected && months[selected.slice(0, 7)] ? months[selected.slice(0, 7)][selected] || [] : [];
    if (!selected) { hint.hidden = false; hint.textContent = str('pick_day'); return; }
    if (!list.length) { hint.hidden = false; hint.textContent = str('none'); return; }
    hint.hidden = true;
    list.forEach(function (t) {
      var label = (lang() === 'es' && t.label_es) || t.label;
      times.appendChild(el('button', { type: 'button', class: 'booking__time' + (t.id === selectedSlot ? ' is-selected' : ''), 'aria-pressed': t.id === selectedSlot ? 'true' : 'false', onclick: function () { pickSlot(t.id); } }, [label]));
    });
  }
  function pick(date) {
    selected = date; selectedSlot = ''; dateInput.value = date; slotInput.value = '';
    renderCal(); renderTimes();
    scrollTo($('[data-step=time]'));
  }
  function pickSlot(id) {
    selectedSlot = id; slotInput.value = id; renderTimes();
    scrollTo($('[data-step=details]'));
  }

  /* ---- service → day ---- */
  $$('[name=service]').forEach(function (r) { r.addEventListener('change', function () { if (r.checked) scrollTo($('[data-step=day]')); }); });
  $$('[data-upper]').forEach(function (i) { i.addEventListener('input', function () { i.value = i.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); }); });

  /* ---- language changes re-render the dynamic parts ---- */
  if (window.MutationObserver) new MutationObserver(function () { renderCal(); renderTimes(); }).observe(root, { attributes: true, attributeFilter: ['lang'] });

  /* ---- submit ---- */
  function fail(msg) { form.classList.remove('is-sending'); status.className = 'form__status is-bad'; status.textContent = msg; submitBtn.disabled = false; }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var service = $('[name=service]:checked');
    if (!service) { fail(str('choose_service')); scrollTo($('[data-step=service]')); return; }
    if (!selected) { fail(str('pick_day')); scrollTo($('[data-step=day]')); return; }
    if (!selectedSlot) { fail(str('choose_time')); scrollTo($('[data-step=time]')); return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var body = {};
    new FormData(form).forEach(function (v, k) { body[k] = v; });
    body.lang = lang();
    form.classList.add('is-sending'); submitBtn.disabled = true;
    status.className = 'form__status'; status.textContent = str('sending');
    fetch('/api/booking', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
      .then(function (r) {
        if (!r.res.ok || !r.data || r.data.ok === false) throw new Error((r.data && r.data.error) || str('failed'));
        status.textContent = '';
        $$('.form__group, .form__actions').forEach(function (n) { n.hidden = true; });
        var sum = $('[data-booking-summary]');
        if (sum && r.data.when) sum.textContent = str('asked') + ': ' + (r.data.when[lang()] || r.data.when.en) + ' · ' + r.data.service;
        var manage = $('[data-booking-manage]');
        if (manage && r.data.manage_url) manage.href = r.data.manage_url;
        else if (manage) manage.hidden = true;
        done.hidden = false; done.focus();
        scrollTo(done);
      })
      .catch(function (err) { fail(err.message || str('failed')); });
  });

  start(); renderTimes();
})();
