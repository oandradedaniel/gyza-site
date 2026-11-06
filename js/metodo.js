/* GYZA, página Método: a linha do tempo se preenche de azul com a rolagem e cada etapa entra quando chega na tela.
   Mesma curva e duração da home (expo out, cerca de 1 s). Sem movimento: tudo visível e a linha cheia. */
(() => {
  const lista = document.querySelector('[data-linha]');
  if (!lista) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const etapas = [...lista.querySelectorAll('.etapa-m')];
  if (reduce || !('IntersectionObserver' in window)) { lista.style.setProperty('--p', 1); etapas.forEach(e => e.classList.add('is-in')); return; }
  document.documentElement.classList.add('linha-on');
  // a linha enche até a altura do meio da tela
  let pedido = 0;
  const mede = () => {
    pedido = 0;
    const r = lista.getBoundingClientRect(), alvo = innerHeight * 0.6;
    const p = Math.max(0, Math.min(1, (alvo - r.top) / Math.max(1, r.height)));
    lista.style.setProperty('--p', p.toFixed(4));
  };
  const pede = () => { if (!pedido) pedido = requestAnimationFrame(mede); };
  addEventListener('scroll', pede, { passive: true });
  addEventListener('resize', pede);
  mede();
  // cada etapa entra (fade e leve subida) e o ponto acende quando ela chega
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -18% 0px', threshold: 0.1 });
  etapas.forEach(e => io.observe(e));
})();
