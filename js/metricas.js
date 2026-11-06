/* GYZA, medição de visitas sem cookie: conta visitas e cliques de forma anônima (página, origem e ação).
   Sem cookie, sem localStorage, sem IP guardado no site, sem fingerprint. O id da sessão mora no sessionStorage e some ao fechar a aba.
   Respeita "não rastrear" (doNotTrack) e Global Privacy Control. Falha em silêncio: nunca quebra a página.
   Contrato com o banco: POST /rest/v1/rpc/registrar_evento_site { p_tipo, p_pagina, p_ref, p_sessao, p_detalhe }
   Tipos: visita, clique_analise, form_etapa2, form_enviado, form_whatsapp, clique_whatsapp, abriu_case, clique_instagram.
   Teste local: hostname 127.0.0.1/localhost não envia; ?metricas=teste força o envio. */
(() => {
  'use strict';
  try {
    const nav = navigator, loc = location;
    const dnt = nav.doNotTrack === '1' || window.doNotTrack === '1' || nav.msDoNotTrack === '1' || nav.globalPrivacyControl === true;
    if (dnt) return;
    const local = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(loc.hostname);
    const forca = /[?&]metricas=teste(&|$)/.test(loc.search);
    if (local && !forca) return;

    // mesma URL e chave publishable do formulário (js/form.js); a chave é pública por natureza
    const URL_RPC = 'https://fpmlsrelubzipxyfsyrf.supabase.co/rest/v1/rpc/registrar_evento_site';
    const CHAVE = 'sb_publishable_wcYfZFDbCeWYl6gltC6CCQ_wMEb62E2';

    const corta = (t, n) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, n);

    const pagina = () => {
      const marcada = document.documentElement.getAttribute('data-pagina');
      if (marcada) return corta(marcada, 60);
      let p = loc.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
      if (p.length > 1) p = p.replace(/\/+$/, '');
      return corta(p || '/', 60);
    };

    const origem = () => {
      let utm = '';
      try { utm = new URLSearchParams(loc.search).get('utm_source') || ''; } catch (_) {}
      if (utm) return corta(utm.toLowerCase(), 60);
      try {
        if (!document.referrer) return '';
        const h = new URL(document.referrer).hostname.replace(/^www\./, '').toLowerCase();
        return h === loc.hostname.replace(/^www\./, '').toLowerCase() ? '' : corta(h, 60);
      } catch (_) { return ''; }
    };

    const sessao = () => {
      try {
        let s = sessionStorage.getItem('gyza_s');
        if (!s) {
          const b = new Uint8Array(8);
          (window.crypto || window.msCrypto).getRandomValues(b);
          s = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
          sessionStorage.setItem('gyza_s', s);
        }
        return s;
      } catch (_) { return ''; }
    };

    const ultimo = {};
    const envia = (tipo, detalhe) => {
      try {
        const chave = tipo + '|' + (detalhe || '');
        const agora = Date.now();
        if (ultimo[chave] && agora - ultimo[chave] < 1500) return; // clique repetido
        ultimo[chave] = agora;
        const ctrl = 'AbortController' in window ? new AbortController() : null;
        const limite = setTimeout(() => { try { ctrl && ctrl.abort(); } catch (_) {} }, 3000);
        fetch(URL_RPC, {
          method: 'POST',
          headers: { apikey: CHAVE, Authorization: 'Bearer ' + CHAVE, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_tipo: tipo, p_pagina: pagina(), p_ref: origem(), p_sessao: sessao(), p_detalhe: corta(detalhe, 60) }),
          keepalive: true,
          signal: ctrl ? ctrl.signal : undefined,
        }).catch(() => {}).then(() => clearTimeout(limite));
      } catch (_) { /* silêncio */ }
    };

    // o formulário (js/form.js) chama window.gyzaMetrica('form_etapa2' | 'form_enviado' | 'form_whatsapp')
    window.gyzaMetrica = (tipo, detalhe) => envia(tipo, detalhe);

    envia('visita');

    document.addEventListener('click', e => {
      try {
        const alvo = e.target && e.target.closest ? e.target : null;
        if (!alvo) return;
        const caso = alvo.closest('[data-proj-open]');
        if (caso) { envia('abriu_case', caso.getAttribute('data-proj-open')); return; }
        const el = alvo.closest('a, button');
        if (!el) return;
        const href = el.getAttribute('href') || '';
        if (/instagram\.com/i.test(href)) { envia('clique_instagram'); return; }
        if (/(^|\/\/)(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\b/i.test(href)) { envia('clique_whatsapp'); return; }
        if (/solicite sua an[aá]lise/i.test(el.textContent || '')) envia('clique_analise');
      } catch (_) { /* silêncio */ }
    }, true);
  } catch (_) { /* silêncio */ }
})();
