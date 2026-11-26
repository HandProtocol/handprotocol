/* Booking calendar widget. Progressive: the server-rendered form works with
   a date input + a time dropdown; this swaps in a month calendar and time
   pills fed by /api/booking/days, and submits as JSON. Bilingual through
   the page's <html lang> (the site's EN / ES switch sets it). No deps. */
(function () {
  'use strict';
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
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(y, m, day) { return y + '-' + pad(m) + '-' + pad(day); }
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
  function shiftMonth(ym, n) {
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + n;
    var dt = new Date(Date.UTC(y, m, 1));
    return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1);
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

  refresh(); renderTimes();
})();
