/* GYZA, medição de visitas sem cookie (v2, 06/11/2026): conta pessoas e ações de forma anônima.
   Sem cookie, sem IP guardado no site, sem fingerprint. Quem conta "pessoas únicas por dia" é o banco: ele cria um código
   (hash) a partir da conexão e do navegador, mistura com um segredo e a data, e guarda só o código, que muda todo dia.
   O site só guarda no sessionStorage o código da aba e a origem do primeiro contato (some ao fechar a aba).
   Respeita "não rastrear" (doNotTrack) e Global Privacy Control. Falha em silêncio: nunca quebra a página.

   Contrato com o banco: POST /rest/v1/rpc/registrar_evento_site
     { p_tipo, p_pagina, p_ref, p_sessao, p_detalhe, p_disp, p_medio, p_campanha, p_afiliado }
   Tipos extras do formulário: form_erro (detalhe = campo ou "envio"), form_voltou, form_abandono_etapa (detalhe = etapa em que saiu), clique_email.
   Tipos: visita, clique_analise (detalhe = onde: topo, menu, abertura, case, rodape...), form_inicio (primeiro campo tocado), form_etapa2,
     form_enviado, form_whatsapp, clique_whatsapp, clique_instagram, clique_linkedin, abriu_case (detalhe = qual),
     rolagem_50 e rolagem_90 (só na página inicial).
   Origem (primeiro contato da sessão): utm_source ou domínio de quem mandou; utm_medium (bio, stories, pagina...); utm_campaign;
     gclid sem utm_medium vira medio "cpc" (Google Ads); ?ref=CODIGO (afiliado ou parceiro) vale para a sessão inteira.
     O banco agrupa em instagram, google, linkedin, whatsapp, facebook, direto, outros. O ?ref= também fica 30 dias no localStorage
     (gyza_ref: só o código e a validade, sem renovar). O banco só credita o afiliado se o código existir e estiver ativo.
   window.gyzaMetrica(tipo, detalhe) é chamado por js/form.js; window.gyzaOrigem() devolve a origem para o pedido do formulário.

   Tráfego nosso: abrir gyza.com.br/?interno=1 grava gyza_interno=1 no localStorage DESTE aparelho e dali em diante ele não envia
   nada (nem eventos). ?interno=0 desfaz. É a única coisa que o site grava no aparelho, e só nos aparelhos da equipe.
   O banco também descarta robôs e navegadores sem janela (HeadlessChrome, Playwright, bot, Lighthouse, Vercel, preview...).
   Teste local: hostname 127.0.0.1/localhost não envia; ?metricas=teste força o envio. */
(() => {
  'use strict';
  try {
    const nav = navigator, loc = location;

    // marca de aparelho da equipe
    const q = (() => { try { return new URLSearchParams(loc.search); } catch (_) { return new URLSearchParams(''); } })();
    try {
      if (q.get('interno') === '1') localStorage.setItem('gyza_interno', '1');
      else if (q.get('interno') === '0') localStorage.removeItem('gyza_interno');
      if (localStorage.getItem('gyza_interno') === '1') return;
    } catch (_) { /* sem localStorage: segue */ }

    const dnt = nav.doNotTrack === '1' || window.doNotTrack === '1' || nav.msDoNotTrack === '1' || nav.globalPrivacyControl === true;
    if (dnt) return;
    const local = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(loc.hostname);
    const forca = /[?&]metricas=teste(&|$)/.test(loc.search);
    if (local && !forca) return;

    // mesma URL e chave publishable do formulário (js/form.js); a chave é pública por natureza
    const URL_RPC = 'https://fpmlsrelubzipxyfsyrf.supabase.co/rest/v1/rpc/registrar_evento_site';
    const CHAVE = 'sb_publishable_wcYfZFDbCeWYl6gltC6CCQ_wMEb62E2';

    const corta = (t, n) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, n);
    const slug = (t, n) => corta(t, n).toLowerCase().replace(/[^a-z0-9_.\- ]/g, '');

    const pagina = () => {
      const marcada = document.documentElement.getAttribute('data-pagina');
      if (marcada) return corta(marcada, 60);
      let p = loc.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
      if (p.length > 1) p = p.replace(/\/+$/, '');
      return corta(p || '/', 60);
    };
    const ehHome = () => pagina() === '/';

    // origem do primeiro contato da sessão (guardada no sessionStorage, vale para todas as páginas da aba)
    const toque = () => {
      let src = slug(q.get('utm_source'), 60), med = slug(q.get('utm_medium'), 30).replace(/ /g, '');
      const camp = slug(q.get('utm_campaign'), 60), ref = slug(q.get('ref'), 30).replace(/[ .]/g, '');
      if (!src) {
        try {
          if (document.referrer) {
            const h = new URL(document.referrer).hostname.replace(/^www\./, '').toLowerCase();
            if (h && h !== loc.hostname.replace(/^www\./, '').toLowerCase()) src = corta(h, 60);
          }
        } catch (_) {}
      }
      if (q.get('gclid') || q.get('gbraid') || q.get('wbraid')) { if (!src) src = 'google'; if (!med) med = 'cpc'; }
      return { src, med, camp, ref };
    };
    // ?ref= também fica 30 dias neste aparelho (só o código e a data de validade, sem renovar a cada visita) para a indicação não se perder
    const refGuardado = () => {
      try {
        const x = JSON.parse(localStorage.getItem('gyza_ref') || 'null');
        if (x && x.r && x.e > Date.now()) return String(x.r);
        if (x) localStorage.removeItem('gyza_ref');
      } catch (_) {}
      return '';
    };
    const guardaRef = r => { try { if (r && !refGuardado()) localStorage.setItem('gyza_ref', JSON.stringify({ r, e: Date.now() + 30 * 864e5 })); } catch (_) {} };
    const origemSessao = () => {
      let o = null;
      try { o = JSON.parse(sessionStorage.getItem('gyza_o') || 'null'); } catch (_) {}
      const t = toque();
      if (!o) o = { src: t.src, med: t.med, camp: t.camp, ref: t.ref || refGuardado(), refU: '' };
      else {
        if (!o.src && t.src) { o.src = t.src; o.med = t.med; o.camp = t.camp; }
        if (!o.ref && t.ref) o.ref = t.ref;
        else if (t.ref && t.ref !== o.ref) o.refU = t.ref;
      }
      guardaRef(t.ref);
      try { sessionStorage.setItem('gyza_o', JSON.stringify(o)); } catch (_) {}
      return o;
    };
    const O = origemSessao();

    // para o pedido do formulário (js/form.js)
    window.gyzaOrigem = () => ({ p_fonte: O.src, p_fonte_canal: O.med, p_fonte_campanha: O.camp, p_afiliado: O.ref, p_afiliado_ultimo: O.refU });

    const dispositivo = () => {
      const ua = nav.userAgent || '', w = Math.min(window.innerWidth || 0, screen.width || 9999);
      if (/ipad|tablet/i.test(ua) || (/macintosh/i.test(ua) && nav.maxTouchPoints > 1)) return 'tablet';
      if (/android/i.test(ua) && !/mobile/i.test(ua)) return 'tablet';
      if (/mobi|iphone|android/i.test(ua) || w <= 767) return 'celular';
      return 'computador';
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
    const unicos = {};
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
          body: JSON.stringify({
            p_tipo: tipo, p_pagina: pagina(), p_ref: O.src, p_sessao: sessao(), p_detalhe: corta(detalhe, 60),
            p_disp: dispositivo(), p_medio: O.med, p_campanha: O.camp, p_afiliado: O.ref,
          }),
          keepalive: true,
          signal: ctrl ? ctrl.signal : undefined,
        }).catch(() => {}).then(() => clearTimeout(limite));
      } catch (_) { /* silêncio */ }
    };
    const umaVez = (tipo, detalhe) => { const k = tipo + '|' + pagina(); if (unicos[k]) return; unicos[k] = 1; envia(tipo, detalhe); };

    // o formulário (js/form.js) chama window.gyzaMetrica('form_etapa2' | 'form_enviado' | 'form_whatsapp')
    window.gyzaMetrica = (tipo, detalhe) => envia(tipo, detalhe);

    envia('visita');

    // onde o clique aconteceu: só uma palavra curta
    const posicao = el => {
      if (el.closest('.nav, .nav__cta')) return 'topo';
      if (el.closest('.mmenu')) return 'menu';
      if (el.closest('[data-proj-open], .case--open, [data-proj-close], .proj, [data-proj]')) return 'case';
      if (el.closest('footer, .footer, .rodape')) return 'rodape';
      if (el.closest('.hero, [data-hero], .abertura')) return 'abertura';
      if (el.closest('.fecho, .fecho-m')) return 'fecho';
      const sec = el.closest('section[id], section[class]');
      return sec ? corta((sec.id || sec.className.split(' ')[0] || 'pagina').toLowerCase().replace(/[^a-z0-9_-]/g, ''), 24) || 'pagina' : 'pagina';
    };

    document.addEventListener('click', e => {
      try {
        const alvo = e.target && e.target.closest ? e.target : null;
        if (!alvo) return;
        const caso = alvo.closest('[data-proj-open]');
        if (caso) { envia('abriu_case', caso.getAttribute('data-proj-open')); return; }
        const el = alvo.closest('a, button');
        if (!el) return;
        const href = el.getAttribute('href') || '';
        if (/instagram\.com/i.test(href)) { envia('clique_instagram', posicao(el)); return; }
        if (/^mailto:/i.test(href)) { envia('clique_email', posicao(el)); return; }
        if (/linkedin\.com|lnkd\.in/i.test(href)) { envia('clique_linkedin', posicao(el)); return; }
        if (/(^|\/\/)(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\b/i.test(href)) { envia('clique_whatsapp', posicao(el)); return; }
        if (/solicite sua an[aá]lise/i.test(el.textContent || '')) envia('clique_analise', posicao(el));
      } catch (_) { /* silêncio */ }
    }, true);

    // primeiro campo do formulário tocado
    document.addEventListener('focusin', e => {
      try {
        const t = e.target;
        if (t && t.closest && t.closest('[data-form]') && /^(input|textarea|select)$/i.test(t.tagName) && t.type !== 'hidden' && !t.closest('[hidden]')
            && !/(^|\s)(site|honeypot)(\s|$)/i.test(t.name || '')) umaVez('form_inicio');
      } catch (_) { /* silêncio */ }
    }, true);

    // saiu da página com o formulário começado e sem enviar: 1 vez por sessão, com a etapa
    const abandono = () => {
      try {
        if (!unicos['form_inicio|' + pagina()] || unicos['form_enviado'] || unicos['form_abandono']) return;
        const vis = document.querySelector('[data-form] [data-etapa]:not([hidden])');
        const etapa = vis ? vis.getAttribute('data-etapa') : '';
        if (etapa === '3') return;
        unicos['form_abandono'] = 1;
        envia('form_abandono_etapa', etapa);
      } catch (_) {}
    };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') abandono(); });
    window.addEventListener('pagehide', abandono);
    const gm = window.gyzaMetrica;
    window.gyzaMetrica = (tipo, detalhe) => { if (tipo === 'form_enviado') unicos['form_enviado'] = 1; gm(tipo, detalhe); };

    // rolagem 50% e 90% da página inicial
    if (ehHome()) {
      let espera = false;
      const confere = () => {
        espera = false;
        try {
          const doc = document.documentElement;
          const total = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0) - window.innerHeight;
          if (total <= 0) return;
          const p = (window.pageYOffset || doc.scrollTop || 0) / total;
          if (p >= 0.5) umaVez('rolagem_50');
          if (p >= 0.9) umaVez('rolagem_90');
          if (unicos['rolagem_90|/']) window.removeEventListener('scroll', aoRolar);
        } catch (_) {}
      };
      const aoRolar = () => { if (!espera) { espera = true; setTimeout(confere, 400); } };
      window.addEventListener('scroll', aoRolar, { passive: true });
    }
  } catch (_) { /* silêncio */ }
})();
