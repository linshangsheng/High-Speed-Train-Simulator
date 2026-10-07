/* 3D 驾驶室：挂在相机上的真实立体驾驶台——斜面操纵台、三块实时显示屏(DMI 速度表/列车状态/线路导航)、
   主控手柄(随档位转动)、指示灯按钮、A 柱/顶棚/侧墙，夜间有柔和的室内灯光。 */
(function () {
  const Bd = BKit.Builder;
  function noiseTex(base, a) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1800; i++) { g.fillStyle = (Math.random() < 0.5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + Math.random() * a + ')'; g.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
  }
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
  function bar(b, a, c, w, d) {   // 两点之间的方杆（写入 Builder）
    const g = new THREE.BoxGeometry(w, Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]), d);
    _d.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]).normalize(); _q.setFromUnitVectors(_up, _d); g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(_q)); g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
    return g;
  }

  // 屏幕贴图按 2 倍分辨率绘制（逻辑坐标仍是 512 宽），斜着看也清晰
  const SS = 2;
  function screen(w, h) {
    const c = document.createElement('canvas'); c.width = 512 * SS; c.height = Math.round(512 * h / w) * SS;
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    const g = c.getContext('2d'); g.setTransform(SS, 0, 0, SS, 0, 0);
    return { c, g, t, mesh, W: 512, H: Math.round(512 * h / w) };
  }

  function create(camera) {
    const root = new THREE.Group(); camera.add(root);
    const dark = new THREE.MeshStandardMaterial({ map: noiseTex('#2a2e34', 0.06), roughness: 0.75, metalness: 0.15 });
    const darker = new THREE.MeshStandardMaterial({ map: noiseTex('#16181c', 0.05), roughness: 0.6, metalness: 0.2 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x8c949c, roughness: 0.35, metalness: 0.8 });
    const panel = new THREE.MeshStandardMaterial({ map: noiseTex('#3a4048', 0.05), roughness: 0.7, metalness: 0.1 });

    // 操纵台（斜面 + 立面 + 遮光檐）
    const b = new Bd();
    const BL = [-1.7, -0.40, -1.18], BR = [1.7, -0.40, -1.18], FR = [1.45, -0.57, -0.47], FL = [-1.45, -0.57, -0.47];
    b.quad(FL, FR, BR, BL, [0, 0], [3, 0], [3, 1], [0, 1]);
    b.quad([-1.45, -1.3, -0.40], [1.45, -1.3, -0.40], FR, FL, [0, 0], [3, 0], [3, 1], [0, 1]);
    b.quad([-1.7, -0.40, -1.18], [1.7, -0.40, -1.18], [1.7, -0.34, -1.22], [-1.7, -0.34, -1.22], [0, 0], [3, 0], [3, 0.1], [0, 0.1]);
    const desk = new THREE.Mesh(b.geo(), dark); root.add(desk);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.04, 0.06), trim); lip.position.set(0, -0.565, -0.47); root.add(lip);

    // A 柱、顶棚、侧墙
    const frame = new THREE.Group(); root.add(frame);
    for (const sx of [-1, 1]) {
      frame.add(new THREE.Mesh(bar(null, [sx * 1.32, -0.42, -1.2], [sx * 0.98, 0.78, -0.62], 0.14, 0.16), darker));
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 1.9), panel); wall.position.set(sx * 1.5, -0.85, -0.25); frame.add(wall);
      const wallTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 1.9), panel); wallTop.position.set(sx * 1.42, 0.82, -0.25); frame.add(wallTop);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.1), darker); post.position.set(sx * 1.46, 0.1, 0.25); frame.add(post);
    }
    const header = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.5), darker); header.position.set(0, 0.86, -0.72); header.rotation.x = 0.35; frame.add(header);
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.05, 1.6), panel); ceil.position.set(0, 1.0, -0.1); frame.add(ceil);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.32), new THREE.MeshStandardMaterial({ color: 0x20262c, roughness: 0.4, metalness: 0.1, transparent: true, opacity: 0.85 })); visor.position.set(-0.5, 0.68, -0.6); visor.rotation.x = 0.55; frame.add(visor);

    // 显示屏（贴在台面上，朝向司机）
    const tilt = Math.atan2(0.17, 0.71);   // 台面坡度
    const scrC = screen(0.46, 0.28), scrL = screen(0.4, 0.26), scrR = screen(0.4, 0.26);
    const deskY = (z) => -0.40 - 0.17 * (z + 1.18) / 0.71;
    // 每块屏都正对司机眼睛（相机原点）：屏幕边框与文字始终同一个平面、同一个斜度；整块屏都在视野内，不会被画面下沿裁掉
    const eye = new THREE.Vector3(0, 0, 0);
    const place = (s, x, y, z) => {
      // 先正对眼睛，再把左右屏的偏航收回 0.25 rad：仍向内斜着，但行与行不会因透视歪得太厉害
      s.mesh.position.set(x, y, z); s.mesh.lookAt(eye); if (x) s.mesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.sign(x) * 0.25); root.add(s.mesh);
      const p = s.mesh.geometry.parameters;
      const bez = new THREE.Mesh(new THREE.BoxGeometry(p.width + 0.03, p.height + 0.03, 0.03), darker); bez.position.copy(s.mesh.position); bez.quaternion.copy(s.mesh.quaternion); bez.translateZ(-0.017); root.add(bez);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.04), darker); leg.position.set(x, y - p.height / 2 - 0.05, z - 0.03); root.add(leg);   // 支架，连到台面
    };
    place(scrC, 0, -0.33, -0.9); place(scrL, -0.53, -0.32, -0.86); place(scrR, 0.53, -0.32, -0.86);

    // 主控手柄（左侧）与制动手柄
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.3), darker); plate.position.set(-0.86, deskY(-0.66) + 0.01, -0.66); plate.rotation.x = tilt; root.add(plate);
    const lever = new THREE.Group(); lever.position.set(-0.86, deskY(-0.66) + 0.02, -0.66); root.add(lever);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.025), trim); shaft.position.y = 0.08; lever.add(shaft);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.3, metalness: 0.2 })); knob.position.y = 0.165; lever.add(knob);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.04), new THREE.MeshStandardMaterial({ color: 0xc23b2b, roughness: 0.4 })); hand.position.set(0.62, deskY(-0.68) + 0.02, -0.68); hand.rotation.x = tilt; root.add(hand);

    // 指示灯/按钮
    const lights = [];
    const lc = [0x3ad26a, 0x3ad26a, 0xffc23a, 0xff4d3a, 0x3aa8ff, 0x3ad26a, 0xffc23a, 0x3aa8ff];
    lc.forEach((c, i) => {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.4), toneMapped: false });
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 12), m);
      const x = 0.78 + (i % 4) * 0.07, z = -0.64 - Math.floor(i / 4) * 0.08, y = deskY(z) + 0.006;
      btn.position.set(x, y, z); btn.rotation.x = tilt; root.add(btn); lights.push(m);
    });

    const lamp = new THREE.PointLight(0xffe0b0, 0, 3.2, 2); lamp.position.set(0, 0.6, -0.2); root.add(lamp);

    /* ---------- 屏幕内容 ---------- */
    const COL = { bg: '#071526', line: '#1d3a5c', txt: '#d8ecff', dim: '#6f8fae', acc: '#4fd8ff', warn: '#ffb03a', red: '#ff5a4a', green: '#43e08a' };
    // 写字但不超出 maxW：太长时横向压缩，保证文字永远留在屏幕内
    function fit(g, t, x, y, maxW) {
      const w = g.measureText(t).width;
      if (w <= maxW) { g.fillText(t, x, y); return; }
      g.save(); g.translate(x, y); g.scale(maxW / w, 1); g.fillText(t, 0, 0); g.restore();
    }
    function drawDMI(o) {
      const { g, W, H } = scrC; g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
      const cx = W * 0.32, cy = H * 0.56, R = H * 0.4;
      const ang = (v) => Math.PI * 0.75 + (v / 400) * Math.PI * 1.5;
      g.lineWidth = 3; g.strokeStyle = COL.line; g.beginPath(); g.arc(cx, cy, R, ang(0), ang(400)); g.stroke();
      g.lineWidth = 8; g.strokeStyle = o.over ? COL.red : COL.acc; g.beginPath(); g.arc(cx, cy, R, ang(0), ang(Math.min(400, o.kmh))); g.stroke();
      g.lineWidth = 6; g.strokeStyle = COL.warn; g.beginPath(); g.arc(cx, cy, R + 9, ang(o.limit) - 0.03, ang(o.limit) + 0.03); g.stroke();
      g.fillStyle = COL.dim; g.font = '600 15px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let v = 0; v <= 400; v += 50) { const a = ang(v); g.fillText(v, cx + Math.cos(a) * (R - 22), cy + Math.sin(a) * (R - 22)); }
      const na = ang(Math.min(400, o.kmh)); g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(na) * (R - 8), cy + Math.sin(na) * (R - 8)); g.stroke();
      g.fillStyle = COL.txt; g.font = 'bold 44px Arial'; g.fillText(Math.round(o.kmh), cx, cy + R * 0.52);
      g.textAlign = 'left'; g.font = 'bold 20px "Microsoft YaHei"'; g.fillStyle = COL.acc; g.fillText('CTCS-3', W * 0.64, 30);
      g.fillStyle = COL.dim; g.font = '16px "Microsoft YaHei"'; g.fillText('目标速度', W * 0.64, 70); g.fillStyle = COL.warn; g.font = 'bold 30px Arial'; g.fillText(Math.round(o.limit), W * 0.64, 100);
      if (o.stop) {          // 进站：目标距离（停车位置标）+ 左侧目标距离条（对数刻度，与 CTCS DMI 一致）
        const d = Math.max(0, o.stop.d);
        g.fillStyle = COL.dim; g.font = '16px "Microsoft YaHei"'; g.fillText('停车点 · ' + o.stop.name, W * 0.64, 140);
        g.fillStyle = COL.warn; g.font = 'bold 24px Arial'; g.fillText(d > 1000 ? (d / 1000).toFixed(2) + ' km' : d.toFixed(d < 10 ? 2 : 0) + ' m', W * 0.64, 168);
        g.fillStyle = { ok: COL.green, warn: COL.warn, red: COL.red }[o.stop.tone] || COL.dim; g.font = '15px "Microsoft YaHei"'; g.fillText(o.stop.tip, W * 0.64, 205);
        const bh = H * 0.72, bx = 14, by = H * 0.14, k = Math.min(1, Math.log10(1 + d) / Math.log10(4501));
        g.fillStyle = COL.line; g.fillRect(bx, by, 12, bh); g.fillStyle = COL.warn; g.fillRect(bx, by + bh * (1 - k), 12, bh * k);
      } else {
        g.fillStyle = COL.dim; g.font = '16px "Microsoft YaHei"'; g.fillText('前方 ' + o.next, W * 0.64, 140); g.fillStyle = COL.txt; g.font = 'bold 24px Arial'; g.fillText(o.nextKm + ' km', W * 0.64, 168);
        g.fillStyle = COL.dim; g.font = '15px "Microsoft YaHei"'; g.fillText(o.mode, W * 0.64, 205);
      }
      const bw = W * 0.3, bx = W * 0.64, by = H - 40; g.fillStyle = COL.line; g.fillRect(bx, by, bw, 10); g.fillStyle = COL.green; g.fillRect(bx, by, bw * o.leg, 10);
      g.fillStyle = COL.txt; g.font = '16px Arial'; g.fillText(o.clock, W * 0.64, H - 58);
      scrC.t.needsUpdate = true;
    }
    function drawL(o) {
      const { g, W, H } = scrL; g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
      const PAD = 22, X = 120, R = W - PAD;                     // 所有内容都限制在 [PAD, W-PAD] × [0, H] 内
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = COL.acc; g.font = 'bold 28px Arial'; fit(g, 'CR400AF', PAD, 34, R - PAD);
      const rows = [86, 141, 196, 251, 304];
      g.fillStyle = COL.dim; g.font = '24px "Microsoft YaHei"'; ['网压', '牵引', '制动', '车门', '受电弓'].forEach((t, i) => fit(g, t, PAD, rows[i], X - PAD - 8));
      g.fillStyle = COL.txt; g.font = 'bold 26px Arial'; fit(g, (27.2 + Math.sin(o.t * 0.7) * 0.25).toFixed(1) + ' kV', X, rows[0], R - X);
      const barf = (y, k, col) => { g.fillStyle = COL.line; g.fillRect(X, y - 11, R - X, 22); g.fillStyle = col; g.fillRect(X, y - 11, (R - X) * Math.min(1, k), 22); };
      barf(rows[1], o.throttle, COL.green); barf(rows[2], o.brake, COL.red);
      g.font = 'bold 24px "Microsoft YaHei"'; g.fillStyle = o.doors ? COL.warn : COL.green; fit(g, o.doors ? '左侧开启 · 上下客' : '已关闭 · 锁闭', X, rows[3], R - X);
      g.fillStyle = COL.green; fit(g, '2 号 / 6 号 升弓', X, rows[4], R - X);
      scrL.t.needsUpdate = true;
    }
    function drawR(o) {
      const { g, W, H } = scrR; g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
      const PAD = 22, R = W - PAD;
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = COL.acc; g.font = 'bold 28px "Microsoft YaHei"'; fit(g, '线路导航', PAD, 34, R - PAD);
      g.fillStyle = COL.dim; g.font = '22px "Microsoft YaHei"'; fit(g, o.region + ' · ' + o.weather, PAD, 76, R - PAD);
      // 前方 3 站：站名在左，距离右对齐，同一行
      o.ahead.forEach((st, i) => {
        const y = 134 + i * 74; g.fillStyle = i ? COL.dim : COL.warn; g.beginPath(); g.arc(PAD + 12, y, 11, 0, 7); g.fill();
        if (i < o.ahead.length - 1) { g.fillStyle = COL.line; g.fillRect(PAD + 9, y + 12, 6, 50); }
        const km = st.km + ' km'; g.font = '24px Arial'; const kw = Math.min(g.measureText(km).width, 170);
        g.fillStyle = COL.dim; g.textAlign = 'right'; fit(g, km, R, y, 170, true); g.textAlign = 'left';
        g.fillStyle = i ? COL.txt : '#ffffff'; g.font = (i ? '' : 'bold ') + '30px "Microsoft YaHei"'; fit(g, st.name, PAD + 36, y, R - kw - 16 - (PAD + 36));
      });
      scrR.t.needsUpdate = true;
    }

    let acc = 0, tt = 0;
    function update(dt, visible, o) {
      root.visible = visible; if (!visible) return;
      tt += dt;
      lever.rotation.x += ((-(o.leverN / 10) * 0.6) - lever.rotation.x) * Math.min(1, dt * 10);
      lights[3].color.setRGB(o.emg ? 2.4 : 0.35, o.emg ? 0.3 : 0.06, 0.05);
      lights[2].color.setRGB(o.cruise ? 2 : 0.4, o.cruise ? 1.5 : 0.3, 0.05);
      lamp.intensity = o.night * 0.9;
      acc += dt; if (acc < 0.12) return; acc = 0;
      o.t = tt; drawDMI(o); drawL(o); drawR(o);
    }
    return { update, root };
  }
  window.Cab = { create };
})();
