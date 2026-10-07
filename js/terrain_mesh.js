/* 地形网格：沿线条带(高精度, 每块 160m) + 全国静态远景网格(低精度) + 湖面。着色器加入细节噪声、积雪、潮湿。 */
(function () {
  const TC = TerrainCore, N = Noise, sm = N.smooth, L = Route.LENGTH;
  const STEP = 8;
  const LATS = (function () {
    const half = [2.5, 5.5, 9, 14, 20, 28, 38, 52, 70, 95, 130, 175, 235, 310, 400, 520, 670, 850, 1060, 1300, 1500, 1700];
    return half.slice().reverse().map(v => -v).concat([0], half);
  })();
  const NC = LATS.length;
  const NEAR = 1700, BLEND0 = 1200;

  const U = { uSnow: { value: 0 }, uWet: { value: 0 } };
  const GLSL_NOISE = [
    'float th(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }',
    'float tn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(th(i),th(i+vec2(1,0)),f.x), mix(th(i+vec2(0,1)),th(i+vec2(1,1)),f.x), f.y); }'
  ].join('\n');

  const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 3, specular: 0x0b0b0b, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSnow = U.uSnow; sh.uniforms.uWet = U.uWet;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', 'varying vec3 vWPos; attribute vec3 aUrb; varying vec3 vUrb;\n#include <common>')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = position; vUrb = aUrb;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', 'varying vec3 vWPos; varying vec3 vUrb; uniform float uSnow; uniform float uWet;\n' + GLSL_NOISE + '\n#include <common>')
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'vec2 wp = vWPos.xz;',
        'float f1 = tn(wp*0.035), f2 = tn(wp*0.22+3.), f3 = tn(wp*1.1+9.), f4 = tn(wp*5.0+1.);',
        'float q3 = f1;',
        'diffuseColor.rgb *= 0.58 + 0.95*(f1*0.34 + f2*0.30 + f3*0.22 + f4*0.14);',
        'if (vUrb.z > 0.001) {',
        '  vec2 cell = vUrb.xy / 54.0; vec2 fc = fract(cell);',
        '  float dx = min(fc.x, 1.0-fc.x)*54.0, dz = min(fc.y, 1.0-fc.y)*54.0, dm = min(dx, dz);',
        '  float road = 1.0 - smoothstep(5.6, 6.2, dm);',
        '  float walk = clamp((1.0 - smoothstep(8.6, 9.2, dm)) - road, 0., 1.);',
        '  vec2 ci = floor(cell); float hs = th(ci);',
        '  vec3 blk = mix(vec3(0.20,0.20,0.19), vec3(0.30,0.30,0.28), th(ci+7.3));',
        '  blk = mix(blk, vec3(0.05,0.15,0.04), step(0.88, hs)*0.9);',
        '  vec3 urb = mix(blk, vec3(0.40,0.38,0.35), walk);',
        '  urb = mix(urb, vec3(0.035,0.037,0.04), road);',
        '  float dash = step(0.5, fract(vUrb.x/9.0)), dashB = step(0.5, fract(vUrb.y/9.0));',
        '  float lineA = (1.0 - smoothstep(0.14,0.26,dz))*dash*step(7.0,dx), lineB = (1.0 - smoothstep(0.14,0.26,dx))*dashB*step(7.0,dz);',
        '  urb += vec3(0.55,0.5,0.15)*(lineA+lineB)*road;',
        '  urb *= 0.85 + 0.3*f3;',
        '  diffuseColor.rgb = mix(diffuseColor.rgb, urb, clamp(vUrb.z*1.15, 0., 1.));',
        '}',
        'vec3 upV = normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz);',
        'float upk = clamp(dot(normalize(vNormal), upV), 0., 1.);',
        'float snw = uSnow*smoothstep(0.42,0.85,upk)*(0.78+0.45*q3);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.90,0.93,0.98), clamp(snw,0.,1.));',
        'diffuseColor.rgb *= (1.0 - 0.36*uWet);'
      ].join('\n'));
  };

  // ---------- 远景：全国静态网格 ----------
  let far = null, trackAt = null;
  const CELL = 220;
  function buildFar(scene) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i <= TC.nF; i++) { x0 = Math.min(x0, TC.fx[i]); x1 = Math.max(x1, TC.fx[i]); z0 = Math.min(z0, TC.fz[i]); z1 = Math.max(z1, TC.fz[i]); }
    const M = 9000; x0 -= M; x1 += M; z0 -= M; z1 += M;
    const nx = Math.ceil((x1 - x0) / CELL) + 1, nz = Math.ceil((z1 - z0) / CELL) + 1;
    const H = new Float32Array(nx * nz), pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), nor = new Float32Array(nx * nz * 3);
    const S = new Float32Array(nx * nz), D = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * CELL, z = z0 + j * CELL, q = TC.nearest(x, z), idx = j * nx + i;
      const ri = Route.regionAt(q.s), P = TC.paramsFor(ri);
      H[idx] = TC.F(x, z, q.s, q.d, q.lat, P); S[idx] = q.s; D[idx] = q.d;
    }
    far = { x0, z0, nx, nz, H };
    const c = new THREE.Color();
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const idx = j * nx + i, x = x0 + i * CELL, z = z0 + j * CELL, h = H[idx];
      const hx = (H[j * nx + Math.min(nx - 1, i + 1)] - H[j * nx + Math.max(0, i - 1)]) / (2 * CELL);
      const hz = (H[Math.min(nz - 1, j + 1) * nx + i] - H[Math.max(0, j - 1) * nx + i]) / (2 * CELL);
      const il = 1 / Math.hypot(hx, 1, hz);
      nor[idx * 3] = -hx * il; nor[idx * 3 + 1] = il; nor[idx * 3 + 2] = -hz * il;
      const push = 70 * (1 - sm(1400, 1700, D[idx]));         // 近景条带覆盖区域内压低，避免穿插
      pos[idx * 3] = x; pos[idx * 3 + 1] = h - push; pos[idx * 3 + 2] = z;
      TC.color(Route.regionAt(S[idx]), h, il, x, z, c);
      col[idx * 3] = c.r; col[idx * 3 + 1] = c.g; col[idx * 3 + 2] = c.b;
    }
    const idxs = new Uint32Array((nx - 1) * (nz - 1) * 6); let p = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, cc = a + nx, d = cc + 1;
      idxs[p++] = a; idxs[p++] = cc; idxs[p++] = b; idxs[p++] = b; idxs[p++] = cc; idxs[p++] = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aUrb', new THREE.BufferAttribute(new Float32Array(nx * nz * 3), 3));
    g.setIndex(new THREE.BufferAttribute(idxs, 1));
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.receiveShadow = false;
    scene.add(mesh);
    far.mesh = mesh;
  }
  function farH(x, z) {
    const fx = (x - far.x0) / CELL, fz = (z - far.z0) / CELL;
    const i = Math.max(0, Math.min(far.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(far.nz - 2, Math.floor(fz)));
    const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fz - j)), H = far.H, nx = far.nx;
    const a = H[j * nx + i], b = H[j * nx + i + 1], c = H[(j + 1) * nx + i], d = H[(j + 1) * nx + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // 条带高度：s 弧长，lat 有符号侧向 → 绝对高度
  function heightAt(s, lat, ri, P, x, z) {
    const d = Math.abs(lat);
    let h = TC.F(x, z, s, d, lat, P);
    if (d > BLEND0) h += (farH(x, z) - h) * sm(BLEND0, NEAR, d);
    return h;
  }
  function groundHeight(s, lat) {
    const a = trackAt(s), x = a.pos.x - a.tan.z * lat, z = a.pos.z + a.tan.x * lat;
    const ri = Route.regionAt(s), P = TC.paramsFor(ri);
    return heightAt(s, lat, ri, P, x, z);
  }

  // ---------- 条带：一个 chunk ----------
  function chunk(s0, len) {
    const rows = Math.round(len / STEP) + 1, R2 = rows + 2;              // 多算两行用于法线
    const H = new Float32Array(R2 * NC), X = new Float32Array(R2 * NC), Z = new Float32Array(R2 * NC);
    const TX = new Float32Array(R2), TZ = new Float32Array(R2), RI = [];
    for (let r = 0; r < R2; r++) {
      const s = s0 + (r - 1) * STEP, a = trackAt(s), px = a.pos.x, pz = a.pos.z; TX[r] = a.tan.x; TZ[r] = a.tan.z;
      const ri = Route.regionAt(s), P = TC.paramsFor(ri);
      RI.push({ a: ri.a, b: ri.b, k: ri.k, snowH: P.snowH });
      for (let c = 0; c < NC; c++) {
        const lat = LATS[c], x = px - a.tan.z * lat, z = pz + a.tan.x * lat, i = r * NC + c;
        X[i] = x; Z[i] = z; H[i] = heightAt(s, lat, ri, P, x, z);
      }
    }
    const nv = rows * NC, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), urb = new Float32Array(nv * 3), color = new THREE.Color();
    for (let r = 0; r < rows; r++) {
      const rr = r + 1, tx = TX[rr], tz = TZ[rr], rx = -tz, rz = tx;
      for (let c = 0; c < NC; c++) {
        const i = rr * NC + c, v = r * NC + c;
        const dT = (H[(rr + 1) * NC + c] - H[(rr - 1) * NC + c]) / (2 * STEP);
        const c0 = Math.max(0, c - 1), c1 = Math.min(NC - 1, c + 1);
        const dR = (H[rr * NC + c1] - H[rr * NC + c0]) / (LATS[c1] - LATS[c0]);
        let nx = -dT * tx - dR * rx, ny = 1, nz = -dT * tz - dR * rz; const il = 1 / Math.hypot(nx, ny, nz); nx *= il; ny *= il; nz *= il;
        pos[v * 3] = X[i]; pos[v * 3 + 1] = H[i]; pos[v * 3 + 2] = Z[i];
        urb[v * 3] = s0 + r * STEP; urb[v * 3 + 1] = LATS[c]; urb[v * 3 + 2] = Math.abs(LATS[c]) < 420 ? TC.urban(s0 + r * STEP, LATS[c]) : 0;
        nor[v * 3] = nx; nor[v * 3 + 1] = ny; nor[v * 3 + 2] = nz;
        const ri = RI[rr];
        TC.color(ri, H[i], ny, X[i], Z[i], color);
        col[v * 3] = color.r; col[v * 3 + 1] = color.g; col[v * 3 + 2] = color.b;
      }
    }
    const idx = new Uint32Array((rows - 1) * (NC - 1) * 6); let p = 0;
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < NC - 1; c++) {
      const a = r * NC + c, b = a + 1, cc = a + NC, d = cc + 1;
      idx[p++] = a; idx[p++] = b; idx[p++] = cc; idx[p++] = b; idx[p++] = d; idx[p++] = cc;   // 逆时针(自上方看)，法线朝上
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aUrb', new THREE.BufferAttribute(urb, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true;
    // 采样：沿线 al∈[0,len]，侧向 lat → 世界位置/高度/坡度（双线性）
    const q = { x: 0, z: 0, h: 0, ny: 1 };
    function sample(al, lat) {
      const rf = Math.min(R2 - 2.001, Math.max(0, al / STEP + 1)), r0 = Math.floor(rf), fr = rf - r0;
      lat = Math.max(LATS[0] + 0.01, Math.min(LATS[NC - 1] - 0.01, lat));
      let lo = 0, hi = NC - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (LATS[mid] <= lat) lo = mid; else hi = mid; }
      const fc = (lat - LATS[lo]) / (LATS[lo + 1] - LATS[lo]), i00 = r0 * NC + lo, i01 = i00 + 1, i10 = i00 + NC, i11 = i10 + 1;
      const bl = (A) => A[i00] * (1 - fr) * (1 - fc) + A[i01] * (1 - fr) * fc + A[i10] * fr * (1 - fc) + A[i11] * fr * fc;
      q.x = bl(X); q.z = bl(Z); q.h = bl(H);
      const dT = (H[i10] - H[i00]) / STEP, dR = (H[i01] - H[i00]) / (LATS[lo + 1] - LATS[lo]);
      q.ny = 1 / Math.sqrt(1 + dT * dT + dR * dR);
      return q;
    }
    return { mesh: m, sample };
  }

  // ---------- 湖面 ----------
  const waterMats = {};
  function waterMat(turq) {
    const key = turq ? 't' : 'g';
    if (waterMats[key]) return waterMats[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    const im = g.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const v = (N.fbm(x / 22, y / 22, 4) * 0.7 + N.fbm(x / 6, y / 6, 2) * 0.3) * 255, o = (y * 256 + x) * 4;
      im.data[o] = im.data[o + 1] = im.data[o + 2] = v; im.data[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(40, 40);
    const m = new THREE.MeshStandardMaterial({ color: turq ? 0x23a6a8 : 0x2a6b80, roughness: 0.06, metalness: 0.1, bumpMap: tex, bumpScale: 0.35, envMapIntensity: 1.5 });
    waterMats[key] = m; return m;
  }
  function water(s0, len) {
    const ri = Route.regionAt(s0 + len / 2), P = TC.paramsFor(ri), b0 = Math.floor((s0 - 500) / TC.LAKE_BLOCK), b1 = Math.floor((s0 + len + 500) / TC.LAKE_BLOCK);
    let group = null;
    for (let b = b0; b <= b1; b++) {
      const lk = TC.lakeIn(b, P.lake); if (!lk) continue;
      if (lk.sc + lk.R < s0 || lk.sc - lk.R > s0 + len) continue;
      const sa = Math.max(s0, lk.sc - lk.R), sb = Math.min(s0 + len, lk.sc + lk.R);
      const lA = lk.lc - lk.R * 0.74, lB = lk.lc + lk.R * 0.74, NS = 6, NL = 4, pos = [], idx = [];
      const wy = TC.baseAt(lk.sc, P) + TC.WATER_REL;
      for (let i = 0; i <= NS; i++) {
        const s = sa + (sb - sa) * i / NS, a = trackAt(s);
        for (let j = 0; j <= NL; j++) { const lat = lA + (lB - lA) * j / NL; pos.push(a.pos.x - a.tan.z * lat, wy, a.pos.z + a.tan.x * lat); }
      }
      for (let i = 0; i < NS; i++) for (let j = 0; j < NL; j++) { const a = i * (NL + 1) + j, bb = a + 1, c = a + NL + 1, d = c + 1; idx.push(a, c, bb, bb, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const nrm = g.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
      const uv = []; for (let i = 0; i < pos.length / 3; i++) uv.push(pos[i * 3] / 24, pos[i * 3 + 2] / 24); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const m = new THREE.Mesh(g, waterMat(ri.k < 0.5 ? ri.a.type === 'tibet' : ri.b.type === 'tibet')); m.material.side = THREE.DoubleSide;
      (group = group || new THREE.Group()).add(m);
    }
    return group;
  }

  function init(scene, trackAtFn) { trackAt = trackAtFn; buildFar(scene); }
  function setWeather(snow, wet) {
    U.uSnow.value = snow; U.uWet.value = wet;
    mat.shininess = 3 + 70 * wet; mat.specular.setRGB(0.05 + 0.25 * wet, 0.05 + 0.25 * wet, 0.05 + 0.27 * wet);
  }
  function tick(dt) {
    for (const k in waterMats) { const t = waterMats[k].bumpMap; t.offset.x += dt * 0.004; t.offset.y += dt * 0.0022; }
  }

  window.Terrain = { waterMat, init, chunk, water, height: groundHeight, setWeather, tick, STEP };
})();
