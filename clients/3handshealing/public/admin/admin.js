/* Owner editor. Vanilla JS. Talks to /api/* with the session cookie.
   The shell is server-rendered (lib/admin-page.mjs) with the site's theme. */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var DRAFT_KEY = 'site-draft-v1';

  var state = { editor: null, site: null, schema: [], content: null, published: null, media: [], dirty: false, setupOpen: 0, bookings: null };

  // ---------------------------------------------------------------- utils --
  function h(tag, attrs, children) {
    var el = d.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) el.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c == null) return; el.appendChild(typeof c === 'string' ? d.createTextNode(c) : c); });
    return el;
  }
  function toast(msg, kind) {
    var t = h('div', { class: 'toast ' + (kind || ''), text: msg });
    $('#toasts').appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(function () { t.remove(); }, 400); }, 3200);
  }
  async function api(method, path, body) {
    var res = await fetch(path, {
      method: method, credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    var data = null; try { data = await res.json(); } catch (_) {}
    if (res.status === 401 && path.indexOf('/api/auth/') !== 0) { showLogin(); throw new Error('Signed out'); }
    if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('Request failed (' + res.status + ')'));
    return data;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // ---------------------------------------------------------------- brand --
  // The page arrives server-rendered with the site's name, logo and theme
  // (lib/admin-page.mjs); this only scopes the local draft key per site.
  function applySite(site) {
    if (!site) return;
    state.site = site;
    DRAFT_KEY = site.slug + '-draft-v1';
  }
  function fmtDate(iso) { try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (_) { return iso; } }

  // ---------------------------------------------------------------- views --
  function showLogin() {
    $('#app').dataset.state = 'login';
    $('#login').hidden = false; $('#shell').hidden = true;
  }
  function showShell() {
    $('#app').dataset.state = 'app';
    $('#login').hidden = true; $('#shell').hidden = false;
    $('#who').textContent = state.editor.email;
    $('#tab-editors').hidden = state.editor.role !== 'owner';
    // First visit with setup left to do: open the Setup tab, once per session.
    try {
      if (state.setupOpen && !sessionStorage.getItem(DRAFT_KEY + '-setup-seen')) {
        sessionStorage.setItem(DRAFT_KEY + '-setup-seen', '1');
        setTab('setup');
      }
    } catch (_) {}
  }
  function setTab(name) {
    if (!$('[data-tab="' + name + '"]')) name = 'content';
    $$('.tab').forEach(function (t) { t.classList.toggle('is-active', t.dataset.tab === name); });
    ['content', 'media', 'editors', 'history', 'setup', 'bookings'].forEach(function (p) { var el = $('#panel-' + p); if (el) el.hidden = p !== name; });
    if (name === 'editors') loadEditors();
    if (name === 'history') loadHistory();
    if (name === 'bookings') loadBookings();
    if (name === 'setup') { var nxt = $('#setuplist .task:not(.is-done):not([data-later])'); if (nxt) setTimeout(function () { nxt.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }
  }
  $$('.tab').forEach(function (t) { t.addEventListener('click', function () { setTab(t.dataset.tab); }); });

  // ---------------------------------------------------------------- auth --
  $('#loginform').addEventListener('submit', async function (e) {
    e.preventDefault();
    var msg = $('#loginmsg'), btn = $('button', e.target), email = e.target.email.value.trim();
    btn.disabled = true; msg.className = 'login__msg'; msg.textContent = 'Sending…';
    try {
      var r = await api('POST', '/api/auth/request', { email: email });
      msg.className = 'login__msg ok';
      msg.textContent = r.sent === false ? 'Email isn’t set up on this site yet — ask HAND to add the link from the logs.' : 'Check your inbox for a sign-in link. It works once and expires in 20 minutes.';
    } catch (err) { msg.className = 'login__msg bad'; msg.textContent = err.message; }
    btn.disabled = false;
  });
  $('#logout').addEventListener('click', async function () {
    try { await api('POST', '/api/auth/logout', {}); } catch (_) {}
    state.editor = null; showLogin();
  });

  async function boot() {
    try { applySite((await api('GET', '/api/content')).site); } catch (_) {}
    var params = new URLSearchParams(location.search), token = params.get('t');
    if (token) {
      history.replaceState(null, '', '/admin/');
      try {
        var v = await api('POST', '/api/auth/verify', { token: token });
        state.editor = v.editor;
      } catch (err) {
        showLogin(); $('#loginmsg').className = 'login__msg bad'; $('#loginmsg').textContent = err.message; return;
      }
    }
    if (!state.editor) {
      try { state.editor = (await api('GET', '/api/auth/me')).editor; } catch (_) { showLogin(); return; }
    }
    await loadSite();
    await loadBookingSummary();
    showShell();
    landFromLink();
  }
  // Arriving from an email link (/admin/?toast=confirmed&booking=<id>#bookings).
  function landFromLink() {
    var params = new URLSearchParams(location.search), t = params.get('toast');
    var hash = location.hash;
    if (t || hash === '#bookings') history.replaceState(null, '', '/admin/' + (hash === '#bookings' ? '#bookings' : ''));
    if (hash === '#bookings' && $('[data-tab="bookings"]')) { setTab('bookings'); if (params.get('booking')) state.bookingFlash = params.get('booking'); }
    var MSG = { confirmed: ['Confirmed. The customer has been emailed.', 'ok'], declined: ['Declined. The customer has been emailed.', 'ok'], 'link-used': ['That link was already used. The request is below.', ''], 'link-expired': ['That link expired. Confirm from the list below.', 'bad'], 'link-invalid': ['That link is not valid.', 'bad'] };
    if (!t) return;
    var m = MSG[t] || (t.indexOf('already-') === 0 ? ['That request is already ' + t.slice(8).replace('_', ' ') + '.', ''] : null);
    if (m) toast(m[0], m[1]);
  }

  // ------------------------------------------------------------- content --
  async function loadSite() {
    var data = await api('GET', '/api/content');
    applySite(data.site);
    state.schema = data.schema; state.published = data.content; state.media = data.media;
    var draft = null;
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (_) {}
    if (draft && draft.base === JSON.stringify(data.content)) { state.content = draft.content; state.dirty = true; }
    else { state.content = clone(data.content); state.dirty = false; localStorage.removeItem(DRAFT_KEY); }
    renderContent(); renderMedia(); renderSetup(); updateSavebar();
  }

  // ------------------------------------------------------------- setup ----
  // The checklist is server-rendered (lib/admin-page.mjs). Each task either
  // ticks itself (data-check-*) or is ticked by the owner; ticks save on the
  // spot through PATCH /api/admin/content, no Publish needed.
  function taskCheck(task) {
    var kind = task.getAttribute('data-check-kind'); if (!kind) return false;
    var path = (task.getAttribute('data-check-path') || '').split('.');
    var val = path.length === 2 && state.content[path[0]] ? state.content[path[0]][path[1]] : undefined;
    if (kind === 'field') return typeof val === 'string' ? val.trim() !== '' : Boolean(val);
    if (kind === 'value') return String(val) === (task.getAttribute('data-check-value') || '');
    if (kind === 'media') return state.media.some(function (m) { return !m.is_placeholder; });
    if (kind === 'host') return !/\.netlify\.app$/i.test(location.hostname) && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
    if (kind === 'booking') return Boolean(state.bookings && state.bookings.self_test);
    return false;
  }
  function renderSetup() {
    var list = $('#setuplist'); if (!list) return;
    var doc = state.content.setup || {};
    var tasks = $$('.task', list), done = 0, next = null;
    tasks.forEach(function (task) {
      var id = task.getAttribute('data-task'), box = $('[data-setup]', task);
      var manual = Boolean(doc[id]), auto = !manual && taskCheck(task), isDone = manual || auto;
      box.checked = isDone; box.disabled = auto;
      task.classList.toggle('is-done', isDone); task.classList.toggle('is-auto', auto);
      if (isDone) done++; else if (!next && !task.hasAttribute('data-later')) next = task;
      if (!box.dataset.bound) {
        box.dataset.bound = '1';
        box.addEventListener('change', function () { setTaskDone(id, box.checked); });
        $('.task__head', task).addEventListener('click', function (ev) {
          if (ev.target.closest('button,a,label,input')) return;
          if (task.classList.contains('is-done')) task.classList.toggle('is-open');
        });
      }
    });
    var total = tasks.length, left = total - done;
    var bar = $('#setupprogress');
    if (bar) {
      $('i', bar).style.setProperty('--p', total ? done / total : 0);
      $('span', bar).textContent = !left ? 'All done. Your site is fully set up.' : done + ' of ' + total + ' done' + (next ? ' · next: ' + $('h3', next).textContent : '');
    }
    var pill = $('#setupcount'); if (pill) pill.textContent = left ? String(left) : '';
    state.setupOpen = left;
    orderSetupTab(left);
    syncLooks();
  }
  // Setup goes first in the tab bar while there is work left, last when done;
  // Bookings jumps ahead of everything while requests are waiting.
  function orderSetupTab(left) {
    var tab = $('[data-tab="setup"]');
    if (tab) {
      var nav = tab.parentNode;
      if (left && nav.firstElementChild !== tab) nav.insertBefore(tab, nav.firstElementChild);
      if (!left && nav.lastElementChild !== tab) nav.appendChild(tab);
    }
    var bk = $('[data-tab="bookings"]');
    if (bk && state.bookings && state.bookings.requested && bk.parentNode.firstElementChild !== bk) bk.parentNode.insertBefore(bk, bk.parentNode.firstElementChild);
  }
  async function setTaskDone(id, on) {
    var set = {}; set['setup.' + id] = on;
    try { await patchContent(set); toast(on ? 'Saved. Nice work.' : 'Unticked', 'ok'); }
    catch (err) { toast(err.message, 'bad'); }
    renderSetup();
  }
  // Publishes just the given '<section>.<field>' values (setup ticks, the
  // Looks pick) and leaves the owner's unpublished draft edits alone.
  async function patchContent(set) {
    var r = await api('PATCH', '/api/admin/content', { set: set });
    state.published = r.content;
    Object.keys(set).forEach(function (path) {
      var p = path.split('.');
      if (!state.content[p[0]]) state.content[p[0]] = {};
      state.content[p[0]][p[1]] = r.content[p[0]] && p[1] in r.content[p[0]] ? r.content[p[0]][p[1]] : set[path];
    });
    markDirty();
    return r;
  }

  // ----------------------------------------------------------- actions ----
  // Task buttons: the step is the button. Kinds are validated server-side
  // (lib/checklist.mjs); here they just go somewhere.
  function flash(el) { if (!el) return; el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash'); setTimeout(function () { el.classList.remove('is-flash'); }, 1500); }
  function runAction(kind, target) {
    if (kind === 'tab') { setTab(target); return; }
    if (kind === 'section' || kind === 'field') {
      setTab('content');
      var secKey = kind === 'field' ? target.split('.')[0] : target;
      var sec = $('#sec-' + secKey);
      if (!sec) { toast('That section is not on this site', 'bad'); return; }
      var fld = kind === 'field' ? $('[data-path="' + target + '"]', sec) : null;
      var el = fld || sec;
      el.scrollIntoView({ behavior: 'smooth', block: fld ? 'center' : 'start' });
      flash(el);
      if (fld) { var inp = $('input,textarea,select', fld) || $('button', fld); if (inp) setTimeout(function () { inp.focus({ preventScroll: true }); }, 450); }
      return;
    }
    if (kind === 'site') { window.open(new URL(target, location.origin + '/').href, '_blank', 'noopener'); return; } // root-relative: never /admin/#hash
    if (kind === 'copy') {
      var copied = function () { toast('Copied: ' + target, 'ok'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(target).then(copied, function () { window.prompt('Copy this:', target); });
      else window.prompt('Copy this:', target);
      return;
    }
    if (kind === 'looks') {
      var grid = $('#panel-setup .looks') || $('#contentform .looks');
      if (!grid) return;
      setTab(grid.closest('#panel-setup') ? 'setup' : 'content');
      grid.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(grid);
    }
  }
  d.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-action-kind]'); if (!btn) return;
    runAction(btn.getAttribute('data-action-kind'), btn.getAttribute('data-action-target') || '');
  });

  // ------------------------------------------------------------- looks ----
  // The Looks picker (config.themes): cards are server-rendered into the
  // Setup task and into <template id="looks-tpl"> for the Content tab.
  // Preview = the live site in that look, inside the editor. Use = publish.
  var looksTpl = $('#looks-tpl');
  var LOOKS = looksTpl ? $$('.look', looksTpl.content).map(function (l) { return { id: l.getAttribute('data-look'), label: $('.look__label', l).textContent }; }) : [];
  var LOOKS_FIELD = looksTpl ? ($('.looks', looksTpl.content).getAttribute('data-looks-field') || '') : '';
  var previewId = '';
  function currentLook() { var p = LOOKS_FIELD.split('.'); return state.published && state.published[p[0]] ? String(state.published[p[0]][p[1]] || '') : ''; }
  function markLive(root, id) { $$('.look', root).forEach(function (l) { l.classList.toggle('is-live', l.getAttribute('data-look') === id); }); }
  function syncLooks() { if (!LOOKS.length) return; var id = currentLook(); $$('.looks').forEach(function (g) { markLive(g, id); }); }
  function looksPicker(value) {
    var node = d.importNode(looksTpl.content, true).firstElementChild;
    markLive(node, value || currentLook());
    return node;
  }
  async function useLook(id) {
    var set = {}; set[LOOKS_FIELD] = id;
    var themeTask = $('.task[data-embed="looks"]');
    if (themeTask) set['setup.' + themeTask.getAttribute('data-task')] = true;
    try { await patchContent(set); renderSetup(); toast('Live now. Change it any time.', 'ok'); }
    catch (err) { toast(err.message, 'bad'); }
  }
  function openPreview(id) {
    var ov = $('#preview'); if (!ov) return;
    previewId = id;
    var look = LOOKS.filter(function (l) { return l.id === id; })[0];
    $('#previewname').textContent = look ? look.label : id;
    $('#previewframe').src = '/?theme=' + encodeURIComponent(id);
    var live = currentLook() === id;
    $('#previewuse').textContent = live ? 'This is your live look' : 'Use this look';
    $('#previewuse').disabled = live;
    ov.hidden = false; d.body.classList.add('has-preview');
    $('#previewclose').focus();
  }
  function closePreview() {
    var ov = $('#preview'); if (!ov || ov.hidden) return;
    ov.hidden = true; $('#previewframe').src = 'about:blank'; d.body.classList.remove('has-preview');
  }
  function stepPreview(dir) {
    var i = LOOKS.map(function (l) { return l.id; }).indexOf(previewId);
    openPreview(LOOKS[(i + dir + LOOKS.length) % LOOKS.length].id);
  }
  if ($('#preview')) {
    $('#previewclose').addEventListener('click', closePreview);
    $('#previewprev').addEventListener('click', function () { stepPreview(-1); });
    $('#previewnext').addEventListener('click', function () { stepPreview(1); });
    $('#previewuse').addEventListener('click', async function () { var id = previewId; $('#previewuse').disabled = true; await useLook(id); closePreview(); });
    d.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closePreview(); });
  }
  d.addEventListener('click', function (ev) {
    var pv = ev.target.closest('[data-look-preview]');
    if (pv) { openPreview(pv.getAttribute('data-look-preview')); return; }
    var use = ev.target.closest('[data-look-use]');
    if (use) { use.disabled = true; useLook(use.getAttribute('data-look-use')).then(function () { use.disabled = false; }); }
  });

  function markDirty() {
    state.dirty = JSON.stringify(state.content) !== JSON.stringify(state.published);
    try {
      if (state.dirty) localStorage.setItem(DRAFT_KEY, JSON.stringify({ base: JSON.stringify(state.published), content: state.content }));
      else localStorage.removeItem(DRAFT_KEY);
    } catch (_) {}
    updateSavebar();
  }
  function updateSavebar() { $('#savebar').hidden = !state.dirty; }

  function fieldEl(field, value, onChange, opts) {
    var wrap = h('label', { class: 'field' + (opts && opts.wide ? ' field--wide' : '') });
    var label = h('span', {}, [field.label]);
    var counter = null;
    if (field.type === 'text' || field.type === 'textarea') {
      counter = h('small', { text: (value || '').length + '/' + field.max });
      label.appendChild(counter);
    }
    wrap.appendChild(label);
    var input;
    if (field.type === 'toggle') {
      wrap.className = 'field';
      wrap.innerHTML = '';
      input = h('input', { type: 'checkbox' });
      input.checked = Boolean(value);
      input.addEventListener('change', function () { onChange(input.checked); });
      wrap.appendChild(h('span', {}, [field.label]));
      wrap.appendChild(h('span', { class: 'switch' }, [input, h('i')]));
    } else if (field.type === 'select' && field.ui === 'looks' && looksTpl) {
      wrap.className = 'field field--wide';
      wrap.appendChild(looksPicker(value));
      if (field.help) wrap.appendChild(h('span', { class: 'help', text: field.help }));
      return wrap;
    } else if (field.type === 'select') {
      input = h('select', {}, (field.options || []).map(function (o) {
        var v = typeof o === 'string' ? o : String(o.value), l = typeof o === 'string' ? o : (o.label || String(o.value));
        return h('option', { value: v, text: l });
      }));
      input.value = value || '';
      input.addEventListener('change', function () { onChange(input.value); });
      wrap.appendChild(input);
    } else {
      input = field.type === 'textarea' ? h('textarea', { maxlength: field.max }) : h('input', { type: field.ui === 'date' ? 'date' : 'text', maxlength: field.max });
      input.value = value || '';
      input.addEventListener('input', function () { counter.textContent = input.value.length + '/' + field.max; onChange(input.value); });
      wrap.appendChild(input);
    }
    if (field.help) wrap.appendChild(h('span', { class: 'help', text: field.help }));
    return wrap;
  }

  function listEl(field, sectionKey) {
    var box = h('div', { class: 'listfield' });
    box.dataset.path = sectionKey + '.' + field.key;
    function render() {
      box.innerHTML = '';
      var rows = state.content[sectionKey][field.key];
      var head = h('div', { class: 'listfield__head' }, [
        h('span', { text: field.label + ' · ' + rows.length + '/' + field.max }),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: '+ Add', disabled: rows.length >= field.max, onclick: function () {
          var blank = {}; field.item.forEach(function (f) { blank[f.key] = f.type === 'toggle' ? false : ''; });
          rows.push(blank); markDirty(); render();
        } }),
      ]);
      box.appendChild(head);
      if (field.help) box.appendChild(h('p', { class: 'help muted tiny', text: field.help }));
      rows.forEach(function (row, i) {
        var fields = h('div', { class: 'item__fields' });
        field.item.forEach(function (f) {
          fields.appendChild(fieldEl(f, row[f.key], function (v) { row[f.key] = v; markDirty(); }, { wide: f.type === 'textarea' }));
        });
        var tools = h('div', { class: 'item__tools' }, [
          h('button', { class: 'icon', type: 'button', title: 'Move up', text: '↑', disabled: i === 0, onclick: function () { rows.splice(i - 1, 0, rows.splice(i, 1)[0]); markDirty(); render(); } }),
          h('button', { class: 'icon', type: 'button', title: 'Move down', text: '↓', disabled: i === rows.length - 1, onclick: function () { rows.splice(i + 1, 0, rows.splice(i, 1)[0]); markDirty(); render(); } }),
          h('button', { class: 'icon', type: 'button', title: 'Remove', text: '×', onclick: function () { if (confirm('Remove this item?')) { rows.splice(i, 1); markDirty(); render(); } } }),
        ]);
        box.appendChild(h('div', { class: 'item' }, [fields, tools]));
      });
    }
    render();
    return box;
  }

  function renderContent() {
    var form = $('#contentform'), nav = $('#sidenav');
    form.innerHTML = ''; nav.innerHTML = '';
    state.schema.forEach(function (section) {
      if (section.hidden) return; // engine-owned sections (the Setup checklist) have their own tab
      var sec = h('section', { class: 'sec', id: 'sec-' + section.key });
      sec.appendChild(h('div', { class: 'sec__head' }, [h('h2', { text: section.label }), section.help ? h('p', { text: section.help }) : null]));
      var grid = h('div', { class: 'grid2' });
      section.fields.forEach(function (field) {
        if (field.type === 'list') { sec.appendChild(grid); grid = h('div', { class: 'grid2' }); sec.appendChild(listEl(field, section.key)); return; }
        var el = fieldEl(field, state.content[section.key][field.key], function (v) { state.content[section.key][field.key] = v; markDirty(); }, { wide: field.type === 'textarea' });
        el.dataset.path = section.key + '.' + field.key;
        if (field.type === 'textarea' || (field.type === 'select' && field.ui === 'looks')) el.style.gridColumn = '1 / -1';
        grid.appendChild(el);
      });
      if (grid.children.length) sec.appendChild(grid);
      form.appendChild(sec);
      nav.appendChild(h('a', { href: '#sec-' + section.key, text: section.label }));
    });
    // active side link
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) $$('a', nav).forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); }); });
      }, { rootMargin: '-20% 0px -70% 0px' });
      $$('.sec', form).forEach(function (s) { io.observe(s); });
    }
  }

  $('#publish').addEventListener('click', async function () {
    var btn = $('#publish'); btn.disabled = true; btn.textContent = 'Publishing…';
    try {
      var r = await api('PUT', '/api/admin/content', { content: state.content });
      state.published = r.content; state.content = clone(r.content); markDirty(); renderContent(); renderSetup();
      toast(r.purged ? 'Published. The site is live.' : 'Published. Live within a few minutes.', 'ok');
    } catch (err) { toast(err.message, 'bad'); }
    btn.disabled = false; btn.textContent = 'Publish changes';
  });
  $('#discard').addEventListener('click', function () {
    if (!confirm('Throw away your unpublished changes?')) return;
    state.content = clone(state.published); markDirty(); renderContent(); renderSetup();
  });

  // --------------------------------------------------------------- media --
  function categories() { return Array.from(new Set(state.media.map(function (m) { return m.category; }).filter(Boolean))); }

  function renderMedia() {
    var grid = $('#mediagrid'); grid.innerHTML = '';
    $('#mediacount').textContent = state.media.length || '';
    var hasPh = state.media.some(function (m) { return m.is_placeholder; });
    $('#removeplaceholders').hidden = !hasPh;
    var dl = h('datalist', { id: 'cats' }, categories().map(function (c) { return h('option', { value: c }); }));
    grid.appendChild(dl);
    if (!state.media.length) { grid.appendChild(h('p', { class: 'empty', text: 'No images yet. Add photos to start your gallery.' })); return; }
    state.media.forEach(function (m, i) { grid.appendChild(mediaCard(m, i)); });
  }

  function mediaCard(m, i) {
    var card = h('article', { class: 'mcard', draggable: 'true', 'data-id': m.id });
    var overlay = h('div', { class: 'mcard__overlay', hidden: true });
    var thumb = h('div', { class: 'mcard__thumb' }, [
      h('img', { src: m.view.src, alt: m.alt || '', loading: 'lazy' }),
      m.featured ? h('span', { class: 'mcard__badge', text: 'Featured' }) : (m.is_placeholder ? h('span', { class: 'mcard__badge mcard__badge--ph', text: 'Placeholder' }) : null),
      h('span', { class: 'mcard__n', text: String(i + 1) }),
      h('button', { class: 'mcard__replace', type: 'button', title: 'Upload a photo in place of this one', text: '↻ Replace', onclick: function () { pickFile(function (file) { replaceOne(m, file, overlay); }); } }),
      overlay,
    ]);
    var patchTimer = null, pending = {};
    function queuePatch(k, v) {
      pending[k] = v; clearTimeout(patchTimer);
      patchTimer = setTimeout(async function () {
        var body = pending; pending = {};
        try { var r = await api('PATCH', '/api/admin/media/' + m.id, body); Object.assign(m, r.media); }
        catch (err) { toast(err.message, 'bad'); }
      }, 600);
    }
    var fields = h('div', { class: 'mcard__fields' }, [
      h('input', { type: 'text', placeholder: 'Describe the photo (alt text)', value: m.alt || '', maxlength: 160, oninput: function (e) { queuePatch('alt', e.target.value); } }),
      h('input', { type: 'text', placeholder: 'Caption (optional)', value: m.caption || '', maxlength: 160, oninput: function (e) { queuePatch('caption', e.target.value); } }),
      h('input', { type: 'text', placeholder: 'Category (e.g. Portraits)', value: m.category || '', maxlength: 40, list: 'cats', oninput: function (e) { queuePatch('category', e.target.value); } }),
    ]);
    var tools = h('div', { class: 'mcard__tools' }, [
      h('button', { class: 'icon', type: 'button', title: 'Move earlier', text: '←', disabled: i === 0, onclick: function () { move(i, i - 1); } }),
      h('button', { class: 'icon', type: 'button', title: 'Move later', text: '→', disabled: i === state.media.length - 1, onclick: function () { move(i, i + 1); } }),
      h('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: m.featured ? '★ Featured' : 'Set featured', disabled: m.featured, onclick: async function () {
        try { await api('PATCH', '/api/admin/media/' + m.id, { featured: true }); state.media.forEach(function (x) { x.featured = x.id === m.id; }); renderMedia(); toast('Featured image updated', 'ok'); }
        catch (err) { toast(err.message, 'bad'); }
      } }),
      h('span', { class: 'spacer' }),
      h('button', { class: 'icon btn--danger', type: 'button', title: 'Delete', text: '🗑', onclick: async function () {
        if (!confirm('Delete this image from the site?')) return;
        try { await api('DELETE', '/api/admin/media/' + m.id); state.media = state.media.filter(function (x) { return x.id !== m.id; }); renderMedia(); toast('Image removed', 'ok'); }
        catch (err) { toast(err.message, 'bad'); }
      } }),
    ]);
    card.appendChild(thumb); card.appendChild(fields); card.appendChild(tools);
    // drag & drop reorder
    card.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', m.id); card.classList.add('is-dragging'); });
    card.addEventListener('dragend', function () { card.classList.remove('is-dragging'); });
    card.addEventListener('dragover', function (e) {
      e.preventDefault();
      var isFile = Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0;
      card.classList.toggle('is-over-file', isFile); card.classList.toggle('is-over', !isFile);
    });
    card.addEventListener('dragleave', function () { card.classList.remove('is-over', 'is-over-file'); });
    card.addEventListener('drop', function (e) {
      e.preventDefault(); card.classList.remove('is-over', 'is-over-file');
      if (e.dataTransfer.files && e.dataTransfer.files.length) { replaceOne(m, e.dataTransfer.files[0], overlay); return; }
      var fromId = e.dataTransfer.getData('text/plain');
      var from = state.media.findIndex(function (x) { return x.id === fromId; });
      var to = state.media.findIndex(function (x) { return x.id === m.id; });
      if (from >= 0 && to >= 0 && from !== to) move(from, to);
    });
    return card;
  }

  var orderTimer = null;
  function move(from, to) {
    state.media.splice(to, 0, state.media.splice(from, 1)[0]);
    renderMedia();
    clearTimeout(orderTimer);
    orderTimer = setTimeout(async function () {
      try { await api('PUT', '/api/admin/media/order', { ids: state.media.map(function (x) { return x.id; }) }); toast('Order saved', 'ok'); }
      catch (err) { toast(err.message, 'bad'); }
    }, 500);
  }

  $('#removeplaceholders').addEventListener('click', async function () {
    if (!confirm('Remove all placeholder images? Your uploaded photos stay.')) return;
    try { await api('POST', '/api/admin/media/remove-placeholders', {}); state.media = state.media.filter(function (m) { return !m.is_placeholder; }); renderMedia(); toast('Placeholders removed', 'ok'); }
    catch (err) { toast(err.message, 'bad'); }
  });

  // uploads: resize on-device (max 2400px long edge → WebP), then PUT straight to storage
  var MAX_EDGE = 2400;
  async function prepareImage(file) {
    if (file.type === 'image/gif') return { blob: file, type: file.type, width: null, height: null };
    var bitmap;
    try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (_) { return { blob: file, type: file.type, width: null, height: null }; }
    var scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    var w = Math.round(bitmap.width * scale), hh = Math.round(bitmap.height * scale);
    if (scale === 1 && file.size < 900 * 1024 && file.type !== 'image/png') { var r0 = { blob: file, type: file.type, width: w, height: hh }; bitmap.close(); return r0; }
    var canvas = d.createElement('canvas'); canvas.width = w; canvas.height = hh;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, hh); bitmap.close();
    var blob = await new Promise(function (res) { canvas.toBlob(res, 'image/webp', 0.86); });
    if (!blob || blob.type !== 'image/webp') blob = await new Promise(function (res) { canvas.toBlob(res, 'image/jpeg', 0.88); });
    return { blob: blob, type: blob.type, width: w, height: hh };
  }
  function altFromName(name) { return name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120); }

  // Opens the file picker for a single image (used by per-card Replace).
  function pickFile(cb) {
    var inp = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif,image/gif' });
    inp.style.display = 'none'; d.body.appendChild(inp);
    inp.addEventListener('change', function () { if (inp.files[0]) cb(inp.files[0]); inp.remove(); });
    inp.click();
  }
  // Resize + PUT to storage; resolves with what the API needs to record it.
  async function pushToStorage(file, onStage) {
    var prep = await prepareImage(file);
    if (onStage) onStage('uploading');
    var sign = await api('POST', '/api/admin/media/upload-url', { name: file.name, type: prep.type, size: prep.blob.size });
    var put = await fetch(sign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': prep.type, 'x-upsert': 'false' }, body: prep.blob });
    if (!put.ok) throw new Error('Upload failed (' + put.status + ')');
    return { path: sign.path, width: prep.width, height: prep.height, bytes: prep.blob.size, mime: prep.type };
  }
  async function replaceOne(m, file, overlay) {
    if (!/^image\//.test(file.type)) { toast('Pick an image file (JPG, PNG, WebP)', 'bad'); return; }
    overlay.hidden = false; overlay.textContent = 'Preparing…';
    try {
      var up = await pushToStorage(file, function () { overlay.textContent = 'Uploading…'; });
      overlay.textContent = 'Saving…';
      if (/^Placeholder image \d+$/.test(m.alt || '') || !m.alt) up.alt = altFromName(file.name);
      var r = await api('POST', '/api/admin/media/' + m.id + '/replace', up);
      var idx = state.media.findIndex(function (x) { return x.id === m.id; });
      if (idx >= 0) state.media[idx] = r.media;
      renderMedia();
      toast(r.purged ? 'Photo replaced. The site is live.' : 'Photo replaced. Live within a few minutes.', 'ok');
    } catch (err) { overlay.hidden = true; toast(err.message, 'bad'); }
  }
  async function uploadFiles(files) {
    var list = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); });
    if (!list.length) { toast('Pick image files (JPG, PNG, WebP)', 'bad'); return; }
    for (var i = 0; i < list.length; i++) await uploadOne(list[i]);
    renderMedia();
  }
  async function uploadOne(file) {
    var row = h('div', { class: 'upload' }, [h('span', { text: file.name }), h('i'), h('b', { text: 'preparing' })]);
    $('#uploads').appendChild(row);
    var bar = $('i', row), status = $('b', row);
    try {
      var up = await pushToStorage(file, function () { status.textContent = 'uploading'; bar.style.setProperty('--p', 0.25); });
      bar.style.setProperty('--p', 0.8);
      up.alt = altFromName(file.name);
      var reg = await api('POST', '/api/admin/media', up);
      state.media.push(reg.media);
      bar.style.setProperty('--p', 1); status.textContent = 'done';
      setTimeout(function () { row.remove(); }, 1500);
    } catch (err) { row.classList.add('is-bad'); status.textContent = err.message; }
  }
  $('#fileinput').addEventListener('change', function (e) { uploadFiles(e.target.files); e.target.value = ''; });
  var dz = $('#dropzone');
  ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-over'); }); });
  dz.addEventListener('drop', function (e) { if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); });

  // ------------------------------------------------------------- editors --
  async function loadEditors() {
    var ul = $('#editorlist'); ul.innerHTML = '';
    try {
      var r = await api('GET', '/api/admin/editors');
      r.editors.forEach(function (ed) {
        ul.appendChild(h('li', {}, [
          h('div', { class: 'grow' }, [h('strong', { text: ed.email }), h('small', { text: ed.last_login_at ? 'Last sign-in ' + fmtDate(ed.last_login_at) : 'Never signed in' })]),
          h('span', { class: 'role', text: ed.role }),
          ed.id !== state.editor.id ? h('button', { class: 'btn btn--ghost btn--sm btn--danger', type: 'button', text: 'Remove', onclick: async function () {
            if (!confirm('Remove ' + ed.email + '?')) return;
            try { await api('DELETE', '/api/admin/editors/' + ed.id); loadEditors(); } catch (err) { toast(err.message, 'bad'); }
          } }) : h('span', { class: 'tiny muted', text: 'you' }),
        ]));
      });
    } catch (err) { toast(err.message, 'bad'); }
  }
  $('#editorform').addEventListener('submit', async function (e) {
    e.preventDefault();
    try { await api('POST', '/api/admin/editors', { email: e.target.email.value, role: e.target.role.value }); e.target.reset(); loadEditors(); toast('Added. They can request a sign-in link now.', 'ok'); }
    catch (err) { toast(err.message, 'bad'); }
  });

  // ------------------------------------------------------------- history --
  async function loadHistory() {
    var ul = $('#historylist'); ul.innerHTML = '';
    try {
      var r = await api('GET', '/api/admin/revisions');
      if (!r.revisions.length) { ul.appendChild(h('li', { class: 'empty', text: 'Nothing published yet.' })); return; }
      r.revisions.forEach(function (rev, i) {
        ul.appendChild(h('li', {}, [
          h('div', { class: 'grow' }, [h('strong', { text: fmtDate(rev.created_at) + (i === 0 ? ' · current' : '') }), h('small', { text: rev.editor && rev.editor.email ? 'by ' + rev.editor.email : '' })]),
          i > 0 ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Restore', onclick: async function () {
            if (!confirm('Publish this earlier version of the copy?')) return;
            try { var res = await api('POST', '/api/admin/revisions/' + rev.id + '/restore', {}); state.published = res.content; state.content = clone(res.content); markDirty(); renderContent(); loadHistory(); toast('Restored and published', 'ok'); }
            catch (err) { toast(err.message, 'bad'); }
          } }) : null,
        ]));
      });
    } catch (err) { toast(err.message, 'bad'); }
  }


  // ------------------------------------------------------------ bookings --
  // The Bookings tab (config.booking): requested inbox, confirmed by day,
  // past, declined. Every button is one tap; the customer is emailed by the
  // server on confirm / another time / decline / cancel.
  var BK = { data: null, day: '' };
  var bkPanel = $('#panel-bookings');
  async function loadBookingSummary() {
    if (!bkPanel) return;
    try { state.bookings = await api('GET', '/api/admin/bookings/summary'); } catch (_) { state.bookings = null; }
    var pill = $('#bookingcount'); if (pill) pill.textContent = state.bookings && state.bookings.requested ? String(state.bookings.requested) : '';
    orderSetupTab(state.setupOpen);
  }
  function bkTz() { return (BK.data && BK.data.tz) || undefined; }
  function bkDate(iso) { try { return new Intl.DateTimeFormat('en-CA', { timeZone: bkTz(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)); } catch (_) { return String(iso).slice(0, 10); } }
  function bkDay(iso, long) { try { return new Date(iso).toLocaleDateString(undefined, { timeZone: bkTz(), weekday: long ? 'long' : 'short', month: long ? 'long' : 'short', day: 'numeric' }); } catch (_) { return iso; } }
  function bkTime(iso) { try { return new Date(iso).toLocaleTimeString(undefined, { timeZone: bkTz(), hour: 'numeric', minute: '2-digit' }); } catch (_) { return iso; } }
  function bkWhen(b) { var r = bkTime(b.starts_at) + ' to ' + bkTime(b.ends_at); return bkDay(b.starts_at) + ' · ' + (b.window ? b.window + ' (' + r + ')' : r); }
  function bkAge(iso) {
    var m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 60) return m + ' min ago';
    if (m < 60 * 36) return Math.round(m / 60) + ' h ago';
    return Math.round(m / 1440) + ' d ago';
  }
  async function loadBookings() {
    if (!bkPanel) return;
    try { BK.data = await api('GET', '/api/admin/bookings'); } catch (err) { toast(err.message, 'bad'); return; }
    state.bookings = { requested: BK.data.requested.length, self_test: state.bookings ? state.bookings.self_test : false };
    var pill = $('#bookingcount'); if (pill) pill.textContent = BK.data.requested.length ? String(BK.data.requested.length) : '';
    renderBookings();
    bkFillAdd();
    if (state.bookingFlash) { var card = $('.bk[data-id="' + state.bookingFlash + '"]', bkPanel); state.bookingFlash = ''; if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(card); } }
    loadFeedLink();
  }
  // "Add to my phone's calendar": a webcal: link the phone subscribes to in one tap.
  var feedLoaded = false;
  async function loadFeedLink() {
    var a = $('#bkfeed'); if (!a || feedLoaded) return;
    try { var r = await api('GET', '/api/admin/bookings/feed'); a.href = r.webcal; a.hidden = false; feedLoaded = true; a.addEventListener('click', function () { setTimeout(function () { toast('If nothing opened, copy the link: ' + r.url, ''); }, 1500); }); } catch (_) {}
  }
  function renderBookings() {
    var d = BK.data, today = d.today;
    // month strip: every day from today to the horizon, with counts
    var strip = $('#bkstrip'); strip.innerHTML = '';
    var off = {}; (d.settings.blackouts || []).forEach(function (x) { off[x] = 1; });
    var cur = today, last = d.to, month = '';
    for (var i = 0; i < 70 && cur <= last; i++) {
      var m = cur.slice(0, 7);
      if (m !== month) { month = m; strip.appendChild(h('span', { class: 'bk-strip__m', text: new Date(cur + 'T12:00:00Z').toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }) })); }
      var c = d.counts[cur] || { requested: 0, confirmed: 0 };
      (function (date, c) {
        strip.appendChild(h('button', { type: 'button', class: 'bk-day' + (date === today ? ' is-today' : '') + (date === BK.day ? ' is-active' : '') + (off[date] ? ' is-off' : ''), 'data-req': c.requested, 'data-conf': c.confirmed, title: c.requested + ' requested, ' + c.confirmed + ' confirmed', onclick: function () { BK.day = BK.day === date ? '' : date; renderBookings(); } }, [
          h('small', { text: new Date(date + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }) }),
          h('b', { text: String(Number(date.slice(8))) }),
          h('i'),
        ]));
      })(cur, c);
      cur = new Date(Date.UTC(Number(cur.slice(0, 4)), Number(cur.slice(5, 7)) - 1, Number(cur.slice(8)) + 1)).toISOString().slice(0, 10);
    }
    var range = d.range.filter(function (b) { return !BK.day || bkDate(b.starts_at) === BK.day; });
    var requested = d.requested.filter(function (b) { return !BK.day || bkDate(b.starts_at) === BK.day; });
    fillList('#bkrequested', requested, 'No requests waiting.' + (BK.day ? ' (filtered to one day)' : ''), false);
    var confirmed = range.filter(function (b) { return b.status === 'confirmed' && b.ends_at >= new Date(Date.now() - 6 * 3600 * 1000).toISOString(); }).sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1; });
    fillList('#bkconfirmed', confirmed, 'Nothing confirmed yet.', true);
    var past = range.filter(function (b) { return b.status === 'completed' || b.status === 'no_show' || (b.status === 'confirmed' && b.ends_at < new Date(Date.now() - 6 * 3600 * 1000).toISOString()); }).sort(function (a, b) { return a.starts_at > b.starts_at ? -1 : 1; });
    fillList('#bkpast', past, 'Nothing yet.', true);
    var closed = range.filter(function (b) { return b.status === 'declined' || b.status === 'cancelled'; }).sort(function (a, b) { return a.updated_at > b.updated_at ? -1 : 1; });
    fillList('#bkclosed', closed, 'Nothing here.', false);
  }
  function fillList(sel, list, empty, byDay) {
    var box = $(sel), out = $('[data-list]', box); out.innerHTML = '';
    $('[data-count]', box).textContent = list.length ? String(list.length) : '';
    if (!list.length) { out.appendChild(h('p', { class: 'bk__empty', text: empty })); return; }
    var day = '';
    list.forEach(function (b) {
      if (byDay) { var dd = bkDate(b.starts_at); if (dd !== day) { day = dd; out.appendChild(h('p', { class: 'bk-day-h', text: (dd === BK.data.today ? 'Today · ' : '') + bkDay(b.starts_at, true) })); } }
      out.appendChild(bkCard(b));
    });
  }
  function bkCard(b) {
    var d = BK.data, ov = d.overlap[b.id] || { requested: 0, confirmed: [] };
    var card = h('article', { class: 'bk', 'data-id': b.id });
    card.appendChild(h('div', { class: 'bk__head' }, [
      h('strong', { text: b.name }), h('span', { class: 'muted', text: b.service_label }),
      h('span', { class: 'bk__status bk__status--' + b.status, text: b.status.replace('_', ' ') }),
      h('span', { class: 'bk__age', text: (b.source === 'owner' ? 'added by you · ' : '') + bkAge(b.created_at) }),
    ]));
    var when = h('p', { class: 'bk__when', text: bkWhen(b) });
    if (b.requested_starts_at && b.requested_starts_at !== b.starts_at) when.appendChild(h('small', { text: 'asked for ' + bkWhen({ starts_at: b.requested_starts_at, ends_at: b.requested_ends_at, window: '' }) }));
    card.appendChild(when);
    var chips = [];
    if (ov.requested) chips.push(h('span', { class: 'bk__chip bk__chip--warn', text: ov.requested + ' other' + (ov.requested === 1 ? '' : 's') + ' asked for this time' }));
    (ov.confirmed || []).forEach(function (c) { chips.push(h('span', { class: 'bk__chip bk__chip--ok', text: 'Confirmed then: ' + c.name + ' ' + bkTime(c.starts_at) })); });
    var dayCount = d.counts[bkDate(b.starts_at)] || { confirmed: 0 };
    if (d.settings.maxPerDay && b.status === 'requested' && dayCount.confirmed >= d.settings.maxPerDay) chips.push(h('span', { class: 'bk__chip bk__chip--warn', text: 'Already ' + dayCount.confirmed + ' confirmed that day (your limit is ' + d.settings.maxPerDay + ')' }));
    if (b.lang === 'es') chips.push(h('span', { class: 'bk__chip', text: 'Speaks Spanish' }));
    if (chips.length) card.appendChild(h('div', { class: 'bk__chips' }, chips));
    var meta = h('dl', { class: 'bk__meta' });
    var row = function (k, v) { if (!v) return; meta.appendChild(h('dt', { text: k })); meta.appendChild(h('dd', { text: v })); };
    row('Where', [b.address, b.city].filter(Boolean).join(', '));
    (d.intake || []).forEach(function (f) { var v = b.intake && b.intake[f.key]; if (!v) return; var o = (f.options || []).filter(function (x) { return x.value === v; })[0]; row(f.label, o ? o.label : v); });
    row('Notes', b.notes);
    row('Reach by', b.contact_pref + (b.email ? ' · ' + b.email : ''));
    if (b.decline_reason) row(b.status === 'declined' ? 'Declined' : 'Reason', b.decline_reason);
    card.appendChild(meta);
    if (b.owner_note) card.appendChild(h('p', { class: 'bk__note', text: b.owner_note }));
    var digits = String(b.phone || '').replace(/[^\d+]/g, '');
    var links = h('div', { class: 'bk__links' }, [
      digits ? h('a', { class: 'btn btn--ghost btn--sm', href: 'tel:' + digits, text: '📞 ' + b.phone }) : null,
      digits ? h('a', { class: 'btn btn--ghost btn--sm', href: 'sms:' + digits, text: '💬 Text' }) : null,
      b.email ? h('a', { class: 'btn btn--ghost btn--sm', href: 'mailto:' + b.email, text: '✉️ Email' }) : null,
    ]);
    if (links.children.length) card.appendChild(links);
    var panel = h('div', { class: 'bk__panel', hidden: true });
    var actions = h('div', { class: 'bk__actions' });
    var btn = function (label, cls, fn) { return h('button', { class: 'btn btn--sm ' + cls, type: 'button', text: label, onclick: fn }); };
    var act = async function (action, opts, el) {
      if (el) el.disabled = true;
      try { var r = await api('PATCH', '/api/admin/bookings/' + b.id, Object.assign({ action: action }, opts || {})); toast({ confirm: 'Confirmed. The customer has been emailed.', reschedule: 'Confirmed at the new time. The customer has been emailed.', decline: 'Declined. The customer has been emailed.', cancel: 'Cancelled. The customer has been emailed.', complete: 'Marked done.', no_show: 'Marked as a no-show.', note: 'Note saved.' }[action] + (r.emailed === false && ['confirm', 'reschedule', 'decline', 'cancel'].indexOf(action) >= 0 ? ' (no email on file)' : ''), 'ok'); await loadBookings(); await loadBookingSummary(); }
      catch (err) { toast(err.message, 'bad'); if (el) el.disabled = false; }
    };
    var openPanel = function (kind) {
      panel.innerHTML = ''; panel.hidden = false;
      if (kind === 'time') {
        var startDate = bkDate(b.starts_at), startTime = bkTime24(b.starts_at), dur = Math.round((new Date(b.ends_at) - new Date(b.starts_at)) / 60000);
        var dateIn = h('input', { type: 'date', value: startDate, min: BK.data.today });
        var timeSel = h('select', { html: $('#bkadd [name=time]').innerHTML }); timeSel.value = nearestHalf(startTime);
        var durSel = h('select', { html: $('#bkadd [name=duration]').innerHTML }); durSel.value = String([30, 45, 60, 90, 120, 180, 240, 480].filter(function (x) { return x >= dur; })[0] || 480);
        panel.appendChild(h('div', { class: 'grid2' }, [h('label', { class: 'field' }, [h('span', { text: 'Day' }), dateIn]), h('label', { class: 'field' }, [h('span', { text: 'Start' }), timeSel]), h('label', { class: 'field' }, [h('span', { text: 'How long' }), durSel])]));
        panel.appendChild(h('div', { class: 'row' }, [btn(b.status === 'requested' ? 'Confirm at this time' : 'Move it', 'btn--primary', function (e) { act('reschedule', { date: dateIn.value, time: timeSel.value, duration: Number(durSel.value) }, e.target); }), btn('Close', 'btn--ghost', function () { panel.hidden = true; })]));
      }
      if (kind === 'decline' || kind === 'cancel') {
        var reason = h('input', { type: 'text', maxlength: 300, placeholder: kind === 'decline' ? 'Reason (optional, goes to the customer)' : 'Reason (optional, goes to the customer)' });
        panel.appendChild(h('label', { class: 'field' }, [h('span', { text: kind === 'decline' ? 'Decline this request' : 'Cancel this booking' }), reason]));
        panel.appendChild(h('div', { class: 'row' }, [btn(kind === 'decline' ? 'Decline' : 'Cancel the booking', 'btn--primary btn--danger', function (e) { act(kind, { reason: reason.value }, e.target); }), btn('Keep it', 'btn--ghost', function () { panel.hidden = true; })]));
      }
      if (kind === 'note') {
        var ta = h('textarea', { maxlength: 1000 }); ta.value = b.owner_note || '';
        panel.appendChild(h('label', { class: 'field' }, [h('span', { text: 'Note (only you see it)' }), ta]));
        panel.appendChild(h('div', { class: 'row' }, [btn('Save note', 'btn--primary', function (e) { act('note', { note: ta.value }, e.target); }), btn('Close', 'btn--ghost', function () { panel.hidden = true; })]));
      }
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    if (b.status === 'requested') {
      actions.appendChild(btn('Confirm', 'btn--primary', function (e) { act('confirm', {}, e.target); }));
      actions.appendChild(btn('Confirm at another time', 'btn--ghost', function () { openPanel('time'); }));
      actions.appendChild(btn('Decline', 'btn--ghost btn--danger', function () { openPanel('decline'); }));
    } else if (b.status === 'confirmed') {
      actions.appendChild(btn('Reschedule', 'btn--ghost', function () { openPanel('time'); }));
      actions.appendChild(btn('Completed', 'btn--primary', function (e) { act('complete', {}, e.target); }));
      actions.appendChild(btn('No-show', 'btn--ghost', function (e) { if (confirm('Mark ' + b.name + ' as a no-show?')) act('no_show', {}, e.target); }));
      actions.appendChild(btn('Cancel', 'btn--ghost btn--danger', function () { openPanel('cancel'); }));
      actions.appendChild(h('a', { class: 'btn btn--ghost btn--sm', href: '/api/admin/bookings/' + b.id + '.ics', text: '.ics' }));
    }
    actions.appendChild(btn(b.owner_note ? 'Edit note' : 'Note', 'btn--ghost', function () { openPanel('note'); }));
    card.appendChild(actions);
    card.appendChild(panel);
    return card;
  }
  function bkTime24(iso) { try { var p = new Intl.DateTimeFormat('en-GB', { timeZone: bkTz(), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)); return p.replace(/^24/, '00'); } catch (_) { return '09:00'; } }
  function nearestHalf(hm) { var h2 = Number(hm.slice(0, 2)), m = Number(hm.slice(3)); return (h2 < 10 ? '0' : '') + h2 + ':' + (m < 30 ? '00' : '30'); }
  // Add by hand: services + cities + intake come from the last load.
  function bkFillAdd() {
    var d = BK.data, sel = $('#bkaddservice'); if (!sel) return;
    sel.innerHTML = ''; (d.services || []).forEach(function (s) { sel.appendChild(h('option', { value: s.key, text: s.label })); });
    var dl = $('#bkcities'); dl.innerHTML = ''; (d.cities || []).forEach(function (c) { dl.appendChild(h('option', { value: c })); });
    var box = $('#bkaddintake'); box.innerHTML = '';
    if (d.intake && d.intake.length) {
      var grid = h('div', { class: 'grid2' });
      d.intake.forEach(function (f) {
        var input = f.type === 'select' ? h('select', { name: f.key }, [h('option', { value: '', text: '—' })].concat((f.options || []).map(function (o) { return h('option', { value: o.value, text: o.label }); }))) : f.type === 'textarea' ? h('textarea', { name: f.key }) : h('input', { type: 'text', name: f.key });
        grid.appendChild(h('label', { class: 'field' }, [h('span', { text: f.label }), input]));
      });
      box.appendChild(grid);
    }
    var dateIn = $('#bkadd [name=date]'); if (dateIn && !dateIn.value) { dateIn.min = d.today; dateIn.value = d.today; }
    var blockDate = $('#bkblock [name=date]'); if (blockDate) blockDate.min = d.today;
  }
  if (bkPanel) {
    $('#bkaddbtn').addEventListener('click', function () { var f = $('#bkadd'); f.hidden = !f.hidden; $('#bkblock').hidden = true; if (!f.hidden) $('[name=name]', f).focus(); });
    $('#bkblockbtn').addEventListener('click', function () { var f = $('#bkblock'); f.hidden = !f.hidden; $('#bkadd').hidden = true; if (!f.hidden) $('[name=date]', f).focus(); });
    $$('[data-bk-close]').forEach(function (b) { b.addEventListener('click', function () { $('#' + b.getAttribute('data-bk-close')).hidden = true; }); });
    $('#bkadd').addEventListener('submit', async function (e) {
      e.preventDefault();
      var body = {}; new FormData(e.target).forEach(function (v, k) { body[k] = v; });
      body.duration = Number(body.duration);
      var sb = $('button[type=submit]', e.target); sb.disabled = true;
      try { var r = await api('POST', '/api/admin/bookings', body); toast('Saved under Confirmed.' + (r.emailed ? ' The customer has been emailed.' : ''), 'ok'); e.target.reset(); e.target.hidden = true; await loadBookings(); await loadBookingSummary(); }
      catch (err) { toast(err.message, 'bad'); }
      sb.disabled = false;
    });
    $('#bkblock').addEventListener('submit', async function (e) {
      e.preventDefault();
      var date = e.target.date.value, note = e.target.note.value;
      if (!date) return;
      var current = (state.published && state.published.calendar && state.published.calendar.blackouts) || [];
      if (current.some(function (x) { return x.date === date; })) { toast('That day is already blocked.', ''); return; }
      var sb = $('button[type=submit]', e.target); sb.disabled = true;
      try { await patchContent({ 'calendar.blackouts': current.concat([{ date: date, note: note }]) }); toast('Blocked. Nobody can ask for that day.', 'ok'); e.target.reset(); e.target.hidden = true; await loadBookings(); }
      catch (err) { toast(err.message, 'bad'); }
      sb.disabled = false;
    });
  }

  boot().catch(function (err) { console.error(err); showLogin(); });
})();
