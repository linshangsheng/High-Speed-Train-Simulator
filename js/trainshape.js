/* 列车外形参数与截面：车体(圆角矩形+拱顶) 与 流线型车头(复兴号式) 共用，贴图也由此取参 */
(function () {
  const S = {
    RAIL_Y: 0.55,
    A: 1.68,            // 车体半宽
    YB: 1.12,           // 裙板下缘
    YT: 4.6,            // 车顶
    CAR_L: 24.6,        // 中间车长
    HEAD_L: 26.0,       // 头车总长
    NOSE_L: 11.0,       // 流线型车头长度
    GAP: 0.9,
    V0: 0.6, VH: 4.1    // 贴图 v 映射: v = (y - V0) / VH
  };

  // 车体环形截面。点序：底中 → 右侧向上 → 顶中 → 左侧向下（自 +z 看逆时针），共 38 点
  S.ring = function (a, yb, yt) {
    const h = yt - yb, rc = Math.min(0.3, 0.09 * h), y2 = yb + 0.62 * h;
    const right = [];
    for (let k = 0; k <= 2; k++) { const an = -Math.PI / 2 + k * Math.PI / 4; right.push([a - rc + rc * Math.cos(an), yb + rc + rc * Math.sin(an)]); }
    for (let k = 1; k <= 4; k++) right.push([a, yb + rc + (y2 - yb - rc) * k / 4]);
    for (let k = 1; k <= 11; k++) {
      const an = k / 12 * Math.PI / 2, p = 2.7;
      right.push([a * Math.pow(Math.cos(an), 2 / p), y2 + (yt - y2) * Math.pow(Math.sin(an), 2 / p)]);
    }
    const pts = [[0, yb]];
    right.forEach(p => pts.push(p));
    pts.push([0, yt]);
    for (let i = right.length - 1; i >= 0; i--) pts.push([-right[i][0], right[i][1]]);
    return pts;
  };

  // 车头参数 s∈[0,1]（0=与车体相接，1=鼻尖）
  S.noseA = (s) => S.A * Math.sqrt(Math.max(0.0004, 1 - Math.pow(Math.min(s, 0.993), 2.05)));
  // 鼻尖处高度向中线收拢，使鼻尖呈圆润的“子弹头”而非竖直窄缝
  const YC = 1.85, rnd = (s) => Math.pow(Math.max(0, 1 - Math.pow(Math.min(s, 0.993), 2.05)), 0.4);
  S.noseTop = (s) => { const t = S.YT - (S.YT - 2.3) * Math.pow(s, 2.4); return YC + (t - YC) * rnd(s); };
  S.noseBot = (s) => { const b = S.YB + (1.38 - S.YB) * Math.pow(s, 3.2); return YC + (b - YC) * rnd(s); };
  // 某环在高度 y 处的右侧半宽（用于把灯具贴到车头表面）
  S.xAt = (ring, y) => {
    let best = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
      if (x0 >= 0 && x1 >= 0 && ((y0 <= y && y <= y1) || (y1 <= y && y <= y0)) && Math.abs(y1 - y0) > 1e-6) best = Math.max(best, x0 + (x1 - x0) * (y - y0) / (y1 - y0));
    }
    return best;
  };

  // 头车截面序列（局部坐标，z 向前；车体后端 z=-HEAD_L/2，鼻尖 z=+HEAD_L/2）
  S.headSections = function () {
    const L = S.HEAD_L, zb = L / 2 - S.NOSE_L, secs = [];
    const body = S.ring(S.A, S.YB, S.YT);
    secs.push({ z: -L / 2, ring: body });
    secs.push({ z: zb, ring: body });
    const M = 30;
    for (let k = 1; k <= M; k++) {
      const s = 1 - Math.pow(1 - k / M, 1.7);
      secs.push({ z: zb + S.NOSE_L * s, ring: S.ring(S.noseA(s), S.noseBot(s), S.noseTop(s)) });
    }
    return secs;
  };
  S.midSections = function () {
    const body = S.ring(S.A, S.YB, S.YT), L = S.CAR_L;
    return [{ z: -L / 2, ring: body }, { z: L / 2, ring: body }];
  };
  window.TrainShape = S;
})();
