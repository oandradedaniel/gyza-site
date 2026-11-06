/* GYZA, movimento do site */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // o formulário fica em js/form.js (o mesmo em todas as páginas) e liga antes deste arquivo, sem depender do GSAP
  // a pirâmide 3D (three.js, gl.js e a textura) só baixa quando a seção chega perto da tela
  (() => {
    const sec = document.querySelector('#frentes');
    if (!sec) return;
    const v = (document.currentScript && new URL(document.currentScript.src).searchParams.get('v')) || '';
    const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
    let foi = false;
    const carrega = () => {
      if (foi) return; foi = true;
      if ('requestIdleCallback' in window && !carrega.ocioso) { carrega.ocioso = true; foi = false; requestIdleCallback(carrega, { timeout: 2000 }); return; }
      // integrity do three.js também pelo modulepreload (para navegador que não lê integrity no importmap)
      const l = document.createElement('link');
      l.rel = 'modulepreload'; l.href = THREE_URL; l.crossOrigin = 'anonymous';
      l.integrity = 'sha384-Qvl1RLjZOCDFOOH2bKcGnaDHMM8MVv3zVtMvhy3juQdiIOs6RgQ/7zYdM1FbpHzI';
      document.head.appendChild(l);
      import('./gl.js' + (v ? '?v=' + v : '')).catch(() => {
        // sem módulo (rede ou CSP): imagem parada no lugar
        const c = document.querySelector('.pyr-gl'); if (!c || c.dataset.poster) return;
        const img = new Image(); img.className = 'pyr-poster'; img.alt = '';
        img.src = c.clientWidth < 600 ? 'assets/img/pyr-poster-m.webp?v=5' : 'assets/img/pyr-poster.webp?v=6';
        c.after(img); c.style.display = 'none';
        const lab = document.querySelector('.pyr-labels'); if (lab) lab.style.display = 'none';
      });
    };
    if (!('IntersectionObserver' in window)) { carrega(); return; }
    // espera a página terminar de carregar (não disputa com a fonte, o CSS e a abertura) e meia tela de antecedência
    const observa = () => {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); carrega(); } }, { rootMargin: '50% 0px' });
      io.observe(sec);
    };
    if (document.readyState === 'complete') observa(); else window.addEventListener('load', observa, { once: true });
  })();
  if (!(window.gsap && window.ScrollTrigger)) {
    // sem GSAP: a página aparece parada, sem a abertura animada
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-revealed');
    const intro0 = document.querySelector('.intro');
    if (intro0) intro0.classList.add('is-done');
    try { menuCelular(); } catch (e) { /* o menu do celular fica só com os links */ }
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  // o ScrollTrigger volta o navegador para a rolagem automática; aqui a página sempre começa do topo
  if (ScrollTrigger.clearScrollMemory) ScrollTrigger.clearScrollMemory('manual');
  window.__pyr = 0;

  // a abertura sempre começa do topo; se veio com âncora (ex.: index.html#analise), guarda e rola até ela no fim da abertura
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const ALIAS = { '#orcamento': '#analise', '#cuidamos': '#frentes', '#servicos': '#frentes', '#sinais': '#frentes' };
  const hashInicial = ALIAS[location.hash] || location.hash;
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  // recarregou com um projeto aberto: limpa o estado do projeto e começa do topo, como a abertura
  const vinhaDeProjeto = !!(history.state && history.state.proj);
  if (vinhaDeProjeto) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  if (vinhaDeProjeto && !hashInicial) window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });
  function irParaHash() {
    if (!hashInicial) return;
    let alvo = null;
    try { alvo = document.querySelector(hashInicial); } catch (e) { alvo = null; }
    history.replaceState(null, '', location.pathname + location.search + hashInicial);
    if (!alvo) return;
    // chegou com âncora (ex.: Cases vindo de outra página): vai direto para a seção, sem a rolagem desde o topo
    requestAnimationFrame(() => alvo.scrollIntoView({ behavior: 'instant', block: 'start' }));
  }

  /* ---------- quebra de texto ---------- */
  $$('[data-lines]').forEach(el => {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    // as linhas ficam separadas por espaço: o leitor de tela e o Google leem as palavras sem colar
    el.innerHTML = parts.map(p => `<span class="line"><span>${p.trim()}</span></span>`).join(' ');
  });
  $$('[data-words]').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  });
  // abertura: o texto de apoio entra palavra por palavra, com as palavras-chave acesas
  $$('[data-hl]').forEach(el => {
    const parte = (t, hl) => t.split(/(\s+)/).map(w => (!w || /^\s+$/.test(w)) ? w : `<span class="hw${hl ? ' is-hl' : ''}">${w}</span>`).join('');
    el.innerHTML = [...el.childNodes].map(n => parte(n.textContent, n.nodeType !== 3)).join('');
  });

  /* ---------- abertura ---------- */
  const intro = $('.intro');
  const svg = $('.intro__mark');
  const mark = $('.mark');
  const faixa = $('.revela__faixa');
  const heroMark = $('.hero__mark');
  const isPhone = window.matchMedia('(max-width: 900px)').matches;

  function endIntro() {
    gsap.set(heroMark, { autoAlpha: 1 });
    intro.classList.add('is-done');
    document.body.classList.remove('is-loading');
    ScrollTrigger.refresh();
    irParaHash();
  }

  function heroIn(tl, at) {
    tl.add(() => document.body.classList.add('is-revealed'), at)
      .from('.hero__halo', { opacity: 0, scale: isPhone ? 1 : 1.08, duration: 2, ease: 'power2.out' }, at - 0.4)
      .from('.hero__content .line > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.07 }, at + 0.1)
      .from('.hero__lead .hw', { opacity: 0, y: 10, filter: 'blur(6px)', duration: 0.7, ease: 'power3.out', stagger: 0.04 }, at + 0.55);
  }

  function runIntro() {
    // veio de uma página interna para uma seção da home (ex.: /#trabalhos): não reabre o site, só mostra a seção
    if (hashInicial) {
      try { sessionStorage.setItem('gyza-abertura', '1'); } catch (e) { /* sem sessão: segue igual */ }
      document.body.classList.add('is-revealed');
      endIntro();
      return;
    }
    gsap.set(heroMark, { autoAlpha: 0 });

    if (reduce) {
      endIntro();
      return;
    }
    // já viu a abertura nesta sessão: pula a montagem do logo e o título entra na hora
    let visto = false;
    try { visto = sessionStorage.getItem('gyza-abertura') === '1'; sessionStorage.setItem('gyza-abertura', '1'); } catch (e) { visto = false; }
    if (visto) {
      endIntro();
      const t0 = gsap.timeline();
      t0.fromTo('.nav', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0);
      heroIn(t0, 0.15);
      return;
    }
    // celular: a mesma abertura, mais curta (o título chega perto de 1,3 s)
    const RAPIDO = isPhone ? 2.1 : 1;

    const W = window.innerWidth, H = window.innerHeight;
    const w0 = svg.getBoundingClientRect().width;
    const h0 = w0 * 200.45 / 750;
    gsap.set(svg, { x: (W - w0) / 2, y: (H - h0) / 2 });
    gsap.set(faixa, { x: -40 });   // a máscara antiga do nome fica aberta: o logo inteiro entra junto

    const tl = gsap.timeline();
    // o GYZA entra inteiro: cada letra sobe de dentro de uma máscara, uma depois da outra (o A é uma letra só, sem destaque na ponta)
    tl.from('.mark__letra', { yPercent: 0, y: 214, duration: 1.15, ease: 'expo.out', stagger: 0.09 }, 0.15)
      // o logo desce e vira o nome gigante da base da tela
      .add(() => {
        const t = heroMark.getBoundingClientRect();
        // só transform (sem mudar a largura): roda liso no celular
        gsap.to(svg, { x: t.left, y: t.top, scale: t.width / w0, transformOrigin: '0 0', duration: 1.25 / RAPIDO, ease: 'expo.inOut', force3D: true, onComplete: endIntro });
      }, 1.75)
      .fromTo('.nav', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 2.35);
    heroIn(tl, 2.25);
    tl.timeScale(RAPIDO);
  }

  /* ---------- abertura: rolagem ---------- */
  function heroScroll() {
    const st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__content', { y: -90, opacity: 0, ease: 'none', scrollTrigger: { ...st, end: '60% top' } });
    gsap.to('.hero__mark', { yPercent: 18, ease: 'none', scrollTrigger: st });
  }

  /* ---------- botão do WhatsApp da análise: o brilho do vidro segue o mouse e a rolagem (só quando está na tela) ---------- */
  function waVidro() {
    const wa = $('.orcamento__wa');
    if (!wa || reduce) return;
    let alvoX = 50, alvoY = 0, x = 50, y = 0, rolou = 0, vivo = false, raf = 0;
    addEventListener('pointermove', e => {
      if (!vivo) return;
      const r = wa.getBoundingClientRect();
      alvoX = Math.max(-10, Math.min(110, ((e.clientX - r.left) / r.width) * 100));
      alvoY = Math.max(-40, Math.min(140, ((e.clientY - r.top) / r.height) * 100));
    }, { passive: true });
    addEventListener('scroll', () => { rolou = 1; }, { passive: true });
    const passo = () => {
      if (rolou) { alvoX = 50 + Math.sin(scrollY / 160) * 45; rolou = 0; }
      x += (alvoX - x) * 0.12; y += (alvoY - y) * 0.12;
      wa.style.setProperty('--gx', x.toFixed(1) + '%');
      wa.style.setProperty('--gy', y.toFixed(1) + '%');
      raf = vivo ? requestAnimationFrame(passo) : 0;
    };
    new IntersectionObserver(([e]) => { vivo = e.isIntersecting; if (vivo && !raf) raf = requestAnimationFrame(passo); }).observe(wa);
  }

  /* ---------- menu: tema e esconder ---------- */
  function navTheme() {
    const nav = $('[data-nav]');
    const cta = $('.cta-baixo');
    // vidro do botão de baixo: o reflexo vai para o lado do mouse e desliza com a rolagem
    if (cta && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let alvoX = 50, alvoY = 0, x = 50, y = 0, rolou = 0;
      addEventListener('pointermove', e => {
        const r = cta.getBoundingClientRect();
        alvoX = Math.max(-10, Math.min(110, ((e.clientX - r.left) / r.width) * 100));
        alvoY = Math.max(-40, Math.min(140, ((e.clientY - r.top) / r.height) * 100));
      }, { passive: true });
      addEventListener('scroll', () => { rolou = 1; }, { passive: true });
      const passo = () => {
        if (rolou) { alvoX = 50 + Math.sin(scrollY / 180) * 45; rolou = 0; }
        x += (alvoX - x) * 0.12; y += (alvoY - y) * 0.12;
        cta.parentElement.style.setProperty('--gx', x.toFixed(1) + '%');
        cta.parentElement.style.setProperty('--gy', y.toFixed(1) + '%');
        requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    }
    // botão de baixo: compacta ao descer, expande ao subir ou ao parar no topo
    if (cta) {
      let ult = 0;
      addEventListener('scroll', () => {
        const y = scrollY;
        if (y > innerHeight * 0.5) cta.classList.toggle('is-compacto', y > ult + 2 ? true : y < ult - 2 ? false : cta.classList.contains('is-compacto'));
        else cta.classList.remove('is-compacto');
        ult = y;
      }, { passive: true });
    }
    // o botão de baixo some quando o formulário de análise está na tela (a abertura não tem mais botão próprio)
    // e não volta no rodapé, que já tem o botão igual: desligado do formulário até o fim da página
    if (cta) {
      let noForm = false;
      const apl = () => cta.classList.toggle('is-off', noForm);
      ScrollTrigger.create({ trigger: '#analise', start: 'top 70%', onEnter: () => { noForm = true; apl(); }, onLeaveBack: () => { noForm = false; apl(); } });
    }
    // o botão de baixo segue o tema da seção que está embaixo dele
    if (cta) $$('[data-theme]').forEach(sec => {
      ScrollTrigger.create({
        trigger: sec, start: 'top bottom-=50', end: 'bottom bottom-=50',
        onToggle: s => { if (s.isActive) cta.classList.toggle('is-light', sec.dataset.theme === 'light'); },
      });
    });
    $$('[data-theme]').forEach(sec => {
      ScrollTrigger.create({
        trigger: sec, start: 'top 48px', end: 'bottom 48px',
        onToggle: s => { if (s.isActive) nav.classList.toggle('is-light', sec.dataset.theme === 'light'); },
      });
    });
    let last = 0;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: s => {
        const y = s.scroll();
        // topo fixo e completo o tempo todo, como no site oficial (pedido do Vitor)
        nav.classList.toggle('is-scrolled', y > window.innerHeight * 0.6);
        last = y;
      },
    });
  }

  /* ---------- linhas e palavras ---------- */
  function reveals() {
    if (reduce) return;   // sem movimento: o texto já aparece no lugar
    // seção da pirâmide: o título de vidro entra em 3D, girando de leve no eixo X e assentando (Vitor, 06/11/2026)
    const fr = $('.frentes');
    if (fr) {
      gsap.from($$('.frentes__title .line > span'), {
        rotationX: -72, yPercent: 40, opacity: 0, transformOrigin: '50% 100% -20px', duration: 1.4, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: fr, start: 'top 70%', once: true },
      });
    }
    $$('[data-lines]').forEach(el => {
      if (el.closest('.hero') || el.closest('.frentes')) return;
      gsap.from($$('.line > span', el), {
        yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });
    $$('[data-words]').forEach(el => {
      gsap.to($$('.w', el), {
        opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: true },
      });
    });
  }

  /* ---------- manifesto ---------- */
  function manifesto() {
    gsap.fromTo('.manifesto__a', { rotation: -6, yPercent: 18 }, {
      rotation: 4, yPercent: -8, ease: 'none',
      scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  /* ---------- o que fazemos: a linha acende no meio da tela ---------- */
  /* jornada: cada passo acende ao chegar no meio da tela e o trecho azul da trilha avança com a rolagem */
  function servicos() {
    const passos = $$('[data-jornada] .passo');
    if (!passos.length) return;
    if (reduce) {
      passos.forEach(p => { p.classList.add('is-on'); p.style.setProperty('--p', 1); });
      return;
    }
    const topoPonto = p => parseFloat(getComputedStyle(p.closest('.jornada')).getPropertyValue('--topo-ponto')) || 0;
    passos.forEach((p, i) => {
      // acende quando o ponto do passo cruza o meio da tela; o último apaga o "momento" quando sai
      ScrollTrigger.create({
        trigger: p, start: () => `top+=${topoPonto(p)} 50%`, end: () => `bottom+=${topoPonto(p)} 50%`, invalidateOnRefresh: true,
        onToggle: s => p.classList.toggle('is-active', s.isActive),
        onEnter: () => p.classList.add('is-on'),
        onLeaveBack: () => p.classList.remove('is-on'),
      });
      // o trecho da trilha até o próximo ponto enche junto com a rolagem
      if (i < passos.length - 1) ScrollTrigger.create({
        trigger: p, start: () => `top+=${topoPonto(p)} 50%`, end: () => `bottom+=${topoPonto(p)} 50%`, scrub: true, invalidateOnRefresh: true,
        onUpdate: s => p.style.setProperty('--p', s.progress.toFixed(3)),
      });
    });
  }

  /* ---------- 360: a pirâmide gira sozinha, sem parar, e gira com o dedo ou o mouse (Vitor, 06/11/2026) ----------
     sem prender a rolagem: a seção tem uma tela e a página passa direto.
     Sozinha: giro contínuo e constante, uma volta de 360 graus em 13 s (cada camada de 90 graus em uns 3,25 s, sem parar entre elas);
     a camada acesa, o nome e a frase trocam quando a face seguinte fica de frente.
     Ao encostar (dedo ou mouse) o giro automático para na hora e a pirâmide segue o arrasto 1:1, para os dois lados.
     Ao soltar: inércia curta pela velocidade do gesto, assenta na camada mais próxima com mola sem quique e, 2,5 s depois,
     volta a acelerar devagar (1 s) até a velocidade normal, no mesmo sentido de sempre.
     Já gira uma tela antes de a seção chegar e segue girando durante a rolagem; só para com o arrasto, com a aba escondida ou sem movimento. Setas do teclado trocam a camada (com o foco aqui o giro sozinho para).
     O gl.js lê window.__pyrGiro (giro contínuo, 1 = 90 graus) e window.__pyrCamada (camada acesa). */
  function frentes() {
    const panels = $$('.frente');
    const N = panels.length;
    if (!N) return;
    const sec = $('.frentes'), area = $('.pyr-wrap'), lista = $('.frentes__panels'), dica = $('.pyr-dica');
    const VEL = 4 / 16;               // camadas por segundo: 360 graus em 16 s (um pouco mais lenta, Vitor 06/11/2026)
    const ESPERA = 2500, RAMPA = 1;   // parada depois de soltar (ms) e aceleração de volta (s)
    const K = 34, C = 2 * Math.sqrt(K);   // mola criticamente amortecida: assenta sem sobra
    const mod = (n, m) => ((n % m) + m) % m;
    let cur = 0, naTela = false, focada = false;
    // modo: 'auto' (girando sozinha), 'mao' (arrasto), 'assenta' (mola até a camada), 'parada' (esperando para voltar)
    let modo = 'auto', pos = 0, vel = 0, alvo = 0, rampa = 1, voltaEm = 0, raf = 0, ultimo = 0;
    window.__pyrCamada = 0; window.__pyrGiro = 0;
    const show = i => {
      if (i === cur) return;
      cur = i;
      panels.forEach((p, k) => {
        if (k === i) return;
        gsap.killTweensOf(p);
        p.classList.remove('is-on');
        gsap.to(p, { opacity: 0, duration: 0.3, ease: 'power2.out' });
      });
      gsap.killTweensOf(panels[i]);
      panels[i].classList.add('is-on');
      gsap.set(panels[i], { opacity: 1 });
      // a frase é a protagonista: o nome e a frase sobem de dentro de uma máscara, com fade, na curva expo do site
      gsap.fromTo($$('.frente__nome, .frente__txt', panels[i]),
        { opacity: 0, yPercent: 40, clipPath: 'inset(0 0 100% 0)' },
        { opacity: 1, yPercent: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.75, delay: 0.1, stagger: 0.08, ease: 'expo.out', clearProps: 'clipPath' });
    };
    // publica o giro para a cena; a camada da vez é a face que está mais de frente
    const titulo = $('.frentes__title');
    const publica = () => {
      window.__pyrGiro = pos;
      if (titulo) {
        const a = pos * Math.PI / 2;
        titulo.style.setProperty('--incl', `${(Math.sin(a) * 7).toFixed(2)}deg`);
        titulo.style.setProperty('--luz', `${(mod(pos, 4) / 4 * 200 - 50).toFixed(1)}%`);
      }
      const c = mod(Math.round(pos), N);
      window.__pyrCamada = c;
      show(c);
    };
    const anda = () => naTela && !document.hidden;
    const quadro = t => {
      raf = 0;
      if (!anda()) { ultimo = 0; return; }
      const dt = ultimo ? Math.min(0.05, (t - ultimo) / 1000) : 1 / 60;
      ultimo = t;
      if (modo === 'auto') {
        // volta acelerando devagar (ease-in) e depois segue constante
        if (rampa < 1) rampa = Math.min(1, rampa + dt / RAMPA);
        pos += VEL * rampa * rampa * dt;
      } else if (modo === 'assenta') {
        const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
        for (let j = 0; j < n; j++) { vel += (K * (alvo - pos) - C * vel) * h; pos += vel * h; }
        if (Math.abs(alvo - pos) < 1e-4 && Math.abs(vel) < 1e-3) { pos = alvo; vel = 0; modo = 'parada'; voltaEm = t + ESPERA; }
      } else if (modo === 'parada') {
        if (!focada && t >= voltaEm) { modo = 'auto'; rampa = 0; }
      }
      publica();
      raf = requestAnimationFrame(quadro);
    };
    const liga = () => { if (!raf && anda()) { ultimo = 0; raf = requestAnimationFrame(quadro); } };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { naTela = e.isIntersecting; liga(); }, { rootMargin: '100% 0px' }).observe(sec);   // uma tela de antecedência: já chega girando
    } else { naTela = true; liga(); }
    document.addEventListener('visibilitychange', liga);
    // assenta numa camada partindo com a velocidade dada, sem passar do alvo
    const assenta = (destino, v) => {
      alvo = destino;
      const x = pos - alvo, w = Math.sqrt(K);
      vel = (x !== 0 && Math.sign(v) === -Math.sign(x)) ? Math.sign(v) * Math.min(Math.abs(v), w * Math.abs(x)) : 0;
      modo = 'assenta'; liga();
    };
    if (!area) return;
    // só com movimento a pirâmide vira controle (sem movimento as camadas ficam em lista)
    area.tabIndex = 0;
    area.setAttribute('role', 'group');
    area.setAttribute('aria-label', 'Pirâmide das camadas: arraste ou use as setas para trocar de camada');

    // a dica some na primeira interação
    const usou = () => { if (dica) dica.classList.add('is-off'); };

    // arrasto com Pointer Events; no toque só assume o gesto quando ele é claramente horizontal (a rolagem vertical segue com o navegador)
    let id = null, toque = false, x0 = 0, y0 = 0, p0 = 0, lx = 0, lt = 0, vx = 0;
    const pxPorCamada = () => Math.max(140, Math.min(320, area.clientWidth * 0.36));
    const pega = e => {
      modo = 'mao'; vel = 0; usou();
      area.classList.add('is-drag');
      try { area.setPointerCapture(e.pointerId); } catch (_) {}
      p0 = pos; x0 = lx = e.clientX; lt = e.timeStamp; vx = 0;
      liga();
    };
    area.addEventListener('pointerdown', e => {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      id = e.pointerId; toque = e.pointerType !== 'mouse';
      x0 = lx = e.clientX; y0 = e.clientY; lt = e.timeStamp; vx = 0;
      // mouse: encostou, o giro para na hora; toque: espera ver se o gesto é horizontal (pode ser só a rolagem da página)
      if (!toque) { e.preventDefault(); pega(e); }
    });
    area.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      if (modo !== 'mao') {
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.2) { id = null; return; }   // vertical: é rolagem, fica com o navegador
        pega(e);
      }
      // segue o dedo 1:1: arrastar para a direita leva a face da frente para a direita
      pos = p0 - (e.clientX - x0) / pxPorCamada();
      const dt = Math.max(1, e.timeStamp - lt);
      const v = -(e.clientX - lx) / pxPorCamada() / (dt / 1000);
      vx = vx * 0.5 + v * 0.5;
      lx = e.clientX; lt = e.timeStamp;
    });
    const solta = e => {
      if (e.pointerId !== id) return;
      id = null;
      if (modo !== 'mao') return;
      area.classList.remove('is-drag');
      // parado há mais de 80 ms: sem inércia; senão uma inércia curta pela velocidade do gesto
      const v = e.timeStamp - lt > 80 ? 0 : Math.max(-5, Math.min(5, vx));
      const destino = Math.round(pos + v * 0.18);
      assenta(Math.max(Math.round(pos) - 1, Math.min(Math.round(pos) + 1, destino)), v);
    };
    area.addEventListener('pointerup', solta);
    area.addEventListener('pointercancel', solta);
    // a captura implícita do toque fica no canvas e passa para a área ao pegar o gesto: só conta quando a própria área perde a captura
    area.addEventListener('lostpointercapture', e => { if (e.target === area) solta(e); });

    // teclado: setas trocam a camada; com o foco aqui o giro sozinho para e o nome é anunciado
    area.addEventListener('focus', () => { if (!area.matches(':focus-visible')) return; focada = true; if (lista) lista.setAttribute('aria-live', 'polite'); if (modo === 'auto') assenta(Math.round(pos), 0); });
    area.addEventListener('blur', () => { focada = false; if (lista) lista.setAttribute('aria-live', 'off'); });
    area.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault(); usou();
      const base = modo === 'assenta' ? alvo : Math.round(pos);
      assenta(base + (e.key === 'ArrowRight' ? 1 : -1), 0);
    });
  }

  /* ---------- método: trilho horizontal ---------- */
  function metodo() {
    const track = $('.metodo__track');
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const etapas = $$('.etapa', track);
    const base = $('.trilha__base'), fill = $('.trilha__fill');
    // a trilha corre reta pelo meio dos cards, com um ponto em cada espaço entre eles
    const svg = $('.trilha');
    let len = 0, nodes = [];
    const draw = () => {
      const y = etapas[0].offsetTop + etapas[0].offsetHeight / 2;
      const x0 = etapas[0].offsetLeft + etapas[0].offsetWidth / 2;
      const last = etapas[etapas.length - 1];
      const x1 = last.offsetLeft + last.offsetWidth / 2;
      const d = `M ${x0} ${y} L ${x1} ${y}`;
      base.setAttribute('d', d); fill.setAttribute('d', d);
      len = x1 - x0;
      fill.style.strokeDasharray = len;
      nodes.forEach(n => n.remove());
      nodes = etapas.slice(1).map(e => {
        const prev = e.previousElementSibling;
        const cx = (prev.offsetLeft + prev.offsetWidth + e.offsetLeft) / 2;
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', cx); c.setAttribute('cy', y); c.setAttribute('r', 6);
        c.dataset.at = (cx - x0) / len;
        svg.appendChild(c);
        return c;
      });
    };
    draw();
    ScrollTrigger.addEventListener('refreshInit', draw);
    gsap.timeline({
      scrollTrigger: {
        trigger: '.metodo', start: 'top top', end: () => '+=' + (dist() + window.innerHeight * 0.3),
        pin: true, scrub: true, invalidateOnRefresh: true,
      },
    })
      .to(track, { x: () => -dist(), ease: 'none' }, 0)
      .fromTo(fill, { strokeDashoffset: () => len }, {
        strokeDashoffset: 0, ease: 'none',
        onUpdate() {
          const p = this.progress();
          nodes.forEach(n => n.classList.toggle('is-on', p >= +n.dataset.at));
        },
      }, 0);
  }

  /* ---------- método no celular: trilha vertical entre os cards ---------- */
  function metodoMobile() {
    const track = $('.metodo__track');
    const etapas = $$('.etapa', track);
    const svg = $('.trilha'), base = $('.trilha__base'), fill = $('.trilha__fill');
    let len = 0, nodes = [];
    const draw = () => {
      const x = etapas[0].offsetLeft + etapas[0].offsetWidth / 2;
      const last = etapas[etapas.length - 1];
      const y0 = etapas[0].offsetTop + etapas[0].offsetHeight / 2;
      const y1 = last.offsetTop + last.offsetHeight / 2;
      const d = `M ${x} ${y0} L ${x} ${y1}`;
      base.setAttribute('d', d); fill.setAttribute('d', d);
      len = y1 - y0;
      fill.style.strokeDasharray = len;
      fill.style.strokeDashoffset = len;
      nodes.forEach(n => n.remove());
      nodes = etapas.slice(1).map(e => {
        const prev = e.previousElementSibling;
        const cy = (prev.offsetTop + prev.offsetHeight + e.offsetTop) / 2;
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', x); c.setAttribute('cy', cy); c.setAttribute('r', 6);
        c.dataset.at = (cy - y0) / len;
        svg.appendChild(c);
        return c;
      });
    };
    draw();
    ScrollTrigger.addEventListener('refreshInit', draw);
    ScrollTrigger.create({
      trigger: track, start: 'top 60%', end: 'bottom 60%', scrub: true,
      onUpdate: s => {
        fill.style.strokeDashoffset = len * (1 - s.progress);
        nodes.forEach(n => n.classList.toggle('is-on', s.progress >= +n.dataset.at));
      },
    });
  }

  /* ---------- trilhos laterais: cases e equipe (arrastar, setas, e passagem contínua sem emenda) ---------- */
  // componente único dos dois trilhos: troque só o seletor dos itens e o prefixo dos atributos (contador, setas, pausa)
  // dir: 1 = o conteúdo anda para a esquerda (cases); -1 = anda para a direita (equipe)
  function trilho(track, itemSel, attr, dir = 1) {
    // trilho escondido (ex.: a seção da equipe com hidden) não tem largura: não monta, senão as cópias viram centenas
    if (!track || !track.offsetWidth || track.closest('[hidden]')) return;
    const items = $$(itemSel, track);
    const N = items.length;
    const n = $(`[data-${attr}-n]`);
    const prev = $(`[data-${attr}-prev]`), next = $(`[data-${attr}-next]`);
    const loop = !reduce && N > 1;
    // cópias da lista no fim (aria-hidden, fora da ordem de foco): o trilho gira sem emenda
    if (loop) {
      const last = items[N - 1];
      const w0 = last.offsetLeft + last.offsetWidth - items[0].offsetLeft;
      const copias = Math.min(4, Math.max(1, Math.ceil(Math.max(innerWidth, screen.width || 0) / Math.max(1, w0))));
      for (let c = 0; c < copias; c++) items.forEach(it => {
        const k = it.cloneNode(true);
        k.setAttribute('aria-hidden', 'true');
        k.removeAttribute('id');
        $$('button, a, input, [tabindex]', k).forEach(b => { b.tabIndex = -1; });
        track.appendChild(k);
      });
    }
    const all = $$(itemSel, track);
    const left = i => all[i].offsetLeft - all[0].offsetLeft;
    const at = () => {
      const x = track.scrollLeft;
      let best = 0;
      all.forEach((c, i) => { if (Math.abs(left(i) - x) < Math.abs(left(best) - x)) best = i; });
      return best;
    };
    let expect = -1, lastScroll = 0, hold = 0, hover = false, vis = false, focus = false, parado = false, down = false;
    const segura = (ms = 4000) => { hold = performance.now() + ms; };
    // passou da primeira cópia: volta uma volta inteira, sem mudar o que aparece na tela
    const wrap = () => {
      if (!loop) return;
      const w = left(N);
      if (track.scrollLeft >= w) { track.scrollLeft -= w; expect = track.scrollLeft; }
      // andando para a direita: chegou ao começo, pula uma volta para a frente (mesma imagem na tela)
      else if (dir < 0 && track.scrollLeft <= 1) { track.scrollLeft += w; expect = track.scrollLeft; }
    };
    const go = i => {
      segura();
      lastScroll = performance.now();   // não dar a volta no meio da rolagem suave
      if (loop && i < 0) { track.scrollLeft += left(N); expect = track.scrollLeft; i += N; }
      track.scrollTo({ left: left(Math.max(0, Math.min(all.length - 1, i))), behavior: 'smooth' });
    };
    const sync = () => {
      if (n) n.textContent = String(at() % N + 1).padStart(2, '0');
      if (!loop && prev && next) {
        prev.disabled = track.scrollLeft < 4;
        next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 4;
      }
    };
    if (prev) prev.addEventListener('click', () => go(at() - 1));
    if (next) next.addEventListener('click', () => go(at() + 1));
    track.addEventListener('scroll', () => {
      sync();
      if (Math.abs(track.scrollLeft - expect) > 1) lastScroll = performance.now();
    }, { passive: true });
    sync();
    // teclado: setas esquerda e direita passam de card em card quando o trilho está em foco
    track.addEventListener('keydown', e => {
      if (e.target !== track || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      e.preventDefault(); go(at() + (e.key === 'ArrowRight' ? 1 : -1));
    });

    // desliza sozinho, bem devagar (px por segundo); para quando a pessoa encosta e volta depois
    if (loop) {
      const step = 1 / (window.devicePixelRatio || 1);
      // cases mais rápidos (Vitor, 06/11/2026): 75 px/s no celular e 120 no computador
      const speed = attr === 'cases' ? (innerWidth < 600 ? 75 : 120) : (innerWidth < 600 ? 20 : 32);
      let acc = 0, t0 = performance.now();
      // no sentido inverso começa no fim da primeira cópia, para ter para onde andar
      if (dir < 0) { track.scrollLeft = left(N); expect = track.scrollLeft; }
      // já anda antes de a seção aparecer (uma tela de antecedência): quem chega nos cases encontra o trilho passando
      new IntersectionObserver(([e]) => { vis = e.isIntersecting; }, { rootMargin: '100% 0px' }).observe(track);
      // a passagem continua com o mouse em cima (pedido do Vitor); pausa só ao arrastar ou tocar, com projeto aberto, aba escondida e reduced-motion

      // só o foco de teclado pausa; o foco devolvido ao card depois de fechar um projeto não trava a passagem
      track.addEventListener('focusin', e => { focus = e.target.matches(':focus-visible'); });
      track.addEventListener('focusout', () => { focus = false; segura(1200); });
      track.addEventListener('touchstart', () => { track.classList.remove('is-auto'); segura(); }, { passive: true });
      // botão de pausa (WCAG 2.2.2): quem pausa decide; a passagem só volta pelo mesmo botão
      const pausa = $(`[data-${attr}-pausa]`);
      if (pausa) {
        const quem = attr === 'equipe' ? 'sócios' : 'cases';
        pausa.hidden = false;
        pausa.addEventListener('click', () => {
          parado = !parado;
          pausa.setAttribute('aria-pressed', String(parado));
          pausa.setAttribute('aria-label', (parado ? 'Retomar' : 'Pausar') + ` a passagem automática dos ${quem}`);
          if (!parado) segura(600);
        });
      }
      const tick = now => {
        const dt = Math.min(64, now - t0); t0 = now;
        const b = document.body.classList;
        const live = vis && !hover && !focus && !parado && !down && !document.hidden && now > hold && now - lastScroll > 1200
          && !b.contains('is-proj') && !b.contains('is-loading');
        if (live) {
          track.classList.add('is-auto');
          acc += speed * dt / 1000;
          if (acc >= step) {
            const px = Math.floor(acc / step) * step;
            acc -= px;
            track.scrollLeft += dir * px;
            expect = track.scrollLeft;
            wrap();
          }
        } else if (now - lastScroll > 200) wrap();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    // mouse: arrastar para o lado, com um empurrão no fim; um arrasto não conta como clique
    let moved = 0, x0 = 0, s0 = 0, i0 = 0;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; x0 = e.clientX; s0 = track.scrollLeft; i0 = at();
    });
    window.addEventListener('pointermove', e => {
      if (!down) return;
      moved = Math.max(moved, Math.abs(e.clientX - x0));
      if (moved > 6) { track.classList.add('is-drag'); track.scrollLeft = s0 - (e.clientX - x0); }
    });
    window.addEventListener('pointerup', e => {
      if (!down) return;
      down = false;
      if (!track.classList.contains('is-drag')) return;
      track.classList.remove('is-drag');
      const dx = e.clientX - x0;
      go(Math.abs(dx) > 60 ? i0 + (dx < 0 ? 1 : -1) : i0);
    });
    track.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
  }

  /* ---------- projeto: o card cresce até virar uma página ---------- */
  function projetos() {
    let open = null, card = null;
    const clipOf = el => {
      const r = el.getBoundingClientRect();
      return `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 28px)`;
    };
    // enquanto o projeto está aberto, o resto da página fica inerte (sem foco nem leitor de tela)
    const isolar = on => {
      Array.from(document.body.children).forEach(el => {
        if (el.classList.contains('proj') || el.tagName === 'SCRIPT') return;
        el.toggleAttribute('inert', on);
      });
    };
    const abrir = (c, push = true) => {
      const proj = $(`#proj-${c.dataset.projOpen}`);
      if (!proj || open) return;
      open = proj; card = c;
      const media = $('.case__media', c);
      proj.hidden = false;
      $('[data-proj-scroll]', proj).scrollTop = 0;
      document.body.classList.add('is-proj');
      isolar(true);
      if (push) history.pushState({ proj: c.dataset.projOpen }, '');
      if (reduce) return proj.focus();
      gsap.timeline()
        .fromTo(proj, { clipPath: clipOf(media) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1.05, ease: 'expo.inOut', clearProps: 'clipPath' })
        .fromTo($('.proj__cover img', proj), { scale: 1.12 }, { scale: 1, duration: 1.4, ease: 'expo.out' }, 0.1)
        .fromTo([$('.proj__close', proj), ...$$('.proj__head > *', proj)], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.06 }, 0.75)
        .add(() => proj.focus({ preventScroll: true }));
    };
    const fechar = (pop = false) => {
      if (!open) return;
      const proj = open, media = $('.case__media', card);
      open = null;
      const done = () => {
        proj.hidden = true;
        gsap.set(proj, { clearProps: 'all' });
        document.body.classList.remove('is-proj');
        isolar(false);
        // devolve o foco ao card que abriu o projeto (sem rolar a página)
        const volta = $('.case__ver', card) || card;
        if (volta) volta.focus({ preventScroll: true });
      };
      if (!pop && history.state?.proj) history.back();
      if (reduce) return done();
      const sc = $('[data-proj-scroll]', proj);
      if (sc.scrollTop > innerHeight * 0.5) {
        // já desceu bastante: some com um fade, sem voltar ao card
        gsap.to(proj, { opacity: 0, duration: 0.45, ease: 'power2.out', onComplete: done });
      } else {
        gsap.to(proj, { clipPath: clipOf(media), duration: 0.85, ease: 'expo.inOut', onComplete: done });
      }
    };
    $$('[data-proj-open]').forEach(c => c.addEventListener('click', () => abrir(c)));
    $$('[data-proj-close]').forEach(b => b.addEventListener('click', e => {
      const href = b.getAttribute('href');
      if (href) {
        // botão de orçamento: fecha e desce até o formulário
        e.preventDefault();
        fechar();
        setTimeout(() => $(href).scrollIntoView({ behavior: 'smooth' }), 950);
      } else fechar();
    }));
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') return fechar();
      if (e.key !== 'Tab' || !open) return;
      // foco preso dentro do projeto: o X é o primeiro item
      const f = $$('button, a[href]', open).filter(el => el.getClientRects().length);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
    });
    window.addEventListener('popstate', () => fechar(true));
  }

  /* ---------- rodapé ---------- */
  function footer() {
    gsap.from('.footer__mark', {
      yPercent: 40, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top 80%', end: 'bottom bottom', scrub: true },
    });
  }

  /* ---------- botões magnéticos e cursor ---------- */
  function pointer() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    const cur = $('.cursor');
    const cx = gsap.quickTo(cur, 'x', { duration: 0.2, ease: 'power3' });
    const cy = gsap.quickTo(cur, 'y', { duration: 0.2, ease: 'power3' });
    // o pontinho que acompanha o mouse some na análise e nos campos (ali ele parecia um elemento solto ao lado dos rótulos)
    window.addEventListener('mousemove', e => { cx(e.clientX); cy(e.clientY); cur.style.opacity = e.target.closest && e.target.closest('#analise, form, input, label') ? 0 : 1; });
    $$('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => cur.classList.add('is-big'));
      el.addEventListener('mouseleave', () => cur.classList.remove('is-big'));
    });
    $$('[data-magnetic]').forEach(el => {
      const inner = $('span', el);
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: dx * 0.25, y: dy * 0.35, duration: 0.5, ease: 'power3' });
        gsap.to(inner, { x: dx * 0.12, y: dy * 0.18, duration: 0.5, ease: 'power3' });
      });
      el.addEventListener('mouseleave', () => gsap.to([el, inner], { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, .4)' }));
    });
  }

  /* ---------- cases: círculo azul com a seta segue o mouse sobre a imagem ---------- */
  function caseCursor() {
    const track = $('[data-cases]');
    if (!track || reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = document.createElement('div');
    el.className = 'case-cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
    document.body.appendChild(el);
    document.documentElement.classList.add('tem-case-cursor');
    const cx = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3' });
    const cy = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3' });
    let on = false;
    const liga = v => { if (v === on) return; on = v; el.classList.toggle('is-on', v); document.body.classList.toggle('no-case', v); };
    // delegação: vale também para as cópias que o trilho cria para a passagem contínua
    track.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      cx(e.clientX); cy(e.clientY);
      liga(!!e.target.closest('.case--open .case__media') && !track.classList.contains('is-drag'));
    });
    track.addEventListener('pointerleave', () => liga(false));
    window.addEventListener('scroll', () => liga(false), { passive: true });
  }

  /* ---------- início ---------- */
  /* ---------- celular: menu de 3 pontinhos ---------- */
  function menuCelular() {
    const botao = $('[data-menu-botao]'), menu = $('[data-menu]');
    if (!botao || !menu) return;
    const raiz = document.documentElement;
    const focaveis = () => [botao, ...$$('a, button', menu).filter(el => el.offsetParent !== null)];
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
    // link: fecha e deixa o navegador rolar até a seção
    $$('a', menu).forEach(a => a.addEventListener('click', () => fechar(false)));
    // fundo: toque fora de link fecha
    menu.addEventListener('click', e => { if (!e.target.closest('a, button')) fechar(); });
    document.addEventListener('keydown', e => {
      if (!aberto()) return;
      if (e.key === 'Escape') { e.preventDefault(); fechar(); return; }
      if (e.key !== 'Tab') return;
      // foco preso entre o X e os links do menu
      const f = focaveis(), i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
    });
    // passou para o computador com o menu aberto: fecha
    matchMedia('(min-width: 901px)').addEventListener('change', m => { if (m.matches && aberto()) fechar(false); });
  }

  /* ---------- Quem somos: abre o texto do sócio no painel de vidro e destaca a frente escolhida ----------
     A seção fica escondida até as fotos reais chegarem; /?socios mostra a prévia. */
  function socios() {
    const sec = $('.socios');
    if (!sec) return;
    if (/[?&]socios\b/.test(location.search)) sec.hidden = false;
    if (sec.hidden) return;
    const cards = $$('.socio', sec), grid = $('.socios__grid', sec), btns = $$('[data-area-btn]', sec);
    const fecha = c => { c.classList.remove('is-aberto'); $('.socio__mais', c).setAttribute('aria-expanded', 'false'); };
    cards.forEach(c => {
      const b = $('.socio__mais', c);
      b.addEventListener('click', () => {
        const abre = !c.classList.contains('is-aberto');
        cards.forEach(fecha);
        if (abre) { c.classList.add('is-aberto'); b.setAttribute('aria-expanded', 'true'); }
      });
    });
    btns.forEach(b => b.addEventListener('click', () => {
      const area = b.dataset.areaBtn;
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      grid.classList.toggle('is-filtro', area !== 'todos');
      cards.forEach(c => c.classList.toggle('is-dest', c.dataset.area === area));
      // no celular os cards passam para o lado: leva até o sócio da frente
      const alvo = cards.find(c => c.dataset.area === area);
      if (alvo && grid.scrollWidth > grid.clientWidth) grid.scrollTo({ left: alvo.offsetLeft - grid.offsetLeft - parseFloat(getComputedStyle(grid).paddingLeft), behavior: reduce ? 'auto' : 'smooth' });
    }));
    addEventListener('keydown', e => { if (e.key === 'Escape') cards.forEach(fecha); });
  }

  function start() {
    socios();
    menuCelular();
    reveals();
    trilho($('[data-cases]'), '.case', 'cases');
    trilho($('[data-equipe]'), '.pessoa', 'equipe', -1);
    projetos();
    // o cursor azul dos cases saiu: a pílula Ver projeto do card já diz que dá para clicar (cursor nativo)
    if (!reduce) {
      heroScroll();
      frentes();
      waVidro();
      footer();
      pointer();
    }
    // depois das seções fixadas, para as posições já considerarem o espaço delas
    navTheme();
    ScrollTrigger.sort();
    runIntro();
  }

  document.fonts.ready.then(start);
})();
