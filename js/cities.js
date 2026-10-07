/* 城市：街区网格(与地面道路着色器对齐)、高楼/住宅/商业/民居分区、行道树与路灯、车站(站台+站房+站牌)、城市地标 */
(function () {
  const S = Scenery, N = Noise, CELL = 54, Lr = Route.LENGTH;
  const PINYIN = { '昆明': 'KUNMING', '大理': 'DALI', '林芝': 'NYINGCHI', '拉萨': 'LHASA', '日喀则': 'SHIGATSE', '阿里': 'NGARI', '喀什': 'KASHGAR', '库尔勒': 'KORLA', '乌鲁木齐': 'URUMQI', '敦煌': 'DUNHUANG', '兰州': 'LANZHOU', '呼和浩特': 'HOHHOT', '呼伦贝尔': 'HULUNBUIR', '哈尔滨': 'HARBIN', '沈阳': 'SHENYANG', '北京': 'BEIJING', '青岛': 'QINGDAO', '上海': 'SHANGHAI', '杭州': 'HANGZHOU', '广州': 'GUANGZHOU', '三亚': 'SANYA' };
  const GLASS = ['gl_blue', 'gl_blue', 'gl_green', 'gl_teal', 'gl_gray', 'gl_gold', 'office'];
  const TOWER_FOOT = [[22, 22], [26, 22], [24, 28], [30, 26]];
  const TINT = [0xffffff, 0xf6efe2, 0xf1e4d4, 0xe9eef2, 0xf5e3e0, 0xe3ebe0];

  function signedDist(s, target) { return ((s - target + Lr * 1.5) % Lr) - Lr / 2; }

  /* ---------- 站牌贴图（站名 + 拼音）---------- */
  const signCache = {};
  function signMaterial(name) {
    if (signCache[name]) return signCache[name];
    const mk = (emis) => {
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 192; const g = cv.getContext('2d');
      g.fillStyle = emis ? '#000' : '#0d3b78'; g.fillRect(0, 0, 1024, 192);
      if (!emis) { g.strokeStyle = '#e8eef6'; g.lineWidth = 6; g.strokeRect(10, 10, 1004, 172); }
      g.fillStyle = emis ? '#cfe3ff' : '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 118px "Microsoft YaHei","PingFang SC",sans-serif'; g.fillText(name + '站', 512, 82);
      g.font = '500 40px Arial,sans-serif'; g.fillText(PINYIN[name] || '', 512, 156);
      const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; return t;
    };
    const m = new THREE.MeshStandardMaterial({ map: mk(false), emissiveMap: mk(true), emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.0, roughness: 0.6 });
    signCache[name] = m; return m;
  }
  const signGeo = new THREE.PlaneGeometry(34, 6.4), smallSignGeo = new THREE.PlaneGeometry(4.4, 0.85);

  /* ---------- 停车位置标（8 辆编组）：白底蓝框，司机在驾驶室里对准它停车 ---------- */
  let stopMarker = null;
  function makeStopMarker() {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 320; const g = cv.getContext('2d');
    g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, 256, 320); g.strokeStyle = '#1450a8'; g.lineWidth = 18; g.strokeRect(9, 9, 238, 302);
    g.fillStyle = '#c8281e'; g.font = 'bold 54px "Microsoft YaHei","PingFang SC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('停', 128, 66);
    g.fillStyle = '#1450a8'; g.font = 'bold 190px Arial,sans-serif'; g.fillText('8', 128, 205);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    const grp = new THREE.Group();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.78), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25 }));
    board.position.y = 2.55; grp.add(board);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.84, 0.04), new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.6, metalness: 0.5 }));
    back.position.set(0, 2.55, -0.025); grp.add(back);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 2.2, 10), back.material); pole.position.set(0, 1.1, -0.06); grp.add(pole);
    return grp;
  }

  function regionHouse(type) {
    return { yunnan: 'h_bai', tibet: 'h_tibet', xinjiang: 'h_xj', gobi: 'h_farm', grassland: 'h_farm', snowforest: 'h_ne', plain: 'h_farm', water: 'h_jn', tropical: 'h_hn' }[type] || 'h_farm';
  }

  /* ---------- 车站 ---------- */
  function station(c, city) {
    const rel = signedDist(city.s, c.s0);               // 城市中心相对本块起点的弧长（>=0 即在块内）
    Houses.ensure('platform20'); Houses.ensure('lamp');
    for (let al = 0; al < c.len; al += 20) {
      const d = signedDist(c.s0 + al + 10, city.s);
      if (Math.abs(d) < 120) {
        const a = c.trackAt(c.s0 + al + 10), yaw = c.tangentAngle(al + 10), px = a.pos.x, pz = a.pos.z, tx = a.tan.x, tz = a.tan.z;
        Flora.add(c, 'platform20', px, 0, pz, 1, 1, 1, yaw, new THREE.Color(0xffffff));
        if (Math.abs(d) < 95 && Math.round((al + 10) / 20) % 3 === 0) {          // 站台立柱站牌，朝向线路
          const sm = new THREE.Mesh(smallSignGeo, signMaterial(city.name));
          sm.position.set(px + tz * 4.6, 5.9, pz - tx * 4.6); sm.rotation.y = yaw - Math.PI / 2; c.add(sm);
        }
      }
    }
    const alS = signedDist(city.s + (window.Stops ? Stops.OFFSET : 100), c.s0);
    if (!city.loop && alS >= 0 && alS < c.len) {
      if (!stopMarker) stopMarker = makeStopMarker();
      const a = c.trackAt(c.s0 + alS), m = stopMarker.clone();
      m.position.set(a.pos.x + a.tan.z * 5.3, 1.25, a.pos.z - a.tan.x * 5.3);   // 本线（左侧）站台边，黄线内侧
      m.rotation.y = c.tangentAngle(alS) + Math.PI; c.add(m);                  // 面向驶来的列车
    }
    const al0 = rel;
    if (al0 >= 0 && al0 < c.len) {
      Houses.ensure('station_hall');
      const a = c.trackAt(c.s0 + al0), yaw = c.tangentAngle(al0), px = a.pos.x, pz = a.pos.z, rx = -a.tan.z, rz = a.tan.x;   // rx,rz = 右向量
      const hg = c.terrain.sample(al0, -56).h; Flora.add(c, 'station_hall', px, hg, pz, 1, 1, 1, yaw, new THREE.Color(0xffffff));
      const sg = new THREE.Mesh(signGeo, signMaterial(city.name));
      sg.position.set(px - rx * 32.2, hg + 25.5, pz - rz * 32.2); sg.rotation.y = yaw - Math.PI / 2; c.add(sg);
      for (let k = -4; k <= 4; k++) { const al = al0 + k * 12; if (al >= 0 && al < c.len) { const b = c.trackAt(c.s0 + al); Flora.add(c, 'lamp', b.pos.x - rx * 24, c.terrain.sample(al, -24).h, b.pos.z - rz * 24, 1, 1, 1, yaw - Math.PI / 2, new THREE.Color(0xffffff)); } }
    }
  }

  /* ---------- 街区网格 ---------- */
  function grid(c, city) {
    const sc = TerrainCore.CITY_SCALE[city.name] || 0.4, i0 = Math.floor(c.s0 / CELL), i1 = Math.floor((c.s0 + c.len) / CELL);
    const lm = Landmarks.OFFSET[city.name] || 135, region = c.region.type;
    for (let i = i0; i <= i1; i++) {
      const sC = (i + 0.5) * CELL, al = sC - c.s0; if (al < 0 || al >= c.len) continue;
      const dA = Math.abs(signedDist(sC, city.s));
      for (let j = -8; j <= 7; j++) {
        const latC = (j + 0.5) * CELL, rho = Math.hypot(dA / (520 * sc), Math.abs(latC) / (360 * sc));
        if (rho > 0.98 || Math.abs(latC) < 60) continue;
        if (latC < 0 && latC > -125 && dA < 85) continue;                                  // 站房与站前广场
        if (latC > 55 && latC < lm + 100 && dA < 62) continue;                             // 地标用地
        const h1 = N.hash(i * 13 + 5, j * 17 + 3), h2 = N.hash(i * 7 + 11, j * 19 + 1), h3 = N.hash(i * 3 + 2, j * 5 + 9);
        const q = c.terrain.sample(al, latC); if (q.ny < 0.9) continue;
        if (window.Rivers) { const rq = Rivers.query(q.x, q.z); if (rq.r && rq.dist < rq.hw * 1.3 + 30) continue; }
        const yaw0 = c.tangentAngle(al) + (h2 < 0.5 ? 0 : Math.PI / 2), tint = new THREE.Color(TINT[Math.floor(h3 * TINT.length)]);
        const core = rho < 0.34, mid = rho < 0.7;
        let name = null;
        const maxF = Math.round(18 + 50 * Math.max(0, 1 - rho / 0.75) * Math.max(0.55, sc));
        if (core ? h1 < 0.78 : mid ? h1 < 0.3 : false) {
          const opts = [16, 20, 24, 32, 40, 52, 64].filter(f => f <= Math.max(16, maxF)), fl = opts[Math.floor(h2 * opts.length) % opts.length], f = TOWER_FOOT[Math.floor(h3 * TOWER_FOOT.length) % TOWER_FOOT.length];
          name = Towers.tower(GLASS[Math.floor(h2 * 997) % GLASS.length], fl, f[0], f[1]);
        } else if (core || mid ? h1 < 0.78 : h1 < 0.38) {
          const fl = mid ? 8 + Math.floor(h2 * 10) : 5 + Math.floor(h2 * 6), units = h3 < 0.5 ? 2 : 3;
          name = Towers.resi(fl, units, h3 < 0.35 ? 1 : 0);
        } else if (core || mid ? h1 < 0.92 : h1 < 0.6) {
          name = Towers.lowrise(3 + Math.floor(h2 * 4), 28 + Math.floor(h3 * 3) * 3, 22);
        } else if (!core && !mid && h1 < 0.9) {
          const hn = regionHouse(region);
          for (let m = 0; m < 2; m++) Houses.place(c, hn, al + (m ? 12 : -12), latC + (h2 - 0.5) * 12, 'ortho', TINT[Math.floor(h3 * TINT.length)]);
        }
        if (name) Flora.add(c, name, q.x, q.h - 0.05, q.z, 1, 1, 1, yaw0, tint);
        if (h1 < 0.8) { const p = c.terrain.sample(Math.min(c.len - 0.5, al + 25.5), latC + 25.5); Flora.add(c, 'lamp', p.x, p.h, p.z, 1, 1, 1, c.tangentAngle(al) + Math.PI * 0.75, new THREE.Color(0xffffff)); }
        for (let t = -1; t <= 1; t += 2) {
          const p = c.terrain.sample(al + t * 14, latC + 21.2), p2 = c.terrain.sample(Math.min(c.len - 0.5, al + 21.2), latC + t * 14);
          const g1 = new THREE.Color(0x4f9a3e).multiplyScalar(0.8 + 0.4 * h3);
          Flora.add(c, 'broad', p.x, p.h - 0.05, p.z, 6.5, 8 + h2 * 3, 6.5, h3 * 6.28, g1);
          Flora.add(c, 'broad', p2.x, p2.h - 0.05, p2.z, 6.5, 8 + h3 * 3, 6.5, h2 * 6.28, g1);
        }
      }
    }
  }

  /* ---------- 地标 ---------- */
  function landmark(c, city) {
    const rel = signedDist(city.s, c.s0);
    if (rel < 0 || rel >= c.len) return;
    const nm = Landmarks.ensure(city.name), lat = Landmarks.OFFSET[city.name] || 135, q = c.terrain.sample(rel, lat);
    Flora.add(c, nm, q.x, q.h - 0.1, q.z, 1, 1, 1, c.tangentAngle(rel) + Math.PI / 2, new THREE.Color(0xffffff));
    if (city.name === '上海') {     // 陆家嘴天际线：三栋超高层
      [[-80, 190, 'gl_gray', 64], [-45, 235, 'gl_blue', 64], [-110, 230, 'gl_teal', 52]].forEach(([da, lt, st, fl]) => {
        const al = rel + da; if (al < 0 || al >= c.len) return; const p = c.terrain.sample(al, lt);
        Flora.add(c, Towers.tower(st, fl, 30, 26), p.x, p.h - 0.05, p.z, 1, 1, 1, c.tangentAngle(al), new THREE.Color(0xffffff));
      });
    }
  }

  function cityBuilder(c, city) { station(c, city); grid(c, city); landmark(c, city); }

  S.cityBuilder = cityBuilder;
  S.cityRadius = 170;
  window.Cities = { setNight(n) { BTex.setNight(n); for (const k in signCache) signCache[k].emissiveIntensity = n * 1.3; }, signedDist };
})();
