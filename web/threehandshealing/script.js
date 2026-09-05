/* Cathedral — the only script: the mobile menu. Motion lives in CSS. */
(() => {
  const btn = document.querySelector('[data-menu]');
  const nav = document.getElementById('nav');
  if (!btn || !nav) return;
  const set = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
})();
