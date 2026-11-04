/* GYZA, vidro em WebGL: a pirâmide do 360°
   Shader próprio: refração real do fundo (o "360°" atrás), dispersão de cor,
   reflexo, arestas acesas e piso espelhado. Não depende da placa de vídeo. */
import * as THREE from 'three';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;

const env = new THREE.TextureLoader().load('assets/img/glass-env.jpg');
env.colorSpace = THREE.NoColorSpace;
env.wrapS = THREE.RepeatWrapping;

/* ---------- texturas de apoio ---------- */
function beamTex() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 8;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(63,107,255,0)');
  gr.addColorStop(0.5, 'rgba(170,200,255,0.9)');
  gr.addColorStop(1, 'rgba(63,107,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 8);
  return new THREE.CanvasTexture(c);
}

function studio() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#020309'; g.fillRect(0, 0, 1024, 512);
  const strip = (x, w, col) => {
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x, 40, w, 360);
  };
  strip(120, 70, 'rgba(120,170,255,1)');
  strip(300, 26, 'rgba(230,240,255,1)');
  strip(640, 110, 'rgba(60,110,255,1)');
  strip(860, 30, 'rgba(200,225,255,1)');
  const top = g.createLinearGradient(0, 0, 0, 120);
  top.addColorStop(0, 'rgba(170,200,255,.9)'); top.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = top; g.fillRect(0, 0, 1024, 120);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function radial(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, inner);
  gr.addColorStop(1, outer);
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
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

    float a = uBack > 0.5 ? 0.92 : 0.8;
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
  varying float vZ;
  varying float vY;
  varying vec3 vNv;
  void main() {
    float k = smoothstep(uFar, uNear, vZ);                  // 1 na frente, 0 atrás
    float core = pow(abs(normalize(vNv).z), uSoft > 0.5 ? 2.2 : 0.6);   // miolo cheio, borda some
    // nítida só na frente; atrás a aresta aparece como um brilho desfocado pelo vidro
    float a = uSoft > 0.5 ? (1.0 - k) * 0.22 * core : mix(0.0, 1.0, k) * core;
    if (uRefl > 0.5) a *= 0.25 * smoothstep(uFloor - 1.4, uFloor, vY);
    gl_FragColor = vec4(uColor * (0.7 + k), a);
  }
`;

/* ---------- pirâmide ---------- */
function pyramid() {
  const canvas = document.querySelector('.pyr-gl');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
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

  // geometria: faces a 59 graus, cortada em 4 fatias, uma por frente (do topo para a base)
  const half = 1.15;
  const H = half * Math.tan(59 * Math.PI / 180);
  const R = half * Math.SQRT2;
  const flat = g => { const n = g.toNonIndexed(); n.computeVertexNormals(); return n; };
  const CUTS = [1, 0.7, 0.45, 0.22, 0];          // alturas relativas: Marca, Conteúdo, Digital, Performance
  const GAP = 0.028;
  const slices = CUTS.slice(0, 4).map((top, i) => {
    const bot = CUTS[i + 1];
    const y0 = H * bot + (i < 3 ? H * GAP : 0), y1 = H * top - H * GAP;
    const r = y => R * (1 - y / H);
    const geo = i === 0
      ? new THREE.ConeGeometry(r(y0), y1 + H * GAP - y0, 4, 1)
      : new THREE.CylinderGeometry(r(y1), r(y0), y1 - y0, 4, 1);
    geo.translate(0, (y0 + (i === 0 ? y1 + H * GAP : y1)) / 2, 0);
    return { geo, y0, y1, mid: (y0 + y1) / 2 };
  });

  const uniforms = (extra = {}) => ({
    uBg: { value: rt.texture }, uEnv: { value: env }, uStudio: { value: STUDIO }, uRes: { value: res },
    uBack: { value: 0 }, uGlow: { value: 0 }, uWhite: { value: 0 }, uRefl: { value: 0 }, uFloor: { value: FLOOR }, uTime: { value: 0 },
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
      uniforms: { uNear: { value: 9.3 }, uFar: { value: 11.6 }, uRefl: { value: refl }, uFloor: { value: FLOOR }, uSoft: { value: soft }, uColor: { value: new THREE.Color(0x8fb0f0) } },
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    edgeMats.push(m);
    return m;
  };

  // arestas como tubos finos, para brilharem de verdade
  const softEdge = edgeMat(0, 1);
  function edges(geo, mat) {
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
    return grp;
  }

  const em = edgeMat(0);
  const main = new THREE.Group();
  const WHITE = [0, 0.5, 0.8, 1];                 // da ponta azul para a base branca, camada a camada
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
    s.group.add(b, fr, edges(s.geo, e));
    s.glow = 0; s.lift = 0;
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
      camera.position.set(0, near ? 0.2 : 0.55, near ? 8.4 : 10.4);
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

  // callouts: um ponto em cada face e uma linha fina que se desenha quando a face vem para a frente
  const calls = [...document.querySelectorAll('.pyr-labels .call')];
  const faceAng = k => Math.PI / 4 + k * Math.PI / 2;
  const stepRot = s => Math.PI / 4 - s * Math.PI / 2;
  const callOfFace = [];
  [0, 1, 2, 3].forEach(s => {
    let best = 0, bestZ = -2;
    for (let k = 0; k < 4; k++) {
      const z = Math.cos(faceAng(k) + stepRot(s));
      if (z > bestZ) { bestZ = z; best = k; }
    }
    callOfFace[best] = calls[s];
  });
  const v3 = new THREE.Vector3();
  const grow = calls.map(() => 0);
  function placeCalls(y, step) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const side = w * (w < 600 ? 0.7 : 0.78);   // a linha sai para a lateral direita
    const active = Math.round(step);
    // base da pirâmide na tela (para o rótulo do celular)
    let baseY = 0;
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + y;
      v3.set(Math.sin(a) * R, main.position.y, Math.cos(a) * R).project(camera);
      baseY = Math.max(baseY, (-v3.y * 0.5 + 0.5) * h);
    }
    for (let k = 0; k < 4; k++) {
      const el = callOfFace[k];
      if (!el) continue;
      const i = calls.indexOf(el);
      const a = faceAng(k) + y;
      const s = slices[i];
      const faceD = (half * (1 - s.mid / H)) * (s.grow || 1) + 0.02;
      v3.set(Math.sin(a) * faceD, main.position.y + s.mid, Math.cos(a) * faceD).project(camera);
      const x = (v3.x * 0.5 + 0.5) * w, py = (-v3.y * 0.5 + 0.5) * h;
      // só a frente ativa aparece, e só quando a face já está de frente
      const target = i === active ? Math.max(0, Math.min(1, (Math.cos(a) - 0.9) / 0.08)) : 0;
      grow[i] = lerp(grow[i], target, target > grow[i] ? 0.07 : 0.2);
      el.style.transform = `translate(${x}px, ${py}px)`;
      el.style.opacity = Math.min(1, grow[i] * 3).toFixed(3);
      if (w < 600) {
        // celular: a linha desce até abaixo da base e o rótulo fica embaixo, centralizado
        el.classList.add('is-v');
        el.style.setProperty('--len', `${Math.max(24, baseY + 26 - py)}px`);
      } else {
        // o rótulo nunca passa da borda: a linha encurta se faltar espaço
        el.classList.remove('is-v');
        const txtW = el.querySelector('.call__txt').offsetWidth;
        const end = Math.min(side, w - txtW - 18 - 12);
        el.style.setProperty('--len', `${Math.max(24, end - x)}px`);
      }
      el.style.setProperty('--grow', grow[i].toFixed(3));
    }
  }

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  let rot = Math.PI / 4;
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = reduce ? 0 : clock.getElapsedTime();
    const p = window.__pyr || 0;
    if (!dragging) { vel *= 0.92; drag += vel; drag = lerp(drag, 0, 0.035); }
    // uma face por frente: gira 90 graus a cada quarto da rolagem
    // cada frente gira no começo do seu trecho de rolagem e depois fica parada
    const q = Math.min(3.999, p * 4), k = Math.floor(q), f = q - k;
    const ease = x => x * x * (3 - 2 * x);
    const step = k === 0 ? 0 : k - 1 + ease(Math.min(1, f / 0.4));
    rot = lerp(rot, Math.PI / 4 - step * Math.PI / 2, 0.12);
    const y = OPT ? OPT.rotY : rot + drag + Math.sin(t * 0.5) * 0.05;
    const bob = Math.sin(t * 0.8) * 0.05;

    main.rotation.y = y;
    main.position.y = FLOOR + 0.06 + (OPT ? OPT.lift || 0 : bob);
    if (OPT) { main.rotation.x = OPT.tiltX || 0; main.rotation.z = OPT.tiltZ || 0; }
    mats.forEach(m => { m.uniforms.uTime.value = t; });
    const dist = camera.position.length();
    edgeMats.forEach(m => { m.uniforms.uNear.value = dist - 0.9; m.uniforms.uFar.value = dist + 1.2; });
    const act = OPT ? -1 : Math.round(step);
    slices.forEach((s, i) => {
      s.glow = OPT ? OPT.glow[i] : lerp(s.glow, i === act ? 1 : 0, 0.08);
      // a fatia ativa se projeta para fora, sem sair da linha das outras
      s.grow = lerp(s.grow || 1, i === act ? 1.07 : 1, 0.08);
      s.group.scale.set(s.grow, 1, s.grow);
      s.back.uniforms.uGlow.value = s.front.uniforms.uGlow.value = s.glow;
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
    } else placeCalls(y, step);

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
  });
}

pyramid();
