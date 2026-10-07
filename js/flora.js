/* 植被与碎石：合并几何原型 + 每块 InstancedMesh + 风吹摆动/积雪着色器。按噪声成片分布，贴合地形。 */
(function () {
  const GU = GeomUtil, N = Noise, sm = N.smooth;
  const U = { uTime: { value: 0 }, uWind: { value: 0.5 }, uSnow: { value: 0 }, uWet: { value: 0 } };

  // ---------- 原型几何 ----------
  const rndSeed = (() => { let a = 12345; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
  function blob(detail, jitter) {
    const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
    const cache = new Map();
    for (let i = 0; i < p.count; i++) {   // 相同位置同一位移，避免撕裂
      const key = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
      if (!cache.has(key)) cache.set(key, 1 + (rndSeed() - 0.5) * jitter);
      const f = cache.get(key); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
    }
    g.computeVertexNormals(); return g;
  }
  function cyl(rt, rb, h, seg) { const g = new THREE.CylinderGeometry(rt, rb, h, seg || 6); g.translate(0, h / 2, 0); return g; }
  function cone(r, h, seg) { const g = new THREE.ConeGeometry(r, h, seg || 7); g.translate(0, h / 2, 0); return g; }
  // 按高度做环境光遮蔽式明暗
  function shade(g, y0, y1, dark) {
    const p = g.attributes.position, c = g.attributes.color;
    for (let i = 0; i < p.count; i++) { const k = dark + (1 - dark) * Math.min(1, Math.max(0, (p.getY(i) - y0) / (y1 - y0))); c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k); }
    return g;
  }

  const protos = {};
  function define(name, parts, y0, y1, dark) { const g = GU.merge(parts); shade(g, y0, y1, dark); protos[name] = g; }

  function build() {
    // 针叶树：高 1，冠宽约 0.5
    {
      const p = [{ geo: cyl(0.035, 0.05, 0.22, 5), pos: [0, 0, 0], color: 0x5a3b24 }];
      const cols = [0x2c7c4a, 0x328654, 0x3a9060, 0x449b68];
      for (let k = 0; k < 4; k++) p.push({ geo: cone(0.30 - k * 0.055, 0.40 - k * 0.04, 6), pos: [0, 0.13 + k * 0.205, 0], rot: [0, k * 0.5, 0], color: cols[k] });
      define('conifer', p, 0, 1, 0.72);
    }
    // 阔叶树
    {
      const p = [{ geo: cyl(0.04, 0.06, 0.42, 5), color: 0x6a4528 }];
      p.push({ geo: blob(1, 0.35), pos: [0, 0.62, 0], scale: [0.32, 0.27, 0.32], color: 0x3e8a3c });
      p.push({ geo: blob(0, 0.35), pos: [0.15, 0.5, 0.07], scale: [0.22, 0.2, 0.22], color: 0x479443 });
      p.push({ geo: blob(0, 0.35), pos: [-0.14, 0.56, -0.08], scale: [0.22, 0.21, 0.22], color: 0x36803a });
      p.push({ geo: blob(0, 0.35), pos: [0.02, 0.82, 0.02], scale: [0.2, 0.18, 0.2], color: 0x4a9a44 });
      define('broad', p, 0.25, 1.0, 0.7);
    }
    // 杨树/柏树：细高
    {
      const p = [{ geo: cyl(0.025, 0.04, 0.2, 5), color: 0x8a7a62 }];
      p.push({ geo: blob(1, 0.25), pos: [0, 0.58, 0], scale: [0.12, 0.40, 0.12], color: 0x4a8a38 });
      p.push({ geo: blob(0, 0.25), pos: [0, 0.35, 0], scale: [0.14, 0.2, 0.14], color: 0x3f7f34 });
      define('poplar', p, 0.1, 1.0, 0.6);
    }
    // 棕榈
    {
      const p = [];
      for (let k = 0; k < 4; k++) p.push({ geo: cyl(0.026 - k * 0.003, 0.03 - k * 0.003, 0.22, 6), pos: [k * 0.012, k * 0.21, 0], rot: [0, 0, -0.05 * k], color: 0x8a6a46 });
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, f = cone(0.05, 0.42, 4);
        p.push({ geo: f, pos: [0.04, 0.86, 0], rot: [0, a, 1.15 + (k % 2) * 0.2], scale: [1, 1, 0.45], color: k % 2 ? 0x2f8f3c : 0x3ca046 });
      }
      define('palm', p, 0.1, 1.0, 0.7);
    }
    // 灌木 / 低矮植被
    {
      const p = [];
      p.push({ geo: blob(1, 0.4), pos: [0, 0.4, 0], scale: [0.5, 0.4, 0.5], color: 0x4d8a3a });
      p.push({ geo: blob(0, 0.4), pos: [0.35, 0.3, 0.1], scale: [0.4, 0.3, 0.4], color: 0x5a9a42 });
      p.push({ geo: blob(0, 0.4), pos: [-0.3, 0.28, -0.15], scale: [0.38, 0.3, 0.38], color: 0x437f35 });
      define('bush', p, 0, 0.8, 0.6);
    }
    // 岩石
    {
      const g1 = blob(0, 0.55); g1.scale(1, 0.7, 0.9);
      define('rock', [{ geo: g1, pos: [0, 0.3, 0], color: 0x8a867e }, { geo: blob(0, 0.5), pos: [0.5, 0.15, 0.3], scale: [0.5, 0.35, 0.45], color: 0x7d7a73 }], 0, 0.9, 0.55);
    }
  }
  build();

  // ---------- 材质 ----------
  const treeMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  treeMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: U.uTime, uWind: U.uWind, uSnow: U.uSnow, uWet: U.uWet });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', 'uniform float uTime; uniform float uWind; varying float vUp;\n#include <common>')
      .replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vUp = normal.y;',
        '#ifdef USE_INSTANCING',
        'float ph = uTime*1.7 + instanceMatrix[3].x*0.045 + instanceMatrix[3].z*0.06;',
        'float sw = (sin(ph) + 0.5*sin(ph*2.3+1.3)) * 0.045 * uWind * max(position.y,0.);',
        'transformed.x += sw; transformed.z += sw*0.6;',
        '#endif'
      ].join('\n'));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', 'uniform float uSnow; uniform float uWet; varying float vUp;\n#include <common>')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88,0.92,0.97), uSnow*smoothstep(0.1,0.85,vUp)*0.92);\ndiffuseColor.rgb *= (1.0 - 0.25*uWet);');
  };

  // 草丛（十字交叉面片，alphaTest）
  function grassTexture() {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const g = cv.getContext('2d');
    for (let i = 0; i < 16; i++) {
      const x = 4 + Math.random() * 56, h = 28 + Math.random() * 34, w = 1.5 + Math.random() * 2.5, bend = (Math.random() - 0.5) * 10;
      const gr = g.createLinearGradient(0, 64, 0, 64 - h); gr.addColorStop(0, '#a8a8a8'); gr.addColorStop(1, '#ffffff');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, 64); g.quadraticCurveTo(x, 64 - h * 0.6, x + bend, 64 - h); g.quadraticCurveTo(x + w * 0.2, 64 - h * 0.6, x + w, 64); g.fill();
    }
    return srgbTex(new THREE.CanvasTexture(cv));
  }
  const grassGeo = (() => { const a = new THREE.PlaneGeometry(1, 1); a.translate(0, 0.5, 0); const b = a.clone(); b.rotateY(Math.PI / 2); return GU.merge([{ geo: a }, { geo: b }]); })();
  const grassMat = new THREE.MeshLambertMaterial({ map: grassTexture(), alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true });
  grassMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: U.uTime, uWind: U.uWind, uSnow: U.uSnow });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', 'uniform float uTime; uniform float uWind;\n#include <common>')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat gp = uTime*2.2 + instanceMatrix[3].x*0.2 + instanceMatrix[3].z*0.17;\ntransformed.x += sin(gp)*0.12*uWind*position.y*position.y;\n#endif');
  };

  // ---------- 每块收集与生成 ----------
  function begin(ctx) { ctx.flora = {}; }
  function add(ctx, name, x, y, z, sx, sy, sz, yaw, tint) {
    const l = ctx.flora[name] || (ctx.flora[name] = { m: [], c: [] });
    l.m.push(x, y, z, sx, sy, sz, yaw); l.c.push(tint.r, tint.g, tint.b);
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  // 多材质原型（建筑）：name -> [{geo, mat, cast}]，各子网格共享同一份实例矩阵/颜色
  const multi = {};
  function registerMulti(name, subs) { multi[name] = subs; }

  function flush(ctx, center, radius) {
    for (const name in ctx.flora) {
      const l = ctx.flora[name], n = l.m.length / 7; if (!n) continue;
      const subs = multi[name] || [{ geo: name === 'grass' ? grassGeo : protos[name], mat: name === 'grass' ? grassMat : treeMat, cast: name !== 'grass' && name !== 'bush' && name !== 'rock' }];
      let first = null;
      for (const sub of subs) {
        const g = sub.geo;                                         // 直接复用原型几何（不再生成外壳，避免泄漏）
        const im = new THREE.InstancedMesh(g, sub.mat, n);
        if (!first) {
          for (let i = 0; i < n; i++) {
            const o = i * 7; _e.set(0, l.m[o + 6], 0); _q.setFromEuler(_e);
            _m.compose(_p.set(l.m[o], l.m[o + 1], l.m[o + 2]), _q, _s.set(l.m[o + 3], l.m[o + 4], l.m[o + 5])); im.setMatrixAt(i, _m);
            im.setColorAt(i, _c.setRGB(l.c[i * 3], l.c[i * 3 + 1], l.c[i * 3 + 2]));
          }
          im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; first = im;
        } else { im.instanceMatrix = first.instanceMatrix; im.instanceColor = first.instanceColor; }
        im.castShadow = !!sub.cast; im.frustumCulled = false;   // 由区块级包围球统一剔除
        (ctx.floraGroup || ctx.group).add(im);
      }
    }
    ctx.flora = null;
  }

  // 散布。spec: { proto, n, lat:[min,max], skew, h:[min,max]米, w:宽高比, cluster:{f,thr}, tint:[hex...], nyMin, snowOK }
  const _t = new THREE.Color();
  function scatter(ctx, spec) {
    const T = ctx.terrain, r = ctx.rnd, P = ctx.P;
    const cl = spec.cluster || { f: 0.004, thr: 0 }, tints = (spec.tint || [0xffffff]).map(h => new THREE.Color(h));
    const hMaxRel = spec.hMax != null ? spec.hMax : P.tree;
    for (let k = 0; k < spec.n; k++) {
      const al = r() * ctx.len, side = r() < 0.5 ? -1 : 1;
      const lat = side * (spec.lat[0] + (spec.lat[1] - spec.lat[0]) * Math.pow(r(), spec.skew || 1.5));
      const q = T.sample(al, lat);
      if (spec.cluster) { const cn = N.fbm(q.x * cl.f + (spec.seed || 0), q.z * cl.f, 3); if (r() > sm(cl.thr, cl.thr + 0.12, cn)) continue; }
      const hr = q.h - (ctx.base || 0);                       // 相对当地基准面的高度
      if (q.ny < (spec.nyMin || 0.82) || hr > hMaxRel || hr < -0.6) continue;
      if (window.Rivers && hr < 1.5 && Rivers.wet(q.x, q.z)) continue;
      if (ctx.noFlora(al, lat)) continue;
      const hgt = spec.h[0] + (spec.h[1] - spec.h[0]) * r(), w = hgt * (spec.w || 0.5) * (0.85 + 0.3 * r());
      const t = tints[Math.floor(r() * tints.length)];
      _t.copy(t).multiplyScalar(0.85 + 0.3 * r());
      add(ctx, spec.proto, q.x, q.h - 0.05, q.z, w, hgt, w, r() * 6.28, _t);
    }
  }
  function tick(dt, wind, snow, wet) {
    U.uTime.value += dt; U.uWind.value = wind; U.uSnow.value = snow; U.uWet.value = wet;
  }

  window.Flora = { begin, add, flush, scatter, tick, protos, U, registerMulti };
})();
