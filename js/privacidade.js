/* GYZA, política de privacidade: só o menu do celular (o mesmo do index, sem animação de página) */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const botao = $('[data-menu-botao]'), menu = $('[data-menu]');
  if (!botao || !menu) return;
  const raiz = document.documentElement;
  const focaveis = () => [botao, ...$$('a', menu)];
  const aberto = () => menu.classList.contains('is-open');
  const abrir = () => {
    menu.classList.add('is-open'); raiz.classList.add('menu-aberto');
    botao.setAttribute('aria-expanded', 'true'); botao.setAttribute('aria-label', 'Fechar menu');
    setTimeout(() => { if (aberto()) $('a', menu).focus({ preventScroll: true }); }, reduce ? 0 : 320);
  };
  const fechar = (devolverFoco = true) => {
    menu.classList.remove('is-open'); raiz.classList.remove('menu-aberto');
    botao.setAttribute('aria-expanded', 'false'); botao.setAttribute('aria-label', 'Abrir menu');
    if (devolverFoco) botao.focus({ preventScroll: true });
  };
  botao.addEventListener('click', () => (aberto() ? fechar() : abrir()));
  $$('a', menu).forEach(a => a.addEventListener('click', () => fechar(false)));
  menu.addEventListener('click', e => { if (!e.target.closest('a')) fechar(); });
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
