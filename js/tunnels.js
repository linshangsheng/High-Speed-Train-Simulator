/* 隧道：沿线山体 + 拱形隧道内壁 + 洞口。进洞后光线变暗、洞内灯带、远处洞口透出亮光 */
(function () {
  // a = 起始城市，隧道落在 a 与下一座城市之间；at = 在该区间内的相对位置(0..1)
  const DEFS = [
    { n: '祥云隧道',       a: '昆明',     at: 0.5,  len: 900 },
    { n: '高黎贡山隧道',   a: '大理',     at: 0.5,  len: 1300 },
    { n: '色季拉山隧道',   a: '林芝',     at: 0.5,  len: 1500 },
    { n: '冈底斯山隧道',   a: '日喀则',   at: 0.5,  len: 1600 },
    { n: '昆仑山隧道',     a: '阿里',     at: 0.35, len: 2000 },
    { n: '天山胜利隧道',   a: '喀什',     at: 0.7,  len: 1700 },
    { n: '天山隧道',       a: '库尔勒',   at: 0.5,  len: 1800 },
    { n: '祁连山隧道',     a: '敦煌',     at: 0.5,  len: 1800 },
    { n: '贺兰山隧道',     a: '兰州',     at: 0.5,  len: 1400 },
    { n: '大兴安岭隧道',   a: '呼伦贝尔', at: 0.5,  len: 2200 },
    { n: '山海关隧道',     a: '沈阳',     at: 0.5,  len: 1100 },
    { n: '太行山隧道',     a: '青岛',     at: 0.5,  len: 900 },
    { n: '黄山隧道',       a: '杭州',     c: 0.30, len: 800 },
    { n: '武夷山隧道',     a: '杭州',     c: 0.57, len: 900 },
    { n: '南岭隧道',       a: '杭州',     c: 0.86, len: 800 },
    { n: '哀牢山隧道',     a: '三亚',     at: 0.5,  len: 1600 }
  ];
  const PAD = 650, STEP = 4, W = 34, HEND = 16, TR = 6.9, TW = 2.8;   // 双线隧道：内轮廓半宽 6.9m，直墙 2.8m
  const C = Route.CITIES, L = Route.LENGTH;
  const list = [];
  DEFS.forEach(d => {
    const i = C.findIndex(c => c.name === d.a && !c.loop);
    if (i < 0 || i >= C.length - 1) return;
    const a = C[i], b = C[i + 1], avail = b.s - a.s - PAD * 2;
    if (avail < 400) return;
    const len = Math.min(d.len, avail * 0.8);
    const s0 = d.c != null ? a.s + PAD + Math.min(avail - len, Math.max(0, avail * d.c - len / 2)) : a.s + PAD + (avail - len) * d.at;   // c: 同一区间多条隧道时按中心位置排布
    list.push({ name: d.n, s0, s1: s0 + len, len, region: Route.regionAt(s0 + len / 2) });
  });

  function inside(s, pad) {
    s = Route.wrap(s); pad = pad || 0;
    for (const t of list) if (s >= t.s0 - pad && s <= t.s1 + pad) return true;
    return false;
  }
  const sstep = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

  // 在 s 处隧道的"黑暗系数"：进洞前 10m 开始变暗，进洞 25m 后完全进入
  function factor(s) {
    s = Route.wrap(s);
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (s > t.s0 - 12 && s < t.s1 + 25) {
        const d = Math.min(s - t.s0, t.s1 - s);
        return { tf: sstep(-10, 25, d), idx: i };
      }
    }
    return { tf: 0, idx: -1 };
  }

  function archTexture() {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
    const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 128, 0);
    gr.addColorStop(0, '#5c5f63'); gr.addColorStop(0.3, '#9a9da1'); gr.addColorStop(0.5, '#aeb1b4'); gr.addColorStop(0.7, '#9a9da1'); gr.addColorStop(1, '#5c5f63');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.08 + ')'; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
    g.fillStyle = 'rgba(30,32,36,.55)'; g.fillRect(0, 0, 128, 7);               // 衬砌环缝
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 7, 128, 2);
    for (const u of [0.30, 0.70]) {                                              // 灯带
      g.fillStyle = '#fff6d0'; g.fillRect(u * 128 - 3, 20, 6, 88);
      g.fillStyle = 'rgba(255,240,180,.25)'; g.fillRect(u * 128 - 9, 14, 18, 100);
    }
    g.fillStyle = '#e8c14a'; g.fillRect(0, 118, 128, 3);                          // 底部反光标识线
    const t = srgbTex(new THREE.CanvasTexture(cv)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
  }

  function archShape(r, wall, y0) {
    const pts = [new THREE.Vector2(-r, y0)];
    pts.push(new THREE.Vector2(-r, wall));
    for (let k = 1; k <= 20; k++) { const a = Math.PI - k / 20 * Math.PI; pts.push(new THREE.Vector2(r * Math.cos(a), wall + r * Math.sin(a))); }
    pts.push(new THREE.Vector2(r, y0));
    return pts;
  }

  let built = false, tubeMat = null;
  function build(scene) {
    if (built) return; built = true;
    const curve = Route.curve, UP = new THREE.Vector3(0, 1, 0);
    const tubeTex = archTexture();
    tubeMat = new THREE.MeshBasicMaterial({ map: tubeTex, side: THREE.DoubleSide, color: 0x9b9da1, transparent: true });
    const portalMat = new THREE.MeshLambertMaterial({ color: 0xaaa79e, side: THREE.DoubleSide });
    const frameMat = new THREE.MeshLambertMaterial({ color: 0xdcd7c8, side: THREE.DoubleSide });

    const ring = [[-TR, 0], [-TR, TW]];
    for (let k = 1; k <= 16; k++) { const a = Math.PI - k / 16 * Math.PI; ring.push([TR * Math.cos(a), TW + TR * Math.sin(a)]); }
    ring.push([TR, 0]);
    const rl = [0]; for (let i = 1; i < ring.length; i++) rl.push(rl[i - 1] + Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]));
    const rtot = rl[rl.length - 1];

    list.forEach((t, ti) => {
      const n = Math.ceil(t.len / STEP);
      const P = [], R = [], Tg = [];
      for (let i = 0; i <= n; i++) {
        const s = Math.min(t.s1, t.s0 + i * STEP);
        const u = Route.wrap(s) / L;
        const p = curve.getPointAt(u), tg = curve.getTangentAt(u); tg.y = 0; tg.normalize();
        P.push(p); Tg.push(tg); R.push(new THREE.Vector3(-tg.z, 0, tg.x));
      }
      const group = new THREE.Group(); scene.add(group);

      // 内壁
      {
        const pos = [], uv = [], idx = [];
        for (let i = 0; i <= n; i++) for (let j = 0; j < ring.length; j++) {
          pos.push(P[i].x + R[i].x * ring[j][0], ring[j][1], P[i].z + R[i].z * ring[j][0]);
          uv.push(rl[j] / rtot, (t.s0 + i * STEP) / 6);
        }
        const m = ring.length;
        for (let i = 0; i < n; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = a + m; idx.push(a, b, a + 1, a + 1, b, b + 1); }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
        const mesh = new THREE.Mesh(g, tubeMat); mesh.frustumCulled = false; group.add(mesh);
      }

      // 洞内地面（混凝土道床边缘）
      {
        const fp = [], fi = [];
        for (let i = 0; i <= n; i++) { fp.push(P[i].x - R[i].x * TR, -0.01, P[i].z - R[i].z * TR, P[i].x + R[i].x * TR, -0.01, P[i].z + R[i].z * TR); }
        for (let i = 0; i < n; i++) { const a = i * 2; fi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi); fg.computeVertexNormals();
        const fm = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0x4a4b4e, side: THREE.DoubleSide })); fm.frustumCulled = false; group.add(fm);
      }

      // 山体：半椭圆截面，高度由两端向中间抬升
      const dom = t.region.k < 0.5 ? t.region.a : t.region.b;
      const snow = dom.type === 'snowforest';
      const ground = new THREE.Color(dom.ground);
      const rock = new THREE.Color(dom.type === 'tibet' || dom.type === 'xinjiang' || dom.type === 'gobi' ? 0x8c8070 : snow ? 0xf2f6f8 : 0x65755c);
      const top = new THREE.Color(dom.type === 'tibet' ? 0xf4f8ff : dom.type === 'tropical' || dom.type === 'water' || dom.type === 'yunnan' ? 0x3f8a46 : rock.getHex());
      const K = 18;
      {
        const pos = [], col = [], idx = [];
        const tmp = new THREE.Color();
        for (let i = 0; i <= n; i++) {
          const dEnd = Math.min(i * STEP, t.len - i * STEP);
          const H = HEND + 46 * sstep(0, 140, dEnd);
          const end = (i === 0 || i === n);
          for (let j = 0; j <= K; j++) {
            const a = Math.PI - j / K * Math.PI;
            const hh = Math.sin(a) * H, ww = Math.cos(a) * W * (1 + 0.12 * Math.sin(i * 0.15) * sstep(0, 40, dEnd));
            const jit = end || j === 0 || j === K ? 0 : (Math.sin(i * 1.7 + j * 2.3) * 0.7 + Math.sin(i * 0.37 + j) * 1.1);
            pos.push(P[i].x + R[i].x * ww, -0.6 + hh + jit, P[i].z + R[i].z * ww);
            const k2 = sstep(0.1, 0.9, hh / H);
            tmp.copy(ground).lerp(rock, Math.min(1, k2 * 1.4)).lerp(top, Math.max(0, k2 - 0.45) * 1.3);
            col.push(tmp.r, tmp.g, tmp.b);
          }
        }
        const m = K + 1;
        for (let i = 0; i < n; i++) for (let j = 0; j < K; j++) { const a = i * m + j, b = a + m; idx.push(a, b, a + 1, a + 1, b, b + 1); }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.setIndex(idx); g.computeVertexNormals();
        t.moundMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 1 });
        const mesh = new THREE.Mesh(g, t.moundMat); mesh.frustumCulled = false; group.add(mesh);
      }

      // 洞口：墙 + 门框。两端各一
      function portal(i, flip) {
        const sh = new THREE.Shape(); const w = [];
        for (let k = 0; k <= 24; k++) { const a = Math.PI - k / 24 * Math.PI; w.push(new THREE.Vector2(W * Math.cos(a) * 1.0, -0.6 + HEND * Math.sin(a))); }
        sh.setFromPoints(w);
        sh.holes.push(new THREE.Path(archShape(TR + 0.3, TW + 0.1, 0)));
        const wall = new THREE.Mesh(new THREE.ShapeGeometry(sh), portalMat);
        const fr = new THREE.Shape(archShape(TR + 1.7, TW + 0.2, 0)); fr.holes.push(new THREE.Path(archShape(TR + 0.3, TW + 0.1, 0)));
        const frame = new THREE.Mesh(new THREE.ShapeGeometry(fr), frameMat); frame.position.z = 0.12;
        const gp = new THREE.Group(); gp.add(wall); gp.add(frame);
        gp.position.set(P[i].x, 0, P[i].z); gp.rotation.y = Math.atan2(Tg[i].x, Tg[i].z);
        gp.position.addScaledVector(Tg[i], flip ? 0.02 : -0.02);
        group.add(gp);
      }
      portal(0, false); portal(n, true);

      // 出口亮光（仅在洞内视角显示）
      {
        const gm = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, fog: false, side: THREE.DoubleSide });
        const glow = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(archShape(TR - 0.1, TW, 0))), gm);
        glow.position.set(P[n].x, 0, P[n].z); glow.position.addScaledVector(Tg[n], -3);
        glow.rotation.y = Math.atan2(Tg[n].x, Tg[n].z); glow.visible = false;
        group.add(glow); t.glow = glow; t.glowMat = gm;
      }
      t.group = group;
    });
  }

  // 外部视角下列车在洞内时，让山体半透明（剖面透视）
  const cut = { v: 1 };
  function setCutaway(activeIdx, wantOpacity, dt) {
    cut.v += (wantOpacity - cut.v) * Math.min(1, dt * 4);
    if (tubeMat) { const k = Math.min(1, Math.max(0, (cut.v - 0.14) / 0.86)); const o = activeIdx >= 0 ? 0.18 + 0.82 * k : 1; tubeMat.opacity = o; tubeMat.depthWrite = o > 0.95; }
    list.forEach((t, i) => {
      if (!t.moundMat) return;
      const o = i === activeIdx ? cut.v : 1;
      t.moundMat.opacity = o; t.moundMat.depthWrite = o > 0.95;
    });
  }
  function setGlow(activeIdx, color, show) {
    list.forEach((t, i) => { if (t.glow) { t.glow.visible = show && i === activeIdx; if (t.glow.visible) t.glowMat.color.copy(color); } });
  }

  window.Tunnels = { list, inside, factor, build, setCutaway, setGlow };
})();
