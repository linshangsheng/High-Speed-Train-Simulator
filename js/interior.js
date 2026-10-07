/* 二等座车厢内景（挂在第 3 节车厢上，仅“车窗”视角显示）：
   与外部涂装对齐的车窗洞口、窗帘、行李架、弧形顶棚与灯带、2+3 座椅（白色头枕套、小桌板）、乘客、
   车厢端门上方的 LED 信息屏（滚动显示车次/下一站/实时车速/车外温度，和真实复兴号一样）。
   车厢局部坐标：+z 为前进方向，+x 为左侧，y 自轨面以下的车体基准起算。 */
(function () {
  const S = TrainShape;
  const rnd = (() => { let a = 20240607; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();

  function build(car) {
    const L = S.CAR_L, half = L / 2, FLOOR = 1.55, CEIL = 3.62, W = 1.62;
    // 六面完整的盒体（室内的顶棚、行李架、灯带都要从下方看到，BKit.box 没有底面）
    const P = new BKit.Proto(), B = (x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; };
    // 车窗位置（与 livery.js 的涂装一致）
    const doors = [2.3, L - 2.3], first = doors[0] + 1.25, last = doors[1] - 1.25, pitch = 2.45;
    const n = Math.max(1, Math.floor((last - first) / pitch)), start = first + ((last - first) - n * pitch) / 2;
    const wins = []; for (let i = 0; i < n; i++) wins.push([start + i * pitch + 0.42 - half, start + (i + 1) * pitch - 0.42 - half]);
    const WY0 = 2.18, WY1 = 3.08;
    const z0 = -half + 3.4, z1 = half - 3.4;          // 客室区（两端是门厅）

    // 座位排布：右侧(x<0) 2 座，左侧(x>0) 3 座；排距 1.02 m
    const seatsR = [-1.2, -0.73], seatsL = [0.55, 1.02, 1.49];
    const rows = Math.floor((z1 - z0 - 0.8) / 1.02), rowZ = (r) => z0 + 0.6 + r * 1.02;
    const camRow = Math.floor(rows / 2), eye = new THREE.Vector3(-0.8, FLOOR + 1.36, rowZ(camRow) - 0.22);
    const camWin = wins.reduce((b, w) => (Math.abs((w[0] + w[1]) / 2 - eye.z - 1) < Math.abs((b[0] + b[1]) / 2 - eye.z - 1) ? w : b), wins[0]);

    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? W - 0.08 : -W, x1 = sx > 0 ? W : -W + 0.08;
      P.add('in_wall', B(x0, FLOOR, z0, x1, WY0, z1, 2, 2)); P.add('in_wall', B(x0, WY1, z0, x1, CEIL, z1, 2, 2));
      let z = z0;
      wins.forEach(([a, b]) => { if (a > z) P.add('in_wall', B(x0, WY0, z, x1, WY1, Math.min(a, z1), 2, 2)); z = b; });
      if (z < z1) P.add('in_wall', B(x0, WY0, z, x1, WY1, z1, 2, 2));
      const xin = sx > 0 ? x0 : x1;                    // 内壁面
      wins.forEach((w) => {
        const [a, b] = w;
        // 窗台 + 窗框四边
        P.add('in_trim', B(Math.min(xin, xin - sx * 0.07), WY0 - 0.05, a - 0.04, Math.max(xin, xin - sx * 0.07), WY0 + 0.01, b + 0.04, 1, 1));
        P.add('in_frame', B(Math.min(xin, xin - sx * 0.025), WY1 - 0.03, a - 0.04, Math.max(xin, xin - sx * 0.025), WY1 + 0.03, b + 0.04, 1, 1));
        for (const zz of [a, b]) P.add('in_frame', B(Math.min(xin, xin - sx * 0.025), WY0, zz - 0.035, Math.max(xin, xin - sx * 0.025), WY1, zz + 0.035, 1, 1));
        P.add('in_glass', B(sx > 0 ? W - 0.03 : -W + 0.02, WY0, a, sx > 0 ? W - 0.02 : -W + 0.03, WY1, b, 1, 1));
        // 卷帘：部分窗户放下一截（相机所在的窗户保持全开）
        if (w !== camWin && rnd() < 0.35) {
          const d = 0.12 + rnd() * 0.32, xb = xin - sx * 0.05;
          P.add('in_blind', B(Math.min(xb, xb - sx * 0.012), WY1 - d, a + 0.02, Math.max(xb, xb - sx * 0.012), WY1, b - 0.02, 1, 1));
          P.add('in_frame', B(Math.min(xb, xb - sx * 0.03), WY1 - d - 0.025, a + 0.02, Math.max(xb, xb - sx * 0.03), WY1 - d, b - 0.02, 1, 1));
        }
      });
      // 行李架（玻璃托板 + 金属前沿）
      const rx0 = sx > 0 ? W - 0.6 : -W + 0.08, rx1 = sx > 0 ? W - 0.08 : -W + 0.6;
      P.add('in_rack', B(rx0, 3.32, z0, rx1, 3.35, z1, 1, 1));
      P.add('in_frame', B(sx > 0 ? rx0 : rx1 - 0.035, 3.27, z0, sx > 0 ? rx0 + 0.035 : rx1, 3.4, z1, 1, 1));
      // 行李架上的行李
      for (let z = z0 + 0.5; z < z1 - 0.8; z += 0.6 + rnd() * 1.6) if (rnd() < 0.55) {
        const w = 0.35 + rnd() * 0.25, h = 0.18 + rnd() * 0.18, l = 0.35 + rnd() * 0.3, xc = sx * (W - 0.34);
        P.add('in_bag', B(xc - w / 2, 3.35, z, xc + w / 2, 3.35 + h, z + l, 1, 1)); P.parts.in_bag[P.parts.in_bag.length - 1].color = [0x22262c, 0x5a4636, 0x8a2f2f, 0x2f4a7a, 0x9a9488][Math.floor(rnd() * 5)];
      }
      // 墙面阅读灯/服务按钮条
      P.add('in_frame', B(sx > 0 ? W - 0.62 : -W + 0.58, 3.24, z0, sx > 0 ? W - 0.58 : -W + 0.62, 3.27, z1, 1, 1));
    }
    // 端墙 + 端门（磨砂玻璃）
    for (const z of [z0, z1]) {
      const zz0 = z > 0 ? z : z - 0.06, zz1 = z > 0 ? z + 0.06 : z;
      P.add('in_wall', B(-W, FLOOR, zz0, -0.52, CEIL + 0.4, zz1, 2, 2)); P.add('in_wall', B(0.52, FLOOR, zz0, W, CEIL + 0.4, zz1, 2, 2));
      P.add('in_wall', B(-0.52, 3.17, zz0, 0.52, CEIL + 0.4, zz1, 2, 2));
      P.add('in_frame', B(-0.55, FLOOR, zz0 - 0.01, -0.5, 3.2, zz1 + 0.01, 1, 1)); P.add('in_frame', B(0.5, FLOOR, zz0 - 0.01, 0.55, 3.2, zz1 + 0.01, 1, 1));
      P.add('in_frame', B(-0.55, 3.15, zz0 - 0.01, 0.55, 3.2, zz1 + 0.01, 1, 1));
      P.add('in_door', B(-0.5, FLOOR, z - 0.02, 0.5, 3.15, z + 0.02, 1, 1));
    }
    P.add('in_floor', B(-W, FLOOR - 0.05, z0, W, FLOOR, z1, 2, 2));
    P.add('in_carpet', B(-0.44, FLOOR, z0, 0.32, FLOOR + 0.006, z1, 2, 2));
    // 顶棚：两侧斜板 + 中央平顶 + 两条灯带 + 出风口
    P.add('in_ceil', B(-1.0, 3.95, z0, 1.0, 4.0, z1, 2, 2));
    for (const sx of [-1, 1]) {
      P.add('in_ceil', new THREE.BoxGeometry(0.76, 0.04, z1 - z0), sx * 1.3, 3.79, 0);
      P.parts.in_ceil[P.parts.in_ceil.length - 1].rot = [0, 0, -sx * 0.5];
      P.add('in_light', B(sx * 0.66 - 0.11, 3.925, z0, sx * 0.66 + 0.11, 3.95, z1, 1, 1));
      for (let z = z0 + 0.8; z < z1 - 0.5; z += 1.6) P.add('in_frame', B(sx * 0.22 - 0.12, 3.94, z, sx * 0.22 + 0.12, 3.95, z + 0.5, 1, 1));
    }

    const people = [];
    for (let r = 0; r < rows; r++) {
      const z = rowZ(r);
      for (const x of seatsR.concat(seatsL)) {
        P.add('in_seat', B(x - 0.23, FLOOR + 0.36, z - 0.25, x + 0.23, FLOOR + 0.5, z + 0.24, 1, 1));
        const back = new THREE.BoxGeometry(0.46, 0.7, 0.12); back.translate(0, 0.35, 0); back.rotateX(-0.16); P.add('in_seat', back, x, FLOOR + 0.46, z - 0.28);
        const hr = new THREE.BoxGeometry(0.42, 0.2, 0.135); hr.translate(0, 0.1, 0); hr.rotateX(-0.16); P.add('in_head', hr, x, FLOOR + 0.95, z - 0.36);
        const tray = new THREE.BoxGeometry(0.36, 0.2, 0.025); tray.translate(0, 0.1, 0); tray.rotateX(-0.16); P.add('in_trim', tray, x, FLOOR + 0.74, z - 0.41);
        P.add('in_frame', B(x - 0.05, FLOOR, z - 0.12, x + 0.05, FLOOR + 0.36, z + 0.1, 1, 1));
        const isCam = x < 0 && r === camRow;          // 相机坐在过道座，靠窗座空着
        if (!isCam && rnd() < 0.45) people.push([x, z]);
      }
      for (const x of [seatsR[0] - 0.26, seatsR[1] + 0.26, seatsL[0] - 0.26, seatsL[2] + 0.26])
        P.add('in_frame', B(x - 0.03, FLOOR + 0.5, z - 0.22, x + 0.03, FLOOR + 0.7, z + 0.18, 1, 1));
    }
    const shirts = [0x2f4a7a, 0x8a2f2f, 0x3e6b45, 0x6a6a6a, 0xd8c8a8, 0x1e1e22, 0xa86a2a, 0x5a3a7a, 0xe8e8e8, 0xc04a6a];
    const pc = (c) => { P.parts.in_person[P.parts.in_person.length - 1].color = c; };
    people.forEach(([x, z]) => {
      const lean = (rnd() - 0.5) * 0.12;
      const body = new THREE.BoxGeometry(0.4, 0.62, 0.26); body.translate(0, 0.31, 0); body.rotateX(-0.12); body.rotateZ(lean);
      P.add('in_person', body, x, FLOOR + 0.5, z - 0.1); pc(shirts[Math.floor(rnd() * shirts.length)]);
      const legs = new THREE.BoxGeometry(0.36, 0.14, 0.46); P.add('in_person', legs, x, FLOOR + 0.57, z + 0.08); pc(rnd() < 0.6 ? 0x23262c : 0x4a5a78);
      const hx = x + lean * -0.6;
      P.add('in_person', new THREE.SphereGeometry(0.115, 12, 9), hx, FLOOR + 1.24, z - 0.12); pc(rnd() < 0.85 ? 0x17120f : 0x7a6a5a);
      P.add('in_person', new THREE.SphereGeometry(0.1, 10, 8), hx, FLOOR + 1.2, z - 0.07); pc(0xd9b08c);
    });

    // 室内不受太阳直射：用自发光材质 + 烘焙到顶点色里的“顶灯”明暗（朝上的面亮、靠近地板处有环境光遮蔽、朝窗的面略亮）
    const lit = [], M = (hex, o) => { const m = new THREE.MeshBasicMaterial(Object.assign({ color: hex, vertexColors: true }, o || {})); m.userData.base = m.color.clone(); lit.push(m); return m; };
    const mats = {
      in_wall: M(0xd9dde0), in_frame: M(0x9aa2aa), in_trim: M(0x7f8890), in_blind: M(0x8197ad),
      in_glass: new THREE.MeshBasicMaterial({ color: 0x9fc3d8, transparent: true, opacity: 0.06, depthWrite: false }),
      in_door: M(0xc4d0d8, { transparent: true, opacity: 0.92 }), in_rack: M(0xb8c6ce, { transparent: true, opacity: 0.75 }),
      in_bag: M(0xffffff), in_floor: M(0x4e545a), in_carpet: M(0x2e3d5c), in_ceil: M(0xeceef0),
      in_light: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.9).multiplyScalar(1.3), toneMapped: false }),
      in_seat: M(0x2c4877), in_head: M(0xeeeeec), in_person: M(0xffffff)
    };
    const group = new THREE.Group();
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    P.build((k) => mats[k]).forEach(({ geo, mat }) => {
      const col = geo.attributes.color, nor = geo.attributes.normal, pos = geo.attributes.position;
      if (mat.vertexColors) for (let i = 0; i < col.count; i++) {
        const ny = nor.getY(i), nx = nor.getX(i), y = pos.getY(i);
        const sh = (0.66 + 0.3 * Math.max(0, ny) - 0.12 * Math.max(0, -ny) + 0.08 * Math.abs(nx)) * (0.62 + 0.38 * sm(FLOOR, FLOOR + 1.1, y));
        col.setXYZ(i, col.getX(i) * sh, col.getY(i) * sh, col.getZ(i) * sh);
      }
      const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; if (mat.transparent) m.renderOrder = 2; group.add(m);
    });

    // LED 信息屏（前端门上方，朝向乘客）
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 96;
    const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    const ledW = 1.3, ledH = ledW * cv.height / cv.width;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(ledW + 0.08, ledH + 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0x15181b }));
    housing.position.set(0, 3.42, z1 - 0.04); group.add(housing);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(ledW, ledH), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    led.rotation.y = Math.PI; led.position.set(0, 3.42, z1 - 0.075); group.add(led);
    // 点阵遮罩（预渲染一次）
    const mask = document.createElement('canvas'); mask.width = cv.width; mask.height = cv.height;
    { const m = mask.getContext('2d'); m.fillStyle = 'rgba(0,0,0,0.55)'; for (let x = 0; x < cv.width; x += 4) m.fillRect(x, 0, 1, cv.height); for (let y = 0; y < cv.height; y += 4) m.fillRect(0, y, cv.width, 1); }

    group.visible = false; car.add(group);

    const st = { t: 0, scroll: 0, msgIdx: 0, msg: '', w: 0, acc: 0 };
    function drawLED(o) {
      if (!st.msg || st.scroll > st.w + cv.width) {
        const msgs = [
          '欢迎乘坐复兴号动车组  G' + o.train + ' 次   03 车  二等座',
          '下一站：' + o.next + '站   距离 ' + o.nextKm + ' 公里',
          '当前速度：' + Math.round(o.kmh) + ' km/h      车外温度：' + o.temp + '℃',
          '请勿在车厢内吸烟   请保管好随身物品   祝您旅途愉快'
        ];
        st.msg = msgs[st.msgIdx++ % msgs.length]; st.scroll = 0;
        g.font = 'bold 66px "Microsoft YaHei","PingFang SC",sans-serif'; st.w = g.measureText(st.msg).width;
      }
      // 速度消息实时刷新数字
      let msg = st.msg;
      if (msg.indexOf('当前速度') === 0) msg = '当前速度：' + Math.round(o.kmh) + ' km/h      车外温度：' + o.temp + '℃';
      g.fillStyle = '#050302'; g.fillRect(0, 0, cv.width, cv.height);
      g.font = 'bold 66px "Microsoft YaHei","PingFang SC",sans-serif'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(255,80,20,0.9)'; g.shadowBlur = 10; g.fillStyle = '#ff5a1e';
      g.fillText(msg, cv.width - st.scroll, cv.height / 2 + 3);
      g.shadowBlur = 0; g.drawImage(mask, 0, 0);
      tex.needsUpdate = true;
    }

    function update(dt, visible, o) {
      group.visible = visible;
      if (!visible) return;
      st.acc += dt; st.scroll += dt * 150;
      if (st.acc > 0.05) { st.acc = 0; drawLED(o); }
      // 夜间/隧道里车厢灯更显亮：提高自发光
      // 白天车内相对窗外偏暗；夜里/隧道里只剩车厢灯，内景相对更亮
      const k = 0.62 + 0.16 * (o.dark || 0);
      lit.forEach(m => m.color.copy(m.userData.base).multiplyScalar(k));
    }

    return { group, eye, lookDir: new THREE.Vector3(-6.2, -0.15, 8.2), update };
  }
  window.Interior = { build };
})();
