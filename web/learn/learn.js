/* HAND Learn — course client.
   Progressive: every lesson is readable logged out; an account adds synced
   progress, pins, and the human-in-the-loop features (stuck alerts, coach
   visibility). Anonymous progress is kept on-device and synced up on signup. */

(function () {
  'use strict';

  var API = '/.netlify/functions/learn-api';
  var STORE_KEY = 'hand_learn_v1';

  var LESSONS = [
    { key: '00-welcome', num: '00', title: 'Welcome & how this works' },
    { key: '01-what-is-claude-code', num: '01', title: 'What is Claude Code?' },
    { key: '02-set-up', num: '02', title: 'Set up your workspace' },
    { key: '03-first-conversation', num: '03', title: 'Your first conversation' },
    { key: '04-core-skills', num: '04', title: 'The skills that matter' },
    { key: '05-plan-your-app', num: '05', title: 'Plan your app' },
    { key: '06-build-and-iterate', num: '06', title: 'Build and iterate' },
    { key: '07-put-it-online', num: '07', title: 'Put it online' },
    { key: '08-level-up', num: '08', title: 'Level up & graduate' },
  ];

  function lessonTitle(key) {
    for (var i = 0; i < LESSONS.length; i++) {
      if (LESSONS[i].key === key) return LESSONS[i].title;
    }
    return key;
  }

  // ----------------------------------------------------------------- state --

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }
  function saveStore(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (_) {}
  }

  var store = loadStore();
  if (!store.progress) store.progress = [];
  if (!store.pins) store.pins = [];
  if (!store.localProgress) store.localProgress = {}; // anonymous fallback

  function signedIn() { return !!(store.token && store.learner); }

  function setSession(data) {
    store.token = data.token || store.token;
    store.learner = data.learner || store.learner;
    if (data.progress) store.progress = data.progress;
    if (data.pins) store.pins = data.pins;
    saveStore(store);
  }

  function clearSession() {
    store = { progress: [], pins: [], localProgress: store.localProgress || {} };
    saveStore(store);
  }

  function progressFor(lesson) {
    if (signedIn()) {
      for (var i = 0; i < store.progress.length; i++) {
        if (store.progress[i].lesson_key === lesson) return store.progress[i];
      }
      return null;
    }
    var local = store.localProgress[lesson];
    return local ? { lesson_key: lesson, status: local } : null;
  }

  function openPinFor(lesson, anchor) {
    for (var i = 0; i < store.pins.length; i++) {
      var p = store.pins[i];
      if (p.lesson_key === lesson && p.anchor === anchor && !p.resolved_at) return p;
    }
    return null;
  }

  // ------------------------------------------------------------------- api --

  function api(action, data) {
    var body = Object.assign({ action: action }, data || {});
    if (store.token && action !== 'signup' && action !== 'login' && action !== 'coach') {
      body.token = store.token;
    }
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (res.status === 401 && action !== 'login' && action !== 'coach') {
          clearSession();
          renderAccountChip();
        }
        if (!res.ok) {
          var err = new Error(json.error || 'Request failed');
          err.status = res.status;
          throw err;
        }
        return json;
      });
    });
  }

  // -------------------------------------------------------------------- ui --

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var toastNode = null;
  var toastTimer = null;
  function toast(message) {
    if (!toastNode) {
      toastNode = el('div', 'toast');
      toastNode.setAttribute('role', 'status');
      document.body.appendChild(toastNode);
    }
    toastNode.textContent = message;
    toastNode.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastNode.classList.remove('is-visible');
    }, 3200);
  }

  function relTime(iso) {
    if (!iso) return '—';
    var diff = Date.now() - new Date(iso).getTime();
    var mins = Math.round(diff / 60000);
    if (mins < 2) return 'just now';
    if (mins < 60) return mins + ' min ago';
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.round(hours / 24);
    if (days < 30) return days + 'd ago';
    return new Date(iso).toLocaleDateString();
  }

  function renderAccountChip() {
    var chip = document.querySelector('[data-account-chip]');
    if (!chip) return;
    if (signedIn()) {
      chip.classList.add('is-visible');
      chip.innerHTML =
        '<span class="nav__account-dot" aria-hidden="true"></span>' + esc(store.learner.name);
      var joinLink = document.querySelector('[data-join-link]');
      if (joinLink) joinLink.style.display = 'none';
    } else {
      chip.classList.remove('is-visible');
    }
  }

  // Copy buttons on prompt cards.
  function initCopyButtons(root) {
    (root || document).querySelectorAll('.prompt-card').forEach(function (card) {
      var btn = card.querySelector('.prompt-card__copy');
      var pre = card.querySelector('pre');
      if (!btn || !pre) return;
      btn.addEventListener('click', function () {
        var text = pre.textContent;
        var done = function () {
          btn.textContent = 'Copied ✓';
          btn.classList.add('is-copied');
          setTimeout(function () {
            btn.textContent = 'Copy';
            btn.classList.remove('is-copied');
          }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          done();
        }
      });
    });
  }

  // ------------------------------------------------------------------ auth --

  function syncLocalProgress() {
    // After signing in, push any lessons completed anonymously on this device.
    var keys = Object.keys(store.localProgress || {});
    var chain = Promise.resolve();
    keys.forEach(function (lesson) {
      if (store.localProgress[lesson] !== 'complete') return;
      var already = progressFor(lesson);
      if (already && already.status === 'complete') return;
      chain = chain.then(function () {
        return api('progress', { lesson: lesson, status: 'complete' }).then(function (json) {
          setSession(json);
        }).catch(function () {});
      });
    });
    return chain;
  }

  function initAuthCard() {
    var card = document.querySelector('[data-auth-card]');
    if (!card) return;

    var tabs = card.querySelectorAll('.auth-card__tab');
    var panels = card.querySelectorAll('[data-auth-panel]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        panels.forEach(function (p) {
          p.style.display = p.getAttribute('data-auth-panel') === tab.getAttribute('data-auth-tab')
            ? '' : 'none';
        });
      });
    });

    function showError(form, message) {
      var box = form.querySelector('.form-error');
      if (box) { box.textContent = message; box.classList.add('is-visible'); }
    }

    function afterAuth(json, isNew) {
      setSession(json);
      syncLocalProgress().then(function () {
        renderAccountChip();
        renderAuthState();
        renderModuleMap();
        toast(isNew
          ? 'Welcome aboard, ' + store.learner.name + '! Your progress now saves automatically.'
          : 'Welcome back, ' + store.learner.name + '.');
      });
    }

    var signupForm = card.querySelector('[data-signup-form]');
    if (signupForm) {
      signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = signupForm.querySelector('button[type=submit]');
        btn.disabled = true;
        api('signup', {
          name: signupForm.name.value,
          email: signupForm.email.value,
          passcode: signupForm.passcode.value,
          mode: signupForm.mode.value,
          website: signupForm.website ? signupForm.website.value : '',
        }).then(function (json) {
          afterAuth(json, true);
        }).catch(function (err) {
          showError(signupForm, err.message);
        }).finally(function () { btn.disabled = false; });
      });
    }

    var loginForm = card.querySelector('[data-login-form]');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = loginForm.querySelector('button[type=submit]');
        btn.disabled = true;
        api('login', {
          email: loginForm.email.value,
          passcode: loginForm.passcode.value,
        }).then(function (json) {
          afterAuth(json, false);
        }).catch(function (err) {
          showError(loginForm, err.message);
        }).finally(function () { btn.disabled = false; });
      });
    }

    var signout = card.querySelector('[data-signout]');
    if (signout) {
      signout.addEventListener('click', function () {
        clearSession();
        renderAccountChip();
        renderAuthState();
        renderModuleMap();
        toast('Signed out. Your account and progress are safe.');
      });
    }

    renderAuthState();
  }

  function renderAuthState() {
    var card = document.querySelector('[data-auth-card]');
    if (!card) return;
    card.classList.toggle('is-signed-in', signedIn());
    if (signedIn()) {
      var nameNode = card.querySelector('[data-signed-name]');
      if (nameNode) nameNode.textContent = store.learner.name;
      var modeNode = card.querySelector('[data-signed-mode]');
      if (modeNode) {
        modeNode.textContent = store.learner.mode === 'guided'
          ? 'Guided — you’re walking through this with a HAND human.'
          : 'Self-serve — go at your own pace. A human is one button away.';
      }
    }
  }

  // ----------------------------------------------------------- module map --

  function firstOpenLesson() {
    for (var i = 0; i < LESSONS.length; i++) {
      var p = progressFor(LESSONS[i].key);
      if (!p || p.status !== 'complete') return LESSONS[i].key;
    }
    return null;
  }

  function renderModuleMap() {
    var cards = document.querySelectorAll('.module-card[data-lesson]');
    if (!cards.length) return;

    var completed = 0;
    var nextKey = firstOpenLesson();

    cards.forEach(function (card) {
      var key = card.getAttribute('data-lesson');
      var p = progressFor(key);
      var state = card.querySelector('.module-card__state');
      card.classList.remove('is-complete', 'is-active', 'is-stuck');
      if (p && p.status === 'complete') {
        completed++;
        card.classList.add('is-complete');
        if (state) state.textContent = 'Complete ✓';
      } else if (p && p.status === 'stuck') {
        card.classList.add('is-stuck', 'is-active');
        if (state) state.textContent = 'Stuck — help is coming';
      } else if (key === nextKey) {
        card.classList.add('is-active');
        if (state) state.textContent = p ? 'In progress' : 'Up next';
      } else if (state) {
        state.textContent = '';
      }
    });

    var wrap = document.querySelector('[data-course-progress]');
    if (wrap) {
      var pct = Math.round((completed / LESSONS.length) * 100);
      wrap.classList.toggle('is-visible', completed > 0 || signedIn());
      var fill = wrap.querySelector('.course-progress__fill');
      if (fill) fill.style.width = pct + '%';
      var label = wrap.querySelector('[data-progress-label]');
      if (label) {
        label.textContent = completed === LESSONS.length
          ? 'All ' + LESSONS.length + ' modules complete — you did it! 🎓'
          : completed + ' of ' + LESSONS.length + ' modules complete';
      }
    }

    var resume = document.querySelector('[data-resume-link]');
    if (resume) {
      if (nextKey) {
        resume.href = '/learn/' + nextKey + '/';
        resume.textContent = completed > 0
          ? 'Continue: ' + lessonTitle(nextKey) + ' →'
          : 'Start the course →';
      } else {
        resume.href = '/learn/08-level-up/';
        resume.textContent = 'Revisit the final module →';
      }
    }
  }

  // ------------------------------------------------------------- pins ------

  var PIN_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/></svg>';

  function initPins(lessonKey) {
    var sections = document.querySelectorAll('[data-pin]');
    sections.forEach(function (section) {
      var anchor = section.id;
      if (!anchor) return;
      var heading = section.querySelector('h2, h3');
      var title = heading ? heading.textContent.trim() : anchor;

      var btn = el('button', 'pin-btn');
      btn.type = 'button';
      btn.innerHTML = PIN_SVG;
      btn.setAttribute('aria-label', 'Pin “' + title + '” for review later');
      btn.title = 'Pin for review later';
      section.appendChild(btn);

      var noteWrap = el('div', 'pin-note');
      var noteInput = el('input');
      noteInput.type = 'text';
      noteInput.maxLength = 500;
      noteInput.placeholder = 'Optional: what feels fuzzy about this? (saves to your review list)';
      var noteSave = el('button', 'btn btn--small btn--ghost', 'Save note');
      noteSave.type = 'button';
      noteWrap.appendChild(noteInput);
      noteWrap.appendChild(noteSave);
      if (heading) heading.insertAdjacentElement('afterend', noteWrap);

      function setPinned(pinned) {
        btn.classList.toggle('is-pinned', pinned);
        btn.title = pinned ? 'Pinned — click to mark reviewed' : 'Pin for review later';
      }

      var existing = openPinFor(lessonKey, anchor);
      if (existing) {
        setPinned(true);
        if (existing.note) noteInput.value = existing.note;
      }

      btn.addEventListener('click', function () {
        if (!signedIn()) {
          toast('Create a free account on the course home to save pins — it takes 20 seconds.');
          return;
        }
        var pinned = btn.classList.contains('is-pinned');
        if (!pinned) {
          setPinned(true);
          noteWrap.classList.add('is-visible');
          noteInput.focus();
          api('pin', { lesson: lessonKey, anchor: anchor, title: title })
            .then(function (json) { setSession(json); toast('Pinned for review. Find it under “My review list.”'); })
            .catch(function () { setPinned(false); toast('Could not save that pin — try again.'); });
        } else {
          setPinned(false);
          noteWrap.classList.remove('is-visible');
          api('unpin', { lesson: lessonKey, anchor: anchor })
            .then(function (json) { setSession(json); toast('Marked as reviewed. Nice.'); })
            .catch(function () { setPinned(true); });
        }
      });

      function saveNote() {
        if (!signedIn()) return;
        api('pin', { lesson: lessonKey, anchor: anchor, title: title, note: noteInput.value })
          .then(function (json) {
            setSession(json);
            noteWrap.classList.remove('is-visible');
            toast('Note saved with your pin.');
          })
          .catch(function () { toast('Could not save the note — try again.'); });
      }
      noteSave.addEventListener('click', saveNote);
      noteInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); saveNote(); }
      });
    });
  }

  // -------------------------------------------------------- lesson status --

  function renderLessonStatus(lessonKey) {
    var chip = document.querySelector('[data-lesson-status]');
    var p = progressFor(lessonKey);
    if (chip) {
      chip.classList.remove('is-visible', 'lesson-status--complete', 'lesson-status--stuck');
      if (p && p.status === 'complete') {
        chip.textContent = 'Complete ✓';
        chip.classList.add('is-visible', 'lesson-status--complete');
      } else if (p && p.status === 'stuck') {
        chip.textContent = 'Marked stuck — help is on the way';
        chip.classList.add('is-visible', 'lesson-status--stuck');
      }
    }
    var done = document.querySelector('[data-lesson-done]');
    if (done && p && p.status === 'complete') done.classList.add('is-visible');
  }

  function saveLessonComplete(lessonKey, checkpoint) {
    if (signedIn()) {
      return api('progress', { lesson: lessonKey, status: 'complete', checkpoint: checkpoint })
        .then(function (json) {
          setSession(json);
          renderLessonStatus(lessonKey);
          toast('Progress saved — module complete! 🎉');
        })
        .catch(function () {
          toast('Saved on this device; syncing failed. It will retry next visit.');
          store.localProgress[lessonKey] = 'complete';
          saveStore(store);
        });
    }
    store.localProgress[lessonKey] = 'complete';
    saveStore(store);
    renderLessonStatus(lessonKey);
    toast('Marked complete on this device. Create a free account to save it properly.');
    return Promise.resolve();
  }

  // ------------------------------------------------------------ checkpoint --

  function initCheckpoint(lessonKey) {
    var box = document.querySelector('[data-checkpoint]');
    if (!box) return;

    var quizzes = Array.prototype.slice.call(box.querySelectorAll('.quiz-q'));
    var checks = Array.prototype.slice.call(box.querySelectorAll('.check-list input[type=checkbox]'));
    var button = box.querySelector('[data-check]');
    var result = box.querySelector('.checkpoint__result');

    checks.forEach(function (input) {
      input.addEventListener('change', function () {
        input.closest('label').classList.toggle('is-checked', input.checked);
      });
    });

    if (!button) return;
    button.addEventListener('click', function () {
      var allRight = true;

      quizzes.forEach(function (q) {
        var correct = q.getAttribute('data-correct');
        var chosen = q.querySelector('input:checked');
        q.classList.add('is-answered');
        q.classList.remove('is-right', 'is-wrong');
        q.querySelectorAll('label').forEach(function (l) { l.classList.remove('is-chosen'); });
        if (!chosen) { allRight = false; q.classList.add('is-wrong'); return; }
        chosen.closest('label').classList.add('is-chosen');
        if (chosen.value === correct) {
          q.classList.add('is-right');
        } else {
          q.classList.add('is-wrong');
          allRight = false;
        }
      });

      var allChecked = checks.every(function (c) { return c.checked; });

      if (allRight && allChecked) {
        result.textContent = 'Checkpoint passed!';
        result.className = 'checkpoint__result is-pass';
        var answers = {};
        quizzes.forEach(function (q) {
          var chosen = q.querySelector('input:checked');
          if (chosen) answers[chosen.name] = chosen.value;
        });
        saveLessonComplete(lessonKey, { quiz: answers, tasks_done: checks.length });
      } else if (!allChecked && allRight) {
        result.textContent = 'Almost — tick off each task above once you’ve done it.';
        result.className = 'checkpoint__result is-retry';
      } else {
        result.textContent = 'Almost — look at the highlighted answers and try again. No penalty.';
        result.className = 'checkpoint__result is-retry';
      }
    });
  }

  // ----------------------------------------------------------------- stuck --

  function initStuck(lessonKey) {
    var fab = document.querySelector('[data-stuck-fab]');
    var backdrop = document.querySelector('[data-stuck-modal]');
    if (!fab || !backdrop) return;

    var textarea = backdrop.querySelector('textarea');
    var send = backdrop.querySelector('[data-stuck-send]');
    var cancel = backdrop.querySelector('[data-stuck-cancel]');
    var intro = backdrop.querySelector('[data-stuck-intro]');
    var doneMsg = backdrop.querySelector('[data-stuck-done]');

    function open() {
      backdrop.classList.add('is-open');
      if (signedIn()) {
        intro.style.display = '';
        doneMsg.style.display = 'none';
        textarea.focus();
      } else {
        intro.textContent =
          'To send a stuck flag to a real human, create a free account first (it’s how we know who to help). Head to the course home, sign up, and come right back.';
        textarea.style.display = 'none';
        send.style.display = 'none';
      }
    }
    function close() { backdrop.classList.remove('is-open'); }

    fab.addEventListener('click', open);
    cancel.addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    send.addEventListener('click', function () {
      send.disabled = true;
      api('stuck', { lesson: lessonKey, note: textarea.value })
        .then(function (json) {
          setSession(json);
          intro.style.display = 'none';
          textarea.style.display = 'none';
          send.style.display = 'none';
          doneMsg.style.display = '';
          renderLessonStatus(lessonKey);
        })
        .catch(function () {
          toast('Could not send that — check your connection and try again.');
        })
        .finally(function () { send.disabled = false; });
    });
  }

  // ----------------------------------------------------------- review page --

  function initReview() {
    var listNode = document.querySelector('[data-pin-list]');
    if (!listNode) return;

    function render() {
      listNode.innerHTML = '';
      if (!signedIn()) {
        listNode.innerHTML =
          '<div class="empty-note">Sign in on the <a href="/learn/">course home</a> to see your pinned review topics.</div>';
        return;
      }
      var open = store.pins.filter(function (p) { return !p.resolved_at; });
      var resolved = store.pins.filter(function (p) { return p.resolved_at; });

      if (!open.length && !resolved.length) {
        listNode.innerHTML =
          '<div class="empty-note">No pins yet. On any lesson, click the pin next to a section heading to save it here for review.</div>';
        return;
      }

      function row(p) {
        var item = el('div', 'pin-item' + (p.resolved_at ? ' is-resolved' : ''));
        var html =
          '<div class="pin-item__row"><div>' +
          '<div class="pin-item__module">Module ' + esc(p.lesson_key.slice(0, 2)) + ' · ' +
          esc(lessonTitle(p.lesson_key)) + '</div>' +
          '<div class="pin-item__title"><a href="/learn/' + esc(p.lesson_key) + '/#' +
          esc(p.anchor) + '">' + esc(p.title || p.anchor) + '</a></div>' +
          (p.note ? '<div class="pin-item__note">“' + esc(p.note) + '”</div>' : '') +
          '</div>';
        if (!p.resolved_at) {
          html += '<button class="btn btn--small btn--ghost" data-resolve>Reviewed it ✓</button>';
        }
        html += '</div>';
        item.innerHTML = html;
        var resolve = item.querySelector('[data-resolve]');
        if (resolve) {
          resolve.addEventListener('click', function () {
            api('unpin', { lesson: p.lesson_key, anchor: p.anchor })
              .then(function (json) { setSession(json); render(); toast('Nice — marked as reviewed.'); })
              .catch(function () { toast('Could not update that pin — try again.'); });
          });
        }
        return item;
      }

      open.forEach(function (p) { listNode.appendChild(row(p)); });
      if (resolved.length) {
        var h = el('p', 'eyebrow', 'Already reviewed');
        h.style.margin = '26px 0 10px';
        listNode.appendChild(h);
        resolved.forEach(function (p) { listNode.appendChild(row(p)); });
      }
    }

    if (signedIn()) {
      api('me').then(function (json) { setSession(json); render(); }).catch(render);
    }
    render();
  }

  // ------------------------------------------------------------ coach page --

  function initCoach() {
    var page = document.querySelector('[data-coach]');
    if (!page) return;

    var form = page.querySelector('[data-coach-form]');
    var dash = page.querySelector('[data-coach-dash]');

    function load(password) {
      api('coach', { password: password })
        .then(function (json) {
          sessionStorage.setItem('hand_learn_coach', password);
          form.style.display = 'none';
          dash.style.display = '';
          renderDash(json);
        })
        .catch(function (err) {
          var box = form.querySelector('.form-error');
          box.textContent = err.message;
          box.classList.add('is-visible');
        });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      load(form.password.value);
    });

    var cached = sessionStorage.getItem('hand_learn_coach');
    if (cached) load(cached);

    function renderDash(data) {
      var byId = {};
      data.learners.forEach(function (l) { byId[l.id] = l; });
      var progByLearner = {};
      data.progress.forEach(function (p) {
        (progByLearner[p.learner_id] = progByLearner[p.learner_id] || {})[p.lesson_key] = p;
      });
      var pinsByLearner = {};
      data.pins.forEach(function (p) {
        (pinsByLearner[p.learner_id] = pinsByLearner[p.learner_id] || []).push(p);
      });

      var QUIET_DAYS = 5;
      var now = Date.now();
      function isQuiet(l) {
        return !l.graduated_at &&
          now - new Date(l.last_seen_at).getTime() > QUIET_DAYS * 86400000;
      }
      function stuckLessons(l) {
        var prog = progByLearner[l.id] || {};
        return Object.keys(prog).filter(function (k) { return prog[k].status === 'stuck'; });
      }

      // Summary tiles
      var active7 = data.learners.filter(function (l) {
        return now - new Date(l.last_seen_at).getTime() < 7 * 86400000;
      }).length;
      var stuckCount = data.learners.filter(function (l) { return stuckLessons(l).length; }).length;
      var gradCount = data.learners.filter(function (l) { return l.graduated_at; }).length;
      var summary = page.querySelector('[data-coach-summary]');
      summary.innerHTML = '';
      [
        [data.learners.length, 'Learners'],
        [active7, 'Active this week'],
        [stuckCount, 'Flagged stuck'],
        [gradCount, 'Graduated'],
      ].forEach(function (pair) {
        var tile = el('div', 'stat-tile');
        tile.appendChild(el('div', 'stat-tile__num', String(pair[0])));
        tile.appendChild(el('div', 'stat-tile__label', pair[1]));
        summary.appendChild(tile);
      });

      // Learner cards — stuck first, then quiet, then recent activity.
      var learners = data.learners.slice().sort(function (a, b) {
        var sa = stuckLessons(a).length ? 0 : isQuiet(a) ? 1 : 2;
        var sb = stuckLessons(b).length ? 0 : isQuiet(b) ? 1 : 2;
        if (sa !== sb) return sa - sb;
        return new Date(b.last_seen_at) - new Date(a.last_seen_at);
      });

      var cardsNode = page.querySelector('[data-coach-learners]');
      cardsNode.innerHTML = '';
      if (!learners.length) {
        cardsNode.innerHTML = '<div class="empty-note">No learners yet. Share https://handprotocol.org/learn/ to get the first one in.</div>';
      }

      learners.forEach(function (l) {
        var prog = progByLearner[l.id] || {};
        var stuck = stuckLessons(l);
        var card = el('div', 'learner-card' + (stuck.length ? ' is-stuck' : ''));

        var badges = '';
        if (l.mode === 'guided') badges += '<span class="badge badge--guided">Guided</span>';
        if (l.graduated_at) badges += '<span class="badge badge--done">Graduated 🎓</span>';
        if (stuck.length) badges += '<span class="badge badge--stuck">Stuck</span>';
        else if (isQuiet(l)) badges += '<span class="badge badge--quiet">Quiet ' + relTime(l.last_seen_at) + '</span>';

        var dots = LESSONS.map(function (lesson) {
          var p = prog[lesson.key];
          var cls = 'mod-dot';
          if (p && p.status === 'complete') cls += ' mod-dot--complete';
          else if (p && p.status === 'stuck') cls += ' mod-dot--stuck';
          else if (p) cls += ' mod-dot--active';
          return '<span class="' + cls + '" title="' + esc(lesson.title) +
            (p ? ' — ' + p.status : ' — not started') + '">' + lesson.num + '</span>';
        }).join('');

        var detail = 'Joined ' + relTime(l.created_at) + ' · Last seen <strong>' +
          relTime(l.last_seen_at) + '</strong>';
        stuck.forEach(function (k) {
          var note = prog[k].checkpoint && prog[k].checkpoint.stuck_note;
          detail += '<br>🆘 Stuck on <strong>' + esc(lessonTitle(k)) + '</strong>' +
            (note ? ': “' + esc(note) + '”' : '');
        });

        var openPins = (pinsByLearner[l.id] || []).filter(function (p) { return !p.resolved_at; });
        var pinsHtml = openPins.length
          ? '<ul class="learner-card__pins">' + openPins.map(function (p) {
              return '<li>📌 ' + esc(p.title || p.anchor) + ' <em>(' +
                esc(lessonTitle(p.lesson_key)) + ')</em>' +
                (p.note ? ' — “' + esc(p.note) + '”' : '') + '</li>';
            }).join('') + '</ul>'
          : '';

        card.innerHTML =
          '<div class="learner-card__head"><div>' +
          '<div class="learner-card__name">' + esc(l.name) + '</div>' +
          '<div class="learner-card__email">' + esc(l.email) + '</div></div>' +
          '<div class="learner-card__badges">' + badges + '</div></div>' +
          '<div class="learner-card__modules">' + dots + '</div>' +
          '<div class="learner-card__detail">' + detail + '</div>' + pinsHtml;
        cardsNode.appendChild(card);
      });

      // Event feed
      var feed = page.querySelector('[data-coach-events]');
      feed.innerHTML = '';
      var ICONS = {
        signup: '🎒', login: '🔑', lesson_view: '👀', complete: '📗',
        stuck: '🆘', unstuck: '💪', pin: '📌', unpin: '✅', graduated: '🎓',
      };
      data.events.slice(0, 60).forEach(function (ev) {
        var who = byId[ev.learner_id] ? byId[ev.learner_id].name : 'Someone';
        var row = el('div', 'event-row');
        var what = ev.kind.replace(/_/g, ' ');
        var lesson = ev.lesson_key ? ' · ' + lessonTitle(ev.lesson_key) : '';
        var note = ev.detail && ev.detail.note ? ' — “' + ev.detail.note + '”' : '';
        row.innerHTML = '<time>' + esc(relTime(ev.created_at)) + '</time><span>' +
          (ICONS[ev.kind] || '·') + ' <strong>' + esc(who) + '</strong> ' +
          esc(what + lesson + note) + '</span>';
        feed.appendChild(row);
      });
    }
  }

  // ------------------------------------------------------------------ boot --

  document.addEventListener('DOMContentLoaded', function () {
    renderAccountChip();
    initCopyButtons(document);

    var lessonKey = document.body.getAttribute('data-lesson');
    if (lessonKey) {
      initPins(lessonKey);
      initCheckpoint(lessonKey);
      initStuck(lessonKey);
      renderLessonStatus(lessonKey);

      if (signedIn()) {
        api('view', { lesson: lessonKey }).catch(function () {});
        api('me').then(function (json) {
          setSession(json);
          renderLessonStatus(lessonKey);
        }).catch(function () {});
      }

      var completeBtn = document.querySelector('[data-mark-complete]');
      if (completeBtn) {
        completeBtn.addEventListener('click', function () {
          saveLessonComplete(lessonKey, { manual: true });
        });
      }
    }

    if (document.body.getAttribute('data-page') === 'home') {
      initAuthCard();
      renderModuleMap();
      if (signedIn()) {
        api('me').then(function (json) {
          setSession(json);
          renderAuthState();
          renderModuleMap();
        }).catch(function () {});
      }
    }

    if (document.body.getAttribute('data-page') === 'review') initReview();
    if (document.body.getAttribute('data-page') === 'coach') initCoach();
  });
})();
