/* 河流：在指定城市附近横穿线路的大河（蜿蜒河道 + 河床 + 漫滩），供地形下切、水面、特大桥使用。
   河道在穿越点附近保持顺直（便于架桥），远离后开始蜿蜒，两端收窄消失。 */
(function () {
  const L = Route.LENGTH, curve = Route.curve;
  // city: 参照城市；off: 相对城市的弧长偏移；w: 河宽；ang: 与线路切向的夹角；type: 桥型
  const DEFS = [
    { name: '澜沧江', city: '大理', off: 2700, w: 150, ang: 1.30, amp: 260, type: 'arch', color: 0xc23b2b },
    { name: '雅鲁藏布江', city: '林芝', off: 820, w: 230, ang: 1.85, amp: 320, type: 'truss', color: 0x5f6f7a },
    { name: '孔雀河', city: '库尔勒', off: -700, w: 90, ang: 1.45, amp: 180, type: 'girder' },
    { name: '黄河', city: '兰州', off: 760, w: 300, ang: 1.40, amp: 420, type: 'arch', color: 0xd8dde0 },
    { name: '松花江', city: '哈尔滨', off: 900, w: 380, ang: 1.62, amp: 380, type: 'truss', color: 0x4b6b5e },
    { name: '钱塘江', city: '杭州', off: 500, w: 300, ang: 1.80, amp: 460, type: 'truss', color: 0x7b8a92 },
    { name: '珠江', city: '广州', off: 700, w: 360, ang: 1.38, amp: 420, type: 'cable', color: 0xf2f2f2 }
  ];
  const T = 5200, STEP = 60;
  const list = [];

  function tangentAt(s) { const t = curve.getTangentAt(Route.wrap(s) / L); t.y = 0; return t.normalize(); }

  DEFS.forEach((d) => {
    const city = Route.CITIES.find(c => c.name === d.city && !c.loop); if (!city) return;
    const sc = Route.wrap(city.s + d.off), C = curve.getPointAt(sc / L), tg = tangentAt(sc);
    const a = Math.atan2(tg.z, tg.x) + d.ang, D = new THREE.Vector2(Math.cos(a), Math.sin(a)), Nn = new THREE.Vector2(-D.y, D.x);
    const lam = 900 + (d.w % 7) * 60, ph = d.w * 0.013;
    const pts = [];
    for (let t = -T; t <= T; t += STEP) {
      const m = d.amp * Math.sin(t / lam + ph) * Noise.smooth(250, 1100, Math.abs(t));
      pts.push({ x: C.x + D.x * t + Nn.x * m, z: C.z + D.y * t + Nn.y * m, t });
    }
    // 防止河道再次碰到线路的其他地段：从穿越点向两端检查，碰到就截断
    const fx = [], fz = []; for (let i = 0; i < 1400; i++) { const p = curve.getPointAt(i / 1400); fx.push(p.x); fz.push(p.z); }
    const near = (x, z, ignoreS) => {
      for (let i = 0; i < 1400; i++) {
        const s = i / 1400 * L; let ds = Math.abs(s - sc); if (ds > L / 2) ds = L - ds;
        if (ds < ignoreS) continue;
        if (Math.hypot(fx[i] - x, fz[i] - z) < d.w * 0.5 + 420) return true;
      }
      return false;
    };
    const mid = Math.floor(pts.length / 2); let lo = 0, hi = pts.length - 1;
    for (let i = mid; i < pts.length; i++) if (near(pts[i].x, pts[i].z, 1600)) { hi = i - 2; break; }
    for (let i = mid; i >= 0; i--) if (near(pts[i].x, pts[i].z, 1600)) { lo = i + 2; break; }
    const P = pts.slice(Math.max(0, lo), Math.min(pts.length, hi + 1)), tMin = P[0].t, tMax = P[P.length - 1].t;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; P.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
    const pad = d.w * 2;
    list.push(Object.assign({}, d, { sc, C, D, P, tMin, tMax, box: [x0 - pad, z0 - pad, x1 + pad, z1 + pad], base: 0 }));
  });

  // 到河流中心线的距离与该处半宽
  const q = { dist: 1e9, hw: 0, r: null };
  function query(x, z) {
    q.dist = 1e9; q.hw = 0; q.r = null;
    for (const r of list) {
      const b = r.box; if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
      const P = r.P;
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], c = P[i + 1], ex = c.x - a.x, ez = c.z - a.z, l2 = ex * ex + ez * ez;
        let t = ((x - a.x) * ex + (z - a.z) * ez) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = a.x + ex * t, pz = a.z + ez * t, dd = Math.hypot(x - px, z - pz);
        if (dd < q.dist) {
          const tt = a.t + (c.t - a.t) * t, edge = Math.min(tt - r.tMin, r.tMax - tt);
          q.dist = dd; q.hw = r.w * 0.5 * Noise.smooth(0, 900, edge); q.r = r;
        }
      }
    }
    return q;
  }

  // 地形下切：返回新的高度
  function carve(x, z, h) {
    if (!list.length) return h;
    const r = query(x, z); if (!r.r || r.hw < 1) return h;
    const u = r.dist / r.hw, base = r.r.base;
    if (u > 2.8) return h;
    const bank = base + 1.0, bed = base - 14, edge = base - 8.6;
    if (u < 1) return Math.min(h, bed + (edge - bed) * Noise.smooth(0.45, 1.0, u));
    if (u < 1.25) return Math.min(h, edge + (bank - edge) * Noise.smooth(1.0, 1.25, u));
    return h + (bank - h) * (1 - Noise.smooth(1.3, 2.8, u)) * (h > bank ? 1 : 0.85);
  }
  function wet(x, z) { const r = query(x, z); return r.r && r.dist < r.hw * 1.05; }
  function waterY(r) { return r.base - 9.2; }

  // 水面网格（每条河一个带状网格）
  function build(scene, waterMat) {
    list.forEach((r) => {
      const pos = [], idx = [], uv = [], y = waterY(r);
      r.P.forEach((p, i) => {
        const a = r.P[Math.max(0, i - 1)], b = r.P[Math.min(r.P.length - 1, i + 1)];
        let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
        const edge = Math.min(p.t - r.tMin, r.tMax - p.t), hw = r.w * 0.5 * Noise.smooth(0, 900, edge) * 1.04 + 2;
        pos.push(p.x - tz * hw, y, p.z + tx * hw, p.x + tz * hw, y, p.z - tx * hw);
        uv.push(p.x / 30, p.z / 30, (p.x + tz * hw) / 30, (p.z - tx * hw) / 30);
        if (i < r.P.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
      const m = new THREE.Mesh(g, waterMat); m.frustumCulled = false; m.receiveShadow = true; scene.add(m);
    });
  }

  // 某弧长处是否在河道上方（返回该河）
  function crossingAt(s, margin) {
    for (const r of list) { let ds = Math.abs(Route.wrap(s) - r.sc); if (ds > L / 2) ds = L - ds; if (ds < r.w * 0.5 / Math.max(0.3, Math.abs(Math.sin(r.ang))) + (margin || 0)) return r; }
    return null;
  }

  window.Rivers = { list, query, carve, wet, waterY, build, crossingAt };
})();
