/* ========================================
   HAND Protocol Foundation
   Main JavaScript
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- Scroll-based reveal animations ---
  const revealElements = document.querySelectorAll('.reveal');

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

  revealElements.forEach((el) => revealObserver.observe(el));

  // --- Navigation scroll behavior ---
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  function updateNav() {
    const scrollY = window.scrollY;
    if (scrollY > 80) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
    lastScroll = scrollY;
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // --- Mobile menu toggle ---
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      nav.classList.add('nav--scrolled');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('.nav__link').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const navHeight = nav.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // --- Tab switching (Who We Serve) ---
  const tabs = document.querySelectorAll('.serve__tab');
  const panels = document.querySelectorAll('.serve__panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetPanel = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const panel = document.getElementById(`panel-${targetPanel}`);
      if (panel) {
        panel.classList.add('active');
        // Trigger reveal on newly shown content
        const innerReveal = panel.querySelector('.reveal');
        if (innerReveal) innerReveal.classList.add('visible');
      }
    });
  });

  // --- Funding bar animation ---
  const fundingBars = document.querySelectorAll('.funding-tier__fill');

  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const width = entry.target.dataset.width || 0;
        entry.target.style.width = width + '%';
        barObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.3
  });

  fundingBars.forEach((bar) => barObserver.observe(bar));

  // --- Number counter animation ---
  const counters = document.querySelectorAll('[data-count]');

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        if (isNaN(target)) return;

        let current = 0;
        const duration = 1200;
        const step = target / (duration / 16);

        function updateCounter() {
          current += step;
          if (current >= target) {
            el.textContent = target;
            return;
          }
          el.textContent = Math.floor(current);
          requestAnimationFrame(updateCounter);
        }

        updateCounter();
        counterObserver.unobserve(el);
      }
    });
  }, {
    threshold: 0.5
  });

  counters.forEach((counter) => counterObserver.observe(counter));

});
