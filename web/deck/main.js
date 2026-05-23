/* HAND — Deck
 * Cinematic page inspector: pop-scroll, loading transition, feedback overlay.
 * All campaign pages are same-origin so iframe.contentWindow access works.
 */
(() => {
  'use strict';

  // ---------- Pages ------------------------------------------------------
  const PAGES = [
    { path: '/foundation-campaign/',                       title: 'Foundation Campaign',    tag: 'Campaign' },
    { path: '/discovery/',                                 title: 'Discovery Hub',          tag: 'Hub' },
    { path: '/discovery/skill-exchange-vision.html',       title: 'Skill Exchange · Vision',   tag: 'Doc' },
    { path: '/discovery/skill-exchange-models.html',       title: 'Skill Exchange · Models',   tag: 'Doc' },
    { path: '/discovery/impact-org-landscape.html',        title: 'Impact Org Landscape',   tag: 'Doc' },
    { path: '/reciprocates/',                              title: 'Reciprocates',           tag: 'Programme' },
    { path: '/sovereign-reciprocates/',                    title: 'Sovereign Reciprocates', tag: 'AI' },
    { path: '/governance/',                                title: 'Governance',             tag: 'Foundation' },
    { path: '/audio/',                                     title: 'Audio Briefings',        tag: 'Sound' },
    { path: '/donate-crypto/',                             title: 'Donate · Crypto',        tag: 'Give' },
    { path: '/legacy/',                                    title: 'Legacy Archive',         tag: 'Archive' },
  ];

  // ---------- Tunables ---------------------------------------------------
  const SCROLL_FRAC      = 0.85;
  const SCROLL_DUR       = 520;    // ms — smoother, less laggy
  const POP_DUR          = 220;    // matches CSS pop duration
  const TRANSITION_MIN   = 740;
  const TRANSITION_MAX   = 2400;
  const AT_BOTTOM_PX     = 14;
  const LS_FEEDBACK      = 'hand_deck_feedback_v1';
  const LS_QUEUE         = 'hand_deck_feedback_queue_v1';
  const LS_INTRO         = 'hand_deck_intro_seen_v1';
  const LS_LAST_PAGE     = 'hand_deck_last_page_v1';
  const FEEDBACK_ENDPOINT = '/.netlify/functions/feedback';

  // ---------- DOM refs ---------------------------------------------------
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const ifr            = $('#page');
  const frame          = $('#frame');
  const curPath        = $('#cur-path');
  const curTitle       = $('#cur-title');
  const curTag         = $('#cur-tag');
  const idxEl          = $('#page-index');
  const totalEl        = $('#page-total');
  const openLink       = $('#open-link');
  const progressFill   = $('#progress-fill');
  const progressDots   = $('#progress-dots');
  const btnNext        = $('#btn-next');
  const btnPrev        = $('#btn-prev');
  const btnNextLabel   = $('#btn-next-label');
  const btnFeedback    = $('#btn-feedback');

  const loadingOverlay = $('#loading-overlay');
  const loadingPath    = $('#loading-path');
  const loadingTitle   = $('#loading-title');
  const loadingBar     = $('#loading-bar-fill');
  const loadingCounter = $('#loading-counter');
  const loadingCanvas  = $('#loading-particles');

  const modal          = $('#feedback-modal');
  const modalScrim     = $('#modal-scrim');
  const modalX         = $('#modal-x');
  const fbCancel       = $('#fb-cancel');
  const fbSubmit       = $('#fb-submit');
  const fbPage         = $('#fb-page');
  const fbText         = $('#fb-text');
  const fbName         = $('#fb-name');
  const fbList         = $('#fb-list');
  const fbCount        = $('#fb-count');
  const fbStatus       = $('#fb-status');
  const fbEmpty        = $('#fb-empty');
  const fbTagWrap      = $('#modal-tags');
  const fbFocal        = $('#fb-focal');      // populated below if present

  const introToast     = $('#intro-toast');
  const introX         = $('#intro-x');

  // ---------- State ------------------------------------------------------
  let pageIdx       = 0;
  let isTransitioning = false;
  let scrollRAF     = 0;
  let activeTags    = new Set();
  let lastScrollPct = 0;
  let currentFocal  = null;       // captured when feedback modal opens

  totalEl.textContent = PAGES.length;

  try {
    const last = sessionStorage.getItem(LS_LAST_PAGE);
    if (last !== null) {
      const n = parseInt(last, 10);
      if (Number.isFinite(n) && n >= 0 && n < PAGES.length) {
        pageIdx = n;
        ifr.src = PAGES[pageIdx].path;
      }
    }
  } catch (_) {}

  // ---------- Helpers ----------------------------------------------------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  function getDoc() {
    try { return ifr.contentDocument; } catch (_) { return null; }
  }
  function getWin() {
    try { return ifr.contentWindow; } catch (_) { return null; }
  }
  function getScroller() {
    const doc = getDoc();
    if (!doc) return null;
    return doc.scrollingElement || doc.documentElement;
  }
  function scrollState() {
    const el = getScroller();
    if (!el) return null;
    return {
      scroll: el.scrollTop,
      max: Math.max(0, el.scrollHeight - el.clientHeight),
      vh: el.clientHeight,
    };
  }

  // ---------- Focal capture ---------------------------------------------
  // Find the most informative thing the user is currently looking at inside
  // the iframe: the nearest visible heading (or section[id]) to the viewport
  // centre, plus a stable selector so the pin can deep-link back to it.
  function buildSelector(el) {
    if (!el) return null;
    if (el.id) return `#${el.id}`;
    const parts = [];
    let cur = el;
    let depth = 0;
    while (cur && cur.nodeType === 1 && cur.tagName !== 'BODY' && depth < 6) {
      let part = cur.tagName.toLowerCase();
      if (cur.id) { parts.unshift(`#${cur.id}`); break; }
      const cls = (cur.className && typeof cur.className === 'string')
        ? cur.className.trim().split(/\s+/).filter(Boolean).slice(0, 2)
        : [];
      if (cls.length) part += '.' + cls.join('.');
      const parent = cur.parentElement;
      if (parent) {
        const sibs = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
        if (sibs.length > 1) {
          const i = sibs.indexOf(cur) + 1;
          part += `:nth-of-type(${i})`;
        }
      }
      parts.unshift(part);
      cur = cur.parentElement;
      depth++;
    }
    return parts.join(' > ');
  }

  function captureFocal() {
    const doc = getDoc();
    const win = getWin();
    if (!doc || !win) return null;
    const el = getScroller();
    const scrollY = el ? el.scrollTop : 0;
    const vh = el ? el.clientHeight : win.innerHeight;
    const vw = el ? el.clientWidth : win.innerWidth;
    const docHeight = el ? el.scrollHeight : 0;
    const centre = scrollY + vh * 0.4; // bias slightly toward what's above centre

    // Candidate elements with semantic value.
    const candidates = Array.from(
      doc.querySelectorAll('h1, h2, h3, [id], section, article, header, .hero, .section')
    );

    let best = null;
    let bestScore = Infinity;
    for (const c of candidates) {
      const rect = c.getBoundingClientRect();
      const absTop = rect.top + scrollY;
      const absBottom = absTop + rect.height;
      // skip offscreen ones (more than 1 vh away)
      if (absBottom < scrollY - vh || absTop > scrollY + vh * 2) continue;
      // tiny utility nodes are not useful
      if (rect.width < 80 || rect.height < 20) continue;
      const elCentre = (absTop + absBottom) / 2;
      const score = Math.abs(elCentre - centre)
        - (c.id ? 60 : 0)                                // prefer elements with stable ids
        - (/^H[1-3]$/.test(c.tagName) ? 40 : 0);         // prefer headings
      if (score < bestScore) { bestScore = score; best = c; }
    }

    let nearTitle = '';
    let selector = 'body';
    let fragment = '';
    if (best) {
      selector = buildSelector(best);
      const heading = best.querySelector ? best.querySelector('h1, h2, h3') : null;
      const candidateText = (best.tagName.match(/^H[1-3]$/i)
        ? best.textContent
        : (heading ? heading.textContent : best.getAttribute('aria-label') || best.textContent || '')
      ).replace(/\s+/g, ' ').trim();
      nearTitle = candidateText.slice(0, 140);
      if (best.id) fragment = `#${best.id}`;
    }

    const scrollPct = docHeight > vh ? Math.max(0, Math.min(1, scrollY / (docHeight - vh))) : 0;
    if (!fragment) fragment = `#scroll=${Math.round(scrollPct * 100)}%`;

    return {
      selector,
      heading: nearTitle,
      fragment,
      scroll_y: Math.round(scrollY),
      scroll_pct: scrollPct,
      viewport: { w: vw, h: vh, doc_h: docHeight },
      visible_text: nearTitle ? null : (function () {
        // fallback — grab a short slice of the nearest paragraph
        const para = doc.elementFromPoint
          ? doc.elementFromPoint(vw / 2, vh / 2)
          : null;
        return para ? (para.innerText || para.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180) : '';
      })(),
    };
  }

  // ---------- Chrome rendering -------------------------------------------
  function renderDots() {
    progressDots.innerHTML = '';
    PAGES.forEach((p, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'pd';
      dot.setAttribute('data-title', p.title);
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to ${p.title}`);
      if (i < pageIdx) dot.classList.add('done');
      if (i === pageIdx) {
        dot.classList.add('active');
        dot.setAttribute('aria-current', 'true');
      }
      dot.addEventListener('click', () => jumpTo(i));
      progressDots.appendChild(dot);
    });
  }

  function updateChrome() {
    const p = PAGES[pageIdx];
    curPath.textContent = p.path;
    curTitle.textContent = p.title;
    curTag.textContent = p.tag;
    idxEl.textContent = pageIdx + 1;
    openLink.href = p.path;
    document.title = `HAND Deck · ${p.title}`;
    renderDots();
    updateScrollProgress();
    refreshFeedbackBadge();
    try { sessionStorage.setItem(LS_LAST_PAGE, String(pageIdx)); } catch (_) {}
  }

  function updateScrollProgress() {
    const s = scrollState();
    const base = pageIdx / PAGES.length;
    const step = 1 / PAGES.length;
    let pagePct = 0;
    if (s && s.max > 0) pagePct = Math.max(0, Math.min(1, s.scroll / s.max));
    const overall = base + step * pagePct;
    progressFill.style.width = `${overall * 100}%`;
    lastScrollPct = pagePct;

    const atBottom = !s || s.max <= 0 || (s.max - s.scroll) < AT_BOTTOM_PX;
    if (atBottom) {
      btnNextLabel.textContent = pageIdx < PAGES.length - 1 ? 'Next page' : 'Restart';
      btnNext.classList.add('at-bottom');
    } else {
      btnNextLabel.textContent = 'Next';
      btnNext.classList.remove('at-bottom');
    }
  }

  // ---------- Iframe scrolling & pop ------------------------------------
  function smoothScrollIframe(toY, dur) {
    return new Promise((resolve) => {
      const el = getScroller();
      if (!el) return resolve();
      cancelAnimationFrame(scrollRAF);
      const from = el.scrollTop;
      const delta = toY - from;
      if (Math.abs(delta) < 1) return resolve();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const e = easeOutQuart(t);
        // Use Math.round to avoid sub-pixel re-rasters that compound with
        // the parent's scale transform — they were the source of the
        // visible micro-jitter on the first frame of a "next" click.
        el.scrollTop = Math.round(from + delta * e);
        updateScrollProgress();
        if (t < 1) {
          scrollRAF = requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      scrollRAF = requestAnimationFrame(tick);
    });
  }

  function popFrame() {
    frame.classList.add('popping');
    setTimeout(() => frame.classList.remove('popping'), POP_DUR);
  }

  // ---------- Step navigation -------------------------------------------
  async function stepNext() {
    if (isTransitioning) return;
    const s = scrollState();
    const atBottom = !s || s.max <= 0 || (s.max - s.scroll) < AT_BOTTOM_PX;
    if (!atBottom) {
      // Kick the pop on its own frame so the CSS transition begins
      // BEFORE the scroll RAF starts moving — they layer instead of fight.
      popFrame();
      const target = Math.min(s.max, s.scroll + s.vh * SCROLL_FRAC);
      requestAnimationFrame(() => smoothScrollIframe(target, SCROLL_DUR));
      // wait a hair longer than the scroll so chrome updates settle
      await wait(SCROLL_DUR + 40);
      updateScrollProgress();
    } else {
      const next = (pageIdx + 1) % PAGES.length;
      await transitionTo(next);
    }
  }

  async function stepPrev() {
    if (isTransitioning) return;
    const s = scrollState();
    if (s && s.scroll > AT_BOTTOM_PX) {
      popFrame();
      const target = Math.max(0, s.scroll - s.vh * SCROLL_FRAC);
      requestAnimationFrame(() => smoothScrollIframe(target, SCROLL_DUR));
      await wait(SCROLL_DUR + 40);
      updateScrollProgress();
    } else {
      const prev = (pageIdx - 1 + PAGES.length) % PAGES.length;
      await transitionTo(prev, { fromBottom: true });
    }
  }

  async function jumpTo(i) {
    if (isTransitioning || i === pageIdx) return;
    await transitionTo(i);
  }

  // ---------- Page transition -------------------------------------------
  async function transitionTo(newIdx, opts = {}) {
    if (isTransitioning) return;
    isTransitioning = true;

    const p = PAGES[newIdx];
    loadingPath.textContent = p.path;
    loadingTitle.textContent = p.title;
    loadingCounter.textContent = `${newIdx + 1} / ${PAGES.length}`;
    loadingBar.style.width = '0%';
    loadingOverlay.classList.add('active');
    loadingOverlay.setAttribute('aria-hidden', 'false');
    startParticles();

    await wait(140);
    loadingBar.style.width = '38%';

    const startedAt = performance.now();
    const loaded = new Promise((res) => {
      const onLoad = () => { ifr.removeEventListener('load', onLoad); res(); };
      ifr.addEventListener('load', onLoad);
    });
    ifr.src = p.path;

    setTimeout(() => { loadingBar.style.width = '78%'; }, 280);

    await Promise.race([loaded, wait(TRANSITION_MAX)]);
    loadingBar.style.width = '100%';

    const elapsed = performance.now() - startedAt;
    if (elapsed < TRANSITION_MIN) await wait(TRANSITION_MIN - elapsed);

    pageIdx = newIdx;
    updateChrome();

    const win = getWin();
    const el = getScroller();
    try {
      if (opts.fromBottom && el) {
        await wait(40);
        el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
      } else if (win) {
        win.scrollTo(0, 0);
      }
    } catch (_) {}

    await wait(160);
    loadingOverlay.classList.remove('active');
    loadingOverlay.setAttribute('aria-hidden', 'true');
    frame.classList.remove('land');
    void frame.offsetWidth;
    frame.classList.add('land');

    await wait(360);
    stopParticles();
    isTransitioning = false;
    bindIframeListeners();
    updateScrollProgress();
  }

  // ---------- Iframe load / scroll binding ------------------------------
  function bindIframeListeners() {
    const win = getWin();
    const doc = getDoc();
    if (!win || !doc) return;
    try {
      win.removeEventListener('scroll', updateScrollProgress);
      win.addEventListener('scroll', updateScrollProgress, { passive: true });
    } catch (_) {}
    try {
      doc.removeEventListener('keydown', onIframeKey);
      doc.addEventListener('keydown', onIframeKey);
    } catch (_) {}
  }

  function onIframeKey(e) {
    const tgt = e.target;
    if (tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement || (tgt && tgt.isContentEditable)) return;
    if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      stepNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      stepPrev();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      openFeedback();
    }
  }

  // ---------- Top-level keyboard ----------------------------------------
  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('active')) {
      if (e.key === 'Escape') closeFeedback();
      return;
    }
    const tgt = e.target;
    if (tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement || (tgt && tgt.isContentEditable)) return;

    if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      stepNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      stepPrev();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      openFeedback();
    } else if (e.key === 'Home') {
      e.preventDefault();
      jumpTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      jumpTo(PAGES.length - 1);
    } else if (e.key === 'Escape') {
      closeFeedback();
    }
  });

  btnNext.addEventListener('click', stepNext);
  btnPrev.addEventListener('click', stepPrev);
  btnFeedback.addEventListener('click', openFeedback);

  // ---------- Feedback modal --------------------------------------------
  function openFeedback() {
    const p = PAGES[pageIdx];
    fbPage.textContent = p.path;
    activeTags.clear();
    $$('.tag').forEach((t) => t.classList.remove('active'));
    fbText.value = '';

    // Capture WHERE the user is currently looking inside the iframe.
    currentFocal = captureFocal();
    renderFocalChip(currentFocal);

    fbStatus.textContent = 'Sends to inspector + Telegram on submit';
    fbStatus.style.color = '';
    refreshFeedbackList();
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => fbText.focus(), 240);
  }
  function closeFeedback() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }

  function renderFocalChip(focal) {
    if (!fbFocal) return;
    if (!focal || (!focal.heading && focal.scroll_y === 0)) {
      fbFocal.hidden = true;
      fbFocal.innerHTML = '';
      return;
    }
    fbFocal.hidden = false;
    const pct = Math.round((focal.scroll_pct || 0) * 100);
    const label = focal.heading
      ? `near “${escapeHtml(focal.heading)}”`
      : `at ${pct}% scroll`;
    fbFocal.innerHTML = `
      <span class="focal-eye" aria-hidden="true">◉</span>
      <span class="focal-label">Focus: <b>${label}</b></span>
      <span class="focal-meta">${pct}%</span>
    `;
  }

  modalX.addEventListener('click', closeFeedback);
  fbCancel.addEventListener('click', closeFeedback);
  modalScrim.addEventListener('click', closeFeedback);

  fbTagWrap.addEventListener('click', (e) => {
    const t = e.target.closest('.tag');
    if (!t) return;
    const tag = t.dataset.tag;
    if (activeTags.has(tag)) {
      activeTags.delete(tag);
      t.classList.remove('active');
    } else {
      activeTags.add(tag);
      t.classList.add('active');
    }
  });

  fbSubmit.addEventListener('click', submitFeedback);
  fbText.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submitFeedback();
    }
  });

  function buildEntry() {
    const p = PAGES[pageIdx];
    const focal = currentFocal || captureFocal() || {};
    return {
      ts: Date.now(),
      path: p.path,
      title: p.title,
      name: fbName.value.trim() || 'anonymous',
      text: fbText.value.trim(),
      tags: Array.from(activeTags),
      // focal — exactly where the user is looking
      focal: {
        selector: focal.selector || 'body',
        heading: focal.heading || '',
        fragment: focal.fragment || '',
        scroll_y: focal.scroll_y || 0,
        scroll_pct: focal.scroll_pct || 0,
        visible_text: focal.visible_text || '',
      },
      // legacy duplicates so the server function can read either shape
      scroll: focal.scroll_pct || lastScrollPct,
      ua: navigator.userAgent.slice(0, 200),
      vw: (focal.viewport && focal.viewport.w) || window.innerWidth,
      vh: (focal.viewport && focal.viewport.h) || window.innerHeight,
    };
  }

  async function submitFeedback() {
    const text = fbText.value.trim();
    if (!text) {
      fbText.focus();
      fbStatus.textContent = 'Add a note before sending.';
      fbStatus.style.color = '#fbbf24';
      return;
    }

    const entry = buildEntry();

    // Save to history immediately so it survives reload regardless of sync.
    saveFeedback(entry);
    refreshFeedbackList();
    refreshFeedbackBadge();

    // Optimistic UI — clear form right away.
    fbText.value = '';
    activeTags.clear();
    $$('.tag').forEach((t) => t.classList.remove('active'));

    setStatus('Sending to inspector…', 'pending');
    fbSubmit.disabled = true;

    const ok = await syncEntry(entry);
    fbSubmit.disabled = false;

    if (ok) {
      setStatus('Pinned to inspector ✓ ' + (entry.focal.heading ? `near “${entry.focal.heading}”` : ''), 'ok');
    } else {
      enqueue(entry);
      setStatus('Offline · queued · will sync ASAP', 'warn');
      // Try again in a few seconds in case of transient failure.
      scheduleQueueFlush(2500);
    }
  }

  function setStatus(text, kind) {
    if (!fbStatus) return;
    fbStatus.textContent = text;
    fbStatus.style.color =
      kind === 'ok'      ? '#34d399' :
      kind === 'warn'    ? '#fbbf24' :
      kind === 'pending' ? 'var(--amber-soft, #ffba49)' :
      '';
  }

  // ---------- Sync transport --------------------------------------------
  async function syncEntry(entry) {
    try {
      const payload = {
        text: entry.text,
        path: entry.path,
        title: entry.title,
        name: entry.name,
        tags: entry.tags,
        scroll: entry.focal && typeof entry.focal.scroll_pct === 'number'
          ? entry.focal.scroll_pct
          : entry.scroll,
        ua: entry.ua,
        vw: entry.vw,
        vh: entry.vh,
        ts: entry.ts,
        focal: entry.focal,
      };
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (!res.ok) return false;
      const data = await res.json().catch(() => ({}));
      return data && data.status === 'synced';
    } catch (_) {
      return false;
    }
  }

  // ---------- Retry queue ------------------------------------------------
  function loadQueue() {
    try { return JSON.parse(localStorage.getItem(LS_QUEUE) || '[]'); }
    catch (_) { return []; }
  }
  function saveQueue(q) {
    try { localStorage.setItem(LS_QUEUE, JSON.stringify(q.slice(0, 200))); }
    catch (_) {}
  }
  function enqueue(entry) {
    const q = loadQueue();
    // dedupe by ts
    if (!q.some((e) => e.ts === entry.ts)) {
      q.push(entry);
      saveQueue(q);
    }
  }

  let queueFlushTimer = 0;
  function scheduleQueueFlush(delayMs) {
    clearTimeout(queueFlushTimer);
    queueFlushTimer = setTimeout(flushQueue, delayMs);
  }

  let isFlushing = false;
  async function flushQueue() {
    if (isFlushing) return;
    if (!navigator.onLine) return;
    let q = loadQueue();
    if (q.length === 0) return;
    isFlushing = true;
    setStatus(`Syncing ${q.length} queued…`, 'pending');
    const remaining = [];
    for (const entry of q) {
      const ok = await syncEntry(entry);
      if (!ok) remaining.push(entry);
    }
    saveQueue(remaining);
    isFlushing = false;
    if (remaining.length === 0) {
      setStatus('All synced ✓', 'ok');
      // gentle clear after a moment
      setTimeout(() => {
        if (fbStatus && fbStatus.textContent === 'All synced ✓') {
          setStatus('Sends to inspector + Telegram on submit', '');
        }
      }, 3000);
    } else {
      setStatus(`${remaining.length} still queued · will retry`, 'warn');
      scheduleQueueFlush(15000);
    }
  }

  window.addEventListener('online', () => flushQueue());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushQueue();
  });

  function saveFeedback(entry) {
    try {
      const all = JSON.parse(localStorage.getItem(LS_FEEDBACK) || '[]');
      all.unshift(entry);
      localStorage.setItem(LS_FEEDBACK, JSON.stringify(all.slice(0, 500)));
    } catch (_) {}
  }
  function loadFeedback() {
    try { return JSON.parse(localStorage.getItem(LS_FEEDBACK) || '[]'); }
    catch (_) { return []; }
  }
  function refreshFeedbackList() {
    if (!fbList) return;
    const onPage = loadFeedback().filter((e) => e.path === PAGES[pageIdx].path);
    fbCount.textContent = onPage.length;
    fbList.innerHTML = '';
    if (onPage.length === 0) {
      fbEmpty.style.display = 'block';
      return;
    }
    fbEmpty.style.display = 'none';
    onPage.slice(0, 12).forEach((e) => {
      const li = document.createElement('li');
      const d = new Date(e.ts);
      const dateStr = d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const meta = document.createElement('div');
      meta.className = 'fb-meta';
      const name = document.createElement('b');
      name.textContent = e.name || 'anonymous';
      const date = document.createElement('span');
      date.textContent = dateStr;
      meta.appendChild(name);
      meta.appendChild(date);

      const body = document.createElement('div');
      body.textContent = e.text;

      li.appendChild(meta);
      li.appendChild(body);

      // surface the focal heading so the operator knows what they were
      // looking at without opening the page
      const focal = e.focal;
      if (focal && (focal.heading || focal.scroll_pct)) {
        const f = document.createElement('div');
        f.className = 'fb-focal-inline';
        const pct = Math.round((focal.scroll_pct || 0) * 100);
        f.innerHTML = `<span>◉</span> ${focal.heading
          ? `near “${escapeHtml(focal.heading)}”`
          : `at ${pct}% scroll`}`;
        li.appendChild(f);
      }

      if (e.tags && e.tags.length) {
        const t = document.createElement('div');
        t.className = 'fb-tags';
        e.tags.forEach((tag) => {
          const s = document.createElement('span');
          s.textContent = tag;
          t.appendChild(s);
        });
        li.appendChild(t);
      }
      fbList.appendChild(li);
    });
  }

  function refreshFeedbackBadge() {
    const count = loadFeedback().filter((e) => e.path === PAGES[pageIdx].path).length;
    if (count > 0) btnFeedback.classList.add('has-notes');
    else btnFeedback.classList.remove('has-notes');
  }

  // ---------- Intro toast (first visit) ---------------------------------
  function maybeShowIntro() {
    try { if (localStorage.getItem(LS_INTRO)) return; }
    catch (_) { return; }
    introToast.hidden = false;
    setTimeout(() => { if (!introToast.hidden) dismissIntro(); }, 8000);
  }
  function dismissIntro() {
    introToast.hidden = true;
    try { localStorage.setItem(LS_INTRO, '1'); } catch (_) {}
  }
  introX.addEventListener('click', dismissIntro);

  // ---------- Loading-overlay particles ---------------------------------
  let particleCtx = null, particleW = 0, particleH = 0, particleArr = [], particleRAF = 0;

  function setupParticles() {
    if (!loadingCanvas) return;
    particleCtx = loadingCanvas.getContext('2d');
    sizeParticles();
    window.addEventListener('resize', sizeParticles);
  }
  function sizeParticles() {
    if (!loadingCanvas || !particleCtx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    particleW = loadingCanvas.offsetWidth;
    particleH = loadingCanvas.offsetHeight;
    loadingCanvas.width = particleW * dpr;
    loadingCanvas.height = particleH * dpr;
    particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawnParticles() {
    particleArr = [];
    const count = Math.min(60, Math.floor((particleW * particleH) / 18000));
    for (let i = 0; i < count; i++) {
      particleArr.push({
        x: Math.random() * particleW,
        y: Math.random() * particleH,
        r: Math.random() * 1.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -Math.random() * 0.35 - 0.05,
        a: Math.random() * 0.5 + 0.2,
      });
    }
  }
  function drawParticles() {
    if (!particleCtx) return;
    particleCtx.clearRect(0, 0, particleW, particleH);
    for (const p of particleArr) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = particleH + 10; p.x = Math.random() * particleW; }
      if (p.x < -10) p.x = particleW + 10;
      if (p.x > particleW + 10) p.x = -10;
      const grd = particleCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8);
      grd.addColorStop(0, `rgba(255, 186, 73, ${p.a})`);
      grd.addColorStop(0.5, `rgba(217, 119, 6, ${p.a * 0.4})`);
      grd.addColorStop(1, 'rgba(217, 119, 6, 0)');
      particleCtx.fillStyle = grd;
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2);
      particleCtx.fill();
    }
    particleRAF = requestAnimationFrame(drawParticles);
  }
  function startParticles() {
    if (!particleCtx) setupParticles();
    sizeParticles();
    spawnParticles();
    cancelAnimationFrame(particleRAF);
    particleRAF = requestAnimationFrame(drawParticles);
  }
  function stopParticles() {
    cancelAnimationFrame(particleRAF);
    if (particleCtx) particleCtx.clearRect(0, 0, particleW, particleH);
  }

  // ---------- Boot ------------------------------------------------------
  function boot() {
    setupParticles();
    bindIframeListeners();
    updateChrome();
    maybeShowIntro();
    setInterval(updateScrollProgress, 700);
    // Try to flush any queue from a previous session.
    setTimeout(flushQueue, 1200);
  }

  ifr.addEventListener('load', () => {
    bindIframeListeners();
    updateScrollProgress();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
