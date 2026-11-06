/* GYZA, vidro em WebGL: a pirâmide do 360°
   Shader próprio: refração real do fundo (o "360°" atrás), dispersão de cor,
   reflexo, arestas acesas e piso espelhado. Não depende da placa de vídeo. */
import * as THREE from 'three';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;

const env = new THREE.TextureLoader().load('assets/img/glass-env.jpg');
env.colorSpace = THREE.NoColorSpace;
env.wrapS = THREE.RepeatWrapping;

/* ---------- texturas de apoio ----------
   Calculadas em código e enviadas como DataTexture. Nada de canvas 2D: o WebKit (Safari)
   trata canvas desenhado e lido como possível "impressão digital" e aciona a proteção avançada. */
const clamp01 = x => Math.max(0, Math.min(1, x));
const hex = c => c.map(v => v / 255);
function dataTex(w, h, fn) {
  const d = new Uint8Array(w * h * 4);
  const px = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    fn(x + 0.5, y + 0.5, px);
    const i = (y * w + x) * 4;
    d[i] = clamp01(px[0]) * 255; d[i + 1] = clamp01(px[1]) * 255; d[i + 2] = clamp01(px[2]) * 255; d[i + 3] = clamp01(px[3]) * 255;
  }
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
// gradiente de 3 paradas, sem pré-multiplicar o alfa (como o canvas fazia)
const lerp4 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const grad3 = (c0, c1, c2, k) => k < 0.5 ? lerp4(c0, c1, k * 2) : lerp4(c1, c2, (k - 0.5) * 2);

// feixe diagonal: um perfil horizontal azul, claro no meio
function beamTex() {
  const c0 = [63 / 255, 107 / 255, 1, 0], c1 = [170 / 255, 200 / 255, 1, 0.9];
  return dataTex(256, 8, (x, y, o) => { const c = grad3(c0, c1, c0, x / 256); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; o[3] = c[3]; });
}

// estúdio refletido no vidro: fundo quase preto, faixas de luz e a luz de cima
function studio() {
  const W = 512, H = 256, K = 0.5;   // metade da resolução antiga: o reflexo é suave
  const bg = [2 / 255, 3 / 255, 9 / 255];
  const strips = [[120, 70, [120, 170, 255]], [300, 26, [230, 240, 255]], [640, 110, [60, 110, 255]], [860, 30, [200, 225, 255]]];
  const t = dataTex(W, H, (x, yRow, o) => {
    const X = x / K, Y = (H - yRow) / K;                 // linha 0 da textura fica embaixo (v = 0)
    let r = bg[0], g = bg[1], b = bg[2];
    const over = (col, a) => { r = col[0] * a + r * (1 - a); g = col[1] * a + g * (1 - a); b = col[2] * a + b * (1 - a); };
    for (const [sx, sw, col] of strips) {
      if (Y >= 40 && Y < 400 && X >= sx && X < sx + sw) {
        const k = (X - sx) / sw;
        over(hex(col), 1 - Math.abs(k * 2 - 1));          // transparente, cheio no meio, transparente
      }
    }
    if (Y < 120) over([170 / 255, 200 / 255, 1], 0.9 * (1 - Y / 120));
    o[0] = r; o[1] = g; o[2] = b; o[3] = 1;
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// brilho redondo no chão: cor interna que some para a externa transparente
function radial(inner, outer) {
  const p = c => c.match(/[\d.]+/g).map(Number);
  const a = p(inner), b = p(outer);
  const A = [a[0] / 255, a[1] / 255, a[2] / 255, a[3]], B = [b[0] / 255, b[1] / 255, b[2] / 255, b[3]];
  return dataTex(256, 256, (x, y, o) => {
    const k = clamp01(Math.hypot(x - 128, y - 128) / 128);
    const c = lerp4(A, B, k); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; o[3] = c[3];
  });
}

/* ---------- shaders ---------- */
const glassVert = /* glsl */`
  varying vec3 vN;
  varying vec3 vNv;
  varying vec3 vP;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vP = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vNv = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const glassFrag = /* glsl */`
  uniform sampler2D uBg;
  uniform sampler2D uEnv;
  uniform sampler2D uStudio;
  uniform vec2 uRes;
  uniform float uBack;
  uniform float uRefl;
  uniform float uFloor;
  uniform float uTime;
  uniform float uGlow;
  uniform float uWhite;
  uniform float uDim;
  uniform float uFade;
  uniform float uSweep;
  varying vec3 vN;
  varying vec3 vNv;
  varying vec3 vP;
  const float PI = 3.14159265;

  vec3 envAt(vec3 d) {
    vec2 uv = vec2(atan(d.z, d.x) / (2.0 * PI) + 0.5, asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5);
    return texture2D(uEnv, uv).rgb;
  }

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(vP - cameraPosition);
    if (!gl_FrontFacing) N = -N;
    float facing = clamp(abs(dot(N, -V)), 0.0, 1.0);
    float fres = pow(1.0 - facing, 3.0);

    // refração do fundo com dispersão
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 off = normalize(vNv).xy * (uBack > 0.5 ? 0.085 : 0.055);
    vec3 bg = vec3(
      texture2D(uBg, uv - off * 0.85).r,
      texture2D(uBg, uv - off).g,
      texture2D(uBg, uv - off * 1.18).b
    );

    vec3 R = reflect(V, N);
    vec2 suv = vec2(atan(R.z, R.x) / (2.0 * PI) + 0.5, asin(clamp(R.y, -1.0, 1.0)) / PI + 0.5);
    vec3 envc = mix(envAt(R), texture2D(uStudio, suv).rgb, 0.65);
    vec3 L1 = normalize(vec3(-0.6, 0.9, 0.7));
    vec3 L2 = normalize(vec3(0.8, 0.35, -0.5));
    float spec = pow(max(dot(R, L1), 0.0), 70.0) * 1.8 + pow(max(dot(R, L2), 0.0), 28.0) * 0.55;

    // faixa de luz que desliza pelas faces
    float band = smoothstep(0.55, 1.0, sin((vP.x * 0.9 + vP.y * 1.4) * 2.0 - uTime * 0.35)) * 0.16;

    // uWhite: 0 na ponta (azul), sobe até 1 na base (vidro branco transparente)
    vec3 deep = mix(vec3(0.015, 0.045, 0.18), vec3(0.06, 0.07, 0.09), uWhite);
    vec3 blue = mix(vec3(0.13, 0.33, 0.98), vec3(0.78, 0.83, 0.92), uWhite);
    vec3 body = mix(deep, blue, 0.06 + 0.38 * (1.0 - facing));
    body = mix(body, mix(vec3(0.18, 0.42, 1.0), vec3(0.86, 0.9, 0.98), uWhite), 0.6 * uGlow);

    vec3 col = body + bg * mix(vec3(0.8, 0.9, 1.15), vec3(0.95), uWhite) * 0.95
             + envc * (0.12 + fres * 1.1)
             + spec * vec3(0.85, 0.93, 1.0)
             + fres * blue * 0.9
             + band * vec3(0.55, 0.7, 1.0);
    if (uBack > 0.5) col *= 0.5;
    col *= 0.55 + 0.45 * max(uGlow, 0.35);
    // fatias que recuam ficam um pouco mais apagadas
    col *= 1.0 - 0.3 * uDim;
    // brilho que percorre a fatia ativa quando ela muda (faixa inclinada, de baixo para cima)
    float sy = vP.y + vP.x * 0.12 - uSweep;
    col += exp(-sy * sy / 0.011) * vec3(0.42, 0.58, 0.95) * step(-50.0, uSweep) * (uBack > 0.5 ? 0.45 : 1.0);

    float a = (uBack > 0.5 ? 0.92 : 0.8) * uFade * (1.0 - 0.1 * uDim);
    if (uRefl > 0.5) {
      a *= 0.32 * smoothstep(uFloor - 1.6, uFloor, vP.y);
    }
    gl_FragColor = vec4(col, a);
  }
`;

const edgeVert = /* glsl */`
  varying float vZ;
  varying float vY;
  varying vec3 vNv;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNv = normalize(normalMatrix * normal);
    vZ = -mv.z;
    vY = (modelMatrix * vec4(position, 1.0)).y;
    gl_Position = projectionMatrix * mv;
  }
`;
const edgeFrag = /* glsl */`
  uniform float uNear;
  uniform float uFar;
  uniform float uRefl;
  uniform float uFloor;
  uniform vec3 uColor;
  uniform float uSoft;
  uniform float uA;
  varying float vZ;
  varying float vY;
  varying vec3 vNv;
  void main() {
    float k = smoothstep(uFar, uNear, vZ);                  // 1 na frente, 0 atrás
    float core = pow(abs(normalize(vNv).z), uSoft > 0.5 ? 2.2 : 0.6);   // miolo cheio, borda some
    // nítida só na frente; atrás a aresta aparece como um brilho desfocado pelo vidro
    float a = uSoft > 0.5 ? (1.0 - k) * 0.22 * core : mix(0.0, 1.0, k) * core;
    if (uRefl > 0.5) a *= 0.25 * smoothstep(uFloor - 1.4, uFloor, vY);
    a *= uA;
    gl_FragColor = vec4(uColor * (0.7 + k), a);
  }
`;

/* ---------- pirâmide ---------- */
function pyramid() {
  const canvas = document.querySelector('.pyr-gl');
  if (!canvas) return;

  // plano B: sem WebGL (ou se o contexto cair), entra a imagem parada da pirâmide, no mesmo lugar
  const poster = () => {
    if (canvas.dataset.poster) return;
    canvas.dataset.poster = '1';
    const img = new Image();
    img.className = 'pyr-poster'; img.alt = '';
    img.src = canvas.clientWidth < 600 ? 'assets/img/pyr-poster-m.webp?v=5' : 'assets/img/pyr-poster.webp?v=6';
    canvas.after(img);
    canvas.style.display = 'none';
    const lab = document.querySelector('.pyr-labels'); if (lab) lab.style.display = 'none';
  };
  let renderer;
  // sem WebGL (bloqueado, desligado ou sem placa): vai direto para a imagem parada, sem erro no console
  let gl = null;
  try { const t = document.createElement('canvas'); gl = t.getContext('webgl2') || t.getContext('webgl'); } catch (e) { gl = null; }
  if (!gl) { poster(); return; }
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { poster(); return; }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); renderer.setAnimationLoop(null); poster(); });
  const PHONE = window.matchMedia('(max-width: 900px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, PHONE ? 1.25 : 1.75));
  renderer.autoClear = false;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  // câmera um pouco mais longe, para o callout ter espaço ao lado
  // câmera quase na altura dos olhos: as tampas das fatias quase não aparecem
  const OPT = window.__pyrOpts || null;
  camera.position.set(...(OPT?.cam || [0, 0.55, 10.4]));
  camera.lookAt(...(OPT?.look || [0, 0.05, 0]));

  const STUDIO = studio();
  const rt = new THREE.WebGLRenderTarget(2, 2);
  const res = new THREE.Vector2(2, 2);

  // fundo que o vidro refrata: o feixe diagonal e a luz do chão (só no buffer)
  const bgScene = new THREE.Scene();
  const FLOOR = -1.0;
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 16),
    new THREE.MeshBasicMaterial({ map: beamTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  halo.position.set(0.4, 0.3, -3.4);
  halo.rotation.z = 38 * Math.PI / 180;
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 6.5),
    new THREE.MeshBasicMaterial({ map: radial('rgba(70,120,255,0.5)', 'rgba(31,79,216,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = FLOOR + 0.001;
  bgScene.add(halo, pool);

  // geometria: faces a 59 graus, cortada em 5 fatias, uma por serviço (do topo para a base)
  const half = 1.15;
  const H = half * Math.tan(59 * Math.PI / 180);
  const R = half * Math.SQRT2;
  const flat = g => { const n = g.toNonIndexed(); n.computeVertexNormals(); return n; };
  const CUTS = [1, 0.74, 0.54, 0.36, 0.18, 0];   // alturas relativas, do topo para a base: Performance, Conteúdo, Site, Identidade visual, Branding
  const NS = CUTS.length - 1;
  const GAP = 0.028;
  const slices = CUTS.slice(0, NS).map((top, i) => {
    const bot = CUTS[i + 1];
    const y0 = H * bot + (i < NS - 1 ? H * GAP : 0), y1 = H * top - H * GAP;
    const r = y => R * (1 - y / H);
    const geo = i === 0
      ? new THREE.ConeGeometry(r(y0), y1 + H * GAP - y0, 4, 1)
      : new THREE.CylinderGeometry(r(y1), r(y0), y1 - y0, 4, 1);
    geo.translate(0, (y0 + (i === 0 ? y1 + H * GAP : y1)) / 2, 0);
    return { geo, y0, y1, mid: (y0 + y1) / 2 };
  });

  const uniforms = (extra = {}) => ({
    uBg: { value: rt.texture }, uEnv: { value: env }, uStudio: { value: STUDIO }, uRes: { value: res },
    uBack: { value: 0 }, uGlow: { value: 0 }, uDim: { value: 0 }, uFade: { value: 0 }, uSweep: { value: -99 }, uWhite: { value: 0 }, uRefl: { value: 0 }, uFloor: { value: FLOOR }, uTime: { value: 0 },
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])),
  });
  const mats = [];
  const glass = (side, opts) => {
    const m = new THREE.ShaderMaterial({
      vertexShader: glassVert, fragmentShader: glassFrag,
      uniforms: uniforms(opts), transparent: true, depthWrite: false, side,
    });
    mats.push(m);
    return m;
  };
  const edgeMats = [];
  const edgeMat = (refl, soft = 0) => {
    const m = new THREE.ShaderMaterial({
      vertexShader: edgeVert, fragmentShader: edgeFrag,
      uniforms: { uNear: { value: 9.3 }, uFar: { value: 11.6 }, uRefl: { value: refl }, uFloor: { value: FLOOR }, uSoft: { value: soft }, uA: { value: 0 }, uColor: { value: new THREE.Color(0x8fb0f0) } },
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    edgeMats.push(m);
    return m;
  };

  // arestas como tubos finos, para brilharem de verdade
  function edges(geo, mat) {
    const softEdge = edgeMat(0, 1);
    const own = [mat, softEdge];
    const grp = new THREE.Group();
    const p = new THREE.EdgesGeometry(geo).attributes.position;
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 2) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1);
      [[0.0055, mat], [0.045, softEdge]].forEach(([rad, m]) => {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, a.distanceTo(b), 12, 1, true), m);
        tube.position.copy(a).add(b).multiplyScalar(0.5);
        tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        tube.renderOrder = 3;
        grp.add(tube);
      });
    }
    grp.userData.mats = own;
    return grp;
  }

  const em = edgeMat(0);
  const main = new THREE.Group();
  const WHITE = [0, 0.42, 0.68, 0.86, 1];         // da ponta azul (Performance) para a base branca (Branding), camada a camada
  // passo da rolagem (0 Branding ... 4 Performance) para a fatia (0 é a ponta, 4 é a base)
  const sliceOf = step => NS - 1 - step;
  slices.forEach((s, i) => {
    const f = flat(s.geo);
    s.back = glass(THREE.BackSide, { uBack: 1, uWhite: WHITE[i] });
    s.front = glass(THREE.FrontSide, { uWhite: WHITE[i] });
    s.group = new THREE.Group();
    const b = new THREE.Mesh(f, s.back); b.renderOrder = 1;
    const fr = new THREE.Mesh(f, s.front); fr.renderOrder = 2;
    // aresta acompanha a camada: azul na ponta, quase branca na base
    const e = i === 0 ? em : edgeMat(0);
    if (i) e.uniforms.uColor.value.lerp(new THREE.Color(0xe6ecf7), WHITE[i]);
    const eg = edges(s.geo, e);
    s.group.add(b, fr, eg);
    s.edgeMats = eg.userData.mats;
    // molas por fatia: elevação, escala, brilho, recuo, entrada
    s.sp = { lift: { x: 0, v: 0 }, grow: { x: 1, v: 0 }, glow: { x: 0, v: 0 }, dim: { x: 0, v: 0 }, app: { x: reduce ? 1 : 0, v: 0 } };
    s.off = 0; s.grow = 1;
    main.add(s.group);
  });

  const scene = new THREE.Scene();
  scene.add(main);


  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.getDrawingBufferSize(res);
    rt.setSize(Math.ceil(res.x / 2), Math.ceil(res.y / 2));   // o fundo refratado é suave: meia resolução basta
    camera.aspect = w / h;
    // no celular a câmera chega mais perto: pirâmide maior na tela
    if (!OPT) {
      const near = w < 600;
      camera.position.set(0, near ? 0.2 : 0.5, near ? 8.4 : 8.9);   // computador: 8.9 deixa a pirâmide uns 17% maior (Diretor de Produto, 05/11)
      camera.lookAt(0, near ? -0.55 : 0.05, 0);
    }
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  // girar com o mouse, com inércia, e voltar para a face do scroll
  let drag = 0, vel = 0, dragging = false, lastX = 0;
  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', e => {
    dragging = true; lastX = e.clientX; vel = 0;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    vel = dx * 0.006; drag += vel;
  });
  const release = () => { dragging = false; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // rótulo lateral: um ponto na face que está mais de frente e uma linha fina que aparece com fade suave (sem piscar)
  const calls = [...document.querySelectorAll('.pyr-labels .call')];
  const faceAng = k => Math.PI / 4 + k * Math.PI / 2;
  const v3 = new THREE.Vector3();
  const grow = calls.map(() => 0);
  function placeCalls(y, active, dt) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const side = w * (w < 600 ? 0.7 : 0.78);   // a linha sai para a lateral direita
    // base da pirâmide na tela (para o rótulo do celular)
    let baseY = 0;
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + y;
      v3.set(Math.sin(a) * R, main.position.y, Math.cos(a) * R).project(camera);
      baseY = Math.max(baseY, (-v3.y * 0.5 + 0.5) * h);
    }
    for (let i = 0; i < calls.length; i++) {
      const el = calls[i];
      let k = 0, bz = -2;
      for (let q = 0; q < 4; q++) { const z = Math.cos(faceAng(q) + y); if (z > bz) { bz = z; k = q; } }
      const a = faceAng(k) + y;
      const s = slices[sliceOf(i)];
      const faceD = (half * (1 - s.mid / H)) * (s.grow || 1) + 0.02;
      v3.set(Math.sin(a) * faceD, main.position.y + s.mid + s.off, Math.cos(a) * faceD).project(camera);
      const x = (v3.x * 0.5 + 0.5) * w, py = (-v3.y * 0.5 + 0.5) * h;
      // só a frente ativa aparece, e só quando a face já está de frente
      const target = sliceOf(i) === active ? 1 : 0;
      // suavização independente da taxa de quadros: a linha se desenha junto com o giro e recolhe rápido
      grow[i] = reduce ? target : lerp(grow[i], target, 1 - Math.exp(-dt * 5));
      const drawn = 1 - Math.pow(1 - grow[i], 3);
      el.style.transform = `translate(${x}px, ${py}px)`;
      el.style.opacity = Math.min(1, grow[i] * 3).toFixed(3);
      // borda direita da fatia na tela: o rótulo não pode ficar por cima do vidro
      let edgeX = 0;
      const rr = half * (1 - s.mid / H) * Math.SQRT2 * (s.grow || 1);
      for (let q = 0; q < 4; q++) {
        const aa = q * Math.PI / 2 + y;
        v3.set(Math.sin(aa) * rr, main.position.y + s.mid + s.off, Math.cos(aa) * rr).project(camera);
        edgeX = Math.max(edgeX, (v3.x * 0.5 + 0.5) * w);
      }
      const txtW = el._tw || (el._tw = el.querySelector('.call__txt').offsetWidth);
      const end = Math.max(Math.min(side, w - txtW - 18 - 12), edgeX + 28);
      if (w < 600 || end + 18 + txtW > w - 8) {
        // celular, ou fatia larga demais (a base): a linha desce até abaixo da base e o rótulo fica embaixo, centralizado
        el.classList.add('is-v');
        el.style.setProperty('--len', `${Math.max(24, baseY + 26 - py)}px`);
      } else {
        // a linha sai para a direita e passa da borda do vidro
        el.classList.remove('is-v');
        el.style.setProperty('--len', `${Math.max(24, end - x)}px`);
      }
      el.style.setProperty('--grow', drawn.toFixed(3));
    }
  }

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 }).observe(canvas);

  // mola amortecida, estável em qualquer taxa de quadros; sem movimento, vai direto ao alvo
  const spring = (o, target, dt, k, zeta) => {
    if (reduce) { o.x = target; o.v = 0; return; }
    const c = 2 * Math.sqrt(k) * zeta, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let j = 0; j < n; j++) { o.v += (k * (target - o.x) - c * o.v) * h; o.x += o.v * h; }
  };
  const ROT0 = Math.PI / 4;
  const rot = { x: ROT0, v: 0 };   // quase parada: sem entrada girando
  let lastT = 0;
  // sem movimento: a cena fica parada, então desenha poucos quadros e para; volta só ao arrastar ou mudar o tamanho
  let quietos = 0;
  const acorda = () => { quietos = 0; renderer.setAnimationLoop(loop); };
  if (reduce) {
    window.addEventListener('resize', acorda);
    canvas.addEventListener('pointerdown', acorda);
  }
  const loop = time => {
    if (!visible) { lastT = 0; return; }
    if (reduce && !dragging && Math.abs(vel) < 1e-4 && Math.abs(drag) < 1e-3 && ++quietos > 30) { renderer.setAnimationLoop(null); return; }
    const now = time / 1000;
    const dt = lastT ? Math.min(0.05, now - lastT) : 1 / 60;
    lastT = now;
    const t = reduce ? 0 : now;
    const p = window.__pyr || 0;
    if (!dragging) { vel *= Math.pow(0.92, dt * 60); drag += vel; drag = lerp(drag, 0, 1 - Math.pow(1 - 0.035, dt * 60)); }
    // movimento discreto, só ligado à rolagem (Vitor, 05/11/2026): rotação lenta de poucos graus e um leve parallax vertical,
    // seguidos com amortecimento crítico (sem mola, sem salto); a camada da vez vem da rolagem
    const alvoRot = ROT0 - p * 0.32;
    rot.x = reduce ? alvoRot : lerp(rot.x, alvoRot, 1 - Math.exp(-dt * 4));
    const y = OPT ? OPT.rotY : rot.x + drag;
    const para = reduce ? 0 : (0.5 - p) * 0.14;

    main.rotation.y = y;
    main.position.y = FLOOR + 0.06 + (OPT ? OPT.lift || 0 : para);
    if (OPT) { main.rotation.x = OPT.tiltX || 0; main.rotation.z = OPT.tiltZ || 0; }
    mats.forEach(m => { m.uniforms.uTime.value = 0; });   // sem faixa de luz correndo: o vidro fica parado
    const dist = camera.position.length();
    edgeMats.forEach(m => { m.uniforms.uNear.value = dist - 0.9; m.uniforms.uFar.value = dist + 1.2; });
    // camada da vez: o trecho da rolagem (cinco partes iguais)
    const act = OPT ? -1 : sliceOf(Math.max(0, Math.min(NS - 1, Math.floor(p * NS))));
    const sw = 2;   // sem o brilho que percorria a camada
    slices.forEach((s, i) => {
      const S = s.sp;
      // sem montagem, sem pulo e sem crescer: a camada da vez só clareia, devagar (amortecimento crítico, sem sobra)
      S.app.x = 1;
      spring(S.glow, i === act ? 1 : 0, dt, 22, 1);
      spring(S.dim, act >= 0 && i !== act ? 0.6 : 0, dt, 22, 1);
      S.grow.x = 1; S.lift.x = 0;
      s.off = S.lift.x - (1 - S.app.x) * 0.9;
      s.grow = S.grow.x * (1 - 0.012 * S.dim.x);
      s.glow = OPT ? OPT.glow[i] : S.glow.x;
      s.group.position.y = s.off;
      s.group.scale.set(s.grow, 1, s.grow);
      const fade = Math.max(0, Math.min(1, S.app.x * 1.6));
      const sweepY = sw < 1 && i === act
        ? main.position.y + s.off + lerp(s.y0 - 0.15, s.y1 + 0.15, 1 - Math.pow(1 - sw, 2.2)) : -99;
      for (const m of [s.back, s.front]) {
        const u = m.uniforms;
        u.uGlow.value = s.glow; u.uDim.value = S.dim.x; u.uFade.value = fade; u.uSweep.value = sweepY;
      }
      for (const m of [...s.edgeMats]) m.uniforms.uA.value = fade * (1 - 0.35 * S.dim.x);
    });
    if (OPT) {
      // ponto mais à direita de cada fatia, na meia altura, em pixels do canvas
      const w = canvas.clientWidth, h = canvas.clientHeight;
      let by = 0;
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + y;
        v3.set(Math.sin(a) * R, main.position.y, Math.cos(a) * R).project(camera);
        by = Math.max(by, (-v3.y * 0.5 + 0.5) * h);
      }
      window.__baseY = by;
      window.__slicePts = slices.map(s => {
        const r = half * (1 - s.mid / H) * Math.SQRT2;
        let best = null;
        for (let k = 0; k < 4; k++) {
          const a = k * Math.PI / 2 + y;
          v3.set(Math.sin(a) * r, main.position.y + s.mid, Math.cos(a) * r).project(camera);
          const p = [(v3.x * 0.5 + 0.5) * w, (-v3.y * 0.5 + 0.5) * h];
          if (!best || p[0] > best[0]) best = p;
        }
        return best;
      });
    } else placeCalls(y, act, dt);

    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(bgScene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    if (OPT && OPT.reflect) {
      // reflexo no chão: a mesma pirâmide espelhada, sumindo com a distância
      const fy = main.position.y, py = main.position.y, rx = main.rotation.x, rz = main.rotation.z;
      const all = [...mats, ...edgeMats];
      all.forEach(m => { m.uniforms.uRefl.value = 1; m.uniforms.uFloor.value = fy; });
      main.scale.y = -1; main.position.y = fy - 0.02; main.rotation.x = -rx; main.rotation.z = -rz;
      renderer.render(scene, camera);
      main.scale.y = 1; main.position.y = py; main.rotation.x = rx; main.rotation.z = rz;
      all.forEach(m => { m.uniforms.uRefl.value = 0; });
    }
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(loop);
}

pyramid();
