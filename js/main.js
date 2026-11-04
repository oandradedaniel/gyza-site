/* GYZA, movimento do site */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  gsap.registerPlugin(ScrollTrigger);
  window.__pyr = 0;

  // a abertura sempre começa do topo: sem restaurar rolagem nem pular para âncora
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);

  /* ---------- quebra de texto ---------- */
  $$('[data-lines]').forEach(el => {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(p => `<span class="line"><span>${p.trim()}</span></span>`).join('');
  });
  $$('[data-words]').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  });

  /* ---------- abertura ---------- */
  const intro = $('.intro');
  const svg = $('.intro__mark');
  const mark = $('.mark');
  const topo = $('.mark__a .topo');
  const faixa = $('.revela__faixa');
  const heroMark = $('.hero__mark');
  const ACX = 631.55, ACY = 98.5; // centro do A no viewBox

  function endIntro() {
    gsap.set(heroMark, { autoAlpha: 1 });
    intro.classList.add('is-done');
    document.body.classList.remove('is-loading');
    ScrollTrigger.refresh();
  }

  function heroIn(tl, at) {
    tl.add(() => document.body.classList.add('is-revealed'), at)
      .from('.hero__halo', { opacity: 0, scale: 1.08, duration: 2, ease: 'power2.out' }, at - 0.4)
      .from('.hero__content .line > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.07 }, at + 0.1)
      .from('.hero__ctas > *', { y: 24, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, at + 0.4);
  }

  function runIntro() {
    gsap.set(heroMark, { autoAlpha: 0 });

    if (reduce) {
      endIntro();
      return;
    }

    const W = window.innerWidth, H = window.innerHeight;
    const w0 = svg.getBoundingClientRect().width;
    const h0 = w0 * 200.45 / 750;
    gsap.set(svg, { x: (W - w0) / 2, y: (H - h0) / 2 });
    gsap.set(mark, { x: 375 - ACX, svgOrigin: `${ACX} ${ACY}` });
    gsap.set(faixa, { x: 760 });

    const tl = gsap.timeline();
    // o A se monta: o topo desce, as pernas sobem pela própria diagonal de 59 graus
    tl.from(topo, { y: -70, opacity: 0, duration: 1.1, ease: 'expo.out' }, 0.1)
      .from('.perna--e', { x: -46, y: 77, opacity: 0, duration: 1.1, ease: 'expo.out' }, 0.25)
      .from('.perna--d', { x: 46, y: 77, opacity: 0, duration: 1.1, ease: 'expo.out' }, 0.32)
      // o nome nasce a partir do A
      .to(mark, { x: 0, duration: 1.15, ease: 'expo.inOut' }, 1.05)
      .to(faixa, { x: -40, duration: 1.15, ease: 'expo.inOut' }, 1.15)
      // o logo desce e vira o nome gigante da base da tela
      .add(() => {
        const t = heroMark.getBoundingClientRect();
        gsap.to(svg, { x: t.left, y: t.top, width: t.width, duration: 1.25, ease: 'expo.inOut', onComplete: endIntro });
      }, 2.3)
      .fromTo('.nav', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 2.9);
    heroIn(tl, 2.8);
  }

  /* ---------- abertura: rolagem ---------- */
  function heroScroll() {
    const st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__content', { y: -90, opacity: 0, ease: 'none', scrollTrigger: { ...st, end: '60% top' } });
    gsap.to('.hero__mark', { yPercent: 18, ease: 'none', scrollTrigger: st });
  }

  /* ---------- menu: tema e esconder ---------- */
  function navTheme() {
    const nav = $('[data-nav]');
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
        nav.classList.toggle('is-hidden', y > last + 2 && y > window.innerHeight * 0.8);
        if (y < last - 2) nav.classList.remove('is-hidden');
        last = y;
      },
    });
  }

  /* ---------- linhas e palavras ---------- */
  function reveals() {
    $$('[data-lines]').forEach(el => {
      if (el.closest('.hero')) return;
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
  function servicos() {
    $$('.servico').forEach(li => ScrollTrigger.create({
      trigger: li, start: 'top 58%', end: 'bottom 42%',
      toggleClass: { targets: li, className: 'is-active' },
    }));
  }

  /* ---------- 360: a pirâmide gira com a rolagem ---------- */
  function frentes() {
    const panels = $$('.frente');
    const dots = $$('.frentes__dots li');
    let cur = 0;
    const show = i => {
      if (i === cur) return;
      cur = i;
      panels.forEach((p, k) => {
        if (k === i) return;
        gsap.killTweensOf(p);
        p.classList.remove('is-on');
        gsap.to(p, { opacity: 0, y: -12, duration: 0.25, ease: 'power2.in' });
      });
      gsap.killTweensOf(panels[i]);
      panels[i].classList.add('is-on');
      gsap.fromTo(panels[i], { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.55, delay: 0.15, ease: 'expo.out' });
      gsap.fromTo($$('li', panels[i]), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.25, stagger: 0.04, ease: 'expo.out' });
      dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
    };
    ScrollTrigger.create({
      trigger: '.frentes', start: 'top top', end: '+=300%', pin: true, scrub: true,
      onUpdate: s => {
        window.__pyr = s.progress;
        show(Math.min(3, Math.floor(s.progress * 4)));
      },
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

  /* ---------- trabalhos: cartões empilham ---------- */
  function trabalhos() {
    const cases = $$('.case');
    cases.forEach((c, i) => {
      c.style.setProperty('--k', i);
      if (i < cases.length - 1) {
        gsap.to($('.case__media', c), {
          scale: 0.92, opacity: 0.4, ease: 'none',
          scrollTrigger: { trigger: cases[i + 1], start: 'top bottom', end: 'top 12%', scrub: true },
        });
      }
    });
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
    window.addEventListener('mousemove', e => { cx(e.clientX); cy(e.clientY); cur.style.opacity = 1; });
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

  /* ---------- orçamento: envia pelo WhatsApp ---------- */
  function form() {
    const f = $('[data-form]');
    const note = $('[data-form-note]');
    const original = note.textContent;
    f.addEventListener('submit', e => {
      e.preventDefault();
      const req = $$('input[required]', f);
      let ok = true;
      req.forEach(i => {
        const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value));
        i.classList.toggle('is-error', bad);
        if (bad) ok = false;
      });
      if (!ok) {
        note.textContent = 'Preencha nome, empresa, WhatsApp e um e-mail válido.';
        note.classList.add('is-error');
        return;
      }
      note.textContent = original;
      note.classList.remove('is-error');
      const d = new FormData(f);
      const frentes = d.getAll('frente');
      const msg = [
        'Olá, GYZA. Quero solicitar um orçamento.',
        `Nome: ${d.get('nome')}`,
        `Empresa: ${d.get('empresa')}`,
        `WhatsApp: ${d.get('whatsapp')}`,
        `E-mail: ${d.get('email')}`,
        frentes.length ? `Precisa de: ${frentes.join(', ')}` : '',
        d.get('outros') ? `Outros: ${d.get('outros')}` : '',
      ].filter(Boolean).join('\n');
      window.open(`https://wa.me/5547992606871?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    });
    $$('input[required]', f).forEach(i => i.addEventListener('input', () => i.classList.remove('is-error')));
    // "Outros" abre um campo curto para descrever
    const outros = $('[data-outros]', f), campo = $('.field--outros', f);
    outros.addEventListener('change', () => {
      campo.hidden = !outros.checked;
      if (outros.checked) $('input', campo).focus(); else $('input', campo).value = '';
    });
  }

  /* ---------- início ---------- */
  function start() {
    reveals();
    form();
    servicos();
    if (!reduce) {
      heroScroll();
      frentes();
      ScrollTrigger.matchMedia({ '(min-width: 901px)': metodo });
      trabalhos();
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
