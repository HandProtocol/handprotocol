/* Popup — the mobile menu, then the pop-up mechanics (GSAP + ScrollTrigger).
   <head> adds html.motion only when reduced motion is off; if GSAP is not
   here we drop the class and the CSS finished states take over. */
(() => {
  const html = document.documentElement;

  /* mobile menu — a paper flap that unfolds from the header */
  const btn = document.querySelector('[data-menu]');
  const nav = document.getElementById('nav');
  if (btn && nav) {
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  if (!html.classList.contains('motion') || !window.gsap || !window.ScrollTrigger) { html.classList.remove('motion'); return; }
  gsap.registerPlugin(ScrollTrigger);

  const HINGE = { rotateX: 90, opacity: 0, transformOrigin: '50% 100%', transformPerspective: 900 };
  const UP = { rotateX: 0, opacity: 1, duration: .7, ease: 'power2.out' };
  const once = (trigger, start) => ({ trigger, start: start || 'top 88%', once: true });
  /* a pull-tab scrubs with the scroll on the way in, then stays pulled */
  const pulled = (trigger, start, end) => ({ trigger, start, end, scrub: .5, invalidateOnRefresh: true,
    onUpdate(self) { if (self.progress >= 1) self.kill(false, true); } });

  /* arrival: the stage rises on its hinges, then the photo card, then the H1 lines */
  gsap.timeline({ defaults: { ease: 'power2.out' } })
    .fromTo('.hills--back .hill', HINGE, { ...UP, stagger: .08 })
    .fromTo('.hill--5', HINGE, UP, '-=.4')
    .fromTo('.blades, .flag', HINGE, { ...UP, duration: .5 }, '-=.45')
    .fromTo('.hero__card', HINGE, UP, '-=.5')
    .fromTo('.h1l', HINGE, { ...UP, duration: .6, stagger: .12 }, '-=.45')
    .fromTo('.fade', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .08 }, '-=.4');

  /* the back hills drift up a little as the page scrolls away; the front hill stays on its fold */
  gsap.utils.toArray('.hills--back .hill').forEach((h, i) => {
    gsap.to(h, { y: -[26, 18, 11, 5][i], ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  });

  /* every other hinged element rises once as its page is reached */
  gsap.utils.toArray('.rise').forEach((el) => {
    gsap.fromTo(el, HINGE, { ...UP, delay: +(el.dataset.delay || 0), immediateRender: true, scrollTrigger: once(el) });
  });

  /* welcome: the three card pieces slide into their slots */
  gsap.fromTo('.piece', { opacity: 0, x: (i) => [0, -4, 4][i], y: (i) => [-4, 3, 3][i] },
    { opacity: 1, x: 0, y: 0, duration: .8, stagger: .15, ease: 'power2.out', immediateRender: true, scrollTrigger: once('.bigmark', 'top 85%') });

  /* invisible blocks: they stand up as the paragraph arrives, then fold flat onto their dotted footprints once you have read past them (the well keeps its height, so nothing below moves under the reader) */
  gsap.fromTo('.block', HINGE, { ...UP, stagger: .08, immediateRender: true, scrollTrigger: once('.blocks') });
  gsap.to('.block', { rotateX: 90, opacity: .5, transformOrigin: '50% 100%', duration: .6, stagger: .08, ease: 'power2.in', overwrite: 'auto', scrollTrigger: once('.blocks', 'bottom 22%') });

  /* root-cause modalities: the cover slides up with the scroll (or with the tab) */
  const roots = document.querySelector('.roots');
  if (roots) {
    gsap.to('.roots__cover', { y: () => -(roots.offsetHeight - 34), ease: 'none', scrollTrigger: pulled(roots, 'top 85%', 'top 35%') });
    const tab = roots.querySelector('.pulltab');
    let y0 = null;
    tab.addEventListener('pointerdown', (e) => { y0 = e.clientY; tab.setPointerCapture(e.pointerId); tab.classList.add('is-grab'); });
    tab.addEventListener('pointermove', (e) => { if (y0 === null) return; const dy = e.clientY - y0; y0 = e.clientY; window.scrollBy(0, -dy * 1.5); });
    const end = () => { y0 = null; tab.classList.remove('is-grab'); };
    tab.addEventListener('pointerup', end);
    tab.addEventListener('pointercancel', end);
  }

  /* set down what has been carried: the bundle slides off the figure's back */
  gsap.to('.bundle', { x: 24, y: 16, rotation: 14, transformOrigin: '50% 100%', ease: 'power1.inOut', scrollTrigger: pulled('.carry', 'top 92%', 'top 55%') });
  gsap.to('.carry__tab', { x: 10, ease: 'none', scrollTrigger: pulled('.carry', 'top 92%', 'top 55%') });

  /* let what has been held move through and out */
  gsap.fromTo('.sl', { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: .7, stagger: .12, ease: 'power2.out', immediateRender: true, scrollTrigger: once('.slot') });

  /* Arrive / Experience / Integrate: the strip is pulled and the figures step along the path */
  gsap.to('.strip', { x: 56, ease: 'none', scrollTrigger: pulled('.path', 'top 88%', 'bottom 30%') });
  gsap.to('.walker', { x: 36, ease: 'none', scrollTrigger: pulled('.path', 'top 88%', 'bottom 30%') });

  /* grow through our deepest challenges: the dotted path draws over the ridge */
  gsap.to('.mtn__draw', { attr: { 'stroke-dashoffset': 0 }, ease: 'none', scrollTrigger: pulled('.mtn', 'top 95%', 'bottom 60%') });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
