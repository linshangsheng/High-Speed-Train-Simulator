/* 沿途风景：按弧长分块动态生成/回收。每块 = 地形条带 + 湖面 + 植被实例 + 区域特色物件 + (城市布景) */
(function () {
  const CHUNK = 160, AHEAD = 2800, BEHIND = 500;

  /* ---------- 共享几何 / 材质库（供特色物件与城市地标使用） ---------- */
  const geo = {
    box: (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g; })(),
    cone: (() => { const g = new THREE.ConeGeometry(1, 1, 7); g.translate(0, 0.5, 0); return g; })(),
    cone4: (() => { const g = new THREE.ConeGeometry(1, 1, 4); g.translate(0, 0.5, 0); g.rotateY(Math.PI / 4); return g; })(),
    mount: (() => { const g = new THREE.ConeGeometry(1, 1, 6, 3); g.translate(0, 0.5, 0);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0.02 && y < 0.98) { p.setX(i, p.getX(i) * (0.85 + Math.random() * 0.3)); p.setZ(i, p.getZ(i) * (0.85 + Math.random() * 0.3)); } }
      g.computeVertexNormals(); return g; })(),
    blob: new THREE.IcosahedronGeometry(1, 1),
    sph: new THREE.SphereGeometry(1, 14, 10),
    cyl: (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 10); g.translate(0, 0.5, 0); return g; })(),
    disc: (() => { const g = new THREE.CircleGeometry(1, 28); g.rotateX(-Math.PI / 2); return g; })(),
    plane: new THREE.PlaneGeometry(1, 1),
    hill: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  };
  const matCache = {};
  function mat(hex, o) {
    const key = hex + (o ? JSON.stringify(o) : '');
    if (!matCache[key]) matCache[key] = new THREE.MeshLambertMaterial(Object.assign({ color: hex }, o || {}));
    return matCache[key];
  }
  const rotors = [];

  function rng(seed) {
    let a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  const builders = {};
  const chunks = new Map();
  let root, trackRef;

  function makeCtx(index) {
    const s0 = index * CHUNK, r = rng(index * 9973 + 17);
    const mid = s0 + CHUNK / 2, ri = Route.regionAt(mid), dom = ri.k < 0.5 ? ri.a : ri.b;
    const P = Object.assign({}, TerrainCore.paramsFor(ri)), base = TerrainCore.baseAt(mid, P);
    const group = new THREE.Group();
    const T = Terrain.chunk(s0, CHUNK);
    group.add(T.mesh); T.mesh.userData.own = true;
    const w = Terrain.water(s0, CHUNK); if (w) { w.traverse(o => { if (o.isMesh) o.userData.own = true; }); group.add(w); }

    let city = null;
    for (const c of Route.CITIES) {
      const d = Math.abs(Route.wrap(mid - c.s + Route.LENGTH / 2) - Route.LENGTH / 2);
      if (d < 420 + (Scenery.cityRadius || 0)) { city = c; break; }
    }
    const ctx = {
      index, s0, len: CHUNK, rnd: r, region: dom, ri, group, P, base, terrain: T, city,
      range: (a, b) => a + (b - a) * r(),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      sign: () => (r() < 0.5 ? -1 : 1),
      add(mesh) { group.add(mesh); return mesh; },
      groundAt(al, lat) { return T.sample(al, lat).h; },
      // 通用放置: 沿线 along ∈[0,CHUNK], 侧向 lat(右为正)；y 为相对地面的高度
      put(mesh, along, lat, y, ry) {
        const a = trackRef.at(s0 + along), p = a.pos, t = a.tan;
        const gh = Math.abs(lat) < 1650 ? T.sample(along, lat).h : 0;
        mesh.position.set(p.x - t.z * lat, (y || 0) + gh, p.z + t.x * lat);
        if (Math.abs(lat) < 70 && Tunnels.inside(s0 + along, 30)) mesh.visible = false;
        if (ry !== undefined) mesh.rotation.y = ry;
        group.add(mesh); return mesh;
      },
      trackAt(s) { return trackRef.at(s); },
      tangentAngle(along) { const t = trackRef.at(s0 + along).tan; return Math.atan2(t.x, t.z); },
      mk(g, m, sx, sy, sz, cast) { const me = new THREE.Mesh(g, m); me.scale.set(sx, sy, sz); me.castShadow = !!cast; return me; },
      // 禁止植被的位置：轨道走廊、隧道山体、城区
      noFlora(al, lat) {
        if (Math.abs(lat) < 16) return true;
        if (Math.abs(lat) < 60 && Tunnels.inside(s0 + al, 40)) return true;
        if (city && Math.abs(lat) < 320) return true;
        return false;
      },
      mat
    };
    return ctx;
  }

  function buildChunk(index) {
    const ctx = makeCtx(index);
    Flora.begin(ctx);
    ctx.floraGroup = new THREE.Group(); ctx.group.add(ctx.floraGroup);
    Line.chunk(ctx);
    const fn = builders[ctx.region.type] || builders.plain;
    fn && fn(ctx);
    if (Scenery.cityBuilder && ctx.city) Scenery.cityBuilder(ctx, ctx.city);
    const c = ctx.terrain.sample(CHUNK / 2, 0);
    Flora.flush(ctx, new THREE.Vector3(c.x, c.h, c.z), 330);
    ctx.group.userData.cull = { g: ctx.floraGroup, sphere: new THREE.Sphere(new THREE.Vector3(c.x, c.h + 20, c.z), 720) };
    root.add(ctx.group);
    chunks.set(index, ctx.group);
  }

  function disposeGroup(g) {
    g.traverse(o => {
      if (o.isInstancedMesh) { o.dispose(); }
      else if ((o.isMesh || o.isLineSegments) && o.userData.own) o.geometry.dispose();
      if (o.userData && o.userData.rotor) { const k = rotors.indexOf(o); if (k >= 0) rotors.splice(k, 1); }
    });
  }

  function init(scene, track) { root = new THREE.Group(); scene.add(root); trackRef = track; }

  const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4();
  function update(dt, s, force, camera) {
    const lo = Math.floor((s - BEHIND) / CHUNK), hi = Math.floor((s + AHEAD) / CHUNK);
    let budget = force ? 1e9 : 2;
    for (const [i, g] of chunks) if (i < lo || i > hi) { root.remove(g); disposeGroup(g); chunks.delete(i); }
    for (let i = lo; i <= hi && budget > 0; i++) if (!chunks.has(i)) { buildChunk(i); budget--; }
    for (const r of rotors) r.rotation.z += dt * (r.userData.spd || 1.2);
    if (camera) {   // 区块级视锥剔除：植被/建筑实例整组隐藏
      camera.updateMatrixWorld(); _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
      for (const [, g] of chunks) { const c = g.userData.cull; if (c) c.g.visible = _fr.intersectsSphere(c.sphere); }
    }
  }

  window.Scenery = { init, update, builders, geo, mat, rng, rotors, CHUNK, cityBuilder: null, cityRadius: 0 };
})();
