/* 列车涂装贴图：侧投影 UV(u=沿车长, v=按高度)。同时产出 颜色/粗糙度金属度(ORM)/凹凸/夜间车窗自发光 四张图 */
(function () {
  const S = TrainShape, W = 2048, H = 256;

  const PAL = {
    map:  { body: '#f4f6f8', roof: '#e1e5e9', skirt: '#2f343b', louvre: '#1f2328', blue: '#1b5cb0', gold: '#d6a63a', glass: '#0c1219', frame: '#aab2ba', door: '#e9edf0', doorLine: '#8a929a', ws: '#05080c', text: '#6f7a85', under: '#202429' },
    orm:  { body: 'rgb(255,92,70)', roof: 'rgb(255,125,60)', skirt: 'rgb(255,170,150)', louvre: 'rgb(255,190,150)', blue: 'rgb(255,80,90)', gold: 'rgb(255,70,235)', glass: 'rgb(255,10,0)', frame: 'rgb(255,120,160)', door: 'rgb(255,92,70)', doorLine: 'rgb(255,130,80)', ws: 'rgb(255,6,0)', text: 'rgb(255,140,60)', under: 'rgb(255,200,100)' },
    bump: { body: '#999', roof: '#999', skirt: '#858585', louvre: '#444', blue: '#999', gold: '#a8a8a8', glass: '#3c3c3c', frame: '#b8b8b8', door: '#8e8e8e', doorLine: '#404040', ws: '#444', text: '#999', under: '#808080' },
    emis: { body: '#000', roof: '#000', skirt: '#000', louvre: '#000', blue: '#000', gold: '#000', glass: '#000', frame: '#000', door: '#000', doorLine: '#000', ws: '#000', text: '#000', under: '#000' }
  };

  // 涂装方案：蓝（复兴号 CR400AF）/ 红（CR400BF）/ 金（智能复兴号）
  const SCHEMES = { blue: { blue: '#1b5cb0', gold: '#d6a63a' }, red: { blue: '#c4262e', gold: '#2a2d33' }, gold: { blue: '#b88a2a', gold: '#3a3f47' } };
  function paint(kind, mode, scheme) {
    const len = kind === 'head' ? S.HEAD_L : S.CAR_L, ppm = W / len, P = mode === 'map' ? Object.assign({}, PAL.map, SCHEMES[scheme || 'blue']) : PAL[mode];
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const X = (z) => z * ppm, Y = (y) => (1 - (y - S.V0) / S.VH) * H;
    const rect = (z0, y0, z1, y1, col) => { g.fillStyle = col; g.fillRect(X(z0), Y(y1), X(z1) - X(z0), Y(y0) - Y(y1)); };
    const rrect = (z0, y0, z1, y1, r, col) => {
      const x = X(z0), y = Y(y1), w = X(z1) - X(z0), h = Y(y0) - Y(y1); g.fillStyle = col; g.beginPath();
      g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.fill();
    };
    const nose = kind === 'head' ? S.NOSE_L : 0, bodyL = len - nose, zN0 = bodyL;

    // 基底分层
    rect(0, 0.5, len, 5.2, P.body);
    rect(0, 3.28, len, 5.2, P.roof);                 // 车顶
    rect(0, 0.5, len, 0.98, P.under);                // 底架
    rect(0, 0.97, len, 1.40, P.skirt);               // 裙板
    for (let y = 1.02; y < 1.38; y += 0.07) rect(0, y, len, y + 0.012, P.louvre);
    // 蓝色腰带 + 金线
    rect(0, 1.42, len, 1.80, P.blue);
    rect(0, 1.83, len, 1.89, P.gold);
    rect(0, 3.22, len, 3.25, P.doorLine);

    // 车门与车窗
    const doors = kind === 'head' ? [2.3, bodyL - 2.3] : [2.3, len - 2.3];
    function door(zc) {
      rrect(zc - 0.65, 1.0, zc + 0.65, 3.12, 6, P.doorLine);
      rrect(zc - 0.6, 1.03, zc + 0.6, 3.09, 5, P.door);
      rrect(zc - 0.22, 2.25, zc + 0.22, 3.0, 4, mode === 'emis' ? 'rgb(255,214,150)' : P.glass);
      rect(zc, 1.05, zc + 0.012, 2.2, P.doorLine);
    }
    doors.forEach(door);
    const first = doors[0] + 1.25, last = doors[1] - 1.25, pitch = 2.45;
    const n = Math.max(1, Math.floor((last - first) / pitch));
    const start = first + ((last - first) - n * pitch) / 2;
    for (let i = 0; i < n; i++) {
      const z0 = start + i * pitch + 0.42, z1 = start + (i + 1) * pitch - 0.42;
      rrect(z0 - 0.05, 2.13, z1 + 0.05, 3.13, 9, P.frame);
      let col = P.glass;
      if (mode === 'emis') { const b = 175 + Math.floor(Math.random() * 80); col = 'rgb(' + b + ',' + Math.floor(b * 0.84) + ',' + Math.floor(b * 0.56) + ')'; }
      rrect(z0, 2.18, z1, 3.08, 8, col);
      if (mode === 'map') { const gr = g.createLinearGradient(0, Y(3.08), 0, Y(2.18)); gr.addColorStop(0, 'rgba(70,95,125,.45)'); gr.addColorStop(0.45, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(X(z0), Y(3.08), X(z1) - X(z0), Y(2.18) - Y(3.08)); }
    }
    // 小字标识
    if (mode === 'map' || mode === 'orm' || mode === 'bump') {
      g.fillStyle = P.text; g.font = 'bold ' + Math.round(0.2 * ppm * 0.62 * 1.0) + 'px Arial'; g.textBaseline = 'middle';
      g.fillText(kind === 'head' ? 'CR400AF' : '0' + (2 + Math.floor(Math.random() * 6)), X(start + 0.2), Y(1.96));
    }

    // 车头：整体涂装 + 挡风玻璃
    if (kind === 'head') {
      const sz = (s) => bodyL + S.NOSE_L * s;
      // 先把鼻锥盖成白色/蓝带，覆盖车窗
      rect(zN0 - 0.001, 0.5, len, 5.2, P.body);
      rect(zN0, 3.28, len, 5.2, P.roof);
      rect(zN0, 0.5, len, 0.98, P.under);
      g.fillStyle = P.skirt; g.beginPath();                       // 裙板随鼻尖上翘
      for (let k = 0; k <= 40; k++) { const s = k / 40; const yv = S.noseBot(s) + 0.45 * (1 - s); const x = X(sz(s)), y = Y(Math.min(yv, 2.4)); k ? g.lineTo(x, y) : g.moveTo(x, y); }
      for (let k = 40; k >= 0; k--) { const s = k / 40; g.lineTo(X(sz(s)), Y(S.noseBot(s) - 0.02)); }
      g.fill();
      // 蓝带：向鼻尖上扬
      g.fillStyle = P.blue; g.beginPath();
      for (let k = 0; k <= 40; k++) { const s = k / 40; const y = 1.40 + 0.55 * s * s + 0.9 * Math.pow(s, 3); const x = X(sz(s)); k ? g.lineTo(x, Y(y + 0.40 + 0.5 * s * s)) : g.moveTo(x, Y(y + 0.40 + 0.5 * s * s)); }
      for (let k = 40; k >= 0; k--) { const s = k / 40; const y = 1.40 + 0.55 * s * s + 0.9 * Math.pow(s, 3); g.lineTo(X(sz(s)), Y(y)); }
      g.fill();
      g.fillStyle = P.gold; g.beginPath();
      for (let k = 0; k <= 40; k++) { const s = k / 40; const y = 1.83 + 0.55 * s * s + 1.1 * Math.pow(s, 3) + 0.5 * s * s; const x = X(sz(s)); k ? g.lineTo(x, Y(y + 0.06)) : g.moveTo(x, Y(y + 0.06)); }
      for (let k = 40; k >= 0; k--) { const s = k / 40; const y = 1.83 + 0.55 * s * s + 1.1 * Math.pow(s, 3) + 0.5 * s * s; g.lineTo(X(sz(s)), Y(y)); }
      g.fill();
      // 挡风玻璃：上缘低于车顶(留出白色顶棚)，后缘斜切
      const gTop = (s) => S.noseTop(s) - 0.22 - 0.35 * s, gBot = (s) => S.noseTop(s) - 1.15 * (1 - 0.45 * s);
      const sa = 0.30, sb = 0.85, N = 14, poly = [];
      for (let k = 0; k <= N; k++) { const s = sa + (sb - sa) * k / N; poly.push([s, gTop(s)]); }
      poly.push([0.80, gBot(0.80)]); poly.push([0.50, gBot(0.50)]); poly.push([0.14, gBot(0.14)]);
      g.fillStyle = P.ws; g.beginPath(); poly.forEach(([s, y], i) => { const x = X(sz(s)), yy = Y(y); i ? g.lineTo(x, yy) : g.moveTo(x, yy); }); g.closePath(); g.fill();
      if (mode === 'map') {      // 玻璃顶部天光渐变
        g.save(); g.clip(); const gr = g.createLinearGradient(0, Y(4.6), 0, Y(2.6)); gr.addColorStop(0, 'rgba(120,150,185,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(X(zN0), 0, X(len), H); g.restore();
      }
      // 头车前部侧窗
      rrect(bodyL - 1.5, 2.5, bodyL - 0.3, 3.1, 6, mode === 'emis' ? 'rgb(255,214,150)' : P.glass);
    }
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 8; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    if (mode === 'map' || mode === 'emis') t.encoding = THREE.sRGBEncoding;
    return t;
  }

  const cache = {};
  function make(kind, scheme) {
    const key = kind + (scheme || 'blue');
    if (cache[key]) return cache[key];
    const sh = cache['_' + kind] || (cache['_' + kind] = { orm: paint(kind, 'orm'), bump: paint(kind, 'bump'), emis: paint(kind, 'emis') });   // 非颜色贴图各涂装共用
    return cache[key] = { map: paint(kind, 'map', scheme), orm: sh.orm, bump: sh.bump, emis: sh.emis };
  }
  window.Livery = { make };
})();
