/* 各区域风景 (一): 通用助手 + 云南 / 西藏 / 新疆 / 甘肃戈壁。地貌由 terrain 决定，这里负责植被分布、村落(houses.js)与人文物件。 */
(function () {
  const S = Scenery, G = S.geo, M = S.mat, B = S.builders;
  const H = {};
  window.SceneryHelpers = H;
  const sc = (c, spec) => Flora.scatter(c, spec);

  // 常见组合：低矮植被 + 草丛 + 碎石
  H.ground = function (c, o) {
    o = Object.assign({ grass: 700, grassTint: [0x6e9a3e, 0x7aa545, 0x5f8a38], gLat: [5, 70], bush: 120, bushTint: [0x4d8a3a], rock: 40, rockLat: [10, 500], rockH: [0.8, 2.4] }, o);
    if (o.grass) sc(c, { proto: 'grass', n: o.grass, lat: o.gLat, skew: 1.2, h: [0.5, 0.95], w: 1.1, tint: o.grassTint, nyMin: 0.7 });
    if (o.bush) sc(c, { proto: 'bush', n: o.bush, lat: [7, 300], skew: 1.5, h: [0.8, 1.9], w: 1.3, tint: o.bushTint, cluster: { f: 0.006, thr: 0.4 }, seed: 3 });
    if (o.rock) sc(c, { proto: 'rock', n: o.rock, lat: o.rockLat, skew: 1.3, h: [o.rockH[0], o.rockH[1]], w: 1.4, tint: [0x8a867e, 0x7a7770, 0x9a958a], nyMin: 0.5, hMax: 9999 });
  };
  // 村落：随机概率出现一处，风格取决于地区
  H.village = function (c, o) {
    o = Object.assign({ p: 0.55, n: [6, 12] }, o);
    if (c.rnd() > o.p) return 0;
    const lat = c.sign() * c.range(42, 110), cnt = Math.floor(c.range(o.n[0], o.n[1]));
    return Houses.village(c, c.range(25, 135), lat, Houses.STYLES[c.region.type] || Houses.STYLES.plain, cnt);
  };
  H.power = function (c, lat) { Houses.pylonSpan(c, lat || 70, 80); };

  /* ---------- 云南：翠绿山林、红土、白族民居、傣家竹楼 ---------- */
  B.yunnan = function (c) {
    sc(c, { proto: 'conifer', n: 520, lat: [10, 650], skew: 1.7, h: [8, 17], w: 0.42, tint: [0x1e5a34, 0x2a6a3c, 0x225e38], cluster: { f: 0.0032, thr: 0.5 }, seed: 1 });
    sc(c, { proto: 'broad', n: 360, lat: [10, 520], skew: 1.7, h: [7, 13], w: 0.8, tint: [0x3e8a3c, 0x4a9a44, 0x35803a, 0x5aa244], cluster: { f: 0.004, thr: 0.45 }, seed: 9 });
    H.ground(c, { bush: 160, bushTint: [0x4d8a3a, 0x5a9a42, 0x6f9f3a] });
    H.village(c, { p: 0.6 }); H.power(c, 80);
  };

  /* ---------- 西藏：高原草甸、碎石、经幡、白塔、藏式民居、牦牛 ---------- */
  B.tibet = function (c) {
    H.ground(c, { grass: 650, grassTint: [0x8a8a4a, 0x7d8a45, 0x9a8f55], gLat: [5, 80], bush: 200, bushTint: [0x7b7a3c, 0x8a7f4a, 0x6f7a3c], rock: 180, rockH: [0.8, 3.8], rockLat: [10, 800] });
    sc(c, { proto: 'conifer', n: 120, lat: [20, 500], skew: 1.8, h: [7, 12], w: 0.4, tint: [0x274f36, 0x2f5a3c], cluster: { f: 0.004, thr: 0.62 }, seed: 5 });
    if (c.rnd() < 0.4) {
      const al = c.range(10, 130), lat = c.sign() * c.range(14, 26), ry = c.tangentAngle(al);
      for (let k = 0; k < 2; k++) c.put(c.mk(G.cyl, M(0x7b5a3a), 0.12, 6, 0.12), al + k * 24, lat, 0);
      const colors = [0x2f6df0, 0xffffff, 0xe63a2e, 0x2ea84a, 0xf4cc2a];
      for (let k = 0; k < 10; k++) c.put(c.mk(G.plane, new THREE.MeshLambertMaterial({ color: colors[k % 5], side: THREE.DoubleSide }), 1.6, 1.2, 1), al + 1.6 + k * 2.1, lat, 4.3 + Math.sin(k / 9 * Math.PI) * 0.6, ry + Math.PI / 2);
    }
    if (c.rnd() < 0.4) Houses.place(c, 'stupa', c.range(20, 140), c.sign() * c.range(24, 60), 'free', 0xffffff, c.range(0.9, 1.4));
    H.village(c, { p: 0.5, n: [5, 10] });
    if (c.rnd() < 0.55) {
      const al = c.range(10, 140), lat = c.sign() * c.range(18, 60);
      for (let k = 0; k < 4; k++) c.put(c.mk(G.sph, M(0x1e1a18), 1.6, 1.1, 0.8, true), al + c.range(-8, 8), lat + c.range(-6, 6), 1.1, c.range(0, 6));
    }
  };

  /* ---------- 新疆：戈壁绿洲、白杨防风林、红柳、风电、土坯房 ---------- */
  B.xinjiang = function (c) {
    H.ground(c, { grass: 250, grassTint: [0xa89a58, 0x9a9050], bush: 260, bushTint: [0x8a7a3a, 0xa8553a, 0x6a6a3a], rock: 140, rockLat: [10, 900] });
    sc(c, { proto: 'poplar', n: 260, lat: [14, 300], skew: 1.8, h: [10, 18], w: 0.22, tint: [0xd9a21b, 0xb8a020, 0x6aa33a, 0x8a9a2a], cluster: { f: 0.005, thr: 0.55 }, seed: 2 });
    sc(c, { proto: 'broad', n: 80, lat: [14, 260], skew: 1.8, h: [6, 10], w: 0.8, tint: [0x7a9a3a, 0x8a9a40], cluster: { f: 0.005, thr: 0.58 }, seed: 6 });
    if (c.rnd() < 0.55) {   // 路侧防风林带
      const lat = c.sign() * c.range(16, 36);
      for (let k = 0; k < 13; k++) { const q = c.terrain.sample(k * 12 + 4, lat); Flora.add(c, 'poplar', q.x, q.h - 0.05, q.z, 2.6, 13, 2.6, c.rnd() * 6, new THREE.Color(c.pick([0xd9a21b, 0x8a9a2a, 0xb8a020]))); }
    }
    if (c.rnd() < 0.5) Houses.turbine(c, c.range(20, 140), c.sign() * c.range(70, 260));
    H.village(c, { p: 0.45 }); H.power(c, 90);
  };

  /* ---------- 甘肃 / 戈壁：沙丘、丹霞、烽燧 ---------- */
  B.gobi = function (c) {
    H.ground(c, { grass: 90, grassTint: [0xa89a58], bush: 130, bushTint: [0x7a7a3a, 0x8a7a3a], rock: 360, rockH: [0.6, 3.2], rockLat: [9, 900] });
    sc(c, { proto: 'poplar', n: 60, lat: [20, 200], skew: 1.8, h: [8, 14], w: 0.22, tint: [0xb8a020, 0x8a9a2a], cluster: { f: 0.006, thr: 0.65 }, seed: 4 });
    if (c.rnd() < 0.25) {
      const al = c.range(20, 140), lat = c.sign() * c.range(40, 110);
      c.put(c.mk(G.box, M(0xc9a66a), 8, 12, 8, true), al, lat, 0);
      c.put(c.mk(G.box, M(0xb8935a), 9, 1, 9), al, lat, 12);
    }
    if (c.rnd() < 0.3) Houses.turbine(c, c.range(20, 140), c.sign() * c.range(80, 280));
    H.village(c, { p: 0.25, n: [4, 8] }); H.power(c, 100);
  };
})();
