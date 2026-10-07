/* 城市地标（精细版）：天安门、东方明珠、广州塔、布达拉宫、圣索菲亚、艾提尕尔、大理三塔、楼阁/佛塔等。
   每个地标是按材质分组合并的原型，通过 Flora 实例化放置。 */
(function () {
  const B = BKit.box, sz = BTex.size, made = {};
  function reg(name, fn) { if (made[name]) return name; const P = new BKit.Proto(); fn(P); Flora.registerMulti(name, P.build(BTex.mat)); made[name] = true; return name; }
  const roof = (P, key, hx, hz, y, rise, over, up, ridge) => P.add(key, BKit.pagodaRoof(hx, hz, y, rise, over, up, ridge || 0, 4, 4));
  const cyl = BKit.cyl;
  const col = (P, x, z, y0, y1, r, key) => P.add(key || 'red_wood', cyl(r, r * 1.05, y0, y1, 10, 2, 3), x, 0, z);

  // 多层楼阁/塔：n 层，起始边长 w0，逐层收分 k，每层高 h
  function tiered(P, o) {
    let y = o.y0 || 0, w = o.w0; const [tw, th] = sz(o.wall);
    for (let i = 0; i < o.n; i++) {
      P.add(o.wall, B(-w / 2, y, -w / 2, w / 2, y + o.h, w / 2, tw, th));
      if (o.cols) for (const [sx, sz_] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) col(P, sx * w / 2, sz_ * w / 2, y, y + o.h, 0.35 * (o.colK || 1));
      roof(P, o.roof, w / 2, w / 2, y + o.h, o.h * 0.75, w * 0.32, w * (o.up == null ? 0.09 : o.up));
      y += o.h * 1.15; w *= o.k;
    }
    return y;
  }

  // 在两点之间放一根杆(圆柱/方柱)
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _up = new THREE.Vector3(0, 1, 0);
  function bar(P, key, a, b, r, box) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); _q.setFromUnitVectors(_up, d.normalize()); _e.setFromQuaternion(_q);
    const g = box ? new THREE.BoxGeometry(r * 2, len, r * 2) : new THREE.CylinderGeometry(r, r, len, 8);
    (P.parts[key] = P.parts[key] || []).push({ geo: g, pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [_e.x, _e.y, _e.z], scale: [1, 1, 1] });
  }

  const L = {};

  /* 北京·天安门 */
  L['北京'] = (P) => {
    P.add('marble', B(-40, 0, -14, 40, 2.2, 14, 4, 4)); P.add('marble', B(-36, 2.2, -11, 36, 3.0, 11, 4, 4));
    P.add('red_wall', B(-34, 3.0, -9, 34, 13.5, 9, 6, 6));
    for (let i = -2; i <= 2; i++) { const w = i === 0 ? 4.4 : 3.4; P.add('dark', B(i * 10 - w / 2, 3.0, 8.8, i * 10 + w / 2, i === 0 ? 10.8 : 9.0, 9.2, 2, 2)); P.add('dark', BKit.cyl(w / 2, w / 2, 9.0 - 0.01, 9.0, 14, 2, 2), i * 10, 0.0 + (i === 0 ? 1.8 : 0), 9, 0, 1, 0.0001, 1); }
    P.add('white', B(-35, 13.5, -10, 35, 14.6, 10, 4, 4));
    P.add('red_wall', B(-27, 14.6, -7.5, 27, 22.0, 7.5, 6, 6)); for (let i = -13; i <= 13; i++) col(P, i * 2, 7.9, 14.6, 22, 0.28, 'red_wood');
    P.add('dark', B(-26, 17, 7.7, 26, 20.5, 7.8, 2, 2));
    roof(P, 'r_gold', 28, 8.5, 22, 8.5, 3.6, 4.2, 20);
    P.add('red_wall', B(-17, 25.2, -5.5, 17, 31.0, 5.5, 6, 6)); for (let i = -8; i <= 8; i++) col(P, i * 2, 5.7, 25.2, 31, 0.26);
    roof(P, 'r_gold', 18.5, 6.4, 31, 8.0, 2.8, 3.6, 12);
    P.add('gold', B(-0.5, 36, -0.5, 0.5, 38.5, 0.5, 1, 1));
    for (const sx of [-1, 1]) { P.add('marble', cyl(0.7, 0.9, 0, 11, 8, 2, 3), sx * 52, 0, 4); P.add('marble', B(sx * 52 - 3.2, 8.5, 3.8, sx * 52 + 3.2, 9.0, 4.2, 2, 1)); P.add('marble', B(sx * 52 - 1.8, 0, 2, sx * 52 + 1.8, 1.0, 6, 3, 3)); }
  };

  /* 上海·东方明珠 */
  L['上海'] = (P) => {
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI * 2 / 3 + 0.4;
      bar(P, 'metal', [Math.cos(a) * 30, 0, Math.sin(a) * 30], [Math.cos(a) * 5, 100, Math.sin(a) * 5], 2.3);     // 三根斜撑
      bar(P, 'metal', [Math.cos(a) * 5, 100, Math.sin(a) * 5], [Math.cos(a) * 3, 140, Math.sin(a) * 3], 1.6);
      P.add('stone', B(Math.cos(a) * 30 - 3, -1, Math.sin(a) * 30 - 3, Math.cos(a) * 30 + 3, 2.5, Math.sin(a) * 30 + 3, 3, 3));
    }
    P.add('metal', cyl(3.6, 4.4, 0, 200, 14, 4, 6)); P.add('pearl', new THREE.SphereGeometry(23, 22, 16), 0, 72, 0); P.add('pearl', new THREE.SphereGeometry(18, 20, 14), 0, 138, 0);
    P.add('metal', cyl(1.2, 3.0, 138, 262, 8, 3, 6), 0, 0, 0); P.add('pearl', new THREE.SphereGeometry(9, 16, 12), 0, 242, 0);
    for (const y of [88, 98, 108]) P.add('white', cyl(14, 14, y, y + 1.2, 18, 4, 2));
    P.add('metal', cyl(0.3, 0.8, 262, 330, 6, 2, 8)); P.add('red_light', new THREE.SphereGeometry(1.2, 8, 6), 0, 330, 0);
    P.add('white', cyl(8, 9, 190, 196, 14, 3, 2));
  };

  /* 广州·广州塔（小蛮腰：扭转的双曲面网壳） */
  L['广州'] = (P) => {
    const N = 34, Htot = 380, rmin = 14, k = 0.045, yc = 0.52 * Htot, ringR = (y) => Math.sqrt(rmin * rmin + Math.pow((y - yc) * k * 5.2, 2));
    const pts = []; for (let i = 0; i <= N; i++) { const y = 5 + i / N * (Htot - 40), r = ringR(y) * (1 - i / N * 0.1), tw = i / N * Math.PI * 1.0; pts.push({ y, r, tw }); }
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[i + 1];
      P.add('metal', cyl(b.r * 1.01, a.r * 1.01, a.y, b.y, 16, 4, 6), 0, 0, 0, a.tw);
      for (let j = 0; j < 16; j += 2) {
        const an0 = a.tw + j * Math.PI * 2 / 16, an1 = b.tw + j * Math.PI * 2 / 16 + 0.35;
        bar(P, 'metal', [Math.cos(an0) * a.r, a.y, Math.sin(an0) * a.r], [Math.cos(an1) * b.r, b.y, Math.sin(an1) * b.r], 0.35, true);
      }
    }
    P.add('glow', cyl(ringR(0) * 1.05, ringR(0) * 1.05, 4, 6, 20, 4, 2)); P.add('glow', cyl(ringR(Htot - 40) * 1.04, ringR(Htot - 40) * 1.04, Htot - 42, Htot - 40, 20, 4, 2));
    P.add('metal', cyl(4.0, 7.0, Htot - 40, Htot - 20, 12, 3, 4)); P.add('metal', cyl(0.4, 1.4, Htot - 20, Htot + 90, 8, 2, 10)); P.add('red_light', new THREE.SphereGeometry(1.2, 8, 6), 0, Htot + 90, 0);
    P.add('pearl', new THREE.SphereGeometry(10, 16, 12), 0, 200, 0);
  };

  /* 拉萨·布达拉宫：红山之上，白宫(两翼)逐层收分，红宫居中，金顶 */
  L['拉萨'] = (P) => {
    const [tw, th] = sz('w_tibet'), [pw, ph] = sz('w_palace');
    P.add('stone', BKit.frustum(-92, -50, 92, 40, -3, 34, 26, 4, 4));
    P.add('w_tibet', BKit.frustum(-80, -30, 80, 18, 30, 52, 3, tw, th)); P.add('maroon', B(-80.5, 52, -30.5, 80.5, 52.8, 18.5, 3, 1)); P.add('white', B(-80, 52.8, -30, 80, 53.3, 18, 3, 1));
    P.add('w_tibet', BKit.frustum(-66, -28, 66, 12, 53, 72, 3, tw, th)); P.add('maroon', B(-66.5, 72, -28.5, 66.5, 72.8, 12.5, 3, 1));
    P.add('w_tibet', BKit.frustum(-50, -26, 50, 8, 73, 86, 3, tw, th)); P.add('white', B(-50, 86, -26, 50, 86.6, 8, 3, 1));
    // 红宫
    P.add('w_palace', BKit.frustum(-27, -24, 27, 6, 53, 100, 4, pw, ph)); P.add('maroon', B(-27.6, 100, -24.6, 27.6, 101, 6.6, 3, 1));
    P.add('w_palace', BKit.frustum(-19, -20, 19, 2, 101, 116, 2.5, pw, ph)); P.add('gold', B(-19.4, 116, -20.4, 19.4, 116.8, 2.4, 3, 1));
    roof(P, 'r_gold', 22, 12, 116.8, 9, 3.4, 3.6, 7); P.add('gold', B(-0.7, 125.8, -0.7, 0.7, 131, 0.7, 1, 1)); P.add('gold', new THREE.SphereGeometry(1.2, 8, 6), 0, 131.8, 0);
    for (const sx of [-1, 1]) { roof(P, 'r_gold', 9, 7, 101, 6, 2, 2.4, 2); P.parts.r_gold[P.parts.r_gold.length - 1].pos = [sx * 30, 0, -9]; roof(P, 'r_gold', 7, 6, 86.6, 5, 1.6, 1.8, 1); P.parts.r_gold[P.parts.r_gold.length - 1].pos = [sx * 42, 0, -9]; }
    for (const x of [-72, -58, 58, 72]) { P.add('w_tibet', B(x - 5.5, 72.8, -22, x + 5.5, 83, 2, tw, th)); roof(P, 'r_gold', 6.5, 12, 83, 3.6, 1.2, 1.4, 5); P.parts.r_gold[P.parts.r_gold.length - 1].pos = [x, 0, -10]; }
    // 前方白色台阶与平台
    P.add('stone', B(-30, 0, 38, 30, 4, 80, 4, 4)); P.add('white', B(-60, 30, 12, 60, 34, 36, 4, 4));
    for (let i = 0; i < 9; i++) P.add('stone', B(-16, i * 3.6, 40 + i * 4, 16, i * 3.6 + 3.6, 76, 4, 4));
  };

  /* 哈尔滨·圣索菲亚大教堂 */
  L['哈尔滨'] = (P) => {
    const [tw, th] = sz('w_church');
    P.add('w_church', B(-18, 0, -12, 18, 14.4, 12, tw, th)); P.add('w_church', B(-8, 14.4, -8, 8, 24, 8, tw, th));
    P.add('stone', B(-20, 0, -14, 20, 1.2, 14, 4, 4));
    P.add('green_dome', new THREE.SphereGeometry(10.5, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), 0, 24, 0, 0, 1, 1.4, 1); P.add('green_dome', cyl(0.1, 2.4, 40, 48, 12, 2, 2));
    P.add('gold', B(-0.35, 46, -0.35, 0.35, 54, 0.35, 1, 1)); P.add('gold', B(-2, 51, -0.3, 2, 52, 0.3, 1, 1));
    for (const [x, z] of [[-14, -9], [14, -9], [-14, 9], [14, 9]]) { P.add('w_church', B(x - 3.4, 14.4, z - 3.4, x + 3.4, 21, z + 3.4, tw, th)); P.add('green_dome', new THREE.SphereGeometry(4, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), x, 21, z, 0, 1, 1.35, 1); P.add('gold', B(x - 0.15, 25.4, z - 0.15, x + 0.15, 29, z + 0.15, 1, 1)); }
    P.add('w_church', B(-5, 0, 12, 5, 12, 20, tw, th)); P.add('green_dome', cyl(0.1, 3.4, 12, 22, 4, 2, 2), 0, 0, 16, Math.PI / 4); P.add('gold', B(-0.2, 22, 15.8, 0.2, 26, 16.2, 1, 1));
  };

  /* 喀什·艾提尕尔清真寺 */
  L['喀什'] = (P) => {
    P.add('ochre', B(-34, 0, -10, 34, 8.5, 10, 4, 4)); P.add('ochre', B(-34.3, 8.5, -10.3, 34.3, 9.2, 10.3, 4, 4));
    P.add('ochre', B(-8, 0, 9, 8, 19, 13, 4, 4)); P.add('dark', B(-4, 0, 12.8, 4, 12.5, 13.1, 2, 2)); P.add('dark', cyl(4, 4, 12.5, 12.5, 14, 2, 2), 0, 0, 13);
    P.add('turq', B(-4.6, 0, 12.7, -4, 13.5, 13.0, 1, 1)); P.add('turq', B(4, 0, 12.7, 4.6, 13.5, 13.0, 1, 1));
    for (const sx of [-1, 1]) { P.add('ochre', cyl(2.2, 2.7, 0, 24, 14, 4, 4), sx * 9.8, 0, 11); P.add('white', cyl(2.4, 2.4, 19, 20, 14, 2, 2), sx * 9.8, 0, 11); P.add('turq', cyl(0.15, 2.4, 24, 29, 12, 2, 2), sx * 9.8, 0, 11); P.add('gold', B(sx * 9.8 - 0.1, 29, 10.9, sx * 9.8 + 0.1, 32, 11.1, 1, 1)); }
    P.add('green_dome', new THREE.SphereGeometry(5.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 19, 11);
    for (let i = -3; i <= 3; i++) P.add('wood', cyl(0.25, 0.28, 0, 6, 8, 2, 3), i * 8, 0, 11.5);
    P.add('wood', B(-33, 6, 10.4, 33, 6.4, 13, 2, 2)); P.add('r_flat', B(-34, 8.5, -10.5, 34, 8.7, 10.5, 4, 4));
  };

  /* 大理·三塔 */
  L['大理'] = (P) => {
    const t = (x, s, n) => { let y = 0, w = 16 * s; P.add('stone', B(x - w, 0, -w, x + w, 2, w, 4, 4)); y = 2; for (let i = 0; i < n; i++) { const ww = (14 - i * 0.62) * s; P.add('white', B(x - ww / 2, y, -ww / 2, x + ww / 2, y + 4.6 * s, ww / 2, 4, 4)); P.add('r_gray', BKit.hip(x - ww / 2, -ww / 2, x + ww / 2, ww / 2, y + 4.6 * s, 0.9 * s, 0.9 * s, 4, 4)); y += 4.9 * s; } P.add('white', cyl(0.2, 2.0 * s, y, y + 4 * s, 8, 2, 2), x, 0, 0); P.add('gold', cyl(0.05, 0.4, y + 4 * s, y + 8 * s, 6, 1, 1), x, 0, 0); };
    t(0, 1.6, 16); t(-48, 1.0, 10); t(48, 1.0, 10);
  };

  /* 楼阁 / 佛塔（杭州雷峰塔、昆明、乌鲁木齐、呼和浩特、库尔勒…） */
  const pag = (n, w0, k, h, wall, roofKey, o) => (P) => { P.add('stone', B(-w0 * 0.9, 0, -w0 * 0.9, w0 * 0.9, 2.2, w0 * 0.9, 4, 4)); P.add('stone', B(-w0 * 0.75, 2.2, -w0 * 0.75, w0 * 0.75, 3.2, w0 * 0.75, 4, 4)); const y = tiered(P, Object.assign({ n, w0, k, h, wall, roof: roofKey, y0: 3.2, cols: true }, o || {})); P.add('gold', cyl(0.1, 0.9, y - 1, y + 3, 8, 2, 2)); P.add('gold', cyl(0.05, 0.12, y + 3, y + 10, 6, 1, 1)); };
  L['杭州'] = pag(5, 20, 0.88, 7.5, 'brick', 'r_gold', { colK: 1 });
  L['昆明'] = pag(9, 15, 0.9, 5.5, 'white', 'r_green', { cols: false });
  L['乌鲁木齐'] = pag(5, 15, 0.82, 6.5, 'brick', 'r_slate', { cols: false });
  L['呼和浩特'] = pag(7, 15, 0.86, 6, 'white', 'r_gray', { cols: false, up: 0.04 });
  L['库尔勒'] = pag(4, 14, 0.86, 6, 'ochre', 'r_green', { cols: false });
  L['沈阳'] = pag(2, 26, 0.7, 9, 'red_wall', 'r_gold', { colK: 1.2 });
  L['青岛'] = (P) => { P.add('white', cyl(4, 5.5, 0, 36, 14, 4, 6)); P.add('red_wall', cyl(5.5, 6, 36, 40, 14, 4, 2)); P.add('gold', new THREE.SphereGeometry(3.0, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 40, 0); P.add('stone', B(-12, 0, -12, 12, 2, 12, 4, 4)); };
  L['三亚'] = (P) => { P.add('stone', cyl(26, 30, 0, 4, 18, 4, 3)); P.add('white', cyl(9, 12, 4, 20, 12, 3, 3)); P.add('white', cyl(5, 8.5, 20, 66, 12, 4, 8)); P.add('white', new THREE.SphereGeometry(5.6, 14, 10), 0, 72, 0); P.add('gold', cyl(10, 10, 62, 62.6, 18, 2, 1)); P.add('gold', cyl(0.4, 0.4, 76, 88, 6, 1, 1)); };
  L['兰州'] = (P) => { P.add('stone', BKit.frustum(-30, -30, 30, 30, -2, 22, 8, 4, 4)); const y = tiered(P, { n: 7, w0: 14, k: 0.88, h: 4.2, wall: 'white', roof: 'r_red', y0: 22, cols: false, up: 0.05 }); P.add('gold', cyl(0.1, 0.8, y - 1, y + 3, 8, 2, 2)); };
  L['敦煌'] = (P) => { for (let i = 0; i < 3; i++) P.add('ochre', new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), -50 + i * 50, -0.5, 0, 0, 90 - i * 12, 34 - i * 6, 80); P.add('stone', B(-8, 0, -8, 8, 1.5, 8, 4, 4)); const y = tiered(P, { n: 3, w0: 8, k: 0.8, h: 3.5, wall: 'wood', roof: 'r_green', y0: 1.5, cols: true, up: 0.08 }); };
  L['呼伦贝尔'] = (P) => { P.add('white', cyl(20, 20, 0, 9, 24, 6, 4)); P.add('white', cyl(2.5, 21.5, 9, 22, 24, 6, 4)); P.add('blue_pat', cyl(20.3, 20.3, 6, 8, 24, 6, 2)); P.add('dark', cyl(6, 6, 21.6, 22.6, 14, 4, 2)); P.add('red_wood', B(-3, 0, 19.7, 3, 7, 20.3, 2, 3)); };

  // 默认：缺失地标时用的小型楼阁
  L._default = pag(3, 12, 0.86, 5, 'white', 'r_gray', { cols: false });

  const OFFSET = { '北京': 125, '上海': 150, '广州': 190, '拉萨': 190, '哈尔滨': 120, '喀什': 130, '大理': 140, '兰州': 130 };
  function ensure(city) { const key = L[city] ? city : '_default', name = 'lm_' + key; reg(name, L[key]); return name; }
  window.Landmarks = { ensure, OFFSET, has: (c) => !!L[c] };
})();
