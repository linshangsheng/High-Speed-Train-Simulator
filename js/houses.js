/* 民居与农村建筑原型（按地区风格）：白族、傣楼、藏式、维吾尔、蒙古包、东北木刻楞、华北砖房、江南粉墙黛瓦+马头墙、
   华南自建房、现代农村楼房、大棚、厂房、白塔、铁塔、风机等。每个原型是按材质分组合并的几何，由 Flora 实例化。 */
(function () {
  const B = BKit.box, defs = {}, built = {};
  const def = (name, fn) => { defs[name] = fn; };
  function ensure(name) {
    if (built[name]) return; const P = new BKit.Proto(); defs[name](P);
    Flora.registerMulti(name, P.build(BTex.mat)); built[name] = true;
  }
  const sz = BTex.size;

  const plinth = (P, W, D, h) => P.add('stone', B(-W / 2 - 0.15, -1.6, -D / 2 - 0.15, W / 2 + 0.15, h == null ? 0.4 : h, D / 2 + 0.15, 3, 2));
  const door = (P, x, D, w, h, key) => P.add(key || 'red_wood', B(x - w / 2, 0.4, D / 2, x + w / 2, h || 2.5, D / 2 + 0.14, 2, 2.5));
  // 通用山墙屋：墙体 + 双坡顶 + 山墙
  function gableHouse(P, o) {
    const [tw, th] = sz(o.wall), W = o.W, D = o.D;
    P.add(o.wall, B(-W / 2, 0, -D / 2, W / 2, o.wh, D / 2, tw, th));
    const g = BKit.gable(-W / 2, -D / 2, W / 2, D / 2, o.wh, o.rise, o.over, o.axis || 'x', 4, 4);
    P.add(o.roof, g.roof); P.add(o.wall, g.ends);
    if (o.ridge !== false) { const L = (o.axis === 'z' ? D : W) + 2 * o.over; P.add('dark', o.axis === 'z' ? B(-0.15, o.wh + o.rise - 0.05, -L / 2, 0.15, o.wh + o.rise + 0.22, L / 2, 1, 1) : B(-L / 2, o.wh + o.rise - 0.05, -0.15, L / 2, o.wh + o.rise + 0.22, 0.15, 1, 1)); }
  }
  function ring(P, x0, z0, x1, z1, h, t, key, gap) {   // 围墙，南面(+z)留门洞
    const [tw, th] = sz(key);
    P.add(key, B(x0, 0, z0, x1, h, z0 + t, tw, th)); P.add(key, B(x0, 0, z0, x0 + t, h, z1, tw, th)); P.add(key, B(x1 - t, 0, z0, x1, h, z1, tw, th));
    const mid = (x0 + x1) / 2; P.add(key, B(x0, 0, z1 - t, mid - gap, h, z1, tw, th)); P.add(key, B(mid + gap, 0, z1 - t, x1, h, z1, tw, th));
    P.add('r_gray', B(x0 - 0.1, h, z0 - 0.1, x1 + 0.1, h + 0.12, z0 + t + 0.1, 3, 3)); P.add('r_gray', B(x0 - 0.1, h, z0, x0 + t + 0.1, h + 0.12, z1, 3, 3)); P.add('r_gray', B(x1 - t - 0.1, h, z0, x1 + 0.1, h + 0.12, z1, 3, 3));
  }
  const post = (P, x, z, h, r, key) => P.add(key || 'wood', BKit.cyl(r, r, 0, h, 8, 2, 2), x, 0, z);

  /* ---------- 云南·白族：白墙灰瓦、木格窗、檐下彩绘、照壁 ---------- */
  def('h_bai', (P) => {
    gableHouse(P, { W: 12, D: 8, wh: 6.4, wall: 'w_bai', roof: 'r_gray', rise: 2.1, over: 0.95 });
    plinth(P, 12, 8); door(P, 0, 8, 1.8, 2.6);
    P.add('dark', B(-6.5, 5.7, 4.15, 6.5, 6.15, 4.55, 2, 2)); P.add('blue_pat', B(-6.5, 5.45, 4.15, 6.5, 5.7, 4.45, 2, 1));
    P.add('wood', B(-3, 3.2, 4, 3, 3.4, 5.1, 2, 2)); for (const x of [-2.8, 0, 2.8]) P.add('wood', B(x - 0.08, 0.4, 4.9, x + 0.08, 3.2, 5.06, 1, 2));
    P.add('wood', B(-3, 3.3, 5, 3, 4.1, 5.06, 2, 1));
  });
  def('h_bai_court', (P) => {   // 三坊一照壁
    const hall = (x, z, W, D, axis) => { gableHouse(P, { W, D, wh: 6.4, wall: 'w_bai', roof: 'r_gray', rise: 2.0, over: 0.9, axis }); };
    // 正房（北）
    const sub = (fn, x, z, ry) => { const Q = new BKit.Proto(); fn(Q); for (const k in Q.parts) Q.parts[k].forEach(p => P.add(k, p.geo, p.pos[0] * Math.cos(ry) + p.pos[2] * Math.sin(ry) + x, p.pos[1], -p.pos[0] * Math.sin(ry) + p.pos[2] * Math.cos(ry) + z, p.rot[1] + ry, p.scale[0], p.scale[1], p.scale[2])); };
    const main = (Q) => { gableHouse(Q, { W: 14, D: 7, wh: 6.4, wall: 'w_bai', roof: 'r_gray', rise: 2.0, over: 0.9 }); plinth(Q, 14, 7); door(Q, 0, 7, 1.8, 2.6); };
    sub(main, 0, -9, 0);
    sub(main, -10.5, 0, Math.PI / 2); sub(main, 10.5, 0, -Math.PI / 2);
    // 照壁（南）
    P.add('w_bai', B(-6, 0, 10.2, 6, 4.6, 10.7, 12, 6.4)); P.add('r_gray', BKit.gable(-6, 10.2, 6, 10.7, 4.6, 0.9, 0.4, 'x', 4, 4).roof); P.add('stone', B(-5, 0.6, 10.7, 5, 3.8, 10.78, 3, 2));
    P.add('stone', B(-12.5, 0, -13.5, 12.5, 0.1, 12, 3, 3));   // 院落铺地
    ring(P, -14.6, -13.6, 14.6, 12.2, 3.2, 0.4, 'w_bai', 2.2);
  });

  /* ---------- 傣家竹楼：高脚、悬山陡坡顶 ---------- */
  def('h_dai', (P) => {
    for (const x of [-3.2, 0, 3.2]) for (const z of [-3.6, 0, 3.6]) post(P, x, z, 2.8, 0.17, 'wood');
    P.add('wood', B(-4.2, 2.7, -4.6, 4.2, 3.0, 4.6, 2, 2));
    P.add('w_bamboo', B(-4, 3.0, -4.2, 4, 6.2, 4.2, 8, 3.2));
    const g = BKit.gable(-4, -4.2, 4, 4.2, 6.2, 3.6, 1.3, 'z', 4, 4);
    P.add('r_thatch', g.roof); P.add('w_bamboo', g.ends);
    P.add('wood', B(-1.4, 0.0, 4.6, 1.4, 0.2, 7.0, 2, 2));                      // 台阶
    for (let i = 0; i < 6; i++) P.add('wood', B(-1.0, 0.45 * i, 4.7 + i * 0.45, 1.0, 0.45 * i + 0.1, 5.0 + i * 0.45, 2, 2));
    P.add('wood', B(-4.6, 3.0, 4.2, 4.6, 3.12, 5.4, 2, 2));
  });

  /* ---------- 西藏：收分白墙、黑色梯形窗、深褐檐带、屋顶经幡 ---------- */
  def('h_tibet', (P) => {
    const [tw, th] = sz('w_tibet');
    P.add('w_tibet', BKit.frustum(-6, -4.5, 6, 4.5, 0, 6.2, 0.5, tw, th));
    P.add('maroon', B(-5.65, 6.2, -4.15, 5.65, 6.85, 4.15, 2, 1)); P.add('white', B(-5.6, 6.85, -4.1, 5.6, 7.15, 4.1, 2, 1));
    for (let i = 0; i < 12; i++) P.add('wood', B(-5.5 + i * 1.0, 6.05, 4.1, -5.4 + i * 1.0, 6.2, 4.18, 1, 1));
    P.add('red_wood', B(-0.9, 0, 4.5 - 0.5 * 0.4, 0.9, 2.5, 4.62, 2, 2.5)); P.add('wood', B(-1.2, 2.5, 4.2, 1.2, 2.8, 4.7, 2, 1));
    P.add('w_tibet', B(-3.2, 7.15, -2.8, 2.2, 10.0, 2.0, tw, th)); P.add('maroon', B(-3.4, 10.0, -3.0, 2.4, 10.5, 2.2, 2, 1)); P.add('gold', B(-0.4, 10.5, -0.4, 0.4, 11.3, 0.4, 1, 1));
    for (const [x, z] of [[-5.4, 3.8], [5.4, 3.8], [-5.4, -3.8], [5.4, -3.8]]) P.add('wood', BKit.cyl(0.07, 0.07, 7.1, 9.8, 6, 1, 1), x, 0, z);
    const fl = ['flag_b', 'flag_w', 'flag_r', 'flag_g', 'flag_y'];
    for (let i = 0; i < 10; i++) P.add(fl[i % 5], B(-5.4 + i * 1.08, 8.6 - Math.sin(i / 9 * Math.PI) * 0.7 - 0.9, 3.8, -4.5 + i * 1.08, 8.6 - Math.sin(i / 9 * Math.PI) * 0.7, 3.84, 1, 1));
  });

  /* ---------- 新疆·维吾尔：土黄夯土墙、拱窗、木阳台 ---------- */
  def('h_xj', (P) => {
    const [tw, th] = sz('w_xj');
    P.add('w_xj', B(-6, 0, -4.5, 6, 6.2, 4.5, tw, th)); P.add('ochre', B(-6.2, 6.2, -4.7, 6.2, 6.7, 4.7, 3, 1)); P.add('r_flat', B(-5.9, 6.1, -4.4, 5.9, 6.25, 4.4, 4, 4));
    P.add('w_xj', B(-3, 6.2, -4.5, 3, 8.8, 0.5, tw, th)); P.add('ochre', B(-3.2, 8.8, -4.7, 3.2, 9.2, 0.7, 3, 1));
    P.add('wood', B(-5, 3.3, 4.5, 5, 3.5, 5.8, 2, 2)); for (const x of [-4.8, -1.6, 1.6, 4.8]) P.add('wood', B(x - 0.1, 0.0, 5.6, x + 0.1, 3.3, 5.8, 1, 2));
    P.add('wood', B(-5, 3.5, 5.7, 5, 4.5, 5.78, 2, 1)); P.add('turq', B(-5, 4.5, 5.6, 5, 4.7, 5.9, 2, 1)); P.add('wood', B(-5, 5.6, 4.5, 5, 5.8, 5.8, 2, 2));
    P.add('wood', B(-1.0, 0, 4.5, 1.0, 2.6, 4.62, 2, 2.6)); plinth(P, 12, 9, 0.3);
  });

  /* ---------- 内蒙古：蒙古包 ---------- */
  def('h_yurt', (P) => {
    P.add('white', BKit.cyl(3.4, 3.4, 0, 1.7, 20, 3, 3));
    P.add('white', BKit.cyl(0.55, 3.7, 1.7, 3.9, 20, 3, 3));
    P.add('blue_pat', BKit.cyl(3.45, 3.45, 1.25, 1.55, 20, 3, 1)); P.add('blue_pat', BKit.cyl(3.0, 3.35, 1.78, 1.98, 20, 3, 1));
    P.add('dark', BKit.cyl(0.9, 0.9, 3.78, 4.05, 14, 2, 1)); P.add('dark', BKit.cyl(0.35, 0.55, 4.05, 4.3, 10, 2, 1));
    P.add('red_wood', B(-0.55, 0, 3.15, 0.55, 1.55, 3.55, 1, 1.5)); P.add('gold', B(-0.45, 1.55, 3.3, 0.45, 1.7, 3.5, 1, 1));
    for (let i = 0; i < 4; i++) P.add('dark', BKit.cyl(3.72 - i * 0.55, 3.76 - i * 0.55, 1.9 + i * 0.5, 1.96 + i * 0.5, 20, 3, 1));
  });

  /* ---------- 东北：木刻楞 / 红铁皮屋顶 + 砖烟囱 ---------- */
  def('h_ne', (P) => {
    gableHouse(P, { W: 12, D: 8, wh: 3.2, wall: 'w_ne', roof: 'r_red', rise: 2.7, over: 0.7 });
    plinth(P, 12, 8, 0.35); door(P, 2.5, 8, 1.2, 2.2, 'white');
    P.add('brick', B(-3.6, 3.0, -0.45, -2.8, 7.6, 0.45, 1, 1)); P.add('dark', B(-3.75, 7.6, -0.6, -2.65, 7.85, 0.6, 1, 1));
    P.add('wood', B(-6.4, 0, 3.2, -1.8, 0.5, 4.8, 2, 1)); P.add('wood', B(-6.2, 0.5, 3.4, -2.0, 2.6, 4.6, 2, 2.6, true));
    P.add('wood', B(-5.8, 0, -6.2, -2, 1.2, -4.1, 2, 2)); P.add('r_steel', BKit.gable(-6.0, -6.4, -1.8, -3.9, 1.2, 1.2, 0.3, 'x', 4, 4).roof);   // 柴火垛
  });

  /* ---------- 华北：灰砖房 + 灰瓦 + 红门（带院墙） ---------- */
  def('h_huabei', (P) => {
    gableHouse(P, { W: 10, D: 6, wh: 3.5, wall: 'brick_gray', roof: 'r_gray', rise: 1.7, over: 0.6 });
    plinth(P, 10, 6, 0.5); door(P, 0, 6, 1.4, 2.4);
    P.add('white', B(-3.3, 1.2, 3.0, -1.6, 2.4, 3.08, 2, 2)); P.add('white', B(1.6, 1.2, 3.0, 3.3, 2.4, 3.08, 2, 2));
    ring(P, -8, -5.5, 8, 9, 2.2, 0.35, 'brick_gray', 1.2);
    P.add('red_wood', B(-1.2, 0, 8.6, 1.2, 2.5, 8.9, 2, 2.5)); P.add('r_gray', BKit.gable(-1.8, 8.4, 1.8, 9.1, 2.5, 0.6, 0.3, 'x', 4, 4).roof);
  });
  def('h_huabei_row', (P) => {
    for (let i = 0; i < 3; i++) { const Q = new BKit.Proto(); gableHouse(Q, { W: 8, D: 6, wh: 3.4, wall: 'brick', roof: 'r_gray', rise: 1.6, over: 0.55 }); Q.add('stone', B(-4.15, -1.4, -3.15, 4.15, 0.4, 3.15, 3, 2)); Q.add('red_wood', B(-0.7, 0.4, 3, 0.7, 2.4, 3.14, 2, 2.4)); for (const k in Q.parts) Q.parts[k].forEach(p => P.add(k, p.geo, p.pos[0] + (i - 1) * 8.4, p.pos[1], p.pos[2], p.rot[1], ...p.scale)); }
  });

  /* ---------- 江南：粉墙黛瓦、马头墙、石基 ---------- */
  def('h_jn', (P) => {
    const W = 12, D = 7, wh = 6.6, [tw, th] = sz('w_jn');
    P.add('w_jn', B(-W / 2, 0, -D / 2, W / 2, wh, D / 2, tw, th)); plinth(P, W, D, 0.6);
    const g = BKit.gable(-W / 2, -D / 2, W / 2, D / 2, wh, 2.3, 0.6, 'x', 4, 4); P.add('r_slate', g.roof);
    // 马头墙：山墙两侧阶梯状封火墙，黑瓦压顶
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2); const steps = [[-3.5, -1.8, 0.9], [-1.8, 0.2, 1.7], [0.2, 1.8, 1.7], [1.8, 3.5, 0.9]];
      steps.forEach(([z0, z1, hh]) => { P.add('w_jn', B(x - 0.2, wh - 0.4, z0, x + 0.2, wh + hh, z1, tw, th)); P.add('dark', B(x - 0.3, wh + hh, z0, x + 0.3, wh + hh + 0.14, z1, 1, 1)); });
    }
    door(P, 0, D, 1.6, 2.7, 'wood'); P.add('r_slate', BKit.gable(-1.2, D / 2, 1.2, D / 2 + 0.9, 2.9, 0.5, 0.2, 'x', 4, 4).roof);
    P.add('wood', B(-4.5, 3.4, D / 2, -1.5, 3.55, D / 2 + 0.8, 1, 1)); P.add('wood', B(1.5, 3.4, D / 2, 4.5, 3.55, D / 2 + 0.8, 1, 1));
  });
  def('h_jn_row', (P) => {
    for (let i = 0; i < 3; i++) { const Q = new BKit.Proto(); defs.h_jn(Q); const ox = (i - 1) * 12.1; for (const k in Q.parts) Q.parts[k].forEach(p => P.add(k, p.geo, p.pos[0] + ox, p.pos[1], p.pos[2], p.rot[1], ...p.scale)); }
  });

  /* ---------- 华南：三层自建房 + 屋顶水箱/太阳能；以及红瓦别墅 ---------- */
  def('h_hn', (P) => {
    const [tw, th] = sz('w_hn');
    P.add('w_hn', B(-6, 0, -4, 6, 9.6, 4, tw, th)); plinth(P, 12, 8, 0.4);
    P.add('white', B(-6.2, 9.6, -4.2, 6.2, 10.4, 4.2, 3, 1)); P.add('r_flat', B(-5.8, 9.55, -3.8, 5.8, 9.7, 3.8, 4, 4));
    P.add('w_hn', B(-6, 10.4, -4, -1.5, 13.0, 0, tw, th)); P.add('r_red', BKit.gable(-6, -4, -1.5, 0, 13.0, 1.5, 0.4, 'x', 4, 4).roof);   // 楼梯间
    P.add('white', BKit.cyl(0.85, 0.85, 10.4, 12.0, 14, 2, 2), 3.4, 0, 1.6); P.add('metal', BKit.cyl(0.9, 0.9, 11.9, 12.1, 14, 2, 2), 3.4, 0, 1.6);
    P.add('dark', B(0.4, 10.4, 1.8, 2.6, 11.8, 2.0, 1, 1)); P.add('metal', B(0.4, 10.4, 2.0, 2.6, 10.55, 2.5, 1, 1));
    door(P, 0, 8, 2.0, 2.6, 'metal'); P.add('metal', B(-5.8, 3.2, 4, 5.8, 3.3, 4.9, 2, 2)); P.add('metal', B(-5.8, 6.4, 4, 5.8, 6.5, 4.9, 2, 2));
  });
  def('h_villa', (P) => {
    gableHouse(P, { W: 11, D: 8, wh: 6.4, wall: 'w_hn', roof: 'r_red', rise: 2.6, over: 0.9 }); plinth(P, 11, 8, 0.5);
    P.add('r_red', BKit.gable(-2.5, 4, 2.5, 7, 3.0, 1.4, 0.3, 'z', 4, 4).roof); P.add('w_hn', B(-2.5, 0.5, 4, 2.5, 3.0, 7, 12, 9.6));
    P.add('white', B(-2.6, 0.5, 6.9, -2.3, 3.0, 7.2, 1, 3)); P.add('white', B(2.3, 0.5, 6.9, 2.6, 3.0, 7.2, 1, 3)); door(P, 0, 8, 1.6, 2.6, 'wood');
  });

  /* ---------- 现代农村：二层白瓷砖楼房 + 彩钢瓦 + 太阳能热水器 ---------- */
  def('h_farm', (P) => {
    gableHouse(P, { W: 12, D: 9, wh: 6.4, wall: 'w_farm', roof: 'r_blue', rise: 2.2, over: 0.7 }); plinth(P, 12, 9, 0.45);
    door(P, 0, 9, 1.6, 2.6, 'metal'); P.add('metal', B(-5.5, 3.25, 4.5, 5.5, 3.37, 5.4, 2, 2));
    P.add('dark', B(1.4, 8.2, -0.4, 4.0, 8.35, 2.0, 1, 1)); P.add('metal', BKit.cyl(0.06, 0.06, 8.3, 8.9, 6, 1, 1), 1.8, 0, 1.6); P.add('metal', BKit.cyl(0.06, 0.06, 8.3, 8.9, 6, 1, 1), 3.6, 0, 1.6);
    P.add('white', BKit.cyl(0.55, 0.55, 8.2, 9.0, 10, 1, 1), -3.0, 0, -0.8);
    P.add('w_farm', B(-6, 0, -9.5, 0.5, 3.2, -4.5, 12, 6.4)); P.add('r_steel', BKit.gable(-6, -9.5, 0.5, -4.5, 3.2, 1.0, 0.4, 'x', 4, 4).roof);   // 偏房
  });
  def('h_shed', (P) => {
    P.add('white', B(-5, 0, -3, 5, 3.6, 3, 4, 3.6)); P.add('r_blue', BKit.gable(-5, -3, 5, 3, 3.6, 1.0, 0.4, 'x', 4, 4).roof);
    P.add('dark', B(-1.6, 0, 3, 1.6, 3.0, 3.1, 2, 3)); plinth(P, 10, 6, 0.2);
  });

  /* ---------- 大棚 / 厂房 / 仓库 ---------- */
  def('greenhouse', (P) => {
    const L = 36, R = 4.2;
    for (let i = 0; i <= 12; i++) { const z = -L / 2 + i * L / 12; P.add('metal', new THREE.TorusGeometry(R, 0.05, 5, 14, Math.PI), 0, 0, z, 0, 1, 0.55, 1); }
    const gg = new THREE.CylinderGeometry(R, R, L, 16, 1, true, -Math.PI / 2, Math.PI); gg.rotateX(-Math.PI / 2); gg.scale(1, 0.55, 1);
    const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * 4);
    P.add('plastic', gg, 0, 0, 0, 0, 1, 1, 1);
    P.add('plastic', new THREE.CircleGeometry(R, 14, 0, Math.PI), 0, 0, L / 2, 0, 1, 0.55, 1); P.add('plastic', new THREE.CircleGeometry(R, 14, 0, Math.PI), 0, 0, -L / 2, Math.PI, 1, 0.55, 1);
  });
  def('h_fact', (P) => {
    P.add('w_farm', B(-22, 0, -9, 22, 8.0, 9, 12, 6.4)); P.add('r_blue', BKit.gable(-22, -9, 22, 9, 8.0, 1.8, 0.5, 'x', 4, 4).roof); P.add('w_farm', BKit.gable(-22, -9, 22, 9, 8.0, 1.8, 0.5, 'x', 4, 4).ends);
    P.add('dark', B(-20, 0, 9, -14, 5, 9.2, 2, 3)); P.add('dark', B(-12, 0, 9, -6, 5, 9.2, 2, 3)); P.add('dark', B(6, 0, 9, 12, 5, 9.2, 2, 3));
    P.add('w_farm', B(22, 0, -6, 34, 5, 5, 12, 6.4)); P.add('r_steel', B(21.8, 5, -6.2, 34.2, 5.25, 5.2, 4, 4));
    P.add('brick', BKit.cyl(0.9, 1.6, 0, 30, 14, 3, 5), -26, 0, -2); P.add('red_wall', BKit.cyl(1.0, 1.05, 24, 26, 14, 2, 2), -26, 0, -2); P.add('white', BKit.cyl(0.97, 1.0, 26, 28, 14, 2, 2), -26, 0, -2);
    for (let i = 0; i < 2; i++) { P.add('metal', BKit.cyl(2.6, 2.6, 0, 11, 16, 3, 3), 28 + i * 6.2, 0, -12); P.add('metal', BKit.cyl(0.1, 2.7, 11, 13, 16, 3, 3), 28 + i * 6.2, 0, -12); }
    P.add('metal', B(-6, 8, -9.6, 6, 8.5, -9.0, 2, 2));
  });

  /* ---------- 白塔（嘛呢堆/佛塔）---------- */
  def('stupa', (P) => {
    P.add('white', B(-3, 0, -3, 3, 1.2, 3, 3, 3)); P.add('white', B(-2.4, 1.2, -2.4, 2.4, 2.4, 2.4, 3, 3)); P.add('maroon', B(-2.5, 2.2, -2.5, 2.5, 2.45, 2.5, 3, 1));
    const dome = new THREE.SphereGeometry(2.0, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2); P.add('white', dome, 0, 2.4, 0, 0, 1, 1.05, 1);
    P.add('white', BKit.cyl(1.1, 1.3, 4.4, 5.6, 12, 2, 2)); P.add('gold', BKit.cyl(0.9, 0.9, 5.6, 5.8, 12, 2, 2));
    for (let i = 0; i < 7; i++) P.add('gold', BKit.cyl(0.78 - i * 0.09, 0.84 - i * 0.09, 5.8 + i * 0.28, 6.04 + i * 0.28, 12, 2, 2));
    P.add('gold', new THREE.SphereGeometry(0.45, 10, 8), 0, 8.0, 0); P.add('gold', BKit.cyl(0.04, 0.04, 8.2, 9.0, 5, 1, 1));
  });

  /* ---------- 高压铁塔 ---------- */
  def('pylon', (P) => {
    const H = 38, k = 'metal';
    const leg = (sx, sz) => { P.add(k, B(0, 0, 0, 0.35, H, 0.35, 1, 1), 0, 0, 0); };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const bx = sx * 3.4, bz = sz * 3.4, tx = sx * 0.9, tz = sz * 0.9, N = 8;
      for (let i = 0; i < N; i++) { const t0 = i / N, t1 = (i + 1) / N, y0 = t0 * H * 0.78, y1 = t1 * H * 0.78; const x0 = bx + (tx - bx) * t0, x1 = bx + (tx - bx) * t1, z0 = bz + (tz - bz) * t0, z1 = bz + (tz - bz) * t1; P.add(k, B(Math.min(x0, x1) - 0.12, y0, Math.min(z0, z1) - 0.12, Math.max(x0, x1) + 0.12, y1, Math.max(z0, z1) + 0.12, 1, 1)); }
    }
    for (let i = 1; i <= 6; i++) { const y = i / 7 * H * 0.78, w = 3.4 - (3.4 - 0.9) * (y / (H * 0.78)); P.add(k, B(-w, y, -w - 0.05, w, y + 0.18, -w + 0.12, 1, 1)); P.add(k, B(-w, y, w - 0.12, w, y + 0.18, w + 0.05, 1, 1)); P.add(k, B(-w - 0.05, y, -w, -w + 0.12, y + 0.18, w, 1, 1)); P.add(k, B(w - 0.12, y, -w, w + 0.05, y + 0.18, w, 1, 1)); }
    P.add(k, B(-0.9, H * 0.78, -0.9, 0.9, H, 0.9, 1, 1));
    for (const y of [H * 0.80, H * 0.90]) { P.add(k, B(-8, y, -0.12, 8, y + 0.28, 0.12, 1, 1)); for (const x of [-7.4, -4, 4, 7.4]) P.add('glass_ins', BKit.cyl(0.18, 0.18, y - 1.6, y, 8, 1, 1), x, 0, 0); }
    P.add(k, B(-0.1, H, -0.1, 0.1, H + 4, 0.1, 1, 1));
  });

  /* ---------- 风力发电机（锥形塔筒 + 机舱 + 3 片渐缩叶片）。叶片作为独立旋转体，不入 Flora ---------- */
  function turbine(c, al, lat, scale) {
    const S = Scenery, G = S.geo, M = S.mat, H = 78 * (scale || 1);
    const tower = c.mk(turbine.tower, M(0xf0f1f2), (scale || 1), H, (scale || 1), true);
    c.put(tower, al, lat, 0);
    const holder = new THREE.Group(), hub = new THREE.Group(); holder.scale.setScalar(scale || 1);
    holder.add(c.mk(G.box, M(0xe8eaec), 3.2, 3.0, 8, true));
    holder.children[0].position.set(0, -1.4, -2.5);
    const nose = c.mk(G.sph, M(0xeceef0), 1.5, 1.5, 1.8); nose.position.set(0, 0.1, 2.4); hub.add(nose);
    for (let k = 0; k < 3; k++) {
      const b = new THREE.Mesh(turbine.blade, M(0xf4f6f8)); b.rotation.z = k * Math.PI * 2 / 3; b.castShadow = true; hub.add(b);
    }
    hub.userData = { rotor: true, spd: 0.9 + c.rnd() * 0.5 }; hub.position.set(0, 0, 3.4); holder.add(hub);
    c.put(holder, al, lat, H, c.tangentAngle(al) + Math.PI / 2 + (c.rnd() - 0.5) * 0.4); Scenery.rotors.push(hub);
  }
  turbine.tower = (() => { const g = new THREE.CylinderGeometry(1.0, 2.1, 1, 14); g.translate(0, 0.5, 0); return g; })();
  turbine.blade = (() => {   // 渐缩叶片：根部弦长大、尖端小，带少许扭转
    const b = new BKit.Builder(), L = 38, N = 8;
    const pt = (t, side) => { const chord = 3.0 * (1 - t) + 0.5 * t, y = 1.2 + t * L, tw = 0.3 * t; return [(side * chord * 0.5) + tw, y, side * 0.12 * (1 - t)]; };
    for (let i = 0; i < N; i++) { const t0 = i / N, t1 = (i + 1) / N; b.quad(pt(t0, -1), pt(t0, 1), pt(t1, 1), pt(t1, -1), [0, t0], [1, t0], [1, t1], [0, t1]); b.quad(pt(t0, 1), pt(t0, -1), pt(t1, -1), pt(t1, 1), [0, t0], [1, t0], [1, t1], [0, t1]); }
    return b.geo();
  })();


  /* ---------- 车站：站台段、站房、路灯 ---------- */
  def('lamp', (P) => {
    P.add('metal', BKit.cyl(0.1, 0.17, 0, 8, 8, 2, 2)); P.add('metal', B(-0.05, 7.7, 0, 0.05, 7.82, 1.9, 1, 1)); P.add('lamp_head', B(-0.28, 7.52, 1.5, 0.28, 7.72, 2.1, 1, 1));
  });
  // 站台一段（长 20m）。双线侧式站台：局部 x>0 为线路左侧(本车股道 x=+2.5 一侧)，x<0 为右侧
  def('platform20', (P) => {
    for (const sx of [1, -1]) {
      const X = (a, b) => sx > 0 ? [a, b] : [-b, -a];
      const [p0, p1] = X(4.3, 11.3), [y0, y1] = X(4.45, 4.95);
      P.add('stone', B(p0, 0, -10, p1, 1.25, 10, 3, 3)); P.add('yellow', B(y0, 1.25, -10, y1, 1.28, 10, 1, 1));
      P.add('white', B(sx > 0 ? 4.3 : -4.6, 0.95, -10, sx > 0 ? 4.6 : -4.3, 1.25, 10, 1, 1));
      const cx = sx * 10.4;
      for (const z of [-9, 9]) { P.add('metal', BKit.cyl(0.2, 0.2, 1.2, 7.6, 10, 2, 2), cx, 0, z); P.add('white', B(cx - 0.25, 7.2, z - 0.3, cx + 0.25, 7.6, z + 0.3, 1, 1)); }
      const [r0, r1] = X(3.9, 11.9);
      P.add('r_steel', B(r0, 7.55, -10.2, r1, 7.8, 10.2, 4, 4)); P.add('white', B(sx > 0 ? 3.7 : -4.0, 7.5, -10.3, sx > 0 ? 4.0 : -3.7, 7.9, 10.3, 1, 1));
      P.add('lamp_head', B(sx * 6.5 - 0.3, 7.48, -3, sx * 6.5 + 0.3, 7.54, 3, 1, 1));
      const bx = sx * 9.0;
      P.add('wood', B(bx - 0.6, 1.25, -2.2, bx + 0.6, 1.68, 2.2, 1, 1)); P.add('wood', B(sx > 0 ? bx + 0.4 : bx - 0.6, 1.68, -2.2, sx > 0 ? bx + 0.6 : bx - 0.4, 2.3, 2.2, 1, 1));
    }
  });
  // 站房：局部 x 从 30 到 78（正面朝 -x，朝向线路），沿 z ±56
  def('station_hall', (P) => {
    const [tw, th] = sz('gl_gray'), [ow, oh] = sz('office');
    P.add('stone', B(29, 0, -60, 83, 1.4, 60, 4, 4));
    P.add('gl_gray', B(33, 1.4, -54, 79, 21, 54, tw, th));
    for (let z = -50; z <= 50; z += 12.5) P.add('white', B(32.6, 1.4, z - 0.4, 33.4, 21, z + 0.4, 1, 1));
    const g = BKit.gable(33, -54, 79, 54, 21, 8, 5, 'z', 4, 4); P.add('r_steel', g.roof); P.add('white', g.ends);
    P.add('white', B(27, 12.2, -44, 34, 13, 44, 4, 4)); for (let z = -42; z <= 42; z += 12) P.add('white', BKit.cyl(0.55, 0.55, 1.4, 12.2, 12, 2, 4), 28, 0, z);
    P.add('office', B(33, 1.4, 54, 73, 13, 82, ow, oh)); P.add('r_flat', B(32.8, 13, 53.8, 73.2, 13.4, 82.2, 4, 4));
    P.add('office', B(33, 1.4, -82, 73, 13, -54, ow, oh)); P.add('r_flat', B(32.8, 13, -82.2, 73.2, 13.4, -53.8, 4, 4));
    P.add('dark', B(32.7, 2.0, -12, 33.4, 8, 12, 2, 2));
  });

  /* ---------- 各地区的村落风格 ---------- */
  const STYLES = {
    yunnan: [{ n: 'h_bai', w: 12, d: 8, weight: 3 }, { n: 'h_bai_court', w: 30, d: 28, weight: 1 }, { n: 'h_dai', w: 9, d: 10, weight: 1.2 }, { n: 'h_farm', w: 12, d: 9, weight: 1 }],
    tibet: [{ n: 'h_tibet', w: 12, d: 9, weight: 4 }, { n: 'h_shed', w: 10, d: 6, weight: 0.5 }],
    xinjiang: [{ n: 'h_xj', w: 12, d: 9, weight: 4 }, { n: 'h_farm', w: 12, d: 9, weight: 1 }],
    gobi: [{ n: 'h_xj', w: 12, d: 9, weight: 2 }, { n: 'h_farm', w: 12, d: 9, weight: 2 }, { n: 'h_shed', w: 10, d: 6, weight: 1 }],
    grassland: [{ n: 'h_yurt', w: 9, d: 9, weight: 3 }, { n: 'h_farm', w: 12, d: 9, weight: 0.8 }, { n: 'h_shed', w: 10, d: 6, weight: 1 }],
    snowforest: [{ n: 'h_ne', w: 12, d: 8, weight: 4 }, { n: 'h_farm', w: 12, d: 9, weight: 1 }],
    plain: [{ n: 'h_huabei', w: 17, d: 14, weight: 3 }, { n: 'h_huabei_row', w: 26, d: 7, weight: 1 }, { n: 'h_farm', w: 12, d: 9, weight: 2 }, { n: 'h_shed', w: 10, d: 6, weight: 1 }],
    water: [{ n: 'h_jn_row', w: 36, d: 7, weight: 2 }, { n: 'h_jn', w: 12, d: 7, weight: 2 }, { n: 'h_farm', w: 12, d: 9, weight: 1 }],
    tropical: [{ n: 'h_hn', w: 12, d: 8, weight: 3 }, { n: 'h_villa', w: 11, d: 8, weight: 1 }, { n: 'h_farm', w: 12, d: 9, weight: 1 }]
  };

  // 高压线：每隔一块立一座铁塔，与下一座之间拉导线（带下垂）
  const wireMat = new THREE.LineBasicMaterial({ color: 0x20252a });
  function pylonSpan(ctx, lat, along) {
    if (ctx.index % 2 !== 0 || ctx.city) return;
    ensure('pylon'); const S = Scenery.CHUNK;
    const q = ctx.terrain.sample(along, lat), yaw = ctx.tangentAngle(along);
    if (ctx.noFlora(along, lat) && Math.abs(lat) < 60) return;
    if (window.Rivers) { const rq = Rivers.query(q.x, q.z); if (rq.r && rq.dist < rq.hw * 1.6 + 30) return; }
    Flora.add(ctx, 'pylon', q.x, q.h - 0.1, q.z, 1, 1, 1, yaw, new THREE.Color(0x9aa0a6));
    const s1 = (ctx.index + 2) * S + along, a1 = ctx.trackAt(s1), x1 = a1.pos.x - a1.tan.z * lat, z1 = a1.pos.z + a1.tan.x * lat, y1 = Terrain.height(s1, lat);
    const nx = Math.cos(yaw), nz = -Math.sin(yaw);        // 横担方向（局部 x）
    const H = 38, pts = [];
    for (const [off, hh] of [[-7.4, 0.80], [7.4, 0.80], [-7.4, 0.90], [7.4, 0.90], [0, 1.0]]) {
      const x0 = q.x + nx * off, z0 = q.z + nz * off, ya = q.h + H * hh, xb = x1 + nx * off, zb = z1 + nz * off, yb = y1 + H * hh;
      let px = x0, py = ya, pz = z0;
      for (let i = 1; i <= 14; i++) { const t = i / 14, x = x0 + (xb - x0) * t, z = z0 + (zb - z0) * t, y = ya + (yb - ya) * t - 5.5 * 4 * t * (1 - t); pts.push(px, py, pz, x, y, z); px = x; py = y; pz = z; }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const ln = new THREE.LineSegments(g, wireMat); ln.userData.own = true; ln.frustumCulled = false; ctx.group.add(ln);
  }

  // ---------- 放置接口 ----------
  // 在区块 ctx 的 (沿线 al, 侧向 lat) 放置一个原型；yawMode: 'track'(平行线路) / 'ortho'(垂直) / 'free'
  function place(ctx, name, al, lat, yawMode, tintHex, scale) {
    ensure(name);
    const q = ctx.terrain.sample(al, lat), base = ctx.tangentAngle(al);
    let yaw;
    if (yawMode === 'free') yaw = ctx.rnd() * 6.28;
    else if (yawMode === 'ortho') yaw = base + (ctx.rnd() < 0.5 ? 0 : Math.PI);                  // 山墙对着线路
    else yaw = base + (lat > 0 ? Math.PI / 2 : -Math.PI / 2);                                      // 长边平行线路，门朝线路
    yaw += (ctx.rnd() - 0.5) * 0.14;
    if (q.ny < 0.8 || q.h - (ctx.base || 0) < -0.8) return false;
    if (window.Rivers) { const rq = Rivers.query(q.x, q.z); if (rq.r && rq.dist < rq.hw * 2.2 + 20) return false; }
    const t = new THREE.Color(tintHex == null ? 0xffffff : tintHex), s = scale || 1;
    Flora.add(ctx, name, q.x, q.h - 0.02, q.z, s, s, s, yaw, t);
    return true;
  }
  // 村落：沿一条小路两侧成排布置；styles = [{n:原型名, w:占地长(沿路), d:占地宽, weight}]
  const TINTS = [0xffffff, 0xf7f1e6, 0xf3ece0, 0xeff2f5, 0xf8ece9];
  function village(ctx, cx, clat, styles, count, opts) {
    opts = opts || {};
    const tot = styles.reduce((s, a) => s + (a.weight || 1), 0); let al = cx - count * 5, placed = 0;
    for (let i = 0; i < count; i++) {
      let r = ctx.rnd() * tot, st = styles[0]; for (const a of styles) { r -= a.weight || 1; if (r <= 0) { st = a; break; } }
      const side = (i % 2 ? 1 : -1), pos = al + st.w * 0.5 + ctx.range(-1.5, 1.5), lat = clat + side * (st.d * 0.5 + 4.5 + ctx.range(0, 2.5));
      if (pos < 6 || pos > ctx.len - 6) { al += st.w * 0.5; continue; }
      if (Math.abs(lat) < 28 || ctx.noFlora(pos, lat) && !opts.city) { al += st.w * 0.5; continue; }
      if (place(ctx, st.n, pos, lat, 'track', ctx.pick(TINTS))) placed++;
      if (i % 2) al += st.w * 0.9 + ctx.range(1, 5);
    }
    return placed;
  }

  // 调试：把所有原型横向摆成一排（非实例化），便于检查外观
  function debugRow(scene, ox, oy, oz, names, gap) {
    names = names || Object.keys(defs); gap = gap || 40; const g = new THREE.Group(); let x = 0;
    names.forEach((n) => { const P = new BKit.Proto(); defs[n](P); const sub = P.build(BTex.mat), gg = new THREE.Group(); sub.forEach(s => { const m = new THREE.Mesh(s.geo, s.mat); m.castShadow = true; gg.add(m); }); gg.position.x = x; x += gap; g.add(gg); });
    g.position.set(ox, oy, oz); scene.add(g); return g;
  }
  window.Houses = { debugRow, ensure, place, village, turbine, pylonSpan, defs, TINTS, STYLES };
})();
