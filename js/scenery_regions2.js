/* 各区域风景 (二): 内蒙古 / 东北 / 华北 / 江南 / 华南 */
(function () {
  const S = Scenery, G = S.geo, M = S.mat, H = SceneryHelpers, B = S.builders;
  const sc = (c, spec) => Flora.scatter(c, spec);

  /* ---------- 内蒙古：一望无际的草原、蒙古包群、羊群、敖包、风电 ---------- */
  B.grassland = function (c) {
    H.ground(c, { grass: 1100, grassTint: [0x7fae45, 0x8dba4c, 0x6f9c3e, 0xa3b050], gLat: [4, 110], bush: 70, bushTint: [0x6f9a3e, 0x8a9a45], rock: 25 });
    sc(c, { proto: 'bush', n: 180, lat: [6, 120], skew: 1.2, h: [0.25, 0.45], w: 1.0, tint: [0xf4d21f, 0xffffff, 0xd94fa0, 0x8f6af0], cluster: { f: 0.012, thr: 0.5 }, seed: 11 });   // 野花
    sc(c, { proto: 'broad', n: 70, lat: [40, 420], skew: 1.6, h: [6, 10], w: 0.8, tint: [0x7bb04a, 0x8cc050], cluster: { f: 0.004, thr: 0.62 }, seed: 12 });
    if (c.rnd() < 0.55) {   // 蒙古包群
      const n = 2 + Math.floor(c.rnd() * 4), al = c.range(20, 130), lat = c.sign() * c.range(35, 100);
      for (let k = 0; k < n; k++) Houses.place(c, 'h_yurt', al + k * 13 + c.range(-2, 2), lat + c.range(-9, 9), 'free', 0xffffff, c.range(0.9, 1.15));
      if (c.rnd() < 0.5) Houses.place(c, 'h_shed', al + n * 6, lat + 16, 'track', 0xffffff);
    }
    for (let g = 0; g < 2; g++) if (c.rnd() < 0.6) {
      const al = c.range(0, c.len), lat = c.sign() * c.range(14, 130), n = 8 + Math.floor(c.rnd() * 10), white = c.rnd() < 0.7;
      for (let k = 0; k < n; k++) c.put(c.mk(G.sph, M(white ? 0xf2f0e8 : 0x5a3a24), 0.7, 0.55, 0.45, true), al + c.range(-12, 12), lat + c.range(-12, 12), 0.6, c.range(0, 6));
    }
    if (c.rnd() < 0.15) { const al = c.range(20, 140), lat = c.sign() * c.range(25, 60); c.put(c.mk(G.cone, M(0x9a9a92), 4, 3.5, 4, true), al, lat, 0); c.put(c.mk(G.cyl, M(0x6a4a2a), 0.12, 5, 0.12), al, lat, 3); }
    if (c.rnd() < 0.4) Houses.turbine(c, c.range(20, 140), c.sign() * c.range(70, 260));
    H.power(c, 110);
  };

  /* ---------- 东北：雪原、针叶林、白桦、木刻楞 ---------- */
  B.snowforest = function (c) {
    sc(c, { proto: 'conifer', n: 760, lat: [9, 520], skew: 1.5, h: [9, 19], w: 0.4, tint: [0x274f3a, 0x2e5a40, 0x34664a, 0x1f4a34], cluster: { f: 0.0034, thr: 0.42 }, seed: 21, hMax: 9999 });
    sc(c, { proto: 'poplar', n: 220, lat: [9, 300], skew: 1.5, h: [8, 14], w: 0.2, tint: [0xe8e4d8, 0xdcd6c6, 0xe2dccc], cluster: { f: 0.005, thr: 0.5 }, seed: 22, hMax: 9999 });
    H.ground(c, { grass: 260, grassTint: [0xcdd6cc, 0xb8c4b6], bush: 120, bushTint: [0x3a5a44, 0x4a6a50], rock: 70, rockLat: [10, 400] });
    H.village(c, { p: 0.5, n: [4, 9] });
    if (c.rnd() < 0.12) {
      const al = c.range(20, 140), lat = c.sign() * c.range(14, 24);
      c.put(c.mk(G.sph, M(0xffffff), 1.1, 1.1, 1.1, true), al, lat, 1.1); c.put(c.mk(G.sph, M(0xffffff), 0.75, 0.75, 0.75, true), al, lat, 2.7); c.put(c.mk(G.cone, M(0xf08030), 0.12, 0.5, 0.12), al, lat, 2.7);
    }
    H.power(c, 90);
  };

  /* ---------- 华北：平原农田、杨树行、村落、大棚、厂房 ---------- */
  B.plain = function (c) {
    H.ground(c, { grass: 380, grassTint: [0x9aae4a, 0xaab850], gLat: [5, 60], bush: 90, bushTint: [0x6f9a3a], rock: 12 });
    const lat = c.sign() * c.range(14, 24);
    for (let k = 0; k < 12; k++) { const q = c.terrain.sample(k * 13 + 3, lat); Flora.add(c, 'poplar', q.x, q.h - 0.05, q.z, 2.4, 12, 2.4, c.rnd() * 6, new THREE.Color(0x5ea23a).multiplyScalar(0.85 + c.rnd() * 0.3)); }
    sc(c, { proto: 'broad', n: 160, lat: [20, 400], skew: 1.5, h: [7, 12], w: 0.8, tint: [0x5ea23a, 0x6aae44, 0x4f9438], cluster: { f: 0.005, thr: 0.6 }, seed: 31 });
    sc(c, { proto: 'poplar', n: 140, lat: [20, 400], skew: 1.5, h: [10, 17], w: 0.22, tint: [0x5ea23a, 0x7ab044], cluster: { f: 0.007, thr: 0.62 }, seed: 32 });
    H.village(c, { p: 0.55 });
    if (c.rnd() < 0.3) { const al = c.range(25, 135), lt = c.sign() * c.range(70, 150); for (let k = 0; k < 3; k++) Houses.place(c, 'greenhouse', al + k * 0, lt + k * 12, 'ortho', 0xffffff); }
    if (c.rnd() < 0.12) Houses.place(c, 'h_fact', c.range(40, 120), c.sign() * c.range(110, 200), 'ortho', 0xffffff);
    H.power(c, 75);
  };

  /* ---------- 江南：水乡、粉墙黛瓦+马头墙、垂柳、竹林 ---------- */
  B.water = function (c) {
    H.ground(c, { grass: 700, grassTint: [0x6fae52, 0x7cba5a, 0x5f9f48], bush: 160, bushTint: [0x4f9a42, 0x5aa648], rock: 30 });
    sc(c, { proto: 'broad', n: 420, lat: [9, 420], skew: 1.6, h: [6, 13], w: 0.85, tint: [0x8cc65a, 0x6fb04a, 0x58a043, 0x4f9438], cluster: { f: 0.0045, thr: 0.45 }, seed: 41 });
    sc(c, { proto: 'poplar', n: 360, lat: [12, 280], skew: 1.5, h: [7, 12], w: 0.3, tint: [0x7ab83a, 0x68a832, 0x8cc84a], cluster: { f: 0.006, thr: 0.58 }, seed: 42 });   // 竹林
    H.village(c, { p: 0.7, n: [4, 8] }); H.power(c, 85);
  };

  /* ---------- 华南：棕榈、芭蕉、热带雨林、自建房 ---------- */
  B.tropical = function (c) {
    H.ground(c, { grass: 800, grassTint: [0x58a844, 0x6ab84e, 0x4c9a3c], bush: 260, bushTint: [0x3f8a3c, 0x4f9a42, 0x6aae44], rock: 40 });
    sc(c, { proto: 'palm', n: 320, lat: [9, 360], skew: 1.5, h: [7, 13], w: 0.6, tint: [0xffffff, 0xe8f4e0, 0xf4ffe8], cluster: { f: 0.005, thr: 0.45 }, seed: 51 });
    sc(c, { proto: 'broad', n: 480, lat: [9, 500], skew: 1.5, h: [8, 16], w: 0.9, tint: [0x2f7f3a, 0x3a8f42, 0x2a7a38, 0x4a9a44], cluster: { f: 0.0035, thr: 0.42 }, seed: 52 });
    H.village(c, { p: 0.65 }); H.power(c, 80);
  };
})();
