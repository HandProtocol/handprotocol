/* Cathedral — the mobile menu, and "Read the full description" on the
   practice pages (phones only; without JS every description shows). (site pack) */
(() => {
  document.documentElement.classList.add('js');

  const btn = document.querySelector('[data-menu]');
  const nav = document.getElementById('nav');
  if (btn && nav) {
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  document.querySelectorAll("[data-more]").forEach((more) => {
    more.addEventListener('click', () => {
      const card = more.closest('.offer');
      const open = !card.classList.contains('is-open');
      card.classList.toggle('is-open', open);
      more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? 'Show less' : 'Read the full description';
    });
  });
})();
