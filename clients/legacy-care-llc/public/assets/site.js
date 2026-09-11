// Gentle reveal and bilingual copy toggle.
(function(){
  var els=document.querySelectorAll('.reveal:not(.in)');
  if(!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches){els.forEach(function(e){e.classList.add('in')});}
  else {var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}})},{threshold:.1,rootMargin:'0px 0px -6% 0px'});els.forEach(function(e){io.observe(e);});}
  var KEY='hand-lang', nodes=[].slice.call(document.querySelectorAll('[data-es]'));
  function set(lang){var es=lang==='es';nodes.forEach(function(n){if(!n.dataset.en)n.dataset.en=n.innerHTML; n.innerHTML=es?n.dataset.es:n.dataset.en;});document.documentElement.lang=es?'es':'en';document.querySelectorAll('.lang-toggle').forEach(function(b){b.setAttribute('aria-pressed',es?'true':'false');b.setAttribute('aria-label',es?'View in English':'Ver en español');var l=b.querySelector('.lang-label');if(l)l.textContent=es?'English':'Español';});}
  var stored=null;try{stored=localStorage.getItem(KEY)}catch(e){};var nav=(navigator.language||'').toLowerCase();set(stored||(nav.indexOf('es')===0?'es':'en'));document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.lang-toggle');if(!b)return;e.preventDefault();var next=document.documentElement.lang==='es'?'en':'es';set(next);try{localStorage.setItem(KEY,next)}catch(x){}});
})();
