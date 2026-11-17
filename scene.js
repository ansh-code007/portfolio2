/* ============================================================
   3D scroll background: a developer desk that scatters into
   floating tech icons as you scroll. Requires Three.js (global
   THREE, loaded from the CDN in index.html).
   ============================================================ */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  // Fallback: no Three.js (offline) or no WebGL -> hide canvas, site still works
  if (typeof THREE === 'undefined') { canvas.style.display = 'none'; return; }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    canvas.style.display = 'none';
    return;
  }

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x09090b, 14, 40);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 2.6, 9);

  /* ---------- Lights ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7);
  sun.position.set(3, 8, 6);
  scene.add(sun);
  const purple = new THREE.PointLight(0x8b5cf6, 1.6, 30);
  purple.position.set(-5, 3, 4);
  scene.add(purple);
  const cyan = new THREE.PointLight(0x06b6d4, 1.6, 30);
  cyan.position.set(5, 2, 3);
  scene.add(cyan);

  const root = new THREE.Group();
  root.position.y = -0.8;
  root.rotation.y = -0.3;
  scene.add(root);

  /* ---------- Helpers ---------- */
  const V3 = THREE.Vector3;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (x) => x * x * (3 - 2 * x);

  function mat(color, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.15 }, extra || {}));
  }
  function box(w, h, d, color, extra) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra));
  }
  function cyl(rt, rb, h, color, seg, extra) {
    return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), mat(color, extra));
  }
  function makeTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- Part registry (things that move on scroll) ---------- */
  const parts = [];

  function scatterTarget(home, minD, maxD) {
    const center = new V3(0, 1, 0);
    const dir = home.clone().sub(center);
    if (dir.length() < 0.5) dir.set(rand(-1, 1), rand(-0.3, 1), rand(-1, 1));
    dir.normalize().add(new V3(rand(-0.6, 0.6), rand(-0.3, 0.6), rand(-0.6, 0.6))).normalize();
    const t = dir.multiplyScalar(rand(minD, maxD)).add(center);
    t.z = Math.min(t.z, 4);
    return t;
  }

  function register(obj, home, opts) {
    opts = opts || {};
    obj.position.copy(home);
    parts.push({
      obj,
      home: home.clone(),
      hr: new V3(obj.rotation.x, obj.rotation.y, obj.rotation.z),
      target: opts.target || scatterTarget(home, opts.minD || 6, opts.maxD || 12),
      spin: new V3(rand(-4, 4), rand(-4, 4), rand(-3, 3)),
      idle: new V3(rand(-0.4, 0.4), rand(-0.4, 0.4), rand(-0.3, 0.3)),
      delay: Math.random(),
      phase: Math.random() * Math.PI * 2,
      speed: rand(0.5, 1.2),
      growFrom0: !!opts.grow,
      baseScale: opts.baseScale || 1,
      mat: opts.mat || null,
    });
    root.add(obj);
  }

  /* ---------- Desk ---------- */
  const desk = new THREE.Group();
  const top = box(8.4, 0.2, 3.4, 0x1c1c24, { roughness: 0.4, metalness: 0.25 });
  top.position.y = 0;
  desk.add(top);
  [[-3.9, -1.5], [3.9, -1.5], [-3.9, 1.5], [3.9, 1.5]].forEach(([x, z]) => {
    const leg = box(0.2, 2.2, 0.2, 0x2a2a35);
    leg.position.set(x, -1.2, z);
    desk.add(leg);
  });
  const edgeGlow = box(8.4, 0.03, 0.03, 0x8b5cf6, { emissive: 0x8b5cf6, emissiveIntensity: 1.2 });
  edgeGlow.position.set(0, 0.0, 1.71);
  desk.add(edgeGlow);
  register(desk, new V3(0, 0, 0), { target: new V3(0, -9, -4) });

  /* ---------- Monitor with code ---------- */
  const monitor = new THREE.Group();
  const base = box(1.3, 0.06, 0.6, 0x2a2a35);
  base.position.y = 0.13;
  const neck = box(0.18, 0.95, 0.1, 0x2a2a35);
  neck.position.y = 0.6;
  const bezel = box(3.4, 2.0, 0.12, 0x101015, { roughness: 0.3 });
  bezel.position.y = 1.6;

  const codeTex = makeTex(512, 300, (ctx, w, h) => {
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, w, 30);
    ['#ff5f56', '#ffbd2e', '#27c93f'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(18 + i * 20, 15, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    const W = '#c9d1d9', R = '#ff7b72', B = '#79c0ff', S = '#a5d6ff', P = '#d2a8ff';
    const code = [
      [['const ', R], ['me', B], [' = {', W]],
      [['  name: ', W], ["'Your Name'", S], [',', W]],
      [['  role: ', W], ["'Frontend Dev'", S], [',', W]],
      [['  skills: ', W], ["['HTML','CSS','JS']", S], [',', W]],
      [['  coffee: ', W], ['true', B], [',', W]],
      [['};', W]],
      [],
      [['function ', R], ['build', P], ['() {', W]],
      [['  return ', R], ["'cool things'", S], [';', W]],
      [['}', W]],
    ];
    ctx.font = '21px monospace';
    ctx.textBaseline = 'top';
    code.forEach((line, i) => {
      let x = 24;
      const y = 48 + i * 27;
      ctx.fillStyle = '#484f58';
      ctx.fillText(String(i + 1), 4, y);
      x = 34;
      line.forEach(([txt, col]) => {
        ctx.fillStyle = col;
        ctx.fillText(txt, x, y);
        x += ctx.measureText(txt).width;
      });
    });
  });
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.8),
    new THREE.MeshBasicMaterial({ map: codeTex })
  );
  screen.position.set(0, 1.6, 0.07);
  monitor.add(base, neck, bezel, screen);
  register(monitor, new V3(0, 0.1, -0.7));

  /* ---------- Keyboard ---------- */
  const keyboard = new THREE.Group();
  const kbBase = box(2.4, 0.1, 0.8, 0x15151b);
  const keyTex = makeTex(512, 170, (ctx, w, h) => {
    ctx.fillStyle = '#15151b';
    ctx.fillRect(0, 0, w, h);
    const rows = 4, cols = 14;
    const kw = (w - 20) / cols, kh = (h - 20) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const accent = (r + c) % 11 === 0;
        ctx.fillStyle = accent ? '#6d4fd1' : '#2a2a35';
        roundRect(ctx, 10 + c * kw + 2, 10 + r * kh + 2, kw - 4, kh - 4, 5);
        ctx.fill();
      }
    }
  });
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.72), new THREE.MeshBasicMaterial({ map: keyTex }));
  keys.rotation.x = -Math.PI / 2;
  keys.position.y = 0.055;
  keyboard.add(kbBase, keys);
  keyboard.rotation.x = 0.05;
  register(keyboard, new V3(-0.1, 0.15, 0.85));

  /* ---------- Mouse ---------- */
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat(0x22222c, { roughness: 0.3 }));
  mouse.scale.set(0.2, 0.1, 0.32);
  register(mouse, new V3(1.7, 0.2, 0.9));

  /* ---------- Laptop ---------- */
  const laptop = new THREE.Group();
  const lBase = box(1.7, 0.06, 1.15, 0x3a3a46, { metalness: 0.5 });
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.03, -0.55);
  hinge.rotation.x = -0.3;
  const lLid = box(1.7, 1.1, 0.05, 0x3a3a46, { metalness: 0.5 });
  lLid.position.y = 0.55;
  const lScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.95),
    new THREE.MeshBasicMaterial({ color: 0x1a1230 })
  );
  lScreen.position.set(0, 0.55, 0.03);
  const lGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.5 })
  );
  lGlow.position.set(0, 0.55, 0.035);
  hinge.add(lLid, lScreen, lGlow);
  laptop.add(lBase, hinge);
  laptop.rotation.y = 0.45;
  register(laptop, new V3(-2.6, 0.13, 0.7));

  /* ---------- Coffee mug ---------- */
  const mug = new THREE.Group();
  const cup = cyl(0.23, 0.2, 0.42, 0xf4f4f5, 28);
  cup.position.y = 0.21;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.2, 28), new THREE.MeshBasicMaterial({ color: 0x3b2314 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.4;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 12, 24), mat(0xf4f4f5));
  handle.position.set(0.25, 0.22, 0);
  mug.add(cup, coffee, handle);
  register(mug, new V3(2.4, 0.1, -0.2));

  /* ---------- Desk lamp ---------- */
  const lamp = new THREE.Group();
  const lampBase = cyl(0.3, 0.34, 0.06, 0x2a2a35, 24);
  lampBase.position.y = 0.03;
  const pole = cyl(0.03, 0.03, 1.3, 0x4a4a58, 12);
  pole.position.y = 0.7;
  const arm = cyl(0.025, 0.025, 0.8, 0x4a4a58, 12);
  arm.position.set(0.3, 1.35, 0);
  arm.rotation.z = Math.PI / 2.6;
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.4, 24, 1, true),
    mat(0x8b5cf6, { side: THREE.DoubleSide, emissive: 0x4c2fb0, emissiveIntensity: 0.5 })
  );
  shade.position.set(0.65, 1.45, 0);
  shade.rotation.z = Math.PI + 0.3;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  bulb.position.set(0.62, 1.3, 0);
  lamp.add(lampBase, pole, arm, shade, bulb);
  register(lamp, new V3(-3.4, 0.1, -1.0));

  /* ---------- Headphones ---------- */
  const phones = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.045, 12, 28, Math.PI), mat(0x22222c));
  band.position.y = 0.2;
  const cupL = cyl(0.17, 0.17, 0.12, 0x8b5cf6, 20);
  cupL.rotation.z = Math.PI / 2;
  cupL.position.set(-0.38, 0.2, 0);
  const cupR = cupL.clone();
  cupR.position.x = 0.38;
  phones.add(band, cupL, cupR);
  phones.rotation.y = -0.5;
  register(phones, new V3(3.1, 0.15, 1.0));

  /* ---------- Plant ---------- */
  const plant = new THREE.Group();
  const pot = cyl(0.3, 0.22, 0.4, 0xc2703d, 20);
  pot.position.y = 0.2;
  plant.add(pot);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), mat(0x22a35a, { roughness: 0.7 }));
    leaf.scale.set(0.1, 0.32, 0.05);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.16, 0.65, Math.sin(a) * 0.16);
    leaf.rotation.z = -Math.cos(a) * 0.6;
    leaf.rotation.x = Math.sin(a) * 0.6;
    plant.add(leaf);
  }
  register(plant, new V3(3.4, 0.1, -1.0));

  /* ---------- Rubber duck (on the monitor) ---------- */
  const duck = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xffd23f, { roughness: 0.4 }));
  body.scale.set(1.2, 0.9, 1);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(0xffd23f, { roughness: 0.4 }));
  head.position.set(0.15, 0.2, 0);
  const beak = box(0.1, 0.04, 0.09, 0xff8a1f);
  beak.position.set(0.27, 0.19, 0);
  duck.add(body, head, beak);
  register(duck, new V3(1.1, 2.7, -0.7));

  /* ---------- Floating tech icons (appear as you scroll) ---------- */
  const labels = [
    ['HTML', '#e34f26', '#fff'], ['CSS', '#264de4', '#fff'], ['JS', '#f7df1e', '#111'],
    ['React', '#20232a', '#61dafb'], ['Git', '#f05032', '#fff'], ['Figma', '#a259ff', '#fff'],
    ['Node', '#3c873a', '#fff'], ['TS', '#3178c6', '#fff'], ['</>', '#1a1230', '#8b5cf6'],
    ['{ }', '#0b2530', '#06b6d4'], ['( )', '#1a1230', '#c4b5fd'], [';', '#1a1230', '#06b6d4'],
    ['Py', '#3776ab', '#ffd43b'], ['UI', '#8b5cf6', '#fff'], ['UX', '#06b6d4', '#042027'],
  ];
  const iconList = isMobile ? labels.slice(0, 10) : labels;
  iconList.forEach(([text, bg, fg]) => {
    const tex = makeTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = bg;
      roundRect(ctx, 16, 16, w - 32, h - 32, 44);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.stroke();
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + (text.length > 3 ? 62 : text.length > 2 ? 78 : 100) + 'px Inter, Arial, sans-serif';
      ctx.fillText(text, w / 2, h / 2 + 4);
    });
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    const sprite = new THREE.Sprite(m);
    sprite.scale.setScalar(0.001);
    const home = new V3(rand(-1.5, 1.5), rand(1, 2.4), rand(-0.5, 0.5));
    const target = new V3(rand(-9, 9), rand(-1, 7), rand(-9, 3));
    // keep the middle of the screen a bit emptier so text stays readable
    if (Math.abs(target.x) < 2.2) target.x += target.x < 0 ? -3 : 3;
    register(sprite, home, { target, grow: true, baseScale: rand(1.2, 1.8), mat: m });
  });

  /* ---------- Floating wireframe shapes ---------- */
  const shapeCount = isMobile ? 8 : 16;
  const geos = [
    new THREE.IcosahedronGeometry(0.5, 0),
    new THREE.OctahedronGeometry(0.5, 0),
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.TorusGeometry(0.4, 0.1, 8, 20),
  ];
  for (let i = 0; i < shapeCount; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: i % 2 ? 0x8b5cf6 : 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    const mesh = new THREE.Mesh(geos[i % geos.length], m);
    const home = new V3(rand(-1, 1), rand(1, 2), rand(-0.5, 0.5));
    const target = new V3(rand(-10, 10), rand(-2, 8), rand(-10, 3));
    register(mesh, home, { target, grow: true, baseScale: rand(0.8, 1.8), mat: m });
    mesh.scale.setScalar(0.001);
  }

  /* ---------- Particles ---------- */
  const pCount = isMobile ? 250 : 700;
  const pos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pos[i * 3] = rand(-18, 18);
    pos[i * 3 + 1] = rand(-8, 12);
    pos[i * 3 + 2] = rand(-18, 4);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xa78bfa, size: 0.05, transparent: true, opacity: 0.15, depthWrite: false });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  /* ---------- Scroll + mouse input ---------- */
  let targetP = 0, p = 0, totalScroll = 0, smoothTotal = 0;
  let mx = 0, my = 0, smx = 0, smy = 0;

  function readScroll() {
    const y = window.scrollY || window.pageYOffset || 0;
    targetP = clamp(y / (window.innerHeight * 1.1), 0, 1);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    totalScroll = clamp(y / max, 0, 1);
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  if (!reduceMotion && !isMobile) {
    window.addEventListener('mousemove', (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------- Render loop ---------- */
  const clock = new THREE.Clock();
  const look = new V3();

  function frame() {
    requestAnimationFrame(frame);
    const t = clock.getElapsedTime();

    p += (targetP - p) * 0.08;
    smoothTotal += (totalScroll - smoothTotal) * 0.06;
    smx += (mx - smx) * 0.05;
    smy += (my - smy) * 0.05;
    const ease = smooth(p);

    parts.forEach((pt) => {
      const l = smooth(clamp((p - pt.delay * 0.35) / 0.65, 0, 1));
      pt.obj.position.lerpVectors(pt.home, pt.target, l);
      if (!reduceMotion) pt.obj.position.y += Math.sin(t * pt.speed + pt.phase) * 0.18 * l;
      pt.obj.rotation.set(
        pt.hr.x + pt.spin.x * l + (reduceMotion ? 0 : t * pt.idle.x * l),
        pt.hr.y + pt.spin.y * l + (reduceMotion ? 0 : t * pt.idle.y * l),
        pt.hr.z + pt.spin.z * l + (reduceMotion ? 0 : t * pt.idle.z * l)
      );
      if (pt.growFrom0) {
        pt.obj.scale.setScalar(Math.max(0.001, pt.baseScale * l));
        if (pt.mat) pt.mat.opacity = l * 0.95;
      }
    });

    // camera pulls back and rises while the desk breaks apart
    camera.position.set(smx * 0.8, 2.6 + ease * 1.2 - smy * 0.4, 9 + ease * 5);
    look.set(0, 0.8 + ease * 1.0, 0);
    camera.lookAt(look);

    // whole scene slowly turns as you read down the page
    root.rotation.y = -0.3 + smoothTotal * 0.9 + (reduceMotion ? 0 : Math.sin(t * 0.2) * 0.04);

    points.rotation.y = t * 0.02 + smoothTotal * 0.5;
    pMat.opacity = 0.15 + ease * 0.5;

    // subtle light movement
    purple.position.x = -5 + Math.sin(t * 0.4) * 1.5;
    cyan.position.x = 5 + Math.cos(t * 0.4) * 1.5;

    renderer.render(scene, camera);
  }
  frame();
})();
