document.addEventListener('DOMContentLoaded', () => {

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  const nav = document.getElementById('nav');

  function updateNav() {
    if (window.scrollY > 80) nav.classList.add('nav--scrolled');
    else nav.classList.remove('nav--scrolled');
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('active');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) nav.classList.add('nav--scrolled');
    });

    navLinks.querySelectorAll('.nav__link').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navHeight = nav.offsetHeight;
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    });
  });

  const tabs = Array.from(document.querySelectorAll('.serve__tab'));
  const panels = Array.from(document.querySelectorAll('.serve__panel'));

  function activateTab(tab) {
    const targetId = tab.dataset.tab;
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
      t.setAttribute('tabindex', active ? '0' : '-1');
    });
    panels.forEach((p) => {
      const active = p.id === `panel-${targetId}`;
      p.classList.toggle('active', active);
      p.hidden = !active;
      if (active) {
        const innerReveal = p.querySelector('.reveal');
        if (innerReveal) innerReveal.classList.add('visible');
      }
    });
  }

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => {
      activateTab(tab);
      tab.focus();
    });
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(idx - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) {
        e.preventDefault();
        activateTab(next);
        next.focus();
      }
    });
  });

  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const width = Number(entry.target.dataset.width) || 100;
        entry.target.style.transform = `scaleX(${width / 100})`;
        barObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.funding-tier__fill').forEach((bar) => barObserver.observe(bar));

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        counterObserver.unobserve(el);
        if (isNaN(target) || target <= 5) return;

        const suffix = el.dataset.countSuffix || '';
        let current = 0;
        const duration = 1200;
        const step = target / (duration / 16);

        function tick() {
          current += step;
          if (current >= target) {
            el.textContent = target + suffix;
            return;
          }
          el.textContent = Math.floor(current) + suffix;
          requestAnimationFrame(tick);
        }
        tick();
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach((c) => counterObserver.observe(c));

  const subscribeForm = document.getElementById('subscribeForm');
  if (subscribeForm) {
    const submitBtn = document.getElementById('subscribeSubmit');
    const feedback = document.getElementById('subscribeFeedback');
    const emailInput = document.getElementById('sc-email');
    const nameInput = document.getElementById('sc-name');
    const emailErr = document.getElementById('sc-email-err');
    const nameErr = document.getElementById('sc-name-err');
    const audienceErr = document.getElementById('sc-audience-err');
    const honeypot = document.getElementById('sc-website');

    function setFeedback(state, html) {
      feedback.dataset.state = state || '';
      feedback.innerHTML = html || '';
    }

    function clearErrors() {
      emailErr.textContent = '';
      nameErr.textContent = '';
      audienceErr.textContent = '';
      emailInput.removeAttribute('aria-invalid');
      nameInput.removeAttribute('aria-invalid');
    }

    function setSubmitting(isSubmitting) {
      subscribeForm.classList.toggle('is-submitting', isSubmitting);
      submitBtn.disabled = isSubmitting;
      submitBtn.setAttribute('aria-busy', String(isSubmitting));
    }

    subscribeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      setFeedback('', '');

      const email = emailInput.value.trim();
      const name = nameInput.value.trim();
      const audience = subscribeForm.querySelector('input[name="audience"]:checked');

      let hasError = false;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailErr.textContent = 'Please enter a valid email.';
        emailInput.setAttribute('aria-invalid', 'true');
        hasError = true;
      }
      if (!name) {
        nameErr.textContent = 'Please tell us what to call you.';
        nameInput.setAttribute('aria-invalid', 'true');
        hasError = true;
      }
      if (!audience) {
        audienceErr.textContent = 'Pick the one that fits best.';
        hasError = true;
      }

      if (hasError) {
        const firstInvalid = subscribeForm.querySelector('[aria-invalid="true"]')
          || (audience ? null : subscribeForm.querySelector('input[name="audience"]'));
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      setSubmitting(true);
      setFeedback('loading', '<p class="stay-close__msg">Sending&hellip;</p>');

      try {
        const res = await fetch('/.netlify/functions/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name,
            audience: audience.value,
            website: honeypot ? honeypot.value : ''
          })
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.status === 'subscribed') {
          subscribeForm.reset();
          setFeedback('success', `<p class="stay-close__msg stay-close__msg--success">Almost there. Check your inbox for a confirmation link from us.</p>`);
        } else if (res.ok && data.status === 'already_subscribed') {
          setFeedback('info', `<p class="stay-close__msg stay-close__msg--info">You're already on the list. Thanks for staying close.</p>`);
        } else if (res.status === 422 && data.field) {
          if (data.field === 'email') {
            emailErr.textContent = data.message || 'That email looks off.';
            emailInput.setAttribute('aria-invalid', 'true');
            emailInput.focus();
          } else {
            setFeedback('error', `<p class="stay-close__msg stay-close__msg--error">${data.message || 'Please check the form and try again.'}</p>`);
          }
        } else {
          setFeedback('error', `<p class="stay-close__msg stay-close__msg--error">Something went sideways on our end. Email <a href="mailto:hand@handprotocol.org">hand@handprotocol.org</a> and we'll add you manually.</p>`);
        }
      } catch (err) {
        setFeedback('error', `<p class="stay-close__msg stay-close__msg--error">Couldn't reach the server. Check your connection and try again, or email <a href="mailto:hand@handprotocol.org">hand@handprotocol.org</a>.</p>`);
      } finally {
        setSubmitting(false);
      }
    });
  }

  document.querySelectorAll('.crypto-address__copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      if (!text) return;
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
        document.body.removeChild(ta);
      }
      const label = btn.querySelector('.crypto-address__copy-label');
      if (ok) {
        btn.classList.add('copied');
        if (label) {
          const prev = label.textContent;
          label.textContent = 'Copied';
          setTimeout(() => {
            label.textContent = prev;
            btn.classList.remove('copied');
          }, 1800);
        }
      } else if (label) {
        label.textContent = 'Press Ctrl+C';
        setTimeout(() => { label.textContent = 'Copy'; }, 1800);
      }
    });
  });

});
