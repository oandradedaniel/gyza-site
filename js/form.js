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
      const req = $$('input[required]', f);
      let ok = true;
      req.forEach(i => {
        const v = i.value.trim();
        const bad = !v || (i.name === 'celular' && v.replace(/\D/g, '').length < 10) || (i.name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v));
        i.classList.toggle('is-error', bad);
        i.setAttribute('aria-invalid', String(bad));
        if (bad) i.setAttribute('aria-describedby', 'form-nota'); else i.removeAttribute('aria-describedby');
        if (bad) ok = false;
      });
      // serviço desejado: pelo menos um marcado
      const caixas = $('[data-servicos]', f);
      const algum = !!$('input[name="servico"]:checked', f);
      // Outros marcado: o campo de texto passa a ser obrigatório
      const outroInput = $('input[name="servico_outro"]', f);
      const outroFalta = $('[data-outros]', f).checked && !outroInput.value.trim();
      outroInput.classList.toggle('is-error', outroFalta);
      if (outroFalta) { outroInput.setAttribute('aria-invalid', 'true'); outroInput.setAttribute('aria-describedby', 'form-nota'); }
      else { outroInput.removeAttribute('aria-invalid'); outroInput.removeAttribute('aria-describedby'); }
      if (outroFalta) ok = false;
      caixas.classList.toggle('is-error', !algum);
      if (!algum) caixas.setAttribute('aria-describedby', 'form-nota'); else caixas.removeAttribute('aria-describedby');
      // política de privacidade: a caixa precisa estar marcada
      const aceiteBox = $('[data-aceite]', f);
      const aceite = $('input[name="aceite"]', f).checked;
      aceiteBox.classList.toggle('is-error', !aceite);
      if (!aceite) aceiteBox.setAttribute('aria-describedby', 'form-nota'); else aceiteBox.removeAttribute('aria-describedby');
      if (!ok || !algum || !aceite) {
        const faltas = [];
        if (!ok) faltas.push(outroFalta && !$$('input[required].is-error', f).length ? 'conte o que você precisa em Outros' : 'preencha nome, e-mail, celular com DDD e empresa' + (outroFalta ? ' e conte o que você precisa em Outros' : ''));
        if (!algum) faltas.push('marque pelo menos um serviço');
        if (!aceite) faltas.push('confirme que leu a Política de Privacidade');
        const txt = faltas.length > 1 ? faltas.slice(0, -1).join(', ') + ' e ' + faltas[faltas.length - 1] : faltas[0];
        note.textContent = txt.charAt(0).toUpperCase() + txt.slice(1) + '.';
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
    outroIn.addEventListener('input', () => { outroIn.classList.remove('is-error'); outroIn.removeAttribute('aria-invalid'); });
    $('input[name="aceite"]', f).addEventListener('change', () => {
      const c = $('[data-aceite]', f); c.classList.remove('is-error'); c.removeAttribute('aria-describedby');
    });
    $$('input[name="servico"]', f).forEach(i => i.addEventListener('change', () => {
      const c = $('[data-servicos]', f); c.classList.remove('is-error'); c.removeAttribute('aria-describedby');
    }));
    $$('input[required]', f).forEach(i => i.addEventListener('input', () => { i.classList.remove('is-error'); i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); }));
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
