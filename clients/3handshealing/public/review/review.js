/* Guest review page — PIN gate, review links, and the writing helper.

   Shared, unmodified, between longhornwinetours (site/assets/js/) and the HAND
   client-site engine (clients/_template/public/review/). It knows nothing about the
   business: links and helper chips arrive from the API once the code is right.

   DOM contract (all inside [data-review], which carries data-api and data-pin-length):
     [data-gate] [data-dots] [data-pad] button[data-key] [data-gate-msg]
     [data-open] [data-links] [data-chips] [data-notes] input[name=tone|length]
     [data-generate] [data-status] [data-draft-wrap] [data-draft]
     button[data-tool] [data-undo] [data-copy] [data-bar] [data-bar-links] */

(function () {
  'use strict';

  var root = document.querySelector('[data-review]');
  if (!root) return;

  var API = root.getAttribute('data-api') || '/api/review';
  var PIN_LENGTH = Math.max(1, parseInt(root.getAttribute('data-pin-length'), 10) || 2);
  var PIN_KEY = 'rv-pin';
  var NOTES_MIN = 12;

  var $ = function (sel) { return root.querySelector(sel); };
  var gate = $('[data-gate]'), dots = $('[data-dots]'), pad = $('[data-pad]'), gateMsg = $('[data-gate-msg]');
  var open = $('[data-open]'), linksEl = $('[data-links]'), chipsEl = $('[data-chips]');
  var notes = $('[data-notes]'), generate = $('[data-generate]'), statusEl = $('[data-status]');
  var draftWrap = $('[data-draft-wrap]'), draft = $('[data-draft]'), undoBtn = $('[data-undo]');
  var copyBtn = $('[data-copy]'), bar = $('[data-bar]'), barLinks = $('[data-bar-links]');

  var pin = '';
  var entered = '';
  var busy = false;
  var previous = null;          // the draft before the last tool ran, for Undo

  var year = root.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  function store(op, value) {
    try {
      if (op === 'get') return sessionStorage.getItem(PIN_KEY) || '';
      if (op === 'set') sessionStorage.setItem(PIN_KEY, value);
      if (op === 'del') sessionStorage.removeItem(PIN_KEY);
    } catch (_) { /* private mode: the guest just types the code again */ }
    return '';
  }

  function post(body) {
    return fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  // ------------------------------------------------------------------ gate

  function paintDots() {
    dots.textContent = '';
    for (var i = 0; i < PIN_LENGTH; i++) {
      var d = document.createElement('span');
      if (i < entered.length) d.className = 'is-on';
      dots.appendChild(d);
    }
  }

  function press(key) {
    if (busy) return;
    if (key === 'back') entered = entered.slice(0, -1);
    else if (/^\d$/.test(key) && entered.length < PIN_LENGTH) entered += key;
    gateMsg.textContent = '';
    paintDots();
    if (entered.length === PIN_LENGTH) unlock(entered, false);
  }

  function unlock(code, quiet) {
    busy = true;
    gate.classList.add('is-busy');
    post({ action: 'unlock', pin: code })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { res: res, data: data }; });
      })
      .then(function (r) {
        if (r.res.ok && r.data.ok) {
          pin = code;
          store('set', code);
          reveal(r.data.business || {});
          return;
        }
        store('del');
        if (quiet) return;
        gateMsg.textContent = r.res.status === 429 ? 'Too many tries. Give it a minute.' : (r.data.error || 'That is not the code.');
        gate.classList.remove('is-wrong');
        void gate.offsetWidth;                      // restart the shake
        gate.classList.add('is-wrong');
      })
      .catch(function () {
        if (!quiet) gateMsg.textContent = 'No signal. Try again in a moment.';
      })
      .then(function () {
        busy = false;
        entered = '';
        gate.classList.remove('is-busy');
        paintDots();
      });
  }

  pad.addEventListener('click', function (ev) {
    var btn = ev.target.closest('button[data-key]');
    if (btn) press(btn.getAttribute('data-key'));
  });
  document.addEventListener('keydown', function (ev) {
    if (gate.hidden || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (/^\d$/.test(ev.key)) press(ev.key);
    else if (ev.key === 'Backspace') press('back');
  });

  // ------------------------------------------------------------------ links + chips

  function linkButton(link, cls) {
    var a = document.createElement('a');
    a.className = cls;
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Review us on ' + link.label;
    return a;
  }

  function reveal(business) {
    var links = Array.isArray(business.links) ? business.links : [];
    linksEl.textContent = '';
    barLinks.textContent = '';
    links.forEach(function (link) {
      if (!link || !/^https:\/\//i.test(link.url || '')) return;
      var li = document.createElement('li');
      li.appendChild(linkButton(link, 'rv-btn'));
      if (link.how) {
        var how = document.createElement('p');
        how.className = 'rv-how';
        how.textContent = link.how;
        li.appendChild(how);
      }
      if (link.note) {
        var note = document.createElement('p');
        note.className = 'rv-note';
        note.textContent = link.note;
        li.appendChild(note);
      }
      linksEl.appendChild(li);

      var small = linkButton(link, 'rv-btn rv-btn--sm');
      small.textContent = link.label;
      barLinks.appendChild(small);
    });

    chipsEl.textContent = '';
    (Array.isArray(business.chips) ? business.chips : []).forEach(function (text) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'rv-chip';
      chip.textContent = text.replace(/[:\s]+$/, '');
      chip.addEventListener('click', function () { addLeadIn(text); });
      chipsEl.appendChild(chip);
    });

    gate.hidden = true;
    open.hidden = false;
    window.scrollTo(0, 0);
  }

  // A chip drops a lead-in ("Our guide: ") into the notes for the guest to finish.
  // It never writes the review for them: what follows the colon is theirs.
  function addLeadIn(text) {
    var v = notes.value.replace(/\s+$/, '');
    notes.value = (v ? v + '\n' : '') + text.replace(/\s*$/, ' ');
    notes.focus();
    notes.setSelectionRange(notes.value.length, notes.value.length);
  }

  // ------------------------------------------------------------------ helper

  function choice(name) {
    var el = root.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function setBusy(on, label) {
    busy = on;
    root.classList.toggle('is-writing', on);
    generate.disabled = on;
    copyBtn.disabled = on;
    Array.prototype.forEach.call(root.querySelectorAll('button[data-tool], [data-undo]'), function (b) { b.disabled = on; });
    draft.readOnly = on;
    if (label !== undefined) statusEl.textContent = label;
  }

  // Reads the NDJSON stream line by line; onEvent gets each parsed object.
  function readStream(res, onEvent) {
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    function flush(final) {
      var parts = buffer.split('\n');
      buffer = final ? '' : parts.pop();
      parts.forEach(function (part) {
        if (!part.trim()) return;
        try { onEvent(JSON.parse(part)); } catch (_) { /* a torn line: skip it */ }
      });
    }
    function pump() {
      return reader.read().then(function (step) {
        if (step.done) { buffer += decoder.decode(); flush(true); return; }
        buffer += decoder.decode(step.value, { stream: true });
        flush(false);
        return pump();
      });
    }
    return pump();
  }

  function run(mode) {
    if (busy) return;
    var text = notes.value.trim();
    var current = draft.value.trim();
    if ((mode === 'draft' || mode === 'retake') && (text.length < NOTES_MIN || text.split(/\s+/).length < 3)) {
      statusEl.textContent = 'Give it a little more to go on — a favorite moment, who you came with, anything.';
      notes.focus();
      return;
    }
    if (mode === 'polish' && !current) return;

    var before = draft.value;
    var got = '';
    var failed = '';
    var needMore = false;
    setBusy(true, mode === 'polish' ? 'Tidying…' : 'Writing…');

    post({ action: 'draft', pin: pin, mode: mode, notes: text, draft: current, tone: choice('tone'), length: choice('length') })
      .then(function (res) {
        if (!res.ok || !res.body) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (res.status === 401) { store('del'); location.reload(); return; }
            failed = res.status === 429 ? 'That is a lot of drafts. Give it a minute, then try again.' : (data.error || 'Something went wrong. Try again.');
          });
        }
        draftWrap.hidden = false;
        draft.value = '';
        return readStream(res, function (ev) {
          if (ev.t === 'text') { got += ev.v; draft.value = got; draft.scrollTop = draft.scrollHeight; }
          else if (ev.t === 'need_more') needMore = true;
          else if (ev.t === 'error') failed = ev.v || 'Something went wrong. Try again.';
        });
      })
      .catch(function () { failed = 'Lost the connection. Try again in a moment.'; })
      .then(function () {
        if (needMore || failed || !got.trim()) {
          draft.value = before;                       // never leave a half-written draft behind
          if (!before.trim()) draftWrap.hidden = true;
          setBusy(false, needMore ? 'Give it a little more to go on — what did you do, see, or taste?' : (failed || 'Nothing came back. Try again.'));
          return;
        }
        draft.value = got.trim();
        previous = before.trim() ? before : null;
        undoBtn.hidden = !previous;
        bar.hidden = true;
        generate.textContent = 'Write a new draft';
        setBusy(false, 'Here is a start. Edit it until it sounds like you.');
        if (mode === 'draft') draftWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
  }

  generate.addEventListener('click', function () { run(draft.value.trim() ? 'retake' : 'draft'); });
  root.addEventListener('click', function (ev) {
    var tool = ev.target.closest('button[data-tool]');
    if (tool) run(tool.getAttribute('data-tool'));
  });
  undoBtn.addEventListener('click', function () {
    if (busy || previous === null) return;
    draft.value = previous;
    previous = null;
    undoBtn.hidden = true;
    statusEl.textContent = 'Put it back.';
  });

  // ------------------------------------------------------------------ copy

  // Older in-app browsers (the ones QR codes tend to open) have no Clipboard API,
  // and some refuse it; both get the select-and-copy path before we give up.
  function legacyCopy() {
    return new Promise(function (resolve, reject) {
      draft.focus();
      draft.select();
      try { document.execCommand('copy') ? resolve() : reject(new Error('copy refused')); } catch (err) { reject(err); }
    });
  }

  function copyText(text) {
    if (!navigator.clipboard || !window.isSecureContext) return legacyCopy();
    return navigator.clipboard.writeText(text).catch(legacyCopy);
  }

  copyBtn.addEventListener('click', function () {
    var text = draft.value.trim();
    if (!text) return;
    copyText(text).then(function () {
      copyBtn.textContent = 'Copied';
      statusEl.textContent = '';
      bar.hidden = false;
      setTimeout(function () { copyBtn.textContent = 'Copy my review'; }, 2400);
    }).catch(function () {
      draft.focus();
      draft.select();
      statusEl.textContent = 'Press and hold the text to copy it.';
    });
  });

  // ------------------------------------------------------------------ start

  paintDots();
  var remembered = store('get');
  if (remembered) unlock(remembered, true);
})();
