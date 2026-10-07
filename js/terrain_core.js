/* 地形核心：高度场函数 F(x,z,s,d)、区域参数、最近轨道查询、调色板、湖泊。
   高度相对轨道面(0)。strips(近景)与全国远景网格共用同一函数，保证接缝连续。 */
(function () {
  const N = Noise, sm = N.smooth;
  const L = Route.LENGTH;

  // 区域地貌参数
  const PARAMS = {
    yunnan:     { base: 0,    roll: 34, mtn: 520,  thr: 0.40, dune: 0,  snowH: 1e9, tree: 700,  lake: 0.20 },
    tibet:      { base: 0,    roll: 24, mtn: 1600, thr: 0.28, dune: 0,  snowH: 520, tree: 80,   lake: 0.26 },
    xinjiang:   { base: -2,   roll: 10, mtn: 820,  thr: 0.36, dune: 10, snowH: 700, tree: 200,  lake: 0.06 },
    gobi:       { base: -1.5, roll: 9,  mtn: 330,  thr: 0.55, dune: 26, snowH: 1e9, tree: 100,  lake: 0.03 },
    grassland:  { base: -2,   roll: 38, mtn: 70,   thr: 0.70, dune: 0,  snowH: 1e9, tree: 300,  lake: 0.16 },
    snowforest: { base: -3,   roll: 30, mtn: 330,  thr: 0.50, dune: 0,  snowH: 1e9, tree: 500,  lake: 0.20 },
    plain:      { base: -9,   roll: 6,  mtn: 130,  thr: 0.68, dune: 0,  snowH: 1e9, tree: 200,  lake: 0.05 },
    water:      { base: -8.5, roll: 12, mtn: 260,  thr: 0.52, dune: 0,  snowH: 1e9, tree: 400,  lake: 0.34 },
    tropical:   { base: -5,   roll: 24, mtn: 560,  thr: 0.42, dune: 0,  snowH: 1e9, tree: 500,  lake: 0.12 }
  };
  const KEYS = ['base', 'roll', 'mtn', 'thr', 'dune', 'snowH', 'tree', 'lake'];
  const _blend = {};
  function paramsFor(ri) {           // ri = Route.regionAt(s)
    const A = PARAMS[ri.a.type], B = PARAMS[ri.b.type];
    for (const k of KEYS) _blend[k] = k === 'snowH' ? Math.min(A[k], B[k]) : A[k] + (B[k] - A[k]) * ri.k;
    _blend.snowH = ri.k < 0.5 ? A.snowH : B.snowH;
    _blend.type = ri.k < 0.5 ? ri.a.type : ri.b.type;
    return _blend;
  }

  // 湖泊：按 1100m 一块确定性生成，返回该块湖参数或 null
  const LAKE_BLOCK = 1100;
  function lakeIn(block, pLake) {
    const r = N.hash(block, 91);
    if (r > pLake) return null;
    return {
      sc: block * LAKE_BLOCK + 250 + N.hash(block, 7) * 600,
      lc: (N.hash(block, 13) < 0.5 ? -1 : 1) * (260 + N.hash(block, 29) * 460),
      R: 150 + N.hash(block, 41) * 250
    };
  }
  const WATER_REL = -1.2, BASIN_REL = -5;      // 湖面/湖底相对当地基准面
  function lakeAt(s, lat, pLake) {   // 返回 {w, ...}：w∈[0,1] 湖盆权重
    const b = Math.floor(s / LAKE_BLOCK);
    let best = 0;
    for (let k = b - 1; k <= b + 1; k++) {
      const lk = lakeIn(k, pLake); if (!lk) continue;
      const u = Math.hypot((s - lk.sc) / lk.R, (lat - lk.lc) / (lk.R * 0.72));
      if (u < 1) best = Math.max(best, sm(1.0, 0.5, u));
    }
    return best;
  }

  // 城市附近压平
  function cityFlat(s, d) {
    let m = 1e9;
    for (const c of Route.CITIES) { let a = Math.abs(s - c.s); if (a > L / 2) a = L - a; if (a < m) m = a; }
    return 1 - (1 - sm(500, 1500, m)) * (1 - sm(600, 1000, d));   // 1=不压平，0=压到基准面
  }

  // 隧道附近基准面回到 0（隧道总在山里）
  function tunnelProx(s) {
    s = Route.wrap(s); let m = 0;
    for (const t of Tunnels.list) { const d = s < t.s0 ? t.s0 - s : s > t.s1 ? s - t.s1 : 0; m = Math.max(m, 1 - sm(500, 1100, d)); }
    return m;
  }
  function baseAt(s, P) { return P.base * (1 - tunnelProx(s)); }

  // 自然地表（不含线路走廊/高架处理）
  function natural(x, z, s, d, lat, P) {
    const base = baseAt(s, P);
    let h = P.roll * (N.fbm(x * 0.0021, z * 0.0021, 4) - 0.42) * 2.0 + P.roll * 0.18 * (N.fbm(x * 0.013, z * 0.013, 2) - 0.5);
    if (P.dune > 0) {
      const ph = (x * 0.8 + z * 0.35) * 0.011 + 3.2 * N.fbm(x * 0.0018, z * 0.0018, 2);
      h += P.dune * Math.pow(0.5 + 0.5 * Math.sin(ph), 2.2) * sm(30, 220, d);
    }
    if (P.mtn > 0) {
      const macro = sm(P.thr, P.thr + 0.28, N.fbm(x * 0.00021 + 7.3, z * 0.00021 - 3.1, 3));
      if (macro > 0) h += P.mtn * macro * Math.pow(N.ridged(x * 0.00058, z * 0.00058, 5), 1.55) * sm(170, 900, d);
    }
    h = base + h * cityFlat(s, d);
    if (d > 130 && d < 1500) { const w = lakeAt(s, lat, P.lake); if (w > 0) h = h + (base + BASIN_REL - h) * w; }
    if (window.Rivers) h = Rivers.carve(x, z, h);
    return h;
  }

  // 高架系数表：线路中心处自然地表明显低于路基 → 高架桥（每 10m 一个样本，平滑过渡）
  const VS = 10, nV = Math.ceil(L / VS) + 1, VF = new Float32Array(nV), HN = new Float32Array(nV);
  function buildViaduct() {
    if (window.Rivers) Rivers.list.forEach(r => { r.base = baseAt(r.sc, paramsFor(Route.regionAt(r.sc))) ; });
    const raw = new Uint8Array(nV), p = new THREE.Vector3();
    for (let i = 0; i < nV; i++) {
      const s = Math.min(L - 0.01, i * VS); Route.curve.getPointAt(s / L, p);
      const P = paramsFor(Route.regionAt(s)), h = natural(p.x, p.z, s, 0, 0, P);
      HN[i] = h;
      raw[i] = (h < -3.0 || (window.Rivers && Rivers.crossingAt(s, 160))) && !Tunnels.inside(s, 160) ? 1 : 0;
    }
    // 填补短缺口（<260m）、去掉过短的高架（<160m）
    const runs = (val, fn) => { let i = 0; while (i < nV) { if (raw[i] !== val) { i++; continue; } let j = i; while (j < nV && raw[j] === val) j++; fn(i, j); i = j; } };
    runs(0, (i, j) => { if (i > 0 && j < nV && (j - i) * VS < 260) for (let k = i; k < j; k++) if (!Tunnels.inside(k * VS, 160)) raw[k] = 1; });
    runs(1, (i, j) => { if ((j - i) * VS < 160) for (let k = i; k < j; k++) raw[k] = 0; });
    for (let i = 0; i < nV; i++) { let a = 0, n = 0; for (let k = -4; k <= 4; k++) { const j = i + k; if (j >= 0 && j < nV) { a += raw[j]; n++; } } VF[i] = a / n; }
  }
  function vf(s) { s = Route.wrap(s) / VS; const i = Math.floor(s), f = s - i; return VF[Math.min(nV - 1, i)] * (1 - f) + VF[Math.min(nV - 1, i + 1)] * f; }

  // 高度场：x,z 世界坐标；s 弧长；d 离轨道中心距离；lat 有符号侧向；P 区域参数
  // 路堤段：近线路处压到路基面(-0.14)；高架段：保持自然地形，但桥下留足净空
  function F(x, z, s, d, lat, P) {
    const nat = natural(x, z, s, d, lat, P), c = sm(16, 130, d), emb = nat * c - 0.14 * (1 - c);
    const v = vf(s);
    if (v <= 0.001) return emb;
    const clear = -5.2, hv = nat - Math.max(0, nat - clear) * (1 - sm(10, 26, d));
    return emb + (hv - emb) * v;
  }

  // ---------- 最近轨道查询（粗/细两级） ----------
  const FINE = 25, COARSE = 16;                       // 细样 25m，粗样每 16 个 = 400m
  const nF = Math.ceil(L / FINE);
  const fx = new Float32Array(nF + 1), fz = new Float32Array(nF + 1);
  for (let i = 0; i <= nF; i++) { const p = Route.curve.getPointAt(Math.min(1, i * FINE / L)); fx[i] = p.x; fz[i] = p.z; }
  const out = { s: 0, d: 0, lat: 0 };
  function nearest(x, z) {
    let bi = 0, bd = 1e18;
    for (let i = 0; i < nF; i += COARSE) { const dx = fx[i] - x, dz = fz[i] - z, dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; bi = i; } }
    let fi = bi; bd = 1e18;
    for (let k = -COARSE - 2; k <= COARSE + 2; k++) {
      const i = ((bi + k) % nF + nF) % nF, dx = fx[i] - x, dz = fz[i] - z, dd = dx * dx + dz * dz;
      if (dd < bd) { bd = dd; fi = i; }
    }
    // 投影到相邻线段，得到精确弧长与侧向
    let bestD = 1e18, bs = fi * FINE, blat = 0;
    for (const j of [fi - 1, fi]) {
      const a = ((j % nF) + nF) % nF, b = (a + 1) % nF;
      const ax = fx[a], az = fz[a], bx = fx[b], bz = fz[b];
      let ex = bx - ax, ez = bz - az; const el = Math.hypot(ex, ez) || 1; ex /= el; ez /= el;
      let t = (x - ax) * ex + (z - az) * ez; t = Math.max(0, Math.min(el, t));
      const px = ax + ex * t, pz = az + ez * t, dd = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (dd < bestD) { bestD = dd; bs = a * FINE + t; blat = (x - px) * (-ez) + (z - pz) * ex; }
    }
    out.s = bs; out.d = Math.sqrt(bestD); out.lat = blat;
    return out;
  }

  // ---------- 调色板 ----------
  const C = (h) => new THREE.Color(h);
  const PAL = {
    yunnan:     { b1: C(0x52903a), b2: C(0x3b7233), rock: C(0x7a6f62), patch: C(0x8f4f30), pw: 0.55 },
    tibet:      { b1: C(0x9c9168), b2: C(0x867b5d), rock: C(0x6f685e), snow: C(0xf3f6fa), patch: C(0x62824a), pw: 0.5 },
    xinjiang:   { b1: C(0xcdb487), b2: C(0xb99f74), rock: C(0x8f7d68), snow: C(0xf3f6fa), patch: C(0x72904a), pw: 0.18 },
    gobi:       { b1: C(0xc4a56e), b2: C(0xb28e5a), rock: C(0xb25a38), patch: C(0xd8c08a), pw: 0.5 },
    grassland:  { b1: C(0x7f9f48), b2: C(0x6c9040), rock: C(0x8a8a74), patch: C(0xbcb66c), pw: 0.62 },
    snowforest: { b1: C(0xeef2f6), b2: C(0xdde7ee), rock: C(0x7d898f), patch: C(0x2f5a42), pw: 0.7 },
    plain:      { b1: C(0xb8b862), b2: C(0x9aba52), rock: C(0x8a8a80), fields: [C(0xc9bb58), C(0x8fb04a), C(0xdbc66c), C(0x6f9a3a), C(0xb98a4a), C(0xa3c25a), C(0xcfa95a)] },
    water:      { b1: C(0x669f4c), b2: C(0x4f8c42), rock: C(0x7c8070), fields: [C(0x7fb04a), C(0x62a03a), C(0xc9c456), C(0x92c250), C(0x6fa844)] },
    tropical:   { b1: C(0x3a8c46), b2: C(0x2a7038), rock: C(0x74786c), patch: C(0x86b04a), pw: 0.35 }
  };
  const _c1 = new THREE.Color(), _c2 = new THREE.Color();
  function paint(type, h, ny, x, z, snowH, o) {
    const P = PAL[type], n1 = N.fbm(x * 0.004, z * 0.004, 3), fine = N.vnoise(x * 0.35, z * 0.35);
    o.copy(P.b1).lerp(P.b2, sm(0.35, 0.65, n1));
    if (P.patch) o.lerp(P.patch, sm(0.55, 0.72, N.fbm(x * 0.0012 + 50, z * 0.0012, 2)) * P.pw);
    if (P.fields) {
      const u = (x * 0.8 + z * 0.6) * 0.0105, v = (-x * 0.6 + z * 0.8) * 0.0075;
      const iu = Math.floor(u), iv = Math.floor(v), hh = N.hash(iu, iv);
      o.copy(P.fields[Math.floor(hh * P.fields.length) % P.fields.length]).multiplyScalar(0.9 + 0.2 * N.hash(iv, iu + 5));
      const fu = u - iu, fv = v - iv; if (fu < 0.035 || fv < 0.05) o.multiplyScalar(0.72);
      if (sm(0.55, 0.8, N.fbm(x * 0.002 + 9, z * 0.002, 2)) > 0.5) o.lerp(P.b2, 0.55);       // 一部分是林地/荒地
    }
    o.multiplyScalar(0.88 + 0.24 * fine);
    o.lerp(P.rock, sm(0.82, 0.62, ny));
    if (P.snow && snowH < 1e8) o.lerp(P.snow, sm(snowH - 70, snowH + 130, h + 90 * (n1 - 0.5)) * sm(0.40, 0.78, ny));
    if (h < -0.6 && h > -16) o.lerp(_c1.set(0xb7a98a), sm(-0.6, -2.4, h) * 0.8);                // 湖岸/河岸泥沙（h 为相对基准面）
    return o;
  }
  // 区域混合着色
  function color(ri, h, ny, x, z, o) {
    h -= PARAMS[ri.a.type].base + (PARAMS[ri.b.type].base - PARAMS[ri.a.type].base) * ri.k;   // 转成相对基准面的高度
    const A = ri.a.type, B = ri.b.type, sA = PARAMS[A].snowH, sB = PARAMS[B].snowH;
    if (ri.k < 0.02 || A === B) return paint(A, h, ny, x, z, sA, o);
    if (ri.k > 0.98) return paint(B, h, ny, x, z, sB, o);
    paint(A, h, ny, x, z, sA, _c2); paint(B, h, ny, x, z, sB, o);
    return o.lerp(_c2, 1 - ri.k);
  }

  // 城市规模（影响街区范围与楼高），以及城区程度 urban(s, lat) ∈ [0,1]
  const CITY_SCALE = { '北京': 1, '上海': 1, '广州': 1, '杭州': 0.85, '沈阳': 0.8, '哈尔滨': 0.8, '乌鲁木齐': 0.8, '昆明': 0.8, '兰州': 0.75, '青岛': 0.75, '呼和浩特': 0.7, '拉萨': 0.55, '喀什': 0.55, '三亚': 0.5, '库尔勒': 0.5, '大理': 0.45, '敦煌': 0.4, '日喀则': 0.4, '呼伦贝尔': 0.4, '林芝': 0.35, '阿里': 0.3 };
  function urban(s, lat) {
    let best = 0;
    for (const c of Route.CITIES) {
      let a = Math.abs(s - c.s); if (a > L / 2) a = L - a;
      const sc = CITY_SCALE[c.name] || 0.4, rho = Math.hypot(a / (520 * sc), Math.abs(lat) / (360 * sc));
      if (rho < 1.1) best = Math.max(best, 1 - sm(0.82, 1.05, rho));
    }
    return best;
  }

  buildViaduct();
  window.TerrainCore = { CITY_SCALE, urban, PARAMS, paramsFor, F, natural, baseAt, vf, nearest, color, lakeAt, lakeIn, LAKE_BLOCK, WATER_REL, nF, FINE, fx, fz };
})();
