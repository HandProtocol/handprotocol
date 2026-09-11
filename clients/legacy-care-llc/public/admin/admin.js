/* Owner editor. Vanilla JS. Talks to /api/* with the session cookie.
   The shell is server-rendered (lib/admin-page.mjs) with the site's theme. */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var DRAFT_KEY = 'site-draft-v1';

  var state = { editor: null, site: null, schema: [], content: null, published: null, media: [], dirty: false };

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
  }
  function setTab(name) {
    $$('.tab').forEach(function (t) { t.classList.toggle('is-active', t.dataset.tab === name); });
    ['content', 'media', 'editors', 'history'].forEach(function (p) { $('#panel-' + p).hidden = p !== name; });
    if (name === 'editors') loadEditors();
    if (name === 'history') loadHistory();
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
    showShell();
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
    renderContent(); renderMedia(); updateSavebar();
  }
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
    } else {
      input = field.type === 'textarea' ? h('textarea', { maxlength: field.max }) : h('input', { type: 'text', maxlength: field.max });
      input.value = value || '';
      input.addEventListener('input', function () { counter.textContent = input.value.length + '/' + field.max; onChange(input.value); });
      wrap.appendChild(input);
    }
    if (field.help) wrap.appendChild(h('span', { class: 'help', text: field.help }));
    return wrap;
  }

  function listEl(field, sectionKey) {
    var box = h('div', { class: 'listfield' });
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
      var sec = h('section', { class: 'sec', id: 'sec-' + section.key });
      sec.appendChild(h('div', { class: 'sec__head' }, [h('h2', { text: section.label }), section.help ? h('p', { text: section.help }) : null]));
      var grid = h('div', { class: 'grid2' });
      section.fields.forEach(function (field) {
        if (field.type === 'list') { sec.appendChild(grid); grid = h('div', { class: 'grid2' }); sec.appendChild(listEl(field, section.key)); return; }
        var el = fieldEl(field, state.content[section.key][field.key], function (v) { state.content[section.key][field.key] = v; markDirty(); }, { wide: field.type === 'textarea' });
        if (field.type === 'textarea') el.style.gridColumn = '1 / -1';
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
      state.published = r.content; state.content = clone(r.content); markDirty(); renderContent();
      toast(r.purged ? 'Published. The site is live.' : 'Published. Live within a few minutes.', 'ok');
    } catch (err) { toast(err.message, 'bad'); }
    btn.disabled = false; btn.textContent = 'Publish changes';
  });
  $('#discard').addEventListener('click', function () {
    if (!confirm('Throw away your unpublished changes?')) return;
    state.content = clone(state.published); markDirty(); renderContent();
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

  boot().catch(function (err) { console.error(err); showLogin(); });
})();
