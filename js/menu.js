/* GYZA, páginas internas (privacidade, método e contato): só o menu do celular, o mesmo do index, sem animação de página */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // botão fixo de baixo: some sobre o formulário do contato e no rodapé (como na home)
  const cta = $('.cta-baixo');
  if (cta && 'IntersectionObserver' in window) {
    const vistos = new Set();
    const io = new IntersectionObserver(es => {
      es.forEach(e => e.isIntersecting ? vistos.add(e.target) : vistos.delete(e.target));
      cta.classList.toggle('is-off', vistos.size > 0);
    }, { rootMargin: '0px 0px -20% 0px' });
    [$('#analise'), $('#fecho'), $('.fecho-m'), $('.footer')].forEach(el => el && io.observe(el));
  }
  // topo: troca de tom sobre as seções claras, para o logo não se perder no fundo (a página de Serviços tem o seu)
  const nav = $('.nav');
  if (nav && !document.body.classList.contains('serv') && 'IntersectionObserver' in window) {
    const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) nav.classList.toggle('is-light', e.target.dataset.theme === 'light'); }), { rootMargin: '-4% 0px -95% 0px' });
    $$('main > section[data-theme], footer[data-theme]').forEach(s => o.observe(s));
  }
  const botao = $('[data-menu-botao]'), menu = $('[data-menu]');
  if (!botao || !menu) return;
  const raiz = document.documentElement;
  const focaveis = () => [botao, ...$$('a, button', menu).filter(el => el.offsetParent !== null)];
  const aberto = () => menu.classList.contains('is-open');
  const abrir = () => {
    menu.classList.add('is-open'); raiz.classList.add('menu-aberto');
    botao.setAttribute('aria-expanded', 'true'); botao.setAttribute('aria-label', 'Fechar menu');
    // pelo teclado o foco vai para o primeiro link; pelo toque vai para o próprio menu (sem o retângulo em volta de Início)
    const alvo = abrir.teclado ? $('a', menu) : menu;
    setTimeout(() => { if (aberto()) alvo.focus({ preventScroll: true }); }, reduce ? 0 : 320);
  };
  const fechar = (devolverFoco = true) => {
    menu.classList.remove('is-open'); raiz.classList.remove('menu-aberto');
    botao.setAttribute('aria-expanded', 'false'); botao.setAttribute('aria-label', 'Abrir menu');
    if (devolverFoco) botao.focus({ preventScroll: true });
  };
  if (!menu.hasAttribute('tabindex')) menu.tabIndex = -1;
  botao.addEventListener('click', e => { abrir.teclado = e.detail === 0; aberto() ? fechar(abrir.teclado) : abrir(); });
  $$('a', menu).forEach(a => a.addEventListener('click', () => fechar(false)));
  menu.addEventListener('click', e => { if (!e.target.closest('a, button')) fechar(); });
  document.addEventListener('keydown', e => {
    if (!aberto()) return;
    if (e.key === 'Escape') { e.preventDefault(); fechar(); return; }
    if (e.key !== 'Tab') return;
    const f = focaveis(), i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
  });
  matchMedia('(min-width: 901px)').addEventListener('change', m => { if (m.matches && aberto()) fechar(false); });
})();
