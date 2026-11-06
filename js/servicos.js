/* GYZA, página de Serviços: tema do topo e do botão fixo, trilho das camadas, entrada na rolagem */
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

  // topo, botão fixo e trilho mudam de tom conforme a seção que passa por baixo do topo
  const nav = $('.nav'), cta = $('.cta-baixo'), rail = $('[data-rail-nav]');
  const seguir = (alvo, margem) => {
    if (!alvo) return;
    const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) alvo.classList.toggle('is-light', e.target.dataset.theme === 'light'); }), { rootMargin: margem });
    $$('main > section[data-theme]').forEach(s => o.observe(s));
  };
  seguir(nav, '-4% 0px -95% 0px');   // o topo olha a faixa de cima
  // o trilho pega o tom da seção que está de fato embaixo dele (escuro sobre escuro, claro sobre claro)
  if (rail) {
    const secs = $$('main > section[data-theme]');
    let pedido = 0;
    const tom = () => {
      pedido = 0;
      const r = rail.getBoundingClientRect(), y = r.top + r.height / 2;
      const s = secs.find(x => { const b = x.getBoundingClientRect(); return b.top <= y && b.bottom > y; });
      if (s) rail.classList.toggle('is-light', s.dataset.theme === 'light');
    };
    addEventListener('scroll', () => { if (!pedido) pedido = requestAnimationFrame(tom); }, { passive: true });
    addEventListener('resize', tom);
    tom();
  }
  seguir(cta, '-93% 0px -4% 0px');   // o botão fixo olha a faixa de baixo

  // trilho: camada em leitura
  const links = $$('[data-rail]');
  const marca = n => links.forEach(a => { if (a.dataset.rail === String(n)) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  const atual = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { marca(e.target.dataset.camada); const a = $(`[data-rail="${e.target.dataset.camada}"]`); if (a && rail) rail.scrollTo({ left: a.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' }); }
  }), { rootMargin: '-40% 0px -55% 0px' });
  $$('[data-camada]').forEach(s => atual.observe(s));
  const hero = $('.s-hero');
  if (hero) new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) marca(0); }), { rootMargin: '-40% 0px -55% 0px' }).observe(hero);

  // botão fixo some quando o fecho aparece
  const fecho = $('#fecho');
  if (fecho) new IntersectionObserver(es => es.forEach(e => { if (rail) rail.classList.toggle('is-off', e.isIntersecting); }), { rootMargin: '0px 0px -30% 0px' }).observe(fecho);
})();
