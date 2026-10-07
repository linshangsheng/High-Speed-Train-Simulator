/* 天气系统：按区域 + 里程自动变化，也可手动指定。输出 wx 给天空/雾/光照，并驱动雨线、雪、沙尘粒子与雷暴闪电。 */
(function () {
  const N = Noise;
  const MODES = ['自动', '晴', '多云', '小雨', '雷暴', '下雪', '大雾', '沙尘'];
  // 预设：cover 云量, dark 阴沉, rain, snow, fog(雾密度增量), dust, storm
  const PRE = {
    clear:  { cover: 0.50, dark: 0.00, rain: 0, snow: 0, fog: 0,       dust: 0, storm: 0 },
    cloudy: { cover: 0.78, dark: 0.30, rain: 0, snow: 0, fog: 0.00006, dust: 0, storm: 0 },
    rain:   { cover: 0.90, dark: 0.55, rain: 0.65, snow: 0, fog: 0.00022, dust: 0, storm: 0 },
    storm:  { cover: 1.00, dark: 0.90, rain: 1.0, snow: 0, fog: 0.00045, dust: 0, storm: 1 },
    snow:   { cover: 0.86, dark: 0.40, rain: 0, snow: 0.85, fog: 0.00035, dust: 0, storm: 0 },
    fog:    { cover: 0.70, dark: 0.18, rain: 0, snow: 0, fog: 0.0017,  dust: 0, storm: 0 },
    dust:   { cover: 0.40, dark: 0.32, rain: 0, snow: 0, fog: 0.0011,  dust: 1, storm: 0 }
  };
  // 各区域自动天气概率
  const AUTO = {
    yunnan: { clear: 0.35, cloudy: 0.30, rain: 0.30, fog: 0.05 },
    tibet: { clear: 0.50, cloudy: 0.20, snow: 0.30 },
    xinjiang: { clear: 0.55, cloudy: 0.12, dust: 0.33 },
    gobi: { clear: 0.60, cloudy: 0.10, dust: 0.30 },
    grassland: { clear: 0.50, cloudy: 0.30, rain: 0.15, storm: 0.05 },
    snowforest: { cloudy: 0.20, snow: 0.65, clear: 0.15 },
    plain: { clear: 0.40, cloudy: 0.25, fog: 0.30, rain: 0.05 },
    water: { cloudy: 0.20, rain: 0.40, storm: 0.20, clear: 0.15, fog: 0.05 },
    tropical: { clear: 0.28, rain: 0.30, storm: 0.30, cloudy: 0.12 }
  };
  const NAMES = { clear: '晴', cloudy: '多云', rain: '小雨', storm: '雷暴', snow: '下雪', fog: '大雾', dust: '沙尘' };

  function autoPick(s) {
    const seg = Math.floor(s / 3300), h = N.hash(seg, 77), type = Route.regionAt(seg * 3300 + 1650);
    const w = AUTO[(type.k < 0.5 ? type.a : type.b).type] || AUTO.plain;
    let acc = 0; for (const k in w) { acc += w[k]; if (h <= acc) return k; }
    return 'clear';
  }

  function create(scene) {
    const st = { rainbow: 0, rbNew: false, cover: 0.5, dark: 0, rain: 0, snow: 0, fog: 0, dust: 0, storm: 0, flash: 0, wet: 0, snowCover: 0, mode: 0, label: '晴', wind: 0.5, target: 'clear' };

    /* ----- 雨：线段 ----- */
    const NR = 2400, BOX = 55, HT = 38;
    const rp = new Float32Array(NR * 3), rv = new Float32Array(NR), rGeo = new THREE.BufferGeometry(), rLine = new Float32Array(NR * 6);
    for (let i = 0; i < NR; i++) { rp[i * 3] = (Math.random() - 0.5) * BOX * 2; rp[i * 3 + 1] = Math.random() * HT; rp[i * 3 + 2] = (Math.random() - 0.5) * BOX * 2; rv[i] = 0.75 + Math.random() * 0.5; }
    rGeo.setAttribute('position', new THREE.BufferAttribute(rLine, 3));
    const rMat = new THREE.LineBasicMaterial({ color: 0xc8dcf2, transparent: true, opacity: 0, depthWrite: false });
    const rain = new THREE.LineSegments(rGeo, rMat); rain.frustumCulled = false; rain.visible = false; scene.add(rain);

    /* ----- 雪 / 沙尘：点精灵 ----- */
    function spriteTex(hard) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 32; const c = cv.getContext('2d');
      const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(hard ? 0.55 : 0.2, 'rgba(255,255,255,' + (hard ? 0.9 : 0.6) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cv);
    }
    function pointCloud(n, size, color) {
      const g = new THREE.BufferGeometry(), a = new Float32Array(n * 3), sd = new Float32Array(n);
      for (let i = 0; i < n; i++) { a[i * 3] = (Math.random() - 0.5) * BOX * 2; a[i * 3 + 1] = Math.random() * HT; a[i * 3 + 2] = (Math.random() - 0.5) * BOX * 2; sd[i] = Math.random(); }
      g.setAttribute('position', new THREE.BufferAttribute(a, 3));
      const m = new THREE.PointsMaterial({ size, map: spriteTex(color === 0xffffff), transparent: true, depthWrite: false, opacity: 0, color });
      const p = new THREE.Points(g, m); p.frustumCulled = false; p.visible = false; scene.add(p); return { p, a, sd, n };
    }
    const snow = pointCloud(2400, 0.42, 0xffffff), dust = pointCloud(1400, 1.9, 0xcaa56e);

    function wrap(a, i) {
      if (a[i + 1] < 0) a[i + 1] += HT; else if (a[i + 1] > HT) a[i + 1] -= HT;
      if (a[i] > BOX) a[i] -= BOX * 2; else if (a[i] < -BOX) a[i] += BOX * 2;
      if (a[i + 2] > BOX) a[i + 2] -= BOX * 2; else if (a[i + 2] < -BOX) a[i + 2] += BOX * 2;
    }

    let rbArm = false, rbT = -1, rbSeen = false;
    let timer = 5, flashT = 99, flashPat = 0, thunderQ = [];
    const cur = {};
    for (const k in PRE.clear) cur[k] = PRE.clear[k];
    let sSmooth = 0;

    // cam: 相机位置; dir: 列车前进方向(单位); speed: m/s
    function update(dt, s, cam, dir, speed, modeIdx, snd, tf, light) {
      tf = tf || 0; light = light == null ? 1 : light;
      st.mode = modeIdx;
      const key = modeIdx === 0 ? autoPick(s) : ['', 'clear', 'cloudy', 'rain', 'storm', 'snow', 'fog', 'dust'][modeIdx];
      st.target = key; st.label = (modeIdx === 0 ? '自动·' : '') + NAMES[key];
      const T = PRE[key], rate = modeIdx === 0 ? 0.10 : 0.35;
      for (const k in T) cur[k] += (T[k] - cur[k]) * Math.min(1, dt * rate);
      st.cover = cur.cover; st.dark = cur.dark; st.rain = cur.rain; st.snow = cur.snow; st.fog = cur.fog; st.dust = cur.dust; st.storm = cur.storm;
      // 地面：潮湿 / 积雪缓慢累积
      st.wet += ((st.rain > 0.08 ? 1 : 0) - st.wet) * Math.min(1, dt * (st.rain > 0.08 ? 0.25 : 0.03));
      st.snowCover += ((st.snow > 0.2 ? 1 : 0) - st.snowCover) * Math.min(1, dt * (st.snow > 0.2 ? 0.12 : 0.02));
      st.wind = 0.35 + 1.1 * Math.max(st.storm, st.dust * 0.8, st.rain * 0.6, st.snow * 0.5);

      // 彩虹：下过明显的雨后，转晴/转小 → 出现约 2 分钟，先淡入再淡出
      if (st.rain > 0.35) { rbArm = true; rbT = -1; rbSeen = false; }
      if (rbArm && st.rain < 0.14 && st.storm < 0.2 && st.snow < 0.1 && st.dust < 0.2) { rbArm = false; rbT = 0; }
      if (rbT >= 0) { rbT += dt; if (rbT > 130) rbT = -1; }
      const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
      st.rainbow = rbT < 0 ? 0 : ss(2, 14, rbT) * (1 - ss(80, 125, rbT));
      if (rbT > 3 && !rbSeen) { rbSeen = true; st.rbNew = true; }

      // 闪电
      if (st.storm > 0.4) {
        timer -= dt;
        if (timer <= 0) { timer = 3 + Math.random() * 7; flashT = 0; flashPat = Math.random() < 0.5 ? 1 : 2; thunderQ.push(0.4 + Math.random() * 2.2); }
      }
      flashT += dt;
      const f = flashT < 1.2 ? Math.max(Math.exp(-flashT * 11), flashPat === 2 ? Math.max(0, Math.exp(-(flashT - 0.28) * 14)) * (flashT > 0.2 ? 1 : 0) : 0) : 0;
      st.flash = f * st.storm;
      for (let i = thunderQ.length - 1; i >= 0; i--) { thunderQ[i] -= dt; if (thunderQ[i] <= 0) { thunderQ.splice(i, 1); snd && snd.thunder && snd.thunder(); } }

      const vx = -dir.x * speed, vz = -dir.z * speed;
      const camY = cam.y - 6;

      // 雨
      rain.visible = st.rain > 0.02 && tf < 0.6;
      if (rain.visible) {
        rain.position.set(cam.x, camY, cam.z);
        const fall = 11 + 4 * st.storm, len = 0.028 + 0.012 * st.storm, shown = Math.floor(NR * Math.min(1, st.rain * 1.1));
        for (let i = 0; i < NR; i++) {
          const j = i * 3, v = rv[i], dx = vx + st.wind * 1.5, dy = -fall * v, dz = vz;
          rp[j] += dx * dt; rp[j + 1] += dy * dt; rp[j + 2] += dz * dt; wrap(rp, j);
          const o = i * 6, vis = i < shown;
          rLine[o] = rp[j]; rLine[o + 1] = rp[j + 1]; rLine[o + 2] = rp[j + 2];
          rLine[o + 3] = vis ? rp[j] - dx * len * 1.0 : rp[j]; rLine[o + 4] = vis ? rp[j + 1] - dy * len : rp[j + 1]; rLine[o + 5] = vis ? rp[j + 2] - dz * len : rp[j + 2];
        }
        rGeo.attributes.position.needsUpdate = true;
        rMat.opacity = 0.5 * Math.min(1, st.rain * 1.4) * (0.35 + 0.65 * light);
      }
      // 雪
      snow.p.visible = st.snow > 0.02 && tf < 0.6;
      if (snow.p.visible) {
        snow.p.position.set(cam.x, camY, cam.z);
        const a = snow.a, t = performance.now() * 0.001;
        for (let i = 0; i < snow.n; i++) {
          const j = i * 3, sd = snow.sd[i];
          a[j] += (vx + Math.sin(t * 0.8 + sd * 40) * 0.7 + st.wind * 1.0) * dt; a[j + 1] -= (1.3 + sd * 1.6) * dt; a[j + 2] += (vz + Math.cos(t * 0.7 + sd * 30) * 0.5) * dt; wrap(a, j);
        }
        snow.p.geometry.attributes.position.needsUpdate = true; snow.p.material.opacity = Math.min(0.95, st.snow * 1.1); snow.p.material.color.setScalar(light);
      }
      // 沙尘
      dust.p.visible = st.dust > 0.05 && tf < 0.6;
      if (dust.p.visible) {
        dust.p.position.set(cam.x, camY, cam.z);
        const a = dust.a;
        for (let i = 0; i < dust.n; i++) { const j = i * 3, sd = dust.sd[i]; a[j] += (vx + 14 * st.wind * (0.6 + sd)) * dt; a[j + 1] += Math.sin(sd * 50 + performance.now() * 0.001) * 0.3 * dt; a[j + 2] += (vz + 3 * (sd - 0.5)) * dt; wrap(a, j); }
        dust.p.geometry.attributes.position.needsUpdate = true; dust.p.material.opacity = 0.3 * st.dust; dust.p.material.color.set(0xcaa56e).multiplyScalar(light);
      }
      return st;
    }
    function snap(key) { for (const k in PRE[key]) cur[k] = PRE[key][k]; st.wet = PRE[key].rain > 0.1 ? 1 : 0; st.snowCover = PRE[key].snow > 0.2 ? 1 : 0; }
    return { update, state: st, MODES, snap, label: () => st.label };
  }
  window.Weather = { create, MODES };
})();
