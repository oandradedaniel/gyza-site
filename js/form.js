/* GYZA, formulário da análise (index e contato): valida, monta a mensagem e abre o WhatsApp.
   Não depende do GSAP: se o cdnjs falhar, o envio continua e nada vai para a URL. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  if (!$('[data-form]')) return;

  function form() {
    const f = $('[data-form]');
    const note = $('[data-form-note]');
    const original = note.innerHTML;
    // um envio por vez: o botão trava 3 s para não abrir o WhatsApp a cada clique
    const btn = $('[type="submit"]', f), btnTxt = $('span', btn) || btn, btnOriginal = btnTxt.textContent;
    let enviando = false;
    f.addEventListener('submit', e => {
      e.preventDefault();
      if (enviando) return;
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
      let ok = true;
      $$('input[required]', f).forEach(i => {
        const m = (MSG[i.name] || (v => !v && 'Campo obrigatório.'))(i.value.trim()) || '';
        i.classList.toggle('is-error', !!m);
        i.setAttribute('aria-invalid', String(!!m));
        erro(i, i, i.name, m);
        if (m) ok = false;
      });
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
        const n = $$('.campo-erro', f).filter(e => e.textContent).length;
        note.textContent = n > 1 ? `Faltam ${n} itens: veja os campos marcados em vermelho.` : 'Falta 1 item: veja o campo marcado em vermelho.';
        note.classList.add('is-error');
        ($('input.is-error', f) || (!algum && $('input[name="servico"]', f)) || $('input[name="aceite"]', f)).focus();
        return;
      }
      note.innerHTML = original;
      note.classList.remove('is-error');
      const d = new FormData(f);
      const msg = [
        'Olá, GYZA. Quero solicitar a análise gratuita da minha empresa.',
        `Nome: ${d.get('nome')}`,
        `E-mail: ${d.get('email').trim()}`,
        `Celular: ${d.get('celular')}`,
        `Empresa: ${d.get('empresa')}`,
        `Serviço desejado: ${d.getAll('servico').map(v => v === 'Outros' ? `Outros (${(d.get('servico_outro') || '').trim()})` : v).join(', ')}`,
      ].filter(Boolean).join('\n');
      if (enviando) return;
      enviando = true;
      btn.disabled = true; btn.setAttribute('aria-busy', 'true');
      btnTxt.textContent = 'Abrindo o WhatsApp...';
      window.open(`https://wa.me/5547992606871?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
      setTimeout(() => {
        enviando = false;
        btn.disabled = false; btn.removeAttribute('aria-busy');
        btnTxt.textContent = btnOriginal;
      }, 3000);
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
    // WhatsApp: os parênteses e o traço aparecem enquanto digita, (41) 99177-6871
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
