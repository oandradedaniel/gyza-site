/* GYZA, topo: Serviços no topo (Vitor, 06/11/2026): no computador, um painel de vidro com as 5 camadas abre ao passar o mouse
   (com um pequeno atraso para não piscar) ou pela setinha ao lado de Serviços (clique e teclado); o texto Serviços continua indo para /servicos.
   No menu do celular, a setinha ao lado de Serviços mostra as 5 camadas embaixo. Fechado por padrão em todas as páginas. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- computador ----------
  const nav = $('.nav'), drop = $('[data-drop]'), btn = $('[data-drop-btn]'), painel = $('[data-drop-painel]');
  if (nav && drop && btn && painel) {
    const itens = $$('a', painel);
    let tAbre = 0, tFecha = 0;
    const aberto = () => !painel.hidden;
    const tom = () => painel.classList.toggle('is-light', nav.classList.contains('is-light'));
    const posiciona = () => {
      const r = drop.getBoundingClientRect();
      painel.style.left = `${Math.round(r.left + r.width / 2)}px`;
      painel.style.top = `${Math.round(nav.getBoundingClientRect().bottom + 10)}px`;
    };
    const abre = () => {
      clearTimeout(tFecha); clearTimeout(tAbre);
      if (aberto()) return;
      tom(); posiciona();
      painel.hidden = false;
      requestAnimationFrame(() => painel.classList.add('is-open'));
      btn.setAttribute('aria-expanded', 'true');
      drop.classList.add('is-open');
    };
    const fecha = (devolver = false) => {
      clearTimeout(tAbre); clearTimeout(tFecha);
      if (!aberto()) return;
      painel.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      drop.classList.remove('is-open');
      setTimeout(() => { if (!painel.classList.contains('is-open')) painel.hidden = true; }, 260);
      if (devolver) btn.focus({ preventScroll: true });
    };
    const passa = () => { clearTimeout(tFecha); if (!aberto()) { clearTimeout(tAbre); tAbre = setTimeout(abre, 120); } };
    const sai = () => { clearTimeout(tAbre); clearTimeout(tFecha); tFecha = setTimeout(() => fecha(), 220); };
    const comMouse = matchMedia('(hover: hover) and (pointer: fine)');
    [drop, painel].forEach(el => {
      el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && comMouse.matches) passa(); });
      el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && comMouse.matches) sai(); });
    });
    btn.addEventListener('click', () => (aberto() ? fecha() : abre()));
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); abre(); itens[0].focus(); }
    });
    painel.addEventListener('keydown', e => {
      const i = itens.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); itens[(i + 1) % itens.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); itens[(i - 1 + itens.length) % itens.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); itens[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); itens[itens.length - 1].focus(); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && aberto()) { e.preventDefault(); fecha(true); } });
    // Tab: depois da setinha o foco entra no painel; ao sair do painel ele fecha
    btn.addEventListener('keydown', e => { if (e.key === 'Tab' && !e.shiftKey && aberto()) { e.preventDefault(); itens[0].focus(); } });
    painel.addEventListener('focusout', e => {
      if (painel.contains(e.relatedTarget)) return;
      if (e.relatedTarget === btn) return;
      fecha();
    });
    painel.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const i = itens.indexOf(document.activeElement);
      if (!e.shiftKey && i === itens.length - 1) { e.preventDefault(); fecha(); const prox = drop.nextElementSibling; if (prox) prox.focus(); }
      else if (e.shiftKey && i === 0) { e.preventDefault(); btn.focus(); }
    });
    document.addEventListener('pointerdown', e => { if (aberto() && !drop.contains(e.target) && !painel.contains(e.target)) fecha(); });
    itens.forEach(a => a.addEventListener('click', () => fecha()));
    // acompanha o tom do topo e some junto quando o topo se esconde na rolagem
    new MutationObserver(() => { tom(); if (nav.classList.contains('is-hidden')) fecha(); }).observe(nav, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', () => { if (aberto()) posiciona(); });
    addEventListener('scroll', () => { if (aberto()) posiciona(); }, { passive: true });
    matchMedia('(max-width: 900px)').addEventListener('change', m => { if (m.matches) fecha(); });
  }

  // ---------- celular: o Solicite sua análise do topo some enquanto o formulário (#analise) está na tela (Vitor, 06/11/2026) ----------
  const cta = $('.nav__cta'), analise = $('#analise');
  if (cta && analise && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => cta.classList.toggle('is-off', e.isIntersecting), { threshold: 0 }).observe(analise);
  }

  // ---------- celular: as 5 camadas embaixo de Serviços ----------
  const sb = $('[data-sub-btn]'), sub = sb && document.getElementById(sb.getAttribute('aria-controls'));
  if (sb && sub) {
    sb.addEventListener('click', e => {
      e.stopPropagation();
      const abrir = sb.getAttribute('aria-expanded') !== 'true';
      sb.setAttribute('aria-expanded', String(abrir));
      sub.hidden = !abrir;
      sb.closest('.mmenu__item').classList.toggle('is-open', abrir);
    });
    // menu fechou: a lista volta fechada
    const menu = $('[data-menu]');
    if (menu) new MutationObserver(() => {
      if (!menu.classList.contains('is-open') && sb.getAttribute('aria-expanded') === 'true') {
        sb.setAttribute('aria-expanded', 'false'); sub.hidden = true; sb.closest('.mmenu__item').classList.remove('is-open');
      }
    }).observe(menu, { attributes: true, attributeFilter: ['class'] });
  }
})();
