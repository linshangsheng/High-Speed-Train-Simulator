/* 线路结构（按区块生成）：
   双线 CRTS 板式无砟轨道（支承层 + 轨道板 + 钢轨），线间距 5m；
   路堤段：路基面 + 边坡 + 电缆槽；高架段：箱梁 + 防撞墙 + 桥墩（每 32m 一跨）；车站处桥面加宽；
   接触网：门型支柱(每 50m) + 承力索(带下垂) + 接触线(之字形拉出值) + 吊弦。 */
(function () {
  const LANE = 2.5, STEP = 4, SPAN = 32, POLE = 50;
  const Bd = BKit.Builder;

  /* ---------- 贴图 ---------- */
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, rep) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; return t; }
  function speck(g, W, H, n, a) { for (let i = 0; i < n; i++) { g.fillStyle = (Math.random() < 0.5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + Math.random() * a + ')'; g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2); } }
  // 轨道板：一块板 2.55m × 6.45m；两侧扣件、预制板接缝、中间排水坡
  const slabTex = (() => {
    const W = 256, H = 512, c = cv(W, H), g = c.getContext('2d');
    g.fillStyle = '#b9b6ae'; g.fillRect(0, 0, W, H); speck(g, W, H, 9000, 0.08);
    const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(0,0,0,.08)'); gr.addColorStop(0.5, 'rgba(255,255,255,.06)'); gr.addColorStop(1, 'rgba(0,0,0,.08)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(40,38,35,.75)'; g.fillRect(0, 0, W, 5);                                  // 板缝
    for (let k = 0; k < 10; k++) {                                                                 // 扣件 (间距 0.65m)
      const y = 22 + k * (H - 30) / 10;
      for (const x of [W * 0.218, W * 0.782]) { g.fillStyle = '#2b2c2e'; g.fillRect(x - 18, y - 9, 36, 18); g.fillStyle = '#5b5e62'; g.fillRect(x - 13, y - 5, 8, 10); g.fillRect(x + 5, y - 5, 8, 10); g.fillStyle = '#e1b23a'; g.fillRect(x - 3, y - 10, 6, 3); }
    }
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.strokeRect(1, 1, W - 2, H - 2);
    return tex(c);
  })();
  const concreteTex = (() => {
    const W = 256, H = 256, c = cv(W, H), g = c.getContext('2d');
    g.fillStyle = '#b5b2aa'; g.fillRect(0, 0, W, H); speck(g, W, H, 7000, 0.1);
    for (let i = 0; i < 26; i++) { const x = Math.random() * W, h = 40 + Math.random() * 140; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(70,60,50,.18)'); gr.addColorStop(1, 'rgba(70,60,50,0)'); g.fillStyle = gr; g.fillRect(x, 0, 3 + Math.random() * 8, h); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 3, H);                                         // 梁缝
    return tex(c);
  })();
  const gravelTex = (() => {
    const W = 256, H = 256, c = cv(W, H), g = c.getContext('2d');
    g.fillStyle = '#9b958a'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 5000; i++) { const v = 90 + Math.random() * 110; g.fillStyle = 'rgb(' + v + ',' + (v - 3) + ',' + (v - 9) + ')'; g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 1 + Math.random() * 3); }
    return tex(c);
  })();

  const M = {
    form: new THREE.MeshStandardMaterial({ map: gravelTex, roughness: 0.97, metalness: 0 }),
    base: new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.9, metalness: 0, color: 0xcfcbc2 }),
    slab: new THREE.MeshStandardMaterial({ map: slabTex, roughness: 0.82, metalness: 0 }),
    rail: new THREE.MeshStandardMaterial({ color: 0xa9adb2, roughness: 0.32, metalness: 0.92, envMapIntensity: 1.2 }),
    deck: new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.9, metalness: 0 }),
    para: new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.85, metalness: 0, color: 0xe2ded6 }),
    trough: new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.9, metalness: 0, color: 0x9a978f }),
    wire: new THREE.LineBasicMaterial({ color: 0x1d2024 })
  };

  /* ---------- 接触网门架原型（实例化） ---------- */
  (function portalProto() {
    const P = new BKit.Proto(), B = BKit.box;
    for (const x of [-5.7, 5.7]) { P.add('metal', B(x - 0.17, -0.2, -0.17, x + 0.17, 8.7, 0.17, 1, 1)); P.add('stone', B(x - 0.5, -0.6, -0.5, x + 0.5, 0.25, 0.5, 1, 1)); }
    P.add('metal', B(-6.0, 8.0, -0.22, 6.0, 8.1, 0.22, 1, 1)); P.add('metal', B(-6.0, 8.55, -0.22, 6.0, 8.65, 0.22, 1, 1));
    for (let i = 0; i < 12; i++) { const x0 = -6 + i, x1 = x0 + 1; const g = new THREE.BoxGeometry(0.06, Math.hypot(1, 0.55), 0.06); P.add('metal', g, (x0 + x1) / 2, 8.33, 0.2, 0); P.parts.metal[P.parts.metal.length - 1].rot = [0, 0, (i % 2 ? 1 : -1) * Math.atan2(1, 0.55)]; }
    for (const lane of [-LANE, LANE]) {
      P.add('metal', B(lane - 0.04, 6.62, -0.04, lane + 0.04, 8.0, 0.04, 1, 1));            // 吊柱
      P.add('metal', B(lane - 0.6, 6.95, -0.03, lane + 0.6, 7.02, 0.03, 1, 1));            // 定位器
      P.add('glass_ins', BKit.cyl(0.07, 0.07, 7.0, 7.45, 6, 1, 1), lane, 0, 0);
    }
    Flora.registerMulti('cat_portal', P.build(BTex.mat));
  })();

  /* ---------- 截面（侧向 lat, 高 y），按“从后往前看”逆时针排列，法线朝外 ---------- */
  const deckProfile = (hw) => [[-2.9, -3.0], [2.9, -3.0], [4.4, -0.62], [hw, -0.42], [hw, 0], [-hw, 0], [-hw, -0.42], [-4.4, -0.62]];
  const formProfile = (hw) => [[hw + 2.2, -1.9], [hw, 0], [-hw, 0], [-hw - 2.2, -1.9]];
  const boxProf = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const railProf = (o) => [[o - 0.075, 0.35], [o + 0.075, 0.35], [o + 0.075, 0.368], [o + 0.013, 0.385], [o + 0.013, 0.503], [o + 0.036, 0.51], [o + 0.036, 0.55], [o - 0.036, 0.55], [o - 0.036, 0.51], [o - 0.013, 0.503], [o - 0.013, 0.385], [o - 0.075, 0.368]];

  // 沿行扫掠：rows=[{P,R,s}...]，profileFn(row)->[[lat,y]...]；closed 首尾相连；uvMode: 'slab'/'len'
  function sweep(b, rows, profileFn, closed, uv) {
    for (let i = 0; i < rows.length - 1; i++) {
      const r0 = rows[i], r1 = rows[i + 1], p0 = profileFn(r0), p1 = profileFn(r1), n = p0.length, E = closed ? n : n - 1;
      let cum = 0;
      for (let j = 0; j < E; j++) {
        const j1 = (j + 1) % n;
        const A = (r, p) => [r.P.x + r.R.x * p[0], p[1], r.P.z + r.R.z * p[0]];
        const a = A(r0, p0[j]), a1 = A(r0, p0[j1]), c = A(r1, p1[j]), c1 = A(r1, p1[j1]);
        const el = Math.hypot(p0[j1][0] - p0[j][0], p0[j1][1] - p0[j][1]);
        let ua, ub, uc, ud;
        if (uv === 'slab') { const lo = p0[0][0]; ua = [(p0[j][0] - lo) / 2.55, r0.s / 6.45]; ub = [(p1[j][0] - lo) / 2.55, r1.s / 6.45]; uc = [(p1[j1][0] - lo) / 2.55, r1.s / 6.45]; ud = [(p0[j1][0] - lo) / 2.55, r0.s / 6.45]; }
        else { ua = [r0.s / 8, cum / 4]; ub = [r1.s / 8, cum / 4]; uc = [r1.s / 8, (cum + el) / 4]; ud = [r0.s / 8, (cum + el) / 4]; }
        b.quad(a, c, c1, a1, ua, ub, uc, ud);
        cum += el;
      }
    }
  }

  function stationK(s) {
    let k = 0;
    for (const c of Route.CITIES) { let a = Math.abs(Route.wrap(s) - c.s); if (a > Route.LENGTH / 2) a = Route.LENGTH - a; k = Math.max(k, 1 - Noise.smooth(110, 150, a)); }
    return k;
  }

  /* ---------- 每个区块 ---------- */
  const _pierGeo = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 20); g.translate(0, 0.5, 0); return g; })();
  const _capGeo = (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g; })();

  function chunk(ctx) {
    const s0 = ctx.s0, len = ctx.len, rows = [];
    for (let i = 0; i <= len / STEP; i++) {
      const s = s0 + i * STEP, a = ctx.trackAt(s);
      const P = a.pos.clone(), T = a.tan.clone(), R = new THREE.Vector3(-T.z, 0, T.x);
      const tun = Tunnels.inside(s, 0), v = TerrainCore.vf(s), sk = stationK(s);
      rows.push({ s, P, T, R, tun, via: !tun && v >= 0.5, hw: 6.2 + 7.0 * sk, sk });
    }
    const add = (geo, mat, cast, recv) => { const m = new THREE.Mesh(geo, mat); m.castShadow = !!cast; m.receiveShadow = recv !== false; m.userData.own = true; ctx.group.add(m); return m; };
    // 连续段
    function segs(pred) { const out = []; let cur = null; rows.forEach((r) => { if (pred(r)) { (cur = cur || []).push(r); } else if (cur) { if (cur.length > 1) out.push(cur); cur = null; } }); if (cur && cur.length > 1) out.push(cur); return out; }

    const bForm = new Bd(), bDeck = new Bd(), bPara = new Bd(), bBase = new Bd(), bSlab = new Bd(), bRail = new Bd(), bTrough = new Bd();
    segs(r => !r.tun && !r.via).forEach(sg => { sweep(bForm, sg, r => formProfile(r.hw + 0.4), false, 'len'); for (const sx of [-1, 1]) sweep(bTrough, sg, r => boxProf(sx > 0 ? 4.9 : -5.6, sx > 0 ? 5.6 : -4.9, 0, 0.32), true, 'len'); });
    segs(r => r.via).forEach(sg => {
      sweep(bDeck, sg, r => deckProfile(r.hw), true, 'len');
      sweep(bPara, sg, r => boxProf(r.hw - 0.32, r.hw, 0, 1.15), true, 'len'); sweep(bPara, sg, r => boxProf(-r.hw, -r.hw + 0.32, 0, 1.15), true, 'len');
      for (const sx of [-1, 1]) sweep(bTrough, sg, r => boxProf(sx > 0 ? 4.9 : -5.6, sx > 0 ? 5.6 : -4.9, 0, 0.32), true, 'len');
    });
    for (const lane of [-LANE, LANE]) {
      sweep(bBase, rows, () => boxProf(lane - 1.6, lane + 1.6, -0.02, 0.15), true, 'len');
      sweep(bSlab, rows, () => boxProf(lane - 1.275, lane + 1.275, 0.15, 0.35), true, 'slab');
      for (const o of [-0.7175, 0.7175]) sweep(bRail, rows, () => railProf(lane + o), true, 'len');
    }
    add(bForm.geo(), M.form, false); add(bDeck.geo(), M.deck, true); add(bPara.geo(), M.para, true);
    add(bBase.geo(), M.base, false); add(bSlab.geo(), M.slab, false); add(bRail.geo(), M.rail, false); add(bTrough.geo(), M.trough, false);

    // 桥墩
    const piers = [];
    for (let sp = Math.ceil(s0 / SPAN) * SPAN; sp < s0 + len; sp += SPAN) {
      const al = sp - s0, r = rows[Math.min(rows.length - 1, Math.round(al / STEP))];
      if (!r.via || TerrainCore.vf(sp) < 0.75) continue;
      const g = ctx.terrain.sample(al, 0).h, top = -3.0;
      if (top - g < 0.8) continue;
      if (window.Rivers && Rivers.wet(r.P.x, r.P.z)) { const rv = Rivers.crossingAt(sp, 0); if (!rv || rv.type !== 'girder') continue; }
      const yaw = Math.atan2(r.T.x, r.T.z), capW = r.hw * 1.15 + 0.6;
      piers.push({ geo: _pierGeo, pos: [r.P.x, g - 1.5, r.P.z], rot: [0, yaw, 0], scale: [2.3 + r.sk * 3, top - 1.4 - g + 1.5, 1.15] });
      piers.push({ geo: _capGeo, pos: [r.P.x, top - 1.4, r.P.z], rot: [0, yaw, 0], scale: [capW, 1.4, 2.8] });
      piers.push({ geo: _capGeo, pos: [r.P.x, top - 0.25, r.P.z], rot: [0, yaw, 0], scale: [6.2, 0.25, 1.2] });   // 支座垫石
    }
    if (piers.length) add(GeomUtil.merge(piers), M.deck, true);

    // 接触网门架
    for (let sp = Math.ceil(s0 / POLE) * POLE; sp < s0 + len; sp += POLE) {
      if (Tunnels.inside(sp, 4)) continue;
      const a = ctx.trackAt(sp), yaw = Math.atan2(a.tan.x, a.tan.z);
      Flora.add(ctx, 'cat_portal', a.pos.x, 0, a.pos.z, 1, 1, 1, yaw, new THREE.Color(0x8d939a));
    }
    // 导线：承力索(下垂) + 接触线(之字形) + 吊弦
    const W = [];
    const stagger = (s) => { const k = s / POLE, i = Math.floor(k), f = k - i, a = (i % 2 ? 0.25 : -0.25); return a + (-a - a) * f; };
    const sag = (s, tun) => { if (tun) return 7.15; const f = (s % POLE) / POLE; return 7.55 - 0.85 * 4 * f * (1 - f); };
    for (const lane of [-LANE, LANE]) {
      let prev = null;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i], cx = r.P.x + r.R.x * (lane + stagger(r.s)), cz = r.P.z + r.R.z * (lane + stagger(r.s));
        const mx = r.P.x + r.R.x * lane, mz = r.P.z + r.R.z * lane, my = sag(r.s, r.tun);
        if (prev) { W.push(prev[0], 6.4, prev[1], cx, 6.4, cz); W.push(prev[2], prev[3], prev[4], mx, my, mz); }
        if (i % 2 === 0) W.push(cx, 6.4, cz, mx, my, mz);
        prev = [cx, cz, mx, my, mz];
      }
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(W, 3));
    const wl = new THREE.LineSegments(wg, M.wire); wl.userData.own = true; wl.frustumCulled = false; ctx.group.add(wl);
  }

  window.Line = { chunk, LANE, M, stationK };
})();
