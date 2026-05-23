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
  const SCROLL_FRAC      = 0.85;   // fraction of viewport per "next" step
  const SCROLL_DUR       = 640;    // ms — pop-scroll duration
  const POP_DUR          = 540;    // ms — frame pop animation duration
  const TRANSITION_MIN   = 740;    // ms — minimum overlay visibility
  const TRANSITION_MAX   = 2400;   // ms — bail-out after this even if iframe load is slow
  const AT_BOTTOM_PX     = 14;     // tolerance for "at bottom"
  const LS_FEEDBACK      = 'hand_deck_feedback_v1';
  const LS_INTRO         = 'hand_deck_intro_seen_v1';
  const LS_LAST_PAGE     = 'hand_deck_last_page_v1';
  const FEEDBACK_ENDPOINT = '/.netlify/functions/feedback'; // optional; silently no-op if missing

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

  const introToast     = $('#intro-toast');
  const introX         = $('#intro-x');

  // ---------- State ------------------------------------------------------
  let pageIdx       = 0;
  let isTransitioning = false;
  let scrollRAF     = 0;
  let activeTags    = new Set();
  let lastScrollPct = 0;

  totalEl.textContent = PAGES.length;

  // Restore last page if user reopens the deck within session storage scope
  try {
    const last = sessionStorage.getItem(LS_LAST_PAGE);
    if (last !== null) {
      const n = parseInt(last, 10);
      if (Number.isFinite(n) && n >= 0 && n < PAGES.length) {
        pageIdx = n;
        ifr.src = PAGES[pageIdx].path;
      }
    }
  } catch (_) { /* sessionStorage may be blocked */ }

  // ---------- Helpers ----------------------------------------------------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
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
        const e = easeOutCubic(t);
        el.scrollTop = from + delta * e;
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
      popFrame();
      const target = Math.min(s.max, s.scroll + s.vh * SCROLL_FRAC);
      await smoothScrollIframe(target, SCROLL_DUR);
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
      await smoothScrollIframe(target, SCROLL_DUR);
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

    // brief beat so the overlay reads
    await wait(140);
    loadingBar.style.width = '38%';

    const startedAt = performance.now();
    const loaded = new Promise((res) => {
      const onLoad = () => { ifr.removeEventListener('load', onLoad); res(); };
      ifr.addEventListener('load', onLoad);
    });
    ifr.src = p.path;

    // bar climbs while loading
    setTimeout(() => { loadingBar.style.width = '78%'; }, 280);

    await Promise.race([loaded, wait(TRANSITION_MAX)]);
    loadingBar.style.width = '100%';

    // ensure overlay is shown for at least TRANSITION_MIN ms
    const elapsed = performance.now() - startedAt;
    if (elapsed < TRANSITION_MIN) await wait(TRANSITION_MIN - elapsed);

    pageIdx = newIdx;
    updateChrome();

    // reset iframe scroll (top by default, or bottom when going backwards past page-top)
    const win = getWin();
    const el = getScroller();
    try {
      if (opts.fromBottom && el) {
        // wait one frame for layout
        await wait(40);
        el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
      } else if (win) {
        win.scrollTo(0, 0);
      }
    } catch (_) {}

    await wait(160);
    loadingOverlay.classList.remove('active');
    loadingOverlay.setAttribute('aria-hidden', 'true');
    frame.classList.remove('land'); // restart anim
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
      // Forward keyboard to parent so Space / Arrow keys work while iframe has focus
      doc.removeEventListener('keydown', onIframeKey);
      doc.addEventListener('keydown', onIframeKey);
      // Forward clicks so first interaction inside the iframe also gives us focus
      doc.removeEventListener('click', onIframeFirstClick);
      doc.addEventListener('click', onIframeFirstClick, { once: true });
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
  function onIframeFirstClick() {
    // no-op — listener exists so we get a same-origin handshake when needed
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

  // ---------- Controls --------------------------------------------------
  btnNext.addEventListener('click', stepNext);
  btnPrev.addEventListener('click', stepPrev);
  btnFeedback.addEventListener('click', openFeedback);

  // ---------- Feedback modal --------------------------------------------
  function openFeedback() {
    fbPage.textContent = PAGES[pageIdx].path;
    activeTags.clear();
    $$('.tag').forEach((t) => t.classList.remove('active'));
    fbText.value = '';
    fbStatus.textContent = 'Saved locally · synced when online';
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

  function submitFeedback() {
    const text = fbText.value.trim();
    if (!text) {
      fbText.focus();
      fbStatus.textContent = 'Add a note before sending.';
      fbStatus.style.color = '#fbbf24';
      return;
    }
    const entry = {
      ts: Date.now(),
      path: PAGES[pageIdx].path,
      title: PAGES[pageIdx].title,
      name: fbName.value.trim() || 'anonymous',
      text,
      tags: Array.from(activeTags),
      scroll: lastScrollPct,
      ua: navigator.userAgent.slice(0, 200),
      vw: window.innerWidth,
      vh: window.innerHeight,
    };

    saveFeedback(entry);
    fbText.value = '';
    activeTags.clear();
    $$('.tag').forEach((t) => t.classList.remove('active'));
    fbStatus.textContent = 'Saved · thank you';
    fbStatus.style.color = '#34d399';
    refreshFeedbackList();
    refreshFeedbackBadge();

    // best-effort POST; silently ignore if the endpoint doesn't exist
    try {
      fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        keepalive: true,
      }).catch(() => {});
    } catch (_) {}
  }

  function saveFeedback(entry) {
    try {
      const all = JSON.parse(localStorage.getItem(LS_FEEDBACK) || '[]');
      all.unshift(entry);
      localStorage.setItem(LS_FEEDBACK, JSON.stringify(all.slice(0, 500)));
    } catch (_) {}
  }
  function loadFeedback() {
    try {
      return JSON.parse(localStorage.getItem(LS_FEEDBACK) || '[]');
    } catch (_) {
      return [];
    }
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
    try {
      if (localStorage.getItem(LS_INTRO)) return;
    } catch (_) { return; }
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
    // periodic scroll sample — some iframe pages swallow scroll events
    setInterval(updateScrollProgress, 700);
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
