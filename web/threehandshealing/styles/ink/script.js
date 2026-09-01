/* Ink — one orchestrated moment: wait for the faces, then brush the ensō and settle the words. */
(() => {
  const html = document.documentElement;
  let done = false;
  const ready = () => { if (done) return; done = true; requestAnimationFrame(() => html.classList.add('is-ready')); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready, ready); else ready();
  setTimeout(ready, 1400); /* never hold the page hostage to a font */
})();
