/* GYZA, formulário da análise (index e contato): valida, monta a mensagem e abre o WhatsApp.
   Não depende do GSAP: se o cdnjs falhar, o envio continua e nada vai para a URL. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  if (!$('[data-form]')) return;

  // painel da GYZA: a chave publishable é pública por natureza (a mesma do painel); o banco só aceita inserir pedidos por esta função
  const PAINEL = 'https://fpmlsrelubzipxyfsyrf.supabase.co/rest/v1/rpc/enviar_pedido_site';
  const CHAVE = 'sb_publishable_wcYfZFDbCeWYl6gltC6CCQ_wMEb62E2';
  function enviaPainel(dados) {
    const ctrl = 'AbortController' in window ? new AbortController() : null;
    const limite = setTimeout(() => ctrl && ctrl.abort(), 4000);
    return fetch(PAINEL, {
      method: 'POST',
      headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
      signal: ctrl ? ctrl.signal : undefined,
      keepalive: true,
    }).then(r => r.ok).catch(() => false).finally(() => clearTimeout(limite));
  }

  function form() {
    const f = $('[data-form]');
    const note = $('[data-form-note]');
    const original = note.innerHTML;
    // um envio por vez: o botão trava 3 s para não abrir o WhatsApp a cada clique
    const btn = $('[type="submit"]', f), btnTxt = $('span', btn) || btn, btnOriginal = btnTxt.textContent;
    let enviando = false;
    // duas etapas: 1 = dados de contato, 2 = serviço, política e envio
    const etapas = $$('[data-etapa]', f);
    let etapa = 1, girando = false;
    // erro ao lado de cada campo (texto curto), além da nota geral embaixo do botão
    const erro = (alvo, depois, chave, msg) => {
      let el = $(`#erro-${chave}`, f);
      if (!el) { el = document.createElement('p'); el.className = 'campo-erro'; el.id = `erro-${chave}`; depois.after(el); }
      el.textContent = msg || '';
      const ids = msg ? `erro-${chave} form-nota` : '';
      if (ids) alvo.setAttribute('aria-describedby', ids); else alvo.removeAttribute('aria-describedby');
      return !msg;
    };
    const MSG = {
      nome: v => !v && 'Falta o seu nome.',
      email: v => !v ? 'Falta o e-mail.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && 'Confira o e-mail (ex.: voce@suaempresa.com.br).',
      celular: v => v.replace(/\D/g, '').length < 10 && 'Falta o celular com DDD.',
      empresa: v => !v && 'Falta o nome da empresa.',
    };
    const avisaFalta = raiz => {
      const n = $$('.campo-erro', raiz).filter(e => e.textContent).length;
      note.textContent = n > 1 ? `Faltam ${n} itens: veja os campos marcados em vermelho.` : 'Falta 1 item: veja o campo marcado em vermelho.';
      note.classList.add('is-error');
    };
    // etapa 1: nome, e-mail, celular, empresa e Instagram ou site (opcional)
    const valida1 = () => {
      let ok = true;
      $$('input[required]', f).forEach(i => {
        const m = (MSG[i.name] || (v => !v && 'Campo obrigatório.'))(i.value.trim()) || '';
        i.classList.toggle('is-error', !!m);
        i.setAttribute('aria-invalid', String(!!m));
        erro(i, i, i.name, m);
        if (m) ok = false;
      });
      return ok;
    };
    // troca de etapa: o cartão gira no eixo Y (metade da ida, troca, metade da volta) e a altura acompanha; reduced-motion = fade curto
    const vai = async para => {
      if (girando || para === etapa) return;
      girando = true;
      const dir = para > etapa ? 1 : -1, h0 = f.offsetHeight;
      const mostra = () => {
        etapas.forEach(el => {
          const on = +el.dataset.etapa === para;
          el.hidden = !on; el.inert = !on;
          if (on) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true');
        });
        etapa = para;
        note.textContent = ''; note.classList.remove('is-error');
      };
      const limpa = () => { f.getAnimations().forEach(x => x.cancel()); f.style.overflow = ''; f.style.willChange = ''; };
      try {
        if (!f.animate) mostra();
        else if (reduce) {
          await f.animate({ opacity: [1, 0] }, { duration: 120, fill: 'forwards' }).finished;
          mostra();
          await f.animate({ opacity: [0, 1] }, { duration: 160 }).finished;
        } else {
          const p = a => `perspective(1400px) rotateY(${a}deg)`;
          f.style.overflow = 'hidden'; f.style.willChange = 'transform, height';
          await f.animate({ transform: [p(0), p(-90 * dir)] }, { duration: 300, easing: 'cubic-bezier(.55,0,.8,.4)', fill: 'forwards' }).finished;
          mostra();
          const h1 = f.offsetHeight;
          const volta = f.animate({ transform: [p(90 * dir), p(0)] }, { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
          f.animate({ height: [`${h0}px`, `${h1}px`] }, { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
          await volta.finished;
        }
      } catch (_) { mostra(); }
      limpa();
      girando = false;
      const alvo = $('input:not([disabled])', etapas[para - 1]) || $('[tabindex="-1"]', etapas[para - 1]);
      if (alvo) alvo.focus({ preventScroll: true });
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    };
    const proximo = () => {
      if (!valida1()) {
        avisaFalta(etapas[0]);
        ($('input.is-error', etapas[0]) || $('input', etapas[0])).focus();
        return;
      }
      note.textContent = ''; note.classList.remove('is-error');
      if (window.gyzaMetrica) window.gyzaMetrica('form_etapa2');
      vai(2);
    };
    $('[data-proximo]', f).addEventListener('click', proximo);
    $('[data-voltar]', f).addEventListener('click', () => vai(1));
    // corrigiu tudo: a nota de erro some
    etapas[0].addEventListener('input', () => { if (note.classList.contains('is-error') && !$$('.campo-erro', etapas[0]).some(e => e.textContent)) { note.textContent = ''; note.classList.remove('is-error'); } });
    // Enter num campo da etapa 1 = Próximo (nunca envia)
    etapas[0].addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); proximo(); } });
    f.addEventListener('submit', e => {
      e.preventDefault();
      if (enviando) return;
      if (etapa === 1) { proximo(); return; }
      let ok = true;
      const perfil = $('input[name="perfil"]', f);
      if (perfil) {
        const longo = perfil.value.trim().length > 120;
        perfil.classList.toggle('is-error', longo);
        if (longo) perfil.setAttribute('aria-invalid', 'true'); else perfil.removeAttribute('aria-invalid');
        erro(perfil, perfil, 'perfil', longo ? 'Use até 120 caracteres.' : '');
        if (longo) ok = false;
      }
      // serviço desejado: pelo menos um marcado
      const caixas = $('[data-servicos]', f);
      const algum = !!$('input[name="servico"]:checked', f);
      // Outros marcado: o campo de texto passa a ser obrigatório
      const outroInput = $('input[name="servico_outro"]', f);
      const outroFalta = $('[data-outros]', f).checked && !outroInput.value.trim();
      outroInput.classList.toggle('is-error', outroFalta);
      if (outroFalta) outroInput.setAttribute('aria-invalid', 'true'); else outroInput.removeAttribute('aria-invalid');
      erro(outroInput, outroInput, 'outro', outroFalta ? 'Conte o que você precisa.' : '');
      caixas.classList.toggle('is-error', !algum);
      erro(caixas, $('.servico-campo__lista', caixas), 'servico', algum ? '' : 'Marque pelo menos um serviço.');
      // política de privacidade: a caixa precisa estar marcada
      const aceiteBox = $('[data-aceite]', f);
      const aceite = $('input[name="aceite"]', f).checked;
      aceiteBox.classList.toggle('is-error', !aceite);
      erro($('input[name="aceite"]', f), $('label', aceiteBox), 'aceite', aceite ? '' : 'Confirme que leu a Política de Privacidade.');
      if (!ok || !algum || !aceite || outroFalta) {
        avisaFalta(etapas[1]);
        ($('input.is-error', etapas[1]) || (!algum && $('input[name="servico"]', f)) || $('input[name="aceite"]', f)).focus();
        return;
      }
      note.innerHTML = original;
      note.classList.remove('is-error');
      const d = new FormData(f);
      const msg = [
        'Olá, GYZA. Quero solicitar a análise gratuita da minha empresa.',
        `Nome: ${d.get('nome').trim()}`,
        `E-mail: ${d.get('email').trim()}`,
        `Celular: ${d.get('celular')}`,
        `Empresa: ${d.get('empresa').trim()}`,
        (d.get('perfil') || '').trim() ? `Instagram ou site: ${d.get('perfil').trim()}` : '',
        `Serviço desejado: ${d.getAll('servico').map(v => v === 'Outros' ? `Outros (${(d.get('servico_outro') || '').trim()})` : v).join(', ')}`,
      ].filter(Boolean).join('\n');
      if (enviando) return;
      enviando = true;
      btn.disabled = true; btn.setAttribute('aria-busy', 'true');
      btnTxt.textContent = 'Enviando...';
      const wa = `https://wa.me/5547992606871?text=${encodeURIComponent(msg)}`;
      // plano B: se o pedido não chegar ao painel, o WhatsApp abre com a mensagem pronta e o lead não se perde
      const abreWhats = () => { if (!window.open(wa, '_blank', 'noopener')) location.href = wa; };
      const servicos = d.getAll('servico');
      const pedido = {
        p_nome: (d.get('nome') || '').trim(),
        p_email: (d.get('email') || '').trim(),
        p_celular: (d.get('celular') || '').trim(),
        p_empresa: (d.get('empresa') || '').trim(),
        p_servicos: servicos,
        p_outros_texto: servicos.includes('Outros') ? (d.get('servico_outro') || '').trim() : '',
        p_aceite: !!d.get('aceite'),
        p_origem: /contato/.test(location.pathname) ? 'contato' : 'index',
        p_instagram_site: (d.get('perfil') || '').trim(),
        p_site: d.get('site') || '',
      };
      let origem = {};
      try { origem = (window.gyzaOrigem && window.gyzaOrigem()) || {}; } catch (_) {}
      // origem do primeiro contato (utm, ?ref=): se o banco ainda não conhece estes campos, tenta de novo sem eles
      enviaPainel(Object.assign({}, pedido, origem)).then(ok => ok || !origem.p_fonte && !origem.p_afiliado ? ok : enviaPainel(pedido)).then(ok => {
        if (ok) { if (window.gyzaMetrica) window.gyzaMetrica('form_enviado'); vai(3); } else { if (window.gyzaMetrica) window.gyzaMetrica('form_whatsapp'); btnTxt.textContent = 'Abrindo o WhatsApp...'; abreWhats(); }
      });
      setTimeout(() => {
        enviando = false;
        btn.disabled = false; btn.removeAttribute('aria-busy');
        btnTxt.textContent = btnOriginal;
      }, 3000);
    });
    // Enviar outro pedido: limpa tudo e volta à etapa 1 com o giro
    $('[data-outro-pedido]', f).addEventListener('click', () => {
      f.reset();
      $$('.campo-erro', f).forEach(e => { e.textContent = ''; });
      $$('.is-error', f).forEach(e => e.classList.remove('is-error'));
      $$('[aria-invalid],[aria-describedby]', f).forEach(e => { e.removeAttribute('aria-invalid'); e.removeAttribute('aria-describedby'); });
      const o = $('[data-outros]', f), ob = $('[data-outro-box]', f);
      o.setAttribute('aria-expanded', 'false'); ob.classList.remove('is-open'); $('input[name="servico_outro"]', f).disabled = true;
      vai(1);
    });
    // Outros: abre o campo de texto logo abaixo; desmarcar fecha e o texto não vai
    const outros = $('[data-outros]', f), outroBox = $('[data-outro-box]', f), outroIn = $('input[name="servico_outro"]', f);
    outros.addEventListener('change', () => {
      const on = outros.checked;
      outros.setAttribute('aria-expanded', String(on));
      outroBox.classList.toggle('is-open', on);
      outroIn.disabled = !on;
      if (on) setTimeout(() => outroIn.focus({ preventScroll: true }), reduce ? 0 : 120);
      else { outroIn.value = ''; outroIn.classList.remove('is-error'); outroIn.removeAttribute('aria-invalid'); }
    });
    outroIn.addEventListener('input', () => { outroIn.classList.remove('is-error'); outroIn.removeAttribute('aria-invalid'); outroIn.removeAttribute('aria-describedby'); const e = $('#erro-outro', f); if (e) e.textContent = ''; });
    $('input[name="aceite"]', f).addEventListener('change', () => {
      const c = $('[data-aceite]', f); c.classList.remove('is-error'); $('input[name="aceite"]', f).removeAttribute('aria-describedby'); const e = $('#erro-aceite', f); if (e) e.textContent = '';
    });
    $$('input[name="servico"]', f).forEach(i => i.addEventListener('change', () => {
      const c = $('[data-servicos]', f); c.classList.remove('is-error'); c.removeAttribute('aria-describedby'); const e = $('#erro-servico', f); if (e) e.textContent = '';
    }));
    $$('input[required]', f).forEach(i => i.addEventListener('input', () => { i.classList.remove('is-error'); i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); const e = $(`#erro-${i.name}`, f); if (e) e.textContent = ''; }));
    // WhatsApp: os parênteses e o traço aparecem enquanto digita, (11) 91234-5678
    const tel = $('input[name="celular"]', f);
    tel.maxLength = 15;
    tel.addEventListener('input', () => {
      const n = tel.value.replace(/\D/g, '').slice(0, 11);
      const corte = n.length > 10 ? 7 : 6;            // celular com 9 dígitos ou fixo com 8
      tel.value = n.length <= 2 ? (n ? `(${n}` : '')
        : n.length <= corte ? `(${n.slice(0, 2)}) ${n.slice(2)}`
        : `(${n.slice(0, 2)}) ${n.slice(2, corte)}-${n.slice(corte)}`;
    });
  }

  form();
})();
