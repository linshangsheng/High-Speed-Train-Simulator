/* 几何工具：把多个带变换/顶点色的小几何合并成一个，减少 draw call */
(function () {
  const _m = new THREE.Matrix4(), _n = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

  // parts: [{ geo, pos:[x,y,z], rot:[x,y,z], scale:[x,y,z]|number, color:hex|Color }]
  function merge(parts) {
    let nv = 0, ni = 0;
    const gs = parts.map(p => { const g = p.geo.index ? p.geo : p.geo; return g; });
    gs.forEach(g => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uvs = new Float32Array(nv * 2), idx = new Uint32Array(ni);
    let vo = 0, io = 0;
    const c = new THREE.Color();
    parts.forEach((p, k) => {
      const g = gs[k], P = g.attributes.position, N = g.attributes.normal;
      const sc = p.scale == null ? [1, 1, 1] : (typeof p.scale === 'number' ? [p.scale, p.scale, p.scale] : p.scale);
      _e.set(...(p.rot || [0, 0, 0])); _q.setFromEuler(_e);
      _m.compose(_v.set(...(p.pos || [0, 0, 0])), _q, _s.set(sc[0], sc[1], sc[2]));
      _n.getNormalMatrix(_m);
      c.set(p.color != null ? p.color : 0xffffff);
      const UV = g.attributes.uv;
      for (let i = 0; i < P.count; i++) {
        if (UV) { uvs[(vo + i) * 2] = UV.getX(i); uvs[(vo + i) * 2 + 1] = UV.getY(i); }
        _v.fromBufferAttribute(P, i).applyMatrix4(_m);
        pos[(vo + i) * 3] = _v.x; pos[(vo + i) * 3 + 1] = _v.y; pos[(vo + i) * 3 + 2] = _v.z;
        if (N) { _v.fromBufferAttribute(N, i).applyMatrix3(_n).normalize(); nor[(vo + i) * 3] = _v.x; nor[(vo + i) * 3 + 1] = _v.y; nor[(vo + i) * 3 + 2] = _v.z; }
        col[(vo + i) * 3] = c.r; col[(vo + i) * 3 + 1] = c.g; col[(vo + i) * 3 + 2] = c.b;
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.getX(i) + vo;
      else for (let i = 0; i < P.count; i++) idx[io++] = vo + i;
      vo += P.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  }

  // 环形截面放样：sections = [{ z, ring:[[x,y],...] }]，各截面点数相同、环形闭合；uvFn(x,y,z)->[u,v]
  // capEnd/capStart: 用扇形封口
  function loft(sections, uvFn, capStart, capEnd) {
    const R = sections[0].ring.length, pos = [], uv = [], idx = [];
    sections.forEach(sec => sec.ring.forEach(([x, y]) => { pos.push(x, y, sec.z); const t = uvFn ? uvFn(x, y, sec.z) : [0, 0]; uv.push(t[0], t[1]); }));
    for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < R; j++) {
      const a = i * R + j, b = i * R + (j + 1) % R, c = a + R, d = b + R;
      idx.push(a, b, c, b, d, c);   // 环为逆时针(自 +z 看)，此顺序法线朝外
    }
    function cap(si, flip) {
      const cx = sections[si].ring.reduce((s, p) => s + p[0], 0) / R, cy = sections[si].ring.reduce((s, p) => s + p[1], 0) / R;
      const ci = pos.length / 3; pos.push(cx, cy, sections[si].z); const t = uvFn ? uvFn(cx, cy, sections[si].z) : [0, 0]; uv.push(t[0], t[1]);
      for (let j = 0; j < R; j++) { const a = si * R + j, b = si * R + (j + 1) % R; flip ? idx.push(ci, a, b) : idx.push(ci, b, a); }   // 起始封口朝 -z，末端朝 +z
    }
    if (capStart) cap(0, false);
    if (capEnd) cap(sections.length - 1, true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  window.GeomUtil = { merge, loft };
})();
