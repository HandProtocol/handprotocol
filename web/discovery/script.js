// HAND Protocol — Discovery docs
// Minimal progressive enhancement: scroll-reveal + active-section TOC highlighting

(function () {
  'use strict';

  // 1. Scroll reveal — adds .in to .reveal elements as they enter viewport
  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    document.querySelectorAll('.reveal').forEach((el) => revealObs.observe(el));
  } else {
    // No IO support — just show everything
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  }

  // 2. TOC active-section highlight on scroll
  const tocLinks = document.querySelectorAll('.toc__item');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const sectionMap = new Map();
    tocLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const target = document.querySelector(href);
        if (target) sectionMap.set(target, link);
      }
    });

    const tocObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = sectionMap.get(entry.target);
          if (!link) return;
          if (entry.isIntersecting) {
            tocLinks.forEach((l) => l.removeAttribute('data-active'));
            link.setAttribute('data-active', 'true');
          }
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    sectionMap.forEach((_, section) => tocObs.observe(section));
  }

  // 3. External link styling — open new tab for off-domain links in prose
  document.querySelectorAll('.prose a[href^="http"], .footnotes a[href^="http"]').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
})();
