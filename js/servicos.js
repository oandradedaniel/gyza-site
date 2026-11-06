/* GYZA, página de Serviços: tema do topo e do botão fixo, entrada na rolagem */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window)) return;

  // entrada na rolagem
  if (!reduce) {
    document.documentElement.classList.add('rv-on');
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    $$('.rv').forEach(el => io.observe(el));
  }

  // topo e botão fixo mudam de tom conforme a seção que passa por baixo do topo
  const nav = $('.nav'), cta = $('.cta-baixo');
  const seguir = (alvo, margem) => {
    if (!alvo) return;
    const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) alvo.classList.toggle('is-light', e.target.dataset.theme === 'light'); }), { rootMargin: margem });
    $$('main > section[data-theme]').forEach(s => o.observe(s));
  };
  seguir(nav, '-4% 0px -95% 0px');   // o topo olha a faixa de cima
  seguir(cta, '-93% 0px -4% 0px');   // o botão fixo olha a faixa de baixo

})();
