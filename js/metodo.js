/* GYZA, página Método: a linha do tempo se preenche de azul com a rolagem, do primeiro ao último ponto, com um brilho na ponta;
   cada ponto (e a sua etapa) acende quando a linha chega nele. Mesma curva da home (expo out, cerca de 1 s).
   Sem movimento: tudo aceso e a linha cheia. */
(() => {
  const lista = document.querySelector('[data-linha]');
  if (!lista) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const etapas = [...lista.querySelectorAll('.etapa-m')];
  const pontos = etapas.map(e => e.querySelector('.etapa-m__n'));
  const cabeca = document.createElement('span');
  cabeca.className = 'etapas-m__cabeca';
  cabeca.setAttribute('aria-hidden', 'true');
  lista.appendChild(cabeca);
  // centro de cada ponto, medido sem o deslocamento da entrada (offsetTop ignora transform)
  let centros = [];
  const medeCentros = () => {
    centros = etapas.map((e, i) => e.offsetTop + pontos[i].offsetTop + pontos[i].offsetHeight / 2);
    lista.style.setProperty('--l0', `${centros[0]}px`);
    lista.style.setProperty('--l1', `${centros[centros.length - 1]}px`);
  };
  medeCentros();
  const total = () => centros[centros.length - 1] - centros[0];
  if (reduce || !('IntersectionObserver' in window)) {
    lista.style.setProperty('--f', `${total()}px`);
    etapas.forEach(e => e.classList.add('is-in', 'is-on'));
    addEventListener('resize', () => { medeCentros(); lista.style.setProperty('--f', `${total()}px`); });
    return;
  }
  document.documentElement.classList.add('linha-on');
  // a ponta da linha acompanha a altura de 60% da tela
  let pedido = 0;
  const mede = () => {
    pedido = 0;
    const r = lista.getBoundingClientRect(), alvo = innerHeight * 0.6;
    const f = Math.max(0, Math.min(total(), alvo - (r.top + centros[0])));
    lista.style.setProperty('--f', `${f.toFixed(1)}px`);
    lista.style.setProperty('--cab', f > 0.5 && f < total() - 0.5 ? 1 : 0);
    etapas.forEach((e, i) => e.classList.toggle('is-on', centros[i] - centros[0] <= f + 0.5));
  };
  const pede = () => { if (!pedido) pedido = requestAnimationFrame(mede); };
  addEventListener('scroll', pede, { passive: true });
  addEventListener('resize', () => { medeCentros(); pede(); });
  mede();
  if (document.fonts) document.fonts.ready.then(() => { medeCentros(); pede(); });
  // cada etapa entra (fade e leve subida) quando chega na tela
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -18% 0px', threshold: 0.1 });
  etapas.forEach(e => io.observe(e));
})();
