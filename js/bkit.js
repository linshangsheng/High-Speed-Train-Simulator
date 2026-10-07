/* 建筑几何工具：带“米制 UV”的盒体/山墙屋顶/四坡屋顶/飞檐屋顶/收分墙，以及按材质分组合并的原型装配器。
   所有几何为平面着色（顶点法线=面法线），UV 按真实米数换算，贴图可在任意尺寸的墙面上无缝平铺。 */
(function () {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  class Builder {
    constructor() { this.p = []; this.n = []; this.u = []; }
    tri(a, b, c, ua, ub, uc, flip) {
      if (flip) { [b, c] = [c, b]; [ub, uc] = [uc, ub]; }
      let n = cross(sub(b, a), sub(c, a)); const l = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / l, n[1] / l, n[2] / l];
      for (const [v, uv] of [[a, ua], [b, ub], [c, uc]]) { this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); this.u.push(uv[0], uv[1]); }
    }
    quad(a, b, c, d, ua, ub, uc, ud, flip) { this.tri(a, b, c, ua, ub, uc, flip); this.tri(a, c, d, ua, uc, ud, flip); }
    geo() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
      return g;
    }
  }

  // 盒体（无底面）。tw/th：贴图铺一格对应的米数
  function box(x0, y0, z0, x1, y1, z1, tw, th, noTop) {
    const b = new Builder(); tw = tw || 4; th = th || 4;
    b.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0 / tw, y0 / th], [x1 / tw, y0 / th], [x1 / tw, y1 / th], [x0 / tw, y1 / th]);
    b.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1 / tw, y0 / th], [x0 / tw, y0 / th], [x0 / tw, y1 / th], [x1 / tw, y1 / th]);
    b.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [z1 / tw, y0 / th], [z0 / tw, y0 / th], [z0 / tw, y1 / th], [z1 / tw, y1 / th]);
    b.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [z0 / tw, y0 / th], [z1 / tw, y0 / th], [z1 / tw, y1 / th], [z0 / tw, y1 / th]);
    if (!noTop) b.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [x0 / tw, z1 / tw], [x1 / tw, z1 / tw], [x1 / tw, z0 / tw], [x0 / tw, z0 / tw]);
    return b.geo();
  }

  // 山墙双坡屋顶。axis='x' 脊线平行 x。返回 {roof, ends}（ends 用墙面材质）
  function gable(x0, z0, x1, z1, y, rise, over, axis, tw, th) {
    tw = tw || 4; th = th || 4;
    const r = new Builder(), e = new Builder(), flip = axis === 'z';
    // 局部坐标 (u 沿脊, w 横跨)
    const U0 = axis === 'x' ? x0 : z0, U1 = axis === 'x' ? x1 : z1, W0 = axis === 'x' ? z0 : x0, W1 = axis === 'x' ? z1 : x1;
    const P = (u, w, yy) => (axis === 'x' ? [u, yy, w] : [w, yy, u]);
    const ua = U0 - over, ub = U1 + over, wa = W0 - over, wb = W1 + over, wm = (W0 + W1) / 2, yr = y + rise;
    const slope = Math.hypot(wb - wm, rise);
    r.quad(P(ua, wb, y), P(ub, wb, y), P(ub, wm, yr), P(ua, wm, yr), [ua / tw, 0], [ub / tw, 0], [ub / tw, slope / th], [ua / tw, slope / th], flip);
    r.quad(P(ub, wa, y), P(ua, wa, y), P(ua, wm, yr), P(ub, wm, yr), [ub / tw, 0], [ua / tw, 0], [ua / tw, slope / th], [ub / tw, slope / th], flip);
    // 山墙三角
    e.tri(P(U1, W1, y), P(U1, W0, y), P(U1, wm, yr), [W1 / tw, y / th], [W0 / tw, y / th], [wm / tw, yr / th], flip);
    e.tri(P(U0, W0, y), P(U0, W1, y), P(U0, wm, yr), [W0 / tw, y / th], [W1 / tw, y / th], [wm / tw, yr / th], flip);
    return { roof: r.geo(), ends: e.geo() };
  }

  // 四坡屋顶（脊线沿较长边；方形则为攒尖）
  function hip(x0, z0, x1, z1, y, rise, over, tw, th) {
    tw = tw || 4; th = th || 4;
    const b = new Builder(), xa = x0 - over, xb = x1 + over, za = z0 - over, zb = z1 + over, xm = (xa + xb) / 2, zm = (za + zb) / 2, yr = y + rise;
    const Lx = xb - xa, Lz = zb - za, sx = Math.max(0, (Lx - Lz) / 2), sz = Math.max(0, (Lz - Lx) / 2);
    const A = [xm - sx, yr, zm - sz], B = [xm + sx, yr, zm + sz], sl = Math.hypot(Math.min(Lx, Lz) / 2, rise);
    b.quad([xa, y, zb], [xb, y, zb], [B[0], yr, B[2]], [A[0], yr, A[2]], [xa / tw, 0], [xb / tw, 0], [B[0] / tw, sl / th], [A[0] / tw, sl / th]);
    b.quad([xb, y, za], [xa, y, za], [A[0], yr, A[2]], [B[0], yr, B[2]], [xb / tw, 0], [xa / tw, 0], [A[0] / tw, sl / th], [B[0] / tw, sl / th]);
    b.tri([xb, y, zb], [xb, y, za], [B[0], yr, B[2]], [zb / tw, 0], [za / tw, 0], [zm / tw, sl / th]);
    b.tri([xa, y, za], [xa, y, zb], [A[0], yr, A[2]], [za / tw, 0], [zb / tw, 0], [zm / tw, sl / th]);
    return b.geo();
  }

  // 中式飞檐屋顶：四坡攒尖/歇山，檐口向上翘起，坡面内凹。hx,hz 为半宽；ridge 为脊线半长
  function pagodaRoof(hx, hz, y, rise, over, upturn, ridge, tw, th) {
    tw = tw || 4; th = th || 4;
    const b = new Builder(), N = 10, M = 5, ex = hx + over, ez = hz + over;
    const sides = [  // 每边：檐线两端角点、脊线两端
      { a: [-ex, ez], b: [ex, ez], ra: [-ridge, 0], rb: [ridge, 0] },
      { a: [ex, -ez], b: [-ex, -ez], ra: [ridge, 0], rb: [-ridge, 0] },
      { a: [ex, ez], b: [ex, -ez], ra: [ridge, 0], rb: [ridge, 0] },
      { a: [-ex, -ez], b: [-ex, ez], ra: [-ridge, 0], rb: [-ridge, 0] }
    ];
    const pt = (sd, s, t) => {
      const ex_ = sd.a[0] + (sd.b[0] - sd.a[0]) * s, ez_ = sd.a[1] + (sd.b[1] - sd.a[1]) * s;
      const rx = sd.ra[0] + (sd.rb[0] - sd.ra[0]) * s, rz = sd.ra[1] + (sd.rb[1] - sd.ra[1]) * s;
      const lift = upturn * Math.pow(Math.abs(2 * s - 1), 3) * Math.pow(1 - t, 1.6);
      return [ex_ + (rx - ex_) * t, y + rise * Math.pow(t, 1.5) + lift, ez_ + (rz - ez_) * t];
    };
    sides.forEach((sd) => {
      const len = Math.hypot(sd.b[0] - sd.a[0], sd.b[1] - sd.a[1]);
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
        const s0 = i / N, s1 = (i + 1) / N, t0 = j / M, t1 = (j + 1) / M;
        b.quad(pt(sd, s0, t0), pt(sd, s1, t0), pt(sd, s1, t1), pt(sd, s0, t1), [s0 * len / tw, t0 * 4 / th], [s1 * len / tw, t0 * 4 / th], [s1 * len / tw, t1 * 4 / th], [s0 * len / tw, t1 * 4 / th]);
      }
    });
    return b.geo();
  }

  // 收分墙（下大上小的台体），如藏式建筑
  function frustum(x0, z0, x1, z1, y0, y1, inset, tw, th) {
    tw = tw || 4; th = th || 4;
    const b = new Builder(), i = inset;
    const A = [x0, y0, z1], B = [x1, y0, z1], C = [x1, y1, z1 - i], D = [x0, y1, z1 - i];
    const ax = (v) => [v[0] / tw, v[1] / th];
    b.quad([x0, y0, z1], [x1, y0, z1], [x1 - i, y1, z1 - i], [x0 + i, y1, z1 - i], ax([x0, y0]), ax([x1, y0]), ax([x1 - i, y1]), ax([x0 + i, y1]));
    b.quad([x1, y0, z0], [x0, y0, z0], [x0 + i, y1, z0 + i], [x1 - i, y1, z0 + i], ax([x1, y0]), ax([x0, y0]), ax([x0 + i, y1]), ax([x1 - i, y1]));
    b.quad([x1, y0, z1], [x1, y0, z0], [x1 - i, y1, z0 + i], [x1 - i, y1, z1 - i], [z1 / tw, y0 / th], [z0 / tw, y0 / th], [(z0 + i) / tw, y1 / th], [(z1 - i) / tw, y1 / th]);
    b.quad([x0, y0, z0], [x0, y0, z1], [x0 + i, y1, z1 - i], [x0 + i, y1, z0 + i], [z0 / tw, y0 / th], [z1 / tw, y0 / th], [(z1 - i) / tw, y1 / th], [(z0 + i) / tw, y1 / th]);
    b.quad([x0 + i, y1, z1 - i], [x1 - i, y1, z1 - i], [x1 - i, y1, z0 + i], [x0 + i, y1, z0 + i], [x0 / tw, z1 / tw], [x1 / tw, z1 / tw], [x1 / tw, z0 / tw], [x0 / tw, z0 / tw]);
    return b.geo();
  }

  // 圆柱/圆锥台（米制 UV）
  function cyl(rt, rb, y0, y1, seg, tw, th) {
    const g = new THREE.CylinderGeometry(rt, rb, y1 - y0, seg || 12, 1); g.translate(0, (y0 + y1) / 2, 0);
    const uv = g.attributes.uv, p = g.attributes.position; tw = tw || 4; th = th || 4;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * Math.max(rt, rb) / tw, p.getY(i) / th);
    return g;
  }

  // 原型装配器：按材质键分组累积，build 时各组合并成一个几何
  class Proto {
    constructor() { this.parts = {}; }
    add(key, geo, x, y, z, ry, sx, sy, sz) {
      (this.parts[key] = this.parts[key] || []).push({ geo, pos: [x || 0, y || 0, z || 0], rot: [0, ry || 0, 0], scale: [sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz] });
      return this;
    }
    build(matOf) {
      const out = [];
      for (const k in this.parts) { const m = matOf(k); out.push({ geo: GeomUtil.merge(this.parts[k]), mat: m, cast: !m.userData || m.userData.cast !== false }); }
      return out;
    }
  }

  window.BKit = { Builder, box, gable, hip, pagodaRoof, frustum, cyl, Proto };
})();
