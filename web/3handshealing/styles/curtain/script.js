/* Three Hands Healing — Curtain
   The house lights, the spotlight that finds you, the pedestal that sinks,
   and the curtain call. Everything here degrades to CSS's finished state. */
(() => {
  const d = document, w = window;
  d.documentElement.classList.add('js');
  const reduce = w.matchMedia('(prefers-reduced-motion: reduce)');
  const desk = w.matchMedia('(min-width: 901px)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);

  /* ---- mobile menu ---- */
  const btn = d.querySelector('[data-menu]');
  const nav = d.getElementById('nav');
  if (btn && nav) {
    const label = btn.lastChild;
    const set = (open) => {
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (label && label.nodeType === 3) label.textContent = open ? 'Close' : 'Menu';
    };
    btn.addEventListener('click', () => set(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); btn.focus(); }
    });
  }

  /* ---- reveals: seats, pages, seal, ticket, cartouche, footlights, prose ---- */
  const revealables = [...d.querySelectorAll('.io')];
  if (reduce.matches || !('IntersectionObserver' in w)) {
    revealables.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    revealables.forEach((el) => io.observe(el));
  }

  /* ---- "set down what has been carried": tap toggles the drape on touch (ornamental; hover elsewhere, no tab stop) ---- */
  d.querySelectorAll('.chip--drape').forEach((chip) => {
    chip.addEventListener('click', () => chip.classList.toggle('is-down'));
  });

  /* ---- the spotlight: eases toward whichever heading is crossing the middle ---- */
  const spot = d.querySelector('.spot');
  const heads = [...d.querySelectorAll('[data-spot]')];
  let tx = w.innerWidth / 2, ty = w.innerHeight * 0.6, cx = tx, cy = ty, raf = 0;
  const aim = () => {
    const mid = w.innerHeight / 2;
    let best = null, bd = Infinity;
    for (const h of heads) {
      const r = h.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - mid);
      if (dist < bd) { bd = dist; best = r; }
    }
    if (best && bd < w.innerHeight * 0.9) {
      tx = best.left + best.width / 2; ty = best.top + best.height / 2;
    } else {
      tx = w.innerWidth / 2; ty = w.innerHeight * 0.6;
    }
  };
  const glide = () => {
    cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
    spot.style.transform = 'translate(' + cx.toFixed(1) + 'px, ' + cy.toFixed(1) + 'px)';
    raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.4) ? requestAnimationFrame(glide) : 0;
  };
  const light = () => {
    if (!spot || reduce.matches) return;
    aim();
    if (!raf) raf = requestAnimationFrame(glide);
  };
  if (spot) setTimeout(() => spot.classList.add('is-on'), reduce.matches ? 0 : 1900);

  /* ---- "a guide, not a pedestal": the pedestal sinks into the floor as it enters ---- */
  const ped = d.querySelector('.pedestal');
  const sink = () => {
    if (!ped || reduce.matches) return;
    const r = ped.getBoundingClientRect();
    const vh = w.innerHeight;
    const p = clamp((vh * 0.92 - r.top) / (vh * 0.55), 0, 1);
    ped.style.setProperty('--p', smooth(p).toFixed(3));
  };

  /* ---- curtain call: close on Maria's bow, reopen on the next step alone ----
     .is-live marks the script-driven state (desktop, motion allowed); without it the
     card is simply visible, so no-JS visitors still get the CTA. */
  const call = d.querySelector('.call');
  const stage = d.querySelector('.call__stage');
  const head = d.querySelector('.site-head');
  const panels = call ? [...call.querySelectorAll('.call__curtain .curtain__panel')] : [];
  let called = false;
  const live = () => desk.matches && !reduce.matches;
  const curtainCall = () => {
    if (!call || !stage) return;
    if (!live()) {
      call.classList.remove('is-live');
      if (called) { called = false; call.classList.remove('is-called'); }
      panels.forEach((p) => p.style.removeProperty('--k'));
      return;
    }
    call.classList.add('is-live');
    const top = head ? head.offsetHeight : 0;
    const travel = call.offsetHeight - stage.offsetHeight;
    const r = call.getBoundingClientRect();
    const p = travel > 0 ? clamp((top - r.top) / travel, 0, 1) : 1;
    let k;
    if (p < 0.22) k = 1;
    else if (p < 0.44) k = 1 - smooth((p - 0.22) / 0.22);
    else if (p < 0.7) k = smooth((p - 0.44) / 0.26);
    else k = 1;
    panels.forEach((el) => el.style.setProperty('--k', k.toFixed(3)));
    const now = p >= 0.44;
    if (now !== called) { called = now; call.classList.toggle('is-called', now); }
  };

  /* "Book a session" must land on the reopened stage, card in the light — not on the bow.
     While the pin is live, every #book link scrolls to the point where the curtains have
     already parted again (the visitor rides through the close/reopen on the way). */
  const bookY = () => {
    if (!call || !stage || !call.classList.contains('is-live')) return null;
    const top = head ? head.offsetHeight : 0;
    const travel = call.offsetHeight - stage.offsetHeight;
    return call.getBoundingClientRect().top + w.scrollY - top + Math.max(0, travel) * 0.85;
  };
  const goBook = (behavior) => {
    const y = bookY();
    if (y == null) return false;
    w.scrollTo({ top: y, behavior });
    if (call.tabIndex < 0) call.tabIndex = -1;
    call.focus({ preventScroll: true });
    return true;
  };
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#book"]');
    if (!a || e.defaultPrevented) return;
    if (goBook('smooth')) {
      e.preventDefault();
      if (history.replaceState) history.replaceState(null, '', '#book');
    }
  });
  if (location.hash === '#book') {
    w.addEventListener('load', () => { curtainCall(); goBook('instant'); }, { once: true });
  }

  /* ---- one scroll loop ---- */
  let ticking = false;
  const frame = () => { ticking = false; sink(); curtainCall(); light(); };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  w.addEventListener('scroll', onScroll, { passive: true });
  w.addEventListener('resize', onScroll);
  desk.addEventListener('change', onScroll);
  w.addEventListener('load', frame);
  frame();
})();
