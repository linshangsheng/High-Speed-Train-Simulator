/* 跨河特大桥上部结构：钢拱桥(带吊杆与横撑)、钢桁梁桥(华伦式桁架+上平联)、斜拉桥(倒Y形主塔+扇形斜拉索)。
   桥面与桥墩由 line.js 的高架段生成，这里只做“标志性”的上部结构，沿线路曲线逐段摆放。 */
(function () {
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
  function bar(parts, a, b, w, h) {
    _d.set(b.x - a.x, b.y - a.y, b.z - a.z); const len = _d.length(); if (len < 0.01) return;
    _q.setFromUnitVectors(_up, _d.normalize()); _e.setFromQuaternion(_q);
    parts.push({ geo: new THREE.BoxGeometry(w, len, h || w), pos: [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2], rot: [_e.x, _e.y, _e.z] });
  }

  let track = null;
  // 线路坐标 → 世界点
  function P(s, lat, y) { const a = track.at(s); return new THREE.Vector3(a.pos.x - a.tan.z * lat, y, a.pos.z + a.tan.x * lat); }

  function arch(r, s0, s1, parts, thin) {
    const span = s1 - s0, H = Math.max(28, Math.min(72, span * 0.19)), N = 30, lat = 7.7;
    const y = (f) => 0.6 + H * (1 - Math.pow(2 * f - 1, 2));
    for (const sx of [-1, 1]) for (let i = 0; i < N; i++) {
      const f0 = i / N, f1 = (i + 1) / N;
      bar(parts, P(s0 + span * f0, sx * lat, y(f0)), P(s0 + span * f1, sx * lat, y(f1)), 1.5, 2.2);
    }
    for (let sx = -1; sx <= 1; sx += 2) for (let x = 8; x < span - 8; x += 8) { const f = x / span; if (y(f) > 3) bar(thin, P(s0 + x, sx * lat, 1.0), P(s0 + x, sx * lat, y(f)), 0.16); }
    for (let i = 2; i < N - 1; i += 3) { const f = i / N; if (y(f) > 12) { bar(parts, P(s0 + span * f, -lat, y(f)), P(s0 + span * f, lat, y(f)), 0.9, 0.9); if (i + 3 < N) bar(thin, P(s0 + span * f, -lat, y(f)), P(s0 + span * (f + 3 / N), lat, y(f + 3 / N)), 0.35); } }
    for (const f of [0, 1]) for (const sx of [-1, 1]) bar(parts, P(s0 + span * f, sx * lat, -3.2), P(s0 + span * f, sx * lat, 1.2), 2.6, 3.2);   // 拱脚
  }

  function truss(r, s0, s1, parts, thin) {
    const span = s1 - s0, panel = 12, n = Math.max(2, Math.round(span / panel)), pl = span / n, H = 14.5, lat = 7.5;
    for (const sx of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const a = s0 + i * pl, b = a + pl;
        bar(parts, P(a, sx * lat, 0.8), P(b, sx * lat, 0.8), 0.9, 1.4);            // 下弦
        bar(parts, P(a, sx * lat, H), P(b, sx * lat, H), 0.9, 1.2);                 // 上弦
        bar(parts, P(a, sx * lat, 0.8), P(a, sx * lat, H), 0.7, 0.7);               // 竖杆
        bar(parts, i % 2 ? P(a, sx * lat, 0.8) : P(a, sx * lat, H), i % 2 ? P(b, sx * lat, H) : P(b, sx * lat, 0.8), 0.6, 0.6);   // 斜杆
      }
      bar(parts, P(s1, sx * lat, 0.8), P(s1, sx * lat, H), 0.7, 0.7);
    }
    for (let i = 0; i <= n; i++) { const a = s0 + i * pl; bar(parts, P(a, -lat, H), P(a, lat, H), 0.5, 0.8); if (i < n) { bar(thin, P(a, -lat, H), P(a + pl, lat, H), 0.25); bar(thin, P(a, lat, H), P(a + pl, -lat, H), 0.25); } }
    for (const a of [s0, s1]) for (const sx of [-1, 1]) bar(parts, P(a, sx * lat, H), P(a, 0, H + 3), 0.6, 0.6);     // 桥门架
  }

  function cable(r, s0, s1, parts, thin, ground) {
    const span = s1 - s0, mid = (s0 + s1) / 2, Hp = 105;
    const towers = [mid - span * 0.36, mid + span * 0.36];
    towers.forEach((ts) => {
      const g = ground(ts) - 2;
      for (const sx of [-1, 1]) { bar(parts, P(ts, sx * 13, g), P(ts, sx * 3.2, 62), 3.2, 4.2); }
      bar(parts, P(ts, 0, 62), P(ts, 0, Hp), 3.6, 5.2); bar(parts, P(ts, -11, -3.6), P(ts, 11, -3.6), 2.2, 3.2);
      bar(parts, P(ts - 0.01, -14, g), P(ts + 0.01, 14, g), 6, 9);
      for (let k = 1; k <= 11; k++) {
        const top = 72 + k * 2.6;
        for (const dir of [-1, 1]) {
          const ds = dir * k * 11.5;
          for (const sx of [-1, 1]) bar(thin, P(ts, 0, top), P(ts + ds, sx * 6.6, 1.2), 0.14);
        }
      }
      parts.push({ geo: new THREE.SphereGeometry(1.2, 8, 6), pos: P(ts, 0, Hp + 1).toArray(), rot: [0, 0, 0] });
    });
  }

  function build(scene, trk) {
    if (!window.Rivers) return; track = trk;
    Rivers.list.forEach((r) => {
      const span = r.w / Math.max(0.35, Math.abs(Math.sin(r.ang))) + (r.type === 'cable' ? 160 : 50);
      const s0 = r.sc - span / 2, s1 = r.sc + span / 2, parts = [], thin = [];
      r.bridge = { s0, s1, name: r.name + '特大桥', len: Math.round(span * 1.6) };
      if (r.type === 'girder') return;
      const ground = (s) => Terrain.height(s, 0);
      if (r.type === 'arch') arch(r, s0, s1, parts, thin);
      else if (r.type === 'truss') truss(r, s0, s1, parts, thin);
      else cable(r, s0, s1, parts, thin, ground);
      const col = new THREE.Color(r.color || 0x8a9399);
      const m1 = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.65, envMapIntensity: 1.1 });
      const m2 = new THREE.MeshStandardMaterial({ color: r.type === 'cable' ? 0xf4f6f8 : col.clone().multiplyScalar(0.9), roughness: 0.5, metalness: 0.6 });
      if (r.type === 'cable') { m1.color.set(0xd9dcdf); m1.metalness = 0.1; m1.roughness = 0.75; }
      [[parts, m1], [thin, m2]].forEach(([p, m]) => { if (!p.length) return; const mesh = new THREE.Mesh(GeomUtil.merge(p), m); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh); });
    });
  }
  // 当前所在的大桥
  function at(s) { if (!window.Rivers) return null; s = Route.wrap(s); for (const r of Rivers.list) if (r.bridge && s > r.bridge.s0 && s < r.bridge.s1) return r; return null; }
  window.Bridges = { build, at };
})();
