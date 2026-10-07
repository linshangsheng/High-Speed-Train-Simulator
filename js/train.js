/* 动车组：8 节编组。流线型头车(放样)+贴图涂装+转向架/风挡/受电弓/空调罩，沿曲线逐节摆放 */
(function () {
  const S = TrainShape, NCARS = 8, RAIL_Y = S.RAIL_Y;
  const GU = GeomUtil;

  function boxGeo(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
  function cylGeo(r, len, seg) { return new THREE.CylinderGeometry(r, r, len, seg || 14); }
  // 在 y-z 平面里连接两点的杆件
  function bar(parts, y0, z0, y1, z1, t, w, color) {
    const dy = y1 - y0, dz = z1 - z0, len = Math.hypot(dy, dz);
    parts.push({ geo: boxGeo(w, len, t), pos: [0, (y0 + y1) / 2, (z0 + z1) / 2], rot: [Math.atan2(dz, dy), 0, 0], color });
  }

  // ---- 转向架 + 底部设备 (一个车一块几何) ----
  function underframe(bogieZ, equipZ) {
    const p = [];
    bogieZ.forEach(z => {
      for (const sx of [-1, 1]) {
        p.push({ geo: boxGeo(0.18, 0.3, 2.9), pos: [sx * 0.98, 0.86, z], color: 0x2c3036 });
        for (const dz of [-1.25, 1.25]) {
          p.push({ geo: cylGeo(0.46, 0.14, 24), pos: [sx * 0.76, 1.01, z + dz], rot: [0, 0, Math.PI / 2], color: 0x4a4f56 });
          p.push({ geo: cylGeo(0.47, 0.03, 24), pos: [sx * 0.69, 1.01, z + dz], rot: [0, 0, Math.PI / 2], color: 0x8b9097 });
          p.push({ geo: cylGeo(0.3, 0.025, 20), pos: [sx * 0.52, 1.01, z + dz], rot: [0, 0, Math.PI / 2], color: 0x6f747a });
        }
      }
      p.push({ geo: boxGeo(1.9, 0.26, 0.34), pos: [0, 0.84, z - 0.6], color: 0x30343a });
      p.push({ geo: boxGeo(1.9, 0.26, 0.34), pos: [0, 0.84, z + 0.6], color: 0x30343a });
      for (const dz of [-1.25, 1.25]) p.push({ geo: cylGeo(0.06, 1.7, 8), pos: [0, 1.01, z + dz], rot: [0, 0, Math.PI / 2], color: 0x7a7f86 });
      for (const dz of [-0.55, 0.55]) p.push({ geo: cylGeo(0.2, 0.9, 12), pos: [0, 0.95, z + dz], rot: [0, 0, Math.PI / 2], color: 0x23272c });
      for (const sx of [-1, 1]) for (const dz of [-1.0, 1.0]) p.push({ geo: cylGeo(0.07, 0.4, 8), pos: [sx * 0.98, 1.08, z + dz], color: 0x6b7078 });
    });
    (equipZ || []).forEach(z => p.push({ geo: boxGeo(2.2, 0.38, 3.6), pos: [0, 0.78, z], color: 0x1d2024 }));
    return GU.merge(p);
  }

  // ---- 风挡（车端橡胶连接） ----
  function diaphragm(len, front, rear) {
    const mk = (z0, sgn) => {
      const secs = [];
      for (let i = 0; i <= 6; i++) secs.push({ z: z0 + sgn * 0.5 * i / 6, ring: S.ring(S.A * (i % 2 ? 0.985 : 0.95), S.YB + 0.05, S.YT - 0.06) });
      return GU.loft(secs, null, false, false);
    };
    const parts = [];
    if (front) parts.push({ geo: mk(len / 2 - 0.02, 1) });
    if (rear) parts.push({ geo: mk(-len / 2 + 0.02, -1) });
    return GU.merge(parts.map(p => Object.assign(p, { color: 0x17191c })));
  }

  // ---- 车顶设备：空调罩 + 受电弓 ----
  function roofGear(len, pant) {
    const p = [], yt = S.YT;
    [-len * 0.28, len * 0.28].forEach(z => {
      p.push({ geo: boxGeo(1.55, 0.3, 3.2), pos: [0, yt + 0.02, z], color: 0xd9dde1 });
      p.push({ geo: boxGeo(1.4, 0.06, 3.0), pos: [0, yt + 0.19, z], color: 0xbfc4c9 });
    });
    if (pant) {
      const z = 0;
      for (const sx of [-1, 1]) for (const dz of [-1.0, 1.0]) p.push({ geo: cylGeo(0.09, 0.32, 8), pos: [sx * 0.55, yt + 0.1, z + dz], color: 0xe8e0c8 });
      p.push({ geo: boxGeo(1.5, 0.08, 2.3), pos: [0, yt + 0.26, z], color: 0x2a2d31 });
      bar(p, yt + 0.3, z - 0.9, yt + 1.15, z + 0.35, 0.07, 0.1, 0x30343a);
      bar(p, yt + 1.15, z + 0.35, 6.33, z - 0.55, 0.06, 0.08, 0x30343a);
      p.push({ geo: boxGeo(1.9, 0.05, 0.3), pos: [0, 6.36, z - 0.55], color: 0x15171a });
      p.push({ geo: boxGeo(0.05, 0.12, 0.34), pos: [-0.95, 6.33, z - 0.55], color: 0x2a2d31 });
      p.push({ geo: boxGeo(0.05, 0.12, 0.34), pos: [0.95, 6.33, z - 0.55], color: 0x2a2d31 });
    }
    return GU.merge(p);
  }

  // opts: { scheme: 'blue'|'red'|'gold', light: 是否带前照灯光源 }
  function build(scene, opts) {
    opts = opts || {};
    const root = new THREE.Group(); scene.add(root);
    const set = { mid: Livery.make('mid', opts.scheme), head: Livery.make('head', opts.scheme) };
    const bodyMat = (k) => new THREE.MeshStandardMaterial({
      map: set[k].map, roughnessMap: set[k].orm, metalnessMap: set[k].orm, roughness: 1, metalness: 1,
      bumpMap: set[k].bump, bumpScale: 1.6, emissiveMap: set[k].emis, emissive: 0xffffff, emissiveIntensity: 0, envMapIntensity: 1.0
    });
    const mats = {
      mid: bodyMat('mid'), head: bodyMat('head'),
      under: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.7 }),
      rubber: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
      roof: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.45 }),
      lampW: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.85).multiplyScalar(2.2) }),
      lampR: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.12, 0.08).multiplyScalar(2.0) }),
      cover: new THREE.MeshStandardMaterial({ color: 0x1d2025, roughness: 0.5, metalness: 0.6 })
    };

    const geo = {
      mid: GU.loft(S.midSections(), (x, y, z) => [(z + S.CAR_L / 2) / S.CAR_L, (y - S.V0) / S.VH], false, false),
      head: GU.loft(S.headSections(), (x, y, z) => [(z + S.HEAD_L / 2) / S.HEAD_L, (y - S.V0) / S.VH], false, true),
      underMid: underframe([-8.4, 8.4], [0]),
      underHead: underframe([-9.2, 5.6], [-1.6]),
      dMid: diaphragm(S.CAR_L, true, true),
      dHead: diaphragm(S.HEAD_L, false, true),
      roofPlain: roofGear(S.CAR_L, false), roofPant: roofGear(S.CAR_L, true), roofHead: roofGear(S.HEAD_L - 8, false)
    };

    const cars = [], lamps = [], offsets = [], hideCab = [];
    function makeCar(i) {
      const head = i === 0, tail = i === NCARS - 1, endCar = head || tail;
      const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
      const bm = new THREE.Mesh(endCar ? geo.head : geo.mid, endCar ? mats.head : mats.mid); bm.castShadow = true; inner.add(bm);
      const um = new THREE.Mesh(endCar ? geo.underHead : geo.underMid, mats.under); inner.add(um); if (head) hideCab.push(um);
      inner.add(new THREE.Mesh(endCar ? geo.dHead : geo.dMid, mats.rubber));
      const rg = endCar ? geo.roofHead : (i === 1 || i === 5 ? geo.roofPant : geo.roofPlain);
      const rm = new THREE.Mesh(rg, mats.roof); rm.castShadow = true; inner.add(rm); if (head) hideCab.push(rm);
      if (endCar) {
        const L = S.HEAD_L;
        const cover = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mats.cover); cover.scale.set(0.3, 0.2, 0.34);
        cover.position.set(0, 1.62, L / 2 - 0.16); inner.add(cover); if (head) hideCab.push(cover);
        const zb = L / 2 - S.NOSE_L;
        function placeLamp(s, y, w, h, mat) {
          const ring = S.ring(S.noseA(s), S.noseBot(s), S.noseTop(s)), x = S.xAt(ring, y) - 0.015;
          for (const sx of [-1, 1]) {
            const lamp = new THREE.Mesh(boxGeo(w, h, 0.07), mat);
            lamp.position.set(sx * x, y, zb + S.NOSE_L * s); lamp.rotation.y = sx * Math.atan2(x, 1.2); inner.add(lamp); lamps.push(lamp);
          }
        }
        placeLamp(0.88, 1.52, 0.34, 0.1, tail ? mats.lampR : mats.lampW);
        placeLamp(0.83, 1.78, 0.16, 0.16, tail ? mats.lampR : mats.lampW);
        if (tail) inner.rotation.y = Math.PI;
      }
      root.add(g); cars.push(g);
    }
    for (let i = 0; i < NCARS; i++) makeCar(i);
    const headLamps = lamps.slice(0, 4).concat(hideCab);

    let acc = 0;
    for (let i = 0; i < NCARS; i++) {
      const L = (i === 0 || i === NCARS - 1) ? S.HEAD_L : S.CAR_L;
      offsets.push(acc + L / 2); acc += L + S.GAP;
    }
    const totalLen = acc - S.GAP;

    const spot = new THREE.SpotLight(0xfff2cf, 0, 800, 0.30, 0.55, 1.2);
    if (opts.light !== false) { scene.add(spot); scene.add(spot.target); }
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Vector3(), _d = new THREE.Vector3();
    const head = { pos: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1), front: new THREE.Vector3(), yaw: 0, s: 0 };

    // s = 车头最前端的弧长
    // dir=+1 沿弧长增加方向行驶；dir=-1 反向（对向列车）
    function update(s, at, night, dir) {
      dir = dir || 1;
      for (let i = 0; i < NCARS; i++) {
        const sc = s - dir * offsets[i], half = 8.5;
        const f = at(sc + half); _a.copy(f.pos);
        const r = at(sc - half); _b.copy(r.pos);
        _d.subVectors(_a, _b); _d.y = 0; _d.normalize(); if (dir < 0) _d.negate();
        const c = at(sc); _m.copy(c.pos);
        const car = cars[i];
        car.position.set(_m.x, 0, _m.z);
        car.rotation.y = Math.atan2(_d.x, _d.z);
        if (i === 0) { head.dir.copy(_d); head.pos.set(_m.x, 0, _m.z); head.yaw = car.rotation.y; }
      }
      head.front.copy(head.pos).addScaledVector(head.dir, S.HEAD_L / 2);
      head.s = s;
      const em = night * 0.9; mats.mid.emissiveIntensity = em; mats.head.emissiveIntensity = em;
      spot.intensity = night * 6;
      spot.position.copy(head.front).add(new THREE.Vector3(0, 1.6, 0)).addScaledVector(head.dir, -1.5);
      spot.target.position.copy(head.front).addScaledVector(head.dir, 90).add(new THREE.Vector3(0, -1.2, 0));
      return head;
    }
    function setEnv(tex, intensity) {
      [mats.mid, mats.head, mats.under, mats.rubber, mats.roof, mats.cover].forEach(m => { m.envMap = tex; m.envMapIntensity = intensity; m.needsUpdate = true; });
    }
    return { update, head, cars, lamps: headLamps, allLamps: lamps, setEnv, mats, CAR_L: S.CAR_L, HEAD_L: S.HEAD_L, GAP: S.GAP, NCARS, RAIL_Y, root, spot, totalLen };
  }

  window.Train = { build, CAR_L: S.CAR_L, HEAD_L: S.HEAD_L };
})();
