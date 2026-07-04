(() => {
  const slides = Array.from(document.querySelectorAll('[data-slide]'));
  const next = document.querySelector('[data-next]');
  const prev = document.querySelector('[data-prev]');
  const progress = document.querySelector('[data-progress]');

  const currentIndex = () => {
    const mid = window.scrollY + window.innerHeight * 0.38;
    let best = 0;
    let bestDistance = Infinity;

    slides.forEach((slide, index) => {
      const top = slide.offsetTop;
      const distance = Math.abs(top - mid);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });

    return best;
  };

  const goTo = (index) => {
    const slide = slides[Math.max(0, Math.min(slides.length - 1, index))];
    if (!slide) return;
    slide.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateProgress = () => {
    if (!progress || slides.length < 2) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  };

  next?.addEventListener('click', () => goTo(currentIndex() + 1));
  prev?.addEventListener('click', () => goTo(currentIndex() - 1));

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      goTo(currentIndex() + 1);
    }

    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      goTo(currentIndex() - 1);
    }
  });

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
})();
