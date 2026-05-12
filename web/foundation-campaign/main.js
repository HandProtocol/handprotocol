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
