/* HAND Protocol — Reciprocates intake
   Variant tabs + intake form submission + reveal animations.
   Mirrors the patterns proven in foundation-campaign/main.js
   so behavior is consistent across surfaces.
*/

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Scroll reveal ---- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  /* ---- Mobile nav toggle ---- */
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('active');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    navLinks.querySelectorAll('.nav__link').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- Smooth scroll with nav offset ---- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const targetSelector = href.startsWith('#') ? href : `#${href}`;
      // Variant-link anchors are handled below; let them through to scroll AND switch variant
      const target = document.querySelector(targetSelector);
      if (!target) return;
      e.preventDefault();
      const offset = (nav?.offsetHeight || 0) + 16;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---- Variant tabs ---- */
  const VARIANTS = ['business', 'local_business', 'grassroots'];
  const VARIANT_GROUP_LABELS = {
    business: 'About the business',
    local_business: 'About the business',
    grassroots: 'About the organization'
  };

  const tabs = Array.from(document.querySelectorAll('.intake-tab'));
  const panels = Array.from(document.querySelectorAll('.intake-variant'));
  const variantLegend = document.querySelector('[data-variant-text]');

  function setVariantInputsEnabled(variant, enabled) {
    document.querySelectorAll(`[data-variant-input="${variant}"]`).forEach((input) => {
      input.disabled = !enabled;
    });
  }

  function activateVariant(variant, { focusTab = false, updateHash = true } = {}) {
    if (!VARIANTS.includes(variant)) return;

    tabs.forEach((t) => {
      const active = t.dataset.variant === variant;
      t.setAttribute('aria-selected', String(active));
      t.setAttribute('tabindex', active ? '0' : '-1');
      if (active && focusTab) t.focus();
    });

    panels.forEach((p) => {
      const active = p.dataset.variant === variant;
      p.hidden = !active;
    });

    // Only the active variant's inputs are enabled — keeps non-visible fields
    // out of the submission payload, and avoids native validation on hidden fields.
    VARIANTS.forEach((v) => setVariantInputsEnabled(v, v === variant));

    if (variantLegend) {
      variantLegend.textContent = VARIANT_GROUP_LABELS[variant] || 'About the work';
    }

    if (updateHash && history && typeof history.replaceState === 'function') {
      const newHash = `#${variant}`;
      if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash);
      }
    }
  }

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => {
      activateVariant(tab.dataset.variant, { focusTab: true });
    });
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(idx - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) {
        e.preventDefault();
        activateVariant(next.dataset.variant, { focusTab: true });
      }
    });
  });

  // "This is me" cards switch variant + scroll to intake
  document.querySelectorAll('[data-variant-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const variant = link.dataset.variantLink;
      if (!VARIANTS.includes(variant)) return;
      e.preventDefault();
      activateVariant(variant);
      const intake = document.getElementById('intake');
      if (intake) {
        const offset = (nav?.offsetHeight || 0) + 16;
        const top = intake.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // Initial variant from URL hash, default to business
  const initialHash = (window.location.hash || '').replace('#', '');
  const initialVariant = VARIANTS.includes(initialHash) ? initialHash : 'business';
  activateVariant(initialVariant, { updateHash: false });

  /* ---- Character counter for the story textarea ---- */
  const story = document.getElementById('i-story');
  const storyCount = document.getElementById('i-story-count');
  if (story && storyCount) {
    const update = () => { storyCount.textContent = String(story.value.length); };
    story.addEventListener('input', update);
    update();
  }

  /* ---- Intake form submission ---- */
  const form = document.getElementById('intakeForm');
  if (!form) return;

  const submitBtn = document.getElementById('intakeSubmit');
  const feedback = document.getElementById('intakeFeedback');
  const successTpl = document.getElementById('intakeSuccessTemplate');
  const intakeCard = form.closest('.intake-card');

  const fields = {
    name: document.getElementById('i-name'),
    email: document.getElementById('i-email'),
    location: document.getElementById('i-location'),
    role: document.getElementById('i-role'),
    story: document.getElementById('i-story'),
    honeypot: document.getElementById('i-website')
  };

  const errs = {
    name: document.getElementById('i-name-err'),
    email: document.getElementById('i-email-err'),
    story: document.getElementById('i-story-err')
  };

  function clearErrors() {
    Object.values(errs).forEach((e) => { if (e) e.textContent = ''; });
    Object.values(fields).forEach((f) => {
      if (f && f.removeAttribute) f.removeAttribute('aria-invalid');
    });
  }

  function setError(field, message) {
    if (errs[field]) errs[field].textContent = message;
    if (fields[field]) fields[field].setAttribute('aria-invalid', 'true');
  }

  function setFeedback(state, html) {
    feedback.dataset.state = state || '';
    feedback.innerHTML = html || '';
  }

  function setSubmitting(isSubmitting) {
    form.classList.toggle('is-submitting', isSubmitting);
    if (submitBtn) {
      submitBtn.disabled = isSubmitting;
      submitBtn.setAttribute('aria-busy', String(isSubmitting));
    }
  }

  // Compute "reply by" date: 5 US business days from now, skipping Sat/Sun.
  function replyByDate(from = new Date()) {
    const d = new Date(from);
    let added = 0;
    while (added < 5) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay();
      if (day !== 0 && day !== 6) added += 1;
    }
    return d;
  }

  function formatReplyDate(d) {
    try {
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    } catch (_) {
      return d.toDateString();
    }
  }

  function gatherVariantFields(variant) {
    const out = {};
    document.querySelectorAll(`[data-variant-input="${variant}"]`).forEach((input) => {
      if (input.type === 'radio') {
        if (input.checked) out[input.name] = input.value;
      } else if (input.id) {
        const key = input.id.replace(/^i-/, '');
        if (input.value && input.value.trim().length) {
          out[key] = input.value.trim();
        }
      }
    });
    return out;
  }

  function gatherSignals() {
    return Array.from(form.querySelectorAll('input[name="signals"]:checked')).map((i) => i.value);
  }

  function activeVariant() {
    const tab = document.querySelector('.intake-tab[aria-selected="true"]');
    return tab ? tab.dataset.variant : 'business';
  }

  function showSuccess() {
    if (!successTpl || !intakeCard) return;
    const node = successTpl.content.firstElementChild.cloneNode(true);
    const dateEl = node.querySelector('[data-success-date]');
    if (dateEl) dateEl.textContent = formatReplyDate(replyByDate());

    // Replace form + tabs with success node
    const tabsEl = intakeCard.querySelector('.intake-tabs');
    if (tabsEl) tabsEl.remove();
    form.replaceWith(node);

    // Scroll the success state into view nicely
    const offset = (nav?.offsetHeight || 0) + 16;
    const top = node.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    setFeedback('', '');

    const name = (fields.name?.value || '').trim();
    const email = (fields.email?.value || '').trim();
    const story = (fields.story?.value || '').trim();

    let hasError = false;
    if (!name) { setError('name', 'What should we call you?'); hasError = true; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('email', 'Please enter an email we can reach you at.');
      hasError = true;
    }
    if (!story || story.length < 20) {
      setError('story', 'Tell us a bit more so we can write a real reply.');
      hasError = true;
    }

    if (hasError) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const variant = activeVariant();
    const payload = {
      variant,
      name,
      email,
      location: (fields.location?.value || '').trim(),
      role: (fields.role?.value || '').trim(),
      story,
      signals: gatherSignals(),
      variant_fields: gatherVariantFields(variant),
      website: fields.honeypot ? fields.honeypot.value : ''
    };

    setSubmitting(true);
    setFeedback('loading', '<p class="intake-msg">Sending&hellip;</p>');

    try {
      const res = await fetch('/.netlify/functions/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && (data.status === 'received' || data.status === 'already_received')) {
        if (data.status === 'already_received') {
          setFeedback('info', `<p class="intake-msg intake-msg--info">We already have a note from this email. Koh's reply is in the works, or check your spam folder. If your situation changed, email <a href="mailto:hand@handprotocol.org">hand@handprotocol.org</a> directly.</p>`);
          setSubmitting(false);
          return;
        }
        showSuccess();
        return;
      }

      if (res.status === 422 && data.field) {
        setError(data.field, data.message || 'Please check this and try again.');
        if (fields[data.field]) fields[data.field].focus();
        setSubmitting(false);
        return;
      }

      setFeedback('error', `<p class="intake-msg intake-msg--error">Something went sideways on our end. Email <a href="mailto:hand@handprotocol.org?subject=Reaching%20out%20about%20HAND">hand@handprotocol.org</a> and we'll pick up from there.</p>`);
    } catch (err) {
      setFeedback('error', `<p class="intake-msg intake-msg--error">Couldn't reach the server. Check your connection and try again, or email <a href="mailto:hand@handprotocol.org?subject=Reaching%20out%20about%20HAND">hand@handprotocol.org</a>.</p>`);
    } finally {
      setSubmitting(false);
    }
  });
});
